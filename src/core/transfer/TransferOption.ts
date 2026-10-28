import type { Planet } from '../bodies/Planet';
import type { ConicArc } from '../orbital/ConicArc';

/** One concrete, flyable transfer. Speeds in AU/day, times in days since J2000. */
export interface TransferOption {
  readonly origin: Planet;
  readonly target: Planet;
  readonly departureTime: number;
  readonly arrivalTime: number;
  readonly departureDeltaV: number;
  readonly arrivalDeltaV: number;
  readonly totalDeltaV: number;
  /** The coasting path between the burns. */
  readonly arc: ConicArc;
}

export const timeOfFlight = (option: TransferOption): number => option.arrivalTime - option.departureTime;
