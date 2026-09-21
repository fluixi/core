---
"@fluixi/start": minor
"@fluixi/cli": minor
---

`fluixi build --format=web-component` emits each component named in a `webComponents` config block as a self-contained file: a page loads it with a `<script type="module">` and needs no Fluixi package installed. `--format=fluixi` emits the same elements with the runtime left as imports, so an app running several of them shares one copy. An app that declares `webComponents` also gets the files beside its own bundles on a normal build.
