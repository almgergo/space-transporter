import type { Planet } from '../bodies/Planet';
import type { TransferOption } from '../transfer/TransferOption';

export type ShipState =
  | { readonly kind: 'docked'; readonly planet: Planet }
  | { readonly kind: 'scheduled'; readonly planet: Planet; readonly transfer: TransferOption }
  | { readonly kind: 'inTransit'; readonly transfer: TransferOption };
