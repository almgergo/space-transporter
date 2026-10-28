import { describe, expect, it } from 'vitest';
import type { TradeEvent } from '../src/core/events/GameEvents';
import { createDefaultGame } from '../src/core/scenario';

function run(world: { tick(dt: number): void }, seconds: number, step = 1 / 30): void {
  for (let t = 0; t < seconds; t += step) world.tick(step);
}

describe('trade route', () => {
  it('hauls ore from mine to refinery and earns credits', () => {
    const { world, commands } = createDefaultGame();
    const ship = world.ships[0]!;
    const mine = world.stationById('mine')!;
    const refinery = world.stationById('refinery')!;
    const trades: TradeEvent[] = [];
    world.events.on('trade', (e) => trades.push(e));
    const startCredits = world.wallet.credits;

    expect(commands.assignRoute(ship, mine, refinery)).toEqual({ ok: true });
    run(world, 30);

    const bought = trades.filter((t) => t.credits < 0);
    const sold = trades.filter((t) => t.credits > 0);
    expect(bought.length).toBeGreaterThan(0);
    expect(sold.length).toBeGreaterThan(0);
    expect(sold.every((t) => t.station === refinery && t.resource === 'ore')).toBe(true);
    expect(world.wallet.credits).toBeGreaterThan(startCredits);
  });

  it('rejects routes with nothing to trade', () => {
    const { world, commands } = createDefaultGame();
    const result = commands.assignRoute(world.ships[0]!, world.stationById('mine')!, world.stationById('haven')!);
    expect(result.ok).toBe(false);
  });

  it('buys a ship only when affordable', () => {
    const { world, commands } = createDefaultGame();
    const before = world.ships.length;
    expect(commands.purchaseShip().ok).toBe(false);
    world.wallet.deposit(5000);
    expect(commands.purchaseShip().ok).toBe(true);
    expect(world.ships.length).toBe(before + 1);
  });
});
