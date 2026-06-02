"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeCategory = normalizeCategory;
exports.parseWeightGrams = parseWeightGrams;
exports.parseDimensionMm = parseDimensionMm;
exports.mergeMetadata = mergeMetadata;
exports.mergeNormalized = mergeNormalized;
exports.sanitizeNormalized = sanitizeNormalized;
exports.buildProductMetadata = buildProductMetadata;
// ─── String cleaning helpers ──────────────────────────────────────────────────
function capitalize(s) {
    return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}
function toTitleCase(s) {
    return s.split(/\s+/).map(capitalize).join(" ");
}
function cleanText(s, maxLen = 500) {
    if (!s)
        return undefined;
    const clean = s.replace(/\s+/g, " ").trim();
    return clean.length > maxLen ? clean.slice(0, maxLen) + "…" : clean;
}
// ─── Category slug normalisation ──────────────────────────────────────────────
const CATEGORY_ALIASES = {
    "food": "Food & Beverages",
    "beverage": "Food & Beverages",
    "beverages": "Food & Beverages",
    "drink": "Food & Beverages",
    "electronics": "Electronics",
    "electronic": "Electronics",
    "health": "Health & Beauty",
    "beauty": "Health & Beauty",
    "personal care": "Health & Beauty",
    "cleaning": "Home & Garden",
    "home": "Home & Garden",
    "garden": "Home & Garden",
    "clothing": "Apparel",
    "apparel": "Apparel",
    "fashion": "Apparel",
    "toys": "Toys & Games",
    "games": "Toys & Games",
    "sports": "Sports & Outdoors",
    "outdoors": "Sports & Outdoors",
    "automotive": "Automotive",
    "office": "Office Supplies",
    "pet": "Pet Supplies",
    "grocery": "Food & Beverages",
};
function normalizeCategory(raw) {
    if (!raw)
        return undefined;
    const lower = raw.toLowerCase().trim();
    for (const [key, value] of Object.entries(CATEGORY_ALIASES)) {
        if (lower.includes(key))
            return value;
    }
    return toTitleCase(raw);
}
// ─── Physical attribute parsers ──────────────────────────────────────────────
/**
 * Parse a human-readable weight/volume string to grams (integer).
 * Returns null if the string cannot be parsed.
 * Examples: "400g" → 400 | "1.5 kg" → 1500 | "500ml" → 500 | "16 oz" → 454
 */
function parseWeightGrams(raw) {
    if (!raw)
        return null;
    const m = raw.toLowerCase().trim().match(/^([\d.,]+)\s*(kg|mg|g|lbs?|fl\.?\s*oz|oz|cl|ml|l)\b/);
    if (!m)
        return null;
    const value = parseFloat(m[1].replace(",", "."));
    if (isNaN(value))
        return null;
    switch (m[2].replace(/\s+/g, "")) {
        case "kg": return Math.round(value * 1_000);
        case "mg": return Math.round(value / 1_000);
        case "g": return Math.round(value);
        case "lb":
        case "lbs": return Math.round(value * 453.592);
        case "oz": return Math.round(value * 28.3495);
        case "floz":
        case "fl.oz": return Math.round(value * 29.5735);
        case "l": return Math.round(value * 1_000);
        case "cl": return Math.round(value * 10);
        case "ml": return Math.round(value); // 1 ml ≈ 1 g
        default: return null;
    }
}
/**
 * Parse a dimension string like "2.5 x 8.5 x 4 inches" → { width, height, length } in mm.
 * Returns null when the format is unrecognised.
 */
function parseDimensionMm(raw) {
    if (!raw)
        return null;
    const m = raw.match(/([\d.]+)\s*[xX×]\s*([\d.]+)\s*[xX×]\s*([\d.]+)\s*(in(?:ches?)?|cm|mm|m)?/i);
    if (!m)
        return null;
    const nums = [parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])];
    if (nums.some(isNaN))
        return null;
    const unit = (m[4] ?? "mm").toLowerCase().trim();
    const toMm = (v) => {
        if (unit.startsWith("in"))
            return Math.round(v * 25.4);
        if (unit === "cm")
            return Math.round(v * 10);
        if (unit === "m")
            return Math.round(v * 1_000);
        return Math.round(v); // mm
    };
    return { width: toMm(nums[0]), height: toMm(nums[1]), length: toMm(nums[2]) };
}
// ─── Metadata value sanitisation ─────────────────────────────────────────────
/**
 * Flatten a metadata value to a type Medusa can store without surprises.
 * Objects → JSON string (capped at 2 KB), arrays → comma-joined or JSON string,
 * everything else → its primitive value.
 */
