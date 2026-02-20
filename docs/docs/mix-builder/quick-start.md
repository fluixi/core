---
id: quick-start
title: Quick Start Guide
sidebar_label: Quick Start
---

# Quick Start Guide

Get started with Mix Builder in under 5 minutes! This guide will walk you through the basics and get you building your first project.

## 📦 Installation

```bash
# Using pnpm (recommended)
pnpm add -D @your-scope/mix-builder

# Using npm
npm install -D @your-scope/mix-builder

# Using yarn
yarn add -D @your-scope/mix-builder
```

## 🎯 Three Ways to Use Mix Builder

### 1. Interactive Mode (Easiest for Beginners)

Simply run the command and answer the prompts:

```bash
npx mix-builder
```

You'll be guided through:
- Which builder to use (Rollup, ESBuild, or both)
- Output formats
- Platform target
- Minification and optimization
- External dependencies
- And more...

**Perfect for:**
- First-time users
- Exploring options
- Quick prototypes

### 2. Configuration File (Recommended for Projects)

Create a `build-config.json` in your project root:

```json
{
  "builder": "esbuild",
  "outdir": "dist",
  "esbuild": {
    "entries": ["src/index.ts"],
    "formats": ["esm", "cjs"],
    "platform": "browser",
    "minify": true,
    "reactExternal": true
  }
}
```

Then run:

```bash
npx mix-builder
```

**Perfect for:**
- Team projects
- Consistent builds
- Version control
- Documentation

### 3. CLI Arguments (Best for CI/CD)

Pass all options via command line:

```bash
npx mix-builder --builder=esbuild --formats=esm,cjs --minify --reactExternal
```

**Perfect for:**
- Automated builds
- CI/CD pipelines
- Quick overrides
- Scripts

## 🚀 Your First Build

Let's create a simple TypeScript library:

### Step 1: Project Setup

```bash
# Create project directory
mkdir my-library
cd my-library

# Initialize package.json
npm init -y

# Install Mix Builder
pnpm add -D @your-scope/mix-builder

# Create source file
mkdir src
echo 'export const greet = (name: string) => `Hello, ${name}!`;' > src/index.ts
```

### Step 2: Create Build Config

Create `build-config.json`:

```json
{
  "builder": "esbuild",
  "outdir": "dist",
  "clean": true,
  "esbuild": {
    "entries": ["src/index.ts"],
    "formats": ["esm", "cjs"],
    "platform": "neutral",
    "minify": true,
    "sourcemap": true,
    "dts": true
  }
}
```

### Step 3: Add Build Script

Update `package.json`:

```json
{
  "name": "my-library",
  "version": "1.0.0",
  "main": "./dist/index.cjs",
  "module": "./dist/index.mjs",
  "types": "./dist/index.d.ts",
  "scripts": {
    "build": "mix-builder",
    "build:dev": "mix-builder --nodeEnv=development",
    "build:watch": "mix-builder --watch"
  }
}
```

### Step 4: Build!

```bash
npm run build
```

You'll see output like:

```
🏗️  Interactive Mix Builder Configuration

✓ Loaded configuration from build-config.json

📋 Build Configuration Summary:
  Builder: esbuild
  Output Directory: dist
  Formats: esm, cjs
  Minify: Yes

🚀 Starting build process...

🔨 Starting ESBuild...
  ✓ Built index.ts [esm] in 145ms
  ✓ Built index.ts [cjs] in 98ms

📊 ESBUILD Build Statistics:
  Total Entries: 2
  Successful: 2
  Success Rate: 100%
  Duration: 243ms

✅ Build completed successfully!
```

Your `dist/` folder now contains:
- `index.mjs` - ESM build
- `index.cjs` - CommonJS build
- `index.d.ts` - TypeScript declarations
- `index.mjs.map` - Source map (ESM)
- `index.cjs.map` - Source map (CJS)

## 📚 Common Scenarios

### Scenario 1: React Component Library

**Project:** Building React components for npm

**Configuration:**

