import type { Resource } from '../Resource';
import type { Inventory } from '../inventory/Inventory';

export interface MarketListing {
  readonly basePrice: number;
  /** Stock level at which the price equals the base price. */
  readonly targetStock: number;
}

/**
 * Prices goods a station trades. Price scales with scarcity:
 * empty stock → 2× base, target stock → 1× base, double target → 0.5× (floor).
 */
export class Market {
  constructor(
    private readonly inventory: Inventory,
    private readonly sells: ReadonlyMap<Resource, MarketListing>,
    private readonly buys: ReadonlyMap<Resource, MarketListing>,
  ) {}

  sellsResource(resource: Resource): boolean {
    return this.sells.has(resource);
  }

  buysResource(resource: Resource): boolean {
    return this.buys.has(resource);
  }

  get soldResources(): Resource[] {
    return [...this.sells.keys()];
  }

  get boughtResources(): Resource[] {
    return [...this.buys.keys()];
  }

  /** Price per unit the player pays to buy from this station. */
  sellPrice(resource: Resource): number | undefined {
    const listing = this.sells.get(resource);
    return listing && this.priceFor(resource, listing);
  }

  /** Price per unit the station pays the player. */
  buyPrice(resource: Resource): number | undefined {
    const listing = this.buys.get(resource);
    return listing && this.priceFor(resource, listing);
  }

  private priceFor(resource: Resource, listing: MarketListing): number {
    const stock = this.inventory.amountOf(resource);
    const scarcity = 1 - stock / listing.targetStock;
    const multiplier = Math.max(0.5, Math.min(2, 1 + scarcity));
    return Math.round(listing.basePrice * multiplier);
  }
}
