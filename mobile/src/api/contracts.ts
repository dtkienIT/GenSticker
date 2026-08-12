import { z } from 'zod';

export const jobStatusSchema = z.enum([
  'queued',
  'generating',
  'processing',
  'moderating',
  'succeeded',
  'failed',
  'timed_out',
]);

export type JobStatus = z.infer<typeof jobStatusSchema>;

const stickerWireSchema = z
  .object({
    id: z.string().optional(),
    sticker_id: z.string().optional(),
    ordinal: z.number().int().min(1).max(8),
    asset_url: z.string().optional(),
  })
  .passthrough();

export type Sticker = {
  id: string;
  ordinal: number;
  assetUrl?: string;
};

export const stickerSchema = stickerWireSchema.transform((wire, context): Sticker => {
  const id = wire.sticker_id ?? wire.id;
  if (!id) {
    context.addIssue({ code: 'custom', message: 'Sticker thiếu ID' });
    return z.NEVER;
  }
  return {
    id,
    ordinal: wire.ordinal,
    // Backend paths are relative and protected. UI always rebuilds the canonical
    // endpoint and supplies auth headers instead of trusting an arbitrary URL.
  };
});

const setWireSchema = z
  .object({
    id: z.string().optional(),
    set_id: z.string().optional(),
    sticker_set_id: z.string().optional(),
    job_id: z.string(),
    stickers: z.array(stickerSchema),
  })
  .passthrough();

export type StickerSet = {
  id: string;
  jobId: string;
  stickers: Sticker[];
};

export const stickerSetSchema = setWireSchema.transform((wire, context): StickerSet => {
  const id = wire.set_id ?? wire.sticker_set_id ?? wire.id;
  if (!id) {
    context.addIssue({ code: 'custom', message: 'Bộ sticker thiếu ID' });
    return z.NEVER;
  }
  return { id, jobId: wire.job_id, stickers: wire.stickers };
});

const sourceWireSchema = z
  .object({
    id: z.string().optional(),
    source_image_id: z.string().optional(),
    status: z.string().optional(),
    validation_status: z.string().optional(),
  })
  .passthrough();

export type ValidatedSource = { id: string; status: string };

export const validatedSourceSchema = sourceWireSchema.transform(
  (wire, context): ValidatedSource => {
    const id = wire.source_image_id ?? wire.id;
    if (!id) {
      context.addIssue({ code: 'custom', message: 'Ảnh nguồn thiếu ID' });
      return z.NEVER;
    }
    return { id, status: wire.validation_status ?? wire.status ?? 'validated' };
  },
);

const jobWireSchema = z
  .object({
    id: z.string().optional(),
    job_id: z.string().optional(),
    source_image_id: z.string(),
    status: jobStatusSchema,
    stage: z.string().default('queued'),
    progress: z.number().min(0).max(100).default(0),
    safe_error_code: z.string().nullable().optional(),
    set_id: z.string().nullable().optional(),
    sticker_set_id: z.string().nullable().optional(),
  })
  .passthrough();

export type GenerationJob = {
  id: string;
  sourceImageId: string;
  status: JobStatus;
  stage: string;
  progress: number;
  errorCode?: string;
  setId?: string;
};

export const generationJobSchema = jobWireSchema.transform(
  (wire, context): GenerationJob => {
    const id = wire.job_id ?? wire.id;
    if (!id) {
      context.addIssue({ code: 'custom', message: 'Job thiếu ID' });
      return z.NEVER;
    }
    const errorCode = wire.safe_error_code ?? undefined;
    const setId = wire.sticker_set_id ?? wire.set_id ?? undefined;
    return {
      id,
      sourceImageId: wire.source_image_id,
      status: wire.status,
      stage: wire.stage,
      progress: wire.progress,
      ...(errorCode ? { errorCode } : {}),
      ...(setId ? { setId } : {}),
    };
  },
);

const packWireSchema = z
  .object({
    id: z.string().optional(),
    pack_id: z.string().optional(),
    name: z.string().optional(),
    title: z.string().optional(),
    created_at: z.string().optional(),
    stickers: z.array(stickerSchema),
  })
  .passthrough();

export type StickerPack = {
  id: string;
  name: string;
  createdAt?: string;
  stickers: Sticker[];
};

export const stickerPackSchema = packWireSchema.transform((wire, context): StickerPack => {
  const id = wire.pack_id ?? wire.id;
  if (!id) {
    context.addIssue({ code: 'custom', message: 'Gói sticker thiếu ID' });
    return z.NEVER;
  }
  return {
    id,
    name: wire.title ?? wire.name ?? 'Bộ sticker của tôi',
    stickers: wire.stickers,
    ...(wire.created_at ? { createdAt: wire.created_at } : {}),
  };
});

export const packsSchema = z
  .union([
    z.array(stickerPackSchema),
    z.object({ items: z.array(stickerPackSchema) }),
    z.object({ packs: z.array(stickerPackSchema) }),
  ])
  .transform((wire) => (Array.isArray(wire) ? wire : 'items' in wire ? wire.items : wire.packs));

export function assertExactlyEight(stickers: Sticker[]): Sticker[] {
  if (stickers.length !== 8) {
    throw new Error('INVALID_STICKER_COUNT');
  }
  const ordinals = new Set(stickers.map((sticker) => sticker.ordinal));
  if (ordinals.size !== 8) {
    throw new Error('INVALID_STICKER_ORDINALS');
  }
  return stickers;
}

export function isTerminalJob(status: JobStatus): boolean {
  return status === 'succeeded' || status === 'failed' || status === 'timed_out';
}
