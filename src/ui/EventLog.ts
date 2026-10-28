import type { World } from '../core/World';
import { el } from './dom';
import { credits, date } from './format';

const MAX_ENTRIES = 8;

/** A short rolling log of what happened, newest first. */
export class EventLog {
  private readonly list = el('ol', { class: 'log' });

  constructor(
    root: HTMLElement,
    private readonly world: World,
  ) {
    root.append(el('h2', {}, 'Log'), this.list);
    const { events } = world;
    events.on('shipAdded', ({ ship }) => this.add(`Bought ${ship.design.name} ${ship.name}`));
    events.on('departed', ({ ship }) => this.add(`${ship.name} departed ${ship.state.kind === 'inTransit' ? `for ${ship.state.transfer.target.name}` : ''}`));
    events.on('arrived', ({ ship }) => this.add(`${ship.name} arrived at ${ship.state.kind === 'docked' ? ship.state.planet.name : '?'}`));
    events.on('contractCompleted', ({ contract, payout, late }) =>
      this.add(`${contract.id} delivered${late ? ' (reduced pay)' : ''}: +${credits(payout)}`, late ? 'warn' : 'good'),
    );
  }

  private add(message: string, tone?: 'good' | 'warn'): void {
    this.list.prepend(el('li', { class: tone }, el('time', {}, date(this.world.time)), ' ', message));
    while (this.list.children.length > MAX_ENTRIES) this.list.lastElementChild?.remove();
  }
}
