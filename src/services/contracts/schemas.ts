import { z } from 'zod';
import {
  API_ERROR_CODES,
  FACE_ACCESSORY_PRESETS,
  HAIR_COLOR_PRESETS,
  HAIR_STYLE_PRESETS,
  MOCK_SCENARIOS,
  OUTFIT_PRESETS,
  PRODUCT_STYLE_PRESETS,
} from './types';

export const apiErrorCodeSchema = z.enum(API_ERROR_CODES);
export const characterStatusSchema = z.enum([
  'DRAFT',
  'GENERATING_CANONICAL',
  'AWAITING_APPROVAL',
  'APPROVED',
  'DELETED',
]);
export const generationJobStatusSchema = z.enum([
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
]);
export const generationStageSchema = z.enum([
  'validating',
  'preparing',
  'generating',
  'background_removal',
  'postprocessing',
  'exporting',
  'completed',
]);
export const stickerPackStatusSchema = z.enum([
  'DRAFT',
  'QUEUED',
  'GENERATING',
  'SCORING',
  'OPTIMIZING',
  'POSTPROCESSING',
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'CANCELLED',
]);
export const stickerSlotStatusSchema = z.enum([
  'pending',
  'queued',
  'generating',
  'completed',
  'failed',
  'cancelled',
]);
export const exportFormatSchema = z.enum(['png', 'webp', 'zip']);
export const textPlacementSchema = z.enum(['top', 'center', 'bottom']);
export const mockScenarioSchema = z.enum(MOCK_SCENARIOS);

export const apiErrorSchema = z.object({
  code: z.string().min(1),
  message: z.string(),
  details: z.record(z.string(), z.unknown()).optional(),
  requestId: z.string().min(1),
});

export const validationResultSchema = z.object({
  valid: z.boolean(),
  reasonCodes: z.array(apiErrorCodeSchema),
  warnings: z.array(apiErrorCodeSchema),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  mimeType: z.string().min(1),
  byteSize: z.number().int().nonnegative(),
});

export const assetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(['selfie', 'canonical', 'sticker', 'export']),
  mimeType: z.string().min(1),
  width: z.number().int().nonnegative(),
  height: z.number().int().nonnegative(),
  sha256: z.string().min(1),
  contentUri: z.string().min(1),
});

export const assetUploadResponseSchema = z.object({
  asset: assetSchema,
  validation: validationResultSchema,
});

