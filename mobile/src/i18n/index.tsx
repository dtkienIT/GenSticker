import * as SecureStore from 'expo-secure-store';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

export type Locale = 'vi' | 'en';

const LANGUAGE_STORAGE_KEY = 'duhat.app_language';

export const translations = {
  vi: {
    // General / Common
    'common.retry': 'Thử lại',
    'common.cancel': 'Hủy',
    'common.back': 'Quay lại',
    'common.settings': 'Cài đặt',
    'common.demoNotice': 'MVP đang dùng 8 ảnh mock — chưa có AI/image processing.',
    
    // Tabs
    'tabs.home': 'Trang chủ',
    'tabs.library': 'Thư viện',

    // Home Screen
    'home.eyebrow': 'DUHAT STUDIO',
    'home.brand': 'Gen Sticker',
    'home.activeJob.ready': 'ĐÃ SẴN SÀNG',
    'home.activeJob.inProgress': 'ĐANG THỰC HIỆN',
    'home.activeJob.title': 'Bộ sticker gần nhất',
    'home.activeJob.body': 'Bạn có thể tiếp tục công việc mà không mất job đã gửi.',
    'home.activeJob.continue': 'Tiếp tục',
    'home.hero.title': 'Một tấm ảnh.\nTám sticker mang chất riêng.',
    'home.hero.body': 'Chọn một người, thú cưng hoặc vật thể. Duhat sẽ chuẩn bị bộ Chibi 3D để bạn chọn, lưu và chia sẻ.',
    'home.hero.startButton': 'Bắt đầu tạo sticker',
    'home.tips.title': 'Ảnh đẹp, sticker xinh',
    'home.tips.tip1': 'Chỉ một chủ thể chính',
    'home.tips.tip2': 'Ảnh rõ nét và đủ sáng',
    'home.tips.tip3': 'Bạn có quyền sử dụng ảnh',

    // Create Screen
    'create.step': 'BƯỚC 1 / 2',
    'create.title': 'Chọn khoảnh khắc\nbạn muốn biến hóa',
    'create.subtitle': 'Ảnh nguồn chỉ được gửi sau khi bạn đồng ý và bấm kiểm tra.',
    'create.emptyTitle': 'Một ảnh, một chủ thể',
    'create.emptyBody': 'Người, thú cưng hoặc vật thể rõ ràng',
    'create.camera': 'Camera',
    'create.library': 'Thư viện',
    'create.permissionTitle': 'Chưa có quyền truy cập',
    'create.permissionLibrary': 'Bạn cần cấp quyền thư viện để chọn ảnh.',
    'create.permissionCamera': 'Bạn cần cấp quyền camera để chụp ảnh.',
    'create.openSettings': 'Mở cài đặt',
    'create.reqTitle': 'Ảnh phù hợp cần có',
    'create.req1': 'Chính xác một chủ thể chính',
    'create.req2': 'Khuôn mặt rõ nếu là ảnh người',
    'create.req3': 'Đủ sáng, không nhòe hoặc bị che',
    'create.consent': 'Tôi xác nhận mình sở hữu hoặc có quyền sử dụng ảnh này để tạo sticker.',
    'create.readyTitle': 'Ảnh đã sẵn sàng',
    'create.readyBody': 'Đã hoàn tất kiểm tra đầu vào. Bạn chủ động bắt đầu ở bước tiếp theo.',
    'create.readyBodyDemo': 'Đã hoàn tất kiểm tra đầu vào mô phỏng. Bạn chủ động bắt đầu ở bước tiếp theo.',
    'create.checkButton': 'Kiểm tra ảnh',
    'create.generateButton': 'Tạo 8 sticker Chibi 3D',

    // Job Screen
    'job.pipelineDemo': 'MOCK PIPELINE',
    'job.pipelineChibi': 'CHIBI 3D',
    'job.title': 'Phép màu đang\nđược chuẩn bị ✨',
    'job.subtitle': 'Bạn có thể rời màn hình. Job đã gửi vẫn được lưu và tiếp tục xử lý.',
    'job.restoring': 'Đang khôi phục job đã gửi…',
    'job.connecting': 'Đang kết nối',
    'job.errorTitle': 'Chưa tải được tiến trình',
    'job.retryConnection': 'Thử kết nối lại',
    'job.failedTitle': 'Chưa tạo được sticker',
    'job.timedOutTitle': 'Job đã quá giờ',
    'job.retryAll': 'Thử tạo lại cả bộ',
    'job.chooseOtherPhoto': 'Chọn ảnh khác',
    'job.backHome': 'Về trang chủ',
    'job.stage.queued': 'Đang xếp hàng an toàn',
    'job.stage.generating': 'Đang tạo 8 biến thể Chibi 3D',
    'job.stage.moderating': 'Đang kiểm tra an toàn đầu ra',
    'job.stage.ready': 'Bộ sticker đã sẵn sàng',
    'job.stage.processing': 'Đang xử lý bộ sticker',
    'job.step.check': 'Đã kiểm tra ảnh',
    'job.step.generate': 'Tạo Chibi 3D',
    'job.step.moderate': 'Kiểm duyệt đầu ra',

    // Preview Screen
    'preview.pillDemo': 'ĐỦ 8 STICKER · KIỂM DUYỆT MOCK',
    'preview.pillReal': 'ĐỦ 8 STICKER · ĐÃ KIỂM DUYỆT',
    'preview.title': 'Chọn những sticker\nbạn thật sự thích',
    'preview.body': 'Mặc định chọn cả 8 cho MVP. Chạm từng sticker để bỏ hoặc chọn lại.',
    'preview.selectedCount': '{{count}}/8',
    'preview.selectedLabel': 'đang được chọn để lưu',
    'preview.deselectAll': 'Bỏ chọn hết',
    'preview.selectAll': 'Chọn tất cả',
    'preview.saveButton': 'Lưu {{count}} sticker',
    'preview.regenerateButton': 'Tạo lại toàn bộ 8 sticker',
    'preview.confirmRegenerateTitle': 'Tạo lại toàn bộ?',
    'preview.confirmRegenerateBody': 'Một job mới sẽ tạo đủ 8 sticker từ cùng ảnh nguồn. Các lựa chọn hiện tại chưa được lưu.',
    'preview.stay': 'Ở lại',
    'preview.regenerate': 'Tạo lại',
    'preview.loadingTitle': 'Chuẩn bị bản xem trước',
    'preview.loadingBody': 'Đang tải đủ 8 kết quả đã qua kiểm duyệt…',
    'preview.errorTitle': 'Chưa mở được bản xem trước',
    'preview.errorBody': 'Bộ sticker chưa sẵn sàng.',
    'preview.retryLoad': 'Thử tải lại',
    'preview.saveErrorTitle': 'Lưu chưa thành công',
    'preview.saveErrorBody': 'Bản xem trước vẫn còn để bạn thử lại.',

    // Library Screen
    'library.eyebrow': 'KHÔNG GIAN RIÊNG TƯ',
    'library.title': 'Thư viện của bạn',
    'library.body': 'Chỉ các sticker bạn chủ động chọn mới xuất hiện tại đây.',
    'library.emptyTitle': 'Chưa có bộ sticker nào',
    'library.emptyBody': 'Tạo một bộ Chibi 3D rồi chọn sticker bạn muốn lưu nhé.',
    'library.createFirst': 'Tạo bộ đầu tiên',
    'library.loadingTitle': 'Mở thư viện',
    'library.loadingBody': 'Đang tải các bộ sticker riêng tư…',
    'library.errorTitle': 'Chưa tải được thư viện',
    'library.packMeta': '{{count}} sticker · Riêng tư',

    // Pack Detail Screen
    'pack.pill': 'RIÊNG TƯ · ĐÃ LƯU',
    'pack.body': 'Chạm biểu tượng chia sẻ trên từng sticker để mở bảng chia sẻ của điện thoại.',
    'pack.remove': 'Gỡ khỏi thư viện',
    'pack.confirmRemoveTitle': 'Gỡ khỏi thư viện?',
    'pack.confirmRemoveBody': 'Liên kết bộ sticker đã lưu sẽ được gỡ. Ảnh nguồn và output demo vẫn tuân theo thời hạn lưu trữ chưa được chốt; đây chưa phải xóa dữ liệu toàn hệ thống.',
    'pack.confirmRemoveButton': 'Gỡ khỏi thư viện',
    'pack.footnote': 'Thao tác này chỉ gỡ saved-pack association. Bản đã chia sẻ ra ngoài không thể thu hồi; source/output demo còn theo retention chưa chốt.',
    'pack.loadingTitle': 'Mở bộ sticker',
    'pack.loadingBody': 'Đang tải sticker đã lưu…',
    'pack.errorTitle': 'Chưa mở được bộ sticker',
    'pack.notFound': 'Không tìm thấy bộ sticker.',
    'pack.backToLibrary': 'Quay lại thư viện',
  },
  en: {
    // General / Common
    'common.retry': 'Retry',
    'common.cancel': 'Cancel',
    'common.back': 'Back',
    'common.settings': 'Settings',
    'common.demoNotice': 'MVP is using 8 mock images — no AI/image processing yet.',

    // Tabs
    'tabs.home': 'Home',
    'tabs.library': 'Library',

    // Home Screen
    'home.eyebrow': 'DUHAT STUDIO',
    'home.brand': 'Gen Sticker',
    'home.activeJob.ready': 'READY',
    'home.activeJob.inProgress': 'IN PROGRESS',
    'home.activeJob.title': 'Recent Sticker Pack',
    'home.activeJob.body': 'You can resume without losing your submitted job.',
    'home.activeJob.continue': 'Resume',
    'home.hero.title': 'One Photo.\nEight Unique Stickers.',
    'home.hero.body': 'Choose a person, pet, or object. Duhat will prepare a 3D Chibi set for you to pick, save, and share.',
    'home.hero.startButton': 'Start Creating Stickers',
    'home.tips.title': 'Great Photos, Cute Stickers',
    'home.tips.tip1': 'Only one main subject',
    'home.tips.tip2': 'Clear and well-lit photo',
    'home.tips.tip3': 'You have rights to use the photo',

    // Create Screen
    'create.step': 'STEP 1 / 2',
    'create.title': 'Choose the Moment\nYou Want to Transform',
    'create.subtitle': 'Source photo is sent only after you agree and tap inspect.',
    'create.emptyTitle': 'One Photo, One Subject',
    'create.emptyBody': 'Clear person, pet, or object',
    'create.camera': 'Camera',
    'create.library': 'Library',
    'create.permissionTitle': 'Permission Denied',
    'create.permissionLibrary': 'Library permission is required to choose a photo.',
    'create.permissionCamera': 'Camera permission is required to take a photo.',
    'create.openSettings': 'Open Settings',
    'create.reqTitle': 'Suitable Photo Guidelines',
    'create.req1': 'Exactly one main subject',
    'create.req2': 'Clear face if it is a person',
    'create.req3': 'Well lit, not blurry or covered',
    'create.consent': 'I confirm that I own or have the right to use this photo to create stickers.',
    'create.readyTitle': 'Photo is Ready',
    'create.readyBody': 'Input validation complete. You may proceed to the next step.',
    'create.readyBodyDemo': 'Mock input validation complete. You may proceed to the next step.',
    'create.checkButton': 'Inspect Photo',
    'create.generateButton': 'Generate 8 3D Chibi Stickers',

    // Job Screen
    'job.pipelineDemo': 'MOCK PIPELINE',
    'job.pipelineChibi': '3D CHIBI',
    'job.title': 'Magic is Being\nPrepared ✨',
    'job.subtitle': 'You can leave this screen. Your submitted job is saved and will continue processing.',
    'job.restoring': 'Restoring submitted job…',
    'job.connecting': 'Connecting',
    'job.errorTitle': 'Failed to Load Progress',
    'job.retryConnection': 'Retry Connection',
    'job.failedTitle': 'Failed to Generate Stickers',
    'job.timedOutTitle': 'Job Timed Out',
    'job.retryAll': 'Retry Entire Set',
    'job.chooseOtherPhoto': 'Choose Another Photo',
    'job.backHome': 'Back to Home',
    'job.stage.queued': 'Safely queued',
    'job.stage.generating': 'Generating 8 3D Chibi variants',
    'job.stage.moderating': 'Checking output safety',
    'job.stage.ready': 'Sticker set is ready',
    'job.stage.processing': 'Processing sticker set',
    'job.step.check': 'Photo checked',
    'job.step.generate': '3D Chibi generated',
    'job.step.moderate': 'Output moderated',

    // Preview Screen
    'preview.pillDemo': '8 STICKERS · MOCK MODERATED',
    'preview.pillReal': '8 STICKERS · MODERATED',
    'preview.title': 'Select the Stickers\nYou Really Like',
    'preview.body': 'By default all 8 are selected for MVP. Tap each sticker to toggle.',
    'preview.selectedCount': '{{count}}/8',
    'preview.selectedLabel': 'selected to save',
    'preview.deselectAll': 'Deselect All',
    'preview.selectAll': 'Select All',
    'preview.saveButton': 'Save {{count}} stickers',
    'preview.regenerateButton': 'Regenerate all 8 stickers',
    'preview.confirmRegenerateTitle': 'Regenerate All?',
    'preview.confirmRegenerateBody': 'A new job will generate 8 stickers from the same source photo. Unsaved selections will be lost.',
    'preview.stay': 'Stay',
    'preview.regenerate': 'Regenerate',
    'preview.loadingTitle': 'Preparing Preview',
    'preview.loadingBody': 'Loading 8 moderated results…',
    'preview.errorTitle': 'Unable to Open Preview',
    'preview.errorBody': 'Sticker set is not ready.',
    'preview.retryLoad': 'Retry Load',
    'preview.saveErrorTitle': 'Save Unsuccessful',
    'preview.saveErrorBody': 'Preview remains available for you to retry.',

    // Library Screen
    'library.eyebrow': 'PRIVATE SPACE',
    'library.title': 'Your Library',
    'library.body': 'Only stickers you actively choose will appear here.',
    'library.emptyTitle': 'No Sticker Packs Yet',
    'library.emptyBody': 'Create a 3D Chibi set and choose which stickers to save.',
    'library.createFirst': 'Create First Pack',
    'library.loadingTitle': 'Opening Library',
    'library.loadingBody': 'Loading private sticker packs…',
    'library.errorTitle': 'Failed to Load Library',
    'library.packMeta': '{{count}} stickers · Private',

    // Pack Detail Screen
    'pack.pill': 'PRIVATE · SAVED',
    'pack.body': 'Tap the share icon on any sticker to open native share sheet.',
    'pack.remove': 'Remove from Library',
    'pack.confirmRemoveTitle': 'Remove from Library?',
    'pack.confirmRemoveBody': 'The saved sticker pack association will be removed. Source and demo output abide by retention rules; this does not erase system data.',
    'pack.confirmRemoveButton': 'Remove from Library',
    'pack.footnote': 'This action only removes the saved-pack association. Shared stickers cannot be revoked.',
    'pack.loadingTitle': 'Opening Sticker Pack',
    'pack.loadingBody': 'Loading saved stickers…',
    'pack.errorTitle': 'Unable to Open Sticker Pack',
    'pack.notFound': 'Sticker pack not found.',
    'pack.backToLibrary': 'Back to Library',
  },
} as const;

