# Orbital mechanics: maths and implementation plan

Design notes for the orbital logistics layer. The code in `src/core/orbital/` and `src/core/transfer/`
implements what is described here; keep the two in sync.

## 0. Decisions (from the design Q&A, 2026-10-28)

| Topic | Decision |
| --- | --- |
| Ship motion | **On rails**: analytic Kepler motion, **impulsive** burns |
| Transfers | **Full Lambert** (any departure date / time of flight) with an interactive **porkchop** plot |
| Planet gravity | **Fixed per-planet cost** for leaving and landing (no SOI / patched conics) |
| Fuel | **Rocket equation** with dry mass + cargo + fuel; bought at the departure planet; **flat price since §12** |
| Scale | Real units: AU, days, km/s. **All 8 planets since §12** |
| Time | Time warp + pause; **contract deadlines** |
| Planet orbits | Coplanar; **real elliptical J2000 elements since §12** (were circular) |
| Old PoC | Moved to `legacy/` (out of build and tests) |
| Objective | Contracts (cargo A→B by a deadline) that pay credits; credits buy fuel |
| Control | One trip at a time: pick a ship, a destination and a point on the porkchop, then confirm |
| Arrival | Planets with an atmosphere can **aerobrake** up to a speed limit; beyond that you burn |

## 1. Units and constants

All simulation maths uses **AU**, **days** and **AU/day**. Display converts to km/s and calendar dates.

| Constant | Value |
| --- | --- |
| Gaussian constant `k` | 0.01720209895 AU^1.5 / day |
| Sun's gravitational parameter `μ = k²` | 2.959122e-4 AU³/day² |
| 1 AU/day | 1731.457 km/s |
| Epoch | J2000 = 2000-01-01 12:00 TT. Simulation time `t` is days since J2000 |

Working in AU/days keeps every quantity of order 1e-3 to 1e1, so plain doubles are comfortable.

## 2. Planet orbits (Kepler orbits from elements)

A planet's orbit is described by standard 2D elements:

- `a` is the semi-major axis, `e` the eccentricity.
- `ϖ` is the longitude of perihelion (in 2D this merges the node angle and the argument of periapsis).
- `M₀` is the mean anomaly at the epoch `t₀`.

Mean motion is `n = √(μ/a³)`, so the period is `T = 2π/n`.

To get the state at time `t`:

1. Mean anomaly: `M = M₀ + n(t − t₀)`.
2. Solve **Kepler's equation** `M = E − e·sin E` for `E` with Newton's method, starting from `E₀ = M`
   (or `π` when `e > 0.8`):
   `E ← E − (E − e sin E − M)/(1 − e cos E)`. Stop when `|ΔE| < 1e-12`. For `e = 0` this gives `E = M`.
3. Position in the perifocal frame: `x = a(cos E − e)`, `y = a√(1−e²) sin E`.
4. Velocity in the perifocal frame: `ẋ = −a n sin E / (1 − e cos E)`, `ẏ = a n √(1−e²) cos E / (1 − e cos E)`.
5. Rotate by `ϖ` into the sun-centred frame.

For circular orbits this reduces to `r = a(cos L, sin L)` with mean longitude `L = ϖ + M`, and speed `√(μ/a)`.

### Real starting positions

We use mean J2000 elements, circularised:

| Planet | a (AU) | Mean longitude at J2000 | Rate (°/day) | Period |
| --- | --- | --- | --- | --- |
| Earth | 1.00000 | 100.464° | 0.985647 | 365.26 d |
| Mars | 1.52368 | 355.433° | 0.524021 | 686.98 d |

The game starts on **2026-01-01** (t = 9496.5). At that date Earth is at about 100.7° and Mars at about 291.8°,
so Mars is about 191° ahead of Earth. The phase angle is computed in §3; the next Earth→Mars window falls
around **day 318 (mid-November 2026)**, which matches the real 2026 Mars window.

Mars's real eccentricity is 0.093. Circularising it moves real window dates by a few weeks. Switching to
`e = 0.0934` later is a config change.

## 3. Hohmann transfer (the reference case)

A Hohmann transfer is the cheapest two-burn transfer between coplanar circular orbits. The ship flies half
of an ellipse that is tangent to both orbits. With `r₁` the origin radius and `r₂` the target radius:

