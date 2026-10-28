import type { EventBus } from '../events/EventBus';
import type { GameEvents } from '../events/GameEvents';
import type { Resource } from '../Resource';
import type { Ship } from '../ship/Ship';
import type { Station } from '../station/Station';
import type { Wallet } from './Wallet';

/** Moves goods between ships and stations, settling credits with the wallet. */
export class TradeService {
  constructor(
    private readonly wallet: Wallet,
    private readonly events: EventBus<GameEvents>,
  ) {}

  /** Buys the given resources from the station into the ship's cargo. Returns units bought. */
  buy(ship: Ship, station: Station, resources: readonly Resource[]): number {
    let bought = 0;
    for (const resource of resources) {
      const price = station.market.sellPrice(resource);
      if (price === undefined) continue;
      const affordable = price > 0 ? Math.floor(this.wallet.credits / price) : Infinity;
      const amount = Math.min(station.inventory.amountOf(resource), ship.cargo.freeSpace, affordable);
      if (amount <= 0) continue;

      station.inventory.remove(resource, amount);
      ship.cargo.add(resource, amount);
      this.wallet.withdraw(amount * price);
      this.events.emit('trade', { ship, station, resource, amount, credits: -amount * price });
      bought += amount;
    }
    return bought;
  }

  /** Sells every cargo resource the station buys, as far as station storage allows. Returns units sold. */
  sell(ship: Ship, station: Station): number {
    let sold = 0;
    for (const [resource, carried] of ship.cargo.contents()) {
      const price = station.market.buyPrice(resource);
      if (price === undefined) continue;
      const amount = Math.min(carried, station.inventory.freeSpace);
      if (amount <= 0) continue;

      ship.cargo.remove(resource, amount);
      station.inventory.add(resource, amount);
      this.wallet.deposit(amount * price);
      this.events.emit('trade', { ship, station, resource, amount, credits: amount * price });
      sold += amount;
    }
    return sold;
  }
}
