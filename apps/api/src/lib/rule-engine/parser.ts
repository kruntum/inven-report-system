export const UNDEFINED = Symbol('UNDEFINED');

/**
 * Safely resolves a nested value from an object/array using dot-notation.
 * Returns `UNDEFINED` if the path doesn't exist, to distinguish from explicit undefined/null.
 */
export function resolvePath(obj: any, path: string, defaultValue: any = UNDEFINED): any {
  if (obj === null || obj === undefined) {
    return defaultValue;
  }
  if (!path) {
    return obj;
  }

  const parts = path.split('.');
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return defaultValue;
    }

    if (typeof current === 'object') {
      if (Array.isArray(current)) {
        const index = parseInt(part, 10);
        if (!isNaN(index) && index >= 0 && index < current.length) {
          current = current[index];
        } else {
          return defaultValue;
        }
      } else if (part in current) {
        current = current[part];
      } else {
        return defaultValue;
      }
    } else {
      return defaultValue;
    }
  }

  return current === undefined ? defaultValue : current;
}
