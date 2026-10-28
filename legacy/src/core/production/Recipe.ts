import type { ResourceAmounts } from '../Resource';

export interface Recipe {
  readonly name: string;
  readonly inputs: ResourceAmounts;
  readonly outputs: ResourceAmounts;
  /** Seconds per production cycle. */
  readonly cycleTime: number;
}
