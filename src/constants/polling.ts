export type PollingResource = 'job' | 'pack';
export type PollingServiceMode = 'mock' | 'http';

export const POLLING_INTERVALS_MS: Readonly<
  Record<PollingServiceMode, Readonly<Record<PollingResource, number>>>
> = {
  mock: {
    job: 600,
    pack: 700,
  },
  http: {
    job: 2_000,
    pack: 2_500,
  },
};

export const POLLING_RETRY_LIMIT = 3;
export const MAX_POLLING_BACKOFF_MS = 10_000;

export function getPollingIntervalMs(
  serviceMode: PollingServiceMode,
  resource: PollingResource,
  consecutiveFailures = 0,
): number {
  const baseInterval = POLLING_INTERVALS_MS[serviceMode][resource];
  const backoffMultiplier = 2 ** Math.min(Math.max(consecutiveFailures, 0), POLLING_RETRY_LIMIT);

  return Math.min(baseInterval * backoffMultiplier, MAX_POLLING_BACKOFF_MS);
}

export function getPollingRetryDelayMs(attemptIndex: number): number {
  const normalizedAttempt = Math.max(attemptIndex, 0);
  return Math.min(500 * 2 ** normalizedAttempt, MAX_POLLING_BACKOFF_MS);
}
