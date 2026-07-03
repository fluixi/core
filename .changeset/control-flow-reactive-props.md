---
"@fluixi/compiler": patch
"@fluixi/dom": patch
---

Make control-flow reactive props reactive in the called shape. `<For each={items()}>`, `<Show when={cond()}>`, `<Index each={xs()}>` and `<Match when={m()}>` snapshot their value once and never updated — only the accessor shapes (`each={items}` / `each={() => items()}`) reacted. The compiler now emits these value props as getters (like `children`), and the runtime reads them through a shared `resolveReactiveProp` helper inside each component's own tracking scope, so all three shapes work and `<For>` keeps its keyed reconciliation instead of re-creating on every change. Both codegen paths (inline + IR) emit getters. `Dynamic.component` and `Portal.mount` are intentionally left as-is (a component is indistinguishable from an accessor; `mount` is read once).
