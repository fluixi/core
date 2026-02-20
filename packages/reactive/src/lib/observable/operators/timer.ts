import { isScheduler, Observable, Observer, SchedulerAction, SchedulerLike } from "@awc/reactive";
import { asyncScheduler } from "@awc/reactive/schedulers/async";
// import { isScheduler, Observable, SchedulerAction, SchedulerLike } from "@awc/reactive";
/**
 * Creates an Observable that emits a sequence of numbers after specified delays.
 * 
 * `timer` is a creation operator for time-based operations. It can be used to:
 * - Emit a single value after a delay (like setTimeout)
 * - Emit values at regular intervals (like setInterval)
 * - Create delayed emissions with scheduler control
 * 
 * @overload
 * @returns {Observable<0>} Observable that emits 0 immediately
 * 
 * @overload
 * @param {number|Date} dueTime - Initial delay in milliseconds or Date when to emit
 * @param {SchedulerLike} [scheduler] - Scheduler to use for timing
 * @returns {Observable<0>} Observable that emits 0 after the delay
 * 
 * @overload
 * @template T - Type of period (number or undefined)
 * @param {number|Date} dueTime - Initial delay in milliseconds or Date when to emit
 * @param {T} periodOrScheduler - Period for subsequent emissions or scheduler
 * @param {SchedulerLike} [scheduler] - Scheduler to use for timing
 * @returns {Observable<number>} Observable that emits incrementing numbers at intervals
 * 
 * @example
* // Emit 0 after 1 second
* timer(1000).subscribe(() => console.log('1 second passed'));
* 
* @example
* // Emit 0 immediately (no arguments)
* timer().subscribe(value => console.log(value)); // Output: 0
* 
* @example
* // Emit sequence: 0, 1, 2, 3... every 500ms after 1 second delay
* timer(1000, 500).subscribe(value => {
*   console.log(`Tick ${value}`);
* });
* 
* @example
* // Emit at a specific Date
* const futureDate = new Date(Date.now() + 5000);
* timer(futureDate).subscribe(() => console.log('It\'s time!'));
* 
* @example
* // Use with custom scheduler (e.g., for testing)
* const testScheduler = new TestScheduler();
* timer(1000, 200, testScheduler).subscribe(value => {
*   console.log(`Test tick: ${value}`);
* });
* 
* @example
* // Periodic timer that can be unsubscribed
* const subscription = timer(0, 1000).subscribe(value => {
*   console.log(`Second ${value + 1}`);
*   if (value >= 4) {
*     subscription.unsubscribe(); // Stop after 5 seconds
*   }
* });
* 
* @example
* // Combine with other operators
* timer(0, 1000).pipe(
*   take(5),
*   map(i => i * 10)
* ).subscribe(value => console.log(value));
* // Output: 0, 10, 20, 30, 40
* 
* @note If a Date is passed as dueTime, period is ignored
* @note If period is 0 or negative, the timer will complete immediately after initial delay
* @note Default scheduler is asyncScheduler (setTimeout/clearTimeout based)
*/
export function timer(): Observable<0>;
export function timer(dueTime: number | Date, scheduler?: SchedulerLike): Observable<0>;
export function timer(
   dueTime: number | Date,
   periodOrScheduler?: number | SchedulerLike,
   scheduler?: SchedulerLike
): Observable<number>;

