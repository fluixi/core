---
"@fluixi/dom": patch
"@fluixi/compiler": patch
---

Spread children are now rendered as content with JSX children taking precedence, and spreads that gain a key become bound while those that lose a key are cleared, preserving bindings for unchanged keys.
