import React, { useState } from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from '@/components/common/AppButton';
import { AppTextInput } from '@/components/common/AppTextInput';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { SectionHeader } from '@/components/common/SectionHeader';
import { StickerCard } from '@/components/sticker/StickerCard';
import { StyleCard } from '@/components/sticker/StyleCard';
import { workspaceLayout } from '@/components/web/runtimePresentation';
import { STICKER_STYLES } from '@/constants/styles';
import { getStickerRuntimeMode } from '@/services/appServices';
import { presentLocalModelSetup } from '@/services/setup/localModelSetupPresentation';
import { useStickerStore } from '@/store/useStickerStore';
import { useAppTheme } from '@/theme';
import { stickerPromptSchema } from '@/validation/stickerSchemas';

const EXAMPLES = [
  'A sleepy corgi hugging a coffee mug',
  'A dramatic duck wearing tiny sunglasses',
  'An astronaut cat floating with boba',
];

export default function PromptWorkspace() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const draft = useStickerStore((state) => state.draft);
  const gallery = useStickerStore((state) => state.gallery);
  const capabilityStatus = useStickerStore((state) => state.capabilityStatus);
  const modelBundleState = useStickerStore((state) => state.modelBundleState);
  const modelDownloadProgress = useStickerStore((state) => state.modelDownloadProgress);
  const error = useStickerStore((state) => state.error);
  const updateDraft = useStickerStore((state) => state.updateDraft);
  const checkCapabilities = useStickerStore((state) => state.checkCapabilities);
  const downloadModel = useStickerStore((state) => state.downloadModel);
  const installLocalModel = useStickerStore((state) => state.installLocalModel);
  const cancelModelDownload = useStickerStore((state) => state.cancelModelDownload);
  const editPrompt = useStickerStore((state) => state.editPrompt);
  const selectAsset = useStickerStore((state) => state.selectAsset);
  const [validationError, setValidationError] = useState<string | null>(null);
  const runtimeMode = getStickerRuntimeMode();
  const layout = workspaceLayout(width);
  const modelReady = runtimeMode === 'mock' || modelBundleState?.status === 'ready';
  const modelDownloading = modelBundleState?.status === 'downloading';
  const modelSetup = presentLocalModelSetup(modelBundleState, __DEV__);

  const submit = () => {
    const parsed = stickerPromptSchema.safeParse(draft);
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? 'Check your prompt');
      return;
    }
    setValidationError(null);
    updateDraft(parsed.data);
    editPrompt();
    router.push('/create/generating');
  };

  return (
    <ScreenContainer scrollable>
      <View style={[styles.workspace, { flexDirection: layout.direction }]}>
        <View style={[styles.promptColumn, { flex: layout.promptFlex }]}>
          <View
            style={[
              styles.hero,
              {
                backgroundColor: colors.card,
                borderColor: colors.border,
                borderRadius: borderRadius.lg,
                padding: spacing.lg,
              },
            ]}
          >
            <View style={styles.badgeRow}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700' }]}>
                ON-DEVICE FEASIBILITY
              </Text>
              <Text style={[typography.caption, { color: colors.textMuted }]}>
                {runtimeMode === 'mock'
                  ? 'Local mock'
                  : runtimeMode === 'web'
                    ? 'Browser WebGPU'
                    : 'Native adapter'}
              </Text>
            </View>
            <Text style={[typography.h1, { color: colors.textPrimary }]}>
              Describe your sticker
            </Text>
            <Text style={[typography.body, { color: colors.textSecondary }]}>
              Your prompt is checked and processed locally. No cloud generation fallback is used.
            </Text>

            <View
              style={[
                styles.capability,
                {
                  backgroundColor:
                    capabilityStatus === 'ready' ? colors.primaryLight : colors.surface,
                  borderRadius: borderRadius.md,
                },
              ]}
            >
              <View style={styles.capabilityCopy}>
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                  Runtime status
                </Text>
                <Text selectable style={[typography.caption, { color: colors.textSecondary }]}>
                  {capabilityStatus === 'checking'
                    ? 'Checking the local runtime…'
                    : capabilityStatus === 'ready'
                      ? runtimeMode === 'web'
                        ? 'Ready. Generation runs locally in this browser.'
                        : 'Ready for on-device generation'
                      : (error?.message ?? 'Generation is unavailable on this device.')}
                </Text>
              </View>
              {capabilityStatus !== 'ready' && capabilityStatus !== 'checking' ? (
                <AppButton
                  title="Recheck"
                  size="sm"
                  variant="outline"
                  onPress={() => void checkCapabilities()}
                />
              ) : null}
            </View>

            {runtimeMode !== 'mock' && !modelReady ? (
              <View
                style={[
                  styles.modelSetup,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                    borderRadius: borderRadius.md,
                    padding: spacing.md,
                  },
                ]}
              >
                <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                  Local model setup
                </Text>
                <Text style={[typography.caption, { color: colors.textSecondary }]}>
                  {modelSetup.message}
                </Text>
                {modelDownloadProgress ? (
                  <Text style={[typography.caption, { color: colors.primary }]}>
                    {modelDownloadProgress.phase === 'verifying' ? 'Verifying' : 'Downloading'} ·{' '}
                    {formatBytes(modelDownloadProgress.downloadedBytes)} /{' '}
                    {formatBytes(modelDownloadProgress.totalBytes)}
                  </Text>
                ) : modelBundleState?.totalBytes ? (
                  <Text style={[typography.caption, { color: colors.textMuted }]}>
                    Download size: {formatBytes(modelBundleState.totalBytes)}
                  </Text>
                ) : null}
                {modelSetup.action !== 'none' ? (
                  <AppButton
                    title={modelSetup.buttonLabel}
                    variant={modelDownloading ? 'outline' : 'secondary'}
                    onPress={() => {
                      if (modelSetup.action === 'cancel') {
                        void cancelModelDownload();
                      } else if (modelSetup.action === 'installLocal') {
                        void installLocalModel();
                      } else {
                        void downloadModel();
                      }
                    }}
                  />
                ) : null}
              </View>
            ) : null}

            <AppTextInput
              label="Sticker prompt"
              placeholder="A cheerful astronaut cat holding boba"
              multiline
              maxLength={300}
              numberOfLines={4}
              value={draft.prompt}
              onChangeText={(prompt) => {
                updateDraft({ prompt });
                if (validationError) setValidationError(null);
              }}
              error={validationError ?? undefined}
              helperText={`${draft.prompt.length}/300 characters`}
              style={styles.promptInput}
            />

            <Text style={[typography.caption, { color: colors.textSecondary }]}>
              Try an example
            </Text>
            <View style={styles.exampleRow}>
              {EXAMPLES.map((example) => (
                <TouchableOpacity
                  key={example}
                  onPress={() => updateDraft({ prompt: example })}
                  style={[
                    styles.exampleChip,
                    { borderColor: colors.border, borderRadius: borderRadius.full },
                  ]}
                >
                  <Text style={[typography.caption, { color: colors.textPrimary }]}>{example}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>Style</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.styleRow}
            >
              {STICKER_STYLES.filter((style) => style.id === 'chibi').map((style) => (
                <StyleCard
                  key={style.id}
                  styleOption={style}
                  selected={draft.stylePresetId === style.id}
                  onSelect={() => updateDraft({ stylePresetId: style.id })}
                />
              ))}
            </ScrollView>

            <AppButton
              title={runtimeMode === 'web' ? 'Generate in this browser' : 'Generate on this device'}
              size="lg"
              disabled={capabilityStatus !== 'ready' || !modelReady}
              onPress={submit}
            />
          </View>
        </View>

        <View style={[styles.sideColumn, { flex: layout.sideFlex }]}>
          <View style={[styles.quickLinks, { marginBottom: spacing.lg }]}>
            <AppButton
              title={`My Stickers (${gallery.length})`}
              variant="secondary"
              onPress={() => router.push('/library')}
            />
            <AppButton
              title="Settings"
              variant="outline"
              onPress={() => router.push('/settings')}
            />
            {__DEV__ ? (
              <AppButton
                title="Diagnostics"
                variant="outline"
                onPress={() => router.push('/debug')}
              />
            ) : null}
          </View>

          <SectionHeader
            title="Recent stickers"
            subtitle="Successful generations are saved here automatically"
          />
          {gallery.length === 0 ? (
            <View
              style={[
                styles.empty,
                {
                  backgroundColor: colors.card,
                  borderRadius: borderRadius.md,
                  padding: spacing.lg,
                },
              ]}
            >
              <Text style={styles.emptyEmoji}>✨</Text>
              <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
                No stickers yet
              </Text>
              <Text
                style={[typography.caption, { color: colors.textSecondary, textAlign: 'center' }]}
              >
                Your first transparent PNG will appear here after generation succeeds.
              </Text>
            </View>
          ) : (
            <View style={styles.grid}>
              {gallery.slice(0, 4).map((sticker) => (
                <View key={sticker.assetId} style={styles.gridItem}>
                  <StickerCard
                    sticker={sticker}
                    onPress={() => {
                      void selectAsset(sticker.assetId).then(() => router.push('/create/result'));
                    }}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  hero: { borderWidth: 1, gap: 16 },
  workspace: { gap: 20, alignItems: 'flex-start' },
  promptColumn: { width: '100%' },
  sideColumn: { width: '100%' },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  capability: { padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  capabilityCopy: { flex: 1 },
  modelSetup: { borderWidth: 1, gap: 10 },
  promptInput: { minHeight: 116, textAlignVertical: 'top' },
  exampleRow: { gap: 8 },
  exampleChip: { borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  styleRow: { paddingVertical: 4 },
  quickLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  empty: { alignItems: 'center', gap: 6 },
  emptyEmoji: { fontSize: 36 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  gridItem: { width: '48%' },
});

function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / 1024 ** exponent).toFixed(exponent === 0 ? 0 : 1)} ${units[exponent]}`;
}
