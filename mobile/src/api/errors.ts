export class AppError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly status?: number;

  constructor(
    message: string,
    options: { code: string; retryable?: boolean; status?: number },
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code;
    this.retryable = options.retryable ?? false;
    if (options.status !== undefined) this.status = options.status;
  }
}

const safeMessages: Record<string, string> = {
  CONSENT_REQUIRED: 'Bạn cần xác nhận quyền sử dụng ảnh trước khi tiếp tục.',
  EMPTY_UPLOAD: 'Ảnh đã chọn đang trống. Hãy chọn một ảnh khác.',
  IMAGE_TOO_LARGE: 'Ảnh có dung lượng quá lớn. Hãy chọn ảnh nhỏ hơn.',
  UNSUPPORTED_IMAGE_TYPE: 'Định dạng ảnh này chưa được hỗ trợ. Hãy thử JPG, PNG hoặc WebP.',
  IMAGE_SIGNATURE_MISMATCH: 'Tệp đã chọn không phải ảnh hợp lệ. Hãy chọn ảnh khác.',
  SOURCE_NOT_READY: 'Ảnh nguồn chưa sẵn sàng để tạo sticker. Hãy kiểm tra lại ảnh.',
  INPUT_INVALID: 'Ảnh chưa đạt yêu cầu. Hãy chọn ảnh rõ, đủ sáng và chỉ có một chủ thể chính.',
  INPUT_BLOCKED: 'Ảnh này không thể được sử dụng. Hãy thử một ảnh khác.',
  OUTPUT_BLOCKED: 'Bộ sticker chưa vượt qua kiểm tra an toàn. Bạn có thể thử tạo lại.',
  GENERATION_FAILED: 'Chưa thể tạo sticker lúc này. Bạn có thể thử lại.',
  GENERATION_TIMEOUT: 'Quá trình tạo mất nhiều thời gian hơn dự kiến. Hãy thử lại.',
  NETWORK_ERROR: 'Không thể kết nối máy chủ. Kiểm tra mạng và thử lại nhé.',
  UNAUTHORIZED: 'Phiên sử dụng đã hết hạn. Hãy thử lại.',
  AUTH_REQUIRED: 'Phiên sử dụng chưa sẵn sàng. Hãy thử lại.',
  AUTH_NOT_CONFIGURED: 'Máy chủ chưa cấu hình xác thực. Vui lòng thử lại sau.',
  LOCAL_AUTH_DISABLED: 'Chế độ dùng thiết bị cục bộ đang bị tắt trên máy chủ.',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này.',
  NOT_FOUND: 'Dữ liệu này không còn tồn tại hoặc bạn không có quyền truy cập.',
  INVALID_STICKER_SELECTION: 'Một hoặc nhiều sticker được chọn không hợp lệ. Hãy tải lại bộ sticker.',
  DUPLICATE_STICKER_SELECTION: 'Danh sách chọn có sticker bị trùng. Hãy chọn lại.',
  STICKER_SET_INCOMPLETE: 'Bộ sticker chưa đủ 8 kết quả an toàn nên chưa thể lưu.',
  JOB_NOT_REGENERATABLE: 'Job này không thể tạo lại. Hãy bắt đầu một lần tạo mới.',
  IDEMPOTENCY_KEY_REUSED: 'Yêu cầu đã thay đổi trong khi đang thử lại. Hãy thực hiện lại thao tác.',
  INVALID_IDEMPOTENCY_KEY: 'Mã chống gửi trùng chưa hợp lệ. Hãy thử lại thao tác.',
  SAVE_FAILED: 'Chưa lưu được sticker. Bản xem trước vẫn còn để bạn thử lại.',
  ASSET_PATH_INVALID: 'Đường dẫn sticker không hợp lệ. Hãy tải lại bộ sticker.',
  ASSET_UNAVAILABLE: 'Sticker này tạm thời chưa thể chia sẻ. Hãy thử lại sau.',
  REQUEST_VALIDATION_FAILED: 'Yêu cầu chưa hợp lệ. Hãy kiểm tra thông tin và thử lại.',
  MOCK_SCENARIO_DISABLED: 'Kịch bản mô phỏng này không khả dụng.',
  INVALID_RESPONSE: 'Máy chủ trả về dữ liệu chưa hợp lệ. Hãy thử lại sau.',
};
const invalidResponseMessage = 'Máy chủ trả về dữ liệu chưa hợp lệ. Hãy thử lại sau.';

export function safeErrorMessage(error: unknown): string {
  if (error instanceof AppError) return error.message;
  if (error instanceof Error && error.message in safeMessages) {
    return safeMessages[error.message] ?? invalidResponseMessage;
  }
  return 'Đã có lỗi xảy ra. Vui lòng thử lại.';
}

export function messageForCode(code?: string): string {
  return (code && safeMessages[code]) || 'Chưa thể hoàn tất yêu cầu. Hãy thử lại.';
}

function objectRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function problemToAppError(status: number, payload: unknown): AppError {
  const envelope = objectRecord(payload);
  const detail = objectRecord(envelope?.detail);
  const codeCandidate = envelope?.code ?? envelope?.error_code ?? detail?.code;
  const code =
    typeof codeCandidate === 'string'
      ? codeCandidate
      : status === 401
        ? 'UNAUTHORIZED'
        : 'REQUEST_FAILED';
  const serverRetryable = envelope?.retryable;
  const retryable =
    typeof serverRetryable === 'boolean'
      ? serverRetryable
      : status === 408 || status === 429 || status >= 500;
  return new AppError(messageForCode(code), { code, retryable, status });
}

export function retrySafeMutation(failureCount: number, error: unknown): boolean {
  return error instanceof AppError && error.retryable && failureCount < 2;
}
