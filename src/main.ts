import Phaser from 'phaser';
import { createDefaultGame } from './core/scenario';
import { MapScene } from './render/MapScene';
import { COLORS } from './render/theme';
import { App } from './ui/App';
import './ui/styles.css';
import { UiState } from './ui/UiState';

const byId = (id: string): HTMLElement => {
  const node = document.getElementById(id);
  if (!node) throw new Error(`#${id} missing from index.html`);
  return node;
};

const session = createDefaultGame();
const ui = new UiState();
const app = new App(
  { topBar: byId('top-bar'), shipPanel: byId('ship-panel'), log: byId('log'), planner: byId('planner') },
  session,
  ui,
);

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'map',
  backgroundColor: COLORS.background,
  antialias: true,
  scale: { mode: Phaser.Scale.RESIZE },
  scene: [new MapScene(session, ui)],
  callbacks: { postBoot: (game) => game.events.on(Phaser.Core.Events.POST_STEP, () => app.sync()) },
});

// Dev-only handle for debugging and browser tests (e.g. `__session.world.wallet.deposit(1e5)`).
if (import.meta.env.DEV) Object.assign(window, { __session: session });
