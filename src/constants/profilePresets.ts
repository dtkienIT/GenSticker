import type {
  CharacterProfileConfig,
  FaceAccessoryPreset,
  HairColorPreset,
  HairStylePreset,
  OutfitPreset,
  ProductStylePreset,
} from '@/services/contracts';
import type { LocalizedProductCopy } from './emotionTemplates';

export interface PresetPresentationOption<TId extends string> {
  readonly id: TId;
  readonly label: LocalizedProductCopy;
  readonly description: LocalizedProductCopy;
  readonly icon: string;
  readonly swatch?: string;
}

export interface ProfilePresetPresentationConfig {
  readonly id: string;
  readonly version: string;
  readonly hairStyles: readonly PresetPresentationOption<HairStylePreset>[];
  readonly hairColors: readonly PresetPresentationOption<HairColorPreset>[];
  readonly faceAccessories: readonly PresetPresentationOption<FaceAccessoryPreset>[];
  readonly outfits: readonly PresetPresentationOption<OutfitPreset>[];
  readonly styles: readonly PresetPresentationOption<ProductStylePreset>[];
  readonly constraints: {
    readonly faceAccessories: {
      readonly minSelections: number;
      readonly maxSelections: number;
      readonly exclusiveIds: readonly FaceAccessoryPreset[];
    };
  };
}

export const PROFILE_PRESET_PRESENTATION_VERSION = '1.0.0';
export const PROFILE_PRESET_PRESENTATION_ID = 'character-profile-presets-v1';

