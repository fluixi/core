# @fluixi/cdn

This package provides the import maps a page needs, already generated, and a script that installs one. It is designed for developers who want to load the framework from a script tag, with no bundler. It lists all the bare specifiers a browser needs to resolve, ensuring that every transitive subpath is included. These maps are pinned to the version of this package. Their entries point at bundled copies of the packages shipped here, in `dist/esm`, so a page fetches a few dozen files at most rather than one per module.

The maps are available in three versions: `min`, `templates`, and `full`. Each comes as a `.json` file to read or paste and a `.js` file to load. The `min` version includes `@fluixi/core`, `@fluixi/dom`, `@fluixi/utils`, and the graph behind them. It is enough to write components by hand, as `@fluixi/core` re-exports most of the DOM and reactive surface, so one import covers most of it. The `templates` version adds compiling `html`` in the page and must be loaded with `min`. The `full` version includes everything a browser can use, in one file.

To use one of the maps, include the corresponding `.js` file before the first module script. For example:

```html
<script src="https://unpkg.com/@fluixi/cdn/dist/min.js"></script>
<script type="module">
  import { render, signal } from '@fluixi/core';
</script>
```

Every map has a development counterpart, `min.development.js` and so on, pointing at unminified bundles in `dist/esm-dev` that keep Fluixi's development warnings and devtools reporting. Use it while building the page and the production map once it is deployed:

```html
<script src="https://unpkg.com/@fluixi/cdn/dist/min.development.js"></script>
```

If a page prefers to hold the map itself or build its markup from something other than a script tag, the `.json` file can be used with this block:

```html
<script type="importmap">
  { "imports": { "…": "paste the contents of min.json here" } }
</script>
```

An inline map is registered when its element is inserted, so the second file cannot merge into the first one's map and installs its own. Several maps in one page need Chromium 133 or newer, and `full` is the single-file way around that. The script says so if the browser turns its map down.
