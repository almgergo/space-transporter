import type { GameCommands } from '../../core/GameCommands';
import { Vec2 } from '../../core/math/Vec2';
import type { World } from '../../core/World';
import { PICK_RADIUS } from '../theme';
import type { Selection } from './Selection';

/**
 * Turns clicks into route assignments:
 * click a ship → click a pickup station → click a dropoff station.
 * Right-click or clicking empty space cancels.
 */
export class SelectionController {
  constructor(
    private readonly world: World,
    private readonly commands: GameCommands,
    private readonly selection: Selection,
  ) {}

  click(x: number, y: number): void {
    const point = new Vec2(x, y);
    const ship = this.world.shipNear(point, PICK_RADIUS / 2);
    const station = this.world.stationNear(point, PICK_RADIUS);
    const state = this.selection.state;

    if (ship && (state.kind === 'none' || !station)) {
      this.selection.set({ kind: 'ship', ship }, `${ship.name}: choose a pickup station`);
      return;
    }
    if (!station) {
      this.selection.clear();
      return;
    }

    switch (state.kind) {
      case 'none':
        return;
      case 'ship':
        this.selection.set({ kind: 'pickup', ship: state.ship, pickup: station }, `Pickup ${station.name}: choose a dropoff`);
        return;
      case 'pickup': {
        const result = this.commands.assignRoute(state.ship, state.pickup, station);
        this.selection.set({ kind: 'ship', ship: state.ship }, result.ok ? '' : result.reason);
        return;
      }
    }
  }

  cancel(): void {
    this.selection.clear();
  }
}
