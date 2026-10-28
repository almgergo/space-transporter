import type { Planet } from '../../core/bodies/Planet';
import type { GameCommands } from '../../core/GameCommands';
import type { Ship } from '../../core/ship/Ship';
import { Porkchop } from '../../core/transfer/Porkchop';
import { defaultPorkchopSpec } from '../../core/transfer/porkchopSpec';
import { timeOfFlight, type TransferOption } from '../../core/transfer/TransferOption';
import type { World } from '../../core/World';
import { el, onAction } from '../dom';
import { credits, date, days, kms, tonnes } from '../format';
import type { UiState } from '../UiState';
import { loadText, payoutText } from '../contractText';
import { RAMP } from './colorScale';
import { PorkchopChart, type CellRef } from './PorkchopChart';

/**
 * Modal transfer planner: pauses time, shows the porkchop for one ship and target, previews the
 * hovered or selected transfer on the map, and books it on confirm.
 */
export class PorkchopPanel {
  private chart: PorkchopChart | undefined;
  private ship: Ship | undefined;
  private warpBeforeOpen = 0;
  private readonly tooltip = el('div', { class: 'tooltip', hidden: true });
  private readonly info = el('div', { class: 'selection-info' });
  private readonly error = el('p', { class: 'message' });

  constructor(
    private readonly root: HTMLElement,
    private readonly world: World,
    private readonly commands: GameCommands,
    private readonly ui: UiState,
    private readonly onBooked: () => void,
  ) {
    root.hidden = true;
    onAction(root, (action) => this.handle(action));
  }

  get isOpen(): boolean {
    return !this.root.hidden;
  }

  open(ship: Ship, target: Planet): void {
    const state = ship.state;
    if (state.kind === 'inTransit') return;
    this.ship = ship;
    this.warpBeforeOpen = this.ui.warp || 5;
    this.ui.setWarp(0); // the grid is computed for "now"; freeze time while planning

    const origin = state.planet;
    const contract = ship.cargo?.terms.destination === target ? ship.cargo : undefined;
    const overlay = contract && { terms: contract.terms.payout, paysInFull: (o: TransferOption) => contract.paysInFull(o) };
    const porkchop = Porkchop.compute(this.world.planner, origin, target, ship.fuelProfile, defaultPorkchopSpec(origin, target, this.world.time));
    this.chart = new PorkchopChart(porkchop, overlay, {
      hover: (ref, x, y) => this.hover(ref, x, y),
      select: (ref) => this.selected(ref),
    });

    this.error.textContent = '';
    this.root.replaceChildren(
      el('header', {},
        el('h2', {}, `${ship.name}: ${origin.name} → ${target.name}`),
        el('span', { class: 'muted' }, ship.cargo ? `carrying ${ship.cargo.id}, ${loadText(ship.cargo)}` : 'empty hold'),
        contract && el('span', { class: 'deadline-key' }, `full pay below line: ${payoutText(contract)}`),
      ),
      el('div', { class: 'chart-wrap' }, this.chart.canvas, this.tooltip),
      this.legend(),
      this.info,
      this.error,
      el('div', { class: 'actions' },
        el('button', { 'data-action': 'pick-cheapest' }, 'Cheapest'),
        contract && el('button', { 'data-action': 'pick-full-pay' }, 'Cheapest full pay'),
        el('span', { class: 'spacer' }),
        el('button', { 'data-action': 'close' }, 'Close'),
        el('button', { class: 'primary', 'data-action': 'confirm', disabled: true }, 'Book transfer'),
      ),
    );
    this.root.hidden = false;

    const initial = this.chart.cheapestRef(contract !== undefined) ?? this.chart.cheapestRef(false);
    if (initial) this.chart.select(initial);
    else this.info.textContent = 'No feasible transfer in this window: the loaded ship needs more fuel than its tank holds. Try a lighter contract.';
  }

  close(): void {
    this.root.hidden = true;
    this.root.replaceChildren();
    this.chart = undefined;
    this.ui.setPreview(undefined);
    this.ui.setWarp(this.warpBeforeOpen);
  }

