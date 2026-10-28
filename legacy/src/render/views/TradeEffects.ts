import type Phaser from 'phaser';
import type { TradeEvent } from '../../core/events/GameEvents';
import type { World } from '../../core/World';
import { FONT, TEXT } from '../theme';
import type { View } from './View';

/** Floats a credit delta above a station whenever a trade happens. */
export class TradeEffects implements View {
  private readonly unsubscribe: () => void;

  constructor(
    private readonly scene: Phaser.Scene,
    world: World,
  ) {
    this.unsubscribe = world.events.on('trade', (event) => this.spawn(event));
  }

  sync(): void {}

  private spawn({ station, credits }: TradeEvent): void {
    const { x, y } = station.position;
    const text = this.scene.add
      .text(x + 26, y - 10, `${credits > 0 ? '+' : ''}${credits}`, {
        fontFamily: FONT,
        fontSize: '13px',
        color: credits > 0 ? TEXT.positive : TEXT.negative,
      })
      .setOrigin(0, 0.5);
    this.scene.tweens.add({
      targets: text,
      y: y - 40,
      alpha: 0,
      duration: 1400,
      onComplete: () => text.destroy(),
    });
  }

  destroy(): void {
    this.unsubscribe();
  }
}
