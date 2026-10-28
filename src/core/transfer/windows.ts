import type { Planet } from '../bodies/Planet';
import { hohmann, synodicPeriod } from '../orbital/hohmann';
import { wrapAngle } from '../units';

/** Angle of `target` ahead of `origin` at time t, in [0, 2π). */
export function phaseAngle(origin: Planet, target: Planet, t: number): number {
  return wrapAngle(target.positionAt(t).angle() - origin.positionAt(t).angle());
}

export interface HohmannWindow {
  readonly departureTime: number;
  readonly arrivalTime: number;
  /** Required phase angle at departure, in [0, 2π). */
  readonly phaseAngle: number;
}

/**
 * Next departure time ≥ `now` at which the Hohmann phase angle occurs.
 * Exact for circular orbits; an approximation for eccentric ones.
 */
export function nextHohmannWindow(origin: Planet, target: Planet, now: number, mu: number): HohmannWindow {
  const h = hohmann(origin.orbit.elements.semiMajorAxis, target.orbit.elements.semiMajorAxis, mu);
  const required = wrapAngle(h.phaseAngle);
  // Relative angular rate of target with respect to origin (negative for outward transfers).
  const relativeRate = target.orbit.meanMotion - origin.orbit.meanMotion;
  const current = phaseAngle(origin, target, now);
  const toGo = relativeRate < 0 ? wrapAngle(current - required) : wrapAngle(required - current);
  const departureTime = now + toGo / Math.abs(relativeRate);
  return { departureTime, arrivalTime: departureTime + h.timeOfFlight, phaseAngle: required };
}

export function synodicPeriodOf(a: Planet, b: Planet): number {
  return synodicPeriod(a.orbit.period, b.orbit.period);
}
