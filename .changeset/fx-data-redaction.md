---
"@fluixi/dom": minor
"@fluixi/server": minor
---

`__FX_DATA__` redaction. Resource data resolved during SSR is serialized into the page
(`window.__FX_DATA__`) so the client seeds resources without refetching — but it's
visible to anyone viewing source. `setDataRedactor((value, id) => …)` transforms or drops
each value before serialization: return the value to embed, or `undefined` to omit the
entry (the client then refetches that resource). A throwing redactor omits rather than
leaks. Exported from `@fluixi/dom` and `@fluixi/server`.

```ts
import { setDataRedactor } from '@fluixi/server';
setDataRedactor((v) => {
  if (v && typeof v === 'object' && 'passwordHash' in v) {
    const { passwordHash, ...safe } = v as any;
    return safe;
  }
  return v;
});
```
