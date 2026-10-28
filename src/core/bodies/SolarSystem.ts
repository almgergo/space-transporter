import type { Planet } from './Planet';

export class SolarSystem {
  constructor(
    /** Central body's gravitational parameter, AU³/day². */
    readonly mu: number,
    readonly planets: readonly Planet[],
  ) {}

  planetById(id: string): Planet | undefined {
    return this.planets.find((p) => p.id === id);
  }
}
