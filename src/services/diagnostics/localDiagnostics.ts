import { openWebDatabase } from '../storage/webDatabase';
import type { LocalDiagnosticEvent } from './types';

interface LocalDiagnosticsDependencies {
  databaseName?: string;
  createId?: () => string;
  now?: () => string;
}

type DiagnosticInput = Omit<LocalDiagnosticEvent, 'id' | 'recordedAt'>;

const SENSITIVE_METADATA_KEYS = new Set([
  'prompt',
  'rawPrompt',
  'normalizedPrompt',
  'blockedPrompt',
]);

export class LocalDiagnostics {
  private databasePromise: ReturnType<typeof openWebDatabase> | null = null;

  constructor(private readonly dependencies: LocalDiagnosticsDependencies = {}) {}

  private async database() {
    this.databasePromise ??= openWebDatabase(this.dependencies.databaseName);
    return this.databasePromise;
  }

  async record(input: DiagnosticInput): Promise<LocalDiagnosticEvent> {
    const metadata = input.metadata
      ? Object.fromEntries(
          Object.entries(input.metadata).filter(([key]) => !SENSITIVE_METADATA_KEYS.has(key)),
        )
      : undefined;
    const event: LocalDiagnosticEvent = {
      ...input,
      id:
        this.dependencies.createId?.() ??
        `diagnostic-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      recordedAt: this.dependencies.now?.() ?? new Date().toISOString(),
      ...(metadata ? { metadata } : {}),
    };
    await (await this.database()).put('diagnostics', event);
    return event;
  }

  async list(): Promise<LocalDiagnosticEvent[]> {
    return (await (await this.database()).getAll('diagnostics')).sort((first, second) =>
      second.recordedAt.localeCompare(first.recordedAt),
    );
  }

  async exportJson(): Promise<string> {
    return JSON.stringify(
      {
        schemaVersion: 1,
        exportedAt: this.dependencies.now?.() ?? new Date().toISOString(),
        events: await this.list(),
      },
      null,
      2,
    );
  }

  async clear(): Promise<void> {
    await (await this.database()).clear('diagnostics');
  }

  async close(): Promise<void> {
    (await this.database()).close();
    this.databasePromise = null;
  }
}
