import { beforeEach, describe, expect, it } from 'vitest';
import {
  DEFAULT_EMOTION_TEMPLATE,
  DEFAULT_EMOTION_TEMPLATE_ID,
} from '@/constants/emotionTemplates';
import { DEFAULT_CHARACTER_PROFILE_CONFIG } from '@/constants/profilePresets';
import { getApiErrorPresentation } from '@/services/errors';
import { MemoryMockStateStorage } from '@/services/storage/mockStateStorage';
import { queryKeys } from '@/query';
import {
  characterProfileConfigSchema,
  updateStickerTextInputSchema,
} from '@/services/contracts/schemas';
import { MockStickerProductService, type MockState } from './MockStickerProductService';

describe('MockStickerProductService', () => {
  let service: MockStickerProductService;
  beforeEach(async () => {
    service = new MockStickerProductService(new MemoryMockStateStorage<MockState>());
    await service.updateConsent({
      consentVersion: '1.0',
      accepted: true,
      reuseOptIn: false,
      acceptedAt: '2026-01-01T00:00:00.000Z',
    });
  });

  async function character() {
    const upload = await service.validateAndUploadSelfie({
      uri: 'file://portrait.jpg',
      mimeType: 'image/jpeg',
      width: 1024,
      height: 1024,
    });
    return service.createCharacter({ displayName: 'Test', selfieAssetId: upload.asset.id });
  }

  async function approvedCharacter() {
    const item = await character();
    const initial = await service.createCanonicalJob({
      characterId: item.id,
      preset: { outfit: 'casual', style: 'chibi' },
    });
    let job = initial;
    for (let index = 0; index < 6; index += 1) job = await service.getGenerationJob(job.id);
    const candidates = await service.getCanonicalCandidates(item.id);
    expect(candidates).toHaveLength(3);
    expect(candidates.filter((candidate) => candidate.recommended)).toHaveLength(1);
    expect((await service.getCharacter(item.id)).status).toBe('AWAITING_APPROVAL');
    const profile = await service.approveCanonical({
      characterId: item.id,
      canonicalAssetId: candidates[0].assetId,
      config: DEFAULT_CHARACTER_PROFILE_CONFIG,
    });
    return { item, profile };
  }

  it('uses a versioned eight-emotion template', () => {
    expect(DEFAULT_EMOTION_TEMPLATE.version).toMatch(/^\d+\.\d+\.\d+$/);
    expect(DEFAULT_EMOTION_TEMPLATE.emotions).toHaveLength(8);
  });

  it('blocks pack creation before explicit canonical approval', async () => {
    const item = await character();
    await expect(
      service.createStickerPack({
        characterId: item.id,
        profileVersion: 1,
        templateId: DEFAULT_EMOTION_TEMPLATE_ID,
      }),
    ).rejects.toMatchObject({ code: 'character_not_approved' });
  });

  it('advances deterministically and never auto-approves a recommendation', async () => {
    await approvedCharacter();
  });

  it('retries only a failed slot and preserves unaffected slots', async () => {
    const { item, profile } = await approvedCharacter();
    await service.setMockScenario('partial_pack');
    let pack = await service.createStickerPack({
      characterId: item.id,
      profileVersion: profile.version,
      templateId: DEFAULT_EMOTION_TEMPLATE_ID,
    });
    for (let index = 0; index < 17; index += 1) pack = await service.getStickerPack(pack.id);
    expect(pack.status).toBe('PARTIAL');
    const failed = pack.slots.find((slot) => slot.status === 'failed')!;
    const unaffected = pack.slots
      .filter((slot) => slot.id !== failed.id)
      .map((slot) => slot.selectedAssetId);
    await service.regenerateStickerSlot({ packId: pack.id, slotId: failed.id });
    const retried = await service.getStickerPack(pack.id);
    expect(retried.status).toBe('COMPLETED');
    expect(
      retried.slots.filter((slot) => slot.id !== failed.id).map((slot) => slot.selectedAssetId),
    ).toEqual(unaffected);
  });

  it('deletes related state idempotently and rejects base64 selfie input', async () => {
    const { item } = await approvedCharacter();
    await service.deleteCharacter(item.id);
    await service.deleteCharacter(item.id);
    expect(await service.listCharacters()).toEqual([]);
    await expect(
      service.validateAndUploadSelfie({ uri: 'data:image/png;base64,abc' }),
    ).rejects.toBeTruthy();
  });
});

describe('frontend policies', () => {
  it('generates stable query keys and Vietnamese safety mapping', () => {
    expect(queryKeys.jobs.detail('job-1')).toEqual(['jobs', 'detail', 'job-1']);
    const presentation = getApiErrorPresentation({
      code: 'consent_required',
      message: '',
      requestId: 'request-1',
    });
    expect(presentation.field).toBe('consent');
    expect(presentation.retryAllowed).toBe(false);
  });

  it('enforces product profile and sticker text constraints at the service boundary', () => {
    expect(
      characterProfileConfigSchema.safeParse({
        ...DEFAULT_CHARACTER_PROFILE_CONFIG,
        faceAccessories: ['none', 'round_glasses'],
      }).success,
    ).toBe(false);
    expect(
      characterProfileConfigSchema.safeParse({
        ...DEFAULT_CHARACTER_PROFILE_CONFIG,
        faceAccessories: ['round_glasses', 'square_glasses', 'hair_clip'],
      }).success,
    ).toBe(false);
    expect(
      updateStickerTextInputSchema.safeParse({
        packId: 'pack-1',
        slotId: 'slot-1',
        text: 'Xin chào',
        placement: 'bottom',
        fontSize: 50,
      }).success,
    ).toBe(false);
  });
});
