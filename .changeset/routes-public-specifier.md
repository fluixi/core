---
"@fluixi/core": minor
---

Import the route tree from `@fluixi/core/routes`

`virtual:fluixi-routes` needed an ambient `declare module` to be typed, which the plugin
wrote into your `src/` as `fluixi-env.d.ts` — a file you did not create, must not edit, and
had to keep. It also left the specifier invisible to anything not running the Vite plugin:
plain `tsc`, an editor, a test runner.

`@fluixi/core/routes` is a real module, so its types come from this package and no generated
file is needed. The plugin swaps in the scanned tree exactly as before.

```diff
- import { routes } from 'virtual:fluixi-routes';
+ import { routes } from '@fluixi/core/routes';
```

`virtual:fluixi-routes` still resolves, so this is not a breaking change, and the plugin no
longer writes `fluixi-env.d.ts` — delete it once you have switched.

Importing it without the plugin now throws with an actionable message rather than handing
back an empty array, which would have built fine and 404'd every route.
