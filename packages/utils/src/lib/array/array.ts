export const toArrayString = (value: string | string[]): string[] => {
  if (Array.isArray(value)) {
    return value;
  } else if (typeof value === 'string') {
    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return JSON.parse(value);
      } catch (err) {
        return [];
      }
    } else {
      return [value];
    }
  }
  return [] as string[];
};

export function isArrayOfString(value: any): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

export function isArrayOfNumber(value: any): value is number[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'number')
  );
}

export function isArrayOfBoolean(value: any): value is boolean[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'boolean')
  );
}

export function isArrayOfObject(value: any): value is object[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'object')
  );
}
