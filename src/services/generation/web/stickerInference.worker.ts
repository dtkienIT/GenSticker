/// <reference lib="webworker" />

import type * as OrtRuntime from 'onnxruntime-web/webgpu';
import { ClipTokenizer } from './clipTokenizer';
import { applyMaskAlpha, normalizeMask, preprocessU2Net, resizeMask } from './imagePipeline';
import {
  decodedRgba,
  float16ToFloat32,
  float32ToFloat16,
  guidedNoise,
  JavaRandom,
  lcmStep,
  lcmTimesteps,
  seededLatentsGaussian,
} from './lcmMath';
import type { WorkerRequest, WorkerResponse } from './workerProtocol';

const WIDTH = 512;
const HEIGHT = 512;
const STEPS = 4;
const GUIDANCE = 1.5;
const LATENT_SIZE = 4 * 64 * 64;
const LATENT_SCALE = 0.18215;
const NEGATIVE_PROMPT = 'photorealistic, text, watermark, gore, explicit content';
const POSITIVE_SUFFIX = 'chibi sticker, bold clean outline, centered subject';

const scope = self as DedicatedWorkerGlobalScope;
let tokenizer: ClipTokenizer | null = null;
let ort: typeof OrtRuntime | null = null;
let textEncoder: OrtRuntime.InferenceSession | null = null;
let unet: OrtRuntime.InferenceSession | null = null;
let vaeDecoder: OrtRuntime.InferenceSession | null = null;
let segmentation: OrtRuntime.InferenceSession | null = null;

function send(message: WorkerResponse, transfer: Transferable[] = []): void {
  scope.postMessage(message, transfer);
}

function runtime(): typeof OrtRuntime {
  if (!ort) throw new Error('ONNX Runtime is not loaded');
  return ort;
}

async function loadRuntime(): Promise<typeof OrtRuntime> {
  if (ort) return ort;
  const runtimeUrl = '/ort/ort.webgpu.min.mjs';
  ort = (await import(/* @metro-ignore */ runtimeUrl)) as typeof OrtRuntime;
  ort.env.wasm.wasmPaths = '/ort/';
  ort.env.wasm.proxy = false;
  return ort;
}

function fp16Tensor(values: Float32Array, dims: readonly number[]): OrtRuntime.Tensor {
  return new (runtime().Tensor)(
    'float16',
    Uint16Array.from(values, (value) => float32ToFloat16(value)),
    [...dims],
  );
}

function tensorToFloat32(tensor: OrtRuntime.Tensor): Float32Array {
  if (tensor.type === 'float32') {
    return new Float32Array(tensor.data as Float32Array);
  }
  if (tensor.type === 'float16') {
    return Float32Array.from(tensor.data as Uint16Array, (value) => float16ToFloat32(value));
  }
  throw new Error(`Unsupported tensor output type: ${tensor.type}`);
}

async function createSession(url: string): Promise<OrtRuntime.InferenceSession> {
  return runtime().InferenceSession.create(url, {
    executionProviders: ['webgpu'],
    graphOptimizationLevel: 'all',
  });
}

