import type { Action } from "../actions/action.js";
import type { AsyncAction } from "../actions/asyncAction.js";
import { Scheduler } from "./scheduler.js";

export class AsyncScheduler extends Scheduler {
    public actions: Array<AsyncAction<any>> = [];
    public _active: boolean = false;
    public _scheduled: any = undefined;
    
    constructor(
        SchedulerAction: typeof Action,
        now: () => number = () => Date.now()
    ) {
        super(SchedulerAction, now);
    }
    
    // schedule<T>(
    //   work: (this: SchedulerAction<T>, state?: T) => void,
    //   delay: number = 0,
    //   state?: T
    // ): Subscription {
    //   return new this.SchedulerAction(this, work).schedule(state, delay);
    // }
    
    flush(action: AsyncAction<any>): void {
      const { actions } = this;
      
      if (this._active) {
        actions.push(action);
        return;
      }
      
      let error: any;
      this._active = true;
      
      do {
        if ((error = action.execute(action.state, action.delay))) {
          break;
        }
      } while ((action = actions.shift()!));
      
      this._active = false;
      
      if (error) {
        while (actions.length > 0 && (action = actions.shift()!)) {
          action.unsubscribe();
        }
        throw error;
      }
    }
  }