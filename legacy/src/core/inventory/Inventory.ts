import { RESOURCES, type Resource, type ResourceAmounts } from '../Resource';

/** Holds resource amounts up to a shared total capacity. */
export class Inventory {
  private readonly amounts = new Map<Resource, number>();

  constructor(readonly capacity: number) {}

  amountOf(resource: Resource): number {
    return this.amounts.get(resource) ?? 0;
  }

  get total(): number {
    let sum = 0;
    for (const amount of this.amounts.values()) sum += amount;
    return sum;
  }

  get freeSpace(): number {
    return this.capacity - this.total;
  }

  get isEmpty(): boolean {
    return this.total === 0;
  }

  /** Adds as much as fits; returns the amount actually added. */
  add(resource: Resource, amount: number): number {
    const added = Math.min(amount, this.freeSpace);
    if (added <= 0) return 0;
    this.amounts.set(resource, this.amountOf(resource) + added);
    return added;
  }

  /** Removes as much as is available; returns the amount actually removed. */
  remove(resource: Resource, amount: number): number {
    const removed = Math.min(amount, this.amountOf(resource));
    if (removed <= 0) return 0;
    this.amounts.set(resource, this.amountOf(resource) - removed);
    return removed;
  }

  hasAll(required: ResourceAmounts): boolean {
    return entries(required).every(([resource, amount]) => this.amountOf(resource) >= amount);
  }

  removeAll(amounts: ResourceAmounts): void {
    for (const [resource, amount] of entries(amounts)) this.remove(resource, amount);
  }

  addAll(amounts: ResourceAmounts): void {
    for (const [resource, amount] of entries(amounts)) this.add(resource, amount);
  }

  /** Non-zero contents, in canonical resource order. */
  contents(): Array<[Resource, number]> {
    return RESOURCES.map((r): [Resource, number] => [r, this.amountOf(r)]).filter(([, a]) => a > 0);
  }
}

export function entries(amounts: ResourceAmounts): Array<[Resource, number]> {
  return Object.entries(amounts) as Array<[Resource, number]>;
}

export function sumOf(amounts: ResourceAmounts): number {
  return entries(amounts).reduce((sum, [, amount]) => sum + amount, 0);
}