```json
{
  "builder": "esbuild",
  "outdir": "dist",
  "reactExternal": true,
  "esbuild": {
    "entries": ["src/components/index.ts"],
    "formats": ["esm"],
    "platform": "browser",
    "target": "es2020",
    "jsx": "automatic",
    "jsxImportSource": "react",
    "minify": true,
    "splitting": true,
    "dts": true
  }
}
```

**Command:**

```bash
npx mix-builder
```

### Scenario 2: Node.js CLI Tool

**Project:** Command-line tool for Node.js

**Configuration:**

```json
{
  "builder": "esbuild",
  "outdir": "bin",
  "esbuild": {
    "entries": ["src/cli.ts"],
    "formats": ["cjs"],
    "platform": "node",
    "target": "node16",
    "bundle": true,
    "minify": false,
    "pkgExternal": true,
    "nodeExternal": true
  }
}
```

**package.json:**

```json
{
  "bin": {
    "my-cli": "./bin/cli.cjs"
  },
  "scripts": {
    "build": "mix-builder",
    "prepublishOnly": "npm run build"
  }
}
```

### Scenario 3: Multi-Entry Library

**Project:** Library with multiple entry points

**Configuration:**

```json
{
  "builder": "esbuild",
  "outdir": "dist",
  "esbuild": {
    "entries": {
      "src/index.ts": {
        "formats": ["esm", "cjs"]
      },
      "src/utils/index.ts": {
        "formats": ["esm"]
      },
      "src/cli.ts": {
        "formats": ["cjs"],
        "platform": "node"
      }
    },
    "minify": true,
    "dts": true
  }
}
```

### Scenario 4: Universal Package (Browser + Node + UMD)

**Project:** Package that works everywhere

**Configuration:**

```json
{
  "builder": "both",
  "outdir": "dist",
  "clean": true,
  "rollup": {
    "entries": {
      "src/index.ts": {
        "name": "MyLib",
        "formats": ["umd"],
        "externals": ["react"],
        "globals": {
          "react": "React"
        }
      }
    }
  },
  "esbuild": {
    "entries": ["src/index.ts"],
    "formats": ["esm", "cjs"],
    "minify": true,
    "reactExternal": true
  }
}
```

### Scenario 5: Monorepo Package

**Project:** Package in a monorepo

**Configuration:**

```json
{
  "builder": "esbuild",
  "outdir": "dist",
  "externals": [
    "^@company/",
    "^@workspace/"
  ],
  "pkgExternal": true,
  "esbuild": {
    "entries": ["src/index.ts"],
    "formats": ["esm", "cjs"],
    "minify": true
  }
}
```

## 🎨 Configuration Patterns

### Development vs Production

**Option 1: Multiple Config Files**

`build-config.dev.json`:
```json
{
  "builder": "esbuild",
  "esbuild": {
    "entries": ["src/index.ts"],
    "formats": ["esm"],
    "minify": false,
    "sourcemap": true
  }
}
```

`build-config.prod.json`:
```json
{
  "builder": "esbuild",
  "esbuild": {
    "entries": ["src/index.ts"],
    "formats": ["esm", "cjs"],
    "minify": true,
    "sourcemap": false,
    "dts": true
  }
}
```

**package.json:**
```json
{
  "scripts": {
    "build": "mix-builder --buildConfigFile=build-config.prod.json",
    "build:dev": "mix-builder --buildConfigFile=build-config.dev.json"
  }
}
```

**Option 2: CLI Overrides**

```json
{
  "scripts": {
    "build": "mix-builder --minify --clean",
    "build:dev": "mix-builder --minify=false --sourcemap"
  }
}
```

### Watch Mode (Coming Soon)

```json
{
  "scripts": {
    "dev": "mix-builder --watch --nodeEnv=development"
  }
}
```

## 🔧 Essential Options Explained

### Builder Selection

```json
{
  "builder": "esbuild"  // or "rollup" or "both"
}
```

- **esbuild**: Fast, modern, great for applications
- **rollup**: Powerful, flexible, great for libraries
- **both**: Mix and match for complex needs

### Entry Points

