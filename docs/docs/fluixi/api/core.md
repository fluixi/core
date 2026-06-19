---
sidebar_position: 1
---

# Core API

Complete API reference for Fluixi core module (`@fluixi/core/core`).

## Component Functions

### render()

Renders a component or template into a DOM container.

```typescript
function render(
  component: Component | TemplateResult,
  container: HTMLElement
): () => void
```

**Parameters:**
- `component` - Component function or lit-html template to render
- `container` - DOM element to render into

**Returns:** Cleanup function to stop rendering and dispose reactivity

**Example:**
```typescript
import { render, html } from '@fluixi/core';
import { App } from './App';

const root = document.getElementById('app');
const cleanup = render(App, root);

// Later, cleanup when done
cleanup();
```

### Component

Type definition for functional components.

```typescript
type Component<Props = {}> = (props?: Props) => TemplateResult
```

**Example:**
```typescript
import { html, Component } from '@fluixi/core';

interface MyComponentProps {
  title: string;
  count: number;
}

export const MyComponent: Component<MyComponentProps> = (props) => {
  return html`
    <div>
      <h1>${props?.title}</h1>
      <p>Count: ${props?.count}</p>
    </div>
  `;
};
```

## FluixiElement

Base class for creating reactive web components with automatic signal integration.

```typescript
abstract class FluixiElement extends LitElement {
  abstract view(): TemplateResult;
  protected runInScope(fn: () => void): void;
  render(): TemplateResult;
}
```

### Properties

Inherits all properties from `LitElement`.

### Methods

#### view()

Abstract method that must be implemented by subclasses. Returns the component's template.

```typescript
abstract view(): TemplateResult
```

**Returns:** lit-html template

**Example:**
```typescript
import { html } from 'lit';
import { customElement } from 'lit/decorators.js';
import { FluixiElement } from '@fluixi/core';
import { createSignal } from '@fluixi/reactive/signal';

@customElement('my-counter')
export class MyCounter extends FluixiElement {
  private count = createSignal(0);

  view() {
    return html`
      <button @click=${() => this.count[1](c => c + 1)}>
        Count: ${this.count[0]()}
      </button>
    `;
  }
}
```

#### runInScope()

Runs a function within the component's reactive scope, ensuring proper cleanup of effects and computations.

```typescript
protected runInScope(fn: () => void): void
```

**Parameters:**
- `fn` - Function to run in reactive scope

**Example:**
```typescript
@customElement('my-component')
export class MyComponent extends FluixiElement {
  private data = createSignal(null);

  connectedCallback() {
    super.connectedCallback();

    this.runInScope(() => {
      createEffect(() => {
        console.log('Data changed:', this.data[0]());
      });
    });
  }

  view() {
    return html`<div>${this.data[0]()}</div>`;
  }
}
```

#### render()

Final implementation of `render()` that calls `view()`. Do not override.

```typescript
render(): TemplateResult
```

### Lifecycle

All standard `LitElement` lifecycle methods are available:

- `connectedCallback()` - Component connected to DOM
- `disconnectedCallback()` - Component removed from DOM
- `attributeChangedCallback()` - Attribute changed
- `firstUpdated()` - First render complete
- `updated()` - Render complete

**Example:**
```typescript
@customElement('my-component')
export class MyComponent extends FluixiElement {
  connectedCallback() {
    super.connectedCallback();
    console.log('Component connected');
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    console.log('Component disconnected');
  }

  view() {
    return html`<div>Hello</div>`;
  }
}
```

### getCurrentElement()

Gets the currently rendering element.

```typescript
function getCurrentElement(): HTMLElement | null
```

**Returns:** Current element or null if not in render context

**Example:**
```typescript
import { getCurrentElement } from '@fluixi/core/core';

function useCustomHook() {
  const element = getCurrentElement();
  if (element) {
    console.log('Current element:', element.tagName);
  }
}
```

## Reactive Controllers

