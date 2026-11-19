# @fluixi/utils

## 1.0.0-alpha.110

## 1.0.0-alpha.109

### Patch Changes

- c530572: The library now builds with mix-builder 0.4.3, sharing chunks across ES module entries so each module and its state appears only once and the published ES module files are 50-80 % smaller, with CDN globals using a single copy of the signal graph.

## 1.0.0-alpha.108

## 1.0.0-alpha.107

## 1.0.0-alpha.106

## 1.0.0-alpha.105

## 1.0.0-alpha.104

## 1.0.0-alpha.103

## 1.0.0-alpha.102

## 1.0.0-alpha.101

## 1.0.0-alpha.100

## 1.0.0-alpha.99

## 1.0.0-alpha.98

## 1.0.0-alpha.97

## 1.0.0-alpha.96

## 1.0.0-alpha.95

## 1.0.0-alpha.94

## 1.0.0-alpha.93

### Minor Changes

- 5dcdf9f: The cookie codec now resides at `@fluixi/utils/cookie` and `@fluixi/auth` re-exports it, so imports from `@fluixi/auth` continue to work. Update any code that writes cookies to avoid invalid names, paths, or domains containing `;` or whitespace (which now throw a `TypeError`). `SameSite=None` now always adds Secure, and `parseCookies` keeps a malformed escape as raw text instead of throwing.

## 1.0.0-alpha.92

## 1.0.0-alpha.91

## 1.0.0-alpha.90

## 1.0.0-alpha.89

## 1.0.0-alpha.88

## 1.0.0-alpha.87

## 1.0.0-alpha.86

## 1.0.0-alpha.85

## 1.0.0-alpha.84

### Patch Changes

- 9565405: The published entry files now include a copyright banner, and `@fluixi/dom`, `@fluixi/jsx`, `@fluixi/template-parser` and `@fluixi/template-runtime` ship unminified, which their build configs had always asked for.

## 1.0.0-alpha.83

## 1.0.0-alpha.82

## 1.0.0-alpha.81

## 1.0.0-alpha.80

## 1.0.0-alpha.79

## 1.0.0-alpha.78

## 1.0.0-alpha.77

### Patch Changes

- 017317d: Remove export subpaths that pointed at modules that were never there. `@fluixi/dom/dom`,
  `@fluixi/reactive/helpers` and `@fluixi/utils/{array,object,primitive,dom,functions}/types`
  all failed to resolve, so nothing could have been importing them.

  Also fixes `@fluixi/dom/control-flow` in `publishConfig.exports`, which still pointed at
  the old path — the dev export map was corrected but the published one is what npm reads.

## 1.0.0-alpha.76

## 1.0.0-alpha.75

## 1.0.0-alpha.74

## 1.0.0-alpha.73

## 1.0.0-alpha.72

## 1.0.0-alpha.71

## 1.0.0-alpha.70

## 1.0.0-alpha.69

## 1.0.0-alpha.68

## 1.0.0-alpha.67

## 1.0.0-alpha.66

## 1.0.0-alpha.65

## 1.0.0-alpha.64

## 1.0.0-alpha.63

## 1.0.0-alpha.62

## 1.0.0-alpha.61

## 1.0.0-alpha.60

## 1.0.0-alpha.59

## 1.0.0-alpha.58

## 1.0.0-alpha.57

## 1.0.0-alpha.56

### Patch Changes

- 59ddb69: Drop the unused `tslib` dependency. `importHelpers` is on in tsconfig, but these packages ship esbuild-bundled output that inlines the TS helpers — nothing in the published code imports `tslib`, so it was dead weight in `dependencies`.

## 1.0.0-alpha.55

### Patch Changes

- 5cfb7a6: Add a `description` field to packages that were missing one. Without it, npm's profile/list view fell back to the first README line — the raw `<p align="center">` logo block — instead of a summary.
- daa7af2: Update READMEs for public npm: drop the GitHub Packages `.npmrc` install instructions (no auth needed on public npm) and replace the GitHub Packages registry badge with an npm version badge.

## 1.0.0-alpha.54

### Patch Changes

- e005c4c: Add the `license` field (MIT) and bundle a `LICENSE` file in every package, so npm shows the license and ships it in the tarball.

## 1.0.0-alpha.53

## 1.0.0-alpha.52

## 1.0.0-alpha.51

## 1.0.0-alpha.50

## 1.0.0-alpha.49

## 1.0.0-alpha.48

## 1.0.0-alpha.47

## 1.0.0-alpha.46

## 1.0.0-alpha.45

## 1.0.0-alpha.44

## 1.0.0-alpha.43

## 1.0.0-alpha.42

### Patch Changes

- 3f0e665: Fix control flow `Show` types to support JSX.Element because before it was required to use `<Show>{()=><Component />}</Show>` the fix now directly allow `<Show><Component /></Show>`

## 1.0.0-alpha.41

## 1.0.0-alpha.40

## 1.0.0-alpha.39

## 1.0.0-alpha.38

## 1.0.0-alpha.37

## 1.0.0-alpha.36

## 1.0.0-alpha.35

## 1.0.0-alpha.34

## 1.0.0-alpha.33

## 1.0.0-alpha.32

## 1.0.0-alpha.31

## 1.0.0-alpha.30

## 1.0.0-alpha.29

## 1.0.0-alpha.28

## 1.0.0-alpha.27

## 1.0.0-alpha.26

## 1.0.0-alpha.25

## 1.0.0-alpha.24

## 1.0.0-alpha.23

## 1.0.0-alpha.22

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
