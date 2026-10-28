/**
 * Converts variable frame deltas into fixed simulation steps, so the
 * simulation is deterministic regardless of frame rate.
 */
export class FixedStepClock {
  private accumulator = 0;

  constructor(
    readonly step = 1 / 30,
    private readonly maxStepsPerAdvance = 10,
  ) {}

  /** Feeds real elapsed seconds; invokes `onStep(step)` zero or more times. */
  advance(realSeconds: number, onStep: (dt: number) => void): void {
    this.accumulator = Math.min(this.accumulator + realSeconds, this.step * this.maxStepsPerAdvance);
    while (this.accumulator >= this.step) {
      this.accumulator -= this.step;
      onStep(this.step);
    }
  }
}
