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

  dot(other: Vec2): number {
    return this.x * other.x + this.y * other.y;
  }

  /** z-component of the 3D cross product; positive when `other` is counter-clockwise from this. */
  cross(other: Vec2): number {
    return this.x * other.y - this.y * other.x;
  }

  /** Angle from the +x axis, in radians (−π, π]. */
  angle(): number {
    return Math.atan2(this.y, this.x);
  }

  rotate(radians: number): Vec2 {
    const c = Math.cos(radians);
    const s = Math.sin(radians);
    return new Vec2(this.x * c - this.y * s, this.x * s + this.y * c);
  }

  static fromPolar(radius: number, angle: number): Vec2 {
    return new Vec2(radius * Math.cos(angle), radius * Math.sin(angle));
  }

  normalized(): Vec2 {
    const len = this.length();
    return len === 0 ? Vec2.ZERO : this.scale(1 / len);
  }
}
