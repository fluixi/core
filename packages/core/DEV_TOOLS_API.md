# Fluixi Development Tools API Reference

Complete API documentation for the Fluixi development server and production builder.

## Table of Contents

- [Dev Server API](#dev-server-api)
  - [createDevServer](#createdevserver)
  - [startDevServer](#startdevserver)
  - [stopDevServer](#stopdevserver)
  - [createSSRMiddleware](#createssrmiddleware)
  - [createPreviewServer](#createpreviewserver)
  - [fluixiJSPlugin](#fluixiplugin)
- [Builder API](#builder-api)
  - [build](#build)
  - [buildClient](#buildclient)
  - [buildFullStack](#buildfullstack)
  - [watch](#watch)
  - [analyzeBundle](#analyzebundle)
  - [optimizeAssets](#optimizeassets)
  - [fluixiJSBuildPlugin](#fluixibuildplugin)

---

## Dev Server API

### createDevServer

Creates and starts a Vite-based development server for Fluixi applications.

```typescript
function createDevServer(config?: DevServerConfig): Promise<ViteDevServer>
```

#### Parameters

**config** (`DevServerConfig`, optional) - Server configuration options

```typescript
interface DevServerConfig {
  root?: string;           // Project root directory (default: process.cwd())
  port?: number;           // Server port (default: 3000)
  host?: string | boolean; // Host to bind (default: 'localhost')
  https?: boolean;         // Enable HTTPS (default: false)
  open?: boolean;          // Open browser on start (default: false)
  base?: string;           // Base public path (default: '/')
  vite?: UserConfig;       // Custom Vite configuration
  ssr?: boolean;           // Enable SSR mode (default: false)
  template?: string;       // Custom HTML template path
}
```

#### Returns

`Promise<ViteDevServer>` - The running Vite dev server instance

#### Examples

**Basic Usage:**
```typescript
import { createDevServer } from 'fluixi/dev-server';

const server = await createDevServer({
  port: 3000,
  open: true
});

console.log(`Server running at ${server.resolvedUrls?.local[0]}`);
```

**Advanced Configuration:**
```typescript
import { createDevServer } from 'fluixi/dev-server';

const server = await createDevServer({
  root: './src',
  port: 8080,
  host: '0.0.0.0',
  https: true,
  base: '/app/',
  open: true,
  ssr: true,
  vite: {
    plugins: [customPlugin()],
    optimizeDeps: {
      include: ['custom-package']
    }
  }
});
```

**With Custom Template:**
```typescript
const server = await createDevServer({
  port: 3000,
  template: './templates/dev.html'
});
```

---

### startDevServer

Simplified API to quickly start a dev server with minimal configuration.

```typescript
function startDevServer(port?: number, open?: boolean): Promise<ViteDevServer>
```

#### Parameters

- **port** (`number`, optional) - Port to run on (default: 3000)
- **open** (`boolean`, optional) - Open browser automatically (default: false)

#### Returns

`Promise<ViteDevServer>` - The running server instance

#### Example

```typescript
import { startDevServer } from 'fluixi/dev-server';

// Start on port 3000 and open browser
await startDevServer(3000, true);

// Start with defaults
await startDevServer();
```

---

### stopDevServer

Stops a running development server.

```typescript
function stopDevServer(server: ViteDevServer): Promise<void>
```

#### Parameters

- **server** (`ViteDevServer`) - Server instance to stop

#### Example

```typescript
import { createDevServer, stopDevServer } from 'fluixi/dev-server';

const server = await createDevServer();

// ... later
await stopDevServer(server);
```

---

### createSSRMiddleware

Creates Express-like middleware for SSR development.

```typescript
function createSSRMiddleware(config?: DevServerConfig): Promise<any>
```

#### Parameters

**config** (`DevServerConfig`, optional) - Server configuration

#### Returns

`Promise<any>` - Express-compatible middleware

#### Example

```typescript
import express from 'express';
import { createSSRMiddleware } from 'fluixi/dev-server';

const app = express();

const ssrMiddleware = await createSSRMiddleware({
  root: './src',
  vite: {
    // Custom Vite config
  }
});

app.use(ssrMiddleware);

app.listen(3000);
```

---

### createPreviewServer

Creates a preview server to test production builds locally.

```typescript
function createPreviewServer(config?: PreviewServerConfig): Promise<any>
```

#### Parameters

**config** (`PreviewServerConfig`, optional) - Preview server configuration

```typescript
interface PreviewServerConfig {
  root?: string;    // Root directory
  port?: number;    // Port (default: 4173)
  host?: string | boolean; // Host to bind
  open?: boolean;   // Open browser (default: false)
  outDir?: string;  // Build output directory (default: 'dist')
}
```

#### Example

```typescript
import { createPreviewServer } from 'fluixi/dev-server';

const server = await createPreviewServer({
  port: 4173,
  open: true,
  outDir: 'dist'
});
```

---

### fluixiJSPlugin

Vite plugin that optimizes Fluixi applications during development.

```typescript
function fluixiJSPlugin(): Plugin
```

#### Returns

`Plugin` - Vite plugin instance

#### Features

- Optimizes dependencies (lit, @fluixi/reactive, fluixi)
- Configures build target to ES2020
- Sets up code splitting for production
- Adds custom HMR handling
- Injects Fluixi metadata

#### Example

```typescript
import { defineConfig } from 'vite';
import { fluixiJSPlugin } from 'fluixi/dev-server';

export default defineConfig({
  plugins: [
    fluixiJSPlugin(),
    // other plugins
  ]
});
```

---

## Builder API

### build

Builds a Fluixi application for production with full customization.

```typescript
function build(config?: BuildConfig): Promise<BuildResult>
```

#### Parameters

**config** (`BuildConfig`, optional) - Build configuration options

```typescript
interface BuildConfig {
  root?: string;              // Project root (default: process.cwd())
  outDir?: string;            // Output directory (default: 'dist')
  mode?: 'development' | 'production'; // Build mode (default: 'production')
  sourcemap?: boolean | 'inline' | 'hidden'; // Generate sourcemaps (default: false)
  minify?: boolean | 'terser' | 'esbuild';  // Minify output (default: true)
  target?: string | string[]; // Target browsers (default: 'es2020')
  base?: string;              // Base public path (default: '/')
  ssr?: boolean;              // Build for SSR (default: false)
  ssrEntry?: string;          // SSR entry point (default: 'src/entry-server.ts')
  entry?: string;             // Client entry (default: 'src/main.ts')
  splitting?: boolean;        // Enable code splitting (default: true)
  rollupOptions?: BuildOptions['rollupOptions']; // Custom Rollup options
  vite?: UserConfig;          // Additional Vite config
  analyze?: boolean;          // Enable bundle analysis (default: false)
  clean?: boolean;            // Clean output dir (default: true)
  emitDeclarations?: boolean; // Emit TypeScript declarations (default: false)
}
```

#### Returns

```typescript
interface BuildResult {
  outDir: string;    // Output directory path
  files: string[];   // List of generated files
  duration: number;  // Build duration in milliseconds
  size: number;      // Total size in bytes
}
```

#### Examples

**Basic Build:**
```typescript
import { build } from 'fluixi/builder';

const result = await build({
  outDir: 'dist',
  minify: true,
  sourcemap: true
});

console.log(`Built ${result.files.length} files in ${result.duration}ms`);
console.log(`Total size: ${(result.size / 1024).toFixed(2)} KB`);
```

**Production Build with Analysis:**
```typescript
const result = await build({
  outDir: 'dist',
  mode: 'production',
  minify: 'terser',
  sourcemap: 'hidden',
  splitting: true,
  analyze: true,
  clean: true
});
```

**Custom Target and Base:**
```typescript
const result = await build({
  outDir: 'build',
  target: ['es2020', 'chrome90', 'firefox88'],
  base: '/my-app/',
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['lit', '@fluixi/reactive']
      }
    }
  }
});
```

---

### buildClient

Builds only the client-side bundle (no SSR).

```typescript
function buildClient(config?: BuildConfig): Promise<BuildResult>
```

#### Parameters

Same as `build()` but `ssr` is automatically set to `false`.

#### Example

```typescript
import { buildClient } from 'fluixi/builder';

await buildClient({
  outDir: 'dist/client',
  minify: true,
  splitting: true
});
```

---

### buildFullStack

Builds both client and SSR bundles in one command.

```typescript
function buildFullStack(config?: BuildConfig): Promise<BuildResult>
```

#### Parameters

Same as `build()` but `ssr` is automatically set to `true`.

#### Example

```typescript
import { buildFullStack } from 'fluixi/builder';

await buildFullStack({
  outDir: 'dist',
  ssrEntry: 'src/entry-server.ts',
  entry: 'src/entry-client.ts',
  minify: true
});

// Outputs:
// dist/           <- Client bundle
// dist/ssr/       <- SSR bundle
```

---

### watch

Watches files and rebuilds on changes (development mode).

```typescript
function watch(config?: BuildConfig): Promise<void>
```

#### Parameters

**config** (`BuildConfig`, optional) - Build configuration

#### Example

```typescript
import { watch } from 'fluixi/builder';

// Watch and rebuild
await watch({
  outDir: 'dist',
  mode: 'development',
  sourcemap: true
});

// Never resolves - keeps watching
```

---

### analyzeBundle

Analyzes the bundle and outputs detailed statistics.

```typescript
function analyzeBundle(config?: BuildConfig): Promise<any>
```

#### Parameters

**config** (`BuildConfig`, optional) - Build configuration

#### Returns

```typescript
Promise<{
  files: number;       // Number of files
  totalSize: number;   // Total size in bytes
  averageSize: number; // Average file size
  duration: number;    // Build duration
}>
```

#### Example

```typescript
import { analyzeBundle } from 'fluixi/builder';

const stats = await analyzeBundle({
  outDir: 'dist'
});

console.log('Bundle Analysis:');
console.log(`- Files: ${stats.files}`);
console.log(`- Total Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
console.log(`- Average Size: ${(stats.averageSize / 1024).toFixed(2)} KB`);
console.log(`- Build Time: ${stats.duration}ms`);
```

---

### optimizeAssets

Optimizes assets in the build output (HTML, CSS, images).

```typescript
function optimizeAssets(outDir: string): Promise<void>
```

#### Parameters

- **outDir** (`string`) - Output directory to optimize

#### Example

```typescript
import { build, optimizeAssets } from 'fluixi/builder';

// Build first
await build({ outDir: 'dist' });

// Then optimize
await optimizeAssets('dist');
```

---

### fluixiJSBuildPlugin

Vite plugin for production builds with Fluixi optimizations.

```typescript
function fluixiJSBuildPlugin(config?: BuildConfig): Plugin
```

#### Parameters

**config** (`BuildConfig`, optional) - Build configuration

#### Returns

`Plugin` - Vite plugin instance

#### Example

```typescript
import { defineConfig } from 'vite';
import { fluixiJSBuildPlugin } from 'fluixi/builder';

export default defineConfig({
  plugins: [
    fluixiJSBuildPlugin({
      analyze: true,
      target: 'es2020'
    })
  ]
});
```

---

## Complete Workflow Examples

### Development Workflow

```typescript
// dev.js
import { startDevServer } from 'fluixi/dev-server';

await startDevServer(3000, true);
```

### Production Build Workflow

```typescript
// build.js
import { build, analyzeBundle, optimizeAssets } from 'fluixi/builder';

console.log('Building application...');

// Build
const result = await build({
  outDir: 'dist',
  minify: true,
  sourcemap: 'hidden',
  splitting: true,
  clean: true
});

console.log(`✓ Built ${result.files.length} files`);

// Analyze
const stats = await analyzeBundle({ outDir: 'dist' });
console.log(`✓ Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);

// Optimize
await optimizeAssets('dist');
console.log('✓ Assets optimized');
```

### Full-Stack SSR Build

```typescript
// build-ssr.js
import { buildFullStack } from 'fluixi/builder';

await buildFullStack({
  outDir: 'dist',
  ssrEntry: 'src/entry-server.ts',
  entry: 'src/entry-client.ts',
  minify: true,
  sourcemap: true,
  emitDeclarations: true
});

console.log('✓ Client and SSR bundles built');
```

### Preview Production Build

```typescript
// preview.js
import { build } from 'fluixi/builder';
import { createPreviewServer } from 'fluixi/dev-server';

// Build first
await build({ outDir: 'dist' });

// Then preview
await createPreviewServer({
  port: 4173,
  open: true,
  outDir: 'dist'
});
```

### Package.json Scripts

```json
{
  "scripts": {
    "dev": "node dev.js",
    "build": "node build.js",
    "build:ssr": "node build-ssr.js",
    "preview": "node preview.js",
    "analyze": "node -e \"require('fluixi/builder').analyzeBundle({ outDir: 'dist' })\""
  }
}
```

---

## Environment Variables

Both dev-server and builder respect the following environment variables:

- `NODE_ENV` - Environment mode ('development' or 'production')
- `PORT` - Override default port
- `HOST` - Override default host
- `HTTPS` - Enable HTTPS if set to 'true'

Example:
```bash
PORT=8080 HOST=0.0.0.0 npm run dev
```

---

## TypeScript Support

All APIs are fully typed. Import types as needed:

```typescript
import type {
  DevServerConfig,
  PreviewServerConfig,
  BuildConfig,
  BuildResult,
} from 'fluixi';
```

---

## Error Handling

All async functions can throw errors. Always wrap in try-catch:

```typescript
import { build } from 'fluixi/builder';

try {
  const result = await build({ outDir: 'dist' });
  console.log('Build successful!');
} catch (error) {
  console.error('Build failed:', error);
  process.exit(1);
}
```

---

## Performance Tips

1. **Enable code splitting** for better caching
2. **Use sourcemaps** only in development
3. **Minify with esbuild** for faster builds (terser is more aggressive but slower)
4. **Clean output directory** to avoid stale files
5. **Analyze bundles** to identify large dependencies
6. **Use preview server** to test production builds locally

---

## Integration with CI/CD

### GitHub Actions

```yaml
name: Build and Deploy

on:
  push:
    branches: [main]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm ci
      - run: node build.js
      - uses: actions/upload-artifact@v2
        with:
          name: dist
          path: dist/
```

### Docker

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN node build.js

FROM nginx:alpine
COPY --from=0 /app/dist /usr/share/nginx/html
```

---

## Troubleshooting

### Dev Server Won't Start

Check if port is already in use:
```bash
lsof -i :3000
```

### Build Fails with Memory Error

Increase Node.js memory:
```bash
NODE_OPTIONS=--max-old-space-size=4096 node build.js
```

### SSR Build Missing Dependencies

Ensure @lit-labs/ssr is installed:
```bash
npm install @lit-labs/ssr @lit-labs/ssr-client
```

---

## Additional Resources

- [Main Documentation](./README.md)
- [Quick Reference](./QUICK_REFERENCE.md)
- [Restructure Summary](./RESTRUCTURE_SUMMARY.md)
- [Vite Documentation](https://vitejs.dev)

---

**Last Updated:** 2024
**Version:** 0.0.1
**License:** MIT