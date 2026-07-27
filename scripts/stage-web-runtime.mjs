import { copyFile, mkdir, readdir } from 'node:fs/promises';
import path from 'node:path';

const sourceDirectory = path.resolve('node_modules/onnxruntime-web/dist');
const destinationDirectory = path.resolve('public/ort');
const files = (await readdir(sourceDirectory)).filter(
  (name) =>
    (name.startsWith('ort-wasm-') && (name.endsWith('.wasm') || name.endsWith('.mjs'))) ||
    name === 'ort.webgpu.min.mjs',
);

if (files.length === 0) {
  throw new Error(`No ONNX Runtime web assets found under ${sourceDirectory}`);
}

await mkdir(destinationDirectory, { recursive: true });
await Promise.all(
  files.map((name) =>
    copyFile(path.join(sourceDirectory, name), path.join(destinationDirectory, name)),
  ),
);
console.log(`Staged ${files.length} ONNX Runtime web assets in ${destinationDirectory}`);
