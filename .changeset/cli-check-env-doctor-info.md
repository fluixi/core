---
"@fluixi/cli": minor
"@fluixi/start": minor
---

- `fluixi check` now validates editor env/auth rules in CI and exits with code 1 on error, with `--strict` treating warnings as errors.
- `fluixi env` reports which `env.public` names are set, detects .env.example drift, warns about secrets that would ship, and writes environment types.
- `fluixi doctor` now reports when the same @fluixi package is installed twice, when ts-plugin is missing from tsconfig, and other environment problems.
- `fluixi info` now displays versions, adapter, modules, pages, and API routes.
