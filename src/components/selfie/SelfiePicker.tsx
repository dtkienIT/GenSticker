import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Image, Platform, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useAppTheme } from '../../theme';
import { AppButton } from '../common/AppButton';

export type SelfiePickerSource = 'library' | 'camera' | 'pending';

export interface SelfiePickerMetadata {
  uri: string;
  fileName: string | null;
  mimeType: string | null;
  width: number;
  height: number;
  fileSize: number | null;
  assetId: string | null;
  source: SelfiePickerSource;
}

export interface SelfiePickerProps {
  value: string | null;
  onChange: (uri: string | null, metadata: SelfiePickerMetadata | null) => void;
  onMetadataChange?: (metadata: SelfiePickerMetadata | null) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  allowCamera?: boolean;
  title?: string;
  helperText?: string;
  galleryLabel?: string;
  cameraLabel?: string;
  removeLabel?: string;
}

const isLocalUri = (uri: string): boolean =>
  /^(file|content|ph|assets-library|blob):/i.test(uri) || uri.startsWith('/');

export const SelfiePicker: React.FC<SelfiePickerProps> = ({
  value,
  onChange,
  onMetadataChange,
  onError,
  disabled = false,
  allowCamera = true,
  title = 'Ảnh chân dung',
  helperText = 'Chọn ảnh rõ mặt, đủ sáng và chỉ có một người.',
  galleryLabel = 'Chọn từ thư viện',
  cameraLabel = 'Chụp ảnh',
  removeLabel = 'Xóa ảnh',
}) => {
  const { colors, borderRadius, spacing, typography } = useAppTheme();
  const [activeAction, setActiveAction] = useState<'library' | 'camera' | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewFailed, setPreviewFailed] = useState(false);
  const checkedPendingResult = useRef(false);
  const safeValue = value && isLocalUri(value) ? value : null;

  const reportError = useCallback(
    (message: string) => {
      setErrorMessage(message);
      onError?.(message);
    },
    [onError],
  );

  const applyAsset = useCallback(
    (asset: ImagePicker.ImagePickerAsset, source: SelfiePickerSource) => {
      if (!isLocalUri(asset.uri)) {
        reportError('Không thể dùng ảnh từ địa chỉ trực tuyến. Vui lòng chọn ảnh trên thiết bị.');
        return;
      }

      const metadata: SelfiePickerMetadata = {
        uri: asset.uri,
        fileName: asset.fileName ?? null,
        mimeType: asset.mimeType ?? null,
        width: asset.width,
        height: asset.height,
        fileSize: asset.fileSize ?? null,
        assetId: asset.assetId ?? null,
        source,
      };

      setErrorMessage(null);
      setPreviewFailed(false);
      onChange(asset.uri, metadata);
      onMetadataChange?.(metadata);
    },
    [onChange, onMetadataChange, reportError],
  );

  const applyResult = useCallback(
    (result: ImagePicker.ImagePickerResult, source: SelfiePickerSource) => {
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset || (asset.type && asset.type !== 'image')) {
        reportError('Không tìm thấy ảnh hợp lệ trong lựa chọn này.');
        return;
      }
      applyAsset(asset, source);
    },
    [applyAsset, reportError],
  );

  useEffect(() => {
    if (Platform.OS !== 'android' || checkedPendingResult.current) return;
    checkedPendingResult.current = true;
    let active = true;

    void ImagePicker.getPendingResultAsync()
      .then((pendingResult) => {
        if (!active || !pendingResult) return;
        if ('canceled' in pendingResult) {
          applyResult(pendingResult, 'pending');
          return;
        }
        reportError('Không thể khôi phục ảnh vừa chọn. Vui lòng thử lại.');
      })
      .catch(() => {
        if (active) reportError('Không thể khôi phục ảnh vừa chọn. Vui lòng thử lại.');
      });

    return () => {
      active = false;
    };
  }, [applyResult, reportError]);

  const chooseFromLibrary = async () => {
    if (disabled || activeAction) return;
    setActiveAction('library');
    setErrorMessage(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        reportError('Cần quyền truy cập thư viện để chọn ảnh chân dung.');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
        quality: 1,
      });
      applyResult(result, 'library');
    } catch {
      reportError('Không thể mở thư viện ảnh. Vui lòng thử lại.');
    } finally {
      setActiveAction(null);
    }
  };

  const takePhoto = async () => {
    if (disabled || activeAction) return;
    setActiveAction('camera');
    setErrorMessage(null);
    try {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        reportError('Cần quyền máy ảnh để chụp ảnh chân dung.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        base64: false,
        exif: false,
        quality: 1,
        cameraType: ImagePicker.CameraType.front,
      });
      applyResult(result, 'camera');
    } catch {
      reportError('Không thể mở máy ảnh. Vui lòng thử lại.');
    } finally {
      setActiveAction(null);
    }
  };

  const removePhoto = () => {
    if (disabled || activeAction) return;
    setErrorMessage(null);
    setPreviewFailed(false);
    onChange(null, null);
    onMetadataChange?.(null);
  };

  const invalidExternalValue = Boolean(value && !safeValue);

  return (
    <View style={styles.container}>
      <Text accessibilityRole="header" style={[typography.h3, { color: colors.textPrimary }]}>
        {title}
      </Text>
      <Text
        style={[
          typography.body,
          { color: colors.textSecondary, marginBottom: spacing.md, marginTop: spacing.xs },
        ]}
      >
        {helperText}
      </Text>

      <View
        style={[
          styles.preview,
          {
            backgroundColor: colors.surface,
            borderColor: errorMessage || invalidExternalValue ? colors.error : colors.border,
            borderRadius: borderRadius.lg,
          },
        ]}
      >
        {safeValue && !previewFailed ? (
          <Image
            accessible
            accessibilityLabel="Ảnh chân dung đã chọn"
            onError={() => setPreviewFailed(true)}
            onLoad={() => setPreviewFailed(false)}
            resizeMode="cover"
            source={{ uri: safeValue }}
            style={styles.image}
          />
        ) : (
          <View style={[styles.placeholder, { padding: spacing.lg }]}>
            <Text style={styles.placeholderIcon}>👤</Text>
            <Text style={[typography.bodyBold, { color: colors.textPrimary, textAlign: 'center' }]}>
              {previewFailed ? 'Không thể hiển thị ảnh' : 'Chưa chọn ảnh'}
            </Text>
          </View>
        )}
      </View>

      {errorMessage || invalidExternalValue ? (
        <Text
          accessibilityLiveRegion="polite"
          style={[typography.caption, { color: colors.error, marginTop: spacing.sm }]}
        >
          {errorMessage ?? 'Chỉ có thể dùng ảnh cục bộ trên thiết bị.'}
        </Text>
      ) : null}

      <View style={[styles.actions, { marginTop: spacing.md }]}>
        <AppButton
          accessibilityLabel={safeValue ? 'Chọn lại ảnh từ thư viện' : galleryLabel}
          disabled={disabled || Boolean(activeAction)}
          loading={activeAction === 'library'}
          onPress={chooseFromLibrary}
          style={styles.actionButton}
          title={safeValue ? 'Chọn lại' : galleryLabel}
          variant={safeValue ? 'outline' : 'primary'}
        />
        {allowCamera ? (
          <AppButton
            accessibilityLabel={cameraLabel}
            disabled={disabled || Boolean(activeAction)}
            loading={activeAction === 'camera'}
            onPress={takePhoto}
            style={styles.actionButton}
            title={cameraLabel}
            variant="outline"
          />
        ) : null}
        {safeValue ? (
          <AppButton
            accessibilityLabel={removeLabel}
            disabled={disabled || Boolean(activeAction)}
            onPress={removePhoto}
            style={styles.actionButton}
            title={removeLabel}
            variant="danger"
          />
        ) : null}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flexGrow: 1,
    minHeight: 48,
    minWidth: 132,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  container: {
    width: '100%',
  },
  image: {
    height: '100%',
    width: '100%',
  },
  placeholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  preview: {
    alignItems: 'center',
    aspectRatio: 1,
    borderStyle: 'dashed',
    borderWidth: 1.5,
    justifyContent: 'center',
    maxHeight: 360,
    overflow: 'hidden',
    width: '100%',
  },
});
