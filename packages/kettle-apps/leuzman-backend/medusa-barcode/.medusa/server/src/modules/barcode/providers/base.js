"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BaseBarcodeProvider = void 0;
const constants_1 = require("../constants");
/** Delay helper for retry back-off */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
/**
 * Abstract base for all barcode lookup providers.
 *
 * Concrete providers must implement:
 *   - `lookup(barcode)` — query the external API
 *   - `supports(barcodeType)` — return false to skip this provider for unsupported formats
 *
 * They get for free:
 *   - `fetchWithTimeout` — AbortController-wrapped fetch
 *   - `withRetry`        — exponential back-off retry loop
 *   - config merging     — enables/timeout/retries/priority
 */
class BaseBarcodeProvider {
    constructor(providerId, options = {}) {
        this.providerId = providerId;
        this.config = {
            enabled: options.enabled ?? true,
            timeout: options.timeout ?? constants_1.DEFAULT_LOOKUP_TIMEOUT_MS,
            retries: options.retries ?? constants_1.DEFAULT_LOOKUP_RETRIES,
            priority: options.priority ?? constants_1.DEFAULT_PROVIDER_PRIORITY,
            apiKey: options.apiKey,
        };
    }
    /** Whether this provider participates in lookups */
    isEnabled() {
        return this.config.enabled;
    }
    /** Lower = runs first in the fallback chain */
    getPriority() {
        return this.config.priority;
    }
    // ─── Protected helpers ───────────────────────────────────────────────────
    /**
     * `fetch` wrapped with an AbortController timeout.
     * Throws `DOMException` (name: "AbortError") on timeout.
     */
    async fetchWithTimeout(url, init = {}) {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), this.config.timeout);
        try {
            return await fetch(url, { ...init, signal: controller.signal });
        }
        finally {
            clearTimeout(tid);
        }
    }
    /**
     * Run `fn` up to `config.retries + 1` times with exponential back-off.
     * Rethrows the last error when all attempts are exhausted.
     */
    async withRetry(fn) {
        let lastError;
        for (let attempt = 0; attempt <= this.config.retries; attempt++) {
            try {
                return await fn();
            }
            catch (err) {
                lastError = err;
                if (attempt < this.config.retries) {
                    await delay(500 * Math.pow(2, attempt)); // 500 ms, 1 s, 2 s …
                }
            }
        }
        throw lastError;
    }
}
exports.BaseBarcodeProvider = BaseBarcodeProvider;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFzZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uLy4uL3NyYy9tb2R1bGVzL2JhcmNvZGUvcHJvdmlkZXJzL2Jhc2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsNENBSXFCO0FBR3JCLHNDQUFzQztBQUN0QyxNQUFNLEtBQUssR0FBRyxDQUFDLEVBQVUsRUFBRSxFQUFFLENBQUMsSUFBSSxPQUFPLENBQU8sT0FBTyxDQUFDLEVBQUUsQ0FBQyxVQUFVLENBQUMsT0FBTyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUE7QUFFbkY7Ozs7Ozs7Ozs7O0dBV0c7QUFDSCxNQUFzQixtQkFBbUI7SUFJdkMsWUFBWSxVQUFrQixFQUFFLFVBQTBDLEVBQUU7UUFDMUUsSUFBSSxDQUFDLFVBQVUsR0FBRyxVQUFVLENBQUE7UUFDNUIsSUFBSSxDQUFDLE1BQU0sR0FBRztZQUNaLE9BQU8sRUFBRyxPQUFPLENBQUMsT0FBTyxJQUFLLElBQUk7WUFDbEMsT0FBTyxFQUFHLE9BQU8sQ0FBQyxPQUFPLElBQUsscUNBQXlCO1lBQ3ZELE9BQU8sRUFBRyxPQUFPLENBQUMsT0FBTyxJQUFLLGtDQUFzQjtZQUNwRCxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsSUFBSSxxQ0FBeUI7WUFDdkQsTUFBTSxFQUFJLE9BQU8sQ0FBQyxNQUFNO1NBQ3pCLENBQUE7SUFDSCxDQUFDO0lBRUQsb0RBQW9EO0lBQ3BELFNBQVM7UUFDUCxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsT0FBTyxDQUFBO0lBQzVCLENBQUM7SUFFRCwrQ0FBK0M7SUFDL0MsV0FBVztRQUNULE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxRQUFRLENBQUE7SUFDN0IsQ0FBQztJQWVELDRFQUE0RTtJQUU1RTs7O09BR0c7SUFDTyxLQUFLLENBQUMsZ0JBQWdCLENBQzlCLEdBQVcsRUFDWCxPQUFvQixFQUFFO1FBRXRCLE1BQU0sVUFBVSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUE7UUFDeEMsTUFBTSxHQUFHLEdBQUcsVUFBVSxDQUFDLEdBQUcsRUFBRSxDQUFDLFVBQVUsQ0FBQyxLQUFLLEVBQUUsRUFBRSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxDQUFBO1FBQ3JFLElBQUksQ0FBQztZQUNILE9BQU8sTUFBTSxLQUFLLENBQUMsR0FBRyxFQUFFLEVBQUUsR0FBRyxJQUFJLEVBQUUsTUFBTSxFQUFFLFVBQVUsQ0FBQyxNQUFNLEVBQUUsQ0FBQyxDQUFBO1FBQ2pFLENBQUM7Z0JBQVMsQ0FBQztZQUNULFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQTtRQUNuQixDQUFDO0lBQ0gsQ0FBQztJQUVEOzs7T0FHRztJQUNPLEtBQUssQ0FBQyxTQUFTLENBQUksRUFBb0I7UUFDL0MsSUFBSSxTQUFrQixDQUFBO1FBQ3RCLEtBQUssSUFBSSxPQUFPLEdBQUcsQ0FBQyxFQUFFLE9BQU8sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxPQUFPLEVBQUUsRUFBRSxDQUFDO1lBQ2hFLElBQUksQ0FBQztnQkFDSCxPQUFPLE1BQU0sRUFBRSxFQUFFLENBQUE7WUFDbkIsQ0FBQztZQUFDLE9BQU8sR0FBRyxFQUFFLENBQUM7Z0JBQ2IsU0FBUyxHQUFHLEdBQUcsQ0FBQTtnQkFDZixJQUFJLE9BQU8sR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDLE9BQU8sRUFBRSxDQUFDO29CQUNsQyxNQUFNLEtBQUssQ0FBQyxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDLENBQUMsQ0FBQSxDQUFDLHFCQUFxQjtnQkFDL0QsQ0FBQztZQUNILENBQUM7UUFDSCxDQUFDO1FBQ0QsTUFBTSxTQUFTLENBQUE7SUFDakIsQ0FBQztDQUNGO0FBM0VELGtEQTJFQyJ9