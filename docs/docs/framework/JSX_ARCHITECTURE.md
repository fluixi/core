---
title: JSX Architecture
---

# Fluixi JSX/TSX Architecture

Visual overview of how JSX support is integrated into Fluixi.

## Architecture Diagram

```
┌────────────────────────────────────────────────────────────────┐
│                        Your Application                         │
├────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │   JSX/TSX    │  │   lit-html   │  │   Hybrid     │        │
│  │ Components   │  │  Templates   │  │  Components  │        │
│  │              │  │              │  │              │        │
│  │  <Counter /> │  │ html`...`    │  │ Mixed syntax │        │
│  └──────┬───────┘  └───────┬──────┘  └──────┬───────┘        │
│         │                  │                 │                 │
│         └──────────────────┴─────────────────┘                 │
│                            │                                    │
└────────────────────────────┼────────────────────────────────────┘
                             │
              ┌──────────────┴──────────────┐
              │                             │
    ┌─────────▼─────────┐       ┌──────────▼─────────┐
    │   JSX Runtime     │       │    lit-html Core   │
    │                   │       │                    │
    │ • jsx()           │       │ • html``           │
    │ • jsxs()          │       │ • svg``            │
    │ • Fragment        │       │ • render()         │
    │ • createElement() │       │ • TemplateResult   │
    └─────────┬─────────┘       └──────────┬─────────┘
              │                            │
              │    ┌───────────────────┐   │
              └────► Template          ◄───┘
                   │ Transformation    │
                   │                   │
                   │ JSX → lit-html    │
                   └─────────┬─────────┘
                             │
              ┌──────────────▼──────────────┐
              │                             │
    ┌─────────▼─────────┐       ┌──────────▼─────────┐
    │  @fluixi/reactive    │       │   Fluixi Core    │
    │                   │       │                    │
    │ • Signals         │       │ • Components       │
    │ • Effects         │       │ • FluixiElement    │
    │ • Memos           │       │ • Controllers      │
    │ • Batch           │       │ • Lifecycle        │
    └─────────┬─────────┘       └──────────┬─────────┘
              │                            │
              └──────────────┬─────────────┘
                             │
              ┌──────────────▼──────────────┐
              │                             │
    ┌─────────▼─────────┐       ┌──────────▼─────────┐
    │   Control Flow    │       │      Router        │
    │                   │       │                    │
    │ • Show            │       │ • Routes           │
    │ • For             │       │ • Navigation       │
    │ • Switch          │       │ • Params           │
    │ • Portal          │       │ • Guards           │
    └───────────────────┘       └────────────────────┘
                             │
              ┌──────────────▼──────────────┐
              │          Browser DOM        │
              └─────────────────────────────┘
```

## Component Flow

### 1. JSX Component Definition

```tsx
// Your Component (JSX)
const Counter = () => {
  const [count, setCount] = createSignal(0);
  return (
    <div>
      <p>Count: {count()}</p>
      <button onClick={() => setCount(count() + 1)}>+</button>
    </div>
  );
};
```

### 2. TypeScript Compilation

```typescript
// TypeScript transforms JSX using our runtime
import { jsx, jsxs } from '@fluixi/core/jsx-runtime';

const Counter = () => {
  const [count, setCount] = createSignal(0);
  return jsxs('div', {
    children: [
      jsx('p', { children: ['Count: ', count()] }),
      jsx('button', { 
        onClick: () => setCount(count() + 1),
        children: '+' 
      })
    ]
  });
};
```

### 3. JSX Runtime Processing

```typescript
// jsx() function transforms to lit-html
function jsx(type, props) {
  // Convert JSX props to lit-html format
  // onClick → @click
  // className → class
  // style object → styleMap
  
  return html`<${type} ...>${children}</${type}>`;
}
```

### 4. lit-html Rendering

```typescript
// lit-html creates efficient templates
const template = html`
  <div>
    <p>Count: ${count()}</p>
    <button @click=${handler}>+</button>
  </div>
