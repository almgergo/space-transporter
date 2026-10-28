import type { Vec2 } from '../math/Vec2';
import type { KeplerOrbit } from '../orbital/KeplerOrbit';
import type { StateVector } from '../orbital/StateVector';

/** Surface/orbit-port properties that stand in for the planet's own gravity well. Speeds in AU/day. */
export interface Port {
  /** Δv to climb out to escape, added to the heliocentric departure burn. */
  readonly departureCost: number;
  /** Δv to settle into orbit/land after arrival. */
  readonly landingCost: number;
  /** Arrival excess speed an atmosphere can absorb for free; undefined = no atmosphere. */
  readonly aerobrakeLimit?: number;
  /** Credits per tonne of propellant. */
  readonly fuelPrice: number;
}

export class Planet {
  constructor(
    readonly id: string,
    readonly name: string,
    readonly orbit: KeplerOrbit,
    readonly port: Port,
  ) {}

  stateAt(t: number): StateVector {
    return this.orbit.stateAt(t);
  }

  positionAt(t: number): Vec2 {
    return this.orbit.stateAt(t).r;
  }
}
