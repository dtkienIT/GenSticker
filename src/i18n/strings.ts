import { localized } from './types';

export const UI_STRINGS = Object.freeze({
  common: Object.freeze({
    retry: localized('Thử lại', 'Retry'),
    goBack: localized('Quay lại', 'Go back'),
    requestId: localized('Mã yêu cầu', 'Request ID'),
  }),
  errors: Object.freeze({
    unknown: Object.freeze({
      title: localized('Đã xảy ra lỗi', 'Something went wrong'),
      message: localized(
        'Ứng dụng chưa thể hoàn tất thao tác này.',
        'The app could not complete this action.',
      ),
      action: localized(
        'Hãy thử lại. Nếu lỗi tiếp diễn, hãy mở phần Trợ giúp.',
        'Try again. If the issue continues, open Help.',
      ),
    }),
  }),
});
