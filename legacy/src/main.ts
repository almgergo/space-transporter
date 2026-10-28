import Phaser from 'phaser';
import { createDefaultGame } from './core/scenario';
import { GameScene } from './render/GameScene';
import { COLORS, WORLD_HEIGHT, WORLD_WIDTH } from './render/theme';

new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  backgroundColor: COLORS.background,
  antialias: true,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  scene: [new GameScene(createDefaultGame())],
});
