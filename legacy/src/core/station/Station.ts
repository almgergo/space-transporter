import { Market, type MarketListing } from '../economy/Market';
import { Inventory } from '../inventory/Inventory';
import type { Vec2 } from '../math/Vec2';
import { ProductionModule } from '../production/ProductionModule';
import type { Recipe } from '../production/Recipe';
import type { Resource } from '../Resource';

export type StationKind = 'mine' | 'farm' | 'refinery' | 'colony';

export interface StationConfig {
  readonly id: string;
  readonly name: string;
  readonly kind: StationKind;
  readonly position: Vec2;
  readonly capacity: number;
  readonly recipes: readonly Recipe[];
  readonly sells?: ReadonlyMap<Resource, MarketListing>;
  readonly buys?: ReadonlyMap<Resource, MarketListing>;
  readonly initialStock?: Partial<Record<Resource, number>>;
}

/** A fixed location composed of storage, production and a market. */
export class Station {
  readonly id: string;
  readonly name: string;
  readonly kind: StationKind;
  readonly position: Vec2;
  readonly inventory: Inventory;
  readonly market: Market;
  readonly production: readonly ProductionModule[];

  constructor(config: StationConfig) {
    this.id = config.id;
    this.name = config.name;
    this.kind = config.kind;
    this.position = config.position;
    this.inventory = new Inventory(config.capacity);
    this.inventory.addAll(config.initialStock ?? {});
    this.market = new Market(this.inventory, config.sells ?? new Map(), config.buys ?? new Map());
    this.production = config.recipes.map((recipe) => new ProductionModule(recipe, this.inventory));
  }

  update(dt: number): void {
    for (const module of this.production) module.update(dt);
  }
}
