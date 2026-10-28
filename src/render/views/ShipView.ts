import type Phaser from 'phaser';
import type { Ship } from '../../core/ship/Ship';
import type { World } from '../../core/World';
import type { UiState } from '../../ui/UiState';
import type { MapCamera } from '../MapCamera';
import { COLORS, FONT, TEXT } from '../theme';
import type { View } from './View';

/** Pixels between ships parked at the same planet. */
const DOCK_SPACING = 14;

export class ShipView implements View {
  private readonly hull: Phaser.GameObjects.Graphics;
  private readonly halo: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly ship: Ship,
    private readonly world: World,
    private readonly ui: UiState,
    private readonly camera: MapCamera,
  ) {
    this.halo = scene.add.graphics();
    this.halo.lineStyle(1.5, COLORS.selection, 1).strokeCircle(0, 0, 9);
    this.hull = scene.add.graphics();
    this.hull.fillStyle(COLORS.ship, 1).fillTriangle(6, 0, -4, -4, -4, 4);
    this.label = scene.add.text(0, 0, ship.name, { fontFamily: FONT, fontSize: '10px', color: TEXT.muted }).setOrigin(0, 0.5);
  }

  sync(): void {
    const t = this.world.time;
    const state = this.ship.state;
    let { x, y } = this.camera.toScreen(this.ship.positionAt(t));

    if (state.kind === 'inTransit') {
      const v = state.transfer.arc.stateAt(t).v;
      this.hull.setRotation(-Math.atan2(v.y, v.x));
    } else {
      // Fan docked ships out below their planet so they don't overlap it or each other.
      const docked = this.world.ships.filter((s) => s.state.kind !== 'inTransit' && s.state.planet === state.planet);
      x += (docked.indexOf(this.ship) - (docked.length - 1) / 2) * DOCK_SPACING;
      y += 24;
      this.hull.setRotation(-Math.PI / 2);
    }

    this.hull.setPosition(x, y);
    this.halo.setPosition(x, y).setVisible(this.ui.selectedShip === this.ship);
    this.label.setPosition(x + 13, y).setVisible(state.kind === 'inTransit' || this.ui.selectedShip === this.ship);
  }

  destroy(): void {
    this.hull.destroy();
    this.halo.destroy();
    this.label.destroy();
  }
}
