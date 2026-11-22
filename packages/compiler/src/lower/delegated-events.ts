/**
 * Events the compiled code delegates: one listener on the document, the handler stored on the
 * element as `$$name`. Only events that bubble: the runtime gives `focus`, `blur` and the other
 * non-bubbling ones a listener on the element instead.
 */
export const DELEGATED_EVENTS: ReadonlySet<string> = new Set([
  'click', 'dblclick', 'input', 'change', 'submit',
  'keydown', 'keyup', 'keypress', 'mousedown', 'mouseup',
]);
