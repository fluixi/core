import type { Subscription } from '../observable/subscription.js';

/**
 * Represents a scheduler that can schedule work for future execution.
 *
 * @interface SchedulerLike
 *
 * @property {function(): number} now - Returns the current timestamp
 * @method schedule - Schedules work to be executed
 * @template T - The type of state passed to the work function
 * @param {function(this: SchedulerAction<T>, state?: T): void} work - The work function to execute
 * @param {number} [delay] - Optional delay in milliseconds
 * @param {T} [state] - Optional state to pass to the work function
 * @returns {Subscription} A subscription that can be used to cancel the work
 */
export interface SchedulerLike {
  now(): number;
  schedule<T>(
    work: (this: SchedulerAction<T>, state?: T) => void,
    delay?: number,
    state?: T
  ): Subscription;
}

/**
 * Represents an action scheduled by a scheduler.
 *
 * @interface SchedulerAction
 * @template T - The type of state
 * @extends {Subscription}
 *
 * @method schedule - Reschedules this action
 * @param {T} [state] - Optional new state
 * @param {number} [delay] - Optional new delay
 * @returns {Subscription} A subscription for the rescheduled action
 */
export interface SchedulerAction<T> extends Subscription {
  schedule(state?: T, delay?: number): Subscription;
}