```json
{
  "esbuild": {
    "entries": [
      "src/index.ts",           // Single file
      "src/utils/*.ts",         // Glob pattern
      "src/components/**/*.tsx" // Recursive glob
    ]
  }
}
```

Or with per-entry config:

```json
{
  "esbuild": {
    "entries": {
      "src/index.ts": {
        "formats": ["esm", "cjs"],
        "minify": true
      },
      "src/debug.ts": {
        "formats": ["esm"],
        "minify": false
      }
    }
  }
}
```

### Output Formats

- **esm/es**: Modern ES modules (recommended)
- **cjs**: CommonJS for Node.js
- **umd**: Universal module (browser globals)
- **iife**: Immediately-invoked function (browser)

### External Dependencies

```json
{
  "externals": ["react", "lodash"],
  "reactExternal": true,
  "pkgExternal": true
}
```

Or use regex patterns:

```json
{
  "externals": [
    "react",
    "^lodash/",
    "^@company/"
  ]
}
```

## 📊 Understanding Output

After building, Mix Builder shows:

```
📊 ESBUILD Build Statistics:
  Total Entries: 2
  Successful: 2
  Failed: 0
  Success Rate: 100%
  Duration: 390ms

  Output Files:
    • index.ts [esm] (45.23 KB) - 234ms
    • utils.ts [esm] (12.45 KB) - 156ms
```

This tells you:
- How many files were processed
- Success/failure rates
- Build duration
- Individual file sizes and timings

## 🐛 Troubleshooting Quick Fixes

### Problem: "No entries found"

**Solution:** Check your entry paths

```json
{
  "esbuild": {
    "entries": ["src/index.ts"]  // ✓ Correct path
  }
}
```

### Problem: "Module not found: react"

**Solution:** Mark React as external

```json
{
  "reactExternal": true
}
```

Or:

```bash
npx mix-builder --reactExternal
```

### Problem: Large bundle size

**Solution:** Enable externals and tree shaking

```json
{
  "pkgExternal": true,
  "treeShaking": true,
  "minify": true
}
```

### Problem: Build fails in CI

**Solution:** Set CI environment

```yaml
# GitHub Actions
- name: Build
  run: npx mix-builder
  env:
    CI: true
```

### Problem: Need to see what's happening

**Solution:** Enable debug mode

```bash
npx mix-builder --debug --log
```

## 🎓 Next Steps

Now that you've completed the quick start, explore:

1. **[Configuration Reference](./configuration.md)** - Deep dive into all options
2. **[External Dependencies](./externals.md)** - Master external handling
3. **[CLI Reference](./cli-reference.md)** - All command-line options
4. **[Examples & Recipes](./recipes.md)** - More real-world examples
5. **[Best Practices](./best-practices.md)** - Tips for production use

## 💡 Pro Tips

1. **Start Simple**: Begin with basic config, add complexity as needed
2. **Use Presets**: Leverage `reactExternal`, `litExternal`, etc.
3. **Version Control Config**: Commit your `build-config.json`
4. **Multiple Formats**: Build both ESM and CJS for compatibility
5. **Enable Source Maps**: Use `--sourcemap` during development
6. **Clean Builds**: Use `--clean` to avoid stale files
7. **Type Declarations**: Enable `--dts` for TypeScript libraries
8. **Test Locally**: Build and test before publishing

## 📞 Need Help?

- **Documentation**: [Full documentation](./index.md)
- **GitHub Issues**: [Report bugs](https://github.com/your-org/mix-builder/issues)
- **Discord**: [Join community](https://discord.gg/your-invite)
- **Examples**: [Example projects](https://github.com/your-org/mix-builder-examples)

## 🎉 You're Ready!

Congratulations! You now know how to:
- ✅ Install Mix Builder
- ✅ Create configuration files
- ✅ Run builds
- ✅ Handle common scenarios
- ✅ Troubleshoot issues

Start building amazing projects! 🚀

---

**What's Next?**
- [Configuration Guide](./configuration.md)
- [External Dependencies Deep Dive](./externals.md)
- [Advanced Recipes](./recipes.md)