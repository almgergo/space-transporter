import type { Resource } from '../core/Resource';
import type { StationKind } from '../core/station/Station';

export const WORLD_WIDTH = 1000;
export const WORLD_HEIGHT = 700;

export const COLORS = {
  background: 0x05070d,
  star: 0x8aa0c8,
  route: 0x3a4a6b,
  routeActive: 0x7fd1ff,
  routePending: 0xffd166,
  selection: 0xffd166,
  ship: 0xe8ecf4,
  progress: 0x7fd1ff,
} as const;

export const STATION_COLORS: Record<StationKind, number> = {
  mine: 0xc08457,
  farm: 0x6fcf73,
  refinery: 0xb48cf2,
  colony: 0x5fb6ff,
};

export const RESOURCE_COLORS: Record<Resource, string> = {
  ore: '#d9a36f',
  metal: '#c9b8ff',
  food: '#8be28f',
};

export const FONT = '"JetBrains Mono", "SF Mono", Menlo, monospace';

export const TEXT = {
  primary: '#e8ecf4',
  muted: '#8a94a8',
  positive: '#7ee787',
  negative: '#ff7b72',
  accent: '#ffd166',
} as const;

export const STATION_RADIUS = 22;
export const PICK_RADIUS = 30;
