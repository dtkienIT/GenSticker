/// <reference lib="webworker" />

import { FaceDetector, FilesetResolver } from '@mediapipe/tasks-vision';

interface FaceDetectionRequest {
  id: number;
  imageBitmap: ImageBitmap;
}

interface FaceDetectionSuccess {
  id: number;
  ok: true;
  faceCount: number;
}

interface FaceDetectionFailure {
  id: number;
  ok: false;
  error: string;
}

type FaceDetectionResponse = FaceDetectionSuccess | FaceDetectionFailure;

const WASM_BASE_URL = 'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@1.0.1/wasm';
const MODEL_URL = new URL(
  `${import.meta.env.BASE_URL}models/blaze_face_short_range.tflite`,
  self.location.origin,
).toString();

let detectorPromise: Promise<FaceDetector> | null = null;

function getDetector(): Promise<FaceDetector> {
  if (!detectorPromise) {
    detectorPromise = (async () => {
      const vision = await FilesetResolver.forVisionTasks(WASM_BASE_URL, true);
      return FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: MODEL_URL,
          delegate: 'CPU',
        },
        runningMode: 'IMAGE',
        minDetectionConfidence: 0.6,
        minSuppressionThreshold: 0.3,
      });
    })();
  }

  return detectorPromise;
}

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

workerScope.addEventListener('message', async (event: MessageEvent<FaceDetectionRequest>) => {
  const { id, imageBitmap } = event.data;

  try {
    const detector = await getDetector();
    const result = detector.detect(imageBitmap);
    const response: FaceDetectionResponse = {
      id,
      ok: true,
      faceCount: result.detections.length,
    };
    workerScope.postMessage(response);
  } catch (error) {
    detectorPromise = null;
    const response: FaceDetectionResponse = {
      id,
      ok: false,
      error: error instanceof Error ? error.message : 'face_detector_failed',
    };
    workerScope.postMessage(response);
  } finally {
    imageBitmap.close();
  }
});

export {};
