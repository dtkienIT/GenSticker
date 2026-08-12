export type IntentKey = {
  fingerprint: string;
  key: string;
};

export function resolveIntentKey(
  current: IntentKey | null,
  fingerprint: string,
  createKey: () => string,
): IntentKey {
  if (current?.fingerprint === fingerprint) return current;
  return { fingerprint, key: createKey() };
}