export type TranslationKey = keyof typeof translations.vi;

export function translate(
  locale: Locale,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const dict = translations[locale] || translations.vi;
  let text: string = dict[key] || translations.vi[key] || key;

  if (params) {
    Object.entries(params).forEach(([paramKey, value]) => {
      text = text.replace(new RegExp(`{{\\s*${paramKey}\\s*}}`, 'g'), String(value));
    });
  }

  return text;
}

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => Promise<void>;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nContextType>({
  locale: 'vi',
  setLocale: async () => {},
  t: (key, params) => translate('vi', key, params),
});

export function I18nProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>('vi');

  useEffect(() => {
    void (async () => {
      try {
        const saved = await SecureStore.getItemAsync(LANGUAGE_STORAGE_KEY);
        if (saved === 'vi' || saved === 'en') {
          setLocaleState(saved);
        }
      } catch {
        // Fallback to default locale
      }
    })();
  }, []);

  const setLocale = useCallback(async (nextLocale: Locale) => {
    setLocaleState(nextLocale);
    try {
      await SecureStore.setItemAsync(LANGUAGE_STORAGE_KEY, nextLocale);
    } catch {
      // Best effort save
    }
  }, []);

  const t = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) => translate(locale, key, params),
    [locale],
  );

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  return useContext(I18nContext);
}
