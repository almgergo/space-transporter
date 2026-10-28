import type { Vec2 } from '../math/Vec2';
import { TWO_PI } from '../units';
import { stumpffC, stumpffS } from './stumpff';

export interface LambertSolution {
  /** Velocity required at r1 at departure. */
  readonly v1: Vec2;
  /** Velocity on arrival at r2. */
  readonly v2: Vec2;
}

/** Below this distance from π the formulation is singular (A → 0, g → 0). */
const HALF_TURN_GUARD = 1e-6;
/** Transfer angles this close to 0 or 2π are degenerate (bodies aligned). */
const DEGENERATE_ANGLE = 1e-8;
const Z_MAX = 4 * Math.PI * Math.PI * (1 - 1e-6);

/**
 * Solves Lambert's problem: the prograde, zero-revolution conic from r1 to r2 in `tof` days.
 * Universal-variable formulation (Bate–Mueller–White / Curtis Alg. 5.2) with bisection on z.
 * Returns undefined when no such transfer exists.
 */
export function solveLambert(r1: Vec2, r2In: Vec2, tof: number, mu: number): LambertSolution | undefined {
  if (tof <= 0) return undefined;

  let r2 = r2In;
  let dTheta = transferAngle(r1, r2);
  if (dTheta < DEGENERATE_ANGLE || dTheta > TWO_PI - DEGENERATE_ANGLE) return undefined;
  if (Math.abs(dTheta - Math.PI) < HALF_TURN_GUARD) {
    // Rotate the target point itself (not just the angle) so f·r1 and r2 stop cancelling exactly.
    r2 = r2.rotate(Math.PI - HALF_TURN_GUARD - dTheta);
    dTheta = transferAngle(r1, r2);
  }

  const r1Len = r1.length();
  const r2Len = r2.length();
  const A = Math.sin(dTheta) * Math.sqrt((r1Len * r2Len) / (1 - Math.cos(dTheta)));
  const sqrtMuT = Math.sqrt(mu) * tof;

  const y = (z: number): number => r1Len + r2Len + (A * (z * stumpffS(z) - 1)) / Math.sqrt(stumpffC(z));
  const F = (z: number): number => {
    const yz = y(z);
    const C = stumpffC(z);
    return (yz / C) ** 1.5 * stumpffS(z) + A * Math.sqrt(yz) - sqrtMuT;
  };

  const zLow = findLowerBracket(y, F);
  if (zLow === undefined || !(F(Z_MAX) > 0)) return undefined;

  const z = bisect(F, zLow, Z_MAX);
  const yz = y(z);
  const f = 1 - yz / r1Len;
  const g = A * Math.sqrt(yz / mu);
  const gDot = 1 - yz / r2Len;

  return {
    v1: r2.sub(r1.scale(f)).scale(1 / g),
    v2: r2.scale(gDot).sub(r1).scale(1 / g),
  };
}

/** Prograde (counter-clockwise) angle from r1 to r2 in [0, 2π). */
export function transferAngle(r1: Vec2, r2: Vec2): number {
  // atan2 keeps full precision near 0 and π, where acos(dot) loses about half the digits.
  const angle = Math.atan2(r1.cross(r2), r1.dot(r2));
  return angle >= 0 ? angle : angle + TWO_PI;
}

/** Finds z with y(z) > 0 and F(z) < 0, or undefined if the root is not bracketed. */
function findLowerBracket(y: (z: number) => number, F: (z: number) => number): number | undefined {
  // y(z) is increasing in z; walk up from a negative start until y is positive.
  let z = -4 * Math.PI * Math.PI;
  while (y(z) <= 0) {
    z += 0.1;
    if (z >= Z_MAX) return undefined;
  }
  // Very short flights have their root deep in the hyperbolic range; extend downward while y stays valid.
  for (let i = 0; i < 60 && F(z) > 0; i++) {
    const next = z * 2 - 1;
    if (y(next) <= 0) return undefined;
    z = next;
  }
  return F(z) < 0 ? z : undefined;
}

function bisect(F: (z: number) => number, low: number, high: number): number {
  let lo = low;
  let hi = high;
  for (let i = 0; i < 200; i++) {
    const mid = (lo + hi) / 2;
    if (F(mid) < 0) lo = mid;
    else hi = mid;
    if (hi - lo < 1e-12 * Math.max(1, Math.abs(mid))) break;
  }
  return (lo + hi) / 2;
}
