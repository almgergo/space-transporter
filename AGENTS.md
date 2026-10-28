# AGENTS.md

Guidance for AI agents (and humans) working in this repo.

## What this is

A browser-based **space logistics game** built on **real orbital mechanics**, currently a proof of
concept. All eight planets orbit the sun on their real (coplanar, elliptical) J2000 Kepler orbits. Ships fly Lambert-solved transfers between
them, so launch timing matters: inside a transfer window a trip is cheap, outside it costs far more
fuel or is impossible. The player buys ships of three classes (Standard, Quick hauler, Large transport), accepts contracts of
five kinds (freight, bulk, express, passengers, outer supply), then picks a transfer on a **porkchop plot**
(departure date × flight time, coloured by Δv). The trade-off is fuel against time.

**Read `docs/orbital-mechanics.md` before touching `src/core/orbital/` or `src/core/transfer/`.**
It holds the maths, the units, the numerical edge cases and the design decisions. Keep it in sync with the code.

## Stack

- **TypeScript** (strict, `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes`, `verbatimModuleSyntax`)
- **Vite**: dev server and bundler
- **Phaser 4**: the system map only (rendering)
- **Plain DOM + `<canvas>`**: panels and the porkchop chart (no UI framework)
- **Vitest**: unit tests for the simulation

## Commands

```bash
npm install
npm run dev        # dev server at http://localhost:5173
npm test           # vitest (core tests)
npm run typecheck  # tsc --noEmit
npm run build      # typecheck + production bundle in dist/
```

Before you finish a change, run `npm run typecheck && npm test`. If you changed `src/render/` or
`src/ui/`, also load the game in a browser and look at it. Passing type checks don't prove anything draws.

## Architecture: the one hard rule

```
src/
  core/      pure TypeScript simulation: NO Phaser, NO DOM (no window/document)
  render/    Phaser system map: reads core + UiState, draws
  ui/        DOM panels + porkchop canvas: reads core, sends intent via GameCommands
  main.ts    wires a GameSession (core/scenario.ts) to render + ui
tests/       tests for core/ only
docs/        design notes (orbital-mechanics.md)
legacy/      the old flat-map PoC, self-contained; not built, type-checked or tested
```

**`src/core/` must never import from `phaser`, `src/render/` or `src/ui/`, and never touch
`window`/`document`.** Check with `grep -rn "from 'phaser'\|window\.\|document\." src/core`, which should
return nothing. This keeps the simulation deterministic, testable in Node and independent of the renderer.

Data flow:

1. `MapScene.update` turns real time × warp (days per second, from `UiState`) into simulated days.
   `FixedStepClock` then calls `World.tick(dt)`.
2. All motion is **analytic**: planets use `KeplerOrbit.stateAt(t)` and coasting ships use `ConicArc.stateAt(t)`.
   There is no numerical integration, so time warp is free and exact.
3. Views (`render/views/*`) and panels (`ui/*`) **read** state. Player intent goes only through **`GameCommands`**.
4. Core announces what happened on the typed `World.events` (`departed`, `arrived`, `contractCompleted`,
   `contractOffered`, `contractExpired`, `shipAdded`). The UI re-renders on those events, not every frame,
   and `MapScene` adds a `ShipView` on `shipAdded`.
5. `UiState` (selected ship, transfer preview, warp, map focus) is presentation-only. Core never sees it.
6. The map uses `render/MapCamera` (centre in AU + px/AU), **not** Phaser camera zoom. Every view
   re-projects from AU each frame, so markers keep their pixel size. Static layers redraw on `camera.version` changes.

In dev builds `window.__session` exposes the `GameSession` for debugging and browser tests
(`__session.world.wallet.deposit(1e5)`).

### Core map

