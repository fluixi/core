---
"@fluixi/api": minor
---

The new `postgresRateLimitStore(client, { table, schema, createTable })` shares rate-limit counts across all instances on any client using `query(text, values)`. If the database fails, hits are counted in memory until it is back.
