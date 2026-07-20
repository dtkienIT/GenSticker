import type { ApiError, ApiErrorCode, JsonValue } from './types';

let requestSequence = 0;

export function createRequestId(): string {
  requestSequence += 1;
  return `mock-request-${String(requestSequence).padStart(4, '0')}`;
}

export class ProductServiceError extends Error implements ApiError {
  readonly code: ApiErrorCode | string;
  readonly details?: Record<string, JsonValue>;
  readonly requestId: string;

  constructor(
    code: ApiErrorCode | string,
    message: string,
    details?: Record<string, JsonValue>,
    requestId = createRequestId(),
  ) {
    super(message);
    this.name = 'ProductServiceError';
    this.code = code;
    this.details = details;
    this.requestId = requestId;
  }
}

export function toApiError(error: unknown): ApiError {
  if (error instanceof ProductServiceError) {
    return error;
  }

  return {
    code: 'unknown_error',
    message: error instanceof Error ? error.message : 'Unknown product error',
    requestId: createRequestId(),
  };
}
