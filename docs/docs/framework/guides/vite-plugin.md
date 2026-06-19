# Vite Plugin for Fluixi

Official Vite plugin with full SSR, HMR, and JSX support.

## Installation

```bash
npm install @fluixi/core vite -D
```

## Basic Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import fluixi from '@fluixi/core/vite-plugin';

export default defineConfig({
  plugins: [fluixi()]
});
```

## Configuration

### JSX/TSX Support

```typescript
import fluixi from '@fluixi/core/vite-plugin';

export default defineConfig({
  plugins: [
    fluixi({
      jsx: true,
      jsxImportSource: '@fluixi/core'
    })
  ]
});
```

### SSR Support

```typescript
import { fluixiSSR } from '@fluixi/core/vite-plugin';

export default defineConfig({
  plugins: [
    fluixiSSR({
      ssrEntry: 'src/entry-server.ts'
    })
  ]
});
```

### Development Mode

```typescript
import { fluixiDev } from '@fluixi/core/vite-plugin';

export default defineConfig({
  plugins: [
    fluixiDev({
      hmr: true,
      sourcemap: true
    })
  ]
});
```

### Production Build

```typescript
import { fluixiProd } from '@fluixi/core/vite-plugin';

export default defineConfig({
  plugins: [
    fluixiProd({
      sourcemap: false
    })
  ]
});
```

## Options

```typescript
interface FluixiPluginOptions {
  jsx?: boolean;
  jsxImportSource?: string;
  ssr?: boolean;
  ssrEntry?: string;
  hmr?: boolean;
  sourcemap?: boolean;
  experimental?: {
    islands?: boolean;
    signalOptimization?: boolean;
  };
  transform?: {
    exclude?: RegExp[];
    include?: RegExp[];
  };
}
```

## Features

- ✅ Automatic JSX/TSX transformation
- ✅ Hot Module Replacement (HMR)
- ✅ Server-Side Rendering (SSR)
- ✅ Code splitting optimization
- ✅ Signal optimization
- ✅ Islands architecture (experimental)
- ✅ TypeScript support
- ✅ Source maps

## Examples

### Full-Stack App

```typescript
import { defineConfig } from 'vite';
import fluixi from '@fluixi/core/vite-plugin';

export default defineConfig({
  plugins: [
    fluixi({
      jsx: true,
      ssr: true,
      hmr: true,
      experimental: {
        signalOptimization: true
      }
    })
  ]
});
```

### SPA Only

```typescript
import { defineConfig } from 'vite';
import fluixi from '@fluixi/core/vite-plugin';

export default defineConfig({
  plugins: [
    fluixi({
      jsx: true,
      ssr: false
    })
  ]
});
```
