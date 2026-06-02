---
id: cli-reference
title: CLI Reference
sidebar_label: CLI Reference
---

# CLI Reference

Complete reference for all Mix Builder command-line arguments and options.

## 🚀 Basic Usage

```bash
# Interactive mode (prompts for configuration)
npx mix-builder

# Non-interactive mode with config file
npx mix-builder --builder=esbuild

# Full CLI mode (no config file)
npx mix-builder --builder=esbuild --formats=esm,cjs --minify

# CI mode (skip all prompts)
CI=true npx mix-builder
```

## 📋 Command Syntax

```bash
npx mix-builder [options]
```

## 🎯 Core Options

### `--builder`

Select which builder(s) to use.

**Type:** `string`  
**Values:** `rollup`, `esbuild`, `both`  
**Default:** `both`

```bash
# Use ESBuild only
npx mix-builder --builder=esbuild

# Use Rollup only
npx mix-builder --builder=rollup

# Use both builders
npx mix-builder --builder=both
```

### `--buildConfigFile`

Path to build configuration file.

**Type:** `string`  
**Default:** `build-config.json`

```bash
# Custom config file
npx mix-builder --buildConfigFile=custom-build.json

# Config in different directory
npx mix-builder --buildConfigFile=configs/build.json
```

### `--use`

Legacy builder selection (deprecated, use `--builder`).

**Type:** `string`  
**Values:** `rollup`, `esbuild`, `tsup`  
**Default:** `esbuild`

```bash
npx mix-builder --use=esbuild
```

## 📂 Input/Output Options

### `--outdir`

Output directory for built files.

**Type:** `string`  
**Default:** `dist`

```bash
# Output to 'build' directory
npx mix-builder --outdir=build

# Output to 'lib'
npx mix-builder --outdir=lib
```

### `--subdir`

Subdirectory to maintain in output structure.

**Type:** `string`  
**Default:** `src`

```bash
# Maintain src/ structure
npx mix-builder --subdir=src

# No subdirectory structure
npx mix-builder --subdir=
```

### `--baseDir`

Base directory for resolving paths.

**Type:** `string`  
**Default:** Current working directory

```bash
# Use different base directory
npx mix-builder --baseDir=./packages/core
```

## 🎨 Format Options

### `--formats`

Output module formats (comma-separated).

**Type:** `array`  
**Values:** `es`, `esm`, `cjs`, `umd`, `iife`  
**Default:** `es`

```bash
# Single format
npx mix-builder --formats=esm

# Multiple formats
npx mix-builder --formats=esm,cjs

# All formats
npx mix-builder --formats=esm,cjs,umd,iife
```

### `--format` (ESBuild single)

Single format for ESBuild (legacy).

**Type:** `string`  
**Values:** `es`, `esm`, `cjs`, `iife`  
**Default:** `esm`

```bash
npx mix-builder --format=cjs
```

## 📦 External Dependencies

### `--externals`

External dependencies to exclude from bundle (comma-separated).

**Type:** `array`

```bash
# Single external
npx mix-builder --externals=react

# Multiple externals
npx mix-builder --externals=react,lodash,axios
```

### `--reactExternal`

Mark React and related packages as external.

**Type:** `boolean`  
**Default:** `false`

```bash
npx mix-builder --reactExternal

# Explicitly disable
npx mix-builder --reactExternal=false
```

**Includes:**
- `react`
- `react-dom`
- `react/jsx-runtime`
- `react/jsx-dev-runtime`
- `react-dom/client`
- `react-dom/server`

### `--litExternal`

Mark Lit and related packages as external.

**Type:** `boolean`  
**Default:** `false`

```bash
npx mix-builder --litExternal
```

**Includes:**
- `lit`
- `lit-html`
- `lit-element`
- `@lit/reactive-element`

### `--libExternal`

Mark library packages as external.

**Type:** `boolean`  
**Default:** `false`

```bash
npx mix-builder --libExternal
```

**Includes:**
- `@fluixi/*`
- `@adafri/*`

### `--pkgExternal`

Mark package.json dependencies as external.

**Type:** `boolean`  
**Default:** `false` (ESM), `true` (CJS)

```bash
npx mix-builder --pkgExternal
```

### `--skipExternal`

Skip all external processing (bundle everything).

**Type:** `boolean`  
**Default:** `false`

```bash
npx mix-builder --skipExternal
```

### `--nodeExternal`

Mark Node.js built-ins as external.

