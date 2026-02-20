---
sidebar_position: 1
title: Core API Reference
---

# Core API Reference

Complete API reference for KettleJS core functionality.

## Signals

### createSignal

Creates a reactive signal that holds a value and notifies dependents when changed.

```typescript
function createSignal<T>(
  initialValue: T,
  options?: SignalOptions<T>
): [getter: Accessor<T>, setter: Setter<T>]
```

#### Parameters

- **initialValue**: `T` - Initial value for the signal
- **options**: `SignalOptions<T>` (optional) - Configuration options
  - `equals`: `(prev: T, next: T) => boolean` - Custom equality function (default: `===`)
  - `name`: `string` - Debug name for the signal

#### Returns

A tuple containing:
- **getter**: `() => T` - Function to read the current value
- **setter**: `(value: T | ((prev: T) => T)) => void` - Function to update the value

#### Examples

```typescript
// Basic signal
const [count, setCount] = createSignal(0);

// With type annotation
const [user, setUser] = createSignal<User | null>(null);

// With custom equality
const [data, setData] = createSignal(
  { items: [] },
  { equals: (a, b) => deepEqual(a, b) }
);

// Reading
console.log(count()); // 0

// Setting directly
setCount(5);

// Setting with function
setCount(prev => prev + 1);
```

## Effects

### createEffect

Creates a reactive effect that runs when dependencies change.

```typescript
function createEffect<T>(
  fn: (prev?: T) => T | void,
  value?: T
): () => void
```

#### Parameters

- **fn**: `(prev?: T) => T | void` - Effect function to execute
  - Can return a cleanup function or value for next iteration
- **value**: `T` (optional) - Initial value for effect

#### Returns

- **dispose**: `() => void` - Function to stop the effect

#### Examples

```typescript
// Basic effect
createEffect(() => {
  console.log('Count:', count());
});

// Effect with cleanup
createEffect(() => {
  const timer = setInterval(() => console.log('tick'), 1000);
  return () => clearInterval(timer);
});

// Effect with previous value
createEffect((prev = 0) => {
  const current = count();
  console.log('Changed from', prev, 'to', current);
  return current;
});
```

### onCleanup

Registers a cleanup function within an effect or component.

```typescript
function onCleanup(fn: () => void): void
```

#### Parameters

- **fn**: `() => void` - Cleanup function to execute

#### Examples

```typescript
createEffect(() => {
  const ws = new WebSocket('ws://example.com');
  
  onCleanup(() => {
    ws.close();
  });
});
```

## Memos

### createMemo

Creates a computed value that only recalculates when dependencies change.

```typescript
function createMemo<T>(
  fn: (prev?: T) => T,
  value?: T,
  options?: MemoOptions<T>
): Accessor<T>
```

#### Parameters

- **fn**: `(prev?: T) => T` - Function to compute the value
- **value**: `T` (optional) - Initial value
- **options**: `MemoOptions<T>` (optional)
  - `equals`: `(prev: T, next: T) => boolean` - Custom equality

#### Returns

- **Accessor**: `() => T` - Function to read the computed value

#### Examples

```typescript
const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');

// Computed full name
const fullName = createMemo(() => {
  return `${firstName()} ${lastName()}`;
});

console.log(fullName()); // "John Doe"
setFirstName('Jane');
console.log(fullName()); // "Jane Doe"
```

## Components

### createComponent

Creates a component with lifecycle management.

```typescript
function createComponent<P extends ComponentProps>(
  fn: Component<P>
): Component<P>
```

#### Parameters

- **fn**: `Component<P>` - Component function

#### Returns

- Enhanced component with lifecycle management

#### Examples

```typescript
const Counter = createComponent(() => {
  const [count, setCount] = createSignal(0);
  
  onMount(() => {
    console.log('Mounted');
  });
  
  return html`
    <button @click=${() => setCount(count() + 1)}>
      ${count()}
    </button>
  `;
});
```

### render

Renders a component into a DOM container.

```typescript
function render(
  component: Component | (() => TemplateResult),
  container: HTMLElement
): () => void
```

#### Parameters

- **component**: `Component | (() => TemplateResult)` - Component to render
- **container**: `HTMLElement` - DOM element to render into

#### Returns

- **dispose**: `() => void` - Function to unmount the component

#### Examples

```typescript
const App = () => html`<h1>Hello World</h1>`;

const dispose = render(App, document.getElementById('app')!);

// Later, unmount
dispose();
```

## Lifecycle

### onMount

Registers a function to run when component mounts.

```typescript
function onMount(fn: () => void | (() => void)): void
```

#### Parameters

- **fn**: `() => void | (() => void)` - Mount callback
  - Can optionally return a cleanup function

#### Examples

```typescript
const MyComponent = () => {
  onMount(() => {
    console.log('Component mounted');
    
    // Optional cleanup
    return () => {
      console.log('Component unmounting');
    };
  });
  
  return html`<div>Content</div>`;
};
```

### onUnmount

Registers a function to run when component unmounts.

```typescript
function onUnmount(fn: () => void): void
```

#### Parameters

- **fn**: `() => void` - Unmount callback

#### Examples

```typescript
const MyComponent = () => {
  onUnmount(() => {
    console.log('Cleaning up');
  });
  
  return html`<div>Content</div>`;
};
```

## Batching

### batch

Batches multiple signal updates into a single reactive update.

