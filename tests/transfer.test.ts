import { describe, expect, it } from 'vitest';
import { Contract } from '../src/core/contracts/Contract';
import { fuelBurnedFrom, fuelForDeltaV } from '../src/core/propulsion/rocket';
import { createDefaultGame, createSolarSystem, START_DATE } from '../src/core/scenario';
import { QUICK_HAULER, STANDARD as HAULER } from '../src/core/ship/shipClasses';
import { Porkchop } from '../src/core/transfer/Porkchop';
import { defaultPorkchopSpec } from '../src/core/transfer/porkchopSpec';
import { FixedPortCostModel } from '../src/core/transfer/TransferCostModel';
import { timeOfFlight } from '../src/core/transfer/TransferOption';
import { TransferPlanner } from '../src/core/transfer/TransferPlanner';
import { nextHohmannWindow } from '../src/core/transfer/windows';
import { auPerDayToKms, MU_SUN } from '../src/core/units';

const system = createSolarSystem();
const earth = system.planetById('earth')!;
const mars = system.planetById('mars')!;
const planner = new TransferPlanner(MU_SUN, new FixedPortCostModel());
const fullHauler = { massWithoutFuel: HAULER.dryMass + 40, tankCapacity: HAULER.tankCapacity, exhaustVelocity: HAULER.exhaustVelocity };

describe('rocket equation', () => {
  it('two sequential burns use the same fuel as one combined burn', () => {
    const ve = 8.83;
    const total = fuelForDeltaV(60, 5, ve);
    const first = fuelBurnedFrom(60 + total, 3, ve);
    const second = fuelBurnedFrom(60 + total - first, 2, ve);
    expect(first + second).toBeCloseTo(total, 10);
  });
});

describe('transfer windows', () => {
  it('next Earth → Mars window from 2026-01-01 is around November 2026', () => {
    // a-based estimate on eccentric orbits: ±25 days around the circular-orbit answer (day 318).
    const window = nextHohmannWindow(earth, mars, START_DATE, MU_SUN);
    expect(window.departureTime - START_DATE).toBeGreaterThan(293);
    expect(window.departureTime - START_DATE).toBeLessThan(343);
  });

  it('porkchop optimum sits at the Hohmann window and costs about Hohmann Δv + port costs', () => {
    const porkchop = Porkchop.compute(planner, earth, mars, fullHauler, defaultPorkchopSpec(earth, mars, START_DATE));
    const best = porkchop.cheapest()!.option;
    const window = nextHohmannWindow(earth, mars, START_DATE, MU_SUN);

    expect(Math.abs(best.departureTime - window.departureTime)).toBeLessThan(30);
    expect(timeOfFlight(best)).toBeGreaterThan(180);
    expect(timeOfFlight(best)).toBeLessThan(360);
    // Hohmann: 2.94 departure + 1.2 Earth port + Mars aerobrakes (2.65 < 3.5) + 0.2 landing ≈ 4.34 km/s.
    expect(auPerDayToKms(best.totalDeltaV)).toBeGreaterThan(4.0);
    expect(auPerDayToKms(best.totalDeltaV)).toBeLessThan(4.5);
  });

  it('leaving right now is far more expensive than waiting for the window', () => {
    const porkchop = Porkchop.compute(planner, earth, mars, fullHauler, defaultPorkchopSpec(earth, mars, START_DATE));
    let cheapestNow = Infinity;
    for (let row = 0; row < porkchop.spec.rows; row++) {
      const cell = porkchop.cell(0, row);
      if (cell) cheapestNow = Math.min(cheapestNow, cell.option.totalDeltaV);
    }
    expect(cheapestNow).toBeGreaterThan(2 * porkchop.cheapest()!.option.totalDeltaV);
  });

  it('a fast transfer at the window costs more than the slow one', () => {
    const window = nextHohmannWindow(earth, mars, START_DATE, MU_SUN);
    const slow = planner.evaluate(earth, mars, window.departureTime, 259)!;
    const fast = planner.evaluate(earth, mars, window.departureTime, 130)!;
    expect(fast.totalDeltaV).toBeGreaterThan(slow.totalDeltaV * 1.3);
  });
});

describe('return leg (Mars → Earth)', () => {
  const emptyHauler = { massWithoutFuel: HAULER.dryMass, tankCapacity: HAULER.tankCapacity, exhaustVelocity: HAULER.exhaustVelocity };

  it('next window is about 251 days after the start date (Earth must trail Mars by ~75°)', () => {
    const window = nextHohmannWindow(mars, earth, START_DATE, MU_SUN);
    expect(window.departureTime - START_DATE).toBeGreaterThan(226);
    expect(window.departureTime - START_DATE).toBeLessThan(276);
  });

  it('cheapest return costs about Hohmann + Mars departure + Earth landing (aerobraked)', () => {
    const porkchop = Porkchop.compute(planner, mars, earth, emptyHauler, defaultPorkchopSpec(mars, earth, START_DATE));
    // Circular estimate: 0.6 Mars port + 2.65 departure + 0.3 Earth landing (aerobraked) ≈ 3.55 km/s.
    // Mars's eccentric orbit makes the real 2026 return window cheaper (~3.1).
    expect(auPerDayToKms(porkchop.cheapest()!.option.totalDeltaV)).toBeGreaterThan(2.9);
    expect(auPerDayToKms(porkchop.cheapest()!.option.totalDeltaV)).toBeLessThan(3.85);
  });
});

