---
"@fluixi/core": minor
---

`<Router>` no longer renders a blank page for an unmatched URL.

When the current URL matches no route, the router now renders a fallback instead of nothing. Pass `notFound` (a component, element, or any renderable) to control it; omit it for a minimal built-in 404. It clears reactively when you navigate to a matched route, and works under SSR.

```tsx
<Router routes={routes} notFound={NotFound} />
```

A catch-all file route (`[...slug].tsx` → `*`) still takes precedence — use that when the 404 should render inside your layout; `notFound` is the app-level fallback for everything else.
