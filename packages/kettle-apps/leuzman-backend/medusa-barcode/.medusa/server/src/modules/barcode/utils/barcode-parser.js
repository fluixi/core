"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseBarcode = parseBarcode;
exports.upcToEan13 = upcToEan13;
exports.computeEan13CheckDigit = computeEan13CheckDigit;
const constants_1 = require("../constants");
// ─── Checksum helpers ─────────────────────────────────────────────────────────
/**
 * GS1 checksum validation (shared by EAN-13 and UPC-A).
 *
 * Algorithm: sum of (digit × weight) where weights alternate 1, 3
 * starting from the LEFT; the total must be divisible by 10.
 */
function validateGS1Checksum(digits) {
    const d = digits.split("").map(Number);
    const len = d.length;
    let sum = 0;
    for (let i = 0; i < len; i++) {
        sum += d[i] * (i % 2 === 0 ? 1 : 3);
    }
    return sum % 10 === 0;
}
/** Expand UPC-E (8 digit) to its full UPC-A (12 digit) equivalent. */
function expandUpcE(upce) {
    const s = upce.startsWith("0") ? upce.slice(1, 7) : upce.slice(1, 7);
    const manufacturer = s.slice(0, 6);
    const check = upce.at(-1) ?? "0";
    const lastDigit = parseInt(manufacturer.at(-1) ?? "0", 10);
    let full;
    switch (lastDigit) {
        case 0:
        case 1:
        case 2:
            full = `${manufacturer.slice(0, 2)}${lastDigit}0000${manufacturer.slice(2, 5)}`;
            break;
        case 3:
            full = `${manufacturer.slice(0, 3)}00000${manufacturer.slice(3, 5)}`;
            break;
        case 4:
            full = `${manufacturer.slice(0, 4)}00000${manufacturer.slice(4, 5)}`;
            break;
        default:
            full = `${manufacturer.slice(0, 5)}0000${lastDigit}`;
    }
    return `0${full}${check}`;
}
// ─── Type detection ───────────────────────────────────────────────────────────
function detectType(raw) {
    const trimmed = raw.trim();
    // EAN-13: exactly 13 digits
    if (/^\d{13}$/.test(trimmed))
        return constants_1.BARCODE_TYPES.EAN13;
    // UPC-A: exactly 12 digits
    if (/^\d{12}$/.test(trimmed))
        return constants_1.BARCODE_TYPES.UPC_A;
    // UPC-E: 8 digits (first digit 0 or 1)
    if (/^[01]\d{7}$/.test(trimmed))
        return constants_1.BARCODE_TYPES.UPC_E;
    // QR payload: starts with http/https, or is a URL-like string > 20 chars
    if (/^https?:\/\//i.test(trimmed) || trimmed.length > 20)
        return constants_1.BARCODE_TYPES.QR;
    // DataMatrix: hexadecimal blocks or specific patterns
    if (/^[A-F0-9]{20,}$/i.test(trimmed))
        return constants_1.BARCODE_TYPES.DATAMATRIX;
    // Code128: alphanumeric / mixed — everything else
    return constants_1.BARCODE_TYPES.CODE128;
}
// ─── Normalisation ────────────────────────────────────────────────────────────
function normalise(raw, type) {
    const trimmed = raw.trim();
    switch (type) {
        case constants_1.BARCODE_TYPES.EAN13:
        case constants_1.BARCODE_TYPES.UPC_A:
        case constants_1.BARCODE_TYPES.UPC_E:
            return trimmed.replace(/\D/g, "");
        default:
            return trimmed;
    }
}
// ─── Validation ───────────────────────────────────────────────────────────────
function validate(normalized, type) {
    switch (type) {
        case constants_1.BARCODE_TYPES.EAN13: {
            if (normalized.length !== 13) {
                return { isValid: false, error: "EAN-13 must be exactly 13 digits" };
            }
            const ok = validateGS1Checksum(normalized);
            return { isValid: ok, checkDigitValid: ok, error: ok ? undefined : "EAN-13 checksum invalid" };
        }
        case constants_1.BARCODE_TYPES.UPC_A: {
            if (normalized.length !== 12) {
                return { isValid: false, error: "UPC-A must be exactly 12 digits" };
            }
            // Pad to 13 digits by prepending '0' and run EAN-13 checksum
            const ok = validateGS1Checksum("0" + normalized);
            return { isValid: ok, checkDigitValid: ok, error: ok ? undefined : "UPC-A checksum invalid" };
        }
        case constants_1.BARCODE_TYPES.UPC_E: {
            if (normalized.length !== 8) {
                return { isValid: false, error: "UPC-E must be exactly 8 digits" };
            }
            // Expand to UPC-A then validate
            const expanded = expandUpcE(normalized);
            const ok = validateGS1Checksum("0" + expanded);
            return { isValid: ok, checkDigitValid: ok, error: ok ? undefined : "UPC-E checksum invalid" };
        }
        case constants_1.BARCODE_TYPES.CODE128:
            // Code128 is variable-length; we accept anything ≥ 1 char
            return { isValid: normalized.length >= 1 };
        case constants_1.BARCODE_TYPES.QR:
        case constants_1.BARCODE_TYPES.DATAMATRIX:
            return { isValid: normalized.length >= 1 };
        default:
            return { isValid: false, error: "Unrecognised barcode type" };
    }
}
// ─── Public API ───────────────────────────────────────────────────────────────
/**
 * Parse and validate a raw barcode string.
 *
 * @example
 * const parsed = parseBarcode("3017620422003")
 * // { raw: "3017620422003", type: "ean13", normalized: "3017620422003", isValid: true, checkDigitValid: true }
 */
function parseBarcode(raw) {
    if (!raw || typeof raw !== "string") {
        return { raw: raw ?? "", normalized: "", type: constants_1.BARCODE_TYPES.UNKNOWN, isValid: false, error: "Empty barcode" };
    }
    const type = detectType(raw.trim());
    const normalized = normalise(raw, type);
    const { isValid, checkDigitValid, error } = validate(normalized, type);
    return { raw, normalized, type, isValid, checkDigitValid, error };
}
/** Convert a 12-digit UPC-A to 13-digit EAN-13 by prepending "0". */
function upcToEan13(upc) {
    return "0" + upc.padStart(12, "0");
}
/**
 * Compute the GS1 check digit for a 12-digit base (produces EAN-13).
 * Useful when you have a 12-digit code and need to reconstruct the full EAN-13.
 */
function computeEan13CheckDigit(first12) {
    const digits = first12.split("").map(Number);
    let sum = 0;
    for (let i = 0; i < 12; i++) {
        sum += digits[i] * (i % 2 === 0 ? 1 : 3);
    }
    return String((10 - (sum % 10)) % 10);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYmFyY29kZS1wYXJzZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi8uLi8uLi9zcmMvbW9kdWxlcy9iYXJjb2RlL3V0aWxzL2JhcmNvZGUtcGFyc2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBNklBLG9DQVVDO0FBR0QsZ0NBRUM7QUFNRCx3REFPQztBQXpLRCw0Q0FBbUU7QUFHbkUsaUZBQWlGO0FBRWpGOzs7OztHQUtHO0FBQ0gsU0FBUyxtQkFBbUIsQ0FBQyxNQUFjO0lBQ3pDLE1BQU0sQ0FBQyxHQUFHLE1BQU0sQ0FBQyxLQUFLLENBQUMsRUFBRSxDQUFDLENBQUMsR0FBRyxDQUFDLE1BQU0sQ0FBQyxDQUFBO0lBQ3RDLE1BQU0sR0FBRyxHQUFHLENBQUMsQ0FBQyxNQUFNLENBQUE7SUFDcEIsSUFBSSxHQUFHLEdBQUcsQ0FBQyxDQUFBO0lBQ1gsS0FBSyxJQUFJLENBQUMsR0FBRyxDQUFDLEVBQUUsQ0FBQyxHQUFHLEdBQUcsRUFBRSxDQUFDLEVBQUUsRUFBRSxDQUFDO1FBQzdCLEdBQUcsSUFBSSxDQUFDLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLENBQUMsQ0FBQTtJQUNyQyxDQUFDO0lBQ0QsT0FBTyxHQUFHLEdBQUcsRUFBRSxLQUFLLENBQUMsQ0FBQTtBQUN2QixDQUFDO0FBRUQsc0VBQXNFO0FBQ3RFLFNBQVMsVUFBVSxDQUFDLElBQVk7SUFDOUIsTUFBTSxDQUFDLEdBQUcsSUFBSSxDQUFDLFVBQVUsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLEtBQUssQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxFQUFFLENBQUMsQ0FBQyxDQUFBO0lBQ3BFLE1BQU0sWUFBWSxHQUFHLENBQUMs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