  private handle(action: string): void {
    const chart = this.chart;
    switch (action) {
      case 'close':
        return this.close();
      case 'pick-cheapest':
      case 'pick-full-pay': {
        const ref = chart?.cheapestRef(action === 'pick-full-pay');
        if (ref) chart!.select(ref);
        return;
      }
      case 'confirm': {
        const option = chart?.selection?.cell?.option;
        if (!this.ship || !option) return;
        const result = this.commands.scheduleTransfer(this.ship, option);
        if (!result.ok) {
          this.error.textContent = result.reason;
          return;
        }
        this.close();
        this.onBooked();
      }
    }
  }

  private hover(ref: CellRef | undefined, clientX: number, clientY: number): void {
    const option = ref?.cell?.option;
    this.ui.setPreview(option ?? this.chart?.selection?.cell?.option);
    if (!ref?.cell) {
      this.tooltip.hidden = true;
      return;
    }
    const { fuel, feasible } = ref.cell;
    this.tooltip.replaceChildren(
      el('div', {}, `${date(ref.cell.option.departureTime)} → ${date(ref.cell.option.arrivalTime)}`),
      el('div', {}, `${days(timeOfFlight(ref.cell.option))} · Δv ${kms(ref.cell.option.totalDeltaV)}`),
      el('div', { class: feasible ? '' : 'bad' }, feasible ? `fuel ${tonnes(fuel)}` : `needs ${tonnes(fuel)}, exceeds tank`),
    );
    const wrap = this.tooltip.parentElement!.getBoundingClientRect();
    this.tooltip.style.left = `${clientX - wrap.left + 14}px`;
    this.tooltip.style.top = `${clientY - wrap.top + 14}px`;
    this.tooltip.hidden = false;
  }

  private selected(ref: CellRef): void {
    const cell = ref.cell;
    const confirm = this.root.querySelector<HTMLButtonElement>('[data-action=confirm]');
    if (!cell || !this.ship) return;
    this.ui.setPreview(cell.option);
    if (confirm) confirm.disabled = !cell.feasible;
    this.info.replaceChildren(...this.describe(cell.option, cell.fuel));
  }

  private describe(option: TransferOption, fuel: number): HTMLElement[] {
    const ship = this.ship!;
    const toBuy = Math.max(0, fuel - ship.tank.amount);
    const cost = toBuy * option.origin.port.fuelPrice;
    const contract = ship.cargo?.terms.destination === option.target ? ship.cargo : undefined;
    const payout = contract?.payoutFor(option);
    return [
      el('div', {}, el('strong', {}, `Depart ${date(option.departureTime)}`), ` · arrive ${date(option.arrivalTime)} · ${days(timeOfFlight(option))} in flight`),
      el('div', {}, `Δv ${kms(option.departureDeltaV)} departure + ${kms(option.arrivalDeltaV)} arrival = ${kms(option.totalDeltaV)}`),
      el('div', {}, `Fuel ${tonnes(fuel)} (have ${tonnes(ship.tank.amount)}) → buy ${tonnes(toBuy)} for ${credits(cost)}`),
      contract
        ? el('div', { class: payout === contract.terms.reward ? 'good' : 'bad' },
            payout === contract.terms.reward ? `Full pay: ${credits(payout)}` : `Pays ${credits(payout ?? 0)} of ${credits(contract.terms.reward)}`)
        : el('div', { class: 'muted' }, 'No contract delivered on this trip'),
    ];
  }

  private legend(): HTMLElement {
    const scale = this.chart!.scale;
    return el('div', { class: 'legend' },
      el('span', { class: 'muted' }, 'total Δv'),
      ...RAMP.map((color, band) =>
        el('span', { class: 'swatch', style: `background:${color}`, title: `≥ ${kms(scale.edge(band))}` }),
      ),
      el('span', { class: 'muted' }, `${kms(scale.min)} → ${kms(scale.edge(RAMP.length - 1))}+`),
      el('span', { class: 'swatch hatched' }), el('span', { class: 'muted' }, 'exceeds tank'),
      el('span', { class: 'ring' }), el('span', { class: 'muted' }, 'cheapest'),
    );
  }
}
