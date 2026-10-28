import { Vec2 } from '../core/math/Vec2';

export interface ScreenPoint {
  readonly x: number;
  readonly y: number;
}

const MIN_PX_PER_AU = 4;
const MAX_PX_PER_AU = 4000;

/**
 * Heliocentric AU → screen pixels with zoom and pan. Everything is re-projected each frame, so
 * markers and line widths keep their pixel size at any zoom. +y is up (screen y is flipped).
 */
export class MapCamera {
  private center = Vec2.ZERO;
  private scale = 200;
  private width = 1;
  private height = 1;
  private changes = 0;

  /** Increments whenever the view changes; lets static layers redraw only when needed. */
  get version(): number {
    return this.changes;
  }

  get pxPerAu(): number {
    return this.scale;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    this.changes++;
  }

  toScreen(p: Vec2): ScreenPoint {
    return { x: this.width / 2 + (p.x - this.center.x) * this.scale, y: this.height / 2 - (p.y - this.center.y) * this.scale };
  }

  toWorld(x: number, y: number): Vec2 {
    return new Vec2(this.center.x + (x - this.width / 2) / this.scale, this.center.y - (y - this.height / 2) / this.scale);
  }

  panBy(dxPixels: number, dyPixels: number): void {
    this.set(this.center.add(new Vec2(-dxPixels / this.scale, dyPixels / this.scale)), this.scale);
  }

  /** Zooms by `factor`, keeping the world point under (x, y) fixed on screen. */
  zoomAt(x: number, y: number, factor: number): void {
    const anchor = this.toWorld(x, y);
    const scale = clamp(this.scale * factor);
    const offset = new Vec2((x - this.width / 2) / scale, -(y - this.height / 2) / scale);
    this.set(anchor.sub(offset), scale);
  }

  /** Scale at which a circle of `radiusAu` fits the viewport. */
  fitScale(radiusAu: number): number {
    return clamp((Math.min(this.width, this.height) / 2) * 0.92 / radiusAu);
  }

  /** Eases toward a target view; `rate` is the fraction of the remaining gap closed per call. */
  approach(center: Vec2, scale: number, rate: number): void {
    const logScale = Math.log(this.scale) + (Math.log(scale) - Math.log(this.scale)) * rate;
    this.set(this.center.add(center.sub(this.center).scale(rate)), Math.exp(logScale));
  }

  private set(center: Vec2, scale: number): void {
    if (center.x === this.center.x && center.y === this.center.y && scale === this.scale) return;
    this.center = center;
    this.scale = scale;
    this.changes++;
  }
}

const clamp = (scale: number): number => Math.max(MIN_PX_PER_AU, Math.min(MAX_PX_PER_AU, scale));
