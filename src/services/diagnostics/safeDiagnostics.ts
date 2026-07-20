import type { GenerationStage, SafeDiagnosticEvent } from '@/services/contracts/types';

export const SAFE_DIAGNOSTIC_METADATA_KEYS = Object.freeze([
  'level',
  'screen',
  'action',
  'entityId',
  'jobStage',
  'durationMs',
  'errorCode',
  'requestId',
  'serviceMode',
] as const);

export type SafeDiagnosticMetadata = Pick<SafeDiagnosticEvent, 'level' | 'action' | 'serviceMode'> &
  Partial<
    Pick<
      SafeDiagnosticEvent,
      'screen' | 'entityId' | 'jobStage' | 'durationMs' | 'errorCode' | 'requestId'
    >
  >;

export interface SafeDiagnosticSink {
  save(events: readonly SafeDiagnosticEvent[]): void | Promise<void>;
  clear?(): void | Promise<void>;
}

export interface SafeDiagnosticFactoryOptions {
  readonly now?: () => Date;
  readonly createId?: () => string;
}

export interface SafeDiagnosticsOptions extends SafeDiagnosticFactoryOptions {
  readonly maxEvents?: number;
  readonly sink?: SafeDiagnosticSink;
}

const LEVELS = new Set<SafeDiagnosticEvent['level']>(['info', 'warning', 'error']);
const SERVICE_MODES = new Set<SafeDiagnosticEvent['serviceMode']>(['mock', 'http']);
const JOB_STAGES = new Set<GenerationStage>([
  'validating',
  'preparing',
  'generating',
  'background_removal',
  'postprocessing',
  'exporting',
  'completed',
]);

const SAFE_LABEL_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;
const JWT_PATTERN = /^[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}$/u;
const DATA_URI_PATTERN = /^data:/iu;
const DEFAULT_MAX_EVENTS = 50;
const MAX_EVENT_CAPACITY = 200;
let diagnosticSequence = 0;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function safeLabel(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const trimmed = value.trim();

  if (
    trimmed.length === 0 ||
    trimmed.length > maxLength ||
    !SAFE_LABEL_PATTERN.test(trimmed) ||
    DATA_URI_PATTERN.test(trimmed) ||
    JWT_PATTERN.test(trimmed)
  ) {
    return undefined;
  }

  return trimmed;
}

function isLevel(value: unknown): value is SafeDiagnosticEvent['level'] {
  return typeof value === 'string' && LEVELS.has(value as SafeDiagnosticEvent['level']);
}

function isServiceMode(value: unknown): value is SafeDiagnosticEvent['serviceMode'] {
  return (
    typeof value === 'string' && SERVICE_MODES.has(value as SafeDiagnosticEvent['serviceMode'])
  );
}

function isJobStage(value: unknown): value is GenerationStage {
  return typeof value === 'string' && JOB_STAGES.has(value as GenerationStage);
}

function safeDuration(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    return undefined;
  }

  return Math.round(value);
}

/**
 * Projects unknown input onto the diagnostic allowlist. Raw input is never spread,
 * serialized, logged, or forwarded to a sink.
 */
export function sanitizeSafeDiagnosticMetadata(input: unknown): SafeDiagnosticMetadata | null {
  if (!isRecord(input)) {
    return null;
  }

  const action = safeLabel(input.action, 80);

  if (!isLevel(input.level) || !action || !isServiceMode(input.serviceMode)) {
    return null;
  }

  const screen = safeLabel(input.screen, 64);
  const entityId = safeLabel(input.entityId, 96);
  const durationMs = safeDuration(input.durationMs);
  const errorCode = safeLabel(input.errorCode, 64);
  const requestId = safeLabel(input.requestId, 96);

  return {
    level: input.level,
    action,
    serviceMode: input.serviceMode,
    ...(screen ? { screen } : {}),
    ...(entityId ? { entityId } : {}),
    ...(isJobStage(input.jobStage) ? { jobStage: input.jobStage } : {}),
    ...(durationMs !== undefined ? { durationMs } : {}),
    ...(errorCode ? { errorCode } : {}),
    ...(requestId ? { requestId } : {}),
  };
}

function defaultDiagnosticId(): string {
  diagnosticSequence += 1;
  return `diagnostic-${Date.now()}-${diagnosticSequence}`;
}

export function createSafeDiagnosticEvent(
  metadata: SafeDiagnosticMetadata,
  options: SafeDiagnosticFactoryOptions = {},
): SafeDiagnosticEvent | null {
  const safeMetadata = sanitizeSafeDiagnosticMetadata(metadata);

  if (!safeMetadata) {
    return null;
  }

  const now = options.now?.() ?? new Date();
  const timestamp = Number.isNaN(now.getTime()) ? new Date(0).toISOString() : now.toISOString();
  const suppliedId = safeLabel(options.createId?.(), 96);
  const id = suppliedId ?? defaultDiagnosticId();

  return Object.freeze({
    id,
    timestamp,
    ...safeMetadata,
  });
}

function copyEvent(event: SafeDiagnosticEvent): SafeDiagnosticEvent {
  return Object.freeze({ ...event });
}

function normalizeCapacity(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) {
    return DEFAULT_MAX_EVENTS;
  }

  return Math.min(MAX_EVENT_CAPACITY, Math.max(1, Math.floor(value)));
}

export class SafeDiagnostics {
  private readonly maxEvents: number;
  private readonly sink?: SafeDiagnosticSink;
  private readonly factoryOptions: SafeDiagnosticFactoryOptions;
  private events: SafeDiagnosticEvent[] = [];

  constructor(options: SafeDiagnosticsOptions = {}) {
    this.maxEvents = normalizeCapacity(options.maxEvents);
    this.sink = options.sink;
    this.factoryOptions = {
      ...(options.now ? { now: options.now } : {}),
      ...(options.createId ? { createId: options.createId } : {}),
    };
  }

  async record(metadata: SafeDiagnosticMetadata): Promise<SafeDiagnosticEvent | null> {
    const event = createSafeDiagnosticEvent(metadata, this.factoryOptions);

    if (!event) {
      return null;
    }

    this.events = [...this.events, event].slice(-this.maxEvents);

    if (this.sink) {
      await this.sink.save(this.getRecent());
    }

    return copyEvent(event);
  }

  getRecent(limit = this.maxEvents): readonly SafeDiagnosticEvent[] {
    const safeLimit = Number.isFinite(limit)
      ? Math.min(this.maxEvents, Math.max(0, Math.floor(limit)))
      : this.maxEvents;

    if (safeLimit === 0) {
      return Object.freeze([]);
    }

    return Object.freeze(this.events.slice(-safeLimit).map(copyEvent));
  }

  async clear(): Promise<void> {
    this.events = [];

    if (this.sink?.clear) {
      await this.sink.clear();
      return;
    }

    if (this.sink) {
      await this.sink.save([]);
    }
  }
}

export const frontendDiagnostics = new SafeDiagnostics();
