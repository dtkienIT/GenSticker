export type SafetyEvaluationResult =
  | { status: 'allowed'; normalizedPrompt: string }
  | { status: 'blocked'; reasonCode: 'PROMPT_BLOCKED' }
  | { status: 'failed'; code: 'EVALUATOR_FAILED'; retryable: true };

export interface PromptSafetyEvaluator {
  evaluate(prompt: string): Promise<SafetyEvaluationResult>;
}
