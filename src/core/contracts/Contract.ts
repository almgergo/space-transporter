import type { Planet } from '../bodies/Planet';

export type ContractKind = 'standard' | 'bulk' | 'express' | 'passengers' | 'outerSupply';

/** How the reward is earned. Plain data so UI and planner can describe and plot it. */
export type PayoutTerms =
  /** Full reward by `deadline`, then linear decay to zero over `gracePeriod` days. */
  | { readonly kind: 'deadline'; readonly deadline: number; readonly gracePeriod: number }
  /** Full reward if the flight (departure → arrival) takes ≤ `idealDays`, zero at `zeroAfterDays`. */
  | { readonly kind: 'travelTime'; readonly idealDays: number; readonly zeroAfterDays: number };

/** The timing of a delivery flight (a `TransferOption` satisfies this). */
export interface Trip {
  readonly departureTime: number;
  readonly arrivalTime: number;
}

export interface ContractTerms {
  readonly id: string;
  readonly kind: ContractKind;
  readonly origin: Planet;
  readonly destination: Planet;
  /** Cargo mass, tonnes. */
  readonly mass: number;
  readonly reward: number;
  readonly payout: PayoutTerms;
  /** Offer disappears from the board after this time if not accepted. */
  readonly offerExpires: number;
}

/** A delivery job: carry `mass` from origin to destination under the payout terms. */
export class Contract {
  constructor(readonly terms: ContractTerms) {}

  get id(): string {
    return this.terms.id;
  }

  payoutFor(trip: Trip): number {
    const { reward, payout } = this.terms;
    switch (payout.kind) {
      case 'deadline':
        return decay(reward, trip.arrivalTime - payout.deadline, payout.gracePeriod);
      case 'travelTime':
        return decay(reward, trip.arrivalTime - trip.departureTime - payout.idealDays, payout.zeroAfterDays - payout.idealDays);
    }
  }

  paysInFull(trip: Trip): boolean {
    return this.payoutFor(trip) >= this.terms.reward;
  }
}

/** Full reward while `overrun ≤ 0`, falling linearly to zero at `overrun = span`. */
function decay(reward: number, overrun: number, span: number): number {
  if (overrun <= 0) return reward;
  return Math.round(reward * Math.max(0, 1 - overrun / span));
}
