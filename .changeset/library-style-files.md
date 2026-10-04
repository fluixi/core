---
"@fluixi/compiler": minor
---

In a library build (`build.lib`), component styles are emitted as `<name>.css` files alongside each module and imported relatively, with a matching `<name>.css.js` loader, and a build will error if it would overwrite an existing `<name>.css` file.
