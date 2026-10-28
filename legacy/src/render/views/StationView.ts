import type Phaser from 'phaser';
import type { Station } from '../../core/station/Station';
import { COLORS, FONT, RESOURCE_COLORS, STATION_COLORS, STATION_RADIUS, TEXT } from '../theme';
import type { View } from './View';

export class StationView implements View {
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly progress: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly stock: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly station: Station,
  ) {
    const { x, y } = station.position;
    const color = STATION_COLORS[station.kind];

    this.body = scene.add.graphics({ x, y });
    this.body.fillStyle(color, 0.18).fillCircle(0, 0, STATION_RADIUS);
    this.body.lineStyle(2, color, 1).strokeCircle(0, 0, STATION_RADIUS);
    this.body.fillStyle(color, 1).fillCircle(0, 0, 5);

    this.progress = scene.add.graphics({ x, y });
    this.label = scene.add
      .text(x, y - STATION_RADIUS - 8, station.name, { fontFamily: FONT, fontSize: '13px', color: TEXT.primary })
      .setOrigin(0.5, 1);
    this.stock = scene.add.text(x, y + STATION_RADIUS + 6, '', { fontFamily: FONT, fontSize: '11px', align: 'center' }).setOrigin(0.5, 0);
  }

  sync(): void {
    this.drawProgress();
    this.drawStock();
  }

  private drawProgress(): void {
    const module = this.station.production[0];
    this.progress.clear();
    if (!module?.isRunning) return;
    const start = -Math.PI / 2;
    this.progress.lineStyle(3, COLORS.progress, 0.9);
    this.progress.beginPath();
    this.progress.arc(0, 0, STATION_RADIUS + 5, start, start + module.cycleProgress * Math.PI * 2);
    this.progress.strokePath();
  }

  private drawStock(): void {
    const contents = this.station.inventory.contents();
    const lines = contents.map(([resource, amount]) => `${resource} ${Math.floor(amount)}`);
    this.stock.setText(lines.length ? lines.join('\n') : 'empty');
    const only = contents.length === 1 ? contents[0] : undefined;
    this.stock.setColor(only ? RESOURCE_COLORS[only[0]] : TEXT.muted);
  }

  destroy(): void {
    this.body.destroy();
    this.progress.destroy();
    this.label.destroy();
    this.stock.destroy();
  }
}
