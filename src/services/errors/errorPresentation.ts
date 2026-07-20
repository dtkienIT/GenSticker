import {
  API_ERROR_STRINGS,
  DEFAULT_APP_LOCALE,
  localize,
  UI_STRINGS,
  type AppLocale,
  type LocalizedErrorStrings,
} from '@/i18n';
import { API_ERROR_CODES, type ApiErrorCode } from '@/services/contracts/types';

export type ProductErrorSeverity = 'info' | 'warning' | 'error';

export type ProductErrorField =
  'selfie' | 'character' | 'canonicalCandidate' | 'profile' | 'stickerText' | 'consent';

export interface ApiErrorBehavior {
  readonly retryAllowed: boolean;
  readonly severity: ProductErrorSeverity;
  readonly field?: ProductErrorField;
}

export interface ApiErrorPresentationDefinition extends ApiErrorBehavior, LocalizedErrorStrings {}

export interface ProductErrorPresentation extends ApiErrorBehavior {
  readonly code: ApiErrorCode | string;
  readonly title: string;
  readonly message: string;
  readonly action: string;
  readonly requestId?: string;
  readonly isKnownCode: boolean;
}

const API_ERROR_BEHAVIORS = Object.freeze({
  unauthorized: { retryAllowed: true, severity: 'warning' },
  forbidden: { retryAllowed: false, severity: 'warning' },
  asset_not_found: { retryAllowed: false, severity: 'info' },
  character_not_found: { retryAllowed: false, severity: 'info' },
  job_not_found: { retryAllowed: false, severity: 'info' },
  pack_not_found: { retryAllowed: false, severity: 'info' },
  unsupported_type: { retryAllowed: false, severity: 'info', field: 'selfie' },
  file_too_large: { retryAllowed: false, severity: 'info', field: 'selfie' },
  invalid_image: { retryAllowed: false, severity: 'info', field: 'selfie' },
  resolution_too_low: { retryAllowed: false, severity: 'info', field: 'selfie' },
  resolution_too_high: { retryAllowed: false, severity: 'info', field: 'selfie' },
  invalid_aspect_ratio: { retryAllowed: false, severity: 'info', field: 'selfie' },
  blank_image: { retryAllowed: false, severity: 'info', field: 'selfie' },
  face_count_invalid: { retryAllowed: false, severity: 'info', field: 'selfie' },
  face_too_small: { retryAllowed: false, severity: 'info', field: 'selfie' },
  image_blurry: { retryAllowed: false, severity: 'info', field: 'selfie' },
  pose_out_of_range: { retryAllowed: false, severity: 'info', field: 'selfie' },
  occlusion_high: { retryAllowed: false, severity: 'info', field: 'selfie' },
  generation_failed: { retryAllowed: true, severity: 'error' },
  provider_unavailable: { retryAllowed: true, severity: 'error' },
  budget_exceeded: { retryAllowed: false, severity: 'warning' },
  job_cancelled: { retryAllowed: false, severity: 'info' },
  storage_read_failed: { retryAllowed: true, severity: 'error' },
  invalid_character_state: { retryAllowed: true, severity: 'info', field: 'character' },
  invalid_canonical_candidate: {
    retryAllowed: true,
    severity: 'info',
    field: 'canonicalCandidate',
  },
  character_not_approved: { retryAllowed: false, severity: 'info', field: 'character' },
  invalid_profile_preset: { retryAllowed: false, severity: 'info', field: 'profile' },
  retry_limit_exceeded: { retryAllowed: false, severity: 'warning' },
  scoring_failed: { retryAllowed: true, severity: 'error' },
  mask_quality_failed: { retryAllowed: true, severity: 'warning' },
  text_layout_invalid: { retryAllowed: false, severity: 'info', field: 'stickerText' },
  export_failed: { retryAllowed: true, severity: 'error' },
  asset_url_expired: { retryAllowed: true, severity: 'info' },
  consent_required: { retryAllowed: false, severity: 'info', field: 'consent' },
  safety_rejected: { retryAllowed: false, severity: 'warning', field: 'selfie' },
  impersonation_rejected: { retryAllowed: false, severity: 'warning', field: 'selfie' },
  licensed_character_rejected: {
    retryAllowed: false,
    severity: 'warning',
    field: 'selfie',
  },
  invalid_job_request: { retryAllowed: false, severity: 'info' },
  invalid_job_state: { retryAllowed: true, severity: 'info' },
  provider_not_configured: { retryAllowed: true, severity: 'error' },
  generation_timeout: { retryAllowed: true, severity: 'error' },
  storage_write_failed: { retryAllowed: true, severity: 'error' },
  database_unavailable: { retryAllowed: true, severity: 'error' },
  deletion_failed: { retryAllowed: true, severity: 'error' },
  pack_incomplete: { retryAllowed: true, severity: 'info' },
  idempotency_conflict: { retryAllowed: true, severity: 'warning' },
  model_bundle_inactive: { retryAllowed: true, severity: 'error' },
  license_blocked: { retryAllowed: false, severity: 'error' },
  provider_callback_invalid: { retryAllowed: true, severity: 'error' },
  invalid_pack_state: { retryAllowed: true, severity: 'info' },
  pack_optimization_failed: { retryAllowed: true, severity: 'error' },
} as const satisfies Record<ApiErrorCode, ApiErrorBehavior>);

