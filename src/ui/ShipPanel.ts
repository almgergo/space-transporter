import type { Contract } from '../core/contracts/Contract';
import type { CommandResult, GameCommands } from '../core/GameCommands';
import { deltaVFromFuel } from '../core/propulsion/rocket';
import type { Ship } from '../core/ship/Ship';
import type { ShipClass } from '../core/ship/ShipClass';
import { SHIP_CLASSES } from '../core/ship/shipClasses';
import type { World } from '../core/World';
import { KIND_LABELS, loadText, payoutText } from './contractText';
import { el, onAction } from './dom';
import { credits, date, kms, tonnes } from './format';
import type { UiState } from './UiState';

export interface ShipPanelActions {
  openPlanner(ship: Ship, targetId: string): void;
}

/** Fleet list, selected ship details, contract board and shipyard. Re-renders on structural changes only. */
export class ShipPanel {
  private message = '';
  private destination: string | undefined;

  constructor(
    private readonly root: HTMLElement,
    private readonly world: World,
    private readonly commands: GameCommands,
    private readonly ui: UiState,
    private readonly actions: ShipPanelActions,
  ) {
    onAction(root, (action, id) => this.handle(action, id));
    root.addEventListener('change', (event) => {
      const select = event.target as HTMLSelectElement;
      if (select.dataset.role === 'destination') this.destination = select.value;
    });
  }

  render(): void {
    const selected = this.ui.selectedShip;
    this.root.replaceChildren(
      el('h2', {}, 'Fleet'),
      el('ul', { class: 'ships' }, ...this.world.ships.map((ship) => this.shipRow(ship, ship === selected))),
      selected ? this.details(selected) : el('p', { class: 'hint' }, 'Select a ship to plan a transfer.'),
      this.message && el('p', { class: 'message' }, this.message),
      el('h2', {}, 'Contracts'),
      this.contracts(selected),
      el('h2', {}, `Shipyard · ${this.commands.shipyard.name}`),
      el('ul', { class: 'shipyard' }, ...SHIP_CLASSES.map((design) => this.shipyardRow(design))),
    );
  }

  private handle(action: string, id: string | undefined): void {
    const ship = this.ui.selectedShip;
    this.message = '';
    switch (action) {
      case 'select-ship':
        this.ui.selectShip(this.world.ships.find((s) => s.id === id));
        return;
      case 'plan': {
        const select = this.root.querySelector<HTMLSelectElement>('[data-role=destination]');
        if (ship && select) this.actions.openPlanner(ship, select.value);
        return;
      }
      case 'cancel':
        if (ship) this.report(this.commands.cancelTransfer(ship));
        return;
      case 'accept': {
        const contract = this.world.contracts.offers.find((c) => c.id === id);
        if (ship && contract) {
          this.destination = contract.terms.destination.id;
          this.report(this.commands.acceptContract(ship, contract));
        }
        return;
      }
      case 'buy': {
        const design = SHIP_CLASSES.find((d) => d.id === id);
        if (design) this.report(this.commands.purchaseShip(design));
        return;
      }
    }
  }

  private report(result: CommandResult): void {
    this.message = result.ok ? '' : result.reason;
    this.render();
  }

  private shipRow(ship: Ship, selected: boolean): HTMLElement {
    return el(
      'li',
      {},
      el('button', { class: selected ? 'ship selected' : 'ship', 'data-action': 'select-ship', 'data-id': ship.id },
        el('span', {}, el('strong', {}, ship.name), el('span', { class: 'muted' }, ` · ${ship.design.name}`)),
        el('span', { class: 'muted' }, statusLine(ship))),
    );
  }

