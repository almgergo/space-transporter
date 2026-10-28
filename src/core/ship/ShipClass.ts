/** Static design of a ship type. Masses in tonnes, exhaust velocity in AU/day. */
export interface ShipClass {
  readonly id: string;
  readonly name: string;
  readonly dryMass: number;
  readonly cargoCapacity: number;
  readonly tankCapacity: number;
  readonly exhaustVelocity: number;
  /** Shipyard price, credits. */
  readonly price: number;
}
