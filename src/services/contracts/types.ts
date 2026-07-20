export type JsonPrimitive = string | number | boolean | null;
export type JsonValue = JsonPrimitive | JsonValue[] | { [key: string]: JsonValue };

export const API_ERROR_CODES = [
  'unauthorized',
  'forbidden',
  'asset_not_found',
  'character_not_found',
  'job_not_found',
  'pack_not_found',
  'unsupported_type',
  'file_too_large',
  'invalid_image',
  'resolution_too_low',
  'resolution_too_high',
  'invalid_aspect_ratio',
  'blank_image',
  'face_count_invalid',
  'face_too_small',
  'image_blurry',
  'pose_out_of_range',
  'occlusion_high',
  'generation_failed',
  'provider_unavailable',
  'budget_exceeded',
  'job_cancelled',
  'storage_read_failed',
  'invalid_character_state',
  'invalid_canonical_candidate',
  'character_not_approved',
  'invalid_profile_preset',
  'retry_limit_exceeded',
  'scoring_failed',
  'mask_quality_failed',
  'text_layout_invalid',
  'export_failed',
  'asset_url_expired',
  'consent_required',
  'safety_rejected',
  'impersonation_rejected',
  'licensed_character_rejected',
  'invalid_job_request',
  'invalid_job_state',
  'provider_not_configured',
  'generation_timeout',
  'storage_write_failed',
  'database_unavailable',
  'deletion_failed',
  'pack_incomplete',
  'idempotency_conflict',
  'model_bundle_inactive',
  'license_blocked',
  'provider_callback_invalid',
  'invalid_pack_state',
  'pack_optimization_failed',
] as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[number];

export interface ApiError {
  code: ApiErrorCode | string;
  message: string;
  details?: Record<string, JsonValue>;
  requestId: string;
}

export interface User {
  id: string;
  displayName: string;
  locale: string;
}

export interface ValidationResult {
  valid: boolean;
  reasonCodes: ApiErrorCode[];
  warnings: ApiErrorCode[];
  width: number;
  height: number;
  mimeType: string;
  byteSize: number;
}

export type AssetType = 'selfie' | 'canonical' | 'sticker' | 'export';

export interface Asset {
  id: string;
  type: AssetType;
  mimeType: string;
  width: number;
  height: number;
  sha256: string;
  contentUri: string;
}

export interface AssetUploadResponse {
  asset: Asset;
  validation: ValidationResult;
}

export type CharacterStatus =
  'DRAFT' | 'GENERATING_CANONICAL' | 'AWAITING_APPROVAL' | 'APPROVED' | 'DELETED';

export interface Character {
  id: string;
  displayName: string;
  status: CharacterStatus;
  selfieAssetId: string;
  approvedProfileVersion: number | null;
  createdAt: string;
  updatedAt: string;
}

export type GenerationJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';

export type GenerationStage =
  | 'validating'
  | 'preparing'
  | 'generating'
  | 'background_removal'
  | 'postprocessing'
  | 'exporting'
  | 'completed';

