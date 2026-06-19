# KettleJS CLI Changelog

## [0.0.2] - 2024-01-XX

### Added - JSX/TSX Support

#### Component Generation
- **JSX Mode**: Native JSX runtime for KettleJS components without React dependency
  - Generates `.tsx` files with KettleJS JSX runtime imports
  - Uses `/** @jsx h */` pragma and `@fluixi/kettlejs/jsx-runtime`
  - Supports all component types (basic, with-state, with-resource, etc.)
  
- **React Bridge Mode**: React-compatible components with KettleJS signals
  - Generates `.tsx` files with React imports
  - Uses `useSignal`, `useKettleEffect`, `useKettleMemo` hooks
  - Full React ecosystem compatibility
  - Automatic React dependency management

#### New CLI Options
- `--mode` / `-m`: Choose component rendering mode
  - `lit-html` (default) - Native KettleJS with lit-html templates
  - `jsx` - Native JSX runtime (no React)
  - `react-bridge` - React-compatible with KettleJS signals

#### Project Generation Enhancements
- Interactive mode selection for default component mode
- Automatic TypeScript configuration based on mode:
  - JSX mode: `jsx: "react-jsx"` with `jsxImportSource: "@fluixi/kettlejs/jsx-runtime"`
  - React Bridge: `jsx: "react-jsx"` with React dependencies
  - Lit-HTML: `jsx: "preserve"`
- Automatic dependency management:
  - React Bridge projects include `react` and `react-dom`
  - Type definitions added when needed

#### Component Generators
- `generateJSXComponent()`: Creates JSX components with KettleJS signals
- `generateReactBridgeComponent()`: Creates React-compatible components
- Support for all component types in both JSX modes

#### App Component Templates
- `generateJSXAppComponent()`: JSX mode app template
- `generateReactBridgeAppComponent()`: React Bridge mode app template
- Mode-aware main.ts generation with correct render logic

### Fixed - React Bridge

#### Type Safety Improvements
- Lazy-loaded React imports to avoid hard dependency errors
- Proper fallback implementations when React is not installed
- Fixed all TypeScript errors in `react-bridge/index.ts`
- Fixed all TypeScript errors in `react-bridge/utils.ts`

#### Module Loading
- Changed from async imports to synchronous require() calls
- Added `getReact()` and `getCreateReactWrapper()` helper functions
- Graceful degradation when React or @lit/react not available
- Console warnings when dependencies are missing

#### Component Compatibility
- Fixed `KettleErrorBoundary` class implementation
- Proper React.Component extension
- Correct error handling and rendering
- Fixed all hook implementations (`useSignal`, `useKettleEffect`, etc.)

### Enhanced - Interactive Mode

#### Component Generation Prompts
1. Component name validation (PascalCase)
2. **New**: Component mode selection (lit-html/jsx/react-bridge)
3. Component pattern selection (conditional, only for lit-html)
4. Component features/type selection
5. Smart file path generation with correct extension (.ts or .tsx)

#### Project Generation Prompts
1. Project name validation (lowercase with hyphens)
2. Project template selection (minimal/standard/full)
3. **New**: Default component mode preference
4. Mode preference saved and displayed after generation

### Improved - Documentation

#### New Documentation Files
- `docs/cli/README.md`: Complete CLI documentation with all modes
- `docs/cli/quick-reference.md`: Quick reference guide for common tasks
- `docs/cli/CHANGELOG.md`: This changelog

#### Documentation Coverage
- Detailed mode comparison (lit-html vs JSX vs React Bridge)
- Component type examples for all modes
- Project template descriptions
- TypeScript configuration examples
- Troubleshooting guide
- Migration strategies
- Best practices and tips

### Technical Details

#### File Extensions
- Lit-HTML mode: `.ts` files
- JSX mode: `.tsx` files
- React Bridge mode: `.tsx` files

#### Generated File Structure
Each component generates:
1. Component file (`.ts` or `.tsx`)
2. Test file (`.spec.ts`)
3. Style file (`.css`)

#### TypeScript Configuration
Auto-generated based on mode:

**JSX Mode:**
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/kettlejs/jsx-runtime"
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

**Lit-HTML Mode:**
```json
{
  "compilerOptions": {
    "jsx": "preserve"
  }
}
```

#### Package Dependencies

**JSX Mode (No additional dependencies):**
- Uses existing `@fluixi/kettlejs/jsx-runtime`

**React Bridge Mode (Auto-added):**
```json
{
  "dependencies": {
    "react": "^18.0.0",
    "react-dom": "^18.0.0"
  },
  "devDependencies": {
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0"
  }
}
```

### Breaking Changes
None - all changes are additive and backward compatible.

### Migration Guide

#### From Previous CLI Version

All existing commands work exactly as before. New features are opt-in:

```bash
# Old way (still works)
kettlejs new my-app
kettlejs g c MyComponent

# New way with JSX
kettlejs new my-app
# Select JSX mode in prompts

kettlejs g c MyComponent --mode jsx

# New way with React Bridge
kettlejs g c MyComponent --mode react-bridge
```

#### Adopting JSX in Existing Projects

1. Update `tsconfig.json`:
```json
{
  "compilerOptions": {
    "jsx": "react-jsx",
    "jsxImportSource": "@fluixi/kettlejs/jsx-runtime"
  }
}
```

2. Generate new JSX components:
```bash
kettlejs g c MyNewComponent --mode jsx
```

3. Gradually migrate existing components or keep them as-is

### Examples

#### Create JSX Project
```bash
kettlejs new my-jsx-app
# Select: jsx mode, standard template
cd my-jsx-app
npm install
npm run dev
```

#### Generate JSX Component
```bash
kettlejs g c Counter -t with-state -m jsx -p components/Counter/Counter.tsx
```

#### Generate React Bridge Component
```bash
kettlejs g c UserList -t with-resource -m react-bridge
```

#### Interactive Generation
```bash
kettlejs g c
# Follow the enhanced prompts with mode selection
```

### Known Issues
- React Bridge requires React 18+
- JSX mode requires TypeScript 4.7+
- Some TypeScript warnings in react-bridge utilities (non-blocking)

### Future Enhancements
- [ ] Custom template support
- [ ] Component library generation
- [ ] Storybook integration
- [ ] Testing utilities for each mode
- [ ] Migration scripts
- [ ] VSCode extension
- [ ] Component preview in CLI

### Contributors
- Adafri Team

### Related Documentation
- [Full CLI Documentation](./README.md)
- [Quick Reference](./quick-reference.md)
- [JSX/TSX Guide](../docs/framework/jsx-tsx-guide.md)
- [React Bridge Guide](../docs/framework/react-bridge-guide.md)

---

## [0.0.1] - Initial Release

### Added
- Basic project generation
- Component generation with multiple patterns
- Interactive mode
- Test and style file generation
- Project templates (minimal, standard, full)
- Component types (basic, with-state, with-resource, with-router, full)
- Lit-HTML template support