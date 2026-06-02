# medusa-barcode

Production-ready barcode scanning, multi-provider lookup, and automatic product
creation plugin for **MedusaJS v2**.

---

## Features

| Feature | Status |
|---|---|
| EAN-13 / UPC-A / UPC-E / Code128 / QR support | ✅ |
| GS1 checksum validation | ✅ |
| PostgreSQL cache (configurable TTL) | ✅ |
| Multi-provider fallback chain | ✅ |
| OpenFoodFacts provider | ✅ |
| UpcItemDb provider (trial + paid) | ✅ |
| Extensible provider registry | ✅ |
| Automatic Medusa product creation | ✅ |
| Default variant with EAN / UPC / barcode fields | ✅ |
| Workflow-based orchestration (transaction-safe) | ✅ |
| Batch import (up to 200 barcodes) | ✅ |
| Admin REST API | ✅ |
| Zod request validation | ✅ |
| Startup cache purge | ✅ |

---

## Installation

```bash
# From the leuzman-backend workspace
pnpm add medusa-barcode
```

---

## medusa-config.ts

```typescript
import { defineConfig } from "@medusajs/framework/utils"

export default defineConfig({
  modules: [
    {
      resolve: "./src/modules/barcode",
      options: {
        // NOTE: "providers" is reserved by Medusa's module loader — use "providerConfig"
        providerConfig: {
          openFoodFacts: {
            enabled: true,
            country: "world",   // subdomain: world | fr | de | es …
            timeout: 12000,
            retries: 2,
            priority: 10,       // lower = higher priority in fallback chain
          },
          upcItemDb: {
            enabled: true,
            apiKey:  process.env.UPCITEMDB_API_KEY,   // omit for trial tier
            timeout: 10000,
            retries: 2,
            priority: 20,
          },
        },
        cache: {
          ttl: 86400,   // seconds — 24 h default
        },
      },
    },
  ],
})
```

---

## REST API

### `POST /admin/barcodes/lookup`

Lookup a barcode via cache → providers.

```json
// Request
{ "barcode": "3017620422003", "skipCache": false }

// Response 200
{
  "found": true,
  "fromCache": false,
  "provider": "open-food-facts",
  "barcodeType": "ean13",
  "normalized": "3017620422003",
  "product": {
    "title": "Nutella",
    "brand": "Ferrero",
    "category": "Spreads",
    "image": "https://images.openfoodfacts.org/…/front.jpg",
    "weight": "400g",
    "barcode": "3017620422003"
  }
}
```

---

### `POST /admin/barcodes/create-from-barcode`

Lookup and create a draft Medusa product.

```json
// Request
{
  "barcode": "3017620422003",
  "salesChannelIds": ["sc_xxx"],
  "categoryIds": ["pcat_xxx"],
  "publishImmediately": false
}

// Response 201
{
  "created": true,
  "product_id": "prod_01JXXXXXXX",
  "variant_id": "variant_01JXXXXXXX",
  "provider": "open-food-facts",
  "title": "Nutella"
}

// Response 200 (already exists)
{
  "created": false,
  "existing": true,
  "product_id": "prod_01JXXXXXXX",
  "variant_id": "variant_01JXXXXXXX"
}
```

---

### `POST /admin/barcodes/batch`

Import up to 200 barcodes in one request.

```json
// Request
{
  "barcodes": ["3017620422003", "012000161155", "0075457179247"],
  "salesChannelIds": ["sc_xxx"],
  "skipExisting": true
}

// Response 207
{
  "total": 3,
  "created": 2,
  "skipped": 1,
  "failed": 0,
  "results": [...]
}
```

---

### `GET /admin/barcodes`

List all BarcodeProduct records.

Query params: `limit`, `offset`, `product_id`

---

### `GET /admin/barcodes/:barcode`

Get BarcodeProduct + latest cache entry for a specific barcode.

---

### `DELETE /admin/barcodes/:barcode`

Remove the BarcodeProduct mapping and invalidate cache. Does **not** delete the
Medusa product.

---

### `GET /admin/barcodes/cache`

Return cache statistics: `{ "total": N, "expired": M }`.

### `DELETE /admin/barcodes/cache`

Purge all expired cache entries: `{ "purged": N }`.

---

## Custom Provider

Extend `BaseBarcodeProvider` and register it at startup:

```typescript
import { BaseBarcodeProvider } from "medusa-barcode"
import type { NormalizedProduct } from "medusa-barcode"

class MyCustomProvider extends BaseBarcodeProvider {
  constructor() {
    super("my-provider", { priority: 5 })
  }

  supports(barcodeType: string): boolean {
    return barcodeType === "ean13"
  }

  async lookup(barcode: string): Promise<NormalizedProduct | null> {
    const data = await this.withRetry(() =>
      this.fetchWithTimeout(`https://myapi.example/products/${barcode}`)
        .then(r => r.json())
    )
    if (!data?.found) return null
    return {
      title:   data.name,
      barcode,
      brand:   data.brand,
    }
  }
}
```

Then in a loader:

```typescript
// src/loaders/register-providers.ts
import { BARCODE_MODULE }   from "medusa-barcode"
import { MyCustomProvider } from "./my-custom-provider"

export default async function({ container }) {
  const svc = container.resolve(BARCODE_MODULE)
  svc.registerProvider(new MyCustomProvider())
}
```

---

## Barcode Types Supported

| Type | Example | Validation |
|---|---|---|
| EAN-13 | `3017620422003` | GS1 checksum |
| UPC-A | `012000161155` | GS1 checksum |
| UPC-E | `01210501` | Expands + validates |
| Code128 | `LOT-2024-ABC` | Length ≥ 1 |
| QR | `https://…` | Any URL |
| DataMatrix | `A3F9BC00…` | Hex pattern |

---

## Workflow

The `lookupAndCreateProductWorkflow` is transaction-safe:

```
validateBarcodeStep
  → checkExistingBarcodeProductStep
  → lookupBarcodeStep             ← cache + provider fallback
  → downloadThumbnailStep         ← best-effort, never fails
  → createMedusaProductStep       ← compensation: deleteProducts
  → saveBarcodeRelationStep       ← compensation: removeBarcodeProduct
```

If any step after product creation fails, the compensation chain rolls back the
product and the BarcodeProduct row automatically.