```
a_t  = (r₁ + r₂) / 2                       transfer ellipse semi-major axis
v₁   = √(μ/r₁),  v₂ = √(μ/r₂)              circular speeds
Δv₁  = v₁ (√(2r₂/(r₁+r₂)) − 1)             departure burn (prograde)
Δv₂  = v₂ (1 − √(2r₁/(r₁+r₂)))             arrival burn
t_H  = π √(a_t³/μ)                          time of flight: half the ellipse period
```

**Phase angle.** The target must arrive at the far end of the ellipse when the ship does. So at departure
the target's angle relative to the origin must be:

```
φ = π − n₂ · t_H                (n₂ = target's mean motion)
```

**Synodic period.** The same phase angle comes back every

```
S = 2π / |n₁ − n₂|
```

**Earth → Mars numbers:**

| Quantity | Value |
| --- | --- |
| Transfer semi-major axis `a_t` | 1.2618 AU |
| Time of flight `t_H` | 258.9 days |
| Departure burn `Δv₁` | 2.94 km/s |
| Arrival burn `Δv₂` | 2.65 km/s |
| Total `Δv` | 5.59 km/s |
| Phase angle `φ` | +44.3° (Mars ahead of Earth) |
| Synodic period `S` | 779.9 days, about 2.14 years |
| Mars → Earth phase angle | `π − n_E·t_H = −75.1°` (Earth *behind* Mars) |

Away from that phase angle the Hohmann geometry is impossible, and a real trip costs more. Lambert's problem
(§5) quantifies how much more.

The Hohmann formulas live in `orbital/hohmann.ts`. They are used by tests (as ground truth for the Lambert
solver) and by the HUD (phase-angle and next-window readouts).

## 4. Propagating a coasting ship (universal variables)

Once a ship burns, it coasts on a conic defined by its state `(r₀, v₀)` at time `t₀`. Fast transfers can be
**hyperbolic** relative to the sun, so we use the **universal-variable** formulation, which handles
ellipses, parabolas and hyperbolas without special cases.

The building blocks are:

```
α = 2/|r₀| − |v₀|²/μ               reciprocal semi-major axis (α > 0 ellipse, < 0 hyperbola)
z = α χ²
C(z), S(z)                          Stumpff functions:
  z > 0:  C = (1 − cos√z)/z,        S = (√z − sin√z)/√z³
  z < 0:  C = (cosh√−z − 1)/(−z),   S = (sinh√−z − √−z)/√−z³
  z ≈ 0:  C = 1/2 − z/24 + …,       S = 1/6 − z/120 + …   (series near zero for stability)
```

Solve the **universal Kepler equation** for `χ`, with `Δt = t − t₀` and `σ₀ = r₀·v₀/√μ`:

```
√μ Δt = σ₀ χ² C(z) + (1 − α|r₀|) χ³ S(z) + |r₀| χ
```

Use Newton's method starting from `χ₀ = √μ·|α|·Δt`. Then the **Lagrange coefficients** give the new state:

```
f = 1 − χ²/|r₀| · C
g = Δt − χ³/√μ · S
r = f r₀ + g v₀
ḟ = √μ/(|r||r₀|) · (α χ³ S − χ)
ġ = 1 − χ²/|r| · C
v = ḟ r₀ + ġ v₀
```

A transfer arc is therefore just `(r₀, v₀, t₀)` and can be evaluated at any `t`. Time warp costs nothing and
there is no integration drift.

## 5. Lambert's problem (the heart of the porkchop plot)

**Problem.** Given two positions `r₁` (origin planet at departure time `t_d`) and `r₂` (target planet at
arrival time `t_a`), and a time of flight `Δt = t_a − t_d`, find the conic that connects them. The result is
the required velocities `v₁` at departure and `v₂` at arrival.

We solve the **single-revolution, prograde** case with the universal-variable method (Bate–Mueller–White /
Curtis, Algorithm 5.2).

**1. Transfer angle.** Prograde means counter-clockwise, the same direction the planets orbit:

```
Δθ = atan2((r₁ × r₂)_z, r₁·r₂)        wrapped to [0, 2π)
```

Use `atan2`, **not** `acos(r₁·r₂ / |r₁||r₂|)`. Near 180°, `acos` of a value close to −1 loses about half its
precision (an angle error around 1e-8 rad), and near the singularity that error is magnified into percent-level
Δv errors. This was a real bug caught by the Hohmann-limit test.

