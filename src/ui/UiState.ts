import type { Ship } from '../core/ship/Ship';
import type { TransferOption } from '../core/transfer/TransferOption';

export const WARP_SPEEDS = [0, 1, 5, 20, 100, 365, 1000] as const;

/** What the map camera tracks. `free` = user has panned/zoomed manually. */
export type MapFocus = 'inner' | 'outer' | 'ship' | 'free';

/** Presentation-only state shared by the map and the DOM panels. Never read by core. */
export class UiState {
  private ship: Ship | undefined;
  private previewOption: TransferOption | undefined;
  /** Simulated days per real second. */
  private warpSpeed = 5;
  private mapFocus: MapFocus = 'inner';
  private readonly listeners = new Set<() => void>();

  get selectedShip(): Ship | undefined {
    return this.ship;
  }

  get preview(): TransferOption | undefined {
    return this.previewOption;
  }

  get warp(): number {
    return this.warpSpeed;
  }

  get focus(): MapFocus {
    return this.mapFocus;
  }

  setFocus(focus: MapFocus): void {
    if (focus === this.mapFocus) return;
    this.mapFocus = focus;
    this.notify();
  }

  selectShip(ship: Ship | undefined): void {
    this.ship = ship;
    this.previewOption = undefined;
    this.notify();
  }

  setPreview(option: TransferOption | undefined): void {
    if (option === this.previewOption) return;
    this.previewOption = option;
    this.notify();
  }

  setWarp(daysPerSecond: number): void {
    this.warpSpeed = daysPerSecond;
    this.notify();
  }

  /** Subscribes to any change; returns an unsubscribe function. */
  onChange(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify(): void {
    this.listeners.forEach((listener) => listener());
  }
}
