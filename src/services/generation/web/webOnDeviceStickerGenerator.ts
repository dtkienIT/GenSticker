import type { WebModelFiles } from '../../setup/web/webModelManifest';
import {
  CONTRACT_VERSION,
  GenerationFailure,
  type CancelResult,
  type DeviceCapabilityResult,
  type GeneratedOutput,
  type GenerationProgressEvent,
  type GenerationRequest,
  type ModelReadiness,
  type OnDeviceStickerGenerator,
  type PrepareModelRequest,
} from '../types';
import type { WorkerRequest, WorkerResponse } from './workerProtocol';

export interface WorkerLike {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null;
  onerror: ((event: ErrorEvent) => void) | null;
  postMessage(message: WorkerRequest, transfer?: Transferable[]): void;
  terminate(): void;
}

interface WebGeneratorDependencies {
  resolveModelFiles(): Promise<WebModelFiles>;
  getCapabilities(): Promise<DeviceCapabilityResult>;
  createWorker?: () => WorkerLike;
  createObjectUrl?: (blob: Blob) => string;
  revokeObjectUrl?: (url: string) => void;
}

interface ActiveGeneration {
  requestId: string;
  lastSequence: number;
  onProgress: (event: GenerationProgressEvent) => void;
  resolve: (output: GeneratedOutput) => void;
  reject: (error: Error) => void;
}

export class WebOnDeviceStickerGenerator implements OnDeviceStickerGenerator {
  private worker: WorkerLike | null = null;
  private prepared = false;
  private prepareRequestId: string | null = null;
  private prepareResolve: ((readiness: ModelReadiness) => void) | null = null;
  private active: ActiveGeneration | null = null;

  constructor(private readonly dependencies: WebGeneratorDependencies) {}

  getCapabilities(): Promise<DeviceCapabilityResult> {
    return this.dependencies.getCapabilities();
  }

  private createWorker(): WorkerLike {
    return (
      this.dependencies.createWorker?.() ??
      new Worker(new URL('./stickerInference.worker.ts', import.meta.url))
    );
  }

  private ensureWorker(): WorkerLike {
    if (this.worker) return this.worker;
    this.worker = this.createWorker();
    this.worker.onmessage = (event) => this.handleMessage(event.data);
    this.worker.onerror = (event) => {
      const error = new GenerationFailure(
        this.active ? 'INFERENCE_FAILED' : 'RUNTIME_UNAVAILABLE',
        event.message,
      );
      this.active?.reject(error);
      this.active = null;
      this.prepareResolve?.({
        contractVersion: CONTRACT_VERSION,
        modelId: 'lcm-sd15-chibi',
        modelVersion: '1.0.1',
        ready: false,
        errorCode: error.code,
      });
      this.prepareResolve = null;
      this.resetWorker();
    };
    return this.worker;
  }

  private handleMessage(message: WorkerResponse): void {
    if (message.type === 'ready') {
      if (message.requestId !== this.prepareRequestId || !this.prepareResolve) return;
      this.prepared = true;
      this.prepareResolve({
        contractVersion: CONTRACT_VERSION,
        modelId: 'lcm-sd15-chibi',
        modelVersion: '1.0.1',
        ready: true,
      });
      this.prepareResolve = null;
      this.prepareRequestId = null;
      return;
    }

    if (message.type === 'failure' && message.requestId === this.prepareRequestId) {
      this.prepareResolve?.({
        contractVersion: CONTRACT_VERSION,
        modelId: 'lcm-sd15-chibi',
        modelVersion: '1.0.1',
        ready: false,
        errorCode: message.code,
      });
      this.prepareResolve = null;
      this.prepareRequestId = null;
      return;
    }

    const active = this.active;
    if (!active || message.requestId !== active.requestId) return;
    if (message.type === 'progress') {
      if (message.sequence <= active.lastSequence) return;
      active.lastSequence = message.sequence;
      active.onProgress({
        requestId: message.requestId,
        stage: message.stage,
        progressPercent: Math.round(Math.max(0, Math.min(1, message.stageProgress)) * 100),
        sequence: message.sequence,
        stageProgress: message.stageProgress,
        elapsedMs: message.elapsedMs,
      });
      return;
    }
    this.active = null;
    if (message.type === 'failure') {
      active.reject(new GenerationFailure(message.code, message.message));
      return;
    }
    if (message.type === 'result') {
      const blob = new Blob([message.pngBytes], { type: 'image/png' });
      const localUri =
        this.dependencies.createObjectUrl?.(blob) ?? globalThis.URL.createObjectURL(blob);
      active.resolve({
        requestId: message.requestId,
        localUri,
        mimeType: 'image/png',
        width: message.width,
        height: message.height,
        adapterId: 'onnxruntime-web-webgpu',
        temporary: true,
      });
    }
  }

  async prepareModel(request: PrepareModelRequest): Promise<ModelReadiness> {
    if (
      request.contractVersion !== CONTRACT_VERSION ||
      request.modelId !== 'lcm-sd15-chibi' ||
      request.modelVersion !== '1.0.1'
    ) {
      return { ...request, ready: false, errorCode: 'MODEL_INCOMPATIBLE' };
    }
    const capability = await this.getCapabilities();
    if (!capability.supported) {
      return { ...request, ready: false, errorCode: capability.reasonCode };
    }
    if (this.prepared) return { ...request, ready: true };

    try {
      const files = await this.dependencies.resolveModelFiles();
      const worker = this.ensureWorker();
      const requestId = `prepare-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      this.prepareRequestId = requestId;
      const readiness = new Promise<ModelReadiness>((resolve) => {
        this.prepareResolve = resolve;
      });
      worker.postMessage({ type: 'prepare', requestId, files });
      return await readiness;
    } catch {
      return { ...request, ready: false, errorCode: 'MODEL_NOT_AVAILABLE' };
    }
  }

  generate(
    request: GenerationRequest,
    onProgress: (event: GenerationProgressEvent) => void,
  ): Promise<GeneratedOutput> {
    if (this.active) {
      return Promise.reject(new GenerationFailure('GENERATION_BUSY'));
    }
    if (!this.prepared || !this.worker) {
      return Promise.reject(new GenerationFailure('MODEL_NOT_AVAILABLE'));
    }
    const promise = new Promise<GeneratedOutput>((resolve, reject) => {
      this.active = {
        requestId: request.requestId,
        lastSequence: 0,
        onProgress,
        resolve,
        reject,
      };
    });
    this.worker.postMessage({ type: 'generate', request });
    return promise;
  }

  async cancel(requestId: string): Promise<CancelResult> {
    if (!this.active || this.active.requestId !== requestId) {
      return { accepted: false, outcome: 'not_found' };
    }
    this.active.reject(new GenerationFailure('GENERATION_CANCELLED'));
    this.active = null;
    this.resetWorker();
    return { accepted: true, outcome: 'cancellation_requested' };
  }

  releaseTemporaryOutput(localUri: string): void {
    (this.dependencies.revokeObjectUrl ?? globalThis.URL.revokeObjectURL)(localUri);
  }

  private resetWorker(): void {
    this.worker?.terminate();
    this.worker = null;
    this.prepared = false;
    this.prepareRequestId = null;
    this.prepareResolve = null;
  }
}