export function timer(
   dueTime?: number | Date,
   periodOrScheduler?: number | SchedulerLike,
   scheduler?: SchedulerLike
): Observable<number> {
   // Handle overload: timer()
   if (dueTime === undefined && periodOrScheduler === undefined) {
       return new Observable<0>(subscriber => {
           subscriber.next(0);
           subscriber.complete();
       });
   }

   // Extract scheduler and period from arguments
   let period: number | undefined;
   let actualScheduler: SchedulerLike | undefined;

   // Determine which overload we're using
   if (isScheduler(periodOrScheduler)) {
       // timer(dueTime, scheduler)
       actualScheduler = periodOrScheduler;
       period = undefined;
   } else {
       // timer(dueTime, period, scheduler?) or timer(dueTime, period)
       period = periodOrScheduler as number | undefined;
       actualScheduler = scheduler;
   }

   // Use default scheduler if none provided
   if (!actualScheduler) {
       actualScheduler = asyncScheduler;
   }

   // Handle Date dueTime (period is ignored for Date)
   if (dueTime instanceof Date) {
       return timerFromDate(dueTime, actualScheduler);
   }

   // Handle numeric dueTime
   const numericDueTime = dueTime as number;
   
   // If no period or period is 0, emit once and complete
   if (period === undefined || period <= 0) {
       return timerOnce(numericDueTime, actualScheduler);
   }

   // Periodic timer
   return timerPeriodic(numericDueTime, period, actualScheduler);
}

/**
* Creates a timer that emits once at a specific Date.
* 
* @param {Date} dueTime - The Date when to emit
* @param {SchedulerLike} scheduler - Scheduler to use
* @returns {Observable<0>} Observable that emits 0 at the specified Date
* 
* @private
*/
function timerFromDate(dueTime: Date, scheduler: SchedulerLike): Observable<0> {
   return new Observable<0>(subscriber => {
       const delay = Math.max(0, dueTime.getTime() - scheduler.now());
       
       const subscription = scheduler.schedule(
           () => {
               subscriber.next(0);
               subscriber.complete();
           },
           delay
       );
       
    //    subscriber.add(subscription);
       return subscription;
   });
}

/**
* Creates a timer that emits once after a delay.
* 
* @param {number} dueTime - Delay in milliseconds
* @param {SchedulerLike} scheduler - Scheduler to use
* @returns {Observable<0>} Observable that emits 0 after delay
* 
* @private
*/
function timerOnce(dueTime: number, scheduler: SchedulerLike): Observable<0> {
   return new Observable<0>(subscriber => {
       const subscription = scheduler.schedule(
           () => {
               subscriber.next(0);
               subscriber.complete();
           },
           dueTime
       );
       
    //    subscriber.add(subscription);
       return subscription;
   });
}

/**
* Creates a timer that emits incrementing numbers at intervals.
* 
* @param {number} dueTime - Initial delay in milliseconds
* @param {number} period - Interval between emissions
* @param {SchedulerLike} scheduler - Scheduler to use
* @returns {Observable<number>} Observable that emits incrementing numbers
* 
* @private
*/
function timerPeriodic(dueTime: number, period: number, scheduler: SchedulerLike): Observable<number> {
   return new Observable<number>(subscriber => {
    //    let count = 0;
       let state: TimerState = { count: 0, period, subscriber: null as any };
       
       // Schedule first emission
       const subscription = scheduler.schedule<TimerState>(
           timerDispatch,
           dueTime,
           state
       );
       
    //    subscriber.add(subscription);
       return subscription;
   });
}

/**
* State object for periodic timer.
* 
* @interface TimerState
* @property {number} count - Current emission count
* @property {number} period - Interval between emissions
* @property {Subscriber<number>} subscriber - The subscriber to emit to
*/
interface TimerState {
   count: number;
   period: number;
//    subscriber: Subscriber<number>;
   subscriber: Observer<number>;
}

/**
* Dispatch function for periodic timer emissions.
* 
* @param {TimerState} state - Timer state
* @returns {void}
* 
* @private
*/
function timerDispatch(this: SchedulerAction<TimerState>, state?: TimerState): void {
   if (!state || state.subscriber.closed) {
       return;
   }
   
   const { subscriber, period } = state;
   const currentCount = state.count;
   
   // Emit current count
   subscriber.next(currentCount);
   
   // If subscriber is still interested, schedule next emission
   if (!subscriber.closed) {
       state.count = currentCount + 1;
       this.schedule(state, period);
   } else {
       // Complete if subscriber closed
       subscriber.complete();
   }
}