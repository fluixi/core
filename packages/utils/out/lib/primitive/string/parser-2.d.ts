type ParseOptions = {
    allowUnquotedKeys?: boolean;
    allowTrailingCommas?: boolean;
    allowSingleQuotes?: boolean;
    allowComments?: boolean;
    allowUndefined?: boolean;
    allowSpecialNumbers?: boolean;
    reviver?: (this: any, key: string, value: any) => any;
    strict?: boolean;
    maxDepth?: number;
};
/**
 * Robust state machine parser for JavaScript object literals
 */
export declare function parseObjectLiteral<T = any>(str: string, options?: ParseOptions): T;
export {};
//# sourceMappingURL=parser-2.d.ts.map