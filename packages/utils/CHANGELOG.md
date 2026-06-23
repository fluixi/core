# @fluixi/utils

## 1.0.0-alpha.21

## 1.0.0-alpha.20

## 1.0.0-alpha.19

## 1.0.0-alpha.18

## 1.0.0-next.17

## 1.0.0-next.16

## 1.0.0-next.15

## 1.0.0-next.14

## 0.4.0-next.13

## 0.4.0-next.12

## 0.4.0-next.11

## 0.4.0-next.10

## 0.4.0-next.9

## 0.4.0-next.8

## 0.4.0-next.7

## 0.4.0-next.6

## 0.4.0-next.5

## 0.4.0-next.4

### Patch Changes

- 21d2c18: ---

  "@fluixi/kettlejs": patch

  ***

  Tidy kettlejs internals: remove the dead `dev-server/` and `builder/` stubs and
  ~4,500 lines of extensionless router scratch files (`actual`/`curr`/`known`/`lts`/
  `rs`/`rt`) — all unexported and unimportable. No public API change.

## 0.4.0-next.3

## 0.4.0-next.2

## 0.4.0-next.1

## 0.4.0-next.0

## 0.3.0

## 0.2.1

### Patch Changes

- aa028bd: Include `src` in the published tarball (like the other `@fluixi/*` packages).
  Consumers that resolve `@fluixi/*` via the `development` export condition (the
  TypeScript source — used in dev to keep a single reactive instance) were failing
  on `@fluixi/router` / `@fluixi/utils` with "Failed to resolve entry".

## 0.2.0

## 0.1.0

## 0.0.1
