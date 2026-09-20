/**
 * A per-component service, holding a reactive draft.
 *
 * Two things again. The scope: the compose box keeps a draft while it is mounted and
 * throws it away when it is not. Providing this at the root would keep one user's
 * half-written reply alive across the whole app; providing it on the component ties its
 * lifetime to the box, and `onDestroy` runs when that unmounts.
 *
 * And the state: `text` is a signal rather than a field, because the character counter
 * and the disabled state of the submit button both read it. A plain field would be read
 * once during render and never again.
 *
 * `disposals` is module-level on purpose — the test asserts it went up, which is how you
 * tell the owner-scoped injector actually disposed rather than the instance merely going
 * out of scope.
 */
import { signal, type SignalHandle } from '@fluixi/reactive/signal';

export class DraftStore {
  static disposals = 0;
  static live = 0;

  /** Read it to subscribe, call `.set` to update. */
  readonly text: SignalHandle<string>;

  constructor(readonly ticketId: string) {
    this.text = signal('');
    DraftStore.live++;
  }

  set(text: string): void {
    this.text.set(text);
  }

  clear(): void {
    this.text.set('');
  }

  /** Tracked, so a counter bound to it updates as the user types. */
  get length(): number {
    return this.text().length;
  }

  get isEmpty(): boolean {
    return this.text().trim().length === 0;
  }

  /** Called by the DI container when the owning component's injector disposes. */
  onDestroy(): void {
    this.text.set('');
    DraftStore.live--;
    DraftStore.disposals++;
  }
}
