---
"@fluixi/start": minor
---

Import the generated server-fn and API tables from real modules

`virtual:fluixi-server-fns` and `virtual:fluixi-api` could only be typed by an ambient
`declare module`, which `@fluixi/start` wrote into your `src/` as `fluixi-start-env.d.ts`.

```diff
- import 'virtual:fluixi-server-fns';
+ import '@fluixi/start/server-fns';

- export { isApiRequest, handleApiRequest } from 'virtual:fluixi-api';
+ export { isApiRequest, handleApiRequest } from '@fluixi/start/api-routes';
```

Named `api-routes` because `@fluixi/start/api` is already the API plumbing you call
directly. Both virtual specifiers still resolve.

**i18n deliberately keeps its generated declaration.** `virtual:fluixi-i18n` types
`messages` off your own JSON (`typeof import('./i18n/en.json')`) and `locales` as a literal
tuple — that is what makes `t()` keys autocomplete, and no static package entry can express
it. Moving it would have quietly downgraded those types to `Record<string, unknown>`.

So `fluixi-start-env.d.ts` now contains only the i18n block, and is not written at all when
i18n is unconfigured.
