export declare const createHash: (value: any, algorithm?: string) => Promise<string | null>;
export declare const hash: (value: string, algorithm?: string) => Promise<string>;
export declare const compareWithHash: (value1: string, value2: string, algorithm?: string) => Promise<boolean>;
export declare function hashStringPromise(value: string, algorithm?: string): Promise<string>;
export declare const string_hash: (str: string) => string;
//# sourceMappingURL=hash.d.ts.map