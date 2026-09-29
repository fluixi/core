---
"@fluixi/compiler": minor
---

Each on an element now renders the element once and its content per item, and `<container>` now renders only its content while supporting `if`, `else`, `each`, and `key` in JSX. You must move `each` to the parent element, converting `<li each>` to `<ul each>` with the `<li>` placed inside the render function.
