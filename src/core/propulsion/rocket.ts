/** Tsiolkovsky rocket equation helpers. Masses in tonnes, speeds in any consistent unit. */

/** Propellant needed to give `finalMass` (everything left after the burn) a total `deltaV`. */
export function fuelForDeltaV(finalMass: number, deltaV: number, exhaustVelocity: number): number {
  return finalMass * Math.expm1(deltaV / exhaustVelocity);
}

/** Propellant consumed when a ship of `initialMass` (including fuel) burns `deltaV`. */
export function fuelBurnedFrom(initialMass: number, deltaV: number, exhaustVelocity: number): number {
  return initialMass * -Math.expm1(-deltaV / exhaustVelocity);
}

/** Δv available from `fuel` on top of `dryMass` (structure + cargo). */
export function deltaVFromFuel(dryMass: number, fuel: number, exhaustVelocity: number): number {
  return exhaustVelocity * Math.log1p(fuel / dryMass);
}
