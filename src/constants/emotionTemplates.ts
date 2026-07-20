export const EMOTION_IDS = [
  'happy',
  'laughing',
  'love',
  'angry',
  'sad',
  'surprised',
  'confused',
  'sleepy',
] as const;

export type EmotionId = (typeof EMOTION_IDS)[number];

export interface LocalizedProductCopy {
  readonly vi: string;
  readonly en: string;
}

export interface EmotionPreset {
  readonly id: EmotionId;
  readonly label: LocalizedProductCopy;
  readonly accessibilityLabel: LocalizedProductCopy;
  readonly emoji: string;
  readonly expressionPresetId: string;
  readonly posePresetId: string;
  readonly promptPresetId: string;
}

export interface EmotionTemplate {
  readonly id: string;
  readonly version: string;
  readonly label: LocalizedProductCopy;
  readonly emotions: readonly EmotionPreset[];
}

export const EMOTION_TEMPLATE_VERSION = '1.0.0';
export const DEFAULT_EMOTION_TEMPLATE_ID = 'core-eight-v1';

/**
 * Product-level emotion configuration only. Provider prompts and model controls
 * are resolved behind the product-service boundary.
 */
export const DEFAULT_EMOTION_TEMPLATE = {
  id: DEFAULT_EMOTION_TEMPLATE_ID,
  version: EMOTION_TEMPLATE_VERSION,
  label: { vi: 'Bộ cảm xúc cơ bản', en: 'Core emotions' },
  emotions: [
    {
      id: 'happy',
      label: { vi: 'Vui vẻ', en: 'Happy' },
      accessibilityLabel: { vi: 'Nhãn dán vui vẻ', en: 'Happy sticker' },
      emoji: '😊',
      expressionPresetId: 'expression-happy-v1',
      posePresetId: 'pose-open-friendly-v1',
      promptPresetId: 'emotion-happy-v1',
    },
    {
      id: 'laughing',
      label: { vi: 'Cười lớn', en: 'Laughing' },
      accessibilityLabel: { vi: 'Nhãn dán cười lớn', en: 'Laughing sticker' },
      emoji: '😂',
      expressionPresetId: 'expression-laughing-v1',
      posePresetId: 'pose-lively-v1',
      promptPresetId: 'emotion-laughing-v1',
    },
    {
      id: 'love',
      label: { vi: 'Yêu thích', en: 'Love' },
      accessibilityLabel: { vi: 'Nhãn dán yêu thích', en: 'Love sticker' },
      emoji: '😍',
      expressionPresetId: 'expression-love-v1',
      posePresetId: 'pose-heart-v1',
      promptPresetId: 'emotion-love-v1',
    },
    {
      id: 'angry',
      label: { vi: 'Tức giận', en: 'Angry' },
      accessibilityLabel: { vi: 'Nhãn dán tức giận', en: 'Angry sticker' },
      emoji: '😠',
      expressionPresetId: 'expression-angry-v1',
      posePresetId: 'pose-crossed-arms-v1',
      promptPresetId: 'emotion-angry-v1',
    },
    {
      id: 'sad',
      label: { vi: 'Buồn', en: 'Sad' },
      accessibilityLabel: { vi: 'Nhãn dán buồn', en: 'Sad sticker' },
      emoji: '😢',
      expressionPresetId: 'expression-sad-v1',
      posePresetId: 'pose-drooped-v1',
      promptPresetId: 'emotion-sad-v1',
    },
    {
      id: 'surprised',
      label: { vi: 'Ngạc nhiên', en: 'Surprised' },
      accessibilityLabel: { vi: 'Nhãn dán ngạc nhiên', en: 'Surprised sticker' },
      emoji: '😮',
      expressionPresetId: 'expression-surprised-v1',
      posePresetId: 'pose-hands-up-v1',
      promptPresetId: 'emotion-surprised-v1',
    },
    {
      id: 'confused',
      label: { vi: 'Bối rối', en: 'Confused' },
      accessibilityLabel: { vi: 'Nhãn dán bối rối', en: 'Confused sticker' },
      emoji: '🤔',
      expressionPresetId: 'expression-confused-v1',
      posePresetId: 'pose-thinking-v1',
      promptPresetId: 'emotion-confused-v1',
    },
    {
      id: 'sleepy',
      label: { vi: 'Buồn ngủ', en: 'Sleepy' },
      accessibilityLabel: { vi: 'Nhãn dán buồn ngủ', en: 'Sleepy sticker' },
      emoji: '😴',
      expressionPresetId: 'expression-sleepy-v1',
      posePresetId: 'pose-resting-v1',
      promptPresetId: 'emotion-sleepy-v1',
    },
  ],
} as const satisfies EmotionTemplate;

export const EMOTION_TEMPLATES = [DEFAULT_EMOTION_TEMPLATE] as const;

export function getEmotionTemplate(templateId: string): EmotionTemplate | undefined {
  return EMOTION_TEMPLATES.find((template) => template.id === templateId);
}
