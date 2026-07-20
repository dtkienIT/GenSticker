import { z } from 'zod';

export const textToStickerSchema = z.object({
  prompt: z.string().min(1, 'Prompt is required').min(3, 'Prompt must be at least 3 characters'),
  style: z.enum(['chibi', 'cartoon', 'three-d', 'meme'], {
    message: 'Please select a sticker style',
  }),
  emotion: z.enum(['happy', 'angry', 'sad', 'love', 'confused'], {
    message: 'Please select an emotion',
  }),
  stickerText: z.string().max(40, 'Sticker text cannot exceed 40 characters').optional(),
});

export const selfieToStickerSchema = z.object({
  sourceImageUri: z
    .string({ message: 'Please select a selfie photo' })
    .min(1, 'Please select a selfie photo'),
  style: z.enum(['chibi', 'cartoon', 'three-d', 'meme'], {
    message: 'Please select a sticker style',
  }),
  emotion: z.enum(['happy', 'angry', 'sad', 'love', 'confused'], {
    message: 'Please select an emotion',
  }),
  stickerText: z.string().max(40, 'Sticker text cannot exceed 40 characters').optional(),
});

export type TextToStickerFormData = z.infer<typeof textToStickerSchema>;
export type SelfieToStickerFormData = z.infer<typeof selfieToStickerSchema>;
