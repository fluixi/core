---
"@fluixi/compiler": minor
---

`transformTemplates` now extracts `<style>` and `<style scoped>` blocks from JSX, processes them with the host's CSS engine via `styles: { process(css, from) }`, and returns the resulting styles while adding a deterministic `data-fx-s` attribute to rendered elements for scoped styles and leaving unprocessable blocks in the output with diagnostics.