**Type:** `boolean`  
**Default:** `false`

```bash
npx mix-builder --nodeExternal
```

## 🔧 Build Options

### `--minify`

Minify output code.

**Type:** `boolean`  
**Default:** `true`

```bash
# Enable minification
npx mix-builder --minify

# Disable minification
npx mix-builder --minify=false
```

### `--minifySyntax`

Minify syntax (ESBuild only).

**Type:** `boolean`  
**Default:** `true`

```bash
npx mix-builder --minifySyntax=false
```

### `--minifyWhitespace`

Minify whitespace (ESBuild only).

**Type:** `boolean`  
**Default:** `true`

```bash
npx mix-builder --minifyWhitespace=false
```

### `--minifyIdentifiers`

Minify identifiers (ESBuild only).

**Type:** `boolean`  
**Default:** `true`

```bash
npx mix-builder --minifyIdentifiers=false
```

### `--sourcemap`

Generate source maps.

**Type:** `boolean`  
**Default:** `false`

```bash
# Enable source maps
npx mix-builder --sourcemap

# Disable source maps
npx mix-builder --sourcemap=false
```

### `--bundle`

Bundle dependencies (ESBuild only).

**Type:** `boolean`  
**Default:** `true`

```bash
npx mix-builder --bundle=false
```

### `--splitting`

Enable code splitting for ESM (ESBuild only).

**Type:** `boolean`  
**Default:** `true`

```bash
npx mix-builder --splitting=false
```

### `--treeShaking`

Enable tree shaking.

**Type:** `boolean`  
**Default:** `true`

```bash
npx mix-builder --treeShaking=false
```

### `--dts`

Generate TypeScript declarations.

**Type:** `boolean`  
**Default:** `false`

```bash
npx mix-builder --dts
```

## 🌍 Environment Options

### `--nodeEnv`

Node environment setting.

**Type:** `string`  
**Values:** `development`, `production`  
**Default:** `production`

```bash
# Development build
npx mix-builder --nodeEnv=development

# Production build
npx mix-builder --nodeEnv=production
```

**Aliases:** `--env` (ESBuild)

### `--platform`

Target platform (ESBuild only).

**Type:** `string`  
**Values:** `browser`, `node`, `neutral`  
**Default:** `browser`

```bash
# Browser target
npx mix-builder --platform=browser

# Node.js target
npx mix-builder --platform=node

# Neutral (both)
npx mix-builder --platform=neutral
```

### `--target`

JavaScript target version (ESBuild only).

**Type:** `string`  
**Default:** `es2021`

```bash
# ES2020 target
npx mix-builder --target=es2020

# Node 16 target
npx mix-builder --target=node16

# Multiple targets
npx mix-builder --target=es2020,chrome90,firefox88
```

## 🎯 Output Naming (ESBuild)

### `--entryNames`

Entry point naming pattern.

**Type:** `string`  
**Default:** `[name]`

```bash
# Include hash in entry names
npx mix-builder --entryNames=[name]-[hash]

# Use directory structure
npx mix-builder --entryNames=[dir]/[name]
```

**Placeholders:**
- `[name]` - File name without extension
- `[hash]` - Content hash
- `[dir]` - Directory path

### `--chunkNames`

Chunk naming pattern.

**Type:** `string`  
**Default:** `[name]-[hash]`

```bash
# Chunks in subdirectory
npx mix-builder --chunkNames=chunks/[name]-[hash]

# No hash
npx mix-builder --chunkNames=[name]
```

### `--assetNames`

Asset naming pattern.

**Type:** `string`  
**Default:** `[name]-[hash]`

```bash
# Assets in subdirectory
npx mix-builder --assetNames=assets/[name]-[hash]
```

## 📝 File Extensions

### `--extensions`

File extensions to resolve (comma-separated).

**Type:** `array`  
**Default:** `.js,.jsx,.ts,.tsx`

```bash
npx mix-builder --extensions=.ts,.tsx,.mts,.cts
```

### `--outExtension`

Output file extension mapping.

**Type:** `string`

```bash
# ESM uses .mjs
npx mix-builder --outExtension='.js:.mjs'
```

## 🎨 Other Options

### `--legalComments`

How to handle legal comments (ESBuild only).

**Type:** `string`  
**Values:** `none`, `inline`, `eof`, `linked`, `external`  
**Default:** `none`

```bash
npx mix-builder --legalComments=inline
```

### `--charset`

Character encoding (ESBuild only).

