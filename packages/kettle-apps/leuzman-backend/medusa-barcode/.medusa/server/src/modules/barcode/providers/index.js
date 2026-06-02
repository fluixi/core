"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ProviderRegistry = exports.UpcItemDbProvider = exports.BarcodeLookupProvider = exports.EanSearchProvider = exports.GoogleBooksProvider = exports.OpenProductsFactsProvider = exports.OpenPetFoodFactsProvider = exports.OpenBeautyFactsProvider = exports.OpenFoodFactsProvider = exports.BaseBarcodeProvider = void 0;
exports.runProviderFallbackChain = runProviderFallbackChain;
exports.downloadImage = downloadImage;
const open_food_facts_1 = require("./open-food-facts");
const open_beauty_facts_1 = require("./open-beauty-facts");
const open_pet_food_facts_1 = require("./open-pet-food-facts");
const open_products_facts_1 = require("./open-products-facts");
const google_books_1 = require("./google-books");
const ean_search_1 = require("./ean-search");
const barcode_lookup_1 = require("./barcode-lookup");
const upcitemdb_1 = require("./upcitemdb");
var base_1 = require("./base");
Object.defineProperty(exports, "BaseBarcodeProvider", { enumerable: true, get: function () { return base_1.BaseBarcodeProvider; } });
var open_food_facts_2 = require("./open-food-facts");
Object.defineProperty(exports, "OpenFoodFactsProvider", { enumerable: true, get: function () { return open_food_facts_2.OpenFoodFactsProvider; } });
var open_beauty_facts_2 = require("./open-beauty-facts");
Object.defineProperty(exports, "OpenBeautyFactsProvider", { enumerable: true, get: function () { return open_beauty_facts_2.OpenBeautyFactsProvider; } });
var open_pet_food_facts_2 = require("./open-pet-food-facts");
Object.defineProperty(exports, "OpenPetFoodFactsProvider", { enumerable: true, get: function () { return open_pet_food_facts_2.OpenPetFoodFactsProvider; } });
var open_products_facts_2 = require("./open-products-facts");
Object.defineProperty(exports, "OpenProductsFactsProvider", { enumerable: true, get: function () { return open_products_facts_2.OpenProductsFactsProvider; } });
var google_books_2 = require("./google-books");
Object.defineProperty(exports, "GoogleBooksProvider", { enumerable: true, get: function () { return google_books_2.GoogleBooksProvider; } });
var ean_search_2 = require("./ean-search");
Object.defineProperty(exports, "EanSearchProvider", { enumerable: true, get: function () { return ean_search_2.EanSearchProvider; } });
var barcode_lookup_2 = require("./barcode-lookup");
Object.defineProperty(exports, "BarcodeLookupProvider", { enumerable: true, get: function () { return barcode_lookup_2.BarcodeLookupProvider; } });
var upcitemdb_2 = require("./upcitemdb");
Object.defineProperty(exports, "UpcItemDbProvider", { enumerable: true, get: function () { return upcitemdb_2.UpcItemDbProvider; } });
/**
 * In-process registry that manages all registered providers.
 *
 * Providers are stored in insertion order and sorted by priority on retrieval.
 * Custom providers can be registered at runtime via `register()`.
 */
class ProviderRegistry {
    constructor() {
        this.map = new Map();
    }
    /** Register (or replace) a provider. */
    register(provider) {
        this.map.set(provider.providerId, provider);
    }
    /** Unregister a provider by its ID. */
    unregister(providerId) {
        this.map.delete(providerId);
    }
    /** All enabled providers sorted ascending by priority (lower = first). */
    getEnabled() {
        return Array.from(this.map.values())
            .filter(p => p.isEnabled())
            .sort((a, b) => a.getPriority() - b.getPriority());
    }
    /** Get a specific provider by ID (or undefined if not registered). */
    get(id) {
        return this.map.get(id);
    }
    /** All registered providers regardless of enabled state. */
    getAll() {
        return Array.from(this.map.values());
    }
    /**
     * Instantiate the default providers from the module options and return a
     * ready-to-use registry.
     *
     * Lookup order (by ascending priority):
     *   10  OpenFoodFacts      — free, no key
     *   20  OpenBeautyFacts    — free, no key
     *   30  OpenPetFoodFacts   — free, no key
     *   40  OpenProductsFacts  — free, no key
     *   50  GoogleBooks        — free (quota raised with apiKey)
     *   60  EanSearch          — rate-limited, requires apiKey (auto-disabled when absent)
     *   70  BarcodeLookup      — rate-limited, requires apiKey (auto-disabled when absent)
     *   80  UpcItemDb          — rate-limited / paid, tried last
     */
    static fromOptions(options = {}) {
        const registry = new ProviderRegistry();
        // ── Free APIs ─────────────────────────────────────────────────────────────
        const offOpts = options.openFoodFacts ?? {};
        if (offOpts.enabled !== false) {
            registry.register(new open_food_facts_1.OpenFoodFactsProvider(offOpts));
        }
        const obfOpts = options.openBeautyFacts ?? {};
        if (obfOpts.enabled !== false) {
            registry.register(new open_beauty_facts_1.OpenBeautyFactsProvider(obfOpts));
        }
        const opffOpts = options.openPetFoodFacts ?? {};
        if (opffOpts.enabled !== false) {
            registry.register(new open_pet_food_facts_1.OpenPetFoodFactsProvider(opffOpts));
        }
        const oprodOpts = options.openProductsFacts ?? {};
        if (oprodOpts.enabled !== false) {
            registry.register(new open_products_facts_1.OpenProductsFactsProvider(oprodOpts));
        }
        const gbOpts = options.googleBooks ?? {};
        if (gbOpts.enabled !== false) {
            registry.register(new google_books_1.GoogleBooksProvider(gbOpts));
        }
        // ── Rate-limited / API-key APIs ───────────────────────────────────────────
        const esOpts = options.eanSearch ?? {};
        // Auto-disabled unless an apiKey is provided
        if (esOpts.enabled !== false && esOpts.apiKey) {
            registry.register(new ean_search_1.EanSearchProvider(esOpts));
        }
        const blOpts = options.barcodeLookup ?? {};
        if (blOpts.enabled !== false && blOpts.apiKey) {
            registry.register(new barcode_lookup_1.BarcodeLookupProvider(blOpts));
        }
        const upcOpts = options.upcItemDb ?? {};
        if (upcOpts.enabled !== false) {
            registry.register(new upcitemdb_1.UpcItemDbProvider(upcOpts));
        }
        return registry;
    }
}
exports.ProviderRegistry = ProviderRegistry;
/**
 * Query every enabled, compatible provider in priority order.
 *
 * Returns on the first successful (non-null) result.
 * Logs provider errors and continues the fallback chain.
 */
