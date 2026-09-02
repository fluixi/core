# @fluixi/cdn

This package provides import maps for the @fluixi framework, pre-generated and ready to use in the browser. It lists all the bare specifiers a browser needs to resolve, ensuring that every transitive subpath is included. These maps are pinned to the version of this package, ensuring consistency and reliability.

- `min.json` — includes `@fluixi/core`, `@fluixi/dom`, `@fluixi/utils`, and the graph behind them. Enough to write components by hand; `@fluixi/core` re-exports most of the DOM and reactive surface, so one import covers most of it.
- `templates.json` — adds compiling `html`` in the page. Load it with `min.json`.
- `full.json` — everything a browser can use, in one file.

The contents of the maps should be placed inline in a `<script type="importmap">` tag. Here is an example:

```html
<script type="importmap">
  { "imports": { "…": "paste the contents of min.json here" } }
</script>
<script type="module">
  import { render, signal } from '@fluixi/core';
</script>
```

A page that would rather not paste can fetch the file and add the map itself, which works because a map may be added before the first module loads:

```html
<script type="module">
  const map = await fetch('https://unpkg.com/@fluixi/cdn/dist/min.json').then((r) => r.json());
  const tag = document.createElement('script');
  tag.type = 'importmap';
  tag.textContent = JSON.stringify(map);
  document.head.appendChild(tag);

  const { render, signal } = await import('@fluixi/core');
</script>
```

Several maps in one page need Chromium 133 or newer, and `full.json` is the single-file way around that.
