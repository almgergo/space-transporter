/** A renderable projection of some simulation state. Views read the world; they never change it. */
export interface View {
  /** Pulls the latest state into display objects. Called once per frame. */
  sync(): void;
  destroy(): void;
}
