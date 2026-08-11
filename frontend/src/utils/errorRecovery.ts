type ErrorRecoveryState = {
  jobId: string | null;
  qualityStatus: string | null;
  previewCount: number;
};

export type ErrorRecoveryAction = 'retry-partial' | 'restart';

export function getErrorRecoveryAction({
  jobId,
  qualityStatus,
  previewCount,
}: ErrorRecoveryState): ErrorRecoveryAction {
  return jobId && qualityStatus === 'rejected' && previewCount > 0
    ? 'retry-partial'
    : 'restart';
}
