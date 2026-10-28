import type Phaser from 'phaser';
import type { Vec2 } from '../../core/math/Vec2';
import type { World } from '../../core/World';
import type { Selection } from '../input/Selection';
import { COLORS } from '../theme';
import type { View } from './View';

/** Draws every ship's trade route, highlighting the selected one. */
export class RouteOverlay implements View {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly world: World,
    private readonly selection: Selection,
  ) {
    this.graphics = scene.add.graphics();
  }

  sync(): void {
    const g = this.graphics.clear();
    const selected = this.selection.ship;

    for (const ship of this.world.ships) {
      const route = ship.autopilot?.route;
      if (!route) continue;
      const active = ship === selected;
      g.lineStyle(active ? 2 : 1, active ? COLORS.routeActive : COLORS.route, active ? 0.9 : 0.6);
      this.line(route.pickup.position, route.dropoff.position);
    }

    const state = this.selection.state;
    if (state.kind === 'pickup') {
      g.lineStyle(2, COLORS.routePending, 0.9).strokeCircle(state.pickup.position.x, state.pickup.position.y, 30);
    }
  }

  private line(from: Vec2, to: Vec2): void {
    this.graphics.lineBetween(from.x, from.y, to.x, to.y);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
