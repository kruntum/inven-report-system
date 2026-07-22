import { describe, expect, test } from 'bun:test';
import { RuleEngine } from './engine';
import { InvalidRuleError, InvalidContextError, UnknownOperatorError } from './exceptions';
import { Rule } from './types';

describe('RuleEngine', () => {
  const engine = new RuleEngine();

  describe('Basic Comparisons', () => {
    test('eq (equals)', () => {
      const rule: Rule = { field: 'status', operator: 'eq', value: 'active' };
      expect(engine.evaluate(rule, { status: 'active' }).isValid).toBe(true);
      expect(engine.evaluate(rule, { status: 'inactive' }).isValid).toBe(false);
      expect(engine.evaluate(rule, { other: 'active' }).isValid).toBe(false);
    });

    test('neq (not equals)', () => {
      const rule: Rule = { field: 'status', operator: 'neq', value: 'active' };
      expect(engine.evaluate(rule, { status: 'inactive' }).isValid).toBe(true);
      expect(engine.evaluate(rule, { status: 'active' }).isValid).toBe(false);
    });

    test('gt (greater than)', () => {
      const rule: Rule = { field: 'age', operator: 'gt', value: 18 };
      expect(engine.evaluate(rule, { age: 19 }).isValid).toBe(true);
      expect(engine.evaluate(rule, { age: 18 }).isValid).toBe(false);
      expect(engine.evaluate(rule, { age: 17 }).isValid).toBe(false);
    });

    test('gte (greater than or equal)', () => {
      const rule: Rule = { field: 'age', operator: 'gte', value: 18 };
      expect(engine.evaluate(rule, { age: 18 }).isValid).toBe(true);
      expect(engine.evaluate(rule, { age: 19 }).isValid).toBe(true);
      expect(engine.evaluate(rule, { age: 17 }).isValid).toBe(false);
    });

    test('lt (less than)', () => {
      const rule: Rule = { field: 'age', operator: 'lt', value: 18 };
      expect(engine.evaluate(rule, { age: 17 }).isValid).toBe(true);
      expect(engine.evaluate(rule, { age: 18 }).isValid).toBe(false);
    });

    test('lte (less than or equal)', () => {
      const rule: Rule = { field: 'age', operator: 'lte', value: 18 };
      expect(engine.evaluate(rule, { age: 18 }).isValid).toBe(true);
      expect(engine.evaluate(rule, { age: 17 }).isValid).toBe(true);
      expect(engine.evaluate(rule, { age: 19 }).isValid).toBe(false);
    });
  });

  describe('Set and Containment Operations', () => {
    test('in', () => {
      const rule: Rule = { field: 'category', operator: 'in', value: ['fruit', 'vegetable'] };
      expect(engine.evaluate(rule, { category: 'fruit' }).isValid).toBe(true);
      expect(engine.evaluate(rule, { category: 'meat' }).isValid).toBe(false);
    });

    test('notin', () => {
      const rule: Rule = { field: 'category', operator: 'notin', value: ['fruit', 'vegetable'] };
      expect(engine.evaluate(rule, { category: 'meat' }).isValid).toBe(true);
      expect(engine.evaluate(rule, { category: 'fruit' }).isValid).toBe(false);
    });

    test('contains', () => {
      const rule: Rule = { field: 'tags', operator: 'contains', value: 'featured' };
      expect(engine.evaluate(rule, { tags: ['fresh', 'featured', 'sale'] }).isValid).toBe(true);
      expect(engine.evaluate(rule, { tags: ['fresh', 'sale'] }).isValid).toBe(false);
      expect(engine.evaluate(rule, { tags: 'this is a featured item' }).isValid).toBe(true);
    });
  });

  describe('Regex Matching', () => {
    test('regex', () => {
      const rule: Rule = { field: 'email', operator: 'regex', value: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$' };
      expect(engine.evaluate(rule, { email: 'user@example.com' }).isValid).toBe(true);
      expect(engine.evaluate(rule, { email: 'invalid-email' }).isValid).toBe(false);
    });
  });

  describe('Unary Checks', () => {
    test('exists', () => {
      const rule: Rule = { field: 'user.profile.age', operator: 'exists' };
      expect(engine.evaluate(rule, { user: { profile: { age: 25 } } }).isValid).toBe(true);
      expect(engine.evaluate(rule, { user: { profile: {} } }).isValid).toBe(false);
      expect(engine.evaluate(rule, {}).isValid).toBe(false);
    });

    test('empty', () => {
      const rule: Rule = { field: 'items', operator: 'empty' };
      expect(engine.evaluate(rule, { items: [] }).isValid).toBe(true);
      expect(engine.evaluate(rule, { items: [1, 2] }).isValid).toBe(false);
      expect(engine.evaluate(rule, {}).isValid).toBe(true);
      expect(engine.evaluate(rule, { items: '' }).isValid).toBe(true);
      expect(engine.evaluate(rule, { items: '   ' }).isValid).toBe(true);
    });
  });

  describe('Nested Paths', () => {
    test('deeply nested properties and array index access', () => {
      const context = {
        store: {
          books: [
            { title: 'Book A', ratings: [4, 5] },
            { title: 'Book B', ratings: [3, 2] }
          ]
        }
      };

      const rule1: Rule = { field: 'store.books.0.title', operator: 'eq', value: 'Book A' };
      const rule2: Rule = { field: 'store.books.1.ratings.0', operator: 'eq', value: 3 };

      expect(engine.evaluate(rule1, context).isValid).toBe(true);
      expect(engine.evaluate(rule2, context).isValid).toBe(true);
    });
  });

  describe('Logical Groups', () => {
    test('AND operator', () => {
      const rule: Rule = {
        operator: 'and',
        rules: [
          { field: 'age', operator: 'gte', value: 18 },
          { field: 'country', operator: 'eq', value: 'US' }
        ]
      };

      expect(engine.evaluate(rule, { age: 20, country: 'US' }).isValid).toBe(true);
      expect(engine.evaluate(rule, { age: 17, country: 'US' }).isValid).toBe(false);
      expect(engine.evaluate(rule, { age: 20, country: 'CA' }).isValid).toBe(false);
    });

    test('OR operator', () => {
      const rule: Rule = {
        operator: 'or',
        rules: [
          { field: 'age', operator: 'gte', value: 18 },
          { field: 'status', operator: 'eq', value: 'active' }
        ]
      };

      expect(engine.evaluate(rule, { age: 15, status: 'active' }).isValid).toBe(true);
      expect(engine.evaluate(rule, { age: 20, status: 'inactive' }).isValid).toBe(true);
      expect(engine.evaluate(rule, { age: 15, status: 'inactive' }).isValid).toBe(false);
    });

    test('NOT operator', () => {
      const rule: Rule = {
        operator: 'not',
        rule: { field: 'blocked', operator: 'eq', value: true }
      };

      expect(engine.evaluate(rule, { blocked: false }).isValid).toBe(true);
      expect(engine.evaluate(rule, { blocked: true }).isValid).toBe(false);
    });
  });

  describe('Custom Operators', () => {
    test('registration and evaluation', () => {
      const localEngine = new RuleEngine();
      localEngine.registerOperator('isEven', (val) => typeof val === 'number' && val % 2 === 0);

      const rule: Rule = { field: 'count', operator: 'isEven' };
      expect(localEngine.evaluate(rule, { count: 4 }).isValid).toBe(true);
      expect(localEngine.evaluate(rule, { count: 5 }).isValid).toBe(false);
    });
  });

  describe('Validation & Error Handling', () => {
    test('missing operator', () => {
      const rule = { field: 'age', value: 18 } as any;
      expect(() => engine.evaluate(rule, {})).toThrow(InvalidRuleError);
    });

    test('unknown operator', () => {
      const rule = { field: 'age', operator: 'invalid', value: 18 } as any;
      expect(() => engine.evaluate(rule, {})).toThrow(InvalidRuleError);
    });

    test('invalid context', () => {
      const rule: Rule = { field: 'age', operator: 'eq', value: 18 };
      expect(() => engine.evaluate(rule, 'not an object' as any)).toThrow(InvalidContextError);
    });
  });
});
