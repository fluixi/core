---
"@fluixi/dom": minor
"@fluixi/compiler": minor
---

Custom properties in a style object (`--gap`) now apply, `style:x` and `class:x` update only their own property when its value changes, JSX `class:x` and `style:x` on DOM elements work as in html`` templates (JSX cannot parse `style:--x`, use `style={{ '--x': ... }}`), `style={{ ... }}` on a DOM element updates per property and removes keys missing from the new object, and `style=` together with `style:x` in a template no longer produces a duplicate key.