export interface GenerationJob {
  id: string;
  characterId: string;
  status: GenerationJobStatus;
  stage: GenerationStage;
  progress: number;
  candidateAssetIds: string[];
  errorCode: ApiErrorCode | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JobEvent {
  id: string;
  jobId: string;
  stage: GenerationStage;
  progress: number;
  payload: Record<string, JsonValue>;
  createdAt: string;
}

export type CandidateIndicator = 'excellent' | 'good' | 'fair';

export interface CanonicalCandidate {
  assetId: string;
  imageUri: string;
  scoreSummary: {
    likeness: CandidateIndicator;
    clarity: CandidateIndicator;
    consistency: CandidateIndicator;
  };
  recommended: boolean;
}

export const HAIR_STYLE_PRESETS = ['original', 'short', 'long', 'curly', 'bob'] as const;
export const HAIR_COLOR_PRESETS = ['original', 'black', 'brown', 'blonde', 'pastel'] as const;
export const FACE_ACCESSORY_PRESETS = [
  'none',
  'round_glasses',
  'square_glasses',
  'hair_clip',
] as const;
export const OUTFIT_PRESETS = ['casual', 'hoodie', 'office', 'traditional', 'sport'] as const;
export const PRODUCT_STYLE_PRESETS = ['chibi', 'cartoon', 'three_d', 'meme'] as const;

export type HairStylePreset = (typeof HAIR_STYLE_PRESETS)[number];
export type HairColorPreset = (typeof HAIR_COLOR_PRESETS)[number];
export type FaceAccessoryPreset = (typeof FACE_ACCESSORY_PRESETS)[number];
export type OutfitPreset = (typeof OUTFIT_PRESETS)[number];
export type ProductStylePreset = (typeof PRODUCT_STYLE_PRESETS)[number];

export interface CharacterProfileConfig {
  hair: {
    style: HairStylePreset;
    color: HairColorPreset;
  };
  faceAccessories: FaceAccessoryPreset[];
  outfit: OutfitPreset;
  style: ProductStylePreset;
}

export interface CharacterProfile {
  characterId: string;
  version: number;
  canonicalAssetId: string;
  config: CharacterProfileConfig;
  approvedAt: string;
}

export type StickerPackStatus =
  | 'DRAFT'
  | 'QUEUED'
  | 'GENERATING'
  | 'SCORING'
  | 'OPTIMIZING'
  | 'POSTPROCESSING'
  | 'COMPLETED'
  | 'PARTIAL'
  | 'FAILED'
  | 'CANCELLED';

export type StickerSlotStatus =
  'pending' | 'queued' | 'generating' | 'completed' | 'failed' | 'cancelled';

export type TextPlacement = 'top' | 'center' | 'bottom';

export interface StickerTextConfig {
  text: string;
  placement: TextPlacement;
  fontSize: number;
}

export interface StickerSlot {
  id: string;
  emotionId: string;
  status: StickerSlotStatus;
  progress: number;
  selectedAssetId: string | null;
  candidateAssetIds: string[];
  errorCode: ApiErrorCode | null;
  retryCount: number;
  imageUri?: string;
  previousImageUri?: string;
  text?: StickerTextConfig;
}

export interface StickerPack {
  id: string;
  characterId: string;
  profileVersion: number;
  templateId: string;
  status: StickerPackStatus;
  slots: StickerSlot[];
  createdAt: string;
  updatedAt: string;
}

export type ExportFormat = 'png' | 'webp' | 'zip';

export interface ExportAsset {
  assetId: string;
  fileName: string;
  format: ExportFormat;
  contentUri: string;
}

export interface ExportManifest {
  id: string;
  packId: string;
  formats: ExportFormat[];
  assets: ExportAsset[];
  checksums: Record<string, string>;
  expiresAt: string;
  nativeShareAvailable: boolean;
}

export interface ConsentState {
  consentVersion: string;
  accepted: boolean;
  reuseOptIn: boolean;
  acceptedAt: string | null;
}

export interface SelfieUploadInput {
  uri: string;
  mimeType?: string;
  fileName?: string;
  width?: number;
  height?: number;
  byteSize?: number;
}

export interface CreateCharacterInput {
  displayName: string;
  selfieAssetId: string;
}

export interface CreateCanonicalJobInput {
  characterId: string;
  preset: Pick<CharacterProfileConfig, 'outfit' | 'style'>;
}

export interface GenerationJobFilters {
  characterId?: string;
  status?: GenerationJobStatus;
}

export interface CanonicalApprovalInput {
  characterId: string;
  canonicalAssetId: string;
  config: CharacterProfileConfig;
}

export interface UpdateCharacterProfileInput {
  characterId: string;
  config: CharacterProfileConfig;
}

export interface CreateStickerPackInput {
  characterId: string;
  profileVersion: number;
  templateId: string;
}

export interface RegenerateStickerSlotInput {
  packId: string;
  slotId: string;
}

export interface UpdateStickerTextInput {
  packId: string;
  slotId: string;
  text: string;
  placement: TextPlacement;
  fontSize: number;
}

export interface ExportStickerPackInput {
  packId: string;
  formats: ExportFormat[];
}

export interface SafeDiagnosticEvent {
  id: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
  screen?: string;
  action: string;
  entityId?: string;
  jobStage?: GenerationStage;
  durationMs?: number;
  errorCode?: ApiErrorCode | string;
  requestId?: string;
  serviceMode: 'mock' | 'http';
}

export interface MockRecordCounts {
  assets: number;
  characters: number;
  profiles: number;
  jobs: number;
  jobEvents: number;
  packs: number;
  exports: number;
}

export interface ProductDiagnostics {
  serviceMode: 'mock' | 'http';
  scenario: MockScenario;
  counts: MockRecordCounts;
  jobs: Array<Pick<GenerationJob, 'id' | 'status' | 'stage' | 'progress'>>;
  packs: Array<Pick<StickerPack, 'id' | 'status'>>;
  lastSafeErrors: SafeDiagnosticEvent[];
}

export const MOCK_SCENARIOS = [
  'happy_path',
  'invalid_selfie',
  'face_count_invalid',
  'blurry_selfie',
  'provider_unavailable',
  'generation_failed',
  'job_cancelled',
  'storage_read_failed',
  'budget_exceeded',
  'partial_pack',
  'retry_limit_exceeded',
  'scoring_failed',
  'export_failed',
  'expired_export',
  'consent_required',
  'safety_rejected',
  'impersonation_rejected',
  'licensed_character_rejected',
] as const;

export type MockScenario = (typeof MOCK_SCENARIOS)[number];
