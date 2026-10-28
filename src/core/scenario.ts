import { Planet } from './bodies/Planet';
import { PLANETS } from './bodies/planetData';
import { SolarSystem } from './bodies/SolarSystem';
import { Contract } from './contracts/Contract';
import { ContractBoard } from './contracts/ContractBoard';
import { CONTRACT_TEMPLATES } from './contracts/contractTemplates';
import { GameCommands } from './GameCommands';
import { KeplerOrbit } from './orbital/KeplerOrbit';
import { Rng } from './random/Rng';
import { ShipFactory } from './ship/ShipFactory';
import { STANDARD } from './ship/shipClasses';
import { FixedPortCostModel } from './transfer/TransferCostModel';
import { TransferPlanner } from './transfer/TransferPlanner';
import { nextHohmannWindow } from './transfer/windows';
import { dateToJ2000Days, MU_SUN } from './units';
import { World } from './World';

export interface GameSession {
  readonly world: World;
  readonly commands: GameCommands;
}

export const START_DATE = dateToJ2000Days(new Date(Date.UTC(2026, 0, 1)));

/** All eight planets on their real (coplanar) J2000 elliptical orbits. */
export function createSolarSystem(): SolarSystem {
  return new SolarSystem(
    MU_SUN,
    PLANETS.map((p) => new Planet(p.id, p.name, new KeplerOrbit(p.elements, MU_SUN), p.port)),
  );
}

/** Earth → Mars freight due shortly after the 2026 window: always flyable by the starting freighter. */
function starterContract(system: SolarSystem): Contract {
  const earth = system.planetById('earth')!;
  const mars = system.planetById('mars')!;
  const hohmannWindow = nextHohmannWindow(earth, mars, START_DATE, system.mu);
  return new Contract({
    id: 'C-000',
    kind: 'standard',
    origin: earth,
    destination: mars,
    mass: 30,
    reward: 12_000,
    payout: { kind: 'deadline', deadline: hohmannWindow.arrivalTime + 90, gracePeriod: 120 },
    offerExpires: hohmannWindow.departureTime,
  });
}

export function createDefaultGame(seed = 2026): GameSession {
  const system = createSolarSystem();
  const earth = system.planetById('earth')!;

  const contracts = new ContractBoard(
    system,
    new Rng(seed),
    { offerInterval: 25, maxOpenOffers: 8, offerLifetime: 150, templates: CONTRACT_TEMPLATES },
    START_DATE + 20,
  );
  // One of each kind to start, so every ship type has work, plus a guaranteed first job.
  contracts.post(START_DATE, CONTRACT_TEMPLATES);
  contracts.add(starterContract(system));

  const world = new World(system, new TransferPlanner(MU_SUN, new FixedPortCostModel()), contracts, START_DATE, 20_000);
  const shipFactory = new ShipFactory();
  world.addShip(shipFactory.create(STANDARD, earth, 20));

  return { world, commands: new GameCommands(world, shipFactory, earth) };
}
