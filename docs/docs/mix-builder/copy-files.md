---
id: copy-files
title: Copy Files
sidebar_label: Copy Files
---

# Copy Files Guide

Mix Builder provides advanced file copying capabilities with support for glob patterns, transformations, and flexible destination paths. This guide covers how to use the `copyFiles` feature in both Rollup and ESBuild configurations.

## 🎯 Overview

The `copyFiles` feature allows you to:
- Copy files and directories during the build process
- Use glob patterns to match multiple files
- Flatten directory structures
- Rename files during copy
- Transform file contents
- Copy to specific output locations

## 📋 Table of Contents

- [Basic Usage](#basic-usage)
- [Configuration Options](#configuration-options)
- [Glob Patterns](#glob-patterns)
- [Advanced Features](#advanced-features)
- [Examples](#examples)
- [Best Practices](#best-practices)

## 🚀 Basic Usage

### Simple File Copy

Copy a single file to the output directory:

```json
{
  "esbuild": {
    "entries": ["src/index.ts"],
    "copyFiles": [
      {
        "from": "README.md",
        "to": "."
      }
    ]
  }
}
```

### Multiple Files

Copy multiple files:

```json
{
  "esbuild": {
    "copyFiles": [
      {
        "from": "README.md",
        "to": "."
      },
      {
        "from": "LICENSE",
        "to": "."
      },
      {
        "from": "package.json",
        "to": "."
      }
    ]
  }
}
```

### Multiple Sources to One Destination

```json
{
  "esbuild": {
    "copyFiles": [
      {
        "from": ["README.md", "LICENSE", "CHANGELOG.md"],
        "to": "docs"
      }
    ]
  }
}
```

## ⚙️ Configuration Options

### `from`

Source path or glob pattern(s).

**Type:** `string` | `string[]`

```json
{
  "copyFiles": [
    { "from": "README.md", "to": "." },
    { "from": ["LICENSE", "CHANGELOG.md"], "to": "docs" }
  ]
}
```

### `to`

Destination path relative to the output directory.

**Type:** `string`

```json
{
  "copyFiles": [
    { "from": "assets/**/*", "to": "static/assets" }
  ]
}
```

### `flatten`

Flatten directory structure when copying.

**Type:** `boolean`  
**Default:** `false`

```json
{
  "copyFiles": [
    {
      "from": "src/**/*.json",
      "to": "data",
      "flatten": true
    }
  ]
}
```

**Without flatten:**
```
dist/
  data/
    components/
      config.json
    utils/
      settings.json
```

**With flatten:**
```
dist/
  data/
    config.json
    settings.json
```

### `rename`

Rename files during copy (JavaScript function name as string).

**Type:** `string`

```json
{
  "copyFiles": [
    {
      "from": "package.json",
      "to": ".",
      "rename": "(name, ext) => name + '.backup' + ext"
    }
  ]
}
```

### `transform`

Transform file contents (JavaScript function name as string).

**Type:** `string`

```json
{
  "copyFiles": [
    {
      "from": "config.json",
      "to": ".",
      "transform": "(contents) => contents.toString().replace('dev', 'prod')"
    }
  ]
}
```

## 🎨 Glob Patterns

### Basic Glob

Copy all JSON files:

```json
{
  "copyFiles": [
    {
      "from": "*.json",
      "to": "config"
    }
  ]
}
```

### Recursive Glob

Copy all images from any subdirectory:

```json
{
  "copyFiles": [
    {
      "from": "**/*.{png,jpg,svg}",
      "to": "assets/images"
    }
  ]
}
```

### Multiple Patterns

Copy multiple file types:

```json
{
  "copyFiles": [
    {
      "from": "assets/**/*.{png,jpg,svg,gif,webp}",
      "to": "static/images"
    }
  ]
}
```

### Specific Directories

Copy from specific directories:

```json
{
  "copyFiles": [
    {
      "from": "src/assets/**/*",
      "to": "assets"
    },
    {
      "from": "public/**/*",
      "to": "."
    }
  ]
}
```

## 🔧 Advanced Features

### Example 1: Copy and Flatten Assets

```json
{
  "esbuild": {
    "entries": ["src/index.ts"],
    "copyFiles": [
      {
        "from": "src/assets/**/*.{png,jpg,svg}",
        "to": "assets",
        "flatten": true
      }
    ]
  }
}
```

### Example 2: Copy with Rename

```json
{
  "rollup": {
    "entries": ["src/index.ts"],
    "copyFiles": [
      {
        "from": "package.json",
        "to": ".",
        "rename": "(name, ext) => 'package.backup' + ext"
      }
    ]
  }
}
```

### Example 3: Copy Multiple Asset Types

```json
{
  "esbuild": {
    "copyFiles": [
      {
        "from": "assets/images/**/*.{png,jpg,svg}",
        "to": "static/images"
      },
      {
        "from": "assets/fonts/**/*.{woff,woff2,ttf}",
        "to": "static/fonts"
      },
      {
        "from": "assets/data/**/*.json",
        "to": "static/data"
      }
    ]
  }
}
```

### Example 4: Copy Documentation

```json
{
  "esbuild": {
    "copyFiles": [
      {
        "from": ["README.md", "LICENSE", "CHANGELOG.md"],
        "to": "."
      },
      {
        "from": "docs/**/*.md",
        "to": "docs"
      }
    ]
  }
}
```

### Example 5: Copy Configuration Files

```json
{
  "rollup": {
    "copyFiles": [
      {
        "from": "config/*.json",
        "to": "config"
      },
      {
        "from": ".env.example",
        "to": "."
      }
    ]
  }
}
```

### Example 6: Copy and Transform

```json
{
  "esbuild": {
    "copyFiles": [
      {
        "from": "package.json",
        "to": ".",
        "transform": "(contents) => { const pkg = JSON.parse(contents); delete pkg.devDependencies; return JSON.stringify(pkg, null, 2); }"
      }
    ]
  }
}
```

## 📚 Complete Examples

### Example: Component Library

```json
{
  "builder": "esbuild",
  "outdir": "dist",
  "esbuild": {
    "entries": ["src/components/index.ts"],
    "formats": ["esm"],
    "copyFiles": [
      {
        "from": "README.md",
        "to": "."
      },
      {
        "from": "LICENSE",
        "to": "."
      },
      {
        "from": "package.json",
        "to": "."
      },
      {
        "from": "src/assets/**/*.{css,scss}",
        "to": "styles"
      },
      {
        "from": "src/assets/images/**/*.svg",
        "to": "assets/icons",
        "flatten": true
      }
    ]
  }
}
```

### Example: Full-Stack Application

```json
{
  "builder": "esbuild",
  "esbuild": {
    "entries": ["src/index.ts"],
    "copyFiles": [
      {
        "from": "public/**/*",
        "to": "public"
      },
      {
        "from": "assets/images/**/*.{png,jpg,webp}",
        "to": "assets/images"
      },
      {
        "from": "assets/fonts/**/*.{woff,woff2}",
        "to": "assets/fonts"
      },
      {
        "from": "locales/**/*.json",
        "to": "locales"
      },
      {
        "from": ["robots.txt", "sitemap.xml", "favicon.ico"],
        "to": "."
      }
    ]
  }
}
```

### Example: NPM Package

```json
{
  "builder": "both",
  "rollup": {
    "entries": {
      "src/index.ts": {
        "formats": ["umd"]
      }
    },
    "copyFiles": [
      {
        "from": ["README.md", "LICENSE"],
        "to": "."
      }
    ]
  },
  "esbuild": {
    "entries": ["src/index.ts"],
    "formats": ["esm", "cjs"],
    "copyFiles": [
      {
        "from": "package.json",
        "to": ".",
        "transform": "(contents) => { const pkg = JSON.parse(contents); delete pkg.scripts; delete pkg.devDependencies; return JSON.stringify(pkg, null, 2); }"
      },
      {
        "from": "src/**/*.d.ts",
        "to": "types"
      }
    ]
  }
}
```

## 🎯 Best Practices

### 1. Organize by Asset Type

Group related files together:

```json
{
  "copyFiles": [
    {
      "from": "assets/images/**/*",
      "to": "static/images"
    },
    {
      "from": "assets/fonts/**/*",
      "to": "static/fonts"
    },
    {
      "from": "assets/data/**/*",
      "to": "static/data"
    }
  ]
}
```

### 2. Use Flatten for Icons

Keep icons in a single directory:

```json
{
  "copyFiles": [
    {
      "from": "src/**/icons/**/*.svg",
      "to": "icons",
      "flatten": true
    }
  ]
}
```

### 3. Copy Essential Files

Always copy necessary metadata files:

```json
{
  "copyFiles": [
    {
      "from": ["README.md", "LICENSE", "CHANGELOG.md"],
      "to": "."
    }
  ]
}
```

### 4. Transform package.json for Distribution

Remove unnecessary fields:

```json
{
  "copyFiles": [
    {
      "from": "package.json",
      "to": ".",
      "transform": "(contents) => { const pkg = JSON.parse(contents); delete pkg.scripts; delete pkg.devDependencies; pkg.main = './index.cjs'; pkg.module = './index.mjs'; return JSON.stringify(pkg, null, 2); }"
    }
  ]
}
```

### 5. Preserve Directory Structure for Docs

```json
{
  "copyFiles": [
    {
      "from": "docs/**/*.md",
      "to": "docs",
      "flatten": false
    }
  ]
}
```

### 6. Use Specific Glob Patterns

Be specific to avoid copying unwanted files:

```json
{
  "copyFiles": [
    {
      "from": "assets/**/*.{png,jpg,svg}",
      "to": "assets"
    }
  ]
}
```

Instead of:

```json
{
  "copyFiles": [
    {
      "from": "assets/**/*",
      "to": "assets"
    }
  ]
}
```

## 🐛 Troubleshooting

### Issue: Files Not Copied

**Problem:** Files specified in `copyFiles` are not in the output.

**Solution:**
1. Check that the source paths are correct
2. Verify glob patterns match existing files
3. Ensure destination paths are valid
4. Enable logging: `"log": true`

### Issue: Wrong Directory Structure

**Problem:** Files copied with incorrect directory structure.

**Solution:**
- Use `flatten: true` to flatten structure
- Adjust `to` path to match desired structure
- Check relative paths in glob patterns

### Issue: Glob Pattern Not Working

**Problem:** Glob pattern doesn't match expected files.

**Solution:**
```bash
# Test glob pattern
npx fast-glob "your-pattern/**/*"
```

Common patterns:
- `**/*` - All files recursively
- `*.json` - All JSON files in current dir
- `**/*.{js,ts}` - All JS/TS files recursively
- `src/**/*.css` - All CSS files in src/

### Issue: Transform Not Applied

**Problem:** Transform function not working.

**Solution:**
- Ensure transform is a valid JavaScript expression
- Return the transformed content
- Use arrow functions for inline transforms
- Check for syntax errors in transform function

## 📊 Glob Pattern Reference

| Pattern | Description | Example |
|---------|-------------|---------|
| `*` | Match files in current dir | `*.json` |
| `**` | Match files recursively | `**/*.ts` |
| `?` | Match single character | `file?.txt` |
| `[abc]` | Match any character in set | `file[123].txt` |
| `{a,b}` | Match any pattern | `*.{js,ts}` |
| `!pattern` | Exclude pattern | `!**/*.test.ts` |

## 🔗 Related Documentation

- [Configuration Reference](./configuration.md)
- [CLI Reference](./cli-reference.md)
- [ESBuild Builder](./builders.md#esbuild)
- [Rollup Builder](./builders.md#rollup)
- [Best Practices](./best-practices.md)

## 💡 Tips

1. **Use Glob Patterns** - More flexible than listing individual files
2. **Flatten When Needed** - Simplify output structure for assets
3. **Transform Smartly** - Clean up package.json for distribution
4. **Test Locally** - Verify file copying before CI/CD
5. **Document Patterns** - Comment complex glob patterns in config

---

**Next Steps:**
- [Configuration Guide](./configuration.md)
- [Build Optimization](./optimization.md)
- [Examples & Recipes](./recipes.md)