### SignalController

Controller that integrates signals with Lit elements.

```typescript
class SignalController {
  constructor(host: ReactiveControllerHost);
  readonly owner: RootOwner;
}
```

**Example:**
```typescript
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SignalController } from '@fluixi/core/core';
import { createSignal } from '@fluixi/reactive/signal';

@customElement('my-component')
export class MyComponent extends LitElement {
  private signals = new SignalController(this);
  private count = createSignal(0);

  render() {
    return html`
      <button @click=${() => this.count[1](c => c + 1)}>
        Count: ${this.count[0]()}
      </button>
    `;
  }
}
```

### WithSignals

Mixin that adds signal support to any LitElement.

```typescript
function WithSignals<T extends Constructor<LitElement>>(
  Base: T
): T & Constructor<WithSignalsInterface>
```

**Example:**
```typescript
import { html, LitElement } from 'lit';
import { customElement } from 'lit/decorators.js';
import { WithSignals } from '@fluixi/core/core';
import { createSignal } from '@fluixi/reactive/signal';

@customElement('my-component')
export class MyComponent extends WithSignals(LitElement) {
  private count = createSignal(0);

  render() {
    return html`
      <button @click=${() => this.count[1](c => c + 1)}>
        Count: ${this.count[0]()}
      </button>
    `;
  }
}
```

## Hydration

Functions for client-side hydration of server-rendered content.

### isHydrating()

Check if currently in hydration mode.

```typescript
function isHydrating(): boolean
```

**Returns:** `true` if hydrating, `false` otherwise

**Example:**
```typescript
import { isHydrating } from '@fluixi/core/core';

if (isHydrating()) {
  console.log('Hydrating server-rendered content');
}
```

### setHydrating()

Set hydration mode (internal use).

```typescript
function setHydrating(hydrating: boolean): void
```

### getHydrationData()

Retrieve hydration data by key.

```typescript
function getHydrationData<T = any>(key: string): T | undefined
```

**Parameters:**
- `key` - Data key

**Returns:** Hydration data or undefined

**Example:**
```typescript
import { getHydrationData } from '@fluixi/core/core';

const initialState = getHydrationData('app-state');
```

### setHydrationData()

Store hydration data (server-side).

```typescript
function setHydrationData<T = any>(key: string, data: T): void
```

**Parameters:**
- `key` - Data key
- `data` - Data to store

**Example:**
```typescript
import { setHydrationData } from '@fluixi/core/core';

setHydrationData('app-state', { count: 5 });
```

## Server-Side Rendering

Functions for rendering on the server.

### renderToString()

Render a template to an HTML string.

```typescript
async function renderToString(template: unknown): Promise<string>
```

**Parameters:**
- `template` - lit-html template to render

**Returns:** Promise resolving to HTML string

**Example:**
```typescript
import { html } from 'lit';
import { renderToString } from '@fluixi/core/core';

const app = html`<my-app></my-app>`;
const htmlString = await renderToString(app);
```

### renderToStream()

Render a template to a Node.js readable stream (server-only).

```typescript
function renderToStream(template: unknown): Readable
```

**Parameters:**
- `template` - lit-html template to render

**Returns:** Node.js Readable stream

**Throws:** Error if called in browser

**Example:**
```typescript
import { renderToStream } from '@fluixi/core/core';

const stream = renderToStream(template);
stream.pipe(response);
```

### renderToPage()

Render a complete HTML page with template.

```typescript
async function renderToPage(
  template: unknown,
  options?: PageOptions
): Promise<string>
```

**Parameters:**
- `template` - lit-html template to render
- `options` - Page configuration
  - `title?: string` - Page title
  - `lang?: string` - Language code (default: 'en')
  - `stylesheets?: string[]` - CSS file URLs
  - `scripts?: string[]` - JavaScript file URLs
  - `head?: string` - Additional head content
  - `bodyAttributes?: string` - Body element attributes

