---
id: externals
title: External Dependencies
sidebar_label: External Dependencies
---

# External Dependencies Guide

Mix Builder provides a powerful and flexible system for managing external dependencies in your builds. This guide covers everything from basic usage to advanced patterns.

## 🎯 Overview

External dependencies are packages that should **not** be bundled into your output. Common reasons include:

- **Peer Dependencies**: React, Vue, Angular that users provide
- **Runtime Dependencies**: Node.js built-ins, native modules
- **Large Libraries**: Reduce bundle size by marking as external
- **Shared Code**: Code shared across multiple bundles

## 📋 Table of Contents

- [Basic Usage](#basic-usage)
- [External Patterns](#external-patterns)
- [Preset Externals](#preset-externals)
- [Advanced Configuration](#advanced-configuration)
- [Builder-Specific Behavior](#builder-specific-behavior)
- [Examples](#examples)
- [Best Practices](#best-practices)

## 🚀 Basic Usage

### Simple String Array

The simplest way to define externals:

```json
{
  "externals": ["react", "lodash", "axios"]
}
```

This marks the exact package names as external.

### Including Sub-Paths

By default, Mix Builder includes sub-paths automatically:

```json
{
  "externals": ["react"]
}
```

This automatically externals:
- `react`
- `react/jsx-runtime`
- `react/jsx-dev-runtime`
- Any other `react/*` imports

### CLI Arguments

```bash
npx mix-builder --externals=react,lodash,axios
```

## 🎨 External Patterns

Mix Builder supports three types of external patterns:

### 1. String Patterns

Exact package name matching:

```json
{
  "externals": [
    "react",
    "react-dom",
    "lodash"
  ]
}
```

**Matches:**
- `react` ✅
- `react/jsx-runtime` ✅ (auto sub-path)
- `react-dom` ✅

**Doesn't Match:**
- `react-router` ❌
- `preact` ❌

### 2. Regular Expression Patterns

For flexible pattern matching:

```json
{
  "externals": [
    "^react($|/)",        // String in JSON
    "^@company/",         // Company-scoped packages
    "\\.node$"            // Native modules
  ]
}
```

Or in JavaScript config:

```js
{
  externals: [
    /^react($|\/)/,
    /^@company\//,
    /\.node$/
  ]
}
```

**RegEx Examples:**

```js
// Match React and all sub-paths
/^react($|\/)/

// Match all scoped packages
/^@[a-z-]+\//

// Match Lit packages
/^lit($|\/)/

// Match native modules
/\.node$/

// Match node: protocol
/^node:/
```

### 3. Configuration Objects

For advanced control:

```json
{
  "externals": [
    {
      "pattern": "react",
      "includeSub": true,
      "description": "React library"
    },
    {
      "pattern": "^@internal/",
      "includeSub": false
    }
  ]
}
```

**Configuration Object Properties:**

- `pattern`: String, RegExp, or function
- `includeSub`: Include sub-paths (default: true)
- `condition`: Function for conditional externalization
- `description`: Documentation string

### 4. Function Patterns (Rollup Only)

For maximum flexibility:

```js
{
  externals: [
    (id, importer) => {
      // External if importing from node_modules
      return id.includes('node_modules');
    },
    (id) => {
      // External if development dependency
      return devDependencies.includes(id);
    }
  ]
}
```

## 🎁 Preset Externals

Mix Builder includes pre-configured presets for common scenarios:

### React Preset

```bash
npx mix-builder --reactExternal
```

Or in config:

```json
{
  "reactExternal": true
}
```

**Includes:**
- `react`
- `react-dom`
- `react/jsx-runtime`
- `react/jsx-dev-runtime`
- `react-dom/client`
- `react-dom/server`
- All `react/*` and `react-dom/*` paths

### Lit Preset

```bash
npx mix-builder --litExternal
```

```json
{
  "litExternal": true
}
```

**Includes:**
- `lit`
- `lit-html`
- `lit-element`
- `@lit/reactive-element`
- All `lit/*`, `lit-html/*`, `lit-element/*`, `@lit/*` paths

### Library Preset

```bash
npx mix-builder --libExternal
```

```json
{
  "libExternal": true
}
```

**Includes:**
- All `@awc/*` packages
- All `@adafri/*` packages

### Node.js Preset

```bash
npx mix-builder --nodeExternal
```

```json
{
  "nodeExternal": true
}
```

**Includes:**
- All Node.js built-in modules: `fs`, `path`, `crypto`, `http`, etc.
- All `node:*` protocol imports
- Native `.node` modules

### Package.json Dependencies

```bash
npx mix-builder --pkgExternal
```

```json
{
  "pkgExternal": true
}
```

Automatically externals all packages listed in:
- `dependencies`
- `peerDependencies`

### Combining Presets

```json
{
  "reactExternal": true,
  "litExternal": true,
  "pkgExternal": true
}
```

```bash
npx mix-builder --reactExternal --litExternal --pkgExternal
```

## ⚙️ Advanced Configuration

### Per-Entry Externals

Override externals for specific entries:

```json
{
  "externals": ["react"],
  "esbuild": {
    "entries": {
      "src/index.ts": {
        "externals": ["lodash"]
      },
      "src/standalone.ts": {
        "externals": []
      }
    }
  }
}
```

### Format-Specific Externals

Different externals for different formats:

```json
{
  "rollup": {
    "entries": {
      "src/index.ts": {
        "formats": ["es", "cjs"],
        "externals": {
          "es": ["react", "lodash"],
          "cjs": ["react"]
        }
      }
    }
  }
}
```

### Conditional Externals

Using configuration objects with conditions:

```js
{
  externals: [
    {
      pattern: 'heavy-library',
      condition: (id, importer) => {
        // Only external in production
        return process.env.NODE_ENV === 'production';
      }
    }
  ]
}
```

### Skip All Externals

Bundle everything (no externals):

```bash
npx mix-builder --skipExternal
```

```json
{
  "skipExternal": true
}
```

Or for ESBuild only:

```json
{
  "esbuild": {
    "noExternal": true
  }
}
```

### Control Sub-Path Inclusion

```json
{
  "externals": [
    {
      "pattern": "lodash",
      "includeSub": false
    }
  ]
}
```

Now only `lodash` is external, not `lodash/map`, `lodash/get`, etc.

## 🔧 Builder-Specific Behavior

### ESBuild Externals

ESBuild uses an array of strings and regex patterns:

```js
{
  external: [
    'react',
    'react-dom',
    /^@company\//
  ]
}
```

**Conversion Process:**
1. String patterns → strings and auto-generated regex for sub-paths
2. RegExp patterns → passed directly
3. Config objects → converted to appropriate format
4. Functions → NOT supported (use config objects instead)

### Rollup Externals

Rollup uses a function that returns boolean:

```js
{
  external: (id, importer, isResolved) => {
    return id === 'react' || id.startsWith('react/');
  }
}
```

**Conversion Process:**
1. All patterns converted to test functions
2. Combined into single function
3. Supports all pattern types including functions

### Format-Specific Defaults

**CommonJS (CJS):**
- `pkgExternal` defaults to `true`
- All dependencies are typically external

**ES Modules (ESM):**
- `pkgExternal` defaults to `false`
- Only explicitly marked packages are external

**UMD/IIFE:**
- Must explicitly define all externals
- Need to provide `globals` mapping

## 📚 Examples

### Example 1: React Component Library

```json
{
  "builder": "esbuild",
  "reactExternal": true,
  "esbuild": {
    "entries": ["src/components/index.ts"],
    "formats": ["esm"],
    "platform": "browser"
  }
}
```

### Example 2: Node.js Library

```json
{
  "builder": "esbuild",
  "nodeExternal": true,
  "pkgExternal": true,
  "esbuild": {
    "entries": ["src/index.ts"],
    "formats": ["cjs"],
    "platform": "node"
  }
}
```

### Example 3: Mixed Externals

```json
{
  "externals": [
    "react",
    "react-dom",
    /^lodash\//,
    {
      "pattern": "@internal/core",
      "includeSub": true
    }
  ],
  "litExternal": true,
  "pkgExternal": false
}
```

### Example 4: UMD Build with Globals

```json
{
  "builder": "rollup",
  "rollup": {
    "entries": {
      "src/index.ts": {
        "formats": ["umd"],
        "name": "MyLib",
        "externals": ["react", "react-dom"],
        "globals": {
          "react": "React",
          "react-dom": "ReactDOM"
        }
      }
    }
  }
}
```

### Example 5: Advanced Regex Patterns

```json
{
  "externals": [
    "^react($|/)",
    "^@company/",
    "^@types/",
    "\\.node$",
    "^node:"
  ]
}
```

### Example 6: Monorepo Setup

```json
{
  "externals": [
    "^@myorg/",
    {
      "pattern": "^@myorg/shared-",
      "includeSub": true,
      "description": "Internal shared packages"
    }
  ],
  "pkgExternal": true
}
```

### Example 7: Testing vs Production

```js
// build-config.js
module.exports = {
  externals: process.env.NODE_ENV === 'test' 
    ? [] 
    : ['react', 'lodash'],
  esbuild: {
    entries: ['src/index.ts'],
    formats: ['esm']
  }
};
```

## 🎯 Best Practices

### 1. Always External Peer Dependencies

```json
{
  "externals": ["react", "vue", "angular"]
}
```

Or use presets:

```json
{
  "reactExternal": true
}
```

### 2. Use Regex for Scoped Packages

```json
{
  "externals": [
    "^@company/",
    "^@myorg/"
  ]
}
```

### 3. Document Your Externals

```json
{
  "externals": [
    {
      "pattern": "@internal/analytics",
      "includeSub": true,
      "description": "Analytics library provided by host app"
    }
  ]
}
```

### 4. Be Specific for Libraries

For libraries, be explicit about externals:

```json
{
  "externals": ["react", "react-dom"],
  "pkgExternal": false
}
```

### 5. Bundle for Applications

For applications, bundle dependencies:

```json
{
  "externals": [],
  "skipExternal": true
}
```

### 6. Test Your Externals

Verify externals are working:

```bash
# Build with debug mode
npx mix-builder --debug

# Check output for external warnings
```

### 7. Use pkgExternal for Node.js

```json
{
  "platform": "node",
  "pkgExternal": true,
  "nodeExternal": true
}
```

### 8. Include Sub-Paths by Default

```json
{
  "externals": [
    {
      "pattern": "react",
      "includeSub": true
    }
  ]
}
```

### 9. Watch Out for Deep Imports

```js
// May not be externaled if using exact match
import map from 'lodash/map';

// Solution: Use regex
{
  "externals": ["^lodash($|/)"]
}
```

### 10. Consider Tree Shaking

External dependencies can't be tree-shaken. Bundle small utilities:

```json
{
  "externals": ["react"],
  "bundle": true,
  "treeShaking": true
}
```

## 🐛 Troubleshooting

### Issue: Module not found in output

**Problem:** External marked but still bundled

**Solution:**
```json
{
  "externals": [
    "my-package",
    "^my-package/"
  ]
}
```

### Issue: Large bundle size

**Problem:** Dependencies bundled unnecessarily

**Solution:**
```bash
npx mix-builder --pkgExternal --debug
```

### Issue: Runtime errors

**Problem:** External not available at runtime

**Solution:** Ensure external is available:
- Add to `peerDependencies`
- Load via CDN for UMD
- Install as dependency for consumers

### Issue: Regex not working

**Problem:** Regex pattern not matching

**Solution:** Escape special characters:
```json
{
  "externals": [
    "^@company\\/",
    "^lodash\\/"
  ]
}
```

### Issue: Function not working in ESBuild

**Problem:** Function patterns not supported

**Solution:** Use config objects or regex:
```json
{
  "externals": [
    {
      "pattern": "^special-",
      "includeSub": true
    }
  ]
}
```

## 🔍 Debugging Externals

Enable debug mode to see external resolution:

```bash
npx mix-builder --debug
```

You'll see output like:

```
🔍 External Resolution:
  react → External (preset: reactExternal)
  react/jsx-runtime → External (pattern: /^react($|\/)/)
  lodash → Bundled
  @company/utils → External (pattern: /^@company\//)
```

## 📖 API Reference

### ExternalPattern Type

```typescript
type ExternalPattern =
  | string
  | RegExp
  | ((id: string, importer?: string) => boolean);
```

### ExternalConfig Interface

```typescript
interface ExternalConfig {
  pattern: ExternalPattern;
  includeSub?: boolean;
  condition?: (id: string, importer?: string) => boolean;
  description?: string;
}
```

### ExternalResolverOptions

```typescript
interface ExternalResolverOptions {
  externals?: ExternalDefinition[];
  reactExternal?: boolean;
  litExternal?: boolean;
  libExternal?: boolean;
  nodeExternal?: boolean;
  pkgExternal?: boolean;
  dependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  skipExternal?: boolean;
  customPatterns?: ExternalDefinition[];
  format?: 'es' | 'esm' | 'cjs' | 'umd' | 'iife';
  includeSubPaths?: boolean;
}
```

## 🔗 Related Documentation

- [Configuration Reference](./configuration.md)
- [Builder Types](./builders.md)
- [CLI Reference](./cli-reference.md)
- [Best Practices](./best-practices.md)

## 📞 Need Help?

- [GitHub Issues](https://github.com/your-org/mix-builder/issues)
- [Discord Community](https://discord.gg/your-invite)
- [Stack Overflow](https://stackoverflow.com/questions/tagged/mix-builder)

---

**Next Steps:**
- [Output Formats Guide](./formats.md)
- [Entry Points Guide](./entries.md)
- [Examples & Recipes](./recipes.md)