**2. Geometry constant:** `A = sin Δθ · √(|r₁||r₂| / (1 − cos Δθ))`

**3. Solve for z.** With

```
y(z) = |r₁| + |r₂| + A (z S(z) − 1)/√C(z)
F(z) = (y/C)^{3/2} S + A √y − √μ Δt
```

solve `F(z) = 0`.

**4. Velocities.**

```
f = 1 − y/|r₁|,   g = A √(y/μ),   ġ = 1 − y/|r₂|
v₁ = (r₂ − f r₁)/g
v₂ = (ġ r₂ − r₁)/g
```

**Root finding.** For zero-revolution transfers, `F` increases monotonically in `z` on `(z_min, 4π²)`.
`z_min` is where `y(z)` becomes 0 (only relevant when `A > 0`). So we use **bisection**:

- Lower bound: start at `z = −4π²` and step up until `y(z) > 0`.
- Upper bound: just below `4π²`.
- About 100 iterations, or stop at a relative tolerance of 1e-10.

Newton's method converges faster but is fragile near the bounds. Bisection never fails and is cheap enough:
a full porkchop is about 5,000 solves.

**Singularities and edge cases:**

| Case | Handling |
| --- | --- |
| `Δθ → π` (exactly 180°) | `A → 0` and `g → 0`. In 3D the transfer plane is undefined there; in 2D a solution exists, but this formulation divides by zero. **Rotate the `r₂` vector itself** to `π − 1e-6` and recompute the angle from the rotated vector. Nudging only the scalar `Δθ` is not enough, because `r₂ − f·r₁` still cancels to 0/0. The arrival-position error is about 1.5e-6 AU (~230 km), far below anything visible. This matters because the Hohmann transfer *is* the 180° case. |
| `Δθ → 0` or `2π` | Degenerate (the bodies line up). Return "no solution"; the porkchop cell is shown as infeasible. |
| No root in the bracket | Return `undefined`; shown as infeasible. |
| Multi-revolution transfers | Ignored for now. They are the extra porkchop lobes; we only plot `Δt` below about 1.3 target periods, and the zero-revolution solution is always the relevant one. |
| Retrograde transfers | Never cheaper here; ignored. |

**Verification tests:**

1. **Hohmann limit:** `r₁ = (1, 0)`, `r₂` at angle `π − ε` with radius 1.524 and `Δt ≈ t_H`. Then
   `|v₁| − v_E ≈ Δv₁` and `v_M − |v₂| ≈ Δv₂` within about 1%.
2. **Round trip:** propagate `(r₁, v₁)` by `Δt` with §4. The result must land on `r₂`
   (relative error below 1e-8).
3. **Circular sanity:** `r₂` on the same circle at angle `n·Δt` must give `v₁` equal to the circular velocity.

## 6. From velocities to fuel

### 6.1 Speed changes (Δv) at the ends

Planets are points on the sun-centred orbits (the user chose a fixed gravity cost instead of patched conics):

```
v∞_dep = |v₁ − v_origin(t_d)|           excess speed relative to the origin planet when leaving
v∞_arr = |v₂ − v_target(t_a)|           excess speed relative to the target planet when arriving
```

**Departure:** `Δv_dep = v∞_dep + origin.departureCost`.
`departureCost` is a per-planet constant that stands in for climbing out of the gravity well.

**Arrival** (aerobraking with a limit):

```
if target.aerobrakeLimit defined:
    Δv_arr = max(0, v∞_arr − aerobrakeLimit) + target.landingCost
else:
    Δv_arr = v∞_arr + target.landingCost
```

The atmosphere absorbs arrival speed up to the heat-shield limit; anything faster has to be burned off.
Very fast transfers therefore get expensive at both ends, while Hohmann-like arrivals are close to free.

### 6.2 Starting per-planet constants (gameplay values, tunable)

| Planet | Departure cost | Landing cost | Aerobrake limit | Fuel price |
| --- | --- | --- | --- | --- |
| Earth | 1.2 km/s | 0.3 km/s | 6.0 km/s | 100 cr/t |
| Mars | 0.6 km/s | 0.2 km/s | 3.5 km/s (thin air) | 350 cr/t |

**Honest caveat.** Real departures exploit the **Oberth effect**: burning deep in a gravity well multiplies
the effect of the burn. Adding a fixed cost to `v∞` overstates real costs. The *shape* of the trade-off
(windows, cost against time of flight) is still correct, which is what the gameplay needs. Switching to
patched conics later only changes `6.1`, behind the same `TransferCostModel` interface.

