import type { Contract, ContractKind } from '../core/contracts/Contract';
import { date, days } from './format';

export const KIND_LABELS: Record<ContractKind, string> = {
  standard: 'Freight',
  bulk: 'Bulk',
  express: 'Express',
  passengers: 'Passengers',
  outerSupply: 'Outer supply',
};

/** One-line summary of how a contract pays out. */
export function payoutText(contract: Contract): string {
  const payout = contract.terms.payout;
  return payout.kind === 'deadline'
    ? `due ${date(payout.deadline)}`
    : `full pay if flight ≤ ${days(payout.idealDays)} (nothing past ${days(payout.zeroAfterDays)})`;
}

/** "120 passengers" or "30 t". Passenger modules are ~0.1 t per person. */
export function loadText(contract: Contract): string {
  return contract.terms.kind === 'passengers' ? `${contract.terms.mass * 10} passengers (${contract.terms.mass} t)` : `${contract.terms.mass} t`;
}
