import {
  Observable,
  type Observer,
  type Subscriber,
} from './observable/index.js';

export class Subject<T> extends Observable<T> implements Observer<T> {
  private observers: Observer<T>[] = [];
  // override closed = false;
  isStopped = false;
  hasError = false;
  thrownError: any = null;

  constructor() {
    super((subscriber: Subscriber<T>) => {
      if (this.closed) {
        throw new Error('Subject has been closed');
      } else if (this.hasError) {
        subscriber.error(this.thrownError);
      } else if (this.isStopped) {
        subscriber.complete();
      } else {
        this.observers.push(subscriber);
        return () => {
          const index = this.observers.indexOf(subscriber);
          if (index !== -1) {
            this.observers.splice(index, 1);
          }
        };
      }
      return undefined;
    });
  }

  next(value: T): void {
    if (this.isStopped) return;
    const { observers } = this;
    const len = observers.length;
    const copy = observers.slice();
    for (let i = 0; i < len; i++) {
      copy[i].next?.(value);
    }
  }

  error(err: any): void {
    if (this.isStopped) return;
    this.hasError = true;
    this.thrownError = err;
    this.isStopped = true;
    const { observers } = this;
    this.observers = [];
    const len = observers.length;
    const copy = observers.slice();
    for (let i = 0; i < len; i++) {
      copy[i].error?.(err);
    }
  }

  complete(): void {
    if (this.isStopped) return;
    this.isStopped = true;
    const { observers } = this;
    this.observers = [];
    const len = observers.length;
    const copy = observers.slice();
    for (let i = 0; i < len; i++) {
      copy[i].complete?.();
    }
  }

  override unsubscribe(): void {
    this.isStopped = true;
    //   this.closed = true;
    this.observers = [];
  }

  asObservable(): Observable<T> {
    const observable = new Observable<T>((subscriber) => {
      return this.subscribe(subscriber);
    });
    return observable;
  }
}

// export class BehaviorSubject<T> extends Subject<T> {
//     constructor(private _value: T) {
//       super();
//     }

//     get value(): T {
//       return this.getValue();
//     }

//     getValue(): T {
//       if (this.hasError) {
//         throw this.thrownError;
//       } else if (this.closed) {
//         throw new Error('BehaviorSubject has been closed');
//       } else {
//         return this._value;
//       }
//     }

//     override next(value: T): void {
//       super.next((this._value = value));
//     }

//     subscribe(subscriber: Partial<Observer<T>>): Subscription {
//       const subscription = super.subscribe(subscriber);
//       if (subscription && !subscription.closed) {
//         subscriber.next?.(this._value);
//       }
//       return subscription;
//     }
//   }

//   export class ReplaySubject<T> extends Subject<T> {
//     private _buffer: T[] = [];
//     private _bufferSize: number;
//     private _windowTime: number;

//     constructor(
//       bufferSize: number = Infinity,
//       windowTime: number = Infinity
//     ) {
//       super();
//       this._bufferSize = bufferSize < 1 ? 1 : bufferSize;
//       this._windowTime = windowTime < 1 ? 1 : windowTime;
//     }

//     next(value: T): void {
//       const now = Date.now();
//       this._buffer.push(value);
//       this._trimBuffer(now);
//       super.next(value);
//     }

//     private _trimBuffer(now: number): void {
//       if (this._bufferSize < this._buffer.length) {
//         this._buffer.splice(0, this._buffer.length - this._bufferSize);
//       }
//       if (this._windowTime < Infinity) {
//         // Simple implementation
//         while (this._buffer.length > this._bufferSize) {
//           this._buffer.shift();
//         }
//       }
//     }

//     subscribe(subscriber: Partial<Observer<T>>): Subscription {
//       const subscription = super.subscribe(subscriber);
//       if (subscription && !subscription.closed) {
//         const copy = this._buffer.slice();
//         for (let i = 0; i < copy.length; i++) {
//           subscriber.next?.(copy[i]);
//         }
//       }
//       return subscription;
//     }
//   }

//   export class AsyncSubject<T> extends Subject<T> {
//     private lastValue: T | null = null;
//     private hasNext = false;

//     next(value: T): void {
//       if (!this.isStopped) {
//         this.lastValue = value;
//         this.hasNext = true;
//       }
//     }

//     error(error: any): void {
//       if (!this.isStopped) {
//         super.error(error);
//       }
//     }

//     complete(): void {
//       if (!this.isStopped) {
//         this.isStopped = true;
//         if (this.hasNext) {
//           super.next(this.lastValue!);
//         }
//         super.complete();
//       }
//     }
//   }
