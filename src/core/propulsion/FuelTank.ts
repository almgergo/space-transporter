export class FuelTank {
  constructor(
    readonly capacity: number,
    private fuel = 0,
  ) {}

  get amount(): number {
    return this.fuel;
  }

  get freeSpace(): number {
    return this.capacity - this.fuel;
  }

  /** Adds up to the free space; returns tonnes added. */
  fill(tonnes: number): number {
    const added = Math.max(0, Math.min(tonnes, this.freeSpace));
    this.fuel += added;
    return added;
  }

  /** Removes up to the available amount; returns tonnes drawn. */
  draw(tonnes: number): number {
    const drawn = Math.max(0, Math.min(tonnes, this.fuel));
    this.fuel -= drawn;
    return drawn;
  }
}
