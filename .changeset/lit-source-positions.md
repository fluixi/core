---
"@fluixi/compiler": patch
---

Map compiled html`` back to the template.

The IR is emitted as a string and reparsed, so the resulting nodes carry no
position. Babel then falls back to the enclosing node's, collapsing everything
lowered from a template onto a single point — a breakpoint or stack frame inside
compiled template code landed at the top of the enclosing function rather than at
the template.

Generated nodes now inherit the template's own location, so template-derived code
maps into the template's span.

This is coarse by construction: everything from one template maps to that
template, not to the individual hole it came from. Per-hole precision would mean
carrying spans through the emit, which the string round-trip discards — a larger
change to the backend.
