import type { Vec2 } from '../math/Vec2';

/** Heliocentric position (AU) and velocity (AU/day). */
export interface StateVector {
  readonly r: Vec2;
  readonly v: Vec2;
}
