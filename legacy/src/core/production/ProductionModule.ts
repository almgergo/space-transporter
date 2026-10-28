import { sumOf, type Inventory } from '../inventory/Inventory';
import type { Recipe } from './Recipe';

/**
 * Runs a recipe against an inventory. A cycle starts only when inputs are
 * available and there is room for outputs; inputs are consumed at completion.
 */
export class ProductionModule {
  private progress = 0;

  constructor(
    readonly recipe: Recipe,
    private readonly inventory: Inventory,
  ) {}

  /** 0..1 progress of the current cycle. */
  get cycleProgress(): number {
    return this.progress / this.recipe.cycleTime;
  }

  get isRunning(): boolean {
    return this.canRun();
  }

  update(dt: number): void {
    if (!this.canRun()) return;
    this.progress += dt;
    while (this.progress >= this.recipe.cycleTime && this.canRun()) {
      this.progress -= this.recipe.cycleTime;
      this.inventory.removeAll(this.recipe.inputs);
      this.inventory.addAll(this.recipe.outputs);
    }
  }

  private canRun(): boolean {
    const netGrowth = sumOf(this.recipe.outputs) - sumOf(this.recipe.inputs);
    return this.inventory.hasAll(this.recipe.inputs) && this.inventory.freeSpace >= netGrowth;
  }
}
