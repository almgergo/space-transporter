import { kmsToAuPerDay } from '../units';
import type { ShipClass } from './ShipClass';

/*
 * In an impulsive model there is no top speed: a ship is "fast" when it can afford high-Δv
 * (short) transfers. Max Δv = vₑ · ln((dry + cargo + tank) / (dry + cargo)).
 */

/** Nuclear-thermal (vₑ 8.83 km/s): 7.5 km/s loaded, 14.2 empty. Inner system; can't haul cargo to Jupiter. */
export const STANDARD: ShipClass = {
  id: 'standard', name: 'Standard freighter', price: 25_000,
  dryMass: 20, cargoCapacity: 40, tankCapacity: 80, exhaustVelocity: kmsToAuPerDay(8.83),
};

/** Fusion drive (vₑ 20 km/s): 18 km/s loaded. Fast transfers and the outer system, small hold. */
export const QUICK_HAULER: ShipClass = {
  id: 'quick', name: 'Quick hauler', price: 45_000,
  dryMass: 12, cargoCapacity: 15, tankCapacity: 40, exhaustVelocity: kmsToAuPerDay(20),
};

/** Nuclear-thermal bulk carrier: 6.3 km/s loaded, so it is held to cheap, slow, near-Hohmann transfers. */
export const LARGE_TRANSPORT: ShipClass = {
  id: 'large', name: 'Large transport', price: 60_000,
  dryMass: 90, cargoCapacity: 200, tankCapacity: 300, exhaustVelocity: kmsToAuPerDay(8.83),
};

export const SHIP_CLASSES: readonly ShipClass[] = [STANDARD, QUICK_HAULER, LARGE_TRANSPORT];