```typescript
function batch<T>(fn: () => T): T
```

#### Parameters

- **fn**: `() => T` - Function containing updates to batch

#### Returns

- Result of the function

#### Examples

```typescript
const [firstName, setFirstName] = createSignal('John');
const [lastName, setLastName] = createSignal('Doe');

createEffect(() => {
  console.log('Name:', firstName(), lastName());
});

// Without batch - effect runs twice
setFirstName('Jane');
setLastName('Smith');

// With batch - effect runs once
batch(() => {
  setFirstName('Jane');
  setLastName('Smith');
});
```

## Tracking

### untrack

Reads signals without creating dependencies.

```typescript
function untrack<T>(fn: () => T): T
```

#### Parameters

- **fn**: `() => T` - Function to execute without tracking

#### Returns

- Result of the function

#### Examples

```typescript
const [trigger, setTrigger] = createSignal(0);
const [data, setData] = createSignal('value');

createEffect(() => {
  trigger(); // Tracked
  
  // Read data without tracking
  const snapshot = untrack(() => data());
  console.log('Snapshot:', snapshot);
});

setData('new value'); // Doesn't trigger effect
setTrigger(1); // Triggers effect
```

## Ownership

### getOwner

Gets the current reactive owner.

```typescript
function getOwner(): RootOwner | null
```

#### Returns

- **RootOwner | null** - Current owner or null

#### Examples

```typescript
const owner = getOwner();
console.log('Current owner:', owner);
```

### runWithOwner

Runs a function with a specific reactive owner.

```typescript
function runWithOwner<T>(
  owner: RootOwner | null,
  fn: () => T
): T
```

#### Parameters

- **owner**: `RootOwner | null` - Owner to use
- **fn**: `() => T` - Function to execute

#### Returns

- Result of the function

#### Examples

```typescript
const owner = getOwner();

// Later, run in the same reactive scope
setTimeout(() => {
  runWithOwner(owner, () => {
    createEffect(() => {
      console.log('Effect in original scope');
    });
  });
}, 1000);
```

### createRoot

Creates a new reactive root scope.

```typescript
function createRoot<T>(
  fn: (dispose: () => void) => T
): () => void
```

#### Parameters

- **fn**: `(dispose: () => void) => T` - Function to execute in root scope

#### Returns

- **dispose**: `() => void` - Function to dispose the root

#### Examples

```typescript
const dispose = createRoot((disposeRoot) => {
  const [signal, setSignal] = createSignal(0);
  
  createEffect(() => {
    console.log('Signal:', signal());
  });
  
  return disposeRoot;
});

// Clean up everything
dispose();
```

## Props Utilities

### mergeProps

Merges multiple props objects, with later objects overriding earlier ones.

```typescript
function mergeProps<P extends ComponentProps>(
  ...sources: Array<Partial<P>>
): P
```

#### Parameters

- **sources**: `Array<Partial<P>>` - Props objects to merge

#### Returns

- **P** - Merged props object

#### Examples

```typescript
const defaults = { color: 'blue', size: 'medium' };
const props = { size: 'large' };

const merged = mergeProps(defaults, props);
// { color: 'blue', size: 'large' }
```

### splitProps

Splits props into multiple groups based on keys.

```typescript
function splitProps<P extends ComponentProps>(
  props: P,
  ...keys: string[][]
): any[]
```

#### Parameters

- **props**: `P` - Props object to split
- **keys**: `string[][]` - Arrays of keys for each group

#### Returns

- **any[]** - Array of prop groups

#### Examples

```typescript
const props = { color: 'blue', size: 'large', onClick: () => {} };

const [colors, sizes, handlers] = splitProps(
  props,
  ['color'],
  ['size'],
  ['onClick']
);
// colors = { color: 'blue' }
// sizes = { size: 'large' }
// handlers = { onClick: () => {} }
```

## Types

### Component

Function component type.

```typescript
type Component<P extends ComponentProps = ComponentProps> = (
  props: P
) => TemplateResult | null
```

### ComponentProps

Base interface for component props.

```typescript
interface ComponentProps {
  children?: ComponentChild | ComponentChild[];
  [key: string]: any;
}
```

### ComponentChild

Valid types for component children.

```typescript
type ComponentChild =
  | TemplateResult
  | string
  | number
  | boolean
  | null
  | undefined
  | ComponentChild[]
```

### Accessor

Signal getter function type.

```typescript
type Accessor<T> = () => T
```

### Setter

Signal setter function type.

```typescript
type Setter<T> = (value: T | ((prev: T) => T)) => void
```

### SignalOptions

Options for signal creation.

```typescript
interface SignalOptions<T> {
  equals?: (prev: T, next: T) => boolean;
  name?: string;
}
```

### RootOwner

Reactive ownership context.

```typescript
interface RootOwner {
  owner: Owner | null;
  context: any;
  owned: Owner[] | null;
  cleanups: (() => void)[] | null;
}
```

## Constants

### VERSION

Framework version string.

```typescript
const VERSION: string = '0.0.1'
```

### FRAMEWORK_NAME

Framework name.

```typescript
const FRAMEWORK_NAME: string = 'KettleJS'
```

## See Also

- [Control Flow API](./control-flow.md)
- [Context API](./context.md)
- [Router API](./router.md)
- [Resources API](./resources.md)
- [Directives API](./directives.md)