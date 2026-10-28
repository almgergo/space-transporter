import { FREIGHT_PLANETS, INNER_PLANETS, OUTER_PLANETS } from '../bodies/planetData';
import type { Rng } from '../random/Rng';
import type { ContractKind, PayoutTerms } from './Contract';

/** The cheap (Hohmann) reference trip for the generated route. */
export interface RouteReference {
  readonly now: number;
  readonly hohmannArrival: number;
  readonly hohmannTimeOfFlight: number;
}

export interface ContractTemplate {
  readonly kind: ContractKind;
  /** Relative frequency on the board. */
  readonly weight: number;
  readonly origins: readonly string[];
  readonly destinations: readonly string[];
  readonly mass: readonly [number, number];
  readonly ratePerTonne: number;
  /** Long hauls: reward × (1 + Hohmann flight years). */
  readonly paysForDistance: boolean;
  payout(route: RouteReference, rng: Rng): PayoutTerms;
}

const YEAR = 365.25;

/**
 * Deadline anchored to the Hohmann arrival plus slack, both measured in Hohmann flight times so short
 * hops and long hauls scale alike. Negative slack demands a fast, expensive transfer; positive slack lets
 * the ship wait for the cheap window to open. Since the Hohmann arrival is at least one flight time
 * away, slack ≥ −0.6 keeps every deadline in the future.
 */
const relativeDeadline = (slack: readonly [number, number], grace: number, minGraceDays: number) =>
  (route: RouteReference, rng: Rng): PayoutTerms => ({
    kind: 'deadline',
    deadline: route.hohmannArrival + rng.range(slack[0], slack[1]) * route.hohmannTimeOfFlight,
    gracePeriod: Math.max(minGraceDays, grace * route.hohmannTimeOfFlight),
  });

export const CONTRACT_TEMPLATES: readonly ContractTemplate[] = [
  {
    kind: 'standard', weight: 4, origins: FREIGHT_PLANETS, destinations: FREIGHT_PLANETS,
    mass: [10, 40], ratePerTonne: 350, paysForDistance: false,
    payout: relativeDeadline([-0.4, 0.8], 0.5, 60),
  },
  {
    kind: 'bulk', weight: 2, origins: FREIGHT_PLANETS, destinations: FREIGHT_PLANETS,
    mass: [60, 180], ratePerTonne: 220, paysForDistance: false,
    payout: relativeDeadline([0.4, 1.5], 1, 120),
  },
  {
    kind: 'express', weight: 2, origins: INNER_PLANETS, destinations: INNER_PLANETS,
    mass: [3, 12], ratePerTonne: 1200, paysForDistance: false,
    payout: relativeDeadline([-0.6, -0.25], 0.15, 20),
  },
  {
    // Pay depends on flight time, not date: a slow Hohmann trip still pays ~80%, faster ones pay in full.
    kind: 'passengers', weight: 2, origins: INNER_PLANETS, destinations: INNER_PLANETS,
    mass: [4, 15], ratePerTonne: 900, paysForDistance: false,
    payout: (route) => ({
      kind: 'travelTime',
      idealDays: Math.round(0.75 * route.hohmannTimeOfFlight),
      zeroAfterDays: Math.round(2 * route.hohmannTimeOfFlight),
    }),
  },
  {
    kind: 'outerSupply', weight: 2, origins: ['earth', 'mars'], destinations: OUTER_PLANETS,
    mass: [5, 15], ratePerTonne: 600, paysForDistance: true,
    payout: (route, rng) => ({
      kind: 'deadline',
      deadline: route.hohmannArrival + rng.range(0, 2 * YEAR),
      gracePeriod: YEAR,
    }),
  },
];

export const flightYears = (days: number): number => days / YEAR;
