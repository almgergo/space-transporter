import type { GameSession } from '../core/scenario';
import { EventLog } from './EventLog';
import { PorkchopPanel } from './porkchop/PorkchopPanel';
import { ShipPanel } from './ShipPanel';
import { TopBar } from './TopBar';
import type { UiState } from './UiState';

export interface AppRoots {
  readonly topBar: HTMLElement;
  readonly shipPanel: HTMLElement;
  readonly log: HTMLElement;
  readonly planner: HTMLElement;
}

const BOARD_REFRESH_MS = 500;

/** Runs `fn` at most once per `ms`, trailing call included. */
function throttle(fn: () => void, ms: number): () => void {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return () => {
    timer ??= setTimeout(() => {
      timer = undefined;
      fn();
    }, ms);
  };
}

/** Composition root for the DOM layer. */
export class App {
  private readonly topBar: TopBar;

  constructor(roots: AppRoots, session: GameSession, ui: UiState) {
    const { world, commands } = session;
    this.topBar = new TopBar(roots.topBar, world, ui);
    new EventLog(roots.log, world);

    let shipPanel: ShipPanel | undefined;
    const planner = new PorkchopPanel(roots.planner, world, commands, ui, () => shipPanel?.render());
    shipPanel = new ShipPanel(roots.shipPanel, world, commands, ui, {
      openPlanner: (ship, targetId) => {
        const target = world.system.planetById(targetId);
        if (target) planner.open(ship, target);
      },
    });

    // Re-render the panel on structural changes only; per-frame text lives in the top bar.
    const rerender = () => shipPanel.render();
    ui.onChange(rerender);
    for (const event of ['shipAdded', 'departed', 'arrived', 'contractCompleted'] as const) world.events.on(event, rerender);
    // Board churn is frequent at high warp; coalesce it so the DOM under the cursor survives a click.
    const rerenderBoard = throttle(rerender, BOARD_REFRESH_MS);
    for (const event of ['contractOffered', 'contractExpired'] as const) world.events.on(event, rerenderBoard);
    rerender();
  }

  sync(): void {
    this.topBar.sync();
  }
}
