import * as Crypto from 'expo-crypto';
import { useCallback, useRef } from 'react';

import { resolveIntentKey, type IntentKey } from '@/utils/idempotency';

export function useIdempotencyKey() {
  const intentRef = useRef<IntentKey | null>(null);

  const keyFor = useCallback((fingerprint: string): string => {
    intentRef.current = resolveIntentKey(intentRef.current, fingerprint, Crypto.randomUUID);
    return intentRef.current.key;
  }, []);

  const invalidate = useCallback(() => {
    intentRef.current = null;
  }, []);

  return { keyFor, invalidate };
}
