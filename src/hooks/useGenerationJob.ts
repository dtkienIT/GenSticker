import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getPollingIntervalMs,
  getPollingRetryDelayMs,
  POLLING_RETRY_LIMIT,
} from '@/constants/polling';
import { queryKeys } from '@/query/queryKeys';
import { isTerminalGenerationJobStatus } from '@/query/terminalStatus';
import type { GenerationJob } from '@/services/contracts';
import { getStickerProductService, getStickerServiceMode } from '@/services/factory';

export interface GenerationJobPollingOptions {
  enabled?: boolean;
}

export function useGenerationJob(
  jobId: string | null | undefined,
  options: GenerationJobPollingOptions = {},
): UseQueryResult<GenerationJob, Error> {
  const service = getStickerProductService();
  const serviceMode = getStickerServiceMode();
  const enabled = Boolean(jobId) && (options.enabled ?? true);

  return useQuery({
    queryKey: queryKeys.jobs.detail(jobId ?? 'inactive'),
    queryFn: () => {
      if (!jobId) {
        throw new Error('A job ID is required to fetch generation state.');
      }

      return service.getGenerationJob(jobId);
    },
    enabled,
    refetchInterval: (query) => {
      const job = query.state.data;

      if (!enabled || (job && isTerminalGenerationJobStatus(job.status))) {
        return false;
      }

      return getPollingIntervalMs(serviceMode, 'job', query.state.fetchFailureCount);
    },
    refetchIntervalInBackground: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: POLLING_RETRY_LIMIT,
    retryDelay: getPollingRetryDelayMs,
  });
}
