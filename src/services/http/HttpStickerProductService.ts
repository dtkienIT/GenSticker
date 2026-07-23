import { z, type ZodType } from 'zod';
import { Platform } from 'react-native';
import {
  API_ERROR_CODES,
  MOCK_SCENARIOS,
  ProductServiceError,
  assetUploadResponseSchema,
  canonicalApprovalInputSchema,
  canonicalCandidateSchema,
  characterProfileSchema,
  characterSchema,
  consentStateSchema,
  createCanonicalJobInputSchema,
  createCharacterInputSchema,
  createStickerPackInputSchema,
  exportManifestSchema,
  exportStickerPackInputSchema,
  generationJobSchema,
  jobEventSchema,
  regenerateStickerSlotInputSchema,
  selfieUploadInputSchema,
  stickerPackSchema,
  stickerSlotSchema,
  updateCharacterProfileInputSchema,
  updateStickerTextInputSchema,
  type ApiErrorCode,
  type AssetUploadResponse,
  type CanonicalApprovalInput,
  type CanonicalCandidate,
  type Character,
  type CharacterProfile,
  type ConsentState,
  type CreateCanonicalJobInput,
  type CreateCharacterInput,
  type CreateStickerPackInput,
  type ExportAsset,
  type ExportManifest,
  type ExportStickerPackInput,
  type GenerationJob,
  type GenerationJobFilters,
  type GenerationStage,
  type JobEvent,
  type JsonValue,
  type MockScenario,
  type ProductDiagnostics,
  type RegenerateStickerSlotInput,
  type SafeDiagnosticEvent,
  type SelfieUploadInput,
  type StickerPack,
  type StickerProductService,
  type StickerSlot,
  type StickerTextConfig,
  type UpdateCharacterProfileInput,
  type UpdateStickerTextInput,
  type User,
} from '@/services/contracts';
import { resolveBaseUrl } from '@/services/api/resolveBaseUrl';

type UnknownRecord = Record<string, unknown>;

interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: RequestInit['body'];
  json?: unknown;
  notFoundCode?: ApiErrorCode;
}

