import type { StateVector } from './StateVector';

/** Anything whose heliocentric state can be evaluated at an arbitrary time (days since J2000). */
export interface Trajectory {
  stateAt(t: number): StateVector;
}
