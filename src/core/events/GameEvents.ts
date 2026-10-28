import type { Contract } from '../contracts/Contract';
import type { Ship } from '../ship/Ship';

export interface GameEvents {
  shipAdded: { readonly ship: Ship };
  departed: { readonly ship: Ship };
  arrived: { readonly ship: Ship };
  contractCompleted: { readonly ship: Ship; readonly contract: Contract; readonly payout: number; /** Paid less than the full reward. */ readonly late: boolean };
  contractOffered: { readonly contract: Contract };
  contractExpired: { readonly contract: Contract };
}
