import type { Planet } from '../bodies/Planet';
import { ConicArc } from '../orbital/ConicArc';
import { solveLambert } from '../orbital/lambert';
import type { TransferCostModel } from './TransferCostModel';
import type { TransferOption } from './TransferOption';

/** Evaluates point-to-point transfers between planets with Lambert's problem. */
export class TransferPlanner {
  constructor(
    private readonly mu: number,
    private readonly costModel: TransferCostModel,
  ) {}

  evaluate(origin: Planet, target: Planet, departureTime: number, timeOfFlight: number): TransferOption | undefined {
    if (origin === target || timeOfFlight <= 0) return undefined;
    const arrivalTime = departureTime + timeOfFlight;
    const from = origin.stateAt(departureTime);
    const to = target.stateAt(arrivalTime);

    const solution = solveLambert(from.r, to.r, timeOfFlight, this.mu);
    if (!solution) return undefined;

    const departureDeltaV = this.costModel.departureDeltaV(origin, solution.v1.distanceTo(from.v));
    const arrivalDeltaV = this.costModel.arrivalDeltaV(target, solution.v2.distanceTo(to.v));
    return {
      origin,
      target,
      departureTime,
      arrivalTime,
      departureDeltaV,
      arrivalDeltaV,
      totalDeltaV: departureDeltaV + arrivalDeltaV,
      arc: new ConicArc({ r: from.r, v: solution.v1 }, departureTime, this.mu),
    };
  }
}
