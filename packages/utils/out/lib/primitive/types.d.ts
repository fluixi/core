export type Null = null;
export type IsUndefined<T> = T extends undefined ? true : false;
export type IsNull<T> = T extends Null ? true : false;
export type IsNullOrUndefined<T> = IsUndefined<T> extends true ? true : IsNull<T>;
export type UndefinedType = undefined;
export type UndefinedOrNullType = UndefinedType | Null;
export type ClassType = new (...args: any[]) => any;
export type FnType = (...args: any[]) => any;
export type IsDefined<T> = IsUndefined<T> extends true ? false : IsNull<T> extends true ? false : true;
export type StringOrNumber = string | number;
export type CheckType<T extends any> = {
    is_undefined: T extends typeof undefined ? true : false;
    is_null: T extends typeof undefined ? true : false;
    is_array: T extends Array<any> ? true : false;
    is_object: T extends StringOrNumber ? false : T extends Array<any> ? false : T extends Object ? true : false;
    is_string: T extends String ? true : false;
    is_number: T extends Number ? true : false;
    typeOf: T extends undefined ? 'undefined' : T extends String ? 'string' : T extends Number ? 'number' : T extends Object ? 'object' : 'undefined';
    keys: Array<any>;
};
export type CompareFunction = (a: any, b: any) => boolean;
export type IBool = true | false | null;
export type NonNullablePrimitiveType = string | number | boolean | symbol | bigint | Date;
export type PrimitiveType = NonNullablePrimitiveType | null | undefined;
export type ObjectKind = 'class' | 'instance' | 'function' | 'array' | 'object' | 'primitive' | 'null' | 'date' | 'undefined';
export type ObjectType = ClassType | FnType | any[] | object | PrimitiveType | UndefinedType | Null;
//# sourceMappingURL=types.d.ts.map