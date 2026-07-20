import React, { useState } from 'react';
import { Text } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { CharacterProfileForm } from '@/components/character/CharacterProfileForm';
import { DEFAULT_CHARACTER_PROFILE_CONFIG } from '@/constants/profilePresets';
import { DEFAULT_EMOTION_TEMPLATE_ID } from '@/constants/emotionTemplates';
import { queryKeys } from '@/query';
import { getStickerProductService } from '@/services/factory';
import type { CharacterProfileConfig } from '@/services/contracts';
import { useProductSessionStore } from '@/store/useProductSessionStore';
import { useAppTheme } from '@/theme';

export default function Profile() {
  const { characterId } = useLocalSearchParams<{ characterId?: string }>();
  const id = typeof characterId === 'string' ? characterId : '';
  const router = useRouter();
  const qc = useQueryClient();
  const { colors, typography } = useAppTheme();
  const setPack = useProductSessionStore((s) => s.setActivePackId);
  const profile = useQuery({
    queryKey: queryKeys.profiles.detail(id),
    queryFn: () => getStickerProductService().getCharacterProfile(id),
    enabled: Boolean(id),
  });
  const [draft, setDraft] = useState<CharacterProfileConfig | null>(null);
  const value = draft ?? profile.data?.config ?? DEFAULT_CHARACTER_PROFILE_CONFIG;
  const save = useMutation({
    mutationFn: async (config: CharacterProfileConfig) => {
      const current = profile.data;
      const next =
        draft && JSON.stringify(draft) !== JSON.stringify(current?.config)
          ? await getStickerProductService().updateCharacterProfile({ characterId: id, config })
          : current!;
      const pack = await getStickerProductService().createStickerPack({
        characterId: id,
        profileVersion: next.version,
        templateId: DEFAULT_EMOTION_TEMPLATE_ID,
      });
      return pack;
    },
    onSuccess: async (pack) => {
      setPack(pack.id);
      await qc.invalidateQueries({ queryKey: queryKeys.packs.all });
      router.replace({ pathname: '/pack/[packId]', params: { packId: pack.id } });
    },
  });
  if (profile.isLoading)
    return (
      <ScreenContainer>
        <Text style={[typography.body, { color: colors.textPrimary }]}>Đang tải hồ sơ…</Text>
      </ScreenContainer>
    );
  return (
    <ScreenContainer scrollable>
      <CharacterProfileForm
        value={value}
        version={profile.data?.version}
        hasUnsavedChanges={Boolean(draft)}
        onChange={setDraft}
        onSubmit={(config) => save.mutate(config)}
        loading={save.isPending}
        submitLabel="Lưu và tạo bộ 8 cảm xúc"
      />
    </ScreenContainer>
  );
}