`;
```

### 5. Reactive Updates

```typescript
// Signals trigger fine-grained updates
setCount(1);  // Only updates the specific DOM node
              // No component re-render needed!
```

## Data Flow

```
User Input
    │
    ▼
Event Handler
    │
    ▼
Signal Setter (setCount)
    │
    ▼
@fluixi/reactive (notifies dependencies)
    │
    ▼
Effect/Memo (if any)
    │
    ▼
lit-html (updates specific DOM nodes)
    │
    ▼
Browser DOM (surgical update)
```

## Type System Flow

```
Component Definition (.tsx)
    │
    ▼
TypeScript Compiler
    │
    ├─→ Checks against jsx.d.ts types
    │   (HTMLAttributes, SVGAttributes, etc.)
    │
    ├─→ Infers event handler types
    │   (onClick: (e: MouseEvent) => void)
    │
    ├─→ Validates props
    │   (ButtonProps interface)
    │
    └─→ Generates type-safe code
        │
        ▼
    JavaScript Output
```

## Build Process

```
Source Files (.tsx)
    │
    ▼
TypeScript Compiler
    │   (jsx: "react-jsx")
    │   (jsxImportSource: "@fluixi/core")
    │
    ▼
Transformed JS (with jsx() calls)
    │
    ▼
Bundler (Vite/Webpack)
    │   • Tree-shaking
    │   • Minification
    │   • Code-splitting
    │
    ▼
Optimized Bundle
    │
    ▼
Browser
```

## Integration Points

### 1. TypeScript Integration
```
tsconfig.json
    │
    ├─→ "jsx": "react-jsx"
    │       │
    │       └─→ Use new JSX transform
    │
    └─→ "jsxImportSource": "@fluixi/core"
            │
            └─→ Import from our jsx-runtime
```

### 2. Package Exports
```
package.json
    │
    ├─→ "./jsx-runtime"
    │       │
    │       └─→ ./dist/jsx-runtime/index.js
    │
    └─→ "./jsx-dev-runtime"
            │
            └─→ ./dist/jsx-runtime/index.js (dev mode)
```

### 3. Runtime Loading
```
Application Start
    │
    ├─→ Load JSX Runtime
    │   (imported automatically by TypeScript)
    │
    ├─→ Load lit-html
    │   (peer dependency)
    │
    ├─→ Load @fluixi/reactive
    │   (signals, effects, etc.)
    │
    └─→ Initialize Fluixi
        (components, router, etc.)
```

## Performance Path

```
JSX Element Creation
    │
    ▼
jsx() Function Call
    │   • Parse props (fast)
    │   • Convert to lit-html (fast)
    │
    ▼
lit-html Template
    │   • Cached templates
    │   • Static parts identified
    │
    ▼
DOM Update
    │   • Only dynamic parts updated
    │   • Direct DOM manipulation
    │
    ▼
Result: Fast! ⚡
```

## Comparison: React vs Fluixi JSX

### React Flow
```
Component Render
    │
    ▼
Virtual DOM Diff
    │
    ▼
Reconciliation
    │
    ▼
DOM Update
```

### Fluixi JSX Flow
```
Signal Change
    │
    ▼
Direct DOM Update
(No diff, no reconciliation!)
```

## Memory Model

```
Component Instance
    │
    ├─→ Signals (reactive state)
    │   └─→ Value + Subscribers
    │
    ├─→ Effects (side effects)
    │   └─→ Cleanup functions
    │
    ├─→ Templates (cached)
    │   └─→ Static + Dynamic parts
    │
    └─→ DOM References
        └─→ Actual DOM nodes
```

## See Also

- [JSX/TSX Guide](./guides/jsx-tsx-guide.md)
- [Core Architecture](./index.md#architecture)
- [Performance Guide](./guides/performance.md)

---

**Note**: This architecture ensures JSX has the same performance characteristics as lit-html while providing familiar React-like syntax.
