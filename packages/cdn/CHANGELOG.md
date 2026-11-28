# @fluixi/cdn

## 1.0.0-alpha.115

## 1.0.0-alpha.114

## 1.0.0-alpha.113

### Minor Changes

- cc64846: Each CDN global file now includes an unminified development copy under `dist/cdn/dev/`, and the `@fluixi/cdn` package ships `*.development.js` files and corresponding map files that point to the development bundles.

### Patch Changes

- 8079702: The CDN files and import-map bundles are now production builds, so development warnings and devtools reporting are omitted and the files are smaller.

## 1.0.0-alpha.112

## 1.0.0-alpha.111

## 1.0.0-alpha.110

### Patch Changes

- 3efa459: Import maps now point at bundled copies shipped in the package, so a page importing `@fluixi/core` fetches about 25 files instead of about 180.

## 1.0.0-alpha.109

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

## 0.1.0-alpha.1

### Minor Changes

- 3ba7d01: Three new files, `min.js`, `templates.js` and `full.js`, now load their corresponding import maps into the page when included with an ordinary script tag, allowing versioned maps to be used without manually embedding or fetching them.

## 0.1.0-alpha.0

### Minor Changes

- 231a169: The framework now includes pre-generated import maps in `min.json`, `templates.json`, and `full.json` to simplify loading it from a CDN without manually specifying every subpath.
