type Child = Node | string | false | null | undefined;
type Props = Record<string, string | number | boolean | undefined>;

/** Tiny element builder: el('button', { class: 'x', 'data-action': 'go' }, 'Go'). */
export function el<K extends keyof HTMLElementTagNameMap>(tag: K, props: Props = {}, ...children: Child[]): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    node.setAttribute(key, value === true ? '' : String(value));
  }
  for (const child of children) {
    if (child === false || child === null || child === undefined) continue;
    node.append(child);
  }
  return node;
}

/** Routes clicks on descendants with a `data-action` attribute to a handler. */
export function onAction(root: HTMLElement, handler: (action: string, id: string | undefined, target: HTMLElement) => void): void {
  root.addEventListener('click', (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>('[data-action]');
    if (!target || !root.contains(target) || target.hasAttribute('disabled')) return;
    handler(target.dataset.action!, target.dataset.id, target);
  });
}