  private details(ship: Ship): HTMLElement {
    const state = ship.state;
    const fuelShare = ship.tank.amount / ship.tank.capacity;
    const dvAvailable = deltaVFromFuel(ship.massWithoutFuel, ship.tank.amount, ship.design.exhaustVelocity);
    const cargo = ship.cargo;

    return el(
      'section',
      { class: 'details' },
      el('dl', {},
        el('dt', {}, 'Status'), el('dd', {}, statusLine(ship)),
        el('dt', {}, 'Fuel'),
        el('dd', {}, el('span', { class: 'bar' }, el('span', { style: `width:${(fuelShare * 100).toFixed(1)}%` })),
          ` ${tonnes(ship.tank.amount)} / ${ship.tank.capacity} t · Δv ${kms(dvAvailable)}`),
        el('dt', {}, 'Cargo'),
        el('dd', {}, cargo
          ? `${cargo.id} ${KIND_LABELS[cargo.terms.kind]}: ${loadText(cargo)} → ${cargo.terms.destination.name}, ${payoutText(cargo)}`
          : `empty (holds ${ship.design.cargoCapacity} t)`),
      ),
      state.kind === 'inTransit' ? '' : this.planControls(ship),
      state.kind === 'scheduled' && el('div', { class: 'actions' }, el('button', { 'data-action': 'cancel' }, 'Cancel departure')),
    );
  }

  private planControls(ship: Ship): HTMLElement {
    const here = ship.state.kind === 'inTransit' ? undefined : ship.state.planet;
    const targets = this.world.system.planets.filter((p) => p !== here);
    const preferred = ship.cargo?.terms.destination.id ?? this.destination;
    const selectedId = targets.some((p) => p.id === preferred) ? preferred : targets[0]?.id;
    return el('div', { class: 'actions' },
      el('select', { 'data-role': 'destination', 'aria-label': 'Destination' },
        ...targets.map((p) => el('option', { value: p.id, selected: p.id === selectedId }, p.name))),
      el('button', { class: 'primary', 'data-action': 'plan' }, 'Plan transfer'),
    );
  }

  private contracts(ship: Ship | undefined): HTMLElement {
    const offers = this.world.contracts.offers;
    if (offers.length === 0) return el('p', { class: 'hint' }, 'No offers right now. New ones are posted every few weeks.');
    const canTake = (c: Contract) => this.canAccept(ship, c);
    const sorted = [...offers].sort((a, b) => Number(canTake(b)) - Number(canTake(a)));
    return el('ul', { class: 'contracts' }, ...sorted.map((c) => this.contractRow(c, canTake(c))));
  }

  private canAccept(ship: Ship | undefined, contract: Contract): boolean {
    return (
      ship?.state.kind === 'docked' &&
      ship.state.planet === contract.terms.origin &&
      !ship.cargo &&
      contract.terms.mass <= ship.design.cargoCapacity
    );
  }

  private contractRow(contract: Contract, canAccept: boolean): HTMLElement {
    const t = contract.terms;
    return el(
      'li',
      { class: 'contract' },
      el('div', {}, el('span', { class: `kind kind-${t.kind}` }, KIND_LABELS[t.kind]), ' ', el('strong', {}, contract.id),
        ` ${t.origin.name} → ${t.destination.name}`),
      el('div', { class: 'muted' }, `${loadText(contract)} · ${credits(t.reward)} · ${payoutText(contract)}`),
      el('div', { class: 'muted small' }, `offer ends ${date(t.offerExpires)}`),
      el('button', { 'data-action': 'accept', 'data-id': contract.id, disabled: !canAccept }, 'Accept'),
    );
  }

  private shipyardRow(design: ShipClass): HTMLElement {
    const loadedDv = deltaVFromFuel(design.dryMass + design.cargoCapacity, design.tankCapacity, design.exhaustVelocity);
    return el(
      'li',
      { class: 'contract' },
      el('div', {}, el('strong', {}, design.name)),
      el('div', { class: 'muted' }, `${design.cargoCapacity} t hold · ${design.tankCapacity} t tank · vₑ ${kms(design.exhaustVelocity)}`),
      el('div', { class: 'muted small' }, `Δv ${kms(loadedDv)} fully loaded · ${credits(design.price)}`),
      el('button', { 'data-action': 'buy', 'data-id': design.id, disabled: !this.world.wallet.canAfford(design.price) }, 'Buy'),
    );
  }
}

function statusLine(ship: Ship): string {
  const state = ship.state;
  switch (state.kind) {
    case 'docked':
      return `Docked at ${state.planet.name}`;
    case 'scheduled':
      return `Departs ${date(state.transfer.departureTime)} for ${state.transfer.target.name}`;
    case 'inTransit':
      return `En route to ${state.transfer.target.name}, arrives ${date(state.transfer.arrivalTime)}`;
  }
}