### 6.3 Rocket equation

```
Δv = vₑ · ln(m₀ / m₁)               vₑ = Isp · g₀
```

Burns with the same engine compose multiplicatively. For a two-burn trip, the total fuel therefore depends
only on `Δv_total = Δv_dep + Δv_arr`:

```
fuel_needed = (m_dry + m_cargo) · (e^{Δv_total / vₑ} − 1)
Δv_max      = vₑ · ln((m_dry + m_cargo + tank_capacity) / (m_dry + m_cargo))
```

**Starting ship ("Hauler").** Dry mass 20 t, cargo up to 40 t, tank 80 t, nuclear-thermal engine with
`Isp ≈ 900 s`, so `vₑ = 8.83 km/s`.

| Load | Maximum Δv |
| --- | --- |
| Full cargo | 8.83 · ln(140/60) = **7.5 km/s** |
| Empty | 8.83 · ln(100/20) = **14.2 km/s** |
| Earth→Mars Hohmann trip | 1.2 + 2.94 + 0 (aerobrake) + 0.2 ≈ **4.3 km/s**, about 38 t of fuel with full cargo |

A badly timed transfer can easily exceed 10 km/s, which is impossible with full cargo. That's the intended
"wait or pay" tension.

## 7. The porkchop plot

**Grid:**

- Departure date `t_d ∈ [now, now + 1.25·S]`, 90 columns. This always contains at least one full window.
- Time of flight `Δt ∈ [60 d, 1.3 · T_target / 2 + 150 d]`, about 60 rows. For Earth→Mars, roughly 60 to 600 days.

**Each cell** runs Lambert, then works out `Δv_total`, the fuel required (given the ship's current dry
mass + cargo), the arrival date, and whether a contract deadline is met. The cell is **infeasible** if there
is no Lambert solution or the fuel needed exceeds the tank.

**Rendering:**

- Colour each cell on a log scale of `Δv_total`, in 13 quantised bands of a single-hue ramp (the band
  edges act as implicit contours). The bands span the cheapest Δv up to the most expensive *feasible* Δv.
- Hatch infeasible cells.
- Draw the **deadline** as a diagonal line (`t_d + Δt = deadline`).
- Mark the optimum (minimum fuel) with a ring and the selected cell with a box.

The "pork chop" shapes are the cheap regions, centred near the Hohmann phase angle, repeating every `S`.

**Cost.** 5,400 Lambert solves × about 100 bisection steps is roughly 0.5 M Stumpff evaluations, a few ms
in a modern JS engine. We compute the grid once when the panel opens or the ship changes, not every frame.

## 8. Contracts and time

**A contract** says: deliver *m* tonnes from A to B by a deadline; reward *R*. If late, the payout falls
linearly to 0 over a grace period:

```
payout(t_arrival) = R                                  if t_arrival ≤ deadline
                  = R · max(0, 1 − (t_arrival − deadline)/grace)   otherwise
```

