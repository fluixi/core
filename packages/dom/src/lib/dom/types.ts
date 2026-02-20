type Accessor<T> = () => T;

export interface ComponentObserver {
  dependencies: Set<Accessor<any>>;
  cleanupFunctions: (() => void)[];
  track: <T>(getter: () => T) => T;
  addCleanup: (fn: () => void) => void;
}

export interface Effect {
  (): void;
  dispose?: () => void;
}

export interface SignalSystem {
  /**
   * Create an effect that runs when dependencies change
   */
  createEffect?: (fn: () => void) => Effect;

  /**
   * Batch multiple updates together
   */
  batch?: (fn: () => void) => void;

  /**
   * Create a memo (computed value)
   */
  createMemo?: <T>(fn: () => T) => () => T;

  /**
   * Track a value without subscribing
   */
  untrack?: <T>(fn: () => T) => T;

  /**
   * Get the current reactive owner/context
   */
  getOwner?: () => any;

  /**
   * Run with a specific owner/context
   */
  runWithOwner?: <T>(owner: any, fn: () => T) => T;

  /**
   * Create a root computation context
   */
  createRoot?: <T>(fn: (dispose: () => void) => T) => T;

  /**
   * Add a cleanup function
   */
  onCleanup?: (fn: () => void) => void;
  createSignal?: <T>(initialValue: T) => [() => T, (value: T) => void];
  isReactive?: (fn: any) => boolean;
  createComponent: (fn: any, props: any) => any;
}

export interface StoreSystem {
  /**
   * Check if a value is a store
   */
  isStore: (value: any) => boolean;

  /**
   * Get the raw value from a store
   */
  unwrap?: <T>(value: T) => T;

  /**
   * Check if a value is a store proxy
   */
  isStoreProxy?: (value: any) => boolean;

  /**
   * Subscribe to store changes
   */
  subscribe?: (store: any, callback: (value: any) => void) => () => void;
}
