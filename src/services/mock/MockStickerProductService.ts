import { Image, Platform } from 'react-native';
import { DEFAULT_EMOTION_TEMPLATE, getEmotionTemplate } from '@/constants/emotionTemplates';
import { DEFAULT_CHARACTER_PROFILE_CONFIG } from '@/constants/profilePresets';
import { frontendDiagnostics } from '@/services/diagnostics';
import {
  ProductServiceError,
  type Asset,
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
  type ExportManifest,
  type ExportStickerPackInput,
  type GenerationJob,
  type GenerationJobFilters,
  type JobEvent,
  type MockScenario,
  type ProductDiagnostics,
  type RegenerateStickerSlotInput,
  type SelfieUploadInput,
  type StickerPack,
  type StickerProductService,
  type StickerSlot,
  type UpdateCharacterProfileInput,
  type UpdateStickerTextInput,
  type User,
} from '@/services/contracts';
import {
  canonicalApprovalInputSchema,
  characterProfileConfigSchema,
  createCanonicalJobInputSchema,
  createCharacterInputSchema,
  createStickerPackInputSchema,
  exportStickerPackInputSchema,
  regenerateStickerSlotInputSchema,
  selfieUploadInputSchema,
  updateCharacterProfileInputSchema,
  updateStickerTextInputSchema,
} from '@/services/contracts/schemas';
import {
  AsyncStorageMockStateStorage,
  type MockStateStorage,
} from '@/services/storage/mockStateStorage';

export interface MockState {
  sequence: number;
  scenario: MockScenario;
  assets: Asset[];
  characters: Character[];
  profiles: CharacterProfile[];
  jobs: GenerationJob[];
  jobEvents: JobEvent[];
  packs: StickerPack[];
  exports: ExportManifest[];
  consent: ConsentState;
}

const EMPTY_STATE: MockState = {
  sequence: 0,
  scenario: 'happy_path',
  assets: [],
  characters: [],
  profiles: [],
  jobs: [],
  jobEvents: [],
  packs: [],
  exports: [],
  consent: { consentVersion: '1.0', accepted: false, reuseOptIn: false, acceptedAt: null },
};

const SELFIE_ERRORS: Partial<Record<MockScenario, ApiErrorCode>> = {
  invalid_selfie: 'invalid_image',
  face_count_invalid: 'face_count_invalid',
  blurry_selfie: 'image_blurry',
  consent_required: 'consent_required',
  safety_rejected: 'safety_rejected',
  impersonation_rejected: 'impersonation_rejected',
  licensed_character_rejected: 'licensed_character_rejected',
};

const JOB_FAILURES: Partial<Record<MockScenario, ApiErrorCode>> = {
  provider_unavailable: 'provider_unavailable',
  generation_failed: 'generation_failed',
  budget_exceeded: 'budget_exceeded',
  storage_read_failed: 'storage_read_failed',
  job_cancelled: 'job_cancelled',
};

const STAGES = [
  ['validating', 12],
  ['preparing', 28],
  ['generating', 58],
  ['background_removal', 76],
  ['postprocessing', 92],
  ['completed', 100],
] as const;

