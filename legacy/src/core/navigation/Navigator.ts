import { Vec2 } from '../math/Vec2';

/** Moves a position toward a destination at constant speed. */
export class Navigator {
  private destination: Vec2 | undefined;

  constructor(
    private currentPosition: Vec2,
    readonly speed: number,
  ) {}

  get position(): Vec2 {
    return this.currentPosition;
  }

  get target(): Vec2 | undefined {
    return this.destination;
  }

  get hasArrived(): boolean {
    return this.destination === undefined;
  }

  travelTo(destination: Vec2): void {
    this.destination = destination;
  }

  update(dt: number): void {
    if (!this.destination) return;
    const toTarget = this.destination.sub(this.currentPosition);
    const step = this.speed * dt;
    if (toTarget.length() <= step) {
      this.currentPosition = this.destination;
      this.destination = undefined;
    } else {
      this.currentPosition = this.currentPosition.add(toTarget.normalized().scale(step));
    }
  }
}
