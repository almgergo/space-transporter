import type { SolarSystem } from './bodies/SolarSystem';
import type { Trip } from './contracts/Contract';
import type { ContractBoard } from './contracts/ContractBoard';
import { Wallet } from './economy/Wallet';
import { EventBus } from './events/EventBus';
import type { GameEvents } from './events/GameEvents';
import type { Ship } from './ship/Ship';
import type { TransferPlanner } from './transfer/TransferPlanner';

/** Root of the simulation. Time is in days since J2000; everything moves analytically. */
export class World {
  readonly events = new EventBus<GameEvents>();
  readonly wallet: Wallet;
  private readonly shipList: Ship[] = [];
  private now: number;

  constructor(
    readonly system: SolarSystem,
    readonly planner: TransferPlanner,
    readonly contracts: ContractBoard,
    startTime: number,
    startingCredits: number,
  ) {
    this.now = startTime;
    this.wallet = new Wallet(startingCredits);
  }

  get time(): number {
    return this.now;
  }

  get ships(): readonly Ship[] {
    return this.shipList;
  }

  addShip(ship: Ship): void {
    this.shipList.push(ship);
    this.events.emit('shipAdded', { ship });
  }

  tick(dt: number): void {
    this.now += dt;
    for (const ship of this.shipList) this.advanceShip(ship);
    const { posted, expired } = this.contracts.update(this.now);
    for (const contract of posted) this.events.emit('contractOffered', { contract });
    for (const contract of expired) this.events.emit('contractExpired', { contract });
  }

  private advanceShip(ship: Ship): void {
    const state = ship.state;
    if (state.kind === 'scheduled' && this.now >= state.transfer.departureTime) {
      ship.burn(state.transfer.departureDeltaV);
      ship.setState({ kind: 'inTransit', transfer: state.transfer });
      this.events.emit('departed', { ship });
    }

    const next = ship.state;
    if (next.kind === 'inTransit' && this.now >= next.transfer.arrivalTime) {
      ship.burn(next.transfer.arrivalDeltaV);
      ship.setState({ kind: 'docked', planet: next.transfer.target });
      this.events.emit('arrived', { ship });
      this.deliverCargo(ship, next.transfer);
    }
  }

  private deliverCargo(ship: Ship, trip: Trip): void {
    const contract = ship.cargo;
    if (ship.state.kind !== 'docked' || !contract || contract.terms.destination !== ship.state.planet) return;
    ship.unload();
    const payout = contract.payoutFor(trip);
    this.wallet.deposit(payout);
    this.events.emit('contractCompleted', { ship, contract, payout, late: payout < contract.terms.reward });
  }
}
