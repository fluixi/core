---
"@fluixi/storage": minor
---

`createStorage({ encryption: { keyProvider } })` now returns an async storage where `set(key, value, { encrypt: true })` stores the item encrypted with AES-256-GCM and `get` automatically decrypts it, while unencrypted items remain unchanged.
