import {
  Computation,
  ComputationFn,
  Context,
  EffectFn,
  EffectOptions,
  EqualityFn,
  MemoOptions,
  ResourceFetcher,
  ResourceOptions,
  ResourceReturn,
  ResourceSource,
  RootOwner,
  SignalTuple,
  SignalOptions,
  SuspenseContextType,
  SuspenseListContextType,
  type createStore as signalStore,
} from '@fluixi/reactive';

export type Accessor<T> = () => T;

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


export interface Resource{
    <T>(fetcher: ResourceFetcher<T, true>, options?: ResourceOptions<T, true>): ResourceReturn<T>;
    <T, S>(source: ResourceSource<S>, fetcher: ResourceFetcher<T, S>, options?: ResourceOptions<T, S>): ResourceReturn<T>;
}

export interface ComponentProps {
  children?: any;
  [key: string]: any;
}

/**
 * Component function type
 */
export type CreateComponent<P = ComponentProps, Return = any> = (props?: P) => Return;


export type IComponent<T, U = any, W = any> = ()=>CreateComponent<U, W> & {
  $COMPONENT: boolean
}

export type CreateComponentReturnType<T, V> = T extends (props?: infer U) => any ? IComponent<T, V extends never ? U : V, ReturnType<T>> : T extends object ? IComponent<T, V> : never


export type DevComponent = <P, V>(Comp: (props?: P) => V, props?: P)=> V
export interface SignalSystem {
  /**
   * Create an effect that runs when dependencies change
   */
  createEffect?: (
    fn: EffectFn,
    value?: any,
    options?: EffectOptions
  ) => () => void;

  createRenderEffect?: <T>(
    fn: (prev: T) => T,
    value?: T | undefined,
    options?: EffectOptions | undefined
  ) => () => void;

  /**
   * Batch multiple updates together
   */
  batch?: (fn: () => void) => void;

  /**
   * Create a memo (computed value)
   */
  createMemo?: <T>(
    fn: ComputationFn<T>,
    value?: T,
    options?: MemoOptions<T>
  ) => Accessor<T>;

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
  createSignal?: <T>(
    _value: T,
    options?: SignalOptions<T> | undefined
  ) => SignalTuple<T>;
  isReactive?: (fn: any) => boolean;
  createComponent: <T extends (props?: any) => any, U = any>(
    Comp: T,
    props?: U
  ) => CreateComponentReturnType<T, U>;
  resolveChildren: (value: any) => any;
  devComponent: DevComponent;
  createResource: Resource;
  createContext: <T>(defaultValue?: T | undefined) => {
    Provider: (props: {
      value: T;
      children: any;
      debug?: boolean | undefined;
    }) => any;
    defaultValue: T | undefined;
    id: symbol;
  };
  useContext: <T>(context: { id: symbol; defaultValue?: T }) => T | undefined;
  resumeEffects: (effects: Computation[]) => void;
  createComputed: <T>(
    fn: ComputationFn<T>,
    value?: T,
    options?: EffectOptions
  ) => void;
  createDeferred: <T>(
    source: Accessor<T>,
    options?: {
      timeoutMs?: number;
      equals?: false | EqualityFn<T>;
    }
  ) => Accessor<T>;
  getSuspenseContext: () => Context<SuspenseContextType | undefined>;
  getSuspenseListContext: () => Context<SuspenseListContextType | undefined>;
  isSignal: <T extends unknown>(value: any) => value is Accessor<T>;
  createStore?: typeof signalStore;
  setOwner: (owner: RootOwner | null) => void;
  getSharedConfig: ()=> {
    context: RootOwner | null;
    owner: RootOwner | null;
    routeData: Map<any, any>;
    matchedRoute: Map<any, any>;
  };
  // createStore: <T>(initialState: T, options?: StoreOptions<T>)=> [Immutable<T>, Store<T>["set"]]
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
