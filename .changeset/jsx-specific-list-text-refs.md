---
"@fluixi/jsx": patch
---

Type the `ul`, `p`, `h1`–`h6`, `pre` and `dl` intrinsics with their specific DOM
element (`HTMLUListElement`, `HTMLParagraphElement`, `HTMLHeadingElement`,
`HTMLPreElement`, `HTMLDListElement`) instead of the generic `HTMLElement`, matching
`div`/`li`/`ol` and React. Previously a component whose props extended
`HTMLAttributes<HTMLUListElement>` couldn't spread `{...others}` onto its own `<ul>`
(the props' `ref: Ref<HTMLUListElement>` wasn't assignable to the generic intrinsic's
`ref: Ref<HTMLElement>` under function-parameter contravariance). Only a type change;
no runtime effect.
