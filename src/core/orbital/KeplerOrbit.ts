import { Vec2 } from '../math/Vec2';
import { TWO_PI } from '../units';
import type { StateVector } from './StateVector';
import type { Trajectory } from './Trajectory';

/** Classical 2D orbital elements. Angles in radians, distances in AU, times in days since J2000. */
export interface OrbitalElements {
  readonly semiMajorAxis: number;
  readonly eccentricity: number;
  /** Longitude of perihelion ϖ. */
  readonly longitudeOfPerihelion: number;
  /** Mean anomaly at `epoch`. */
  readonly meanAnomalyAtEpoch: number;
  readonly epoch: number;
}

/** A closed (elliptical or circular) orbit evaluated analytically via Kepler's equation. */
export class KeplerOrbit implements Trajectory {
  /** Mean motion n, radians/day. */
  readonly meanMotion: number;

  constructor(
    readonly elements: OrbitalElements,
    readonly mu: number,
  ) {
    if (elements.eccentricity < 0 || elements.eccentricity >= 1) {
      throw new RangeError('KeplerOrbit supports 0 ≤ e < 1');
    }
    this.meanMotion = Math.sqrt(mu / elements.semiMajorAxis ** 3);
  }

  /** Circular orbit with mean longitude `meanLongitude` (radians) at `epoch`. */
  static circular(radius: number, meanLongitude: number, epoch: number, mu: number): KeplerOrbit {
    return new KeplerOrbit(
      { semiMajorAxis: radius, eccentricity: 0, longitudeOfPerihelion: 0, meanAnomalyAtEpoch: meanLongitude, epoch },
      mu,
    );
  }

  get period(): number {
    return TWO_PI / this.meanMotion;
  }

  stateAt(t: number): StateVector {
    const { semiMajorAxis: a, eccentricity: e, longitudeOfPerihelion, meanAnomalyAtEpoch, epoch } = this.elements;
    const meanAnomaly = meanAnomalyAtEpoch + this.meanMotion * (t - epoch);
    const E = solveKepler(meanAnomaly, e);
    const cosE = Math.cos(E);
    const sinE = Math.sin(E);
    const b = Math.sqrt(1 - e * e);
    const rate = (a * this.meanMotion) / (1 - e * cosE);

    const r = new Vec2(a * (cosE - e), a * b * sinE).rotate(longitudeOfPerihelion);
    const v = new Vec2(-rate * sinE, rate * b * cosE).rotate(longitudeOfPerihelion);
    return { r, v };
  }
}

/** Solves M = E − e·sin(E) for the eccentric anomaly E (Newton's method). */
export function solveKepler(meanAnomaly: number, e: number): number {
  const M = ((meanAnomaly % TWO_PI) + TWO_PI) % TWO_PI;
  if (e === 0) return M;
  let E = e > 0.8 ? Math.PI : M;
  for (let i = 0; i < 50; i++) {
    const delta = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= delta;
    if (Math.abs(delta) < 1e-13) break;
  }
  return E;
}
