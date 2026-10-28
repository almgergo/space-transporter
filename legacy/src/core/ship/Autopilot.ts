import type { TradeService } from '../economy/TradeService';
import type { Ship } from './Ship';
import type { TradeRoute } from './TradeRoute';

export type RoutePhase = 'toPickup' | 'loading' | 'toDropoff' | 'unloading';

/** Seconds a ship spends docked per load/unload attempt. */
export const DOCK_TIME = 1;

/** Drives a ship around a trade route: fly → load → fly → unload → repeat. */
export class Autopilot {
  private currentPhase: RoutePhase = 'toPickup';
  private dockTimer = 0;

  constructor(
    readonly route: TradeRoute,
    private readonly trade: TradeService,
  ) {}

  get phase(): RoutePhase {
    return this.currentPhase;
  }

  /** Called once when the autopilot takes control of a ship. */
  engage(ship: Ship): void {
    this.currentPhase = 'toPickup';
    ship.navigator.travelTo(this.route.pickup.position);
  }

  update(dt: number, ship: Ship): void {
    switch (this.currentPhase) {
      case 'toPickup':
        if (ship.navigator.hasArrived) this.dock('loading');
        break;
      case 'toDropoff':
        if (ship.navigator.hasArrived) this.dock('unloading');
        break;
      case 'loading':
        if (this.tickDock(dt)) this.load(ship);
        break;
      case 'unloading':
        if (this.tickDock(dt)) this.unload(ship);
        break;
    }
  }

  private load(ship: Ship): void {
    this.trade.buy(ship, this.route.pickup, this.route.tradedResources);
    if (ship.cargo.isEmpty) {
      this.dock('loading'); // nothing to carry yet; wait and retry
      return;
    }
    this.currentPhase = 'toDropoff';
    ship.navigator.travelTo(this.route.dropoff.position);
  }

  private unload(ship: Ship): void {
    this.trade.sell(ship, this.route.dropoff);
    this.currentPhase = 'toPickup';
    ship.navigator.travelTo(this.route.pickup.position);
  }

  private dock(phase: RoutePhase): void {
    this.currentPhase = phase;
    this.dockTimer = DOCK_TIME;
  }

  /** Returns true when the dock timer has elapsed. */
  private tickDock(dt: number): boolean {
    this.dockTimer -= dt;
    return this.dockTimer <= 0;
  }
}
