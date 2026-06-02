import { Observable, Subscription } from '@fluixi/reactive/observable';
import { Subject } from '../subject.js';

// Core types
// export type SignalMode = 'granular' | 'stream' | 'adaptive';
export type EqualityFn<T> = (a: T, b: T) => boolean;

export enum SignalMode {
  /** SolidJS style - granular updates */
  GRANULAR = 'granular',
  /** RxJS style - observable streams */
  STREAM = 'stream',
  /** Adaptive - switches based on usage */
  ADAPTIVE = 'adaptive',
}

/**
 * Universal Signal Interface
 */
export interface UniversalSignal<T> {
  // === GRANULAR API (SolidJS Style) ===

  /** Get current value (tracked) */
  get value(): T;

  /** Set value (reactive update) */
  set value(newValue: T);

  /** Peek at value without tracking */
  peek(): T;

  /** Update based on previous value */
  update(updater: (prev: T) => T): void;

  // === STREAM API (RxJS Style) ===

  /** Get as Observable */
  $: Observable<T>;

  /** Subscribe to changes */
  subscribe(
    next?: (value: T) => void,
    error?: (error: any) => void,
    complete?: () => void
  ): Subscription;

  /** Pipe operators */
  pipe: (...operators: any[]) => Observable<T>;

  // === DUAL-MODE API ===

  /** Get current mode */
  readonly mode: SignalMode;

  /** Switch operating mode */
  setMode(mode: SignalMode): void;

  // === METADATA ===

  /** Signal version (increments on change) */
  readonly version: number;

  /** Signal name */
  readonly name?: string;

  // === UTILITY ===

  /** Dispose signal */
  dispose(): void;

  /** String representation */
  toString(): string;

  // === INTERNAL ===
  readonly _meta: SignalMeta<T>;
}

/**
 * Signal metadata for performance optimization
 */
//   interface SignalMeta<T> {
//     value: T;
//     version: number;
//     // Granular tracking
//     observers: Set<Computation<any>>;
//     dependencies: Set<Computation<any>>;
//     // Stream tracking
//     subject?: Subject<T>;
//     observable?: Observable<T>;
//     // Performance
//     hitCount: number;
//     lastAccessed: number;
//     mode: SignalMode;
//     // Debugging
//     name?: string;
//     creationStack?: string;
//   }

/**
 * Computation types
 */
export enum ComputationType {
  EFFECT = 'effect',
  MEMO = 'memo',
  DERIVED = 'derived',
}

/**
 * Signal value wrapper with metadata
 */
export interface SignalValue<T> {
  value: T;
  version: number;
  observers: Set<Computation<any>>;
  dependencies: Set<Computation<any>>;
  isPending: boolean;
}

/**
 * Computation node for dependency tracking
 */

export interface SignalMeta<T> {
  value: T;
  version: number;
  observers: Set<Computation<any>>;
  dependencies: Set<Computation<any>>;
  subject?: Subject<T>;
  observable?: Observable<T>;
  hitCount: number;
  lastAccessed: number;
  mode: SignalMode;
  name?: string;
  id?: string;
  creationStack?: string;
  // Performance tracking
  performanceProfile: {
    reads: number;
    writes: number;
    averageDepth: number;
    executionTime: number;
  };
}

export interface UniversalSignalOptions<T> {
  name?: string;
  mode?: SignalMode;
  equals?: EqualityFn<T>;
  scheduler?: any;
  adaptive?: boolean;
  cache?: {
    enabled: boolean;
    ttl?: number;
    maxSize?: number;
  };
  performanceHint?: 'readHeavy' | 'writeHeavy' | 'balanced';
  debug?: boolean;
}

export interface Computation<T = any> {
  id: number;
  type: ComputationType;
  fn: () => T;
  value: T;
  dependencies: Set<SignalValue<any> | SignalMeta<any>>;
  observers: Set<Computation<any>>;
  version: number;
  isStale: boolean;
  isRunning: boolean;
  isDisposed: boolean;
  // scheduler?: Scheduler;
  scheduler?: any;
  onCleanup?: () => void;
  equals?: (a: T, b: T) => boolean;
}

export interface HybridComputation<T = any> extends Computation<T> {
  id: number;
  // Core
  fn: () => T;
  value: T;
  // Granular mode
  // dependencies: Set<SignalMeta<any>>;
  observers: Set<HybridComputation<any>>;
  version: number;
  isStale: boolean;
  isRunning: boolean;
  // Stream mode
  observable?: Observable<T>;
  subscription?: Subscription;
  // Adaptive
  mode: SignalMode;
  // Performance
  executionTime: number;
  dependencyCount: number;
  // Cleanup
  onCleanup?: () => void;
  onDispose?: () => void;
}
