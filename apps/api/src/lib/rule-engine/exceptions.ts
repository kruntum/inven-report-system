export class RuleEngineError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class InvalidRuleError extends RuleEngineError {
  constructor(message: string) {
    super(message);
  }
}

export class InvalidContextError extends RuleEngineError {
  constructor(message: string) {
    super(message);
  }
}

export class UnknownOperatorError extends RuleEngineError {
  constructor(message: string) {
    super(message);
  }
}
