# @fluixi/template-runtime

This package provides a way to use Fluixi templates in a page that loads scripts directly, without a build step. It compiles templates in the browser, allowing developers to write reactive HTML with minimal setup. The compiler and runtime are the same as the ones used in the compiled path, but this version runs in the browser at runtime.

The package is loaded via a script tag and exposes the `Fluixi` global. It includes the `html`, `render`, `signal`, and `define` functions needed to write reactive components. Components can be defined and used directly in the page, with no additional configuration required.

```html
<script src="https://unpkg.com/@fluixi/template-runtime/dist/cdn/fluixi.global.js"></script>
<script>
  const { html, render, signal, define } = Fluixi;

  function Counter() {
    const n = signal(0);
    return html`<button @click=${() => n.set(n() + 1)}>count: ${n}</button>`;
  }
  define({ Counter });

  render(() => html`<div><Counter /></div>`, document.getElementById('app'));
</script>
```

Components defined with `define()` can be used with a bare tag, like `<Counter />`, or passed as a hole, like `<${Counter} />`. Bare tags resolve through the `define()` registry, while holes always work without registration. Module-scoped components are not visible to bare tags unless they are explicitly registered, as the compiled expressions are evaluated in global scope.

| Item | Value |
|------|-------|
| Size (CDN build) | 103 KB |
| Gzipped size | 33 KB |
| Content-Security-Policy requirement | 'unsafe-eval' is required |
