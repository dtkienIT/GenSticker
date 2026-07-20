import React, { useState } from 'react';
import { Share, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { CheckerboardPreview } from '@/components/export/CheckerboardPreview';
import { StickerTextEditor } from '@/components/export/StickerTextEditor';
import { ExportFormatSelector } from '@/components/export/ExportFormatSelector';
import { AppButton } from '@/components/common/AppButton';
import { queryKeys } from '@/query';
import { getStickerProductService } from '@/services/factory';
import type { ExportFormat, TextPlacement } from '@/services/contracts';
import { useAppTheme } from '@/theme';

export default function StickerEditor() {
  const params = useLocalSearchParams<{ packId?: string; slotId?: string }>();
  const packId = typeof params.packId === 'string' ? params.packId : '';
  const slotId = typeof params.slotId === 'string' ? params.slotId : '';
  const { colors, typography, spacing } = useAppTheme();
  const [text, setText] = useState('');
  const [placement, setPlacement] = useState<TextPlacement>('bottom');
  const [fontSize, setFontSize] = useState(28);
  const [formats, setFormats] = useState<ExportFormat[]>(['png']);
  const pack = useQuery({
    queryKey: queryKeys.packs.detail(packId),
    queryFn: () => getStickerProductService().getStickerPack(packId),
    enabled: Boolean(packId),
  });
  const slot = pack.data?.slots.find((s) => s.id === slotId);
  const exportAction = useMutation({
    mutationFn: async () => {
      await getStickerProductService().updateStickerText({
        packId,
        slotId,
        text,
        placement,
        fontSize,
      });
      return getStickerProductService().exportStickerPack({ packId, formats });
    },
    onSuccess: async (manifest) => {
      await Share.share({
        message: `GenSticker: ${manifest.assets.length} tệp sẵn sàng (${manifest.formats.join(', ')})`,
      });
    },
  });
  if (!slot)
    return (
      <ScreenContainer>
        <Text style={[typography.body, { color: colors.textSecondary }]}>Đang tải hình dán…</Text>
      </ScreenContainer>
    );
  return (
    <ScreenContainer scrollable>
      <CheckerboardPreview
        imageUri={slot.imageUri}
        text={text}
        placement={placement}
        fontSize={fontSize}
      />
      <View style={{ marginTop: spacing.lg }}>
        <StickerTextEditor
          value={{ text, placement, fontSize }}
          onChange={(value) => {
            setText(value.text);
            setPlacement(value.placement);
            setFontSize(value.fontSize);
          }}
        />
      </View>
      <View style={{ marginTop: spacing.lg }}>
        <ExportFormatSelector value={formats} onChange={setFormats} />
      </View>
      <View style={{ marginTop: spacing.xl }}>
        <AppButton
          title="Xuất và chia sẻ"
          loading={exportAction.isPending}
          onPress={() => exportAction.mutate()}
        />
      </View>
      {exportAction.data ? (
        <Text style={[typography.caption, { color: colors.success, marginTop: spacing.md }]}>
          Đã tạo manifest {exportAction.data.id}. Hết hạn: {exportAction.data.expiresAt}
        </Text>
      ) : null}
    </ScreenContainer>
  );
}
