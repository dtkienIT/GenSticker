import { Ionicons } from '@expo/vector-icons';
import { useMutation } from '@tanstack/react-query';
import { Image } from 'expo-image';
import { File, Paths } from 'expo-file-system';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Linking, Pressable, StyleSheet, Text, View } from 'react-native';

import { createJob, validateSource } from '@/api/client';
import { retrySafeMutation, safeErrorMessage } from '@/api/errors';
import { Button, Card, Pill, Screen } from '@/components/ui';
import { CONSENT_VERSION, IS_DEMO } from '@/config/env';
import { useIdempotencyKey } from '@/features/use-idempotency-key';
import { useI18n } from '@/i18n';
import { useActiveJob } from '@/providers/active-job';
import { colors, radii, spacing } from '@/theme/tokens';
import { SourceCacheLifecycle } from '@/utils/source-cache-lifecycle';

export default function CreateScreen() {
  const { t } = useI18n();
  const { setActiveJobId } = useActiveJob();
  const [asset, setAsset] = useState<ImagePicker.ImagePickerAsset>();
  const [consent, setConsent] = useState(false);
  const [permissionError, setPermissionError] = useState<string>();
  const generationIntent = useIdempotencyKey();
  const mountedRef = useRef(false);
  const sourceFilesRef = useRef<SourceCacheLifecycle | null>(null);

  const sourceFiles = useCallback(() => {
    if (!sourceFilesRef.current) {
      sourceFilesRef.current = new SourceCacheLifecycle(Paths.cache.uri, (uri) => {
        const file = new File(uri);
        if (file.exists) file.delete();
      });
    }
    return sourceFilesRef.current;
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      sourceFilesRef.current?.cleanupAll();
    };
  }, []);

  const validation = useMutation({
    mutationFn: async (uploadAsset: ImagePicker.ImagePickerAsset) => {
      const files = sourceFiles();
      files.beginUpload(uploadAsset.uri);
      let uploadedSuccessfully = false;
      try {
        const source = await validateSource(uploadAsset, CONSENT_VERSION);
        uploadedSuccessfully = true;
        return source;
      } finally {
        files.finishUpload(uploadAsset.uri, uploadedSuccessfully);
      }
    },
    onSuccess: (_source, uploadAsset) => {
      if (!mountedRef.current) return;
      setAsset((current) => (current?.uri === uploadAsset.uri ? undefined : current));
    },
  });
  const generation = useMutation({
    mutationFn: () => {
      const sourceImageId = validation.data!.id;
      return createJob(sourceImageId, generationIntent.keyFor(`create:${sourceImageId}`));
    },
    retry: retrySafeMutation,
    onSuccess: async (job) => {
      await setActiveJobId(job.id);
      router.replace({ pathname: '/jobs/[id]', params: { id: job.id } });
    },
  });

  const acceptAsset = (next?: ImagePicker.ImagePickerAsset) => {
    if (!next) return;
    const files = sourceFiles();
    files.replace(next.uri);
    if (!mountedRef.current) {
      files.cleanupAll();
      return;
    }
    setAsset(next);
    setConsent(false);
    setPermissionError(undefined);
    validation.reset();
    generation.reset();
    generationIntent.invalidate();
  };

  const chooseFromLibrary = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setPermissionError(t('create.permissionLibrary'));
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: false,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      exif: false,
    });
    if (!result.canceled) acceptAsset(result.assets[0]);
  };

  const takePhoto = async () => {
    const permission = await ImagePicker.requestCameraPermissionsAsync();
    if (!permission.granted) {
      setPermissionError(t('create.permissionCamera'));
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
      exif: false,
      cameraType: ImagePicker.CameraType.front,
    });
    if (!result.canceled) acceptAsset(result.assets[0]);
  };

  const ready = validation.data?.status === 'ready';

  return (
    <Screen>
      <View style={styles.intro}>
        <Pill>{t('create.step')}</Pill>
        <Text style={styles.title}>{t('create.title')}</Text>
        <Text style={styles.subtitle}>{t('create.subtitle')}</Text>
      </View>

      <Card style={styles.photoCard}>
        {asset ? (
          <Image
            accessibilityLabel="Ảnh nguồn đã chọn"
            cachePolicy="none"
            contentFit="cover"
            source={asset.uri}
            style={styles.photo}
          />
        ) : (
          <View style={styles.photoEmpty}>
            <Ionicons color={colors.primary} name="image-outline" size={42} />
            <Text style={styles.photoEmptyTitle}>{t('create.emptyTitle')}</Text>
            <Text style={styles.photoEmptyBody}>{t('create.emptyBody')}</Text>
          </View>
        )}
        <View style={styles.sourceButtons}>
          <View style={styles.half}><Button full label={t('create.camera')} icon="camera-outline" onPress={takePhoto} variant="secondary" /></View>
          <View style={styles.half}><Button disabled={validation.isPending} full label={t('create.library')} icon="images-outline" onPress={chooseFromLibrary} variant="secondary" /></View>
        </View>
      </Card>

      {permissionError ? (
        <Card style={styles.errorCard}>
          <View style={styles.row}>
            <Ionicons color={colors.danger} name="lock-closed-outline" size={22} />
            <View style={styles.rowBody}>
              <Text style={styles.errorTitle}>{t('create.permissionTitle')}</Text>
              <Text style={styles.errorBody}>{permissionError}</Text>
            </View>
          </View>
          <Button label={t('create.openSettings')} onPress={() => void Linking.openSettings()} variant="ghost" />
        </Card>
      ) : null}

      <View style={styles.requirements}>
        <Text style={styles.sectionTitle}>{t('create.reqTitle')}</Text>
        {[t('create.req1'), t('create.req2'), t('create.req3')].map((item) => (
          <View key={item} style={styles.requirement}>
            <Ionicons color={colors.success} name="checkmark-circle" size={21} />
            <Text style={styles.requirementText}>{item}</Text>
          </View>
        ))}
      </View>

      {asset ? (
        <Pressable
          accessibilityLabel={t('create.consent')}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: consent }}
          onPress={() => {
            setConsent((value) => !value);
            validation.reset();
            generation.reset();
            generationIntent.invalidate();
          }}
          style={[styles.consent, consent && styles.consentChecked]}
        >
          <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
            {consent ? <Ionicons color={colors.white} name="checkmark" size={17} /> : null}
          </View>
          <Text style={styles.consentText}>
            {t('create.consent')}
          </Text>
        </Pressable>
      ) : null}

      {validation.isError ? (
        <View style={styles.inlineError}>
          <Ionicons color={colors.danger} name="alert-circle" size={20} />
          <Text style={styles.inlineErrorText}>{safeErrorMessage(validation.error)}</Text>
        </View>
      ) : null}

      {ready ? (
        <Card style={styles.readyCard}>
          <View style={styles.row}>
            <View style={styles.readyIcon}><Ionicons color={colors.success} name="shield-checkmark" size={24} /></View>
            <View style={styles.rowBody}>
              <Text style={styles.readyTitle}>{t('create.readyTitle')}</Text>
              <Text style={styles.readyBody}>
                {IS_DEMO ? t('create.readyBodyDemo') : t('create.readyBody')}
              </Text>
            </View>
          </View>
        </Card>
      ) : (
        <Button
          disabled={!asset || !consent}
          label={t('create.checkButton')}
          loading={validation.isPending}
          onPress={() => validation.mutate(asset!)}
        />
      )}

      {ready ? (
        <>
          {generation.isError ? <Text style={styles.generationError}>{safeErrorMessage(generation.error)}</Text> : null}
          <Button
            icon="sparkles"
            label={t('create.generateButton')}
            loading={generation.isPending}
            onPress={() => generation.mutate()}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: { gap: spacing.md },
  title: { fontSize: 30, lineHeight: 37, fontWeight: '900', color: colors.ink, letterSpacing: -0.7 },
  subtitle: { color: colors.muted, fontSize: 15, lineHeight: 22 },
  photoCard: { gap: spacing.md, padding: spacing.md },
  photo: { width: '100%', aspectRatio: 1, borderRadius: radii.md },
  photoEmpty: { aspectRatio: 1.2, borderRadius: radii.md, backgroundColor: colors.surfaceWarm, alignItems: 'center', justifyContent: 'center', gap: spacing.sm, borderStyle: 'dashed', borderWidth: 1.5, borderColor: '#E8BDA8' },
  photoEmptyTitle: { color: colors.ink, fontWeight: '800', fontSize: 18 },
  photoEmptyBody: { color: colors.muted },
  sourceButtons: { flexDirection: 'row', gap: spacing.sm },
  half: { flex: 1 },
  requirements: { gap: spacing.md },
  sectionTitle: { color: colors.ink, fontWeight: '900', fontSize: 18 },
  requirement: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  requirementText: { color: colors.ink, fontSize: 15 },
  consent: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderWidth: 1.5, borderColor: colors.line, backgroundColor: colors.surface, borderRadius: radii.md, alignItems: 'flex-start' },
  consentChecked: { borderColor: colors.primary, backgroundColor: colors.surfaceWarm },
  checkbox: { width: 24, height: 24, borderRadius: 7, borderWidth: 2, borderColor: colors.muted, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  consentText: { flex: 1, color: colors.ink, lineHeight: 21, fontWeight: '600' },
  errorCard: { gap: spacing.md, backgroundColor: colors.dangerSoft, borderColor: '#F2C6C2' },
  row: { flexDirection: 'row', gap: spacing.md, alignItems: 'center' },
  rowBody: { flex: 1, gap: 3 },
  errorTitle: { color: colors.danger, fontWeight: '800' },
  errorBody: { color: colors.ink, lineHeight: 20 },
  inlineError: { flexDirection: 'row', padding: spacing.md, gap: spacing.sm, backgroundColor: colors.dangerSoft, borderRadius: radii.md },
  inlineErrorText: { flex: 1, color: colors.danger, lineHeight: 20 },
  readyCard: { backgroundColor: colors.successSoft, borderColor: '#B9E6CF' },
  readyIcon: { width: 44, height: 44, borderRadius: 15, backgroundColor: colors.surface, alignItems: 'center', justifyContent: 'center' },
  readyTitle: { color: colors.success, fontWeight: '900', fontSize: 17 },
  readyBody: { color: colors.ink, lineHeight: 20 },
  generationError: { color: colors.danger, textAlign: 'center' },
});
