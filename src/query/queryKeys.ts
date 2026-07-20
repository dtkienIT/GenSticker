import type { GenerationJobFilters } from '@/services/contracts';

export const queryKeys = {
  me: ['me'] as const,
  characters: {
    all: ['characters'] as const,
    list: () => ['characters', 'list'] as const,
    detail: (characterId: string) => ['characters', 'detail', characterId] as const,
  },
  jobs: {
    all: ['jobs'] as const,
    list: (filters?: GenerationJobFilters) => ['jobs', 'list', filters ?? {}] as const,
    detail: (jobId: string) => ['jobs', 'detail', jobId] as const,
    events: (jobId: string) => ['jobs', 'detail', jobId, 'events'] as const,
  },
  canonicalCandidates: (characterId: string) => ['canonical-candidates', characterId] as const,
  profiles: {
    all: ['profiles'] as const,
    forCharacter: (characterId: string) => ['profiles', characterId] as const,
    detail: (characterId: string, version?: number) =>
      ['profiles', characterId, version ?? 'latest'] as const,
  },
  packs: {
    all: ['packs'] as const,
    list: (characterId?: string) => ['packs', 'list', characterId ?? 'all'] as const,
    detail: (packId: string) => ['packs', 'detail', packId] as const,
  },
  exports: {
    all: ['exports'] as const,
    detail: (exportId: string) => ['exports', 'detail', exportId] as const,
  },
  library: {
    all: ['library'] as const,
  },
} as const;
