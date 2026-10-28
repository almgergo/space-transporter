import type Phaser from 'phaser';
import type { Ship } from '../../core/ship/Ship';
import type { Selection } from '../input/Selection';
import { COLORS, FONT, RESOURCE_COLORS, TEXT } from '../theme';
import type { View } from './View';

export class ShipView implements View {
  private readonly hull: Phaser.GameObjects.Graphics;
  private readonly halo: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly ship: Ship,
    private readonly selection: Selection,
  ) {
    this.halo = scene.add.graphics();
    this.halo.lineStyle(1.5, COLORS.selection, 1).strokeCircle(0, 0, 14);

    this.hull = scene.add.graphics();
    this.hull.fillStyle(COLORS.ship, 1).fillTriangle(10, 0, -7, -6, -7, 6);

    this.label = scene.add.text(0, 0, '', { fontFamily: FONT, fontSize: '10px', color: TEXT.muted }).setOrigin(0.5, 0);
  }

  sync(): void {
    const { x, y } = this.ship.navigator.position;
    const target = this.ship.navigator.target;
    if (target) this.hull.setRotation(Math.atan2(target.y - y, target.x - x));

    this.hull.setPosition(x, y);
    this.halo.setPosition(x, y).setVisible(this.selection.ship === this.ship);

    const cargo = this.ship.cargo.contents()[0];
    this.label.setPosition(x, y + 10);
    this.label.setText(cargo ? `${cargo[0]} ${cargo[1]}` : this.ship.autopilot ? '' : 'idle');
    this.label.setColor(cargo ? RESOURCE_COLORS[cargo[0]] : TEXT.muted);
  }

  destroy(): void {
    this.hull.destroy();
    this.halo.destroy();
    this.label.destroy();
  }
}
