import type Phaser from 'phaser';
import { COLORS } from '../theme';
import type { View } from './View';

/** Screen-space stars; regenerated only when the viewport size changes. */
export class Starfield implements View {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private size = '';

  constructor(private readonly scene: Phaser.Scene) {
    this.graphics = scene.add.graphics();
  }

  sync(): void {
    const { width, height } = this.scene.scale;
    const size = `${width}x${height}`;
    if (size === this.size) return;
    this.size = size;
    const g = this.graphics.clear();
    const count = Math.round((width * height) / 4000);
    for (let i = 0; i < count; i++) {
      g.fillStyle(COLORS.star, 0.15 + Math.random() * 0.45);
      g.fillCircle(Math.random() * width, Math.random() * height, Math.random() < 0.9 ? 0.7 : 1.4);
    }
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
