import { describe, expect, it } from 'vitest';
import { Inventory } from '../src/core/inventory/Inventory';

describe('Inventory', () => {
  it('caps additions at capacity', () => {
    const inv = new Inventory(10);
    expect(inv.add('ore', 7)).toBe(7);
    expect(inv.add('food', 7)).toBe(3);
    expect(inv.freeSpace).toBe(0);
  });

  it('removes only what is available', () => {
    const inv = new Inventory(10);
    inv.add('ore', 4);
    expect(inv.remove('ore', 9)).toBe(4);
    expect(inv.isEmpty).toBe(true);
  });
});
