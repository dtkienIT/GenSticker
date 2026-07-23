import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CHARACTER_PROFILE_CONFIG } from '@/constants/profilePresets';
import { ProductServiceError } from '@/services/contracts';
import { HttpStickerProductService } from './HttpStickerProductService';

vi.mock('@/services/api/resolveBaseUrl', () => ({
  resolveBaseUrl: () => 'http://192.168.1.20:8000/api/v1/',
}));

const fetchMock = vi.fn();
const at = '2026-07-21T00:00:00.000Z';

function response(body: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(body === undefined ? undefined : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...headers },
  });
}

function jobPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'job-1',
    character_id: 'character-1',
    status: 'running',
    current_stage: 'generating',
    progress: 60,
    error_code: null,
    error_message: null,
    created_at: at,
    updated_at: at,
    ...overrides,
  };
}

function slotPayload(overrides: Record<string, unknown> = {}) {
  return {
    id: 'slot-1',
    emotion_id: 'happy',
    status: 'completed',
    progress: 100,
    selected_asset_id: 'sticker-1',
    candidate_asset_ids: ['sticker-1'],
    error_code: null,
    retry_count: 0,
    image_uri: '/api/v1/assets/sticker-1/content',
    ...overrides,
  };
}

describe('HttpStickerProductService', () => {
  let service: HttpStickerProductService;

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
    process.env.EXPO_PUBLIC_DEV_USER_ID = 'phone-user';
    service = new HttpStickerProductService();
  });

  it('uses the resolved LAN base URL, dev auth header, and maps /me', async () => {
    fetchMock.mockResolvedValueOnce(
      response({ id: 'user-1', external_id: 'phone-user', created_at: at, updated_at: at }),
    );

    await expect(service.getCurrentUser()).resolves.toEqual({
      id: 'user-1',
      displayName: 'phone-user',
      locale: 'vi',
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'http://192.168.1.20:8000/api/v1/me',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          Accept: 'application/json',
          'X-Dev-User-Id': 'phone-user',
        }),
      }),
    );
  });

  it('uploads a React Native URI as multipart without forcing a content type', async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        asset: {
          id: 'asset-1',
          asset_type: 'selfie',
          mime_type: 'image/jpeg',
          width: 512,
          height: 512,
          byte_size: 1234,
          sha256: 'abc123',
        },
        validation: {
          valid: true,
          reason_codes: [],
          warnings: [],
          width: 512,
          height: 512,
          mime_type: 'image/jpeg',
          byte_size: 1234,
        },
      }),
    );

    const upload = await service.validateAndUploadSelfie({
      uri: 'file:///portrait.jpg',
      fileName: 'portrait.jpg',
      mimeType: 'image/jpeg',
      width: 512,
      height: 512,
      byteSize: 1234,
    });

    expect(upload.asset).toMatchObject({
      id: 'asset-1',
      type: 'selfie',
      contentUri: 'http://192.168.1.20:8000/api/v1/assets/asset-1/content',
    });
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(options.body).toBeInstanceOf(FormData);
    expect(options.headers).not.toHaveProperty('Content-Type');
  });

  it('converts a browser blob URI into a real multipart file', async () => {
    vi.stubGlobal('window', {});
    fetchMock
      .mockResolvedValueOnce(
        new Response(new Blob(['image-bytes'], { type: 'image/jpeg' }), { status: 200 }),
      )
      .mockResolvedValueOnce(
        response({
          asset: {
            id: 'asset-web',
            asset_type: 'selfie',
            mime_type: 'image/jpeg',
            width: 800,
            height: 1000,
            byte_size: 11,
            sha256: 'web123',
          },
          validation: {
            valid: true,
            reason_codes: [],
            warnings: [],
            width: 800,
            height: 1000,
            mime_type: 'image/jpeg',
            byte_size: 11,
          },
        }),
      );

    try {
      await service.validateAndUploadSelfie({
        uri: 'blob:http://localhost/selfie',
        fileName: 'selfie.jpg',
        mimeType: 'image/jpeg',
        width: 800,
        height: 1000,
        byteSize: 11,
      });

      expect(fetchMock).toHaveBeenNthCalledWith(1, 'blob:http://localhost/selfie');
      const options = fetchMock.mock.calls[1][1] as RequestInit;
      expect(options.body).toBeInstanceOf(FormData);
      expect((options.body as FormData).get('file')).toBeInstanceOf(Blob);
      expect(options.headers).not.toHaveProperty('Content-Type');
    } finally {
      vi.unstubAllGlobals();
    }
  });

  it('turns a 200 validation rejection into a ProductServiceError', async () => {
    fetchMock.mockResolvedValueOnce(
      response({
        asset: null,
        validation: { valid: false, reason_codes: ['face_count_invalid'], warnings: [] },
      }),
    );

    await expect(
      service.validateAndUploadSelfie({ uri: 'file:///group.jpg', mimeType: 'image/jpeg' }),
    ).rejects.toMatchObject({ name: 'ProductServiceError', code: 'face_count_invalid' });
  });

  it('sends a canonical job request in snake_case and maps job result assets', async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        jobPayload({
          status: 'succeeded',
          current_stage: 'completed',
          progress: 100,
          result: { asset_ids: ['canonical-1', 'canonical-2', 'canonical-3'] },
        }),
      ),
    );

    const job = await service.createCanonicalJob({
      characterId: 'character-1',
      preset: { outfit: 'casual', style: 'chibi' },
    });

    expect(job).toMatchObject({
      characterId: 'character-1',
      status: 'succeeded',
      stage: 'completed',
      candidateAssetIds: ['canonical-1', 'canonical-2', 'canonical-3'],
    });
    const options = fetchMock.mock.calls[0][1] as RequestInit;
    expect(JSON.parse(options.body as string)).toEqual({
      character_id: 'character-1',
      kind: 'canonical_generation',
      style: 'chibi',
      extra_params: { outfit: 'casual' },
    });
  });

  it('maps nested backend errors and preserves the request ID', async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        {
          error: {
            code: 'resource_not_found',
            message: 'Character missing',
            details: { resource_type: 'Character' },
            request_id: 'request-404',
          },
        },
        404,
      ),
    );

    const error = await service.getCharacter('missing').catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ProductServiceError);
    expect(error).toMatchObject({
      code: 'character_not_found',
      message: 'Character missing',
      requestId: 'request-404',
    });
  });

  it('preserves a known consent error returned with HTTP 403', async () => {
    fetchMock.mockResolvedValueOnce(
      response(
        {
          error: {
            code: 'consent_required',
            message: 'Version 1.0 consent is required.',
            request_id: 'request-consent',
          },
        },
        403,
      ),
    );

    await expect(service.getConsentState()).rejects.toMatchObject({
      code: 'consent_required',
      message: 'Version 1.0 consent is required.',
      requestId: 'request-consent',
    });
  });

  it('maps an unspecified HTTP 403 to forbidden', async () => {
    fetchMock.mockResolvedValueOnce(response({ detail: 'Access denied' }, 403));

    await expect(service.getConsentState()).rejects.toMatchObject({ code: 'forbidden' });
  });

  it('maps profile and sticker-pack DTOs through the contract schemas', async () => {
    fetchMock
      .mockResolvedValueOnce(
        response({
          character_id: 'character-1',
          version: 1,
          canonical_asset_id: 'canonical-1',
          config: {
            hair: { style: 'original', color: 'original' },
            face_accessories: ['none'],
            outfit: 'casual',
            style: 'chibi',
          },
          approved_at: at,
        }),
      )
      .mockResolvedValueOnce(
        response({
          id: 'pack-1',
          character_id: 'character-1',
          profile_version: 1,
          template_id: 'core-eight-v1',
          status: 'completed',
          slots: [slotPayload()],
          created_at: at,
          updated_at: at,
        }),
      );

    const profile = await service.approveCanonical({
      characterId: 'character-1',
      canonicalAssetId: 'canonical-1',
      config: DEFAULT_CHARACTER_PROFILE_CONFIG,
    });
    const pack = await service.getStickerPack('pack-1');

    expect(profile.config.faceAccessories).toEqual(['none']);
    expect(pack.status).toBe('COMPLETED');
    expect(pack.slots[0]).toMatchObject({
      emotionId: 'happy',
      imageUri: 'http://192.168.1.20:8000/api/v1/assets/sticker-1/content',
    });
  });

  it('refetches a job when cancel returns the legacy partial response', async () => {
    fetchMock
      .mockResolvedValueOnce(response({ id: 'job-1', status: 'cancelled', message: 'done' }))
      .mockResolvedValueOnce(
        response(jobPayload({ status: 'cancelled', error_code: 'job_cancelled' })),
      );

    await expect(service.cancelGenerationJob('job-1')).resolves.toMatchObject({
      id: 'job-1',
      status: 'cancelled',
      errorCode: 'job_cancelled',
    });
    expect(fetchMock.mock.calls.map((call) => call[0])).toEqual([
      'http://192.168.1.20:8000/api/v1/generation-jobs/job-1/cancel',
      'http://192.168.1.20:8000/api/v1/generation-jobs/job-1',
    ]);
  });

  it('rejects mock-only debug mutations without making a request', async () => {
    await expect(service.setMockScenario('happy_path')).rejects.toMatchObject({
      code: 'unsupported_operation',
    });
    await expect(service.clearLocalData()).rejects.toMatchObject({
      code: 'unsupported_operation',
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
