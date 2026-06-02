import {
  isDate,
  ObjectKind,
  ObjectType,
  UndefinedOrNullType,
} from '@fluixi/utils/primitive';
import { isClass, isObject } from '@fluixi/utils/object';
import { isArray } from '@fluixi/utils/array';
import { isFunction } from '@fluixi/utils/functions';

/** Check if value is null */
export function isNull(v: unknown): v is null {
  return v === null;
}

/** Check if value is undefined */
export function isUndefined(v: unknown): v is undefined {
  return v === undefined;
}

export const isUndefinedOrNull = (
  element: unknown
): element is UndefinedOrNullType => {
  if (typeof element === 'undefined' || element === null) return true;
  return false;
};
/** Check if value is primitive */
export function isPrimitive(
  v: unknown
): v is string | number | boolean | symbol | bigint | null | undefined | Date {
  const type = typeof v;
  return (
    v === null ||
    type === 'string' ||
    type === 'number' ||
    type === 'boolean' ||
    type === 'symbol' ||
    type === 'bigint' ||
    type === 'undefined' ||
    isDate(v)
  );
}

export function isDefined(obj: unknown): obj is ObjectType {
  return obj !== undefined && obj !== null;
}

export function getKind<T>(obj: T): ObjectKind {
  if (obj === null) return 'null';
  if (obj === undefined) return 'undefined';
  if (isDate(obj)) return 'date';
  if (isClass(obj)) return 'class';
  if (isFunction(obj)) return 'function';
  if (isArray(obj)) return 'array';
  if (isPrimitive(obj)) return 'primitive';
  if (isObject(obj)) return 'object';

  // fallback
  return 'primitive';
}

export const generateUUID = () => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0;
    let v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
export const generateID = () => {
  return 'xxyxxxxxxy-4xx8'.replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0;
    let v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};
