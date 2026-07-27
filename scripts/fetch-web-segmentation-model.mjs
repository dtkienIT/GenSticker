import { createHash } from 'node:crypto';
import { createReadStream, createWriteStream, existsSync } from 'node:fs';
import { mkdir, rename, rm, stat } from 'node:fs/promises';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { Readable } from 'node:stream';

const sourceUrl = 'https://github.com/danielgatis/rembg/releases/download/v0.0.0/u2netp.onnx';
const expectedSha256 = '309c8469258dda742793dce0ebea8e6dd393174f89934733ecc8b14c76f4ddd8';
const destination = path.resolve(
  process.env.GENSTICKER_MODEL_ROOT ?? 'model_artifacts/model-lcm-sd15-v1.0.1',
  'segmentation/u2netp.onnx',
);
const temporary = `${destination}.download`;

async function digest(filePath) {
  const hash = createHash('sha256');
  await pipeline(createReadStream(filePath), hash);
  return hash.digest('hex');
}

if (existsSync(destination) && (await digest(destination)) === expectedSha256) {
  console.log(`Verified existing segmentation model: ${destination}`);
  process.exit(0);
}

await mkdir(path.dirname(destination), { recursive: true });
await rm(temporary, { force: true });
const response = await fetch(sourceUrl, { redirect: 'follow' });
if (!response.ok || !response.body) {
  throw new Error(`Segmentation download failed: ${response.status}`);
}
await pipeline(Readable.fromWeb(response.body), createWriteStream(temporary, { flags: 'wx' }));

const actualSha256 = await digest(temporary);
if (actualSha256 !== expectedSha256) {
  await rm(temporary, { force: true });
  throw new Error(
    `Segmentation checksum mismatch: expected ${expectedSha256}, received ${actualSha256}`,
  );
}
const fileStats = await stat(temporary);
if (fileStats.size !== 4_574_861) {
  await rm(temporary, { force: true });
  throw new Error(`Unexpected segmentation byte length: ${fileStats.size}`);
}
await rm(destination, { force: true });
await rename(temporary, destination);
console.log(`Installed verified segmentation model: ${destination}`);