async function prepare(message: Extract<WorkerRequest, { type: 'prepare' }>): Promise<void> {
  try {
    await loadRuntime();
    const tokenizerResponse = await fetch(message.files.tokenizerUrl);
    if (!tokenizerResponse.ok) throw new Error('Tokenizer request failed');
    tokenizer = ClipTokenizer.fromJson(await tokenizerResponse.text());
    textEncoder = await createSession(message.files.textEncoderUrl);
    unet = await createSession(message.files.unetUrl);
    vaeDecoder = await createSession(message.files.vaeDecoderUrl);
    segmentation = await createSession(message.files.segmentationUrl);
    send({ type: 'ready', requestId: message.requestId });
  } catch (error) {
    send({
      type: 'failure',
      requestId: message.requestId,
      code: 'RUNTIME_UNAVAILABLE',
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

async function encodeText(prompt: string): Promise<OrtRuntime.Tensor> {
  if (!tokenizer || !textEncoder) throw new Error('Text encoder is not prepared');
  const ids = [
    ...tokenizer.encode(NEGATIVE_PROMPT),
    ...tokenizer.encode(`${prompt}, ${POSITIVE_SUFFIX}`),
  ];
  const result = await textEncoder.run({
    input_ids: new (runtime().Tensor)('int64', BigInt64Array.from(ids), [2, 77]),
  });
  const output = result[textEncoder.outputNames[0]];
  if (!output) throw new Error('Text encoder returned no hidden state');
  return output;
}

async function denoise(
  hiddenStates: OrtRuntime.Tensor,
  seed: number,
  progress: (stageProgress: number) => void,
): Promise<Float32Array> {
  if (!unet) throw new Error('UNet is not prepared');
  let latents = seededLatentsGaussian(seed, LATENT_SIZE);
  const noiseRandom = new JavaRandom(BigInt(seed) ^ 0x4c434dn);
  const timesteps = lcmTimesteps(STEPS);

  for (let step = 0; step < STEPS; step += 1) {
    const batchedLatents = Float32Array.from(
      { length: LATENT_SIZE * 2 },
      (_, index) => latents[index % LATENT_SIZE],
    );
    const result = await unet.run({
      sample: fp16Tensor(batchedLatents, [2, 4, 64, 64]),
      timestep: new (runtime().Tensor)('float32', new Float32Array([timesteps[step]]), [1]),
      encoder_hidden_states: hiddenStates,
    });
    const output = result[unet.outputNames[0]];
    if (!output) throw new Error(`UNet step ${step} returned no output`);
    const guided = guidedNoise(tensorToFloat32(output), LATENT_SIZE, GUIDANCE);
    const noise = Float32Array.from({ length: LATENT_SIZE }, () => noiseRandom.nextGaussian());
    latents = Float32Array.from({ length: LATENT_SIZE }, (_, index) =>
      lcmStep(latents[index], guided[index], noise[index], step),
    );
    progress((step + 1) / STEPS);
  }
  return latents;
}

async function decode(latents: Float32Array): Promise<Uint8ClampedArray> {
  if (!vaeDecoder) throw new Error('VAE decoder is not prepared');
  const scaled = Float32Array.from(latents, (value) => value / LATENT_SCALE);
  const result = await vaeDecoder.run({
    latent_sample: fp16Tensor(scaled, [1, 4, 64, 64]),
  });
  const output = result[vaeDecoder.outputNames[0]];
  if (!output) throw new Error('VAE decoder returned no image');
  return decodedRgba(tensorToFloat32(output), WIDTH, HEIGHT);
}

async function removeBackground(rgba: Uint8ClampedArray): Promise<Uint8ClampedArray> {
  if (!segmentation) throw new Error('Segmentation model is not prepared');
  const input = preprocessU2Net(rgba, WIDTH, HEIGHT);
  const result = await segmentation.run({
    [segmentation.inputNames[0]]: new (runtime().Tensor)('float32', input.data, input.dims),
  });
  const output = result[segmentation.outputNames[0]];
  if (!output) throw new Error('Segmentation model returned no mask');
  const normalized = normalizeMask(tensorToFloat32(output));
  const sourceHeight = output.dims.at(-2) ?? 320;
  const sourceWidth = output.dims.at(-1) ?? 320;
  const mask = resizeMask(normalized, sourceWidth, sourceHeight, WIDTH, HEIGHT);
  return applyMaskAlpha(rgba, mask);
}

async function encodePng(rgba: Uint8ClampedArray): Promise<ArrayBuffer> {
  if (typeof OffscreenCanvas === 'undefined') {
    throw new Error('OffscreenCanvas PNG encoding is unavailable');
  }
  const canvas = new OffscreenCanvas(WIDTH, HEIGHT);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas context is unavailable');
  const pixels = new Uint8ClampedArray(new ArrayBuffer(rgba.byteLength));
  pixels.set(rgba);
  context.putImageData(new ImageData(pixels, WIDTH, HEIGHT), 0, 0);
  return (await canvas.convertToBlob({ type: 'image/png' })).arrayBuffer();
}

async function generate(message: Extract<WorkerRequest, { type: 'generate' }>): Promise<void> {
  const { request } = message;
  const startedAt = performance.now();
  let sequence = 0;
  const progress = (
    stage: Extract<WorkerResponse, { type: 'progress' }>['stage'],
    stageProgress: number,
  ) => {
    sequence += 1;
    send({
      type: 'progress',
      requestId: request.requestId,
      sequence,
      stage,
      stageProgress,
      elapsedMs: Math.round(performance.now() - startedAt),
    });
  };

  try {
    progress('validating', 1);
    progress('preparing_model', 1);
    const hiddenStates = await encodeText(request.prompt);
    const latents = await denoise(hiddenStates, request.seed, (value) =>
      progress('generating', value),
    );
    const rgba = await decode(latents);
    progress('removing_background', 0);
    const transparent = await removeBackground(rgba);
    progress('removing_background', 1);
    progress('encoding', 0);
    const pngBytes = await encodePng(transparent);
    progress('encoding', 1);
    progress('completed', 1);
    send(
      {
        type: 'result',
        requestId: request.requestId,
        pngBytes,
        width: WIDTH,
        height: HEIGHT,
      },
      [pngBytes],
    );
  } catch (error) {
    const code =
      sequence > STEPS + 2
        ? sequence > STEPS + 4
          ? 'ASSET_ENCODING_FAILED'
          : 'SEGMENTATION_FAILED'
        : 'INFERENCE_FAILED';
    send({
      type: 'failure',
      requestId: request.requestId,
      code,
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

scope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const message = event.data;
  void (message.type === 'prepare' ? prepare(message) : generate(message));
};