function bundledImageUri(): string {
  if (process.env.VITEST) return 'asset://mock-sticker.png';
  return Image.resolveAssetSource(require('../../../assets/images/icon.png')).uri;
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export class MockStickerProductService implements StickerProductService {
  private state: MockState | null = null;
  private readonly storage: MockStateStorage<MockState>;

  constructor(storage: MockStateStorage<MockState> = new AsyncStorageMockStateStorage()) {
    this.storage = storage;
  }

  private async read(): Promise<MockState> {
    if (!this.state) this.state = (await this.storage.load()) ?? clone(EMPTY_STATE);
    return this.state;
  }

  private async save(): Promise<void> {
    if (this.state) await this.storage.save(this.state);
  }

  private async id(prefix: string): Promise<string> {
    const state = await this.read();
    state.sequence += 1;
    return `${prefix}-${String(state.sequence).padStart(4, '0')}`;
  }

  private now(state: MockState): string {
    return new Date(Date.UTC(2026, 0, 1, 0, 0, state.sequence)).toISOString();
  }

  private fail(code: string): never {
    void frontendDiagnostics.record({
      level: 'error',
      action: 'product-service',
      errorCode: code,
      serviceMode: 'mock',
    });
    throw new ProductServiceError(code, code);
  }

  async getCurrentUser(): Promise<User> {
    return {
      id: process.env.EXPO_PUBLIC_DEV_USER_ID ?? 'local-dev-user',
      displayName: 'Người dùng cục bộ',
      locale: 'vi',
    };
  }

  async validateAndUploadSelfie(raw: SelfieUploadInput): Promise<AssetUploadResponse> {
    const input = selfieUploadInputSchema.parse(raw);
    const state = await this.read();
    const forced = SELFIE_ERRORS[state.scenario];
    if (!state.consent.accepted || forced === 'consent_required') this.fail('consent_required');
    if (forced) this.fail(forced);
    const mimeType = input.mimeType ?? 'image/jpeg';
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType))
      this.fail('unsupported_type');
    if ((input.byteSize ?? 0) > 10 * 1024 * 1024) this.fail('file_too_large');
    if ((input.width ?? 1024) < 256 || (input.height ?? 1024) < 256)
      this.fail('resolution_too_low');
    const asset: Asset = {
      id: await this.id('asset'),
      type: 'selfie',
      mimeType,
      width: input.width ?? 1024,
      height: input.height ?? 1024,
      sha256: `mock-sha256-${state.sequence}`,
      contentUri: input.uri,
    };
    state.assets.push(asset);
    await this.save();
    return clone({
      asset,
      validation: {
        valid: true,
        reasonCodes: [],
        warnings: [],
        width: asset.width,
        height: asset.height,
        mimeType,
        byteSize: input.byteSize ?? 0,
      },
    });
  }

  async createCharacter(raw: CreateCharacterInput): Promise<Character> {
    const input = createCharacterInputSchema.parse(raw);
    const state = await this.read();
    if (!state.assets.some((asset) => asset.id === input.selfieAssetId))
      this.fail('asset_not_found');
    const at = this.now(state);
    const character: Character = {
      id: await this.id('character'),
      displayName: input.displayName,
      status: 'DRAFT',
      selfieAssetId: input.selfieAssetId,
      approvedProfileVersion: null,
      createdAt: at,
      updatedAt: at,
    };
    state.characters.push(character);
    await this.save();
    return clone(character);
  }

  async listCharacters(): Promise<Character[]> {
    return clone((await this.read()).characters.filter((item) => item.status !== 'DELETED'));
  }
  async getCharacter(id: string): Promise<Character> {
    const found = (await this.read()).characters.find(
      (item) => item.id === id && item.status !== 'DELETED',
    );
    if (!found) this.fail('character_not_found');
    return clone(found);
  }

  async deleteCharacter(id: string): Promise<void> {
    const state = await this.read();
    const character = state.characters.find((item) => item.id === id);
    if (!character || character.status === 'DELETED') return;
    const jobIds = new Set(state.jobs.filter((j) => j.characterId === id).map((j) => j.id));
    const packIds = new Set(state.packs.filter((p) => p.characterId === id).map((p) => p.id));
    const assetIds = new Set([
      character.selfieAssetId,
      ...state.jobs.filter((j) => j.characterId === id).flatMap((j) => j.candidateAssetIds),
      ...state.packs
        .filter((p) => p.characterId === id)
        .flatMap((p) => p.slots.flatMap((s) => s.candidateAssetIds)),
    ]);
    state.characters = state.characters.filter((c) => c.id !== id);
    state.profiles = state.profiles.filter((p) => p.characterId !== id);
    state.jobs = state.jobs.filter((j) => j.characterId !== id);
    state.jobEvents = state.jobEvents.filter((e) => !jobIds.has(e.jobId));
    state.packs = state.packs.filter((p) => p.characterId !== id);
    state.exports = state.exports.filter((e) => !packIds.has(e.packId));
    state.assets = state.assets.filter((a) => !assetIds.has(a.id));
    await this.save();
  }

  async createCanonicalJob(raw: CreateCanonicalJobInput): Promise<GenerationJob> {
    const input = createCanonicalJobInputSchema.parse(raw);
    const state = await this.read();
    const character = state.characters.find((c) => c.id === input.characterId);
    if (!character) this.fail('character_not_found');
    if (character.status !== 'DRAFT') this.fail('invalid_character_state');
    const at = this.now(state);
    const job: GenerationJob = {
      id: await this.id('job'),
      characterId: character.id,
      status: 'queued',
      stage: 'validating',
      progress: 0,
      candidateAssetIds: [],
      errorCode: null,
      errorMessage: null,
      createdAt: at,
      updatedAt: at,
    };
    character.status = 'GENERATING_CANONICAL';
    character.updatedAt = at;
    state.jobs.push(job);
    await this.save();
    return clone(job);
  }

  async getGenerationJob(id: string): Promise<GenerationJob> {
    const state = await this.read();
    const job = state.jobs.find((item) => item.id === id);
    if (!job) this.fail('job_not_found');
    if (!['succeeded', 'failed', 'cancelled'].includes(job.status)) {
      const index = Math.min(
        STAGES.length - 1,
        Math.max(0, state.jobEvents.filter((e) => e.jobId === id).length),
      );
      const [stage, progress] = STAGES[index];
      job.stage = stage;
      job.progress = progress;
      job.status = stage === 'completed' ? 'succeeded' : 'running';
      job.updatedAt = this.now(state);
      const failure = JOB_FAILURES[state.scenario];
      if (failure && index >= 2) {
        job.status = failure === 'job_cancelled' ? 'cancelled' : 'failed';
        job.errorCode = failure;
        job.errorMessage = failure;
      }
      if (job.status === 'succeeded') {
        const character = state.characters.find((c) => c.id === job.characterId)!;
        character.status = 'AWAITING_APPROVAL';
        for (let i = 0; i < 3; i += 1) {
          const asset: Asset = {
            id: await this.id('canonical'),
            type: 'canonical',
            mimeType: 'image/png',
            width: 1024,
            height: 1024,
            sha256: `canonical-sha-${i}`,
            contentUri: bundledImageUri(),
          };
          state.assets.push(asset);
          job.candidateAssetIds.push(asset.id);
        }
      }
      state.jobEvents.push({
        id: await this.id('event'),
        jobId: id,
        stage,
        progress,
        payload: {},
        createdAt: job.updatedAt,
      });
      await this.save();
    }
    return clone(job);
  }

  async listGenerationJobs(filters?: GenerationJobFilters): Promise<GenerationJob[]> {
    const jobs = (await this.read()).jobs.filter(
      (j) =>
        (!filters?.characterId || j.characterId === filters.characterId) &&
        (!filters?.status || j.status === filters.status),
    );
    return clone(jobs);
  }
  async getJobEvents(id: string): Promise<JobEvent[]> {
    if (!(await this.read()).jobs.some((j) => j.id === id)) this.fail('job_not_found');
    return clone((await this.read()).jobEvents.filter((e) => e.jobId === id));
  }
  async cancelGenerationJob(id: string): Promise<GenerationJob> {
    const state = await this.read();
    const job = state.jobs.find((j) => j.id === id);
    if (!job) this.fail('job_not_found');
    if (['succeeded', 'failed', 'cancelled'].includes(job.status)) this.fail('invalid_job_state');
    job.status = 'cancelled';
    job.errorCode = 'job_cancelled';
    await this.save();
    return clone(job);
  }

  async getCanonicalCandidates(characterId: string): Promise<CanonicalCandidate[]> {
    const state = await this.read();
    const job = [...state.jobs]
      .reverse()
      .find((j) => j.characterId === characterId && j.status === 'succeeded');
    if (!job) this.fail('job_not_found');
    return job.candidateAssetIds.map((assetId, index) => ({
      assetId,
      imageUri: state.assets.find((a) => a.id === assetId)?.contentUri ?? bundledImageUri(),
      scoreSummary: {
        likeness: index === 1 ? 'excellent' : 'good',
        clarity: 'good',
        consistency: index === 2 ? 'fair' : 'good',
      },
      recommended: index === 1,
    }));
  }

  async approveCanonical(raw: CanonicalApprovalInput): Promise<CharacterProfile> {
    const input = canonicalApprovalInputSchema.parse(raw);
    const state = await this.read();
    const character = state.characters.find((c) => c.id === input.characterId);
    if (!character) this.fail('character_not_found');
    const candidates = await this.getCanonicalCandidates(input.characterId);
    if (!candidates.some((c) => c.assetId === input.canonicalAssetId))
      this.fail('invalid_canonical_candidate');
    const version =
      Math.max(
        0,
        ...state.profiles.filter((p) => p.characterId === input.characterId).map((p) => p.version),
      ) + 1;
    const profile = {
      characterId: input.characterId,
      version,
      canonicalAssetId: input.canonicalAssetId,
      config: characterProfileConfigSchema.parse(input.config),
      approvedAt: this.now(state),
    };
    state.profiles.push(profile);
    character.status = 'APPROVED';
    character.approvedProfileVersion = version;
    await this.save();
    return clone(profile);
  }
  async getCharacterProfile(characterId: string, version?: number): Promise<CharacterProfile> {
    const profiles = (await this.read()).profiles.filter((p) => p.characterId === characterId);
    const found = version
      ? profiles.find((p) => p.version === version)
      : profiles.sort((a, b) => b.version - a.version)[0];
    if (!found) this.fail('invalid_character_state');
    return clone(found);
  }
  async updateCharacterProfile(raw: UpdateCharacterProfileInput): Promise<CharacterProfile> {
    const input = updateCharacterProfileInputSchema.parse(raw);
    const current = await this.getCharacterProfile(input.characterId);
    return this.approveCanonical({
      characterId: input.characterId,
      canonicalAssetId: current.canonicalAssetId,
      config: input.config,
    });
  }

  async createStickerPack(raw: CreateStickerPackInput): Promise<StickerPack> {
    const input = createStickerPackInputSchema.parse(raw);
    const state = await this.read();
    const character = state.characters.find((c) => c.id === input.characterId);
    if (
      !character ||
      character.status !== 'APPROVED' ||
      character.approvedProfileVersion !== input.profileVersion
    )
      this.fail('character_not_approved');
    const template = getEmotionTemplate(input.templateId);
    if (!template) this.fail('invalid_profile_preset');
    const at = this.now(state);
    const pack: StickerPack = {
      id: await this.id('pack'),
      characterId: input.characterId,
      profileVersion: input.profileVersion,
      templateId: input.templateId,
      status: 'QUEUED',
      slots: template.emotions.map((e, i) => ({
        id: `slot-${state.sequence}-${i + 1}`,
        emotionId: e.id,
        status: 'queued',
        progress: 0,
        selectedAssetId: null,
        candidateAssetIds: [],
        errorCode: null,
        retryCount: 0,
      })),
      createdAt: at,
      updatedAt: at,
    };
    state.packs.push(pack);
    await this.save();
    return clone(pack);
  }
  async getStickerPack(id: string): Promise<StickerPack> {
    const state = await this.read();
    const pack = state.packs.find((p) => p.id === id);
    if (!pack) this.fail('pack_not_found');
    if (!['COMPLETED', 'PARTIAL', 'FAILED', 'CANCELLED'].includes(pack.status)) {
      pack.status = 'GENERATING';
      const next = pack.slots.find((s) => s.status !== 'completed' && s.status !== 'failed');
      if (next) {
        next.status = 'generating';
        next.progress = Math.min(100, next.progress + 50);
        if (next.progress === 100) {
          const shouldFail = state.scenario === 'partial_pack' && next.emotionId === 'confused';
          if (shouldFail) {
            next.status = 'failed';
            next.errorCode = 'generation_failed';
          } else {
            next.status = 'completed';
            next.selectedAssetId = await this.id('sticker');
            next.candidateAssetIds = [next.selectedAssetId];
            next.imageUri = bundledImageUri();
          }
        }
      }
      if (pack.slots.every((s) => ['completed', 'failed'].includes(s.status)))
        pack.status = pack.slots.some((s) => s.status === 'failed') ? 'PARTIAL' : 'COMPLETED';
      pack.updatedAt = this.now(state);
      await this.save();
    }
    return clone(pack);
  }
  async listStickerPacks(characterId?: string): Promise<StickerPack[]> {
    return clone(
      (await this.read()).packs.filter((p) => !characterId || p.characterId === characterId),
    );
  }
  async regenerateStickerSlot(raw: RegenerateStickerSlotInput): Promise<StickerSlot> {
    const input = regenerateStickerSlotInputSchema.parse(raw);
    const state = await this.read();
    const pack = state.packs.find((p) => p.id === input.packId);
    const slot = pack?.slots.find((s) => s.id === input.slotId);
    if (!pack) this.fail('pack_not_found');
    if (!slot) this.fail('asset_not_found');
    if (state.scenario === 'retry_limit_exceeded' || slot.retryCount >= 2)
      this.fail('retry_limit_exceeded');
    slot.previousImageUri = slot.imageUri;
    slot.retryCount += 1;
    slot.status = 'completed';
    slot.progress = 100;
    slot.errorCode = null;
    slot.selectedAssetId = await this.id('sticker');
    slot.candidateAssetIds.push(slot.selectedAssetId);
    slot.imageUri = bundledImageUri();
    pack.status = pack.slots.every((s) => s.status === 'completed') ? 'COMPLETED' : 'PARTIAL';
    await this.save();
    return clone(slot);
  }
  async updateStickerText(raw: UpdateStickerTextInput): Promise<StickerSlot> {
    const input = updateStickerTextInputSchema.parse(raw);
    const state = await this.read();
    const pack = state.packs.find((p) => p.id === input.packId);
    const slot = pack?.slots.find((s) => s.id === input.slotId);
    if (!slot) this.fail(pack ? 'asset_not_found' : 'pack_not_found');
    slot.text = { text: input.text, placement: input.placement, fontSize: input.fontSize };
    await this.save();
    return clone(slot);
  }
  async exportStickerPack(raw: ExportStickerPackInput): Promise<ExportManifest> {
    const input = exportStickerPackInputSchema.parse(raw);
    const state = await this.read();
    const pack = state.packs.find((p) => p.id === input.packId);
    if (!pack) this.fail('pack_not_found');
    if (state.scenario === 'export_failed') this.fail('export_failed');
    const id = await this.id('export');
    const completedSlots = pack.slots.filter((slot) => slot.status === 'completed');
    const assets = input.formats.flatMap((format) => {
      if (format === 'zip') {
        return [
          {
            assetId: `${id}-pack-zip`,
            fileName: `sticker-pack-${pack.id}.zip`,
            format,
            contentUri: bundledImageUri(),
          },
        ];
      }
      return completedSlots.map((slot) => ({
        assetId: `${id}-${slot.id}-${format}`,
        fileName: `${slot.emotionId}.${format}`,
        format,
        contentUri: slot.imageUri ?? bundledImageUri(),
      }));
    });
    const mockNow = new Date(this.now(state)).getTime();
    const expires = new Date(
      mockNow + (state.scenario === 'expired_export' ? -1_000 : 7 * 24 * 60 * 60 * 1_000),
    ).toISOString();
    const manifest: ExportManifest = {
      id,
      packId: pack.id,
      formats: input.formats,
      assets,
      checksums: Object.fromEntries(assets.map((a) => [a.assetId, `sha256-${a.assetId}`])),
      expiresAt: expires,
      nativeShareAvailable: Platform.OS !== 'web',
    };
    state.exports.push(manifest);
    await this.save();
    return clone(manifest);
  }
  async getExportManifest(id: string): Promise<ExportManifest> {
    const state = await this.read();
    const found = state.exports.find((e) => e.id === id);
    if (!found) this.fail('asset_not_found');
    if (new Date(found.expiresAt).getTime() <= new Date(this.now(state)).getTime())
      this.fail('asset_url_expired');
    return clone(found);
  }
  async getConsentState(): Promise<ConsentState> {
    return clone((await this.read()).consent);
  }
  async updateConsent(consent: ConsentState): Promise<ConsentState> {
    const state = await this.read();
    state.consent = clone(consent);
    await this.save();
    return clone(consent);
  }
  async getDiagnostics(): Promise<ProductDiagnostics> {
    const state = await this.read();
    return {
      serviceMode: 'mock',
      scenario: state.scenario,
      counts: {
        assets: state.assets.length,
        characters: state.characters.length,
        profiles: state.profiles.length,
        jobs: state.jobs.length,
        jobEvents: state.jobEvents.length,
        packs: state.packs.length,
        exports: state.exports.length,
      },
      jobs: clone(
        state.jobs.map(({ id, status, stage, progress }) => ({ id, status, stage, progress })),
      ),
      packs: clone(state.packs.map(({ id, status }) => ({ id, status }))),
      lastSafeErrors: [...frontendDiagnostics.getRecent()].filter((e) => e.level === 'error'),
    };
  }
  async setMockScenario(scenario: MockScenario): Promise<void> {
    const state = await this.read();
    state.scenario = scenario;
    await this.save();
  }
  async clearLocalData(): Promise<void> {
    await this.storage.clear();
    this.state = clone(EMPTY_STATE);
  }
}

export { DEFAULT_CHARACTER_PROFILE_CONFIG, DEFAULT_EMOTION_TEMPLATE };
