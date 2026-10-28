import { DEG, kmsToAuPerDay } from '../units';
import type { OrbitalElements } from '../orbital/KeplerOrbit';
import type { Port } from './Planet';

export interface PlanetData {
  readonly id: string;
  readonly name: string;
  readonly elements: OrbitalElements;
  readonly port: Port;
}

interface RawElements {
  /** Semi-major axis, AU. */
  readonly a: number;
  readonly e: number;
  /** Mean longitude at J2000, degrees. */
  readonly L: number;
  /** Longitude of perihelion, degrees. */
  readonly varpi: number;
}

/**
 * J2000 mean elements from JPL SSD "Approximate Positions of the Planets", Table 1
 * (inclination and node dropped: the game is coplanar, and ϖ already folds in Ω).
 */
const ELEMENTS: Record<string, RawElements> = {
  mercury: { a: 0.38709927, e: 0.20563593, L: 252.2503235, varpi: 77.45779628 },
  venus: { a: 0.72333566, e: 0.00677672, L: 181.9790995, varpi: 131.60246718 },
  earth: { a: 1.00000261, e: 0.01671123, L: 100.46457166, varpi: 102.93768193 },
  mars: { a: 1.52371034, e: 0.0933941, L: -4.55343205, varpi: -23.94362959 },
  jupiter: { a: 5.202887, e: 0.04838624, L: 34.39644051, varpi: 14.72847983 },
  saturn: { a: 9.53667594, e: 0.05386179, L: 49.95424423, varpi: 92.59887831 },
  uranus: { a: 19.18916464, e: 0.04725744, L: 313.23810451, varpi: 170.9542763 },
  neptune: { a: 30.06992276, e: 0.00859048, L: -55.12002969, varpi: 44.96476227 },
};

const toElements = ({ a, e, L, varpi }: RawElements): OrbitalElements => ({
  semiMajorAxis: a,
  eccentricity: e,
  longitudeOfPerihelion: varpi * DEG,
  meanAnomalyAtEpoch: (L - varpi) * DEG,
  epoch: 0,
});

/** Flat propellant price everywhere, credits per tonne. */
export const FUEL_PRICE = 120;

/**
 * Port costs (km/s) are gameplay values standing in for each gravity well. Giants assume a moon or
 * high-orbit station; their aerobrake limits sit above Hohmann arrival speeds (Jupiter ≈ 5.6, Neptune ≈ 4).
 */
const port = (departure: number, landing: number, aerobrake?: number): Port => ({
  departureCost: kmsToAuPerDay(departure),
  landingCost: kmsToAuPerDay(landing),
  ...(aerobrake === undefined ? {} : { aerobrakeLimit: kmsToAuPerDay(aerobrake) }),
  fuelPrice: FUEL_PRICE,
});

export const PLANETS: readonly PlanetData[] = [
  { id: 'mercury', name: 'Mercury', elements: toElements(ELEMENTS.mercury!), port: port(1.5, 1.2) },
  { id: 'venus', name: 'Venus', elements: toElements(ELEMENTS.venus!), port: port(1.5, 0.4, 7) },
  { id: 'earth', name: 'Earth', elements: toElements(ELEMENTS.earth!), port: port(1.2, 0.3, 6) },
  { id: 'mars', name: 'Mars', elements: toElements(ELEMENTS.mars!), port: port(0.6, 0.2, 3.5) },
  { id: 'jupiter', name: 'Jupiter', elements: toElements(ELEMENTS.jupiter!), port: port(3.0, 0.5, 12) },
  { id: 'saturn', name: 'Saturn', elements: toElements(ELEMENTS.saturn!), port: port(2.0, 0.4, 10) },
  { id: 'uranus', name: 'Uranus', elements: toElements(ELEMENTS.uranus!), port: port(1.5, 0.3, 8) },
  { id: 'neptune', name: 'Neptune', elements: toElements(ELEMENTS.neptune!), port: port(1.5, 0.3, 8) },
];

export const INNER_PLANETS = ['mercury', 'venus', 'earth', 'mars'] as const;
/** Inner planets a loaded nuclear-thermal freighter can reach; airless Mercury needs a fusion drive. */
export const FREIGHT_PLANETS = ['venus', 'earth', 'mars'] as const;
export const OUTER_PLANETS = ['jupiter', 'saturn', 'uranus', 'neptune'] as const;
