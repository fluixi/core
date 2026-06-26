---
"@fluixi/start": minor
---

i18n auto-discovery now emits **typed** `virtual:fluixi-i18n` declarations. The generated
`src/fluixi-start-env.d.ts` types `messages` off the actual files —
`(typeof import('./i18n/en.json'))['default']` per locale, plus a literal `locales` tuple and
`defaultLocale` — so translation keys flow all the way from `src/i18n/*.json` into
`createI18n({ messages })` and `t('…')` autocompletes them. Falls back to the open
`Record<string, unknown>` shape when no JSON files exist yet (or a configured locale has no
file). Relies on `resolveJsonModule` (Vite's default tsconfig enables it).
