import type Phaser from 'phaser';
import type { Planet } from '../../core/bodies/Planet';
import type { World } from '../../core/World';
import type { MapCamera } from '../MapCamera';
import { FONT, PLANET_COLORS, TEXT } from '../theme';
import type { View } from './View';

/** Planets whose orbit is drawn smaller than this (px radius) are unlabelled. */
const MIN_LABEL_ORBIT_PX = 40;

export class PlanetView implements View {
  private readonly body: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly planet: Planet,
    private readonly world: World,
    private readonly camera: MapCamera,
  ) {
    const color = PLANET_COLORS[planet.id] ?? 0xffffff;
    this.body = scene.add.graphics();
    this.body.fillStyle(color, 0.2).fillCircle(0, 0, 13);
    this.body.fillStyle(color, 1).fillCircle(0, 0, 7);
    this.label = scene.add.text(0, 0, planet.name, { fontFamily: FONT, fontSize: '13px', color: TEXT.primary }).setOrigin(0.5, 1);
  }

  sync(): void {
    const { x, y } = this.camera.toScreen(this.planet.positionAt(this.world.time));
    this.body.setPosition(x, y);
    // Inner orbits collapse around the sun when zoomed out; drop their labels before they pile up.
    const orbitPixels = this.planet.orbit.elements.semiMajorAxis * this.camera.pxPerAu;
    this.label.setPosition(x, y - 16).setVisible(orbitPixels > MIN_LABEL_ORBIT_PX);
  }

  destroy(): void {
    this.body.destroy();
    this.label.destroy();
  }
}
