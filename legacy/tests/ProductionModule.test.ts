import { describe, expect, it } from 'vitest';
import { Inventory } from '../src/core/inventory/Inventory';
import { ProductionModule } from '../src/core/production/ProductionModule';

const smelt = { name: 'smelt', inputs: { ore: 2 }, outputs: { metal: 1 }, cycleTime: 1 };

describe('ProductionModule', () => {
  it('converts inputs to outputs once per cycle', () => {
    const inv = new Inventory(100);
    inv.add('ore', 5);
    const module = new ProductionModule(smelt, inv);

    module.update(2);

    expect(inv.amountOf('ore')).toBe(1);
    expect(inv.amountOf('metal')).toBe(2);
  });

  it('stalls without inputs', () => {
    const inv = new Inventory(100);
    const module = new ProductionModule(smelt, inv);
    module.update(5);
    expect(inv.amountOf('metal')).toBe(0);
    expect(module.isRunning).toBe(false);
  });

  it('stalls when output would overflow storage', () => {
    const inv = new Inventory(3);
    const mine = new ProductionModule({ name: 'mine', inputs: {}, outputs: { ore: 2 }, cycleTime: 1 }, inv);
    mine.update(5);
    expect(inv.amountOf('ore')).toBe(2);
  });
});
