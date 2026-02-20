import { Subscription } from "./subscription.js";

/**
 * Type representing a function that can be called to unsubscribe from an Observable.
 * 
 * @typedef {function(): void} Unsubscribable
 */
export type Unsubscribable = () => void;

/**
 * Type representing any object that can be unsubscribed.
 * 
 * @interface SubscriptionLike
 * @property {boolean} closed - Whether the subscription is closed
 * @property {function(): void} unsubscribe - Function to unsubscribe
 */
export interface SubscriptionLike {
    closed: boolean;
    unsubscribe(): void;
}

// export type TeardownLogic = () => void | { unsubscribe: () => void } | void;
export type TeardownLogic = Subscription | Unsubscribable | (() => void) | void;


  /**
   * Next observer in a chain
   */
  export interface NextObserver<T> {
    next: (value: T) => void;
    error?: (error: any) => void;
    complete?: () => void;
  }
  
  /**
   * Error observer in a chain
   */
  export interface ErrorObserver<T> {
    next?: (value: T) => void;
    error: (error: any) => void;
    complete?: () => void;
  }
  
  /**
   * Completion observer in a chain
   */
  export interface CompletionObserver<T> {
    next?: (value: T) => void;
    error?: (error: any) => void;
    complete: () => void;
  }
  
  

