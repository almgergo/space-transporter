/** The player's credit balance. */
export class Wallet {
  constructor(private balance: number) {}

  get credits(): number {
    return this.balance;
  }

  canAfford(cost: number): boolean {
    return this.balance >= cost;
  }

  deposit(amount: number): void {
    this.balance += amount;
  }

  /** Returns false (and changes nothing) if funds are insufficient. */
  withdraw(amount: number): boolean {
    if (!this.canAfford(amount)) return false;
    this.balance -= amount;
    return true;
  }
}
