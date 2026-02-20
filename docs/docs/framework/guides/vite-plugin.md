# Vite Plugin for KettleJS

Official Vite plugin with full SSR, HMR, and JSX support.

## Installation

```bash
npm install @awc/kettlejs vite -D
```

## Basic Usage

```typescript
// vite.config.ts
import { defineConfig } from 'vite';
import kettle from '@awc/kettlejs/vite-plugin';

export default defineConfig({
  plugins: [kettle()]
});
```

## Configuration

### JSX/TSX Support

```typescript
import kettle from '@awc/kettlejs/vite-plugin';

export default defineConfig({
  plugins: [
    kettle({
      jsx: true,
      jsxImportSource: '@awc/kettlejs'
    })
  ]
});
```

### SSR Support

```typescript
import { kettleSSR } from '@awc/kettlejs/vite-plugin';

export default defineConfig({
  plugins: [
    kettleSSR({
      ssrEntry: 'src/entry-server.ts'
    })
  ]
});
```

### Development Mode

```typescript
import { kettleDev } from '@awc/kettlejs/vite-plugin';

export default defineConfig({
  plugins: [
    kettleDev({
      hmr: true,
      sourcemap: true
    })
  ]
});
```

### Production Build

```typescript
import { kettleProd } from '@awc/kettlejs/vite-plugin';

export default defineConfig({
  plugins: [
    kettleProd({
      sourcemap: false
    })
  ]
});
```

## Options

```typescript
interface KettlePluginOptions {
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
import kettle from '@awc/kettlejs/vite-plugin';

export default defineConfig({
  plugins: [
    kettle({
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
import kettle from '@awc/kettlejs/vite-plugin';

export default defineConfig({
  plugins: [
    kettle({
      jsx: true,
      ssr: false
    })
  ]
});
```