| Path | Responsibility |
| --- | --- |
| `units.ts` | μ☉, AU/day ↔ km/s, J2000 day ↔ calendar date |
| `orbital/KeplerOrbit` | Orbital elements → state (Kepler's equation); planets |
| `orbital/ConicArc`, `stumpff` | Universal-variable propagation; coasting ships (elliptic or hyperbolic) |
| `orbital/lambert` | Lambert solver (prograde, zero-revolution, bisection on z) |
| `orbital/hohmann` | Closed-form reference: Δv, time of flight, phase angle, synodic period |
| `bodies/Planet`, `SolarSystem` | Planet = orbit + `Port` (departure/landing cost, aerobrake limit, fuel price) |
| `bodies/planetData` | JPL J2000 elements for the 8 planets, port costs, planet pools |
| `propulsion/rocket`, `FuelTank` | Tsiolkovsky equation; tank capacity and amount |
| `transfer/TransferCostModel` | Excess speed → burn Δv (fixed port costs + aerobraking); swappable |
| `transfer/TransferPlanner` | (origin, target, departure, flight time) → `TransferOption` |
| `transfer/Porkchop`, `porkchopSpec` | Grid of options, fuel and feasibility for a ship's `FuelProfile` |
| `transfer/windows` | Phase angle, next Hohmann window |
| `ship/Ship`, `ShipClass`, `ShipState` | Hull design + tank + contract cargo; docked, scheduled or in transit |
| `ship/shipClasses`, `ShipFactory` | The three ship designs (speed = exhaust velocity and Δv budget); naming |
| `contracts/Contract` | Kinds + `PayoutTerms` union: `deadline` or `travelTime` (flight duration); `payoutFor(trip)`, `paysInFull` |
| `contracts/contractTemplates`, `ContractBoard` | Data templates per kind (route pools, mass, rate, payout); weighted seeded generation |
| `economy/Wallet`, `events/EventBus`, `loop/FixedStepClock`, `random/Rng`, `math/Vec2` | Utilities |
| `World` | Time, ships, contracts, wallet, events; departure and arrival burns; payouts |
| `GameCommands` | `purchaseShip`, `acceptContract`, `scheduleTransfer` (buys fuel, rejects stale or infeasible), `cancelTransfer` |
| `scenario` | Solar system, contract board (one offer per kind + starter contract C-000), one Standard at Earth, start 2026-01-01 |

### Units

The simulation uses **AU, days and AU/day** everywhere. Convert to km/s or calendar dates **only** in
`ui/format.ts` or at scenario setup (`kmsToAuPerDay`). Masses are tonnes. Angles are radians.

## Code style

- **Composition over inheritance.** Build behaviour from small parts (`KeplerOrbit`, `ConicArc`, `FuelTank`,
  `TransferCostModel`). No `BaseEntity` hierarchies and no ECS library. Use interfaces (`Trajectory`,
  `TransferCostModel`) where a part should be swappable.
- **One class per file**, named after the class (`PascalCase.ts`). Function and data modules use `camelCase.ts`.
- Small, focused classes with `readonly` dependencies injected through the constructor. No singletons or
  module-level mutable state. Randomness goes through a seeded `Rng`.
- Expose state through getters with `private` fields. Mutate only through intention-revealing methods.
- Use plain data (`interface`) for configuration (`ShipClass`, `Port`, `OrbitalElements`, `PorkchopSpec`),
  and string-literal unions instead of enums (`ShipState.kind`).
- Commands report expected failures as `CommandResult`, not exceptions.
- Comment intent, invariants and the maths. Don't narrate the code.
- Render and UI constants live in `render/theme.ts` and `ui/styles.css` (CSS custom properties).
- DOM controls carry `data-action` / `data-id` attributes and are handled through `onAction` delegation.
  This also gives browser tests stable selectors.

## Testing

- Unit-test every new core behaviour in `tests/`.
- **Numerical code is tested against invariants and references**, not just example outputs:
  energy and angular-momentum conservation, Lambert round trips (propagate `v₁` for the time of flight
  and land on `r₂`), the Hohmann limit, and known Earth→Mars numbers. Add the matching invariant
  whenever you add an orbital routine.
- Gameplay flows go through `createDefaultGame()` + `GameCommands` + `world.tick()`.
- Static data gets a data-entry test (`planets.test.ts` checks periods, perihelia and the epoch convention).
- Generated content gets a feasibility test (`scenario.test.ts`: every contract kind must mostly be flyable
  by its intended ship class). Re-run it whenever you change templates, ports or ship classes.
- Don't unit-test Phaser views or DOM panels. Verify them in a browser.

## PoC scope guardrails

Keep it small. **Don't add these without being asked:** patched conics or sphere-of-influence modelling,
gravity assists, multi-revolution Lambert, continuous thrust, n-body integration, moons or dwarf planets,
inclination, multi-contract holds, a market economy, save/load, sprites or audio, UI or state-management
frameworks, or a backend.

Likely next steps when asked: contracts that need repositioning legs, contour lines on the porkchop,
return-trip planning hints, ship upkeep or resale.
