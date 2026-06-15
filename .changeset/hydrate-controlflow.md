---
"@fluixi/dom": patch
---

Hydration now works for `For` (and `Show`) control-flow. Hydrating a server-
rendered list used to add duplicate/extra nodes and break reconciliation: each
`For` item's `createNativeElement` descended into its node, but nothing ascended
the hydration cursor between siblings, so items 2+ were rebuilt fresh. `For` now
advances the cursor past each rendered item (`hydrateAdvancePast`, no-op outside
hydration), so server list items are reused and stay reactive. `Show` already
worked; both are covered by tests. (`Index` SSR has a separate, pre-existing
extra-node bug — tracked separately.)