**Returns:** Complete HTML document string

**Example:**
```typescript
import { renderToPage } from '@fluixi/core/core';

const page = await renderToPage(app, {
  title: 'My App',
  stylesheets: ['/styles.css'],
  scripts: ['/app.js'],
  lang: 'en'
});
```

### createHtmlDocument()

Create a complete HTML document from content string.

```typescript
function createHtmlDocument(
  content: string,
  options?: PageOptions
): string
```

**Parameters:**
- `content` - HTML content
- `options` - Same as `renderToPage`

**Returns:** Complete HTML document

**Example:**
```typescript
import { createHtmlDocument } from '@fluixi/core/core';

const html = '<div>Content</div>';
const document = createHtmlDocument(html, {
  title: 'My Page',
  stylesheets: ['/style.css']
});
```

### SSR Context

Functions for managing SSR context.

#### setSSRContext()

Set the current SSR context.

```typescript
function setSSRContext(context: SSRContext | null): void
```

**Parameters:**
- `context` - SSR context object or null

**Example:**
```typescript
import { setSSRContext } from '@fluixi/core/core';

setSSRContext({
  url: request.url,
  headers: request.headers
});
```

#### getSSRContext()

Get the current SSR context.

```typescript
function getSSRContext(): SSRContext | null
```

**Returns:** Current SSR context or null

**Example:**
```typescript
import { getSSRContext } from '@fluixi/core/core';

const context = getSSRContext();
if (context) {
  console.log('Request URL:', context.url);
}
```

#### withSSRContext()

Run a function with specific SSR context.

```typescript
function withSSRContext<T>(
  context: SSRContext,
  fn: () => T
): T
```

**Parameters:**
- `context` - SSR context to use
- `fn` - Function to run

**Returns:** Function result

**Example:**
```typescript
import { withSSRContext, renderToString } from '@fluixi/core/core';

const html = withSSRContext(
  { url: '/about', headers: {} },
  () => renderToString(app)
);
```

### SSRContext Type

```typescript
interface SSRContext {
  url: string;
  headers: Record<string, string>;
  [key: string]: any;
}
```

### isSSR()

Check if running on server.

```typescript
function isSSR(): boolean
```

**Returns:** `true` on server, `false` in browser

**Example:**
```typescript
import { isSSR } from '@fluixi/core/core';

if (isSSR()) {
  console.log('Running on server');
}
```

### onServer()

Conditionally execute code on server.

```typescript
function onServer<T>(fn: () => T, fallback: T): T
```

**Parameters:**
- `fn` - Function to run on server
- `fallback` - Value to use in browser

**Returns:** Function result on server, fallback in browser

**Example:**
```typescript
import { onServer } from '@fluixi/core/core';

const data = onServer(
  () => loadFromDatabase(),
  null
);
```

### onClient()

Conditionally execute code in browser.

```typescript
function onClient<T>(fn: () => T, fallback: T): T
```

**Parameters:**
- `fn` - Function to run in browser
- `fallback` - Value to use on server

**Returns:** Function result in browser, fallback on server

**Example:**
```typescript
import { onClient } from '@fluixi/core/core';

const width = onClient(
  () => window.innerWidth,
  1024
);
```

## Types

### ComponentProps

Base interface for component props.

```typescript
interface ComponentProps {
  [key: string]: any;
}
```

### TemplateResult

lit-html template result type (re-exported from lit).

```typescript
import type { TemplateResult } from 'lit';
```

## Related APIs

- [Signals API](./signals.md) - Reactive primitives from @fluixi/reactive
- [Control Flow API](./control-flow.md) - Show, For, Dynamic components
- [Router API](./router.md) - Routing functionality
- [Resources API](./resources.md) - Async data management

---

**See Also:**
- [Core Concepts](../core-concepts.md)
- [Component Patterns](../guides/component-patterns.md)
- [SSR Guide](../guides/ssr.md)