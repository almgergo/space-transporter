import { describe, expect, it } from 'vitest';
import type { Contract } from '../src/core/contracts/Contract';
import { ContractBoard } from '../src/core/contracts/ContractBoard';
import { CONTRACT_TEMPLATES } from '../src/core/contracts/contractTemplates';
import { Rng } from '../src/core/random/Rng';
import { createDefaultGame, createSolarSystem, START_DATE } from '../src/core/scenario';
import type { ShipClass } from '../src/core/ship/ShipClass';
import { LARGE_TRANSPORT, STANDARD } from '../src/core/ship/shipClasses';
import { FixedPortCostModel } from '../src/core/transfer/TransferCostModel';
import type { TransferOption } from '../src/core/transfer/TransferOption';
import { TransferPlanner } from '../src/core/transfer/TransferPlanner';
import { QUICK_HAULER } from '../src/core/ship/shipClasses';
import { Porkchop } from '../src/core/transfer/Porkchop';
import { defaultPorkchopSpec } from '../src/core/transfer/porkchopSpec';

describe('default scenario', () => {
  it('the starter contract is flyable in full by the starting freighter', () => {
    const { world } = createDefaultGame();
    const earth = world.system.planetById('earth')!;
    const ship = world.ships[0]!;
    const flyable = world.contracts.offers.filter((contract) => {
      if (contract.id !== 'C-000') return false;
      const profile = { ...ship.fuelProfile, massWithoutFuel: ship.design.dryMass + contract.terms.mass };
      const spec = defaultPorkchopSpec(earth, contract.terms.destination, world.time);
      const porkchop = Porkchop.compute(world.planner, earth, contract.terms.destination, profile, spec);
      return porkchop.cheapest((o) => contract.paysInFull(o)) !== undefined;
    });
    expect(flyable.length).toBeGreaterThan(0);
  });

  it('opens with one offer of every contract kind and a shipyard that sells ships', () => {
    const { world, commands } = createDefaultGame();
    expect(new Set(world.contracts.offers.map((c) => c.terms.kind)).size).toBe(5);
    expect(commands.purchaseShip(QUICK_HAULER).ok).toBe(false); // 20k start < 45k
    world.wallet.deposit(100_000);
    expect(commands.purchaseShip(QUICK_HAULER)).toEqual({ ok: true });
    expect(world.ships.at(-1)!.design).toBe(QUICK_HAULER);
    expect(world.ships.at(-1)!.state).toMatchObject({ kind: 'docked', planet: commands.shipyard });
  });
});

describe('contract generator', () => {
  // Mercury passenger runs need the fusion-drive quick hauler; the rest suit a standard freighter.
  const intendedShips: Record<string, readonly ShipClass[]> = {
    standard: [STANDARD], bulk: [LARGE_TRANSPORT], express: [QUICK_HAULER], passengers: [STANDARD, QUICK_HAULER], outerSupply: [QUICK_HAULER],
  };

  for (const template of CONTRACT_TEMPLATES) {
    it(`${template.kind} contracts can mostly be flown profitably by the intended ship class`, () => {
      const system = createSolarSystem();
      const board = new ContractBoard(system, new Rng(7), { offerInterval: 30, maxOpenOffers: 99, offerLifetime: 150, templates: [template] }, 0);
      const postedTimes = new Map<Contract, number>();
      for (let i = 0; i < 6; i++) {
        board.post(START_DATE + i * 97, [template]);
        postedTimes.set(board.offers.at(-1)!, START_DATE + i * 97);
      }
      for (const contract of board.offers) {
        expect(contract.terms.offerExpires).toBeGreaterThan(postedTimes.get(contract)!);
        if (contract.terms.payout.kind === 'deadline') expect(contract.terms.offerExpires).toBeLessThan(contract.terms.payout.deadline);
      }
      const planner = new TransferPlanner(system.mu, new FixedPortCostModel());

      const flyable = board.offers.filter((contract) => {
        const { origin, destination, mass } = contract.terms;
        const postedAt = postedTimes.get(contract)!;
        const spec = { ...defaultPorkchopSpec(origin, destination, postedAt), columns: 30, rows: 20 };
        // Deadline kinds should be winnable in full; passenger full pay is a stretch goal, so require ≥ 75%.
        const good = template.kind === 'passengers'
          ? (o: TransferOption) => contract.payoutFor(o) >= 0.75 * contract.terms.reward
          : (o: TransferOption) => contract.paysInFull(o);
        return intendedShips[template.kind]!.some((design) => {
          if (mass > design.cargoCapacity) return false;
          const profile = { massWithoutFuel: design.dryMass + mass, tankCapacity: design.tankCapacity, exhaustVelocity: design.exhaustVelocity };
          return Porkchop.compute(planner, origin, destination, profile, spec).cheapest(good) !== undefined;
        });
      });
      expect(flyable.length, template.kind).toBeGreaterThanOrEqual(4);
    });
  }
});
