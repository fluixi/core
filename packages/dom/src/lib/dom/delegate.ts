// delegation.ts

const delegatedEvents = new Set<string>();

// Events that should NOT be delegated (no bubbling or special behavior)
const NON_DELEGATED = new Set([
  "scroll",
  "focus",
  "blur"
]);

/**
 * Ensure a global listener exists for each event type
 */
export function delegateEvents(eventNames: string[]) {
  for (const name of eventNames) {
    if (delegatedEvents.has(name) || NON_DELEGATED.has(name)) continue;

    delegatedEvents.add(name);
    
    document.addEventListener(name, (event: Event) => {
        let node = event.target as any;
        
        while (node && node !== document.documentElement) {
            const handler = node["$$" + name];
            
            if (handler) {
          handler.call(node, event);

          // stopPropagation support
        //   if (event.cancelBubble) return;
        }

        node = node.parentNode;
      }
    });
  }
}

/**
 * Add delegated handler
 */
export function addDelegatedEventListener(
  element: Element,
  name: string,
  handler: EventListener
) {
  (element as any)["$$" + name] = handler;
// console.log('delegate on', element, name)
  delegateEvents([name]);
}

/**
 * Remove delegated handler
 */
export function removeDelegatedEventListener(
  element: Element,
  name: string
) {
  delete (element as any)["$$" + name];
}

/**
 * Check if event should be delegated
 */
export function isDelegatedEvent(name: string) {
  return !NON_DELEGATED.has(name);
}