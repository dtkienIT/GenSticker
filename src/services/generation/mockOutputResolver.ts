import { Asset } from 'expo-asset';
import type { StylePresetId } from './types';
import { GenerationFailure } from './types';

const MOCK_FIXTURES: Record<StylePresetId, number> = {
  chibi: require('../../../assets/mock-stickers/chibi.png'),
  cartoon: require('../../../assets/mock-stickers/cartoon.png'),
  'three-d': require('../../../assets/mock-stickers/three-d.png'),
  meme: require('../../../assets/mock-stickers/meme.png'),
};

export async function resolveMockOutput(stylePresetId: StylePresetId): Promise<string> {
  const [asset] = await Asset.loadAsync(MOCK_FIXTURES[stylePresetId]);
  if (!asset.localUri) throw new GenerationFailure('ASSET_ENCODING_FAILED');
  return asset.localUri;
}
