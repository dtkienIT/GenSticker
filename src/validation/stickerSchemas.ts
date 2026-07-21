import { z } from 'zod';

export const stickerPromptSchema = z.object({
  prompt: z
    .string()
    .trim()
    .min(3, 'Describe your sticker in at least 3 characters')
    .max(300, 'Keep your prompt under 300 characters'),
  stylePresetId: z.enum(['chibi', 'cartoon', 'three-d', 'meme'], {
    message: 'Choose a sticker style',
  }),
});

export type StickerPromptFormData = z.infer<typeof stickerPromptSchema>;
