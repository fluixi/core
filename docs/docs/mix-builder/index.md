---
id: mix-builder-index
title: Mix Builder
sidebar_label: Overview
slug: /mix-builder
---

# Mix Builder

A powerful, flexible build system that seamlessly integrates both Rollup and ESBuild in a single unified process, with support for interactive CLI prompts, configuration files, and advanced external dependency management.

## 🌟 Key Features

### Dual Builder Support
- **Rollup Integration**: Full Rollup support with advanced plugin system
- **ESBuild Integration**: Lightning-fast ESBuild builds with modern features
- **Mixed Builds**: Use both builders in a single build process
- **Format Flexibility**: Support for ES, CJS, UMD, and IIFE formats

### Interactive CLI
- **User-Friendly Prompts**: Interactive configuration with Inquirer.js
- **CLI Arguments**: Comprehensive command-line argument support
- **Non-Interactive Mode**: CI/CD friendly with full automation
- **Configuration Files**: JSON schema-validated configuration

### Advanced External Handling
- **Multiple Patterns**: Support for strings, regex, and functions
- **Smart Presets**: Pre-configured presets for React, Lit, Node.js, and more
- **Package.json Integration**: Automatic external resolution from dependencies
- **Custom Control**: Fine-grained control over external dependencies

### Developer Experience
- **Color-Coded Output**: Beautiful, informative console output
- **Build Statistics**: Detailed timing and size information
- **Progress Tracking**: Real-time build progress indicators
- **Error Validation**: Helpful error messages and validation

## 📦 Installation

```bash
# Using pnpm (recommended)
pnpm add -D @your-scope/mix-builder

# Using npm
npm install -D @your-scope/mix-builder

# Using yarn
yarn add -D @your-scope/mix-builder
```

## 🚀 Quick Start

### 1. Create Configuration File

Create `build-config.json` in your project root:

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

### 2. Run the Builder

```bash
# Interactive mode
npx mix-builder

# Non-interactive mode
npx mix-builder --builder=esbuild --minify

# CI mode
CI=true npx mix-builder
```

### 3. Add to package.json

```json
{
  "scripts": {
    "build": "mix-builder",
    "build:dev": "mix-builder --nodeEnv=development --sourcemap",
    "build:prod": "mix-builder --nodeEnv=production --minify --clean"
  }
}
```

## 📚 Documentation Sections

### Getting Started
- [Installation Guide](./installation.md) - Detailed installation instructions
- [Quick Start](./quick-start.md) - Get up and running in 5 minutes
- [Configuration](./configuration.md) - Complete configuration reference

### Core Concepts
- [Builder Types](./builders.md) - Rollup vs ESBuild vs Both
- [Entry Points](./entries.md) - Configuring entry points and glob patterns
- [External Dependencies](./externals.md) - Advanced external management
- [Output Formats](./formats.md) - ES, CJS, UMD, IIFE explained

### Advanced Usage
- [CLI Reference](./cli-reference.md) - All command-line arguments
- [API Reference](./api-reference.md) - Programmatic usage
- [Configuration Schema](./schema.md) - JSON schema documentation
- [Migration Guide](./migration.md) - Upgrading from older versions

### Examples & Recipes
- [Common Use Cases](./use-cases.md) - Library, components, CLI tools
- [Recipe Book](./recipes.md) - Step-by-step guides
- [Best Practices](./best-practices.md) - Tips and recommendations

### Troubleshooting
- [Common Issues](./troubleshooting.md) - Solutions to common problems
- [FAQ](./faq.md) - Frequently asked questions
- [Debugging](./debugging.md) - Debug mode and logging

## 🎯 Common Use Cases

### React Component Library

```json
{
  "builder": "esbuild",
  "reactExternal": true,
  "esbuild": {
    "entries": ["src/components/index.ts"],
    "formats": ["esm"],
    "platform": "browser",
    "jsx": "automatic",
    "minify": true,
    "splitting": true
  }
}
```

### Universal Package (Browser + Node)

```json
{
  "builder": "both",
  "rollup": {
    "entries": {
      "src/index.ts": {
        "formats": ["umd"],
        "name": "MyLib"
      }
    }
  },
  "esbuild": {
    "entries": ["src/index.ts"],
    "formats": ["esm", "cjs"]
  }
}
```

### Node.js CLI Tool

```json
{
  "builder": "esbuild",
  "esbuild": {
    "entries": ["src/cli.ts"],
    "formats": ["cjs"],
    "platform": "node",
    "bundle": true,
    "pkgExternals": true
  }
}
```

## 🔧 Key Configuration Options

### Builder Selection

```json
{
  "builder": "rollup" | "esbuild" | "both"
}
```

### External Dependencies

```json
{
  "externals": [
    "react",                           // String
    /^lodash\//,                       // Regex
    { "pattern": "axios", "includeSub": true }  // Config object
  ],
  "reactExternal": true,               // Preset: React
  "litExternal": true,                 // Preset: Lit
  "pkgExternal": true                  // Auto: package.json deps
}
```

### Output Configuration

```json
{
  "outdir": "dist",
  "formats": ["es", "cjs", "umd"],
  "minify": true,
  "sourcemap": true,
  "clean": true
}
```

## 📊 Build Output

When you run Mix Builder, you'll see detailed output:

```
🏗️  Interactive Mix Builder Configuration

✓ Loaded configuration from build-config.json

📋 Build Configuration Summary:
  Builder: esbuild
  Output Directory: dist
  Formats: esm, cjs
  Platform: browser
  Minify: Yes

🚀 Starting build process...

🔨 Starting ESBuild...
  ✓ Built index.ts [esm] in 234ms
  ✓ Built utils.ts [esm] in 156ms

📊 ESBUILD Build Statistics:
  Total Entries: 2
  Successful: 2
  Success Rate: 100%
  Duration: 390ms

✅ Build completed successfully!
```

## 🔗 Related Resources

- [GitHub Repository](https://github.com/your-org/mix-builder)
- [NPM Package](https://www.npmjs.com/package/@your-scope/mix-builder)
- [Example Projects](https://github.com/your-org/mix-builder-examples)
- [Discord Community](https://discord.gg/your-invite)

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](./contributing.md) for details.

## 📄 License

MIT License - see [LICENSE](./license.md) for details.

## 🆘 Support

- **Issues**: [GitHub Issues](https://github.com/your-org/mix-builder/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/mix-builder/discussions)
- **Discord**: [Join our community](https://discord.gg/your-invite)
- **Email**: support@your-domain.com

---

**Next Steps:**
- [Quick Start Guide](./quick-start.md)
- [Configuration Reference](./configuration.md)
- [External Dependencies Guide](./externals.md)