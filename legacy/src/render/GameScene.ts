import Phaser from 'phaser';
import { FixedStepClock } from '../core/loop/FixedStepClock';
import type { GameSession } from '../core/scenario';
import type { Ship } from '../core/ship/Ship';
import { Selection } from './input/Selection';
import { SelectionController } from './input/SelectionController';
import { HudView } from './views/HudView';
import { RouteOverlay } from './views/RouteOverlay';
import { ShipView } from './views/ShipView';
import { Starfield } from './views/Starfield';
import { StationView } from './views/StationView';
import { TradeEffects } from './views/TradeEffects';
import type { View } from './views/View';

/** Composition root for the presentation layer: advances the simulation and syncs views. */
export class GameScene extends Phaser.Scene {
  private readonly clock = new FixedStepClock();
  private readonly selection = new Selection();
  private readonly views: View[] = [];

  constructor(private readonly session: GameSession) {
    super('game');
  }

  create(): void {
    const { world, commands } = this.session;

    this.views.push(new Starfield(this), new RouteOverlay(this, world, this.selection));
    for (const station of world.stations) this.views.push(new StationView(this, station));
    for (const ship of world.ships) this.addShipView(ship);
    this.views.push(new TradeEffects(this, world), new HudView(this, world, commands, this.selection));

    const unsubscribe = world.events.on('shipAdded', ({ ship }) => this.addShipView(ship));
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      unsubscribe();
      this.views.forEach((v) => v.destroy());
    });

    this.bindInput(new SelectionController(world, commands, this.selection));
  }

  override update(_time: number, deltaMs: number): void {
    this.clock.advance(deltaMs / 1000, (dt) => this.session.world.tick(dt));
    for (const view of this.views) view.sync();
  }

  private addShipView(ship: Ship): void {
    this.views.push(new ShipView(this, ship, this.selection));
  }

  private bindInput(controller: SelectionController): void {
    this.input.mouse?.disableContextMenu();
    this.input.on(Phaser.Input.Events.POINTER_DOWN, (pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]) => {
      if (over.length > 0) return; // handled by an interactive UI element
      if (pointer.rightButtonDown()) controller.cancel();
      else controller.click(pointer.worldX, pointer.worldY);
    });
  }
}