export const PROFILE_PRESET_PRESENTATION = {
  id: PROFILE_PRESET_PRESENTATION_ID,
  version: PROFILE_PRESET_PRESENTATION_VERSION,
  hairStyles: [
    {
      id: 'original',
      label: { vi: 'Giữ nguyên', en: 'Original' },
      description: { vi: 'Giữ kiểu tóc từ ảnh đã chọn', en: 'Keep the selected photo hairstyle' },
      icon: 'person.crop.circle',
    },
    {
      id: 'short',
      label: { vi: 'Tóc ngắn', en: 'Short' },
      description: { vi: 'Gọn gàng và năng động', en: 'Neat and energetic' },
      icon: 'scissors',
    },
    {
      id: 'long',
      label: { vi: 'Tóc dài', en: 'Long' },
      description: { vi: 'Mái tóc dài tự nhiên', en: 'Naturally long hair' },
      icon: 'person.crop.circle',
    },
    {
      id: 'curly',
      label: { vi: 'Tóc xoăn', en: 'Curly' },
      description: { vi: 'Lọn tóc mềm và nổi bật', en: 'Soft, expressive curls' },
      icon: 'wind',
    },
    {
      id: 'bob',
      label: { vi: 'Tóc bob', en: 'Bob' },
      description: { vi: 'Kiểu bob hiện đại', en: 'Modern bob haircut' },
      icon: 'person.crop.square',
    },
  ],
  hairColors: [
    {
      id: 'original',
      label: { vi: 'Giữ nguyên', en: 'Original' },
      description: { vi: 'Giữ màu tóc từ ảnh', en: 'Keep the photo hair color' },
      icon: 'eyedropper',
    },
    {
      id: 'black',
      label: { vi: 'Đen', en: 'Black' },
      description: { vi: 'Màu đen tự nhiên', en: 'Natural black' },
      icon: 'circle.fill',
      swatch: '#1B1B1D',
    },
    {
      id: 'brown',
      label: { vi: 'Nâu', en: 'Brown' },
      description: { vi: 'Màu nâu ấm', en: 'Warm brown' },
      icon: 'circle.fill',
      swatch: '#70452D',
    },
    {
      id: 'blonde',
      label: { vi: 'Vàng', en: 'Blonde' },
      description: { vi: 'Màu vàng sáng', en: 'Bright blonde' },
      icon: 'circle.fill',
      swatch: '#E5BE6A',
    },
    {
      id: 'pastel',
      label: { vi: 'Pastel', en: 'Pastel' },
      description: { vi: 'Tông màu nhẹ nhàng', en: 'A soft pastel tone' },
      icon: 'circle.fill',
      swatch: '#D9A7D8',
    },
  ],
  faceAccessories: [
    {
      id: 'none',
      label: { vi: 'Không có', en: 'None' },
      description: { vi: 'Không thêm phụ kiện khuôn mặt', en: 'No face accessory' },
      icon: 'nosign',
    },
    {
      id: 'round_glasses',
      label: { vi: 'Kính tròn', en: 'Round glasses' },
      description: { vi: 'Gọng kính tròn thanh mảnh', en: 'Slim round frames' },
      icon: 'eyeglasses',
    },
    {
      id: 'square_glasses',
      label: { vi: 'Kính vuông', en: 'Square glasses' },
      description: { vi: 'Gọng kính vuông rõ nét', en: 'Defined square frames' },
      icon: 'eyeglasses',
    },
    {
      id: 'hair_clip',
      label: { vi: 'Kẹp tóc', en: 'Hair clip' },
      description: { vi: 'Một chiếc kẹp tóc nhỏ', en: 'A small hair clip' },
      icon: 'sparkles',
    },
  ],
  outfits: [
    {
      id: 'casual',
      label: { vi: 'Thường ngày', en: 'Casual' },
      description: { vi: 'Trang phục thoải mái', en: 'Relaxed everyday clothing' },
      icon: 'tshirt',
    },
    {
      id: 'hoodie',
      label: { vi: 'Áo hoodie', en: 'Hoodie' },
      description: { vi: 'Phong cách trẻ trung', en: 'A youthful hoodie look' },
      icon: 'tshirt.fill',
    },
    {
      id: 'office',
      label: { vi: 'Công sở', en: 'Office' },
      description: { vi: 'Chỉn chu và lịch sự', en: 'Polished and professional' },
      icon: 'briefcase',
    },
    {
      id: 'traditional',
      label: { vi: 'Truyền thống', en: 'Traditional' },
      description: { vi: 'Cảm hứng trang phục Việt', en: 'Vietnamese traditional inspiration' },
      icon: 'star',
    },
    {
      id: 'sport',
      label: { vi: 'Thể thao', en: 'Sport' },
      description: { vi: 'Khỏe khoắn và linh hoạt', en: 'Active and athletic' },
      icon: 'figure.run',
    },
  ],
  styles: [
    {
      id: 'chibi',
      label: { vi: 'Chibi mềm mại', en: 'Soft chibi' },
      description: { vi: 'Đáng yêu với đường nét tròn', en: 'Cute with rounded features' },
      icon: 'face.smiling',
    },
    {
      id: 'cartoon',
      label: { vi: 'Hoạt hình', en: 'Cartoon' },
      description: { vi: 'Màu sắc tươi và đường nét rõ', en: 'Bright color and crisp linework' },
      icon: 'paintpalette',
    },
    {
      id: 'three_d',
      label: { vi: '3D mềm', en: 'Soft 3D' },
      description: { vi: 'Khối 3D mềm mại và thân thiện', en: 'Soft, friendly 3D rendering' },
      icon: 'cube',
    },
    {
      id: 'meme',
      label: { vi: 'Vui nhộn', en: 'Playful' },
      description: { vi: 'Biểu cảm lớn và dí dỏm', en: 'Bold, humorous expressions' },
      icon: 'bubble.left.and.bubble.right',
    },
  ],
  constraints: {
    faceAccessories: {
      minSelections: 1,
      maxSelections: 2,
      exclusiveIds: ['none'],
    },
  },
} as const satisfies ProfilePresetPresentationConfig;

export const DEFAULT_CHARACTER_PROFILE_CONFIG: CharacterProfileConfig = {
  hair: {
    style: 'original',
    color: 'original',
  },
  faceAccessories: ['none'],
  outfit: 'casual',
  style: 'chibi',
};
