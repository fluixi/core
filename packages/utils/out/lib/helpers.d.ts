import { ObjectKind, ObjectType, UndefinedOrNullType } from '@fluixi/utils/primitive';
/** Check if value is null */
export declare function isNull(v: unknown): v is null;
/** Check if value is undefined */
export declare function isUndefined(v: unknown): v is undefined;
export declare const isUndefinedOrNull: (element: unknown) => element is UndefinedOrNullType;
/** Check if value is primitive */
export declare function isPrimitive(v: unknown): v is string | number | boolean | symbol | bigint | null | undefined | Date;
export declare function isDefined(obj: unknown): obj is ObjectType;
export declare function getKind<T>(obj: T): ObjectKind;
export declare const generateUUID: () => string;
export declare const generateID: () => string;
//# sourceMappingURL=helpers.d.ts.map