const KNOWN_ERROR_CODES = new Set<string>(API_ERROR_CODES);
const KNOWN_JOB_STAGES = new Set<string>([
  'validating',
  'preparing',
  'generating',
  'background_removal',
  'postprocessing',
  'exporting',
  'completed',
]);
const KNOWN_JOB_STATUSES = new Set<string>([
  'queued',
  'running',
  'succeeded',
  'failed',
  'cancelled',
]);
const KNOWN_PACK_STATUSES = new Set<string>([
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
const KNOWN_SLOT_STATUSES = new Set<string>([
  'pending',
  'queued',
  'generating',
  'completed',
  'failed',
  'cancelled',
]);

const userSchema = z.object({
  id: z.string().min(1),
  displayName: z.string().min(1),
  locale: z.string().min(1),
});

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function pick(record: UnknownRecord, ...keys: string[]): unknown {
  for (const key of keys) if (key in record) return record[key];
  return undefined;
}

function stringValue(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

function numberValue(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function booleanValue(value: unknown): boolean | undefined {
  return typeof value === 'boolean' ? value : undefined;
}

function entityPayload(payload: unknown, ...keys: string[]): unknown {
  if (!isRecord(payload)) return payload;
  for (const key of [...keys, 'data']) {
    const nested = payload[key];
    if (nested !== undefined && !Array.isArray(nested)) return nested;
  }
  return payload;
}

function listPayload(payload: unknown, ...keys: string[]): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (isRecord(payload)) {
    for (const key of [...keys, 'items', 'data']) {
      if (Array.isArray(payload[key])) return payload[key] as unknown[];
    }
  }
  throw invalidResponse('list', ['Expected an array response.']);
}

function invalidResponse(entity: string, issues: string[] = []): ProductServiceError {
  return new ProductServiceError(
    'invalid_response',
    `The API returned an invalid ${entity} response.`,
    issues.length > 0 ? { issues } : undefined,
  );
}

function parseContract<T>(schema: ZodType<T>, value: unknown, entity: string): T {
  const result = schema.safeParse(value);
  if (result.success) return result.data;
  throw invalidResponse(
    entity,
    result.error.issues.map((issue) => `${issue.path.join('.') || entity}: ${issue.message}`),
  );
}

function knownErrorCode(value: unknown, fallback: ApiErrorCode): ApiErrorCode {
  return typeof value === 'string' && KNOWN_ERROR_CODES.has(value)
    ? (value as ApiErrorCode)
    : fallback;
}

function normalizeStage(value: unknown, progress = 0): GenerationStage {
  if (typeof value === 'string' && KNOWN_JOB_STAGES.has(value)) return value as GenerationStage;
  if (progress >= 100) return 'completed';
  if (progress >= 80) return 'postprocessing';
  if (progress >= 45) return 'generating';
  if (progress >= 15) return 'preparing';
  return 'validating';
}

function profileConfigPayload(value: unknown): unknown {
  if (!isRecord(value)) return value;
  const hair = isRecord(value.hair) ? value.hair : {};
  return {
    hair: { style: hair.style, color: hair.color },
    faceAccessories: pick(value, 'faceAccessories', 'face_accessories'),
    outfit: value.outfit,
    style: value.style,
  };
}

function toJsonRecord(value: unknown): Record<string, JsonValue> {
  return isRecord(value) ? (value as Record<string, JsonValue>) : {};
}

function queryString(values: Record<string, string | number | undefined>): string {
  const entries = Object.entries(values).filter((entry): entry is [string, string | number] => {
    return entry[1] !== undefined;
  });
  return entries.length === 0
    ? ''
    : `?${entries.map(([key, value]) => `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`).join('&')}`;
}

export class HttpStickerProductService implements StickerProductService {
  private get baseUrl(): string {
    return resolveBaseUrl().replace(/\/+$/u, '');
  }

  private get devUserId(): string {
    return process.env.EXPO_PUBLIC_DEV_USER_ID || 'local-dev-user';
  }

  private contentUri(assetId: string): string {
    return `${this.baseUrl}/assets/${encodeURIComponent(assetId)}/content`;
  }

  private absoluteContentUri(value: unknown, assetId?: string): string | undefined {
    const uri = stringValue(value);
    if (!uri) return assetId ? this.contentUri(assetId) : undefined;
    if (!uri.startsWith('/')) return uri;
    const origin = /^(https?:\/\/[^/]+)/u.exec(this.baseUrl)?.[1];
    return origin ? `${origin}${uri}` : `${this.baseUrl}${uri}`;
  }

  private async request(path: string, options: HttpRequestOptions = {}): Promise<unknown> {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'X-Dev-User-Id': this.devUserId,
    };
    let body = options.body;
    if (options.json !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.json);
    }

    let response: Response;
    try {
      response = await fetch(`${this.baseUrl}${path}`, {
        method: options.method ?? 'GET',
        headers,
        body,
      });
    } catch (error) {
      throw new ProductServiceError(
        'network_error',
        error instanceof Error ? error.message : 'Unable to reach the GenSticker API.',
        { path },
      );
    }

    const text = response.status === 204 ? '' : await response.text();
    let payload: unknown;
    if (text.length > 0) {
      try {
        payload = JSON.parse(text) as unknown;
      } catch {
        if (response.ok) throw invalidResponse('JSON', ['Response body was not valid JSON.']);
        payload = { message: text };
      }
    }

    if (!response.ok) throw this.responseError(response, payload, path, options.notFoundCode);
    return payload;
  }

  private responseError(
    response: Response,
    payload: unknown,
    path: string,
    notFoundCode?: ApiErrorCode,
  ): ProductServiceError {
    const envelope = isRecord(payload) && isRecord(payload.error) ? payload.error : payload;
    const error = isRecord(envelope) ? envelope : {};
    const rawCode = stringValue(error.code);
    let code = rawCode ?? `http_${response.status}`;
    if (response.status === 401) code = 'unauthorized';
    else if (code === 'tenant_access_denied') code = 'forbidden';
    else if (response.status === 403 && (!rawCode || !KNOWN_ERROR_CODES.has(rawCode))) {
      code = 'forbidden';
    } else if (response.status === 404 && (code === 'resource_not_found' || !rawCode)) {
      code = notFoundCode ?? 'asset_not_found';
    } else if (response.status === 413) code = 'file_too_large';
    else if (response.status === 415) code = 'unsupported_type';

    const detail = pick(error, 'message', 'detail');
    const requestId =
      stringValue(pick(error, 'requestId', 'request_id')) ??
      response.headers.get('x-request-id') ??
      `http-${response.status}`;
    return new ProductServiceError(
      code,
      typeof detail === 'string'
        ? detail
        : `GenSticker API request failed with HTTP ${response.status}.`,
      { ...toJsonRecord(error.details), status: response.status, path },
      requestId,
    );
  }

  private mapCharacter(value: unknown, selfieAssetId?: string): Character {
    const raw = entityPayload(value, 'character');
    if (!isRecord(raw)) throw invalidResponse('character');
    const approvedProfileVersion = numberValue(
      pick(raw, 'approvedProfileVersion', 'approved_profile_version'),
    );
    const rawStatus = stringValue(raw.status) ?? 'DRAFT';
    const upperStatus = rawStatus.toUpperCase();
    const status =
      upperStatus === 'ACTIVE'
        ? approvedProfileVersion
          ? 'APPROVED'
          : 'DRAFT'
        : upperStatus === 'ARCHIVED'
          ? 'DELETED'
          : upperStatus;
    return parseContract(
      characterSchema,
      {
        id: raw.id,
        displayName: pick(raw, 'displayName', 'display_name'),
        status,
        selfieAssetId:
          pick(raw, 'selfieAssetId', 'selfie_asset_id') ?? selfieAssetId ?? 'unavailable',
        approvedProfileVersion: approvedProfileVersion ?? null,
        createdAt: pick(raw, 'createdAt', 'created_at'),
        updatedAt: pick(raw, 'updatedAt', 'updated_at'),
      },
      'character',
    );
  }

  private mapJob(value: unknown): GenerationJob {
    const raw = entityPayload(value, 'job', 'generation_job');
    if (!isRecord(raw)) throw invalidResponse('generation job');
    const progress = numberValue(raw.progress) ?? 0;
    const result = isRecord(raw.result) ? raw.result : {};
    const directCandidates = pick(raw, 'candidateAssetIds', 'candidate_asset_ids');
    const candidateAssetIds = Array.isArray(directCandidates)
      ? directCandidates.filter((item): item is string => typeof item === 'string')
      : Array.isArray(result.asset_ids)
        ? result.asset_ids.filter((item): item is string => typeof item === 'string')
        : Array.isArray(result.candidates)
          ? result.candidates
              .map((item) =>
                isRecord(item) ? stringValue(pick(item, 'assetId', 'asset_id', 'id')) : undefined,
              )
              .filter((item): item is string => Boolean(item))
          : [];
    const statusValue = stringValue(raw.status)?.toLowerCase();
    const status = statusValue && KNOWN_JOB_STATUSES.has(statusValue) ? statusValue : 'failed';
    const errorCodeValue = pick(raw, 'errorCode', 'error_code');
    return parseContract(
      generationJobSchema,
      {
        id: raw.id,
        characterId: pick(raw, 'characterId', 'character_id'),
        status,
        stage: normalizeStage(pick(raw, 'stage', 'current_stage'), progress),
        progress,
        candidateAssetIds,
        errorCode:
          errorCodeValue == null ? null : knownErrorCode(errorCodeValue, 'generation_failed'),
        errorMessage: pick(raw, 'errorMessage', 'error_message') ?? null,
        createdAt: pick(raw, 'createdAt', 'created_at'),
        updatedAt: pick(raw, 'updatedAt', 'updated_at'),
      },
      'generation job',
    );
  }

  private mapJobEvent(value: unknown): JobEvent {
    if (!isRecord(value)) throw invalidResponse('job event');
    const progress = numberValue(value.progress) ?? 0;
    return parseContract(
      jobEventSchema as ZodType<JobEvent>,
      {
        id: value.id,
        jobId: pick(value, 'jobId', 'job_id'),
        stage: normalizeStage(pick(value, 'stage', 'current_stage'), progress),
        progress,
        payload: toJsonRecord(value.payload),
        createdAt: pick(value, 'createdAt', 'created_at'),
      },
      'job event',
    );
  }

  private mapCandidate(value: unknown): CanonicalCandidate {
    if (!isRecord(value)) throw invalidResponse('canonical candidate');
    const assetId = stringValue(pick(value, 'assetId', 'asset_id', 'id'));
    const rawScore = pick(value, 'scoreSummary', 'score_summary');
    const score = isRecord(rawScore) ? rawScore : {};
    const indicator = (candidate: unknown): 'excellent' | 'good' | 'fair' =>
      candidate === 'excellent' || candidate === 'fair' ? candidate : 'good';
    return parseContract(
      canonicalCandidateSchema,
      {
        assetId,
        imageUri: this.absoluteContentUri(
          pick(value, 'imageUri', 'image_uri', 'contentUri', 'content_uri'),
          assetId,
        ),
        scoreSummary: {
          likeness: indicator(score.likeness),
          clarity: indicator(score.clarity),
          consistency: indicator(score.consistency),
        },
        recommended: booleanValue(value.recommended) ?? false,
      },
      'canonical candidate',
    );
  }

  private mapProfile(value: unknown): CharacterProfile {
    const raw = entityPayload(value, 'profile');
    if (!isRecord(raw)) throw invalidResponse('character profile');
    return parseContract(
      characterProfileSchema,
      {
        characterId: pick(raw, 'characterId', 'character_id'),
        version: raw.version,
        canonicalAssetId: pick(raw, 'canonicalAssetId', 'canonical_asset_id'),
        config: profileConfigPayload(raw.config),
        approvedAt: pick(raw, 'approvedAt', 'approved_at'),
      },
      'character profile',
    );
  }

  private mapStickerText(value: unknown): StickerTextConfig | undefined {
    if (!isRecord(value)) return undefined;
    return {
      text: typeof value.text === 'string' ? value.text : '',
      placement: value.placement as StickerTextConfig['placement'],
      fontSize: numberValue(pick(value, 'fontSize', 'font_size')) ?? 28,
    };
  }

  private mapSlot(value: unknown): StickerSlot {
    if (!isRecord(value)) throw invalidResponse('sticker slot');
    const statusValue = stringValue(value.status)?.toLowerCase();
    const status = statusValue && KNOWN_SLOT_STATUSES.has(statusValue) ? statusValue : 'failed';
    const selectedAssetId = stringValue(pick(value, 'selectedAssetId', 'selected_asset_id'));
    const rawCandidates = pick(value, 'candidateAssetIds', 'candidate_asset_ids');
    const candidateAssetIds = Array.isArray(rawCandidates)
      ? rawCandidates.filter((item): item is string => typeof item === 'string')
      : selectedAssetId
        ? [selectedAssetId]
        : [];
    const errorCodeValue = pick(value, 'errorCode', 'error_code');
    const text = this.mapStickerText(value.text);
    return parseContract(
      stickerSlotSchema,
      {
        id: value.id,
        emotionId: pick(value, 'emotionId', 'emotion_id'),
        status,
        progress: numberValue(value.progress) ?? 0,
        selectedAssetId: selectedAssetId ?? null,
        candidateAssetIds,
        errorCode:
          errorCodeValue == null ? null : knownErrorCode(errorCodeValue, 'generation_failed'),
        retryCount: numberValue(pick(value, 'retryCount', 'retry_count')) ?? 0,
        imageUri: this.absoluteContentUri(pick(value, 'imageUri', 'image_uri'), selectedAssetId),
        previousImageUri: this.absoluteContentUri(
          pick(value, 'previousImageUri', 'previous_image_uri'),
        ),
        ...(text ? { text } : {}),
      },
      'sticker slot',
    );
  }

  private mapPack(value: unknown): StickerPack {
    const raw = entityPayload(value, 'pack', 'sticker_pack');
    if (!isRecord(raw)) throw invalidResponse('sticker pack');
    const statusValue = stringValue(raw.status)?.toUpperCase();
    const status = statusValue && KNOWN_PACK_STATUSES.has(statusValue) ? statusValue : 'FAILED';
    return parseContract(
      stickerPackSchema,
      {
        id: raw.id,
        characterId: pick(raw, 'characterId', 'character_id'),
        profileVersion: pick(raw, 'profileVersion', 'profile_version', 'config_version'),
        templateId: pick(raw, 'templateId', 'template_id'),
        status,
        slots: Array.isArray(raw.slots) ? raw.slots.map((slot) => this.mapSlot(slot)) : [],
        createdAt: pick(raw, 'createdAt', 'created_at'),
        updatedAt: pick(raw, 'updatedAt', 'updated_at'),
      },
      'sticker pack',
    );
  }

  private mapExportAsset(value: unknown): ExportAsset {
    if (!isRecord(value)) throw invalidResponse('export asset');
    const assetId = stringValue(pick(value, 'assetId', 'asset_id', 'id'));
    return {
      assetId: assetId ?? '',
      fileName: stringValue(pick(value, 'fileName', 'file_name')) ?? '',
      format: value.format as ExportAsset['format'],
      contentUri:
        this.absoluteContentUri(
          pick(value, 'contentUri', 'content_uri', 'download_url'),
          assetId,
        ) ?? '',
    };
  }

  private mapExportManifest(value: unknown): ExportManifest {
    const raw = entityPayload(value, 'export', 'manifest');
    if (!isRecord(raw)) throw invalidResponse('export manifest');
    return parseContract(
      exportManifestSchema,
      {
        id: raw.id,
        packId: pick(raw, 'packId', 'pack_id'),
        formats: raw.formats,
        assets: Array.isArray(raw.assets)
          ? raw.assets.map((asset) => this.mapExportAsset(asset))
          : [],
        checksums: isRecord(raw.checksums) ? raw.checksums : {},
        expiresAt: pick(raw, 'expiresAt', 'expires_at'),
        nativeShareAvailable:
          booleanValue(pick(raw, 'nativeShareAvailable', 'native_share_available')) ?? false,
      },
      'export manifest',
    );
  }

  async getCurrentUser(): Promise<User> {
    const payload = entityPayload(await this.request('/me'), 'user');
    if (!isRecord(payload)) throw invalidResponse('user');
    return parseContract(
      userSchema,
      {
        id: payload.id,
        displayName:
          pick(payload, 'displayName', 'display_name', 'externalId', 'external_id') ??
          'GenSticker user',
        locale: payload.locale ?? 'vi',
      },
      'user',
    );
  }

  async validateAndUploadSelfie(rawInput: SelfieUploadInput): Promise<AssetUploadResponse> {
    const input = selfieUploadInputSchema.parse(rawInput);
    const fileName =
      input.fileName ?? input.uri.split('/').pop()?.split('?')[0] ?? 'gensticker-selfie.jpg';
    const mimeType = input.mimeType ?? 'image/jpeg';
    const form = new FormData();
    if (Platform.OS === 'web') {
      let imageResponse: Response;
      try {
        imageResponse = await fetch(input.uri);
      } catch {
        throw new ProductServiceError(
          'invalid_image',
          'Không thể đọc ảnh đã chọn trên trình duyệt.',
        );
      }
      if (!imageResponse.ok) {
        throw new ProductServiceError(
          'invalid_image',
          'Không thể đọc ảnh đã chọn trên trình duyệt.',
        );
      }
      const imageBlob = await imageResponse.blob();
      form.append('file', imageBlob, fileName);
    } else {
      form.append('file', { uri: input.uri, name: fileName, type: mimeType } as unknown as Blob);
    }
    const payload = entityPayload(
      await this.request('/assets/selfies', { method: 'POST', body: form }),
      'upload',
    );
    if (!isRecord(payload)) throw invalidResponse('selfie upload');
    const validation = isRecord(payload.validation) ? payload.validation : {};
    const rawReasons = pick(validation, 'reasonCodes', 'reason_codes');
    const reasonCodes = Array.isArray(rawReasons)
      ? rawReasons.map((item) => knownErrorCode(item, 'invalid_image'))
      : [];
    const warnings = Array.isArray(validation.warnings)
      ? validation.warnings.map((item) => knownErrorCode(item, 'invalid_image'))
      : [];
    if (validation.valid === false || payload.asset == null) {
      const code = reasonCodes[0] ?? 'invalid_image';
      throw new ProductServiceError(code, `Selfie validation failed: ${code}`);
    }
    const asset = entityPayload(payload.asset, 'asset');
    if (!isRecord(asset)) throw invalidResponse('selfie asset');
    const assetId = stringValue(asset.id);
    return parseContract(
      assetUploadResponseSchema,
      {
        asset: {
          id: assetId,
          type: pick(asset, 'type', 'assetType', 'asset_type'),
          mimeType: pick(asset, 'mimeType', 'mime_type'),
          width: numberValue(asset.width) ?? numberValue(validation.width) ?? 0,
          height: numberValue(asset.height) ?? numberValue(validation.height) ?? 0,
          sha256: asset.sha256,
          contentUri: this.absoluteContentUri(pick(asset, 'contentUri', 'content_uri'), assetId),
        },
        validation: {
          valid: true,
          reasonCodes,
          warnings,
          width: numberValue(validation.width) ?? numberValue(asset.width) ?? 0,
          height: numberValue(validation.height) ?? numberValue(asset.height) ?? 0,
          mimeType: pick(validation, 'mimeType', 'mime_type') ?? mimeType,
          byteSize:
            numberValue(pick(validation, 'byteSize', 'byte_size')) ??
            numberValue(pick(asset, 'byteSize', 'byte_size')) ??
            input.byteSize ??
            0,
        },
      },
      'selfie upload',
    );
  }

  async createCharacter(rawInput: CreateCharacterInput): Promise<Character> {
    const input = createCharacterInputSchema.parse(rawInput);
    return this.mapCharacter(
      await this.request('/characters', {
        method: 'POST',
        json: { display_name: input.displayName, selfie_asset_id: input.selfieAssetId },
      }),
      input.selfieAssetId,
    );
  }

  async listCharacters(): Promise<Character[]> {
    return listPayload(await this.request('/characters'), 'characters').map((item) =>
      this.mapCharacter(item),
    );
  }

  async getCharacter(characterId: string): Promise<Character> {
    return this.mapCharacter(
      await this.request(`/characters/${encodeURIComponent(characterId)}`, {
        notFoundCode: 'character_not_found',
      }),
    );
  }

  async deleteCharacter(characterId: string): Promise<void> {
    await this.request(`/characters/${encodeURIComponent(characterId)}`, {
      method: 'DELETE',
      notFoundCode: 'character_not_found',
    });
  }

  async createCanonicalJob(rawInput: CreateCanonicalJobInput): Promise<GenerationJob> {
    const input = createCanonicalJobInputSchema.parse(rawInput);
    return this.mapJob(
      await this.request('/generation-jobs', {
        method: 'POST',
        json: {
          character_id: input.characterId,
          kind: 'canonical_generation',
          style: input.preset.style,
          extra_params: { outfit: input.preset.outfit },
        },
      }),
    );
  }

  async getGenerationJob(jobId: string): Promise<GenerationJob> {
    return this.mapJob(
      await this.request(`/generation-jobs/${encodeURIComponent(jobId)}`, {
        notFoundCode: 'job_not_found',
      }),
    );
  }

  async listGenerationJobs(filters?: GenerationJobFilters): Promise<GenerationJob[]> {
    const query = queryString({ character_id: filters?.characterId, status: filters?.status });
    return listPayload(await this.request(`/generation-jobs${query}`), 'jobs', 'generation_jobs')
      .map((item) => {
        try {
          return this.mapJob(item);
        } catch (error) {
          if (
            error instanceof ProductServiceError &&
            isRecord(item) &&
            pick(item, 'characterId', 'character_id') == null
          ) {
            return null;
          }
          throw error;
        }
      })
      .filter((job): job is GenerationJob => {
        return Boolean(
          job &&
          (!filters?.characterId || job.characterId === filters.characterId) &&
          (!filters?.status || job.status === filters.status),
        );
      });
  }

  async getJobEvents(jobId: string): Promise<JobEvent[]> {
    return listPayload(
      await this.request(`/generation-jobs/${encodeURIComponent(jobId)}/events`, {
        notFoundCode: 'job_not_found',
      }),
      'events',
    ).map((item) => this.mapJobEvent(item));
  }

  async cancelGenerationJob(jobId: string): Promise<GenerationJob> {
    const response = await this.request(`/generation-jobs/${encodeURIComponent(jobId)}/cancel`, {
      method: 'POST',
      notFoundCode: 'job_not_found',
    });
    const candidate = entityPayload(response, 'job', 'generation_job');
    if (
      isRecord(candidate) &&
      pick(candidate, 'characterId', 'character_id') != null &&
      pick(candidate, 'stage', 'current_stage') != null
    ) {
      return this.mapJob(candidate);
    }
    return this.getGenerationJob(jobId);
  }

  async getCanonicalCandidates(characterId: string): Promise<CanonicalCandidate[]> {
    return listPayload(
      await this.request(`/characters/${encodeURIComponent(characterId)}/canonical-candidates`, {
        notFoundCode: 'character_not_found',
      }),
      'candidates',
    ).map((item) => this.mapCandidate(item));
  }

  async approveCanonical(rawInput: CanonicalApprovalInput): Promise<CharacterProfile> {
    const input = canonicalApprovalInputSchema.parse(rawInput);
    return this.mapProfile(
      await this.request(`/characters/${encodeURIComponent(input.characterId)}/profiles/approve`, {
        method: 'POST',
        json: { canonical_asset_id: input.canonicalAssetId, config: input.config },
        notFoundCode: 'character_not_found',
      }),
    );
  }

  async getCharacterProfile(characterId: string, version?: number): Promise<CharacterProfile> {
    const response = await this.request(
      `/characters/${encodeURIComponent(characterId)}/profiles${queryString({ version })}`,
      { notFoundCode: 'character_not_found' },
    );
    if (Array.isArray(response) || (isRecord(response) && Array.isArray(response.profiles))) {
      const profiles = listPayload(response, 'profiles').map((item) => this.mapProfile(item));
      const profile = version
        ? profiles.find((item) => item.version === version)
        : [...profiles].sort((left, right) => right.version - left.version)[0];
      if (!profile) {
        throw new ProductServiceError('invalid_character_state', 'Character profile not found.');
      }
      return profile;
    }
    return this.mapProfile(response);
  }

  async updateCharacterProfile(rawInput: UpdateCharacterProfileInput): Promise<CharacterProfile> {
    const input = updateCharacterProfileInputSchema.parse(rawInput);
    return this.mapProfile(
      await this.request(`/characters/${encodeURIComponent(input.characterId)}/profiles`, {
        method: 'POST',
        json: { config: input.config },
        notFoundCode: 'character_not_found',
      }),
    );
  }

  async createStickerPack(rawInput: CreateStickerPackInput): Promise<StickerPack> {
    const input = createStickerPackInputSchema.parse(rawInput);
    return this.mapPack(
      await this.request('/sticker-packs', {
        method: 'POST',
        json: {
          character_id: input.characterId,
          profile_version: input.profileVersion,
          template_id: input.templateId,
        },
      }),
    );
  }

  async getStickerPack(packId: string): Promise<StickerPack> {
    return this.mapPack(
      await this.request(`/sticker-packs/${encodeURIComponent(packId)}`, {
        notFoundCode: 'pack_not_found',
      }),
    );
  }

  async listStickerPacks(characterId?: string): Promise<StickerPack[]> {
    const query = queryString({ character_id: characterId });
    return listPayload(await this.request(`/sticker-packs${query}`), 'packs', 'sticker_packs')
      .map((item) => this.mapPack(item))
      .filter((pack) => !characterId || pack.characterId === characterId);
  }

  async regenerateStickerSlot(rawInput: RegenerateStickerSlotInput): Promise<StickerSlot> {
    const input = regenerateStickerSlotInputSchema.parse(rawInput);
    return this.mapSlot(
      entityPayload(
        await this.request(
          `/sticker-packs/${encodeURIComponent(input.packId)}/slots/${encodeURIComponent(input.slotId)}/regenerate`,
          { method: 'POST', notFoundCode: 'pack_not_found' },
        ),
        'slot',
      ),
    );
  }

  async updateStickerText(rawInput: UpdateStickerTextInput): Promise<StickerSlot> {
    const input = updateStickerTextInputSchema.parse(rawInput);
    return this.mapSlot(
      entityPayload(
        await this.request(
          `/sticker-packs/${encodeURIComponent(input.packId)}/slots/${encodeURIComponent(input.slotId)}/text`,
          {
            method: 'PUT',
            json: { text: input.text, placement: input.placement, font_size: input.fontSize },
            notFoundCode: 'pack_not_found',
          },
        ),
        'slot',
      ),
    );
  }

  async exportStickerPack(rawInput: ExportStickerPackInput): Promise<ExportManifest> {
    const input = exportStickerPackInputSchema.parse(rawInput);
    return this.mapExportManifest(
      await this.request(`/sticker-packs/${encodeURIComponent(input.packId)}/exports`, {
        method: 'POST',
        json: { formats: input.formats },
        notFoundCode: 'pack_not_found',
      }),
    );
  }

  async getExportManifest(exportId: string): Promise<ExportManifest> {
    return this.mapExportManifest(
      await this.request(`/exports/${encodeURIComponent(exportId)}`, {
        notFoundCode: 'asset_not_found',
      }),
    );
  }

  private mapConsent(value: unknown): ConsentState {
    const payload = entityPayload(value, 'consent');
    if (!isRecord(payload)) throw invalidResponse('consent');
    return parseContract(
      consentStateSchema,
      {
        consentVersion: pick(payload, 'consentVersion', 'consent_version'),
        accepted: payload.accepted,
        reuseOptIn: pick(payload, 'reuseOptIn', 'reuse_opt_in'),
        acceptedAt: pick(payload, 'acceptedAt', 'accepted_at') ?? null,
      },
      'consent',
    );
  }

  async getConsentState(): Promise<ConsentState> {
    return this.mapConsent(await this.request('/consent'));
  }

  async updateConsent(rawState: ConsentState): Promise<ConsentState> {
    const state = consentStateSchema.parse(rawState);
    return this.mapConsent(
      await this.request('/consent', {
        method: 'PUT',
        json: {
          consent_version: state.consentVersion,
          accepted: state.accepted,
          reuse_opt_in: state.reuseOptIn,
          accepted_at: state.acceptedAt,
        },
      }),
    );
  }

  // Diagnostics are intentionally metadata-only in HTTP mode.
  async getDiagnostics(): Promise<ProductDiagnostics> {
    const payload = entityPayload(await this.request('/diagnostics'), 'diagnostics');
    if (!isRecord(payload)) throw invalidResponse('diagnostics');
    const rawCounts = isRecord(payload.counts) ? payload.counts : {};
    const scenarioValue = stringValue(payload.scenario);
    const scenario =
      scenarioValue && (MOCK_SCENARIOS as readonly string[]).includes(scenarioValue)
        ? (scenarioValue as MockScenario)
        : 'happy_path';
    const jobs = Array.isArray(payload.jobs)
      ? payload.jobs.map((item) => {
          const raw = isRecord(item) ? item : {};
          const progress = numberValue(raw.progress) ?? 0;
          const statusValue = stringValue(raw.status)?.toLowerCase();
          return {
            id: stringValue(raw.id) ?? 'unknown-job',
            status:
              statusValue && KNOWN_JOB_STATUSES.has(statusValue)
                ? (statusValue as GenerationJob['status'])
                : 'failed',
            stage: normalizeStage(pick(raw, 'stage', 'current_stage'), progress),
            progress,
          };
        })
      : [];
    const packs = Array.isArray(payload.packs)
      ? payload.packs.map((item) => {
          const raw = isRecord(item) ? item : {};
          const statusValue = stringValue(raw.status)?.toUpperCase();
          return {
            id: stringValue(raw.id) ?? 'unknown-pack',
            status:
              statusValue && KNOWN_PACK_STATUSES.has(statusValue)
                ? (statusValue as StickerPack['status'])
                : 'FAILED',
          };
        })
      : [];
    const rawErrors = pick(payload, 'lastSafeErrors', 'last_safe_errors');
    const lastSafeErrors: SafeDiagnosticEvent[] = Array.isArray(rawErrors)
      ? rawErrors.filter(isRecord).map((event) => ({
          id: stringValue(event.id) ?? 'http-diagnostic',
          timestamp: stringValue(event.timestamp) ?? new Date(0).toISOString(),
          level: event.level === 'info' || event.level === 'warning' ? event.level : 'error',
          action: stringValue(event.action) ?? 'backend-diagnostic',
          serviceMode: 'http',
          ...(stringValue(pick(event, 'errorCode', 'error_code'))
            ? { errorCode: stringValue(pick(event, 'errorCode', 'error_code')) }
            : {}),
          ...(stringValue(pick(event, 'requestId', 'request_id'))
            ? { requestId: stringValue(pick(event, 'requestId', 'request_id')) }
            : {}),
        }))
      : [];
    return {
      serviceMode: 'http',
      scenario,
      counts: {
        assets: numberValue(rawCounts.assets) ?? 0,
        characters: numberValue(rawCounts.characters) ?? 0,
        profiles: numberValue(rawCounts.profiles) ?? 0,
        jobs: numberValue(rawCounts.jobs) ?? 0,
        jobEvents: numberValue(pick(rawCounts, 'jobEvents', 'job_events')) ?? 0,
        packs: numberValue(rawCounts.packs) ?? 0,
        exports: numberValue(rawCounts.exports) ?? 0,
      },
      jobs,
      packs,
      lastSafeErrors,
    };
  }

  async setMockScenario(_scenario: MockScenario): Promise<void> {
    throw new ProductServiceError(
      'unsupported_operation',
      'Mock scenarios are unavailable while using the HTTP product service.',
      { serviceMode: 'http' },
    );
  }

  async clearLocalData(): Promise<void> {
    throw new ProductServiceError(
      'unsupported_operation',
      'The HTTP product service cannot delete server data from the local debug screen.',
      { serviceMode: 'http' },
    );
  }
}
