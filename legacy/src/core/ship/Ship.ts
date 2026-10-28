import type { Inventory } from '../inventory/Inventory';
import type { Navigator } from '../navigation/Navigator';
import type { Autopilot } from './Autopilot';

/** A mobile cargo carrier, composed of a hold, a navigator and an optional autopilot. */
export class Ship {
  private pilot: Autopilot | undefined;

  constructor(
    readonly id: string,
    readonly name: string,
    readonly cargo: Inventory,
    readonly navigator: Navigator,
  ) {}

  get autopilot(): Autopilot | undefined {
    return this.pilot;
  }

  assignAutopilot(autopilot: Autopilot): void {
    this.pilot = autopilot;
    autopilot.engage(this);
  }

  update(dt: number): void {
    this.pilot?.update(dt, this);
    this.navigator.update(dt);
  }
}
