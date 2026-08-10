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

interface PendingDetection {
  resolve: (faceCount: number) => void;
  reject: (error: Error) => void;
  timeoutId: ReturnType<typeof setTimeout>;
}

const DETECTION_TIMEOUT_MS = 45_000;

let detectorWorker: Worker | null = null;
let requestSequence = 0;
const pendingDetections = new Map<number, PendingDetection>();

function createImageBitmapBeforeDeadline(file: File, timeoutMs: number): Promise<ImageBitmap> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const timeoutId = setTimeout(() => {
      settled = true;
      reject(new Error('face_detector_timeout'));
    }, timeoutMs);

    void createImageBitmap(file).then(
      (imageBitmap) => {
        if (settled) {
          imageBitmap.close();
          return;
        }

        settled = true;
        clearTimeout(timeoutId);
        resolve(imageBitmap);
      },
      (error: unknown) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeoutId);
        reject(error instanceof Error ? error : new Error('face_detector_decode_failed'));
      },
    );
  });
}

function rejectPendingDetections(error: Error): void {
  pendingDetections.forEach(({ reject, timeoutId }) => {
    clearTimeout(timeoutId);
    reject(error);
  });
  pendingDetections.clear();
}

function resetWorker(error?: Error): void {
  detectorWorker?.terminate();
  detectorWorker = null;
  if (error) rejectPendingDetections(error);
}

function getWorker(): Worker {
  if (detectorWorker) return detectorWorker;

  detectorWorker = new Worker(
    new URL('../workers/faceDetector.worker.ts', import.meta.url),
    { type: 'module' },
  );

  detectorWorker.addEventListener('message', (event: MessageEvent<FaceDetectionResponse>) => {
    const response = event.data;
    const pending = pendingDetections.get(response.id);
    if (!pending) return;

    clearTimeout(pending.timeoutId);
    pendingDetections.delete(response.id);

    if (response.ok) {
      pending.resolve(response.faceCount);
      return;
    }

    pending.reject(new Error(response.error));
  });

  detectorWorker.addEventListener('error', () => {
    resetWorker(new Error('face_detector_worker_failed'));
  });

  detectorWorker.addEventListener('messageerror', () => {
    resetWorker(new Error('face_detector_message_failed'));
  });

  return detectorWorker;
}

export async function detectFaceCount(file: File): Promise<number> {
  if (typeof createImageBitmap !== 'function') {
    throw new Error('face_detector_browser_unsupported');
  }

  const startedAt = Date.now();
  const imageBitmap = await createImageBitmapBeforeDeadline(file, DETECTION_TIMEOUT_MS);
  const remainingTimeoutMs = DETECTION_TIMEOUT_MS - (Date.now() - startedAt);
  if (remainingTimeoutMs <= 0) {
    imageBitmap.close();
    throw new Error('face_detector_timeout');
  }

  const requestId = ++requestSequence;
  let worker: Worker;

  try {
    worker = getWorker();
  } catch (error) {
    imageBitmap.close();
    throw error;
  }

  return new Promise<number>((resolve, reject) => {
    const timeoutId = setTimeout(() => {
      const timeoutError = new Error('face_detector_timeout');
      pendingDetections.delete(requestId);
      resetWorker(timeoutError);
      reject(timeoutError);
    }, remainingTimeoutMs);

    pendingDetections.set(requestId, { resolve, reject, timeoutId });

    try {
      worker.postMessage({ id: requestId, imageBitmap }, [imageBitmap]);
    } catch (error) {
      clearTimeout(timeoutId);
      pendingDetections.delete(requestId);
      imageBitmap.close();
      reject(error instanceof Error ? error : new Error('face_detector_message_failed'));
    }
  });
}
