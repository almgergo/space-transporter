import type { Planet } from '../bodies/Planet';

/** Turns heliocentric excess speeds into burn Δv at each end. Swappable (e.g. for patched conics). */
export interface TransferCostModel {
  departureDeltaV(origin: Planet, excessSpeed: number): number;
  arrivalDeltaV(target: Planet, excessSpeed: number): number;
}

/**
 * Point-mass planets plus fixed per-port costs. Atmospheres absorb arrival speed up to their
 * aerobrake limit; anything above has to be burned off.
 */
export class FixedPortCostModel implements TransferCostModel {
  departureDeltaV(origin: Planet, excessSpeed: number): number {
    return excessSpeed + origin.port.departureCost;
  }

  arrivalDeltaV(target: Planet, excessSpeed: number): number {
    const { aerobrakeLimit, landingCost } = target.port;
    const burned = aerobrakeLimit === undefined ? excessSpeed : Math.max(0, excessSpeed - aerobrakeLimit);
    return burned + landingCost;
  }
}