describe('contracts', () => {
  const base = { id: 'x', kind: 'standard' as const, origin: earth, destination: mars, mass: 10, reward: 1000, offerExpires: 0 };

  const trip = (departureTime: number, arrivalTime: number) => ({ departureTime, arrivalTime });

  it('deadline terms pay in full on time and decay linearly when late', () => {
    const c = new Contract({ ...base, payout: { kind: 'deadline', deadline: 100, gracePeriod: 100 } });
    expect(c.payoutFor(trip(0, 100))).toBe(1000);
    expect(c.payoutFor(trip(0, 150))).toBe(500);
    expect(c.payoutFor(trip(0, 300))).toBe(0);
  });

  it('travel-time terms depend on flight duration, not the date', () => {
    const c = new Contract({ ...base, kind: 'passengers', payout: { kind: 'travelTime', idealDays: 200, zeroAfterDays: 400 } });
    expect(c.payoutFor(trip(1000, 1200))).toBe(1000);
    expect(c.payoutFor(trip(5000, 5300))).toBe(500);
    expect(c.payoutFor(trip(0, 400))).toBe(0);
  });
});

describe('outer system', () => {
  const jupiter = system.planetById('jupiter')!;
  const loaded = (design: typeof HAULER) => ({ massWithoutFuel: design.dryMass + design.cargoCapacity, tankCapacity: design.tankCapacity, exhaustVelocity: design.exhaustVelocity });

  it('a loaded standard freighter cannot reach Jupiter, a quick hauler can at about Hohmann cost', () => {
    const spec = defaultPorkchopSpec(earth, jupiter, START_DATE);
    expect(Porkchop.compute(planner, earth, jupiter, loaded(HAULER), spec).cheapest()).toBeUndefined();
    const best = Porkchop.compute(planner, earth, jupiter, loaded(QUICK_HAULER), spec).cheapest()!;
    // Hohmann departure ≈ 8.8 km/s + 1.2 Earth port; arrival 5.6 < 12 aerobrake → 0.5 landing ≈ 10.5.
    expect(auPerDayToKms(best.option.totalDeltaV)).toBeGreaterThan(10);
    expect(auPerDayToKms(best.option.totalDeltaV)).toBeLessThan(11.2);
  });

  it('porkchop flight-time axis scales to 30-year Neptune runs', () => {
    const neptune = system.planetById('neptune')!;
    const spec = defaultPorkchopSpec(earth, neptune, START_DATE);
    const best = Porkchop.compute(planner, earth, neptune, loaded(QUICK_HAULER), spec).cheapest()!;
    expect(timeOfFlight(best.option) / 365.25).toBeGreaterThan(15);
    expect(timeOfFlight(best.option) / 365.25).toBeLessThan(45);
  });
});

describe('delivery flow', () => {
  function setup() {
    const game = createDefaultGame();
    const { world } = game;
    const origin = world.system.planetById('earth')!;
    const destination = world.system.planetById('mars')!;
    const contract = new Contract({
      id: 'T-1', kind: 'standard', origin, destination, mass: 30, reward: 20_000,
      payout: { kind: 'deadline', deadline: START_DATE + 700, gracePeriod: 120 }, offerExpires: START_DATE + 999,
    });
    world.contracts.add(contract);
    return { ...game, ship: world.ships[0]!, contract, origin, destination };
  }

  it('accept → schedule → depart → arrive → paid', () => {
    const { world, commands, ship, contract, origin, destination } = setup();
    expect(commands.acceptContract(ship, contract)).toEqual({ ok: true });

    const porkchop = Porkchop.compute(world.planner, origin, destination, ship.fuelProfile, defaultPorkchopSpec(origin, destination, world.time));
    const choice = porkchop.cheapest((o) => contract.paysInFull(o))!;
    const creditsBefore = world.wallet.credits;
    expect(commands.scheduleTransfer(ship, choice.option)).toEqual({ ok: true });
    expect(world.wallet.credits).toBeLessThan(creditsBefore);
    expect(ship.tank.amount).toBeCloseTo(choice.fuel, 6);

    const events: string[] = [];
    world.events.on('departed', () => events.push('departed'));
    world.events.on('arrived', () => events.push('arrived'));
    world.events.on('contractCompleted', ({ payout }) => events.push(`paid ${payout}`));

    while (world.time < choice.option.arrivalTime + 1) world.tick(1);

    expect(events).toEqual(['departed', 'arrived', 'paid 20000']);
    expect(ship.state).toMatchObject({ kind: 'docked', planet: destination });
    expect(ship.cargo).toBeUndefined();
    expect(ship.tank.amount).toBeGreaterThanOrEqual(0);
    expect(ship.tank.amount).toBeLessThan(1e-6);
  });

  it('rejects stale and infeasible schedules', () => {
    const { world, commands, ship, origin, destination } = setup();
    const past = world.planner.evaluate(origin, destination, world.time - 10, 250)!;
    expect(commands.scheduleTransfer(ship, past).ok).toBe(false);

    const brutal = world.planner.evaluate(origin, destination, world.time + 1, 60)!;
    expect(commands.scheduleTransfer(ship, brutal).ok).toBe(false);
  });

  it('cannot accept a contract at another planet', () => {
    const { commands, ship, origin, destination } = setup();
    const elsewhere = new Contract({
      id: 'T-2', kind: 'standard', origin: destination, destination: origin, mass: 10, reward: 1,
      payout: { kind: 'deadline', deadline: 0, gracePeriod: 1 }, offerExpires: 0,
    });
    expect(commands.acceptContract(ship, elsewhere).ok).toBe(false);
  });
});
