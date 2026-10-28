/**
 * Sequential single-hue ramp (blue 100→700), read cheap → expensive. On the dark map surface the
 * cheapest transfers are the brightest, and expensive ones recede toward the background.
 */
export const RAMP = [
  '#cde2fb', '#b7d3f6', '#9ec5f4', '#86b6ef', '#6da7ec', '#5598e7', '#3987e5',
  '#2a78d6', '#256abf', '#1c5cab', '#184f95', '#104281', '#0d366b',
] as const;

/** Band edges are spaced logarithmically from the cheapest Δv to `span` × cheapest. */
export class DeltaVScale {
  private readonly logMin: number;
  private readonly logMax: number;

  constructor(
    readonly min: number,
    readonly span = 3,
  ) {
    this.logMin = Math.log(min);
    this.logMax = Math.log(min * span);
  }

  band(deltaV: number): number {
    const t = (Math.log(deltaV) - this.logMin) / (this.logMax - this.logMin);
    return Math.max(0, Math.min(RAMP.length - 1, Math.floor(t * RAMP.length)));
  }

  color(deltaV: number): string {
    return RAMP[this.band(deltaV)]!;
  }

  /** Lower Δv edge of a band. */
  edge(band: number): number {
    return Math.exp(this.logMin + ((this.logMax - this.logMin) * band) / RAMP.length);
  }
}
