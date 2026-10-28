import type Phaser from 'phaser';
import type { SolarSystem } from '../../core/bodies/SolarSystem';
import { Vec2 } from '../../core/math/Vec2';
import type { MapCamera } from '../MapCamera';
import { COLORS } from '../theme';
import type { View } from './View';

const ORBIT_SAMPLES = 360;

/** The sun and every planet's orbit path; redrawn only when the camera moves. */
export class OrbitPaths implements View {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private drawnVersion = -1;

  constructor(
    scene: Phaser.Scene,
    private readonly system: SolarSystem,
    private readonly camera: MapCamera,
  ) {
    this.graphics = scene.add.graphics();
  }

  sync(): void {
    if (this.drawnVersion === this.camera.version) return;
    this.drawnVersion = this.camera.version;
    const g = this.graphics.clear();

    for (const planet of this.system.planets) {
      // Sampled from the orbit itself, so the ellipses (and their offset foci) draw correctly.
      const period = planet.orbit.period;
      g.lineStyle(1, COLORS.orbit, 1).beginPath();
      for (let i = 0; i <= ORBIT_SAMPLES; i++) {
        const p = this.camera.toScreen(planet.positionAt((period * i) / ORBIT_SAMPLES));
        if (i === 0) g.moveTo(p.x, p.y);
        else g.lineTo(p.x, p.y);
      }
      g.strokePath();
    }

    const sun = this.camera.toScreen(Vec2.ZERO);
    g.fillStyle(COLORS.sun, 0.15).fillCircle(sun.x, sun.y, 14);
    g.fillStyle(COLORS.sun, 1).fillCircle(sun.x, sun.y, 7);
  }

  destroy(): void {
    this.graphics.destroy();
  }
}
