/** Immutable 2D vector. */
export class Vec2 {
  constructor(
    readonly x: number,
    readonly y: number,
  ) {}

  static readonly ZERO = new Vec2(0, 0);

  add(other: Vec2): Vec2 {
    return new Vec2(this.x + other.x, this.y + other.y);
  }

  sub(other: Vec2): Vec2 {
    return new Vec2(this.x - other.x, this.y - other.y);
  }

  scale(factor: number): Vec2 {
    return new Vec2(this.x * factor, this.y * factor);
  }

  length(): number {
    return Math.hypot(this.x, this.y);
  }

  distanceTo(other: Vec2): number {
    return this.sub(other).length();
  }

  normalized(): Vec2 {
    const len = this.length();
    return len === 0 ? Vec2.ZERO : this.scale(1 / len);
  }
}