async function runProviderFallbackChain(registry, barcode, barcodeType, logger) {
    const providers = registry.getEnabled().filter(p => p.supports(barcodeType));
    for (const provider of providers) {
        try {
            const product = await provider.lookup(barcode);
            if (product) {
                logger.info(`[barcode] Provider "${provider.providerId}" found ${barcode}`);
                return { provider: provider.providerId, found: true, product };
            }
        }
        catch (err) {
            logger.error(`[barcode] Provider "${provider.providerId}" failed for ${barcode}: ${err.message}`, err);
        }
    }
    return { provider: "none", found: false };
}
/** Download a product image URL to an in-memory Buffer (for re-upload). */
async function downloadImage(url, timeoutMs = 15_000) {
    try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(tid);
        if (!res.ok)
            return null;
        const contentType = res.headers.get("content-type") ?? "image/jpeg";
        const arrayBuf = await res.arrayBuffer();
        return { buffer: Buffer.from(arrayBuf), contentType };
    }
    catch {
        return null;
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW5kZXguanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9iYXJjb2RlL3Byb3ZpZGVycy9pbmRleC50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFtSUEsNERBd0JDO0FBR0Qsc0NBa0JDO0FBL0tELHVEQUE2RDtBQUM3RCwyREFBK0Q7QUFDL0QsK0RBQWlFO0FBQ2pFLCtEQUFpRTtBQUNqRSxpREFBMEQ7QUFDMUQsNkNBQXdEO0FBQ3hELHFEQUE0RDtBQUM1RCwyQ0FBdUQ7QUFPdkQsK0JBQW1EO0FBQTFDLDJHQUFBLG1CQUFtQixPQUFBO0FBQzVCLHFEQUE4RDtBQUFyRCx3SEFBQSxxQkFBcUIsT0FBQTtBQUM5Qix5REFBZ0U7QUFBdkQsNEhBQUEsdUJBQXVCLE9BQUE7QUFDaEMsNkRBQWtFO0FBQXpELCtIQUFBLHdCQUF3QixPQUFBO0FBQ2pDLDZEQUFrRTtBQUF6RCxnSUFBQSx5QkFBeUIsT0FBQTtBQUNsQywrQ0FBMkQ7QUFBbEQsbUhBQUEsbUJBQW1CLE9BQUE7QUFDNUIsMkNBQXlEO0FBQWhELCtHQUFBLGlCQUFpQixPQUFBO0FBQzFCLG1EQUE2RDtBQUFwRCx1SEFBQSxxQkFBcUIsT0FBQTtBQUM5Qix5Q0FBd0Q7QUFBL0MsOEdBQUEsaUJBQWlCLE9BQUE7QUFFMUI7Ozs7O0dBS0c7QUFDSCxNQUFhLGdCQUFnQjtJQUE3QjtRQUNtQixRQUFHLEdBQXFDLElBQUksR0FBRyxFQUFFLENBQUE7SUEyRnBFLENBQUM7SUF6RkMsd0NBQXdDO0lBQ3hDLFFBQVEsQ0FBQyxRQUE2QjtRQUNwQyxJQUFJLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxRQUFRLENBQUMsVUFBVSxFQUFFLFFBQVEsQ0FBQyxDQUFBO0lBQzdDLENBQUM7SUFFRCx1Q0FBdUM7SUFDdkMsVUFBVSxDQUFDLFVBQWtCO1FBQzNCLElBQUksQ0FBQyxHQUFHLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxDQUFBO0lBQzdC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