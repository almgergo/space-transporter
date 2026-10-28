import type { Planet } from '../bodies/Planet';
import { fuelForDeltaV } from '../propulsion/rocket';
import type { TransferOption } from './TransferOption';
import type { TransferPlanner } from './TransferPlanner';

/** What the porkchop needs to know about the ship to turn Δv into fuel and feasibility. */
export interface FuelProfile {
  /** Dry mass plus cargo, tonnes. */
  readonly massWithoutFuel: number;
  readonly tankCapacity: number;
  /** AU/day. */
  readonly exhaustVelocity: number;
}

export interface PorkchopCell {
  readonly option: TransferOption;
  /** Total propellant for both burns, tonnes. */
  readonly fuel: number;
  readonly feasible: boolean;
}

export interface PorkchopSpec {
  readonly departureFrom: number;
  readonly departureTo: number;
  readonly minTimeOfFlight: number;
  readonly maxTimeOfFlight: number;
  readonly columns: number;
  readonly rows: number;
}

/** A grid of transfers over departure time (columns) × time of flight (rows). */
export class Porkchop {
  private constructor(
    readonly origin: Planet,
    readonly target: Planet,
    readonly spec: PorkchopSpec,
    private readonly cells: ReadonlyArray<PorkchopCell | undefined>,
  ) {}

  static compute(planner: TransferPlanner, origin: Planet, target: Planet, profile: FuelProfile, spec: PorkchopSpec): Porkchop {
    const cells: Array<PorkchopCell | undefined> = [];
    for (let row = 0; row < spec.rows; row++) {
      for (let col = 0; col < spec.columns; col++) {
        const option = planner.evaluate(origin, target, departureAt(spec, col), timeOfFlightAt(spec, row));
        if (!option) {
          cells.push(undefined);
          continue;
        }
        const fuel = fuelForDeltaV(profile.massWithoutFuel, option.totalDeltaV, profile.exhaustVelocity);
        cells.push({ option, fuel, feasible: fuel <= profile.tankCapacity });
      }
    }
    return new Porkchop(origin, target, spec, cells);
  }

  cell(col: number, row: number): PorkchopCell | undefined {
    if (col < 0 || row < 0 || col >= this.spec.columns || row >= this.spec.rows) return undefined;
    return this.cells[row * this.spec.columns + col];
  }

  departureAt(col: number): number {
    return departureAt(this.spec, col);
  }

  timeOfFlightAt(row: number): number {
    return timeOfFlightAt(this.spec, row);
  }

  /** Cheapest feasible cell, optionally restricted to options that `accept` (e.g. pays in full). */
  cheapest(accept?: (option: TransferOption) => boolean): PorkchopCell | undefined {
    let best: PorkchopCell | undefined;
    for (const cell of this.cells) {
      if (!cell?.feasible) continue;
      if (accept && !accept(cell.option)) continue;
      if (!best || cell.fuel < best.fuel) best = cell;
    }
    return best;
  }
}

const lerp = (from: number, to: number, i: number, count: number): number =>
  count <= 1 ? from : from + ((to - from) * i) / (count - 1);

const departureAt = (spec: PorkchopSpec, col: number): number =>
  lerp(spec.departureFrom, spec.departureTo, col, spec.columns);

const timeOfFlightAt = (spec: PorkchopSpec, row: number): number =>
  lerp(spec.minTimeOfFlight, spec.maxTimeOfFlight, row, spec.rows);
