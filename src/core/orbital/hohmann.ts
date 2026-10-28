import { TWO_PI } from '../units';

export interface HohmannTransfer {
  /** Departure burn magnitude (AU/day). */
  readonly deltaV1: number;
  /** Arrival burn magnitude (AU/day). */
  readonly deltaV2: number;
  readonly timeOfFlight: number;
  /** Target angle relative to origin at departure (radians, wrapped to (−π, π]). */
  readonly phaseAngle: number;
}

/** Closed-form Hohmann transfer between coplanar circular orbits. Reference for tests and the HUD. */
export function hohmann(r1: number, r2: number, mu: number): HohmannTransfer {
  const sum = r1 + r2;
  const timeOfFlight = Math.PI * Math.sqrt((sum / 2) ** 3 / mu);
  const n2 = Math.sqrt(mu / r2 ** 3);
  return {
    deltaV1: Math.abs(Math.sqrt(mu / r1) * (Math.sqrt((2 * r2) / sum) - 1)),
    deltaV2: Math.abs(Math.sqrt(mu / r2) * (1 - Math.sqrt((2 * r1) / sum))),
    timeOfFlight,
    phaseAngle: wrapSigned(Math.PI - n2 * timeOfFlight),
  };
}

/** Time between repeats of the same relative geometry of two orbits. */
export function synodicPeriod(period1: number, period2: number): number {
  return 1 / Math.abs(1 / period1 - 1 / period2);
}

function wrapSigned(angle: number): number {
  const wrapped = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
  return wrapped > Math.PI ? wrapped - TWO_PI : wrapped;
}
