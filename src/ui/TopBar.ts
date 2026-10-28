import type { World } from '../core/World';
import { el, onAction } from './dom';
import { credits, date } from './format';
import { UiState, WARP_SPEEDS } from './UiState';

/** Date, credits and time-warp controls. Text is refreshed every frame; structure is static. */
export class TopBar {
  private readonly dateText = el('span', { class: 'date' });
  private readonly creditsText = el('span', { class: 'credits' });
  private readonly warpButtons: HTMLButtonElement[];
  private readonly focusButtons: HTMLButtonElement[];

  constructor(
    root: HTMLElement,
    private readonly world: World,
    private readonly ui: UiState,
  ) {
    this.warpButtons = WARP_SPEEDS.map((speed) =>
      el('button', { class: 'warp', 'data-action': 'warp', 'data-id': speed, title: speed ? `${speed} days per second` : 'Pause' }, speed ? `${speed}×` : '❚❚'),
    );
    this.focusButtons = (
      [['inner', 'Inner'], ['outer', 'Outer'], ['ship', 'Follow ship']] as const
    ).map(([focus, label]) => el('button', { class: 'warp', 'data-action': 'focus', 'data-id': focus }, label));
    root.append(
      el('span', { class: 'title' }, 'Space Logistics'),
      this.dateText,
      el('span', { class: 'warp-group', title: 'Days per second' }, ...this.warpButtons),
      el('span', { class: 'warp-group' }, ...this.focusButtons),
      this.creditsText,
    );
    onAction(root, (action, id) => {
      if (action === 'warp') this.ui.setWarp(Number(id));
      if (action === 'focus' && (id === 'inner' || id === 'outer' || id === 'ship')) this.ui.setFocus(id);
    });
  }

  sync(): void {
    this.dateText.textContent = date(this.world.time);
    this.creditsText.textContent = credits(this.world.wallet.credits);
    for (const button of this.warpButtons) button.classList.toggle('active', Number(button.dataset.id) === this.ui.warp);
    for (const button of this.focusButtons) {
      button.classList.toggle('active', button.dataset.id === this.ui.focus);
      button.disabled = button.dataset.id === 'ship' && !this.ui.selectedShip;
    }
  }
}
