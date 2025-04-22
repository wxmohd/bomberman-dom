// Virtual DOM types and rendering

export type VNode = {
  tag: string;
  attrs?: { [key: string]: any };
  children?: Array<VNode | string>;
  events?: { [eventType: string]: (e: Event) => void };
};

/**
 * Create a virtual DOM node
 */
export function h(
  tag: string,
  attrs: { [key: string]: any } = {},
  children: Array<VNode | string> = [],
  events: { [eventType: string]: (e: Event) => void } = {}
): VNode {
  return { tag, attrs, children, events };
}

/**
 * Render a VNode tree to a real DOM node
 */
export function render(vnode: VNode | string): Node {
  if (typeof vnode === 'string') {
    return document.createTextNode(vnode);
  }
  const el = document.createElement(vnode.tag);
  // Set attributes
  if (vnode.attrs) {
    for (const [key, value] of Object.entries(vnode.attrs)) {
      // Set boolean properties directly
      if (typeof value === 'boolean') {
        (el as any)[key] = value;
      } else if (value !== undefined) {
        el.setAttribute(key, value);
      }
    }
  }
  // Attach events (custom event system will wrap this later)
  if (vnode.events) {
    for (const [eventType, handler] of Object.entries(vnode.events)) {
      el.addEventListener(eventType, handler);
    }
  }
  // Render children
  if (vnode.children) {
    vnode.children.forEach(child => {
      el.appendChild(render(child));
    });
  }
  return el;
}
