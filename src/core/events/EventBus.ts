type Listener<T> = (payload: T) => void;

/** Minimal typed pub/sub. `TEvents` maps event names to payload types. */
export class EventBus<TEvents extends object> {
  private readonly listeners = new Map<keyof TEvents, Set<Listener<never>>>();

  /** Subscribes and returns an unsubscribe function. */
  on<K extends keyof TEvents>(event: K, listener: Listener<TEvents[K]>): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener as Listener<never>);
    return () => set.delete(listener as Listener<never>);
  }

  emit<K extends keyof TEvents>(event: K, payload: TEvents[K]): void {
    this.listeners.get(event)?.forEach((listener) => (listener as Listener<TEvents[K]>)(payload));
  }
}
