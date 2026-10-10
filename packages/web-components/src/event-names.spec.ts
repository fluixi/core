/**
 * An event named in camel case reaches the JSX handler its type promises: `emit('signOut')`
 * calls `onSignOut`. JSX handlers listen for the name after `on`, lowercased, so the element
 * dispatches it lowercased; it used to dispatch `signOut`, which no `onSignOut` ever heard.
 */
import { describe, expect, it, vi } from 'vitest';
import { spread } from '@fluixi/dom';
import { defineCustomElement, typedElement } from './index.js';

class EventNamesProbe extends typedElement({}) {
  leave(): void {
    this.emit('signOut', { reason: 'asked' });
  }
  protected override render(): unknown {
    return null;
  }
}
defineCustomElement('event-names-probe', EventNamesProbe);

describe('emit', () => {
  it('reaches the camel-case handler JSX binds', () => {
    const element = document.createElement('event-names-probe') as EventNamesProbe;
    document.body.append(element);
    const heard = vi.fn();
    spread({ element, props: { onSignOut: heard }, isCustomElement: true });
    element.leave();
    expect(heard).toHaveBeenCalledTimes(1);
    expect((heard.mock.calls[0]![0] as CustomEvent).detail).toEqual({ reason: 'asked' });
    element.remove();
  });

  it('dispatches the name lowercased, for a listener added by hand', () => {
    const element = document.createElement('event-names-probe') as EventNamesProbe;
    const heard = vi.fn();
    element.addEventListener('signout', heard);
    element.leave();
    expect(heard).toHaveBeenCalledTimes(1);
  });
});
