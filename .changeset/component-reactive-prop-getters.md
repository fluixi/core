---
"@fluixi/compiler": patch
---

Emit reactive component props as getters. `<Comp prop={sig()} />` compiled to `createMemo(() => createComponent(Comp, { prop: sig() }))`, reading the signal eagerly inside the memo — so the memo re-created the whole component on every change. A component rendering a `<Portal>` then re-mounted and piled up in `<body>`. Reactive props (`prop={sig()}`, `prop={store.x}`) are now emitted as getters (`get prop() { return sig() }`, like `children`), so the component is created once and reactivity flows through the getter into its own effects. Static props, plain identifiers and event handlers stay eager. Applies to both codegen paths (inline + IR).
