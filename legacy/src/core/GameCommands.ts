import { Vec2 } from './math/Vec2';
import { Autopilot } from './ship/Autopilot';
import type { Ship } from './ship/Ship';
import { HAULER, type ShipBlueprint, type ShipFactory } from './ship/ShipFactory';
import { TradeRoute } from './ship/TradeRoute';
import type { Station } from './station/Station';
import type { World } from './World';

export type CommandResult = { ok: true } | { ok: false; reason: string };

const OK: CommandResult = { ok: true };
const fail = (reason: string): CommandResult => ({ ok: false, reason });

/** The only entry point for player intent. UI layers call these; they never mutate the world directly. */
export class GameCommands {
  constructor(
    private readonly world: World,
    private readonly shipFactory: ShipFactory,
    private readonly homeStation: Station,
  ) {}

  assignRoute(ship: Ship, pickup: Station, dropoff: Station): CommandResult {
    const route = new TradeRoute(pickup, dropoff);
    if (pickup === dropoff) return fail('Pickup and dropoff must differ');
    if (!route.isViable) return fail(`${dropoff.name} buys nothing ${pickup.name} sells`);
    ship.assignAutopilot(new Autopilot(route, this.world.trade));
    return OK;
  }

  purchaseShip(blueprint: ShipBlueprint = HAULER): CommandResult {
    if (!this.world.wallet.withdraw(blueprint.price)) return fail(`Need ${blueprint.price} credits`);
    this.spawnShip(blueprint);
    return OK;
  }

  /** Adds a ship for free (scenario setup); it parks beside the home station. */
  spawnShip(blueprint: ShipBlueprint = HAULER): Ship {
    const slot = this.world.ships.length % 4;
    const parking = this.homeStation.position.add(new Vec2(-45 + slot * 30, 75));
    const ship = this.shipFactory.create(blueprint, parking);
    this.world.addShip(ship);
    return ship;
  }
}
