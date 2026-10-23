import { isObject, isFunction } from '../predicates.js';
import { SubscriptionLike, TeardownLogic, Unsubscribable } from './types.js';

/**
 * Represents a disposable resource, such as the execution of an Observable.
 * This is the primary mechanism for cleaning up Observable executions.
 *
 * @class Subscription
 * @implements {SubscriptionLike}
 *
 * @example
 * // Basic usage
 * const subscription = new Subscription();
 * subscription.add(() => console.log('Cleanup'));
 * subscription.unsubscribe(); // Logs: Cleanup
 *
 * @example
 * // Adding child subscriptions
 * const parent = new Subscription();
 * const child = new Subscription();
 * parent.add(child);
 *
 * // Unsubscribing parent also unsubscribes child
 * parent.unsubscribe();
 * console.log(child.closed); // true
 */
export class Subscription implements SubscriptionLike {
  /** @private */ private _closed = false;
  /** @private */ private _parentOrParents:
    | Subscription
    | Subscription[]
    | null = null;
  /** @private */ private _subscriptions:
    | (Subscription | Unsubscribable)[]
    | null = null;

  /**
   * Creates a new Subscription.
   */
  constructor(unsubscribe?: Unsubscribable) {
    if (unsubscribe) {
      this._subscriptions = [unsubscribe];
    }
  }

  /**
   * Whether the subscription is closed.
   */
  get closed(): boolean {
    return this._closed;
  }

  /**
   * Disposes the resources held by the subscription.
   * May be called multiple times (idempotent).
   */
  unsubscribe(): void {
    if (this._closed) {
      return;
    }

    this._closed = true;
    const { _parentOrParents, _subscriptions } = this;

    // Remove from parent
    if (_parentOrParents instanceof Subscription) {
      _parentOrParents.remove(this);
    } else if (_parentOrParents !== null) {
      for (const parent of _parentOrParents) {
        parent.remove(this);
      }
    }

    // Unsubscribe all child subscriptions
    if (_subscriptions) {
      for (const sub of _subscriptions) {
        if (isFunction(sub) && !(sub instanceof Subscription)) {
          try {
            sub();
          } catch (error) {
            // Don't let errors in cleanup functions break unsubscribe chain
            console.error('Error in unsubscribe function:', error);
          }
        } else if (isObject(sub) && typeof sub.unsubscribe === 'function') {
          try {
            sub.unsubscribe();
          } catch (error) {
            console.error('Error unsubscribing child:', error);
          }
        }
      }
      this._subscriptions = null;
    }
  }

  /**
   * Adds a child subscription or cleanup function to this subscription.
   * When this subscription is unsubscribed, all added subscriptions/functions will be unsubscribed/called.
   *
   * @throws {TypeError} If the argument is not a subscription-like object or function
   */
  add(subscription: SubscriptionLike | Unsubscribable): this {
    if (!subscription || subscription === this) {
      return this;
    }

    // If subscription is already closed, do nothing
    if ((subscription as SubscriptionLike).closed) {
      return this;
    }

    let { _closed, _subscriptions } = this;

    // If this subscription is already closed, unsubscribe the added subscription immediately
    if (_closed) {
      if (isFunction(subscription)) {
        try {
          (subscription as any)();
        } catch (error) {
          console.error('Error in unsubscribe function:', error);
        }
      } else if (subscription.unsubscribe) {
        try {
          subscription.unsubscribe();
        } catch (error) {
          console.error('Error unsubscribing:', error);
        }
      }
      return this;
    }

    // Initialize subscriptions array if needed
    if (!_subscriptions) {
      this._subscriptions = [];
    }

    this._subscriptions!.push(subscription as Subscription);

    // Set parent reference
    if (subscription instanceof Subscription) {
      subscription._addParent(this);
    }

    return this;
  }

  /**
   * Removes a child subscription from this subscription.
   */
  remove(subscription: Subscription): void {
    const { _subscriptions } = this;
    if (!_subscriptions) {
      return;
    }

    const index = _subscriptions.indexOf(subscription);
    if (index !== -1) {
      _subscriptions.splice(index, 1);

      // Remove parent reference
      subscription._removeParent(this);
    }
  }

  /** @private */
  private _addParent(parent: Subscription): void {
    const { _parentOrParents } = this;
    if (!_parentOrParents) {
      this._parentOrParents = parent;
    } else if (Array.isArray(_parentOrParents)) {
      _parentOrParents.push(parent);
    } else {
      this._parentOrParents = [_parentOrParents, parent];
    }
  }

  /** @private */
  private _removeParent(parent: Subscription): void {
    const { _parentOrParents } = this;
    if (_parentOrParents === parent) {
      this._parentOrParents = null;
    } else if (Array.isArray(_parentOrParents)) {
      const index = _parentOrParents.indexOf(parent);
      if (index !== -1) {
        _parentOrParents.splice(index, 1);
        if (_parentOrParents.length === 1) {
          this._parentOrParents = _parentOrParents[0];
        }
      }
    }
  }
}
