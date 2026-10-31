---
"@fluixi/dom": patch
"@fluixi/start": patch
---

In a production browser build the `data-fluixi` attribute on the mount element is empty because the check reads `process.env.NODE_ENV` exactly as a bundler replaces it, while the previous `process.env?.NODE_ENV` survived the build and read as `development`. `fluixi start` sets `NODE_ENV` to `production` when the deployment leaves it unset.
