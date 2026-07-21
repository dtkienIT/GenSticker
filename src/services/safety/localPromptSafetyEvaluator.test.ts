import { describe, expect, it } from 'vitest';
import { LocalPromptSafetyEvaluator } from './localPromptSafetyEvaluator';

describe('LocalPromptSafetyEvaluator', () => {
  it('normalizes and allows an ordinary sticker prompt', async () => {
    const evaluator = new LocalPromptSafetyEvaluator();

    await expect(evaluator.evaluate('  A happy CAT with boba  ')).resolves.toEqual({
      status: 'allowed',
      normalizedPrompt: 'A happy CAT with boba',
    });
  });

  it('blocks disallowed content without exposing the matched term', async () => {
    const evaluator = new LocalPromptSafetyEvaluator();

    await expect(evaluator.evaluate('Make a graphic murder scene')).resolves.toEqual({
      status: 'blocked',
      reasonCode: 'PROMPT_BLOCKED',
    });
  });

  it('separates an evaluator failure from a policy block', async () => {
    const evaluator = new LocalPromptSafetyEvaluator({ scenario: 'safety_failure' });

    await expect(evaluator.evaluate('A harmless prompt')).resolves.toEqual({
      status: 'failed',
      code: 'EVALUATOR_FAILED',
      retryable: true,
    });
  });
});
