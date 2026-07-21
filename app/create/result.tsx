import React, { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { AppButton } from '@/components/common/AppButton';
import { ScreenContainer } from '@/components/common/ScreenContainer';
import { CheckerboardPreview } from '@/components/export/CheckerboardPreview';
import { useStickerStore } from '@/store/useStickerStore';
import { useAppTheme } from '@/theme';

export default function ResultScreen() {
  const router = useRouter();
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const currentAsset = useStickerStore((state) => state.currentAsset);
  const retryCount = useStickerStore((state) => state.retryCount);
  const editPrompt = useStickerStore((state) => state.editPrompt);
  const saveCurrentToPhotos = useStickerStore((state) => state.saveCurrentToPhotos);
  const shareCurrent = useStickerStore((state) => state.shareCurrent);
  const [saving, setSaving] = useState(false);
  const [sharing, setSharing] = useState(false);

  if (!currentAsset) {
    return (
      <ScreenContainer scrollable={false} style={styles.centered}>
        <Text style={styles.emptyIcon}>🫥</Text>
        <Text style={[typography.h3, { color: colors.textPrimary }]}>No sticker selected</Text>
        <AppButton title="Back to prompt" onPress={() => router.replace('/')} />
      </ScreenContainer>
    );
  }

  const save = async () => {
    setSaving(true);
    const result = await saveCurrentToPhotos();
    setSaving(false);
    if (result.status === 'succeeded')
      Alert.alert('Saved to Photos', 'The PNG was copied to your device photo library.');
    else if (result.status === 'permission_denied')
      Alert.alert(
        'Photos permission needed',
        'Allow write access to save an external copy. Your in-app sticker is still safe.',
      );
    else
      Alert.alert(
        'Could not save',
        'The in-app sticker is still available. Try exporting it again.',
      );
  };

  const share = async () => {
    setSharing(true);
    const result = await shareCurrent();
    setSharing(false);
    if (result.status === 'unavailable')
      Alert.alert(
        'Sharing unavailable',
        'No compatible share surface is available on this device.',
      );
    else if (result.status === 'failed')
      Alert.alert('Could not share', 'The sticker remains in your local gallery.');
  };

  const regenerate = () => {
    editPrompt();
    router.push('/create/generating');
  };

  const returnToPrompt = () => {
    editPrompt();
    router.replace('/');
  };

  return (
    <ScreenContainer scrollable>
      <View style={styles.headerCopy}>
        <Text style={[typography.h2, { color: colors.textPrimary }]}>Transparent PNG ready</Text>
        <Text style={[typography.body, { color: colors.textSecondary }]}>
          Saved automatically to My Stickers before this preview opened.
        </Text>
      </View>
      <CheckerboardPreview imageUri={currentAsset.localUri} />
      <View
        style={[
          styles.details,
          { backgroundColor: colors.card, borderRadius: borderRadius.md, padding: spacing.md },
        ]}
      >
        <Text selectable style={[typography.bodyBold, { color: colors.textPrimary }]}>
          {currentAsset.prompt}
        </Text>
        <Text style={[typography.caption, { color: colors.textSecondary }]}>
          {currentAsset.stylePresetId.toUpperCase()} · 1024 × 1024 · PNG
        </Text>
      </View>

      {retryCount >= 3 ? (
        <View
          style={[
            styles.nudge,
            {
              backgroundColor: colors.primaryLight,
              borderRadius: borderRadius.md,
              padding: spacing.md,
            },
          ]}
        >
          <Text style={[typography.bodyBold, { color: colors.textPrimary }]}>
            Not quite landing?
          </Text>
          <Text style={[typography.caption, { color: colors.textSecondary }]}>
            You have tried this prompt {retryCount} times. Editing the description may produce a
            more useful result.
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <AppButton title="Save to Photos" size="lg" loading={saving} onPress={() => void save()} />
        <AppButton
          title="Share PNG"
          size="lg"
          variant="secondary"
          loading={sharing}
          onPress={() => void share()}
        />
        <View style={styles.row}>
          <AppButton
            title="Regenerate"
            variant="outline"
            style={styles.flex}
            onPress={regenerate}
          />
          <AppButton
            title="Edit prompt"
            variant="outline"
            style={styles.flex}
            onPress={returnToPrompt}
          />
        </View>
        <AppButton
          title="Open My Stickers"
          variant="secondary"
          onPress={() => router.push('/library')}
        />
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  centered: { alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyIcon: { fontSize: 48 },
  headerCopy: { gap: 4, marginBottom: 14 },
  details: { gap: 4, marginTop: 14 },
  nudge: { gap: 4, marginTop: 14 },
  actions: { gap: 10, marginTop: 16, marginBottom: 24 },
  row: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
});
