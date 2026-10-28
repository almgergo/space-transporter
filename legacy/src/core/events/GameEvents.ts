import type { Resource } from '../Resource';
import type { Ship } from '../ship/Ship';
import type { Station } from '../station/Station';

export interface TradeEvent {
  readonly ship: Ship;
  readonly station: Station;
  readonly resource: Resource;
  readonly amount: number;
  /** Signed change to the player's credits (negative when buying). */
  readonly credits: number;
}

export interface GameEvents {
  trade: TradeEvent;
  shipAdded: { readonly ship: Ship };
}
