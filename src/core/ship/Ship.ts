import type { Contract } from '../contracts/Contract';
import type { Vec2 } from '../math/Vec2';
import { FuelTank } from '../propulsion/FuelTank';
import { fuelBurnedFrom, fuelForDeltaV } from '../propulsion/rocket';
import type { FuelProfile } from '../transfer/Porkchop';
import type { ShipClass } from './ShipClass';
import type { ShipState } from './ShipState';

/** A cargo ship: a hull design plus a fuel tank, an optional contract cargo and a flight state. */
export class Ship {
  readonly tank: FuelTank;
  private flight: ShipState;
  private carried: Contract | undefined;

  constructor(
    readonly id: string,
    readonly name: string,
    readonly design: ShipClass,
    initialState: ShipState,
    initialFuel = 0,
  ) {
    this.tank = new FuelTank(design.tankCapacity, initialFuel);
    this.flight = initialState;
  }

  get state(): ShipState {
    return this.flight;
  }

  get cargo(): Contract | undefined {
    return this.carried;
  }

  get cargoMass(): number {
    return this.carried?.terms.mass ?? 0;
  }

  get massWithoutFuel(): number {
    return this.design.dryMass + this.cargoMass;
  }

  get fuelProfile(): FuelProfile {
    return {
      massWithoutFuel: this.massWithoutFuel,
      tankCapacity: this.design.tankCapacity,
      exhaustVelocity: this.design.exhaustVelocity,
    };
  }

  /** Total propellant to fly `deltaV` with the current cargo. */
  fuelFor(deltaV: number): number {
    return fuelForDeltaV(this.massWithoutFuel, deltaV, this.design.exhaustVelocity);
  }

  positionAt(t: number): Vec2 {
    const state = this.flight;
    return state.kind === 'inTransit' ? state.transfer.arc.stateAt(t).r : state.planet.positionAt(t);
  }

  setState(state: ShipState): void {
    this.flight = state;
  }

  load(contract: Contract): void {
    this.carried = contract;
  }

  unload(): Contract | undefined {
    const contract = this.carried;
    this.carried = undefined;
    return contract;
  }

  /** Burns propellant for an impulsive manoeuvre; returns tonnes used. */
  burn(deltaV: number): number {
    const mass = this.massWithoutFuel + this.tank.amount;
    return this.tank.draw(fuelBurnedFrom(mass, deltaV, this.design.exhaustVelocity));
  }
}
