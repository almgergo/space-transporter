import type { SolarSystem } from '../bodies/SolarSystem';
import type { Rng } from '../random/Rng';
import { nextHohmannWindow } from '../transfer/windows';
import { Contract } from './Contract';
import { flightYears, type ContractTemplate } from './contractTemplates';

export interface ContractBoardConfig {
  /** Average days between new offers. */
  readonly offerInterval: number;
  readonly maxOpenOffers: number;
  /** Days an offer stays on the board. */
  readonly offerLifetime: number;
  readonly templates: readonly ContractTemplate[];
}

/** Generates and expires contract offers from weighted templates. */
export class ContractBoard {
  private readonly open: Contract[] = [];
  private nextOfferAt: number;
  private count = 0;

  constructor(
    private readonly system: SolarSystem,
    private readonly rng: Rng,
    private readonly config: ContractBoardConfig,
    firstOfferAt: number,
  ) {
    this.nextOfferAt = firstOfferAt;
  }

  get offers(): readonly Contract[] {
    return this.open;
  }

  /** Expires stale offers and posts new ones. */
  update(now: number): { posted: Contract[]; expired: Contract[] } {
    const expired = this.open.filter((c) => c.terms.offerExpires < now);
    for (const contract of expired) this.open.splice(this.open.indexOf(contract), 1);
    const posted: Contract[] = [];
    while (now >= this.nextOfferAt) {
      if (this.open.length < this.config.maxOpenOffers) {
        const contract = this.generate(this.nextOfferAt, this.pickTemplate());
        this.open.push(contract);
        posted.push(contract);
      }
      this.nextOfferAt += this.config.offerInterval * this.rng.range(0.5, 1.5);
    }
    return { posted, expired };
  }

  /** Posts a specific contract (scenario scripting and tests). */
  add(contract: Contract): void {
    this.open.push(contract);
  }

  /** Immediately posts one offer from each given template (scenario setup). */
  post(now: number, templates: readonly ContractTemplate[]): void {
    for (const template of templates) this.open.push(this.generate(now, template));
  }

  take(contract: Contract): boolean {
    const index = this.open.indexOf(contract);
    if (index < 0) return false;
    this.open.splice(index, 1);
    return true;
  }

  private pickTemplate(): ContractTemplate {
    const templates = this.config.templates;
    let roll = this.rng.range(0, templates.reduce((sum, t) => sum + t.weight, 0));
    for (const template of templates) {
      roll -= template.weight;
      if (roll < 0) return template;
    }
    return templates[templates.length - 1]!;
  }

  private generate(now: number, template: ContractTemplate): Contract {
    const origin = this.planet(this.rng.pick(template.origins));
    const destination = this.planet(this.rng.pick(template.destinations.filter((id) => id !== origin.id)));
    const hohmannWindow = nextHohmannWindow(origin, destination, now, this.system.mu);
    const route = {
      now,
      hohmannArrival: hohmannWindow.arrivalTime,
      hohmannTimeOfFlight: hohmannWindow.arrivalTime - hohmannWindow.departureTime,
    };
    const payout = template.payout(route, this.rng);

    // Deadlines tighter than the cheap arrival pay a premium of up to 2.5×, scaled by the route's flight time.
    const urgency =
      payout.kind === 'deadline'
        ? Math.min(2.5, Math.max(1, 1 + (route.hohmannArrival - payout.deadline) / (0.5 * route.hohmannTimeOfFlight)))
        : 1;
    // Withdraw deadline jobs while a fast trip could still make it. Deadlines are ≥ now + 0.4·t_H
    // (slack ≥ −0.6·t_H), so this cut-off is always after posting.
    const offerExpires =
      payout.kind === 'deadline'
        ? Math.min(now + this.config.offerLifetime, payout.deadline - 0.3 * route.hohmannTimeOfFlight)
        : now + this.config.offerLifetime;
    const distance = template.paysForDistance ? 1 + flightYears(route.hohmannTimeOfFlight) : 1;
    const mass = Math.round(this.rng.range(template.mass[0], template.mass[1]));

    this.count++;
    return new Contract({
      id: `C-${this.count.toString().padStart(3, '0')}`,
      kind: template.kind,
      origin,
      destination,
      mass,
      reward: Math.round((mass * template.ratePerTonne * urgency * distance) / 50) * 50,
      payout,
      offerExpires,
    });
  }

  private planet(id: string) {
    const planet = this.system.planetById(id);
    if (!planet) throw new Error(`Unknown planet ${id}`);
    return planet;
  }
}
