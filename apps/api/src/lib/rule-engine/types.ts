export type OperatorType =
  | 'eq'
  | 'neq'
  | 'gt'
  | 'gte'
  | 'lt'
  | 'lte'
  | 'in'
  | 'notin'
  | 'contains'
  | 'regex'
  | 'exists'
  | 'empty'
  | string;

export interface SimpleRule {
  field: string;
  operator: OperatorType;
  value?: any;
}

export type LogicalOperator = 'and' | 'or' | 'not';

export interface RuleGroup {
  operator: LogicalOperator;
  rules?: Rule[];
  rule?: Rule; // For 'not' operator (optional convenience)
}

export type Rule = SimpleRule | RuleGroup;

export interface DetailedResult {
  is_valid: boolean;
  field?: string;
  operator: string;
  expected_value?: any;
  actual_value?: any;
  sub_rules?: DetailedResult[];
  sub_rule?: DetailedResult;
}
