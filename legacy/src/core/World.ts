import { TradeService } from './economy/TradeService';
import { Wallet } from './economy/Wallet';
import { EventBus } from './events/EventBus';
import type { GameEvents } from './events/GameEvents';
import type { Vec2 } from './math/Vec2';
import type { Ship } from './ship/Ship';
import type { Station } from './station/Station';

/** Root of the simulation: owns all entities and advances them in fixed steps. */
export class World {
  readonly events = new EventBus<GameEvents>();
  readonly wallet: Wallet;
  readonly trade: TradeService;
  private readonly shipList: Ship[] = [];
  private elapsedTime = 0;

  constructor(
    readonly stations: readonly Station[],
    startingCredits: number,
  ) {
    this.wallet = new Wallet(startingCredits);
    this.trade = new TradeService(this.wallet, this.events);
  }

  get ships(): readonly Ship[] {
    return this.shipList;
  }

  get time(): number {
    return this.elapsedTime;
  }

  addShip(ship: Ship): void {
    this.shipList.push(ship);
    this.events.emit('shipAdded', { ship });
  }

  stationById(id: string): Station | undefined {
    return this.stations.find((s) => s.id === id);
  }

  shipById(id: string): Ship | undefined {
    return this.shipList.find((s) => s.id === id);
  }

  /** Closest station within `radius` of `point`, if any. */
  stationNear(point: Vec2, radius: number): Station | undefined {
    return closestWithin(this.stations, (s) => s.position, point, radius);
  }

  /** Closest ship within `radius` of `point`, if any. */
  shipNear(point: Vec2, radius: number): Ship | undefined {
    return closestWithin(this.shipList, (s) => s.navigator.position, point, radius);
  }

  tick(dt: number): void {
    this.elapsedTime += dt;
    for (const station of this.stations) station.update(dt);
    for (const ship of this.shipList) ship.update(dt);
  }
}

function closestWithin<T>(items: readonly T[], positionOf: (item: T) => Vec2, point: Vec2, radius: number): T | undefined {
  let best: T | undefined;
  let bestDistance = radius;
  for (const item of items) {
    const distance = positionOf(item).distanceTo(point);
    if (distance <= bestDistance) {
      best = item;
      bestDistance = distance;
    }
  }
  return best;
}
