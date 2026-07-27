import type { WebModelFiles } from '../../setup/web/webModelManifest';
import type { GenerationErrorCode, GenerationRequest, GenerationStage } from '../types';

export type WorkerRequest =
  | {
      type: 'prepare';
      requestId: string;
      files: WebModelFiles;
    }
  | {
      type: 'generate';
      request: GenerationRequest;
    };

export type WorkerResponse =
  | {
      type: 'ready';
      requestId: string;
    }
  | {
      type: 'progress';
      requestId: string;
      sequence: number;
      stage: GenerationStage;
      stageProgress: number;
      elapsedMs: number;
    }
  | {
      type: 'result';
      requestId: string;
      pngBytes: ArrayBuffer;
      width: number;
      height: number;
    }
  | {
      type: 'failure';
      requestId: string;
      code: GenerationErrorCode;
      message: string;
    };
