import type { Subscription } from "../observable/subscription.js";
import type { AsyncScheduler } from "../schedulers/asyncScheduler.js";
import type { SchedulerAction } from "../schedulers/types.js";
import { intervalProvider, TimerHandle } from "../schedulers/timer/index.js";
import { Action } from "./action.js";

export class AsyncAction<T> extends Action<T> {
    public id: any;
    public state?: T;
    public delay!: number;
    protected pending: boolean = false;
    
    constructor(
        protected scheduler: AsyncScheduler,
        protected work: (this: SchedulerAction<T>, state?: T) => void
    ) {
        super(scheduler, work)
    }
    
    override schedule(state?: T, delay: number = 0): Subscription {
        // console.log('start scheduling')
        if (this.closed) {
            return this;
        }
        
        this.state = state;
        const {scheduler, id} = this;
        // const { actions } = scheduler;
        
        this.delay = delay;
        this.pending = true;
        
        // actions.push(this);
        
        // scheduler.flush = scheduler.flush.bind(scheduler);
        
        if (id != null) {
            this.id = this.refreshIntervalId(scheduler, id, delay);
        }
        // Set the pending flag indicating that this action has been scheduled, or
        // has recursively rescheduled itself.
        this.pending = true;

        this.delay = delay;
        // If this action has already an async Id, don't request a new one.
        this.id = this.id ?? this.makeIntervalId(scheduler, delay);

        return this;
    }
    protected makeIntervalId(scheduler: AsyncScheduler, delay: number = 0): TimerHandle {
        return intervalProvider.setInterval(scheduler.flush.bind(scheduler, this), delay);
    }
    
    protected refreshIntervalId(_scheduler: AsyncScheduler, id?: TimerHandle, delay: number | null = 0): TimerHandle | undefined {
        // when the action is rescheduled with the same delay value, we skip the id clear.
        if (delay != null && this.delay === delay && this.pending === false) {
            return id;
        }
        // Otherwise, if the action's delay time is different from the current delay,
        // or the action has been rescheduled before it's executed, clear the interval id
        if (id != null) {
            intervalProvider.clearInterval(id);
        }
    
        return undefined;
    }
    execute(state: T, delay: number): any {
        if (this.closed) {
            return new Error('executing a cancelled action');
        }
        
        this.pending = false;
        const error = this._execute(state, delay);
        if (error) {
            return error;
        }else if(this.pending === false && this.id != null) {
            this.id = this.refreshIntervalId(this.scheduler, this.id, null);
        }
    }
    
    protected _execute(state: T, delay: number): any {
        let execution_error = false;
        let errorValue: any;
        try {
            this.work.call(this, state);
        } catch (e) {
            // console.log('execution error', e)
            execution_error = true;
            errorValue = e;
        }
        
        if (execution_error) {
            this.unsubscribe();
            return errorValue;
        }
    }

    override unsubscribe() {
        if (!this.closed) {
            const { id, scheduler } = this;
            const { actions } = scheduler;
        
            this.work = this.state = this.scheduler = null!;
            this.pending = false;
            const index = actions.indexOf(this);
            if (index !== -1) {
                // console.log('ation remove')
                actions.splice(index, 1);
            }else{
                // console.log('action not found', this)
            }
            // this.pending = false;
            if (id != null) {
                this.id = this.refreshIntervalId(scheduler, id, null);
            }
        
            // this.delay = null!;
            // this.work = null!;
            // this.state = null!;
            // this.scheduler = null!;
            // this.id = null!;
            super.unsubscribe();
        }
    }
    
    // protected setTimeout(fn: () => void, delay: number): any {
    //     return setTimeout(fn, delay);
    // }
    
    // protected clearTimeout(id: any): void {
    //     clearTimeout(id);
    // }
    
    // get closed(): boolean {
    //   return (this as any).closed || false;
    // }
}