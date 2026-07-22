import { UNDEFINED } from './parser';
import { UnknownOperatorError } from './exceptions';

export type OperatorFunc = (actual: any, expected: any) => boolean;

export class OperatorRegistry {
  private operators: Map<string, OperatorFunc> = new Map();

  constructor() {
    this.registerDefaults();
  }

  register(name: string, func: OperatorFunc): void {
    if (this.operators.has(name.toLowerCase())) {
      throw new Error(`Operator '${name}' is already registered.`);
    }
    this.operators.set(name.toLowerCase(), func);
  }

  get(name: string): OperatorFunc {
    const op = this.getRaw(name);
    return op;
  }

  getRaw(name: string): OperatorFunc {
    const op = this.operators.get(name.toLowerCase());
    if (!op) {
      throw new UnknownOperatorError(`Unsupported or unregistered operator: '${name}'`);
    }
    return op;
  }

  isUnary(name: string): boolean {
    try {
      const op = this.getRaw(name);
      return op.length <= 1;
    } catch {
      return false;
    }
  }

  has(name: string): boolean {
    return this.operators.has(name.toLowerCase());
  }

  private registerDefaults() {
    // Equality
    this.register('eq', (a, b) => a === b);
    this.register('neq', (a, b) => a !== b);

    // Numeric/Comparable Comparisons
    this.register('gt', (a, b) => a !== UNDEFINED && a !== null && b !== null && a > b);
    this.register('gte', (a, b) => a !== UNDEFINED && a !== null && b !== null && a >= b);
    this.register('lt', (a, b) => a !== UNDEFINED && a !== null && b !== null && a < b);
    this.register('lte', (a, b) => a !== UNDEFINED && a !== null && b !== null && a <= b);

    // Inclusion / Set
    this.register('in', (a, b) => {
      if (Array.isArray(b)) {
        return b.includes(a);
      }
      if (typeof b === 'string' && typeof a === 'string') {
        return b.includes(a);
      }
      return false;
    });
    this.register('notin', (a, b) => {
      if (Array.isArray(b)) {
        return !b.includes(a);
      }
      if (typeof b === 'string' && typeof a === 'string') {
        return !b.includes(a);
      }
      return true;
    });

    // Contains (checking if actual value contains the expected value)
    this.register('contains', (a, b) => {
      if (Array.isArray(a)) {
        return a.includes(b);
      }
      if (typeof a === 'string' && typeof b === 'string') {
        return a.includes(b);
      }
      return false;
    });

    // Regular Expression
    this.register('regex', (a, b) => {
      if (a === UNDEFINED || a === null) return false;
      try {
        const regex = new RegExp(b);
        return regex.test(String(a));
      } catch {
        return false;
      }
    });

    // Unary checks (expected is ignored/not needed)
    this.register('exists', (a) => a !== UNDEFINED);
    this.register('empty', (a) => {
      if (a === UNDEFINED || a === null) return true;
      if (typeof a === 'string' && a.trim() === '') return true;
      if (Array.isArray(a) && a.length === 0) return true;
      if (typeof a === 'object' && Object.keys(a).length === 0) return true;
      return false;
    });
  }
}
