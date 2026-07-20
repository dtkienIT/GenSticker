import type { QueryClient } from '@tanstack/react-query';
import { queryKeys } from './queryKeys';

export async function invalidateAfterCharacterCreated(queryClient: QueryClient): Promise<void> {
  await queryClient.invalidateQueries({ queryKey: queryKeys.characters.all });
}

export async function invalidateAfterCanonicalApproved(
  queryClient: QueryClient,
  characterId: string,
  profileVersion?: number,
): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.characters.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.characters.detail(characterId) }),
    queryClient.invalidateQueries({ queryKey: queryKeys.profiles.forCharacter(characterId) }),
    profileVersion == null
      ? Promise.resolve()
      : queryClient.invalidateQueries({
          queryKey: queryKeys.profiles.detail(characterId, profileVersion),
        }),
  ]);
}

function dataReferencesCharacter(data: unknown, characterId: string): boolean {
  if (Array.isArray(data)) {
    return data.some((item) => dataReferencesCharacter(item, characterId));
  }

  if (data === null || typeof data !== 'object') {
    return false;
  }

  return (
    ('characterId' in data && data.characterId === characterId) ||
    ('id' in data && data.id === characterId)
  );
}

function collectRelatedEntityIds(data: unknown, characterId: string, target: Set<string>): void {
  if (Array.isArray(data)) {
    data.forEach((item) => collectRelatedEntityIds(item, characterId, target));
    return;
  }

  if (data === null || typeof data !== 'object') {
    return;
  }

  if (
    'characterId' in data &&
    data.characterId === characterId &&
    'id' in data &&
    typeof data.id === 'string'
  ) {
    target.add(data.id);
  }
}

function dataReferencesPack(data: unknown, packIds: ReadonlySet<string>): boolean {
  if (Array.isArray(data)) {
    return data.some((item) => dataReferencesPack(item, packIds));
  }

  if (data === null || typeof data !== 'object') {
    return false;
  }

  return 'packId' in data && typeof data.packId === 'string' && packIds.has(data.packId);
}

export async function invalidateAfterCharacterDeleted(
  queryClient: QueryClient,
  characterId: string,
): Promise<void> {
  const relatedJobIds = new Set<string>();
  const relatedPackIds = new Set<string>();

  queryClient
    .getQueriesData({ queryKey: queryKeys.jobs.all })
    .forEach(([, data]) => collectRelatedEntityIds(data, characterId, relatedJobIds));
  queryClient
    .getQueriesData({ queryKey: queryKeys.packs.all })
    .forEach(([, data]) => collectRelatedEntityIds(data, characterId, relatedPackIds));

  queryClient.removeQueries({
    predicate: (query) => {
      const [scope, keyCharacterId] = query.queryKey;

      if (scope === 'canonical-candidates' && keyCharacterId === characterId) {
        return true;
      }

      if (scope === 'profiles' && keyCharacterId === characterId) {
        return true;
      }

      if (scope === 'characters') {
        return (
          query.queryKey.at(-1) === characterId ||
          dataReferencesCharacter(query.state.data, characterId)
        );
      }

      if (scope === 'jobs') {
        return (
          dataReferencesCharacter(query.state.data, characterId) ||
          query.queryKey.some((keyPart) =>
            typeof keyPart === 'string' ? relatedJobIds.has(keyPart) : false,
          )
        );
      }

      if (scope === 'packs') {
        return (
          dataReferencesCharacter(query.state.data, characterId) ||
          query.queryKey.some((keyPart) =>
            typeof keyPart === 'string' ? relatedPackIds.has(keyPart) : false,
          )
        );
      }

      if (scope === 'exports' && dataReferencesPack(query.state.data, relatedPackIds)) {
        return true;
      }

      return scope === 'library' && dataReferencesCharacter(query.state.data, characterId);
    },
  });

  await Promise.all([
    queryClient.invalidateQueries({ queryKey: queryKeys.characters.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.jobs.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.packs.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.profiles.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.exports.all }),
    queryClient.invalidateQueries({ queryKey: queryKeys.library.all }),
  ]);
}

export async function invalidateAfterStickerSlotRetried(
  queryClient: QueryClient,
  packId: string,
): Promise<void> {
  await queryClient.invalidateQueries({
    queryKey: queryKeys.packs.detail(packId),
    exact: true,
  });
}

export const queryInvalidation = {
  characterCreated: invalidateAfterCharacterCreated,
  canonicalApproved: invalidateAfterCanonicalApproved,
  characterDeleted: invalidateAfterCharacterDeleted,
  stickerSlotRetried: invalidateAfterStickerSlotRetried,
} as const;
