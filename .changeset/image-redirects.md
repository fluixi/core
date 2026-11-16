---
"@fluixi/start": patch
---

createImageHandler now follows redirects of a remote source one by one, checking each target against allowed domains and only http/https, refusing with 403 on disallowed hosts and returning 502 after more than 5 redirects.
