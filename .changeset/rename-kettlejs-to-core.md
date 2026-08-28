---
"@fluixi/core": minor
"@fluixi/jsx": minor
---

Drop the "kettle" name now that the org is fluixi. BREAKING — no aliases.

- **`@fluixi/kettlejs` → `@fluixi/core`** (facade package + folder). Update imports,
  including subpaths: `@fluixi/core/router-next`, `/plugins`, `/client`, `/server`,
  `/jsx-runtime`, `/rx`.
- **`@fluixi/jsx-runtime` → `@fluixi/jsx`** (package + folder). Set
  `jsxImportSource: "@fluixi/jsx"` in tsconfig (was `@fluixi/core`) and add `@fluixi/jsx`
  to app deps; the `/jsx-runtime` + `/jsx-dev-runtime` subpaths are unchanged.
- **All remaining `kettle` identifiers/contracts → `fluixi`:** `KettleJS` → `Fluixi`,
  `KettleElement` → `FluixiElement`, `kettleRoutesPlugin` → `fluixiRoutesPlugin`,
  `virtual:kettle-routes` → `virtual:fluixi-routes`, `__KETTLE_HYDRATION__` →
  `__FLUIXI_HYDRATION__`, the `kettle-js` root attribute → `fluixi-js`, the
  `kettle-generate`/`kettle-run` bins → `fluixi-generate`/`fluixi-run`.
- The `@fluixi/kettlejs-test` test harness → `@fluixi/core-test`.

No API/behavior changes — names only.

Also removes the dead React bridge from `@fluixi/jsx` (`jsx.ts`: `getJSX`/`loadReact`/
`ensureReactInit`/`ComponentChild` — exported but unused, only a lazy `import('react')`),
dropping the `react`/`react-dom`/`@types/react` dev deps. `@fluixi/jsx` no longer pulls
React in any form.
