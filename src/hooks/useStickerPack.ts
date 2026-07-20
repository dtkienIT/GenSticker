import { useQuery, type UseQueryResult } from '@tanstack/react-query';
import {
  getPollingIntervalMs,
  getPollingRetryDelayMs,
  POLLING_RETRY_LIMIT,
} from '@/constants/polling';
import { queryKeys } from '@/query/queryKeys';
import { isTerminalStickerPackStatus } from '@/query/terminalStatus';
import type { StickerPack } from '@/services/contracts';
import { getStickerProductService, getStickerServiceMode } from '@/services/factory';

export interface StickerPackPollingOptions {
  enabled?: boolean;
}

export function useStickerPack(
  packId: string | null | undefined,
  options: StickerPackPollingOptions = {},
): UseQueryResult<StickerPack, Error> {
  const service = getStickerProductService();
  const serviceMode = getStickerServiceMode();
  const enabled = Boolean(packId) && (options.enabled ?? true);

  return useQuery({
    queryKey: queryKeys.packs.detail(packId ?? 'inactive'),
    queryFn: () => {
      if (!packId) {
        throw new Error('A pack ID is required to fetch sticker-pack state.');
      }

      return service.getStickerPack(packId);
    },
    enabled,
    refetchInterval: (query) => {
      const pack = query.state.data;

      if (!enabled || (pack && isTerminalStickerPackStatus(pack.status))) {
        return false;
      }

      return getPollingIntervalMs(serviceMode, 'pack', query.state.fetchFailureCount);
    },
    refetchIntervalInBackground: true,
    refetchOnReconnect: true,
    refetchOnWindowFocus: true,
    retry: POLLING_RETRY_LIMIT,
    retryDelay: getPollingRetryDelayMs,
  });
}
