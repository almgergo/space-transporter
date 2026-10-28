import type Phaser from 'phaser';
import type { TransferOption } from '../../core/transfer/TransferOption';
import type { World } from '../../core/World';
import type { UiState } from '../../ui/UiState';
import type { MapCamera } from '../MapCamera';
import { COLORS, PLANET_COLORS } from '../theme';
import type { View } from './View';

const ARC_SAMPLES = 72;

/** Draws booked/in-flight trajectories and the porkchop preview with ghost planet positions. */
export class TrajectoryOverlay implements View {
  private readonly graphics: Phaser.GameObjects.Graphics;

  constructor(
    scene: Phaser.Scene,
    private readonly world: World,
    private readonly ui: UiState,
    private readonly camera: MapCamera,
  ) {
    this.graphics = scene.add.graphics();
  }

  sync(): void {
    this.graphics.clear();
    for (const ship of this.world.ships) {
      const state = ship.state;
      if (state.kind === 'scheduled') this.drawArc(state.transfer, state.transfer.departureTime, COLORS.scheduled, 0.6);
      if (state.kind === 'inTransit') this.drawArc(state.transfer, this.world.time, COLORS.inTransit, 0.8);
    }

    const preview = this.ui.preview;
    if (preview) {
      this.drawArc(preview, preview.departureTime, COLORS.preview, 1, 2);
      this.drawGhost(preview, preview.departureTime, 'origin');
      this.drawGhost(preview, preview.arrivalTime, 'target');
    }
  }

  private drawArc(transfer: TransferOption, from: number, color: number, alpha: number, width = 1.5): void {
    const g = this.graphics.lineStyle(width, color, alpha).beginPath();
    const to = transfer.arrivalTime;
    for (let i = 0; i <= ARC_SAMPLES; i++) {
      const t = from + ((to - from) * i) / ARC_SAMPLES;
      const p = this.camera.toScreen(transfer.arc.stateAt(t).r);
      if (i === 0) g.moveTo(p.x, p.y);
      else g.lineTo(p.x, p.y);
    }
    g.strokePath();
  }

  /** Hollow marker where a planet will be at a given time (departure or rendezvous point). */
  private drawGhost(transfer: TransferOption, t: number, which: 'origin' | 'target'): void {
    const planet = which === 'origin' ? transfer.origin : transfer.target;
    const p = this.camera.toScreen(planet.positionAt(t));
    this.graphics.lineStyle(1.5, PLANET_COLORS[planet.id] ?? 0xffffff, 0.9).strokeCircle(p.x, p.y, 9);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
