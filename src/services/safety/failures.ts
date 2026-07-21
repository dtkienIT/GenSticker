export type SafetyFailureCode = 'PROMPT_BLOCKED' | 'EVALUATOR_FAILED';

export class SafetyFailure extends Error {
  constructor(
    readonly code: SafetyFailureCode,
    readonly retryable: boolean,
  ) {
    super(code);
    this.name = 'SafetyFailure';
  }
}
