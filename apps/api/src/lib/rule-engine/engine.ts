import { Rule, RuleGroup, SimpleRule, DetailedResult } from './types';
import { InvalidRuleError, InvalidContextError } from './exceptions';
import { OperatorRegistry } from './operators';
import { resolvePath, UNDEFINED } from './parser';

export class EvaluationResult {
  constructor(public readonly isValid: boolean, public readonly details: DetailedResult) {}

  /**
   * Convert evaluation results to a JSON-serializable object.
   */
  toJSON() {
    return {
      isValid: this.isValid,
      details: this.details,
    };
  }
}

export class RuleEngine {
  public registry: OperatorRegistry;

  constructor() {
    this.registry = new OperatorRegistry();
  }

  /**
   * Register a custom operator into the engine.
   */
  registerOperator(name: string, func: (actual: any, expected: any) => boolean): void {
    this.registry.register(name, func);
  }

  /**
   * Validates the schema and structure of a rule.
   * Throws InvalidRuleError if invalid.
   */
  validate(rule: any): void {
    if (!rule || typeof rule !== 'object') {
      throw new InvalidRuleError('Rule must be a non-null object.');
    }

    if (!('operator' in rule)) {
      throw new InvalidRuleError("Rule must contain an 'operator' key.");
    }

    const op = String(rule.operator).toLowerCase();

    if (op === 'and' || op === 'or') {
      if (!('rules' in rule) || !Array.isArray(rule.rules)) {
        throw new InvalidRuleError(`Logical operator '${op}' requires a 'rules' array.`);
      }
      if (rule.rules.length === 0) {
        throw new InvalidRuleError(`Logical operator '${op}' cannot have an empty 'rules' array.`);
      }
      for (const subRule of rule.rules) {
        this.validate(subRule);
      }
    } else if (op === 'not') {
      const hasRuleObj = 'rule' in rule && rule.rule !== undefined;
      const hasRulesArr = 'rules' in rule && Array.isArray(rule.rules) && rule.rules.length > 0;

      if (!hasRuleObj && !hasRulesArr) {
        throw new InvalidRuleError(
          "Logical 'not' operator requires a 'rule' object or a non-empty 'rules' array."
        );
      }

      const target = hasRuleObj ? rule.rule : rule.rules[0];
      this.validate(target);
    } else {
      // Comparison operator
      if (!this.registry.has(op)) {
        throw new InvalidRuleError(`Unknown or unregistered operator: '${rule.operator}'`);
      }
      if (!('field' in rule) || typeof rule.field !== 'string' || !rule.field.trim()) {
        throw new InvalidRuleError(`Comparison operator '${rule.operator}' requires a non-empty 'field' string.`);
      }
      // Unary operators do not require a 'value' key
      if (!this.registry.isUnary(op) && !('value' in rule)) {
        throw new InvalidRuleError(`Comparison operator '${rule.operator}' requires a 'value' parameter.`);
      }
    }
  }

  /**
   * Evaluates a rule against the provided context.
   */
  evaluate(rule: Rule, context: any): EvaluationResult {
    this.validate(rule);
    if (!context || typeof context !== 'object' || Array.isArray(context)) {
      throw new InvalidContextError('Context must be a non-array object.');
    }

    return this.evaluateRecursive(rule, context);
  }

  private evaluateRecursive(rule: Rule, context: any): EvaluationResult {
    const op = rule.operator.toLowerCase();

    if (op === 'and') {
      const group = rule as RuleGroup;
      const subResults: DetailedResult[] = [];
      let allPassed = true;

      for (const subRule of group.rules || []) {
        const res = this.evaluateRecursive(subRule, context);
        subResults.push(res.details);
        if (!res.isValid) {
          allPassed = false;
        }
      }

      return new EvaluationResult(allPassed, {
        is_valid: allPassed,
        operator: rule.operator,
        sub_rules: subResults,
      });
    }

    if (op === 'or') {
      const group = rule as RuleGroup;
      const subResults: DetailedResult[] = [];
      let anyPassed = false;

      for (const subRule of group.rules || []) {
        const res = this.evaluateRecursive(subRule, context);
        subResults.push(res.details);
        if (res.isValid) {
          anyPassed = true;
        }
      }

      return new EvaluationResult(anyPassed, {
        is_valid: anyPassed,
        operator: rule.operator,
        sub_rules: subResults,
      });
    }

    if (op === 'not') {
      const group = rule as RuleGroup;
      const target = group.rule || (group.rules && group.rules[0]);
      if (!target) {
        throw new InvalidRuleError("'not' operator requires a target rule.");
      }
      const res = this.evaluateRecursive(target, context);
      const isValid = !res.isValid;

      return new EvaluationResult(isValid, {
        is_valid: isValid,
        operator: rule.operator,
        sub_rule: res.details,
      });
    }

    // Leaf Rule
    const leaf = rule as SimpleRule;
    const actualValue = resolvePath(context, leaf.field);
    const opFunc = this.registry.get(op);

    let isValid = false;
    try {
      isValid = opFunc(actualValue, leaf.value);
    } catch (err) {
      // In case of unexpected runtime comparison errors
      isValid = false;
    }

    const printableActual = actualValue === UNDEFINED ? undefined : actualValue;

    return new EvaluationResult(isValid, {
      is_valid: isValid,
      field: leaf.field,
      operator: leaf.operator,
      expected_value: leaf.value,
      actual_value: printableActual,
    });
  }
}