function sanitizeMetaValue(v) {
    if (v === null || v === undefined)
        return null;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean")
        return v;
    if (Array.isArray(v)) {
        const flat = v.map((item) => typeof item === "object" && item !== null ? JSON.stringify(item) : String(item)).join(", ");
        return flat.length > 2_048 ? flat.slice(0, 2_048) + "…" : flat;
    }
    // Plain object
    const json = JSON.stringify(v);
    return json.length > 2_048 ? json.slice(0, 2_048) + "…" : json;
}
// ─── Deep merge metadata ──────────────────────────────────────────────────────
function mergeMetadata(base, extra) {
    return { ...(base ?? {}), ...extra };
}
// ─── Deduplicate + merge from multiple providers ──────────────────────────────
/**
 * Merge several NormalizedProduct candidates (from different providers) into
 * one best-effort record.  Earlier entries win for non-empty string fields.
 */
function mergeNormalized(candidates) {
    if (!candidates.length)
        return null;
    const base = candidates[0];
    const result = { ...base };
    for (const c of candidates.slice(1)) {
        if (!result.description && c.description)
            result.description = c.description;
        if (!result.brand && c.brand)
            result.brand = c.brand;
        if (!result.category && c.category)
            result.category = c.category;
        if (!result.image && c.image)
            result.image = c.image;
        if (!result.weight && c.weight)
            result.weight = c.weight;
        if (c.metadata) {
            result.metadata = mergeMetadata(result.metadata, c.metadata);
        }
    }
    return sanitizeNormalized(result);
}
// ─── Final sanitization ───────────────────────────────────────────────────────
/**
 * Enforce max-lengths, strip unsafe whitespace and normalise category names.
 * Call before saving to DB or passing to Medusa product creation.
 */
function sanitizeNormalized(p) {
    return {
        title: cleanText(p.title, 250) ?? `Product ${p.barcode}`,
        description: cleanText(p.description, 2000),
        barcode: p.barcode.trim(),
        brand: cleanText(p.brand, 150),
        category: normalizeCategory(p.category),
        image: p.image?.trim(),
        weight: cleanText(p.weight, 60),
        metadata: p.metadata,
    };
}
/** Build the metadata object to attach to the Medusa product. */
function buildProductMetadata(normalized, provider) {
    const base = {
        barcode: normalized.barcode,
        barcode_brand: normalized.brand ?? null,
        barcode_category: normalized.category ?? null,
        barcode_weight: normalized.weight ?? null,
        source_provider: provider,
    };
    // Sanitize every provider-specific metadata value so nothing becomes [object Object]
    for (const [key, value] of Object.entries(normalized.metadata ?? {})) {
        base[key] = sanitizeMetaValue(value);
    }
    // Remove null entries to keep the metadata object tidy
    for (const key of Object.keys(base)) {
        if (base[key] === null)
            delete base[key];
    }
    return base;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm9ybWFsaXplLXByb2R1Y3QuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9iYXJjb2RlL3V0aWxzL25vcm1hbGl6ZS1wcm9kdWN0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBOENBLDhDQU9DO0FBU0QsNENBb0JDO0FBTUQsNENBZ0JDO0FBeUJELHNDQUtDO0FBUUQsMENBa0JDO0FBUUQsZ0RBV0M7QUFHRCxvREF1QkM7QUEzTUQsaUZBQWlGO0FBRWpGLFNBQVMsVUFBVSxDQUFDLENBQVM7SUFDM0IsT0FBTyxDQUFDLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxHQUFHLENBQUMsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUE7QUFDN0QsQ0FBQztBQUVELFNBQVMsV0FBVyxDQUFDLENBQVM7SUFDNUIsT0FBTyxDQUFDLENBQUMsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLEdBQUcsQ0FBQyxVQUFVLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLENBQUE7QUFDakQsQ0FBQztBQUVELFNBQVMsU0FBUyxDQUFDLENBQXFCLEVBQUUsTUFBTSxHQUFHLEdBQUc7SUFDcEQsSUFBSSxDQUFDLENBQUM7UUFBRSxPQUFPLFNBQVMsQ0FBQTtJQUN4QixNQUFNLEtBQUssR0FBRyxDQUFDLENBQUMsT0FBTyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsQ0FBQyxJQUFJLEVBQUUsQ0FBQTtJQUMzQyxPQUFPLEtBQUssQ0FBQyxNQUFNLEdBQUcsTUFBTSxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLENBQUMsRUFBRSxNQUFNLENBQUMsR0FBRyxHQUFHLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQTtBQUNyRSxDQUFDO0FBRUQsaUZBQWlGO0FBRWpGLE1BQU0sZ0JBQWdCLEdBQTJCO0lBQy9DLE1BQU0sRUFBZSxrQkFB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