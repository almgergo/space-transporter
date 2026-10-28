import Phaser from 'phaser';
import { FixedStepClock } from '../core/loop/FixedStepClock';
import { Vec2 } from '../core/math/Vec2';
import type { GameSession } from '../core/scenario';
import type { Ship } from '../core/ship/Ship';
import type { UiState } from '../ui/UiState';
import { MapCamera } from './MapCamera';
import { INNER_VIEW_RADIUS, OUTER_VIEW_RADIUS } from './theme';
import { OrbitPaths } from './views/OrbitPaths';
import { PlanetView } from './views/PlanetView';
import { ShipView } from './views/ShipView';
import { Starfield } from './views/Starfield';
import { TrajectoryOverlay } from './views/TrajectoryOverlay';
import type { View } from './views/View';

/** Simulation step in days. Positions are analytic, so this only bounds event-timing granularity. */
const SIM_STEP_DAYS = 0.25;
/** Fraction of the remaining distance the camera closes per frame when following a focus. */
const FOCUS_EASE = 0.15;
const WHEEL_ZOOM = 1.0015;

/** Drives simulation time from the warp setting and renders the zoomable system map. */
export class MapScene extends Phaser.Scene {
  private readonly clock = new FixedStepClock(SIM_STEP_DAYS, 1000);
  private readonly camera = new MapCamera();
  private readonly views: View[] = [];
  private shipLayerIndex = 0;

  constructor(
    private readonly session: GameSession,
    private readonly ui: UiState,
  ) {
    super('map');
  }

  create(): void {
    const { world } = this.session;
    this.camera.resize(this.scale.width, this.scale.height);
    this.camera.approach(Vec2.ZERO, this.camera.fitScale(INNER_VIEW_RADIUS), 1);

    this.views.push(new Starfield(this), new OrbitPaths(this, world.system, this.camera), new TrajectoryOverlay(this, world, this.ui, this.camera));
    for (const planet of world.system.planets) this.views.push(new PlanetView(this, planet, world, this.camera));
    this.shipLayerIndex = this.views.length;
    for (const ship of world.ships) this.addShipView(ship);

    const unsubscribe = world.events.on('shipAdded', ({ ship }) => this.addShipView(ship));
    this.scale.on(Phaser.Scale.Events.RESIZE, (size: Phaser.Structs.Size) => this.camera.resize(size.width, size.height));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      this.views.forEach((v) => v.destroy());
    });
    this.bindInput();
  }

  override update(_time: number, deltaMs: number): void {
    // Warp is days per real second; the clock consumes simulated days in fixed steps.
    const simDays = Math.min(deltaMs / 1000, 0.1) * this.ui.warp;
    this.clock.advance(simDays, (dt) => this.session.world.tick(dt));
    this.followFocus();
    for (const view of this.views) view.sync();
  }

  private addShipView(ship: Ship): void {
    this.views.splice(this.shipLayerIndex++, 0, new ShipView(this, ship, this.session.world, this.ui, this.camera));
  }

  private followFocus(): void {
    switch (this.ui.focus) {
      case 'inner':
        return this.camera.approach(Vec2.ZERO, this.camera.fitScale(INNER_VIEW_RADIUS), FOCUS_EASE);
      case 'outer':
        return this.camera.approach(Vec2.ZERO, this.camera.fitScale(OUTER_VIEW_RADIUS), FOCUS_EASE);
      case 'ship': {
        const ship = this.ui.selectedShip;
        if (ship) this.camera.approach(ship.positionAt(this.session.world.time), this.camera.pxPerAu, FOCUS_EASE);
        return;
      }
      case 'free':
        return;
    }
  }

  private bindInput(): void {
    this.input.on(Phaser.Input.Events.POINTER_WHEEL, (pointer: Phaser.Input.Pointer, _over: unknown, _dx: number, dy: number) => {
      this.camera.zoomAt(pointer.x, pointer.y, Math.pow(WHEEL_ZOOM, -dy));
      if (this.ui.focus !== 'ship') this.ui.setFocus('free');
    });
    this.input.on(Phaser.Input.Events.POINTER_MOVE, (pointer: Phaser.Input.Pointer) => {
      if (!pointer.isDown) return;
      this.camera.panBy(pointer.x - pointer.prevPosition.x, pointer.y - pointer.prevPosition.y);
      this.ui.setFocus('free');
    });
  }
}
