import type { Action } from "../actions/action.js";
import type { Subscription } from "../observable/subscription.js";
import type { SchedulerAction, SchedulerLike } from "./types.js";


export class Scheduler implements SchedulerLike{
    // abstract now(): number;
    public static now: () => number =  ()=>Date.now();

    
    constructor(private schedulerActionCtor: typeof Action, now: () => number = Scheduler.now) {
        this.now = now;
    }
    public now: () => number;
    public schedule<T>(work: (this: SchedulerAction<T>, state?: T) => void, delay: number = 0, state?: T): Subscription {
        return new this.schedulerActionCtor<T>(this, work).schedule(state, delay);
    }
    
}