---
"@fluixi/reactive": patch
---

Store setter now accepts array paths like `[0].text`, `users[*].name`, `[0][1]`, supports wildcard writes that take the element, optional steps, and writes of three and four steps; `createDebouncedResource(empty string, fetcher)` now lets `setQuery` accept any string.
