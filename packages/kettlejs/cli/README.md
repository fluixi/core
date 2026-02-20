# KettleJS CLI

Command-line interface for scaffolding KettleJS projects and components with support for multiple rendering modes.

## Installation

```bash
npm install -g @awc/kettlejs
```

Or use with npx:

```bash
npx @awc/kettlejs <command>
```

## Quick Start

### Create a New Project

```bash
kettlejs new my-app
```

Follow the interactive prompts to configure your project with your preferred rendering mode.

### Generate a Component

```bash
# Interactive mode
kettlejs generate component

# Or with options
kettlejs g c Counter --mode jsx --type with-state
```

## Component Modes

KettleJS CLI supports three rendering modes:

### 1. Lit-HTML (Default)
Native KettleJS with lit-html templates - smallest bundle, best performance.

```bash
kettlejs g c MyComponent --mode lit-html
```

### 2. JSX
Native JSX runtime without React dependency - JSX syntax with KettleJS signals.

```bash
kettlejs g c MyComponent --mode jsx
```

### 3. React Bridge
React-compatible components with KettleJS signals - full React ecosystem access.

```bash
kettlejs g c MyComponent --mode react-bridge
```

## Commands

| Command | Alias | Description |
|---------|-------|-------------|
| `new [name]` | - | Create new project |
| `generate <type> [name]` | `g` | Generate component |
| `info` | - | Show CLI info |
| `--help` | `-h` | Show help |
| `--version` | `-v` | Show version |

## Options

### Generate Component Options

- `--type, -t <type>` - Component type (basic, with-state, with-resource, with-router, full)
- `--mode, -m <mode>` - Component mode (lit-html, jsx, react-bridge)
- `--path, -p <path>` - Component path relative to src/

## Examples

### Create JSX Project

```bash
kettlejs new my-jsx-app
# Select: jsx mode, standard template
cd my-jsx-app
npm install
npm run dev
```

### Generate Components

```bash
# Basic lit-html component
kettlejs g c Card -t basic

# JSX component with state
kettlejs g c Counter -t with-state -m jsx

# React Bridge component with resource
kettlejs g c UserList -t with-resource -m react-bridge

# Full-featured component with custom path
kettlejs g c Dashboard -t full -m jsx -p pages/Dashboard/Dashboard.tsx
```

## Generated Files

Each component generates:
- Component file (`.ts` or `.tsx`)
- Test file (`.spec.ts`)
- Style file (`.css`)

## Mode Comparison

| Feature | Lit-HTML | JSX | React Bridge |
|---------|----------|-----|--------------|
| Bundle Size | Smallest | Small | Medium |
| Syntax | Template literals | JSX | JSX + React |
| React Compat | No | No | Yes |
| Type Safety | Good | Excellent | Excellent |
| DevTools | Lit | Lit | React |

## Component Types

- **basic** - Simple component without state
- **with-state** - Component with reactive state management
- **with-resource** - Component with async data fetching
- **with-router** - Component with router integration
- **full** - Component with all features

## Project Templates

- **minimal** - Basic setup with essential configuration
- **standard** - Includes routing, examples, and organized structure
- **full** - Complete setup with all features and examples

## TypeScript Configuration

The CLI automatically configures TypeScript based on your selected mode:

**JSX Mode:**
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@awc/kettlejs/jsx-runtime"
  }
}
```

**React Bridge Mode:**
```json
{
  "compilerOptions": {
    "jsx": "react-jsx"
  }
}
```

## Documentation

- [Full CLI Documentation](../docs/cli/README.md)
- [Quick Reference](../docs/cli/quick-reference.md)
- [Changelog](../docs/cli/CHANGELOG.md)
- [JSX/TSX Guide](../docs/framework/jsx-tsx-guide.md)
- [React Bridge Guide](../docs/framework/react-bridge-guide.md)

## Tips

1. **Start with Lit-HTML** - Best for performance and smallest bundle size
2. **Use JSX** - If you prefer JSX syntax but don't need React
3. **Use React Bridge** - Only when you need React ecosystem libraries
4. **Component Naming** - Always use PascalCase (e.g., `MyComponent`)
5. **Interactive Mode** - Use without arguments to explore all options

## Troubleshooting

### JSX Not Working

Ensure your `tsconfig.json` is configured:
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@awc/kettlejs/jsx-runtime"
  }
}
```

### React Not Found (React Bridge Mode)

Install React dependencies:
```bash
npm install react react-dom
npm install -D @types/react @types/react-dom
```

## Version

Current version: 0.0.2

## License

MIT

## Support

- [GitHub Issues](https://github.com/your-org/kettlejs/issues)
- [Documentation](https://kettlejs.dev)
- [Discord Community](https://discord.gg/kettlejs)