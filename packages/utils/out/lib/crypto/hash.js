export const createHash = async (value, algorithm = 'SHA-1') => {
    if (typeof window === 'undefined')
        return null;
    const { subtle } = window.globalThis.crypto;
    const key = await subtle.generateKey({
        name: 'HMAC',
        hash: algorithm,
        length: 256,
    }, true, ['sign', 'verify']);
    const enc = new TextEncoder();
    const message = enc.encode(value);
    const digest = await subtle.sign({
        name: 'HMAC',
    }, key, message);
    const hex = [...new Uint8Array(digest)]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
    return hex;
};
export const hash = async (value, algorithm = 'SHA-256') => {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return hashHex;
};
export const compareWithHash = async (value1, value2, algorithm = 'SHA-256') => {
    const hash1 = await hash(value1, algorithm);
    const hash2 = await hash(value2, algorithm);
    return hash1 === hash2;
};
export async function hashStringPromise(value, algorithm = 'SHA-256') {
    const encoder = new TextEncoder();
    const data = encoder.encode(value);
    const hashBuffer = await crypto.subtle.digest(algorithm, data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');
    return hashHex;
}
export const string_hash = (str) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = (hash << 5) - hash + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
};
