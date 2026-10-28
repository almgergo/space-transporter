import { Inventory } from '../inventory/Inventory';
import type { Vec2 } from '../math/Vec2';
import { Navigator } from '../navigation/Navigator';
import { Ship } from './Ship';

export interface ShipBlueprint {
  readonly cargoCapacity: number;
  readonly speed: number;
  readonly price: number;
}

export const HAULER: ShipBlueprint = { cargoCapacity: 20, speed: 90, price: 1500 };

const NAMES = ['Mule', 'Pelican', 'Tortoise', 'Barge', 'Wren', 'Ox', 'Heron', 'Beetle', 'Moth', 'Yak'];

/** Creates ships with unique ids and readable names. */
export class ShipFactory {
  private count = 0;

  create(blueprint: ShipBlueprint, position: Vec2): Ship {
    this.count++;
    const name = `${NAMES[(this.count - 1) % NAMES.length]}-${this.count}`;
    return new Ship(
      `ship-${this.count}`,
      name,
      new Inventory(blueprint.cargoCapacity),
      new Navigator(position, blueprint.speed),
    );
  }
}
