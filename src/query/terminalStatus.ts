import type {
  GenerationJobStatus,
  StickerPackStatus,
  StickerSlotStatus,
} from '@/services/contracts';

export const TERMINAL_GENERATION_JOB_STATUSES = [
  'succeeded',
  'failed',
  'cancelled',
] as const satisfies readonly GenerationJobStatus[];

export const TERMINAL_STICKER_PACK_STATUSES = [
  'COMPLETED',
  'PARTIAL',
  'FAILED',
  'CANCELLED',
] as const satisfies readonly StickerPackStatus[];

export const TERMINAL_STICKER_SLOT_STATUSES = [
  'completed',
  'failed',
  'cancelled',
] as const satisfies readonly StickerSlotStatus[];

export function isTerminalGenerationJobStatus(status: GenerationJobStatus): boolean {
  return TERMINAL_GENERATION_JOB_STATUSES.some((terminalStatus) => terminalStatus === status);
}

export function isTerminalStickerPackStatus(status: StickerPackStatus): boolean {
  return TERMINAL_STICKER_PACK_STATUSES.some((terminalStatus) => terminalStatus === status);
}

export function isTerminalStickerSlotStatus(status: StickerSlotStatus): boolean {
  return TERMINAL_STICKER_SLOT_STATUSES.some((terminalStatus) => terminalStatus === status);
}

export const isGenerationJobTerminal = isTerminalGenerationJobStatus;
export const isStickerPackTerminal = isTerminalStickerPackStatus;
export const isStickerSlotTerminal = isTerminalStickerSlotStatus;
export const isTerminalJobStatus = isTerminalGenerationJobStatus;
export const isTerminalPackStatus = isTerminalStickerPackStatus;
export const isTerminalSlotStatus = isTerminalStickerSlotStatus;
