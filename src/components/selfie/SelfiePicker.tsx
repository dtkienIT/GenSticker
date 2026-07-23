import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Image as RNImage, Linking, Platform, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { useAppTheme } from '../../theme';
import { AppButton } from '../common/AppButton';
import { getNormalizedSelfieDimensions, SELFIE_JPEG_QUALITY } from './selfieImageNormalization';

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
  const webFileInputRef = useRef<HTMLInputElement | null>(null);
  const safeValue = value && isLocalUri(value) ? value : null;

  const reportError = useCallback(
    (message: string) => {
      setErrorMessage(message);
      onError?.(message);
    },
    [onError],
  );

  const applyAsset = useCallback(
    async (asset: ImagePicker.ImagePickerAsset, source: SelfiePickerSource) => {
      if (!isLocalUri(asset.uri)) {
        reportError('Không thể dùng ảnh từ địa chỉ trực tuyến. Vui lòng chọn ảnh trên thiết bị.');
        return;
      }

      let selectedUri = asset.uri;
      let selectedFileName = asset.fileName ?? 'selfie.jpg';
      let selectedMimeType = asset.mimeType ?? 'image/jpeg';
      let selectedWidth = asset.width;
      let selectedHeight = asset.height;
      let selectedFileSize = asset.fileSize ?? null;

      try {
        const normalizedSize = getNormalizedSelfieDimensions(asset.width, asset.height);
        const context = ImageManipulator.manipulate(asset.uri);
        if (normalizedSize.width !== asset.width || normalizedSize.height !== asset.height) {
          context.resize(normalizedSize);
        }
        const renderedImage = await context.renderAsync();
        const normalizedImage = await renderedImage.saveAsync({
          compress: SELFIE_JPEG_QUALITY,
          format: SaveFormat.JPEG,
        });

        selectedUri = normalizedImage.uri;
        selectedFileName = asset.fileName?.replace(/\.[^.]+$/, '.jpg') ?? 'selfie.jpg';
        selectedMimeType = 'image/jpeg';
        selectedWidth = normalizedImage.width;
        selectedHeight = normalizedImage.height;
        selectedFileSize = null;
      } catch {
        // Some device/cloud image formats cannot be decoded by ImageManipulator.
        // The picker output is still a valid image and must remain selectable.
      }

      const metadata: SelfiePickerMetadata = {
        uri: selectedUri,
        fileName: selectedFileName,
        mimeType: selectedMimeType,
        width: selectedWidth,
        height: selectedHeight,
        fileSize: selectedFileSize,
        assetId: asset.assetId ?? null,
        source,
      };

      setErrorMessage(null);
      setPreviewFailed(false);
      onChange(selectedUri, metadata);
      onMetadataChange?.(metadata);
    },
    [onChange, onMetadataChange, reportError],
  );

  const applyResult = useCallback(
    async (result: ImagePicker.ImagePickerResult, source: SelfiePickerSource) => {
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset || (asset.type && asset.type !== 'image')) {
        reportError('Không tìm thấy ảnh hợp lệ trong lựa chọn này.');
        return;
      }
      await applyAsset(asset, source);
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
          void applyResult(pendingResult, 'pending').catch(() => {
            if (active) {
              reportError('Không thể xử lý ảnh vừa chọn. Vui lòng thử lại.');
            }
          });
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
    if (Platform.OS === 'web') {
      webFileInputRef.current?.click();
      return;
    }
    setActiveAction('library');
    setErrorMessage(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        allowsMultipleSelection: false,
        base64: false,
        exif: false,
        quality: SELFIE_JPEG_QUALITY,
      });
      await applyResult(result, 'library');
    } catch {
      reportError('Không thể mở thư viện ảnh. Vui lòng thử lại.');
    } finally {
      setActiveAction(null);
    }
  };

  const chooseWebFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = '';
    if (!file) return;

    setActiveAction('library');
    setErrorMessage(null);
    const uri = URL.createObjectURL(file);
    try {
      const dimensions = await new Promise<{ width: number; height: number }>((resolve, reject) => {
        const image = new window.Image();
        image.onload = () =>
          resolve({
            width: image.naturalWidth || image.width,
            height: image.naturalHeight || image.height,
          });
        image.onerror = () => reject(new Error('Invalid browser image'));
        image.src = uri;
      });
      await applyAsset(
        {
          uri,
          width: dimensions.width,
          height: dimensions.height,
          type: 'image',
          fileName: file.name,
          fileSize: file.size,
          mimeType: file.type || 'image/jpeg',
          assetId: null,
          file,
        },
        'library',
      );
    } catch {
      URL.revokeObjectURL(uri);
      reportError('Không thể đọc ảnh đã chọn. Vui lòng chọn một ảnh JPG, PNG hoặc WEBP.');
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
        if (!permission.canAskAgain) {
          reportError('Quyền máy ảnh đã bị tắt. Hãy bật lại trong Cài đặt.');
          Alert.alert(
            'Cần quyền máy ảnh',
            'Quyền máy ảnh đã bị từ chối vĩnh viễn. Hãy mở Cài đặt để bật lại.',
            [
              { text: 'Để sau', style: 'cancel' },
              {
                text: 'Mở Cài đặt',
                onPress: () => {
                  void Linking.openSettings();
                },
              },
            ],
          );
        } else {
          reportError('Cần quyền máy ảnh để chụp ảnh chân dung.');
        }
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ['images'],
        allowsEditing: false,
        base64: false,
        exif: false,
        quality: SELFIE_JPEG_QUALITY,
        cameraType: ImagePicker.CameraType.front,
      });
      await applyResult(result, 'camera');
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
          <RNImage
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

      {Platform.OS === 'web'
        ? React.createElement('input', {
            ref: webFileInputRef,
            type: 'file',
            accept: 'image/jpeg,image/png,image/webp,image/heic,image/heif',
            onChange: chooseWebFile,
            'data-testid': 'selfie-file-input',
            style: { display: 'none' },
          })
        : null}

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
