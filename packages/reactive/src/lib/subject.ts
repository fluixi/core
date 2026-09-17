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

// BehaviorSubject, ReplaySubject and AsyncSubject are not implemented. Nothing in
// the framework needs them, and a Subject plus a signal covers what they are usually
// reached for. They were sketched here once; git has that if it is ever wanted.