**Type:** `string`  
**Values:** `utf8`, `ascii`  
**Default:** `utf8`

```bash
npx mix-builder --charset=ascii
```

### `--jsx`

JSX transform mode (ESBuild only).

**Type:** `string`  
**Values:** `transform`, `preserve`, `automatic`  
**Default:** `automatic`

```bash
npx mix-builder --jsx=automatic
```

### `--jsxImportSource`

JSX import source (ESBuild only).

**Type:** `string`  
**Default:** `react`

```bash
# Use Preact
npx mix-builder --jsxImportSource=preact

# Use custom
npx mix-builder --jsxImportSource=@custom/jsx
```

## 🧹 Behavior Options

### `--clean`

Clean output directory before build.

**Type:** `boolean`  
**Default:** `false`

```bash
npx mix-builder --clean
```

### `--watch`

Enable watch mode (coming soon).

**Type:** `boolean`  
**Default:** `false`

```bash
npx mix-builder --watch
```

### `--copy_pkg`

Copy package.json to output directory.

**Type:** `boolean`  
**Default:** `false`

```bash
npx mix-builder --copy_pkg
```

### `--log`

Enable build logging.

**Type:** `boolean`  
**Default:** `true`

```bash
# Disable logging
npx mix-builder --log=false
```

### `--debug`

Enable debug mode with detailed output.

**Type:** `boolean`  
**Default:** `false`

```bash
npx mix-builder --debug
```

## 🔄 Environment Variables

### `CI`

Runs in non-interactive CI mode.

```bash
CI=true npx mix-builder
```

### `NODE_ENV`

Alternative way to set environment.

```bash
NODE_ENV=production npx mix-builder
```

### `DEBUG`

Show stack traces on errors.

```bash
DEBUG=true npx mix-builder
```

## 📚 Common Combinations

### Development Build

```bash
npx mix-builder \
  --nodeEnv=development \
  --sourcemap \
  --minify=false \
  --log
```

### Production Build

```bash
npx mix-builder \
  --nodeEnv=production \
  --minify \
  --clean \
  --dts
```

### Library Build

```bash
npx mix-builder \
  --builder=esbuild \
  --formats=esm,cjs \
  --reactExternal \
  --pkgExternal \
  --dts
```

### Component Library

```bash
npx mix-builder \
  --builder=esbuild \
  --formats=esm \
  --reactExternal \
  --splitting \
  --minify
```

### Node.js CLI Tool

```bash
npx mix-builder \
  --builder=esbuild \
  --formats=cjs \
  --platform=node \
  --pkgExternal \
  --nodeExternal
```

### Universal Package

```bash
npx mix-builder \
  --builder=both \
  --formats=esm,cjs,umd \
  --minify \
  --dts
```

## 🎓 Advanced Examples

### Custom Output Structure

```bash
npx mix-builder \
  --outdir=dist \
  --subdir=src \
  --entryNames=[dir]/[name] \
  --chunkNames=chunks/[name]-[hash] \
  --assetNames=assets/[name]
```

### Multiple Externals with Presets

```bash
npx mix-builder \
  --externals=lodash,axios \
  --reactExternal \
  --litExternal \
  --pkgExternal
```

### Specific Target Versions

```bash
npx mix-builder \
  --platform=browser \
  --target=es2020,chrome90,firefox88,safari14
```

### Debug Build

```bash
npx mix-builder \
  --debug \
  --log \
  --sourcemap \
  --minify=false
```

## 🐛 Troubleshooting

### View all available options

```bash
npx mix-builder --help
```

### Check version

```bash
npx mix-builder --version
```

### Verbose output

```bash
npx mix-builder --debug --log
```

### Dry run (validation only)

```bash
npx mix-builder --dryRun
```

## 📖 Related Documentation

- [Configuration Reference](./configuration.md)
- [External Dependencies](./externals.md)
- [Quick Start Guide](./quick-start.md)
- [Examples & Recipes](./recipes.md)

## 💡 Tips

1. **Combine with Config**: CLI arguments override config file settings
2. **Use Presets**: Leverage presets like `--reactExternal` for common patterns
3. **Debug Mode**: Always use `--debug` when troubleshooting
4. **CI Mode**: Set `CI=true` for automated builds
5. **Format Flexibility**: Use `--formats` for multiple output formats

---

**Next Steps:**
- [Configuration Guide](./configuration.md)
- [API Reference](./api-reference.md)
- [Best Practices](./best-practices.md)