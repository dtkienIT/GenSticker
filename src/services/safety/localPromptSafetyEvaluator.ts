import type { MockScenario } from '../generation/types';
import type { PromptSafetyEvaluator, SafetyEvaluationResult } from './types';

const BLOCKED_PATTERNS = [
  /\bmurder\b/i,
  /\bgraphic violence\b/i,
  /\bsexual(?:ly)? explicit\b/i,
  /\bchild sexual\b/i,
  /\bsuicide instructions?\b/i,
];

export class LocalPromptSafetyEvaluator implements PromptSafetyEvaluator {
  constructor(
    private readonly options: {
      scenario?: MockScenario;
      getScenario?: () => MockScenario;
    } = {},
  ) {}

  async evaluate(prompt: string): Promise<SafetyEvaluationResult> {
    if ((this.options.getScenario?.() ?? this.options.scenario) === 'safety_failure') {
      return { status: 'failed', code: 'EVALUATOR_FAILED', retryable: true };
    }

    const normalizedPrompt = prompt.trim().replace(/\s+/g, ' ');
    if (BLOCKED_PATTERNS.some((pattern) => pattern.test(normalizedPrompt))) {
      return { status: 'blocked', reasonCode: 'PROMPT_BLOCKED' };
    }
    return { status: 'allowed', normalizedPrompt };
  }
}