export const API_ERROR_PRESENTATION_DEFINITIONS = Object.freeze(
  Object.fromEntries(
    API_ERROR_CODES.map((code) => [
      code,
      Object.freeze({
        ...API_ERROR_STRINGS[code],
        ...API_ERROR_BEHAVIORS[code],
      }),
    ]),
  ) as unknown as Readonly<Record<ApiErrorCode, ApiErrorPresentationDefinition>>,
);

const API_ERROR_CODE_SET: ReadonlySet<string> = new Set(API_ERROR_CODES);
const SAFE_REFERENCE_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,95}$/u;

export function isApiErrorCode(code: unknown): code is ApiErrorCode {
  return typeof code === 'string' && API_ERROR_CODE_SET.has(code);
}

function safeReference(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();
  return SAFE_REFERENCE_PATTERN.test(trimmed) ? trimmed : undefined;
}

function readErrorReference(error: unknown): { code: string; requestId?: string } {
  if (typeof error === 'string') {
    return { code: safeReference(error) ?? 'unknown_error' };
  }

  if (typeof error !== 'object' || error === null) {
    return { code: 'unknown_error' };
  }

  const record = error as Record<string, unknown>;
  const code = safeReference(record.code) ?? 'unknown_error';
  const requestId = safeReference(record.requestId);

  return requestId ? { code, requestId } : { code };
}

export function getApiErrorPresentation(
  error: unknown,
  locale: AppLocale | string = DEFAULT_APP_LOCALE,
): ProductErrorPresentation {
  const { code, requestId } = readErrorReference(error);

  if (isApiErrorCode(code)) {
    const definition = API_ERROR_PRESENTATION_DEFINITIONS[code];

    return {
      code,
      title: localize(definition.title, locale),
      message: localize(definition.message, locale),
      action: localize(definition.action, locale),
      retryAllowed: definition.retryAllowed,
      severity: definition.severity,
      ...(definition.field ? { field: definition.field } : {}),
      ...(requestId ? { requestId } : {}),
      isKnownCode: true,
    };
  }

  const requestReference = requestId
    ? ` ${localize(UI_STRINGS.common.requestId, locale)}: ${requestId}.`
    : '';

  return {
    code,
    title: localize(UI_STRINGS.errors.unknown.title, locale),
    message: `${localize(UI_STRINGS.errors.unknown.message, locale)}${requestReference}`,
    action: localize(UI_STRINGS.errors.unknown.action, locale),
    retryAllowed: true,
    severity: 'error',
    ...(requestId ? { requestId } : {}),
    isKnownCode: false,
  };
}
