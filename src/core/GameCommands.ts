import type { Planet } from './bodies/Planet';
import type { Contract } from './contracts/Contract';
import type { Ship } from './ship/Ship';
import type { ShipClass } from './ship/ShipClass';
import type { ShipFactory } from './ship/ShipFactory';
import type { TransferOption } from './transfer/TransferOption';
import type { World } from './World';

export type CommandResult = { ok: true } | { ok: false; reason: string };

const OK: CommandResult = { ok: true };
const fail = (reason: string): CommandResult => ({ ok: false, reason });

/** The only entry point for player intent. UI layers call these; they never mutate the world directly. */
export class GameCommands {
  constructor(
    private readonly world: World,
    private readonly shipFactory: ShipFactory,
    /** Where new ships are built and delivered. */
    readonly shipyard: Planet,
  ) {}

  /** Buys a ship of the given class; it is delivered docked at the shipyard with an empty tank. */
  purchaseShip(design: ShipClass): CommandResult {
    if (!this.world.wallet.withdraw(design.price)) return fail(`${design.name} costs ${design.price} cr`);
    this.world.addShip(this.shipFactory.create(design, this.shipyard));
    return OK;
  }

  acceptContract(ship: Ship, contract: Contract): CommandResult {
    const { state } = ship;
    if (state.kind !== 'docked') return fail(`${ship.name} must be docked (cancel its departure first)`);
    if (state.planet !== contract.terms.origin) return fail(`${ship.name} is not at ${contract.terms.origin.name}`);
    if (ship.cargo) return fail(`${ship.name} already carries ${ship.cargo.id}`);
    if (contract.terms.mass > ship.design.cargoCapacity) return fail(`Cargo exceeds ${ship.design.cargoCapacity} t capacity`);
    if (!this.world.contracts.take(contract)) return fail('Contract is no longer available');
    ship.load(contract);
    return OK;
  }

  /** Books a transfer: buys the missing propellant at the origin now; the ship departs at the option's time. */
  scheduleTransfer(ship: Ship, option: TransferOption): CommandResult {
    const { state } = ship;
    if (state.kind === 'inTransit') return fail(`${ship.name} is in transit`);
    if (state.planet !== option.origin) return fail(`${ship.name} is not at ${option.origin.name}`);
    if (option.departureTime < this.world.time) return fail('That departure date has passed; replan');

    const needed = ship.fuelFor(option.totalDeltaV);
    if (needed > ship.tank.capacity) return fail(`Needs ${needed.toFixed(1)} t of fuel; tank holds ${ship.tank.capacity} t`);

    const toBuy = Math.max(0, needed - ship.tank.amount);
    const cost = Math.ceil(toBuy * option.origin.port.fuelPrice);
    if (!this.world.wallet.withdraw(cost)) return fail(`Fuel costs ${cost} cr`);
    ship.tank.fill(toBuy);
    ship.setState({ kind: 'scheduled', planet: option.origin, transfer: option });
    return OK;
  }

  /** Cancels a booked departure. Purchased fuel stays in the tank. */
  cancelTransfer(ship: Ship): CommandResult {
    const { state } = ship;
    if (state.kind !== 'scheduled') return fail(`${ship.name} has no booked departure`);
    ship.setState({ kind: 'docked', planet: state.planet });
    return OK;
  }
}
