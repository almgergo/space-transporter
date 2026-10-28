import type { Ship } from '../../core/ship/Ship';
import type { Station } from '../../core/station/Station';

export type SelectionState =
  | { readonly kind: 'none' }
  | { readonly kind: 'ship'; readonly ship: Ship }
  | { readonly kind: 'pickup'; readonly ship: Ship; readonly pickup: Station };

/** UI-only selection state, shared between the input controller and views. */
export class Selection {
  private current: SelectionState = { kind: 'none' };
  private feedback = '';

  get state(): SelectionState {
    return this.current;
  }

  get message(): string {
    return this.feedback;
  }

  get ship(): Ship | undefined {
    return this.current.kind === 'none' ? undefined : this.current.ship;
  }

  set(state: SelectionState, message = ''): void {
    this.current = state;
    this.feedback = message;
  }

  clear(message = ''): void {
    this.set({ kind: 'none' }, message);
  }
}
