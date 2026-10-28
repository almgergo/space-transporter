import type { Resource } from '../Resource';
import type { Station } from '../station/Station';

/** A pickup → dropoff pairing. Carries whatever the pickup sells and the dropoff buys. */
export class TradeRoute {
  constructor(
    readonly pickup: Station,
    readonly dropoff: Station,
  ) {}

  get tradedResources(): Resource[] {
    return this.pickup.market.soldResources.filter((r) => this.dropoff.market.buysResource(r));
  }

  get isViable(): boolean {
    return this.pickup !== this.dropoff && this.tradedResources.length > 0;
  }
}
