---
"@fluixi/dom": patch
"@fluixi/compiler": patch
---

Close hole markers with `<!--fx/-->` rather than `<!--/fx-->`

Cosmetic, but it matters when reading a page: when a hole holds a component the closing
marker sits at the far end of the subtree, and `<!--fx/-->` pairs with `<!--fx-->` at a
glance in a way `<!--/fx-->` does not.

```html
<div class="wrap">
  <!--fx-->
  <input class="field" value="hi">
  <button class="bump">bump</button>
  <!--fx/-->
</div>
```
