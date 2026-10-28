import type Phaser from 'phaser';
import type { GameCommands } from '../../core/GameCommands';
import { HAULER } from '../../core/ship/ShipFactory';
import type { World } from '../../core/World';
import type { Selection } from '../input/Selection';
import { FONT, TEXT, WORLD_HEIGHT } from '../theme';
import type { View } from './View';

const HELP = 'Click a ship, then a pickup station, then a dropoff station. Right-click to cancel.';

export class HudView implements View {
  private readonly credits: Phaser.GameObjects.Text;
  private readonly status: Phaser.GameObjects.Text;
  private readonly buyButton: Phaser.GameObjects.Text;
  private readonly help: Phaser.GameObjects.Text;

  constructor(
    scene: Phaser.Scene,
    private readonly world: World,
    private readonly commands: GameCommands,
    private readonly selection: Selection,
  ) {
    this.credits = scene.add.text(16, 14, '', { fontFamily: FONT, fontSize: '18px', color: TEXT.accent });
    this.status = scene.add.text(16, 66, '', { fontFamily: FONT, fontSize: '13px', color: TEXT.primary });
    this.help = scene.add.text(16, WORLD_HEIGHT - 26, HELP, { fontFamily: FONT, fontSize: '12px', color: TEXT.muted });

    this.buyButton = scene.add
      .text(16, 40, `[ Buy hauler — ${HAULER.price} cr ]`, { fontFamily: FONT, fontSize: '13px', color: TEXT.primary })
      .setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.buyShip());
  }

  sync(): void {
    this.credits.setText(`${Math.floor(this.world.wallet.credits)} cr   ·   ${this.world.ships.length} ships`);
    this.status.setText([this.selection.message, this.describeSelectedShip()].filter(Boolean).join('\n'));
    this.buyButton.setColor(this.world.wallet.canAfford(HAULER.price) ? TEXT.primary : TEXT.muted);
  }

  private describeSelectedShip(): string {
    const ship = this.selection.ship;
    if (!ship) return '';
    const pilot = ship.autopilot;
    return pilot ? `${ship.name}: ${pilot.phase} (${pilot.route.pickup.name} → ${pilot.route.dropoff.name})` : `${ship.name}: idle`;
  }

  private buyShip(): void {
    const result = this.commands.purchaseShip();
    this.selection.clear(result.ok ? 'Hauler purchased' : result.reason);
  }

  destroy(): void {
    this.credits.destroy();
    this.status.destroy();
    this.buyButton.destroy();
    this.help.destroy();
  }
}
