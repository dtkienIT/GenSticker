import type { StickerProductService } from '@/services/contracts';

/** Explicitly disabled seam for Member B's future HTTP implementation. */
export class HttpStickerProductService implements StickerProductService {
  private disabled(): never {
    throw new Error('HTTP product service is deferred. Set EXPO_PUBLIC_STICKER_SERVICE=mock.');
  }
  getCurrentUser = async () => this.disabled();
  validateAndUploadSelfie = async () => this.disabled();
  createCharacter = async () => this.disabled();
  listCharacters = async () => this.disabled();
  getCharacter = async () => this.disabled();
  deleteCharacter = async () => this.disabled();
  createCanonicalJob = async () => this.disabled();
  getGenerationJob = async () => this.disabled();
  listGenerationJobs = async () => this.disabled();
  getJobEvents = async () => this.disabled();
  cancelGenerationJob = async () => this.disabled();
  getCanonicalCandidates = async () => this.disabled();
  approveCanonical = async () => this.disabled();
  getCharacterProfile = async () => this.disabled();
  updateCharacterProfile = async () => this.disabled();
  createStickerPack = async () => this.disabled();
  getStickerPack = async () => this.disabled();
  listStickerPacks = async () => this.disabled();
  regenerateStickerSlot = async () => this.disabled();
  updateStickerText = async () => this.disabled();
  exportStickerPack = async () => this.disabled();
  getExportManifest = async () => this.disabled();
  getConsentState = async () => this.disabled();
  updateConsent = async () => this.disabled();
  getDiagnostics = async () => this.disabled();
  setMockScenario = async () => this.disabled();
  clearLocalData = async () => this.disabled();
}
