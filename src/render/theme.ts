/** Radii (AU) framed by the inner/outer focus buttons. */
export const INNER_VIEW_RADIUS = 1.75;
export const OUTER_VIEW_RADIUS = 31;

export const COLORS = {
  background: 0x05070d,
  star: 0x8aa0c8,
  sun: 0xffd166,
  orbit: 0x26324a,
  ship: 0xe8ecf4,
  selection: 0xffd166,
  scheduled: 0x6b7a99,
  inTransit: 0x7fd1ff,
  preview: 0xffd166,
} as const;

export const PLANET_COLORS: Record<string, number> = {
  mercury: 0xb5aca0,
  venus: 0xe8c77a,
  earth: 0x5fb6ff,
  mars: 0xe07a5f,
  jupiter: 0xd9a066,
  saturn: 0xe3cf8f,
  uranus: 0x8fd6dd,
  neptune: 0x5b7cf0,
};

export const FONT = 'ui-monospace, "SF Mono", Menlo, monospace';

export const TEXT = {
  primary: '#e8ecf4',
  muted: '#8a94a8',
} as const;
