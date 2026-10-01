---
"@fluixi/core": minor
---

`createTheme` now stores the selected theme in a cookie and the server renders `<html data-theme>` from it, eliminating the flash, and `createIsomorphicStore.persist` can accept a storage option.

`useStorage` from `@fluixi/core/storage` now replaces the removed `storage` and `createMemoryStorage` exports. Import `useStorage` instead of the old names.