export const characterSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  status: characterStatusSchema,
  selfieAssetId: z.string().min(1),
  approvedProfileVersion: z.number().int().positive().nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const generationJobSchema = z.object({
  id: z.string().min(1),
  characterId: z.string().min(1),
  status: generationJobStatusSchema,
  stage: generationStageSchema,
  progress: z.number().min(0).max(100),
  candidateAssetIds: z.array(z.string()),
  errorCode: apiErrorCodeSchema.nullable(),
  errorMessage: z.string().nullable(),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const jobEventSchema = z.object({
  id: z.string().min(1),
  jobId: z.string().min(1),
  stage: generationStageSchema,
  progress: z.number().min(0).max(100),
  payload: z.record(z.string(), z.unknown()),
  createdAt: z.string().min(1),
});

export const canonicalCandidateSchema = z.object({
  assetId: z.string().min(1),
  imageUri: z.string().min(1),
  scoreSummary: z.object({
    likeness: z.enum(['excellent', 'good', 'fair']),
    clarity: z.enum(['excellent', 'good', 'fair']),
    consistency: z.enum(['excellent', 'good', 'fair']),
  }),
  recommended: z.boolean(),
});

export const characterProfileConfigSchema = z.object({
  hair: z.object({
    style: z.enum(HAIR_STYLE_PRESETS),
    color: z.enum(HAIR_COLOR_PRESETS),
  }),
  faceAccessories: z
    .array(z.enum(FACE_ACCESSORY_PRESETS))
    .min(1)
    .max(2)
    .refine((items) => !items.includes('none') || items.length === 1, {
      message: 'The none accessory preset cannot be combined with another accessory.',
    }),
  outfit: z.enum(OUTFIT_PRESETS),
  style: z.enum(PRODUCT_STYLE_PRESETS),
});

export const characterProfileSchema = z.object({
  characterId: z.string().min(1),
  version: z.number().int().positive(),
  canonicalAssetId: z.string().min(1),
  config: characterProfileConfigSchema,
  approvedAt: z.string().min(1),
});

export const stickerTextConfigSchema = z.object({
  text: z.string().max(40),
  placement: textPlacementSchema,
  fontSize: z.number().int().min(16).max(48),
});

export const stickerSlotSchema = z.object({
  id: z.string().min(1),
  emotionId: z.string().min(1),
  status: stickerSlotStatusSchema,
  progress: z.number().min(0).max(100),
  selectedAssetId: z.string().nullable(),
  candidateAssetIds: z.array(z.string()),
  errorCode: apiErrorCodeSchema.nullable(),
  retryCount: z.number().int().nonnegative(),
  imageUri: z.string().optional(),
  previousImageUri: z.string().optional(),
  text: stickerTextConfigSchema.optional(),
});

export const stickerPackSchema = z.object({
  id: z.string().min(1),
  characterId: z.string().min(1),
  profileVersion: z.number().int().positive(),
  templateId: z.string().min(1),
  status: stickerPackStatusSchema,
  slots: z.array(stickerSlotSchema),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
});

export const exportManifestSchema = z.object({
  id: z.string().min(1),
  packId: z.string().min(1),
  formats: z.array(exportFormatSchema).min(1),
  assets: z.array(
    z.object({
      assetId: z.string().min(1),
      fileName: z.string().min(1),
      format: exportFormatSchema,
      contentUri: z.string().min(1),
    }),
  ),
  checksums: z.record(z.string(), z.string()),
  expiresAt: z.string().min(1),
  nativeShareAvailable: z.boolean(),
});

export const consentStateSchema = z.object({
  consentVersion: z.string().min(1),
  accepted: z.boolean(),
  reuseOptIn: z.boolean(),
  acceptedAt: z.string().nullable(),
});

export const selfieUploadInputSchema = z.object({
  uri: z
    .string()
    .min(1)
    .refine((uri) => !uri.startsWith('data:'), {
      message: 'Selfie input must be a local URI, never base64 data.',
    }),
  mimeType: z.string().optional(),
  fileName: z.string().optional(),
  width: z.number().int().nonnegative().optional(),
  height: z.number().int().nonnegative().optional(),
  byteSize: z.number().int().nonnegative().optional(),
});

export const createCharacterInputSchema = z.object({
  displayName: z.string().trim().min(1).max(60),
  selfieAssetId: z.string().min(1),
});

export const createCanonicalJobInputSchema = z.object({
  characterId: z.string().min(1),
  preset: z.object({
    outfit: z.enum(OUTFIT_PRESETS),
    style: z.enum(PRODUCT_STYLE_PRESETS),
  }),
});

export const canonicalApprovalInputSchema = z.object({
  characterId: z.string().min(1),
  canonicalAssetId: z.string().min(1),
  config: characterProfileConfigSchema,
});

export const updateCharacterProfileInputSchema = z.object({
  characterId: z.string().min(1),
  config: characterProfileConfigSchema,
});

export const createStickerPackInputSchema = z.object({
  characterId: z.string().min(1),
  profileVersion: z.number().int().positive(),
  templateId: z.string().min(1),
});

export const regenerateStickerSlotInputSchema = z.object({
  packId: z.string().min(1),
  slotId: z.string().min(1),
});

export const updateStickerTextInputSchema = z.object({
  packId: z.string().min(1),
  slotId: z.string().min(1),
  text: z.string().max(40),
  placement: textPlacementSchema,
  fontSize: z.number().int().min(16).max(48),
});

export const exportStickerPackInputSchema = z.object({
  packId: z.string().min(1),
  formats: z.array(exportFormatSchema).min(1),
});