**Generation.** A seeded RNG creates contracts periodically. The deadline is set from the **next Hohmann
arrival** plus random slack, which can be negative (meaning "pay for a fast transfer") or positive ("wait for
the window"). The reward scales with mass and urgency. Contracts expire if not accepted.

**Time warp.** `FixedStepClock` advances simulation days. Speeds are pause, 1, 5, 20 and 50 days per real
second. Every position is analytic, so warp has no accuracy cost. Departure and arrival are detected when
`t` crosses the scheduled time; the ship state is then evaluated exactly at those times.

## 9. Architecture plan

```
legacy/                      old flat-map PoC (excluded from tsconfig, build and tests)
src/core/                    pure TS, no Phaser/DOM (unchanged hard rule)
  units.ts                   μ, AU/day ↔ km/s, day ↔ calendar date
  math/Vec2.ts               (kept) + dot, cross, angle helpers
  random/Rng.ts              seeded RNG (deterministic tests)
  orbital/
    StateVector.ts           { r, v }
    Trajectory.ts            interface: stateAt(t)
    KeplerOrbit.ts           elements → state (planets)
    ConicArc.ts              (r₀, v₀, t₀) universal-variable propagation (coasting ships)
    stumpff.ts               C(z), S(z)
    lambert.ts               solveLambert(r₁, r₂, Δt, μ)
    hohmann.ts               closed-form reference + phase angle + synodic period
  bodies/
    Planet.ts                name, orbit (Trajectory), Port (departure/landing costs, aerobrake, fuel price)
    SolarSystem.ts           μ + planets
  propulsion/
    Engine.ts, FuelTank.ts   vₑ; capacity/amount
    rocket.ts                fuel ↔ Δv functions
  transfer/
    TransferCostModel.ts     §6.1 rules (swappable for patched conics later)
    TransferPlanner.ts       evaluate(ship, origin, target, t_d, Δt) → TransferOption
    Porkchop.ts              grid of TransferOptions
  ship/
    Ship.ts                  hull (dry mass, cargo cap) + FuelTank + Engine + cargo + ShipState
    ShipState.ts             Docked | Scheduled(departure) | InTransit(ConicArc, arrival)
  contracts/
    Contract.ts, ContractBoard.ts
  economy/Wallet.ts          (kept)
  events/                    (kept) EventBus + new GameEvents
  loop/FixedStepClock.ts     (kept)
  World.ts, GameCommands.ts, scenario.ts
src/render/                  Phaser: system map (sun, orbits, planets, ships, trajectory previews)
src/ui/                      plain-DOM panels: HUD/time controls, ship & contracts panel, porkchop canvas
```

**Why DOM for panels.** Lists, buttons and a pixel heatmap are native DOM/`<canvas>` work. Phaser stays the
spatial view. Both layers only read core state and send intent through `GameCommands`.

## 10. Implementation order

1. Move the old code to `legacy/`; trim tsconfig and tests.
2. `units`, `stumpff`, `KeplerOrbit`, `ConicArc`, `lambert`, `hohmann`, with the tests from §5.
3. `Planet`, `SolarSystem`, propulsion, cost model, `TransferPlanner`, `Porkchop`, with tests (Hohmann cell ≈ porkchop minimum; window ≈ day 318).
4. `Ship`, `ShipState`, `Contract(Board)`, `World`, `GameCommands`, with tests (accept → plan → depart → arrive → paid).
5. Render: the system map in Phaser.
6. UI: HUD with time warp, ship/contract panel, porkchop panel with hover/click/confirm.
7. Update `AGENTS.md`; verify in the browser.

## 11. Out of scope

Explicit contour lines and an "earliest arrival within budget" marker on the porkchop, patched conics
and the Oberth effect, multi-revolution Lambert, gravity assists, moons and dwarf planets, orbital
inclination, multi-contract cargo holds, continuous thrust, and a market economy.


## 12. Addendum (2026-10-28): the whole solar system, ship classes and contract kinds

### Decisions

| Topic | Decision |
| --- | --- |
| Bodies | All 8 planets (no moons or dwarf planets) |
| Orbits | Real eccentric J2000 elements, still coplanar (inclination and node dropped) |
| Map | Zoom (wheel, about the cursor) + drag pan; focus modes Inner / Outer / Follow ship |
| Ships | Start with one Standard freighter; buy more at Earth's shipyard |
| Gas giants | Ports assumed on moons or in high orbit: moderate costs, generous aerobraking |
| Fuel price | Flat, 120 cr/t everywhere |
| Contracts | Freight, bulk, express, passengers, outer-system supply |

### Elements

From JPL SSD *Approximate Positions of the Planets*, Table 1, J2000 columns, mapped as
`ϖ → longitudeOfPerihelion` and `M₀ = L − ϖ` (epoch J2000). `tests/planets.test.ts` checks the data entry:
periods (which check `a`), perihelion distances (which check `e`), and Earth at perihelion in early January
(which checks the `ϖ`/`M₀` convention).

| Planet | a (AU) | e | L (°) | ϖ (°) |
| --- | --- | --- | --- | --- |
| Mercury | 0.38710 | 0.2056 | 252.250 | 77.458 |
| Venus | 0.72334 | 0.0068 | 181.979 | 131.602 |
| Earth | 1.00000 | 0.0167 | 100.465 | 102.938 |
| Mars | 1.52371 | 0.0934 | −4.553 | −23.944 |
| Jupiter | 5.20289 | 0.0484 | 34.396 | 14.728 |
| Saturn | 9.53668 | 0.0539 | 49.954 | 92.599 |
| Uranus | 19.18916 | 0.0473 | 313.238 | 170.954 |
| Neptune | 30.06992 | 0.0086 | −55.120 | 44.965 |

**Approximation.** `hohmann()` and `nextHohmannWindow()` still use semi-major axes and mean motions. On
eccentric orbits they are estimates: Earth→Mars moves about 16 days from the circular answer. They only
anchor contract deadlines and set porkchop ranges. Every flyable transfer comes from Lambert on the true
positions.

### Ports (km/s)

| Planet | Departure | Landing | Aerobrake limit |
| --- | --- | --- | --- |
| Mercury | 1.5 | 1.2 | none (airless) |
| Venus | 1.5 | 0.4 | 7 |
| Earth | 1.2 | 0.3 | 6 |
| Mars | 0.6 | 0.2 | 3.5 |
| Jupiter | 3.0 | 0.5 | 12 |
| Saturn | 2.0 | 0.4 | 10 |
| Uranus | 1.5 | 0.3 | 8 |
| Neptune | 1.5 | 0.3 | 8 |

The giants' limits sit above their Hohmann arrival speeds (Jupiter ≈ 5.6, Neptune ≈ 4 km/s), so cheap
arrivals aerobrake for free. Mercury has no atmosphere and a steep arrival, so a loaded nuclear-thermal
freighter cannot reach it. Freight and bulk contracts therefore avoid Mercury.

### Ship classes

An impulsive model has no top speed. A ship is "fast" when it can afford high-Δv, short transfers.
Speed is therefore modelled as **exhaust velocity and Δv budget**:
`Δv_max = vₑ · ln((dry + cargo + tank) / (dry + cargo))`.

| Class | Dry | Hold | Tank | vₑ | Δv loaded / empty | Price | Role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Standard freighter | 20 t | 40 t | 80 t | 8.83 km/s | 7.5 / 14.2 | 25k | Inner system; cannot haul cargo to Jupiter (needs ~10.5) |
| Quick hauler | 12 t | 15 t | 40 t | 20 km/s (fusion) | 18.2 / 29.3 | 45k | Fast transfers, Mercury, the outer system |
| Large transport | 90 t | 200 t | 300 t | 8.83 km/s | 6.3 / 12.9 | 60k | Bulk; held to near-Hohmann (slow) transfers |

### Contract kinds

Deadline slack is measured in **Hohmann flight times** (`t_H`) so short hops and long hauls both get
sane deadlines. Because the Hohmann arrival is at least one `t_H` away, slack ≥ −0.6 can never fall in the past.

| Kind | Routes | Mass | Rate | Terms |
| --- | --- | --- | --- | --- |
| Freight | Venus/Earth/Mars | 10–40 t | 350 cr/t | Deadline at Hohmann arrival + (−0.4…+0.8)·t_H; grace max(60 d, 0.5·t_H) |
| Bulk | Venus/Earth/Mars | 60–180 t | 220 cr/t | Deadline + (0.4…1.5)·t_H; grace max(120 d, t_H) |
| Express | Mercury–Mars | 3–12 t | 1200 cr/t | Deadline + (−0.6…−0.25)·t_H; grace max(20 d, 0.15·t_H) |
| Passengers | Mercury–Mars | 4–15 t | 900 cr/t | **Flight time**: full pay if ≤ 0.75·t_H, nothing beyond 2·t_H (a Hohmann trip pays ~80%) |
| Outer supply | Earth/Mars → Jupiter+ | 5–15 t | 600 cr/t × (1 + t_H in years) | Deadline + 0…2 years; grace 1 year |

**Urgency premium.** Deadline kinds pay up to 2.5× when the deadline falls before the Hohmann arrival.
Outer-supply rewards scale with trip length. Fuel is flat-priced, so this is what makes multi-decade
hauls worthwhile.

**In the porkchop.** The full-pay boundary is drawn for both payout kinds: a deadline is a diagonal
(arrival = deadline), and passenger terms are a horizontal line (flight time = ideal). "Cheapest full pay"
filters on `Contract.paysInFull(option)`.

### Porkchop ranges

Flight times span `[max(30 d, 0.3·t_H), 2·t_H]`, so a 75-day Mercury hop and a 30-year Neptune run both
fill the grid. Departures span 1.25 synodic periods. Axis ticks are chosen from a step ladder (months or
years; days or years) to keep labels at least about 70 px apart.
