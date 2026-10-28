import type { Vec2 } from '../math/Vec2';
import type { StateVector } from './StateVector';
import { stumpffC, stumpffS } from './stumpff';
import type { Trajectory } from './Trajectory';

/**
 * A coasting (ballistic) path defined by a state at an epoch, propagated with
 * universal variables, so elliptic, parabolic and hyperbolic arcs all work.
 */
export class ConicArc implements Trajectory {
  constructor(
    readonly initial: StateVector,
    readonly epoch: number,
    readonly mu: number,
  ) {}

  stateAt(t: number): StateVector {
    return propagate(this.initial, t - this.epoch, this.mu);
  }
}

/** Propagates a two-body state by `dt` days (universal Kepler equation + Lagrange coefficients). */
export function propagate({ r: r0, v: v0 }: StateVector, dt: number, mu: number): StateVector {
  if (dt === 0) return { r: r0, v: v0 };

  const sqrtMu = Math.sqrt(mu);
  const r0Len = r0.length();
  const vr0 = r0.dot(v0) / r0Len;
  const alpha = 2 / r0Len - v0.dot(v0) / mu;
  const chi = solveUniversalKepler(dt, r0Len, vr0, alpha, sqrtMu);

  const z = alpha * chi * chi;
  const C = stumpffC(z);
  const S = stumpffS(z);

  const f = 1 - ((chi * chi) / r0Len) * C;
  const g = dt - ((chi * chi * chi) / sqrtMu) * S;
  const r = r0.scale(f).add(v0.scale(g));
  const rLen = r.length();

  const fDot = (sqrtMu / (rLen * r0Len)) * (alpha * chi * chi * chi * S - chi);
  const gDot = 1 - ((chi * chi) / rLen) * C;
  const v: Vec2 = r0.scale(fDot).add(v0.scale(gDot));
  return { r, v };
}

function solveUniversalKepler(dt: number, r0: number, vr0: number, alpha: number, sqrtMu: number): number {
  const sigma = (r0 * vr0) / sqrtMu;
  let chi = initialGuess(dt, r0, vr0, alpha, sqrtMu);

  for (let i = 0; i < 100; i++) {
    const chi2 = chi * chi;
    const z = alpha * chi2;
    const C = stumpffC(z);
    const S = stumpffS(z);
    const F = sigma * chi2 * C + (1 - alpha * r0) * chi2 * chi * S + r0 * chi - sqrtMu * dt;
    const dF = sigma * chi * (1 - z * S) + (1 - alpha * r0) * chi2 * C + r0;
    const delta = F / dF;
    chi -= delta;
    if (Math.abs(delta) < 1e-12 * Math.max(1, Math.abs(chi))) break;
  }
  return chi;
}

/** Starting χ for Newton (after Vallado): ellipse, hyperbola, and a parabolic-scale fallback. */
function initialGuess(dt: number, r0: number, vr0: number, alpha: number, sqrtMu: number): number {
  if (alpha > 1e-10) return sqrtMu * alpha * dt;
  if (alpha < -1e-10) {
    const a = 1 / alpha;
    const sign = Math.sign(dt);
    const mu = sqrtMu * sqrtMu;
    const denom = r0 * vr0 + sign * Math.sqrt(-mu * a) * (1 - r0 * alpha);
    const guess = sign * Math.sqrt(-a) * Math.log((-2 * mu * alpha * dt) / denom);
    if (Number.isFinite(guess)) return guess;
  }
  return (sqrtMu * dt) / r0;
}
