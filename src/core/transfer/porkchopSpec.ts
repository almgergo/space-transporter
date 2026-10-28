import type { Planet } from '../bodies/Planet';
import { hohmann } from '../orbital/hohmann';
import { MU_SUN } from '../units';
import type { PorkchopSpec } from './Porkchop';
import { synodicPeriodOf } from './windows';

/**
 * Default search space: a bit more than one synodic period of departures, and flight times scaled
 * to the pair's Hohmann time (0.3×–2×), so Mercury hops and 30-year Neptune runs both fill the grid.
 */
export function defaultPorkchopSpec(origin: Planet, target: Planet, now: number, mu = MU_SUN): PorkchopSpec {
  const hohmannTime = hohmann(origin.orbit.elements.semiMajorAxis, target.orbit.elements.semiMajorAxis, mu).timeOfFlight;
  return {
    departureFrom: now,
    departureTo: now + 1.25 * synodicPeriodOf(origin, target),
    minTimeOfFlight: Math.max(30, 0.3 * hohmannTime),
    maxTimeOfFlight: 2 * hohmannTime,
    columns: 90,
    rows: 60,
  };
}
