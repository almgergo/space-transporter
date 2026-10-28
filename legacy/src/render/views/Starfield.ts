import type Phaser from 'phaser';
import { COLORS, WORLD_HEIGHT, WORLD_WIDTH } from '../theme';
import type { View } from './View';

export class Starfield implements View {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, count = 160) {
    this.graphics = scene.add.graphics();
    for (let i = 0; i < count; i++) {
      this.graphics.fillStyle(COLORS.star, 0.2 + Math.random() * 0.5);
      this.graphics.fillCircle(Math.random() * WORLD_WIDTH, Math.random() * WORLD_HEIGHT, Math.random() < 0.9 ? 0.8 : 1.5);
    }
  }

  sync(): void {}

  destroy(): void {
    this.graphics.destroy();
  }
}
