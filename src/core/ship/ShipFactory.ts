import type { Planet } from '../bodies/Planet';
import { Ship } from './Ship';
import type { ShipClass } from './ShipClass';

const NAMES = ['Pelican', 'Heron', 'Kestrel', 'Albatross', 'Osprey', 'Petrel', 'Swift', 'Condor', 'Tern', 'Ibis', 'Gannet', 'Plover'];

/** Builds ships with unique ids and readable names, docked at a planet. */
export class ShipFactory {
  private count = 0;

  create(design: ShipClass, dockedAt: Planet, initialFuel = 0): Ship {
    const index = this.count++;
    const base = NAMES[index % NAMES.length]!;
    const name = index < NAMES.length ? base : `${base} ${Math.floor(index / NAMES.length) + 1}`;
    return new Ship(`ship-${index + 1}`, name, design, { kind: 'docked', planet: dockedAt }, initialFuel);
  }
}
