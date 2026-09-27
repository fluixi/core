---
"@fluixi/cli": minor
---

fluixi add auth now asks for a provider and token mode, writes the wiring, and installs the package (use `--no-install` to skip); `@fluixi/cli/scaffold` exposes the generators' code with no dependencies and a `fluixi.config` without an env block receives one.
