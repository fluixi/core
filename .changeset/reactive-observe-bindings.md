---
"@fluixi/reactive": minor
---

The observer can now be told who wrote a signal, and what each DOM binding writes, via `reportReactiveBinding`, `wrote`, and `bound`. A node already carries its own dependencies, so reads were readable off the graph; once a write had propagated, nothing recorded what caused it, and a signal's readers could be counted but not named.
