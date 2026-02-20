/**
 * Type for truthy values that can be converted to boolean
 */
export type BooleanConvertible = string | number | boolean | null | undefined | object | any[];
/**
 * Type for strict boolean values
 */
export type StrictBoolean = boolean | 0 | 1 | 'true' | 'false' | '0' | '1';
export type ComparatorOperator = '>' | '<' | '>=' | '<=' | '==' | '===' | '!=' | '!==';
export interface ComparatorCondition {
    value: unknown;
    operator: ComparatorOperator;
}
//# sourceMappingURL=types.d.ts.map