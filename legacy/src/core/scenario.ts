import type { MarketListing } from './economy/Market';
import { GameCommands } from './GameCommands';
import { Vec2 } from './math/Vec2';
import type { Resource } from './Resource';
import { HAULER, ShipFactory } from './ship/ShipFactory';
import { Station } from './station/Station';
import { World } from './World';

export interface GameSession {
  readonly world: World;
  readonly commands: GameCommands;
}

const listing = (basePrice: number, targetStock: number): MarketListing => ({ basePrice, targetStock });
const market = (entries: Array<[Resource, MarketListing]>) => new Map(entries);

/** The starting map. Coordinates are in a 1000×700 world space. */
export function createDefaultGame(): GameSession {
  const mine = new Station({
    id: 'mine',
    name: 'Kessler Mine',
    kind: 'mine',
    position: new Vec2(150, 150),
    capacity: 200,
    recipes: [{ name: 'Extract ore', inputs: {}, outputs: { ore: 2 }, cycleTime: 1 }],
    sells: market([['ore', listing(10, 100)]]),
    initialStock: { ore: 40 },
  });
  const farm = new Station({
    id: 'farm',
    name: 'Verdant Farm',
    kind: 'farm',
    position: new Vec2(160, 560),
    capacity: 150,
    recipes: [{ name: 'Grow food', inputs: {}, outputs: { food: 1 }, cycleTime: 1 }],
    sells: market([['food', listing(12, 75)]]),
    initialStock: { food: 30 },
  });
  const refinery = new Station({
    id: 'refinery',
    name: 'Forge Refinery',
    kind: 'refinery',
    position: new Vec2(500, 340),
    capacity: 200,
    recipes: [{ name: 'Smelt metal', inputs: { ore: 2 }, outputs: { metal: 1 }, cycleTime: 1.5 }],
    buys: market([['ore', listing(18, 60)]]),
    sells: market([['metal', listing(45, 40)]]),
  });
  const haven = new Station({
    id: 'haven',
    name: 'Haven Colony',
    kind: 'colony',
    position: new Vec2(850, 180),
    capacity: 150,
    recipes: [{ name: 'Sustain colonists', inputs: { metal: 1, food: 2 }, outputs: {}, cycleTime: 2 }],
    buys: market([
      ['metal', listing(80, 40)],
      ['food', listing(26, 60)],
    ]),
  });
  const outpost = new Station({
    id: 'outpost',
    name: 'Rim Outpost',
    kind: 'colony',
    position: new Vec2(860, 560),
    capacity: 100,
    recipes: [{ name: 'Feed crew', inputs: { food: 1 }, outputs: {}, cycleTime: 1.5 }],
    buys: market([['food', listing(24, 40)]]),
  });

  const world = new World([mine, farm, refinery, haven, outpost], 1000);
  const commands = new GameCommands(world, new ShipFactory(), refinery);
  for (let i = 0; i < 2; i++) commands.spawnShip(HAULER);

  return { world, commands };
}
