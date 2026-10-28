import { describe, expect, it } from 'vitest';
import { Market } from '../src/core/economy/Market';
import { Inventory } from '../src/core/inventory/Inventory';

describe('Market', () => {
  it('prices rise with scarcity and fall with surplus', () => {
    const inv = new Inventory(1000);
    const market = new Market(inv, new Map(), new Map([['ore', { basePrice: 10, targetStock: 100 }]]));

    expect(market.buyPrice('ore')).toBe(20);
    inv.add('ore', 100);
    expect(market.buyPrice('ore')).toBe(10);
    inv.add('ore', 200);
    expect(market.buyPrice('ore')).toBe(5);
  });

  it('returns undefined for unlisted resources', () => {
    const market = new Market(new Inventory(10), new Map(), new Map());
    expect(market.sellPrice('food')).toBeUndefined();
  });
});
