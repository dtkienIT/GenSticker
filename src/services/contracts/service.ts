import type {
  AssetUploadResponse,
  CanonicalApprovalInput,
  CanonicalCandidate,
  Character,
  CharacterProfile,
  ConsentState,
  CreateCanonicalJobInput,
  CreateCharacterInput,
  CreateStickerPackInput,
  ExportManifest,
  ExportStickerPackInput,
  GenerationJob,
  GenerationJobFilters,
  JobEvent,
  MockScenario,
  ProductDiagnostics,
  RegenerateStickerSlotInput,
  SelfieUploadInput,
  StickerPack,
  StickerSlot,
  UpdateCharacterProfileInput,
  UpdateStickerTextInput,
  User,
} from './types';

export interface StickerProductService {
  getCurrentUser(): Promise<User>;
  validateAndUploadSelfie(input: SelfieUploadInput): Promise<AssetUploadResponse>;
  createCharacter(input: CreateCharacterInput): Promise<Character>;
  listCharacters(): Promise<Character[]>;
  getCharacter(characterId: string): Promise<Character>;
  deleteCharacter(characterId: string): Promise<void>;
  createCanonicalJob(input: CreateCanonicalJobInput): Promise<GenerationJob>;
  getGenerationJob(jobId: string): Promise<GenerationJob>;
  listGenerationJobs(filters?: GenerationJobFilters): Promise<GenerationJob[]>;
  getJobEvents(jobId: string): Promise<JobEvent[]>;
  cancelGenerationJob(jobId: string): Promise<GenerationJob>;
  getCanonicalCandidates(characterId: string): Promise<CanonicalCandidate[]>;
  approveCanonical(input: CanonicalApprovalInput): Promise<CharacterProfile>;
  getCharacterProfile(characterId: string, version?: number): Promise<CharacterProfile>;
  updateCharacterProfile(input: UpdateCharacterProfileInput): Promise<CharacterProfile>;
  createStickerPack(input: CreateStickerPackInput): Promise<StickerPack>;
  getStickerPack(packId: string): Promise<StickerPack>;
  listStickerPacks(characterId?: string): Promise<StickerPack[]>;
  regenerateStickerSlot(input: RegenerateStickerSlotInput): Promise<StickerSlot>;
  updateStickerText(input: UpdateStickerTextInput): Promise<StickerSlot>;
  exportStickerPack(input: ExportStickerPackInput): Promise<ExportManifest>;
  getExportManifest(exportId: string): Promise<ExportManifest>;
  getConsentState(): Promise<ConsentState>;
  updateConsent(state: ConsentState): Promise<ConsentState>;
  getDiagnostics(): Promise<ProductDiagnostics>;
  setMockScenario(scenario: MockScenario): Promise<void>;
  clearLocalData(): Promise<void>;
}
