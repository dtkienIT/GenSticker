import type { StickerStyle, StickerItem, ProcessStep } from '../types/sticker';

export const STICKER_STYLES: StickerStyle[] = [
  {
    id: '3d-chibi',
    name: '3D Chibi Cutie',
    description: 'Phong cách 3D nhân vật tròn trịa, mắt to ngây thơ, ánh sáng mềm mại',
    badge: 'HOT 🔥',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%238b5cf6"/><circle cx="35" cy="40" r="8" fill="white"/><circle cx="65" cy="40" r="8" fill="white"/><circle cx="35" cy="40" r="4" fill="%231e1b4b"/><circle cx="65" cy="40" r="4" fill="%231e1b4b"/><path d="M 35 65 Q 50 80 65 65" stroke="white" stroke-width="4" fill="none" stroke-linecap="round"/></svg>',
    popular: true,
  },
  {
    id: 'anime-kawaii',
    name: 'Anime Kawaii',
    description: 'Nét vẽ Manga Nhật Bản dễ thương, tông màu pastel ngọt ngào',
    badge: 'Popular ✨',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23ec4899"/><circle cx="35" cy="42" r="10" fill="white"/><circle cx="65" cy="42" r="10" fill="white"/><ellipse cx="50" cy="62" rx="8" ry="5" fill="%23be185d"/><circle cx="25" cy="52" r="6" fill="%23f472b6" opacity="0.6"/><circle cx="75" cy="52" r="6" fill="%23f472b6" opacity="0.6"/></svg>',
    popular: true,
  },
  {
    id: 'cyberpunk',
    name: 'Cyberpunk Neon',
    description: 'Phong cách tương lai với ánh đèn neon phát sáng và hiệu ứng hologram',
    badge: 'Cyber ⚡',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect x="5" y="5" width="90" height="90" rx="20" fill="%230f172a" stroke="%2306b6d4" stroke-width="4"/><polygon points="50,20 80,75 20,75" fill="none" stroke="%23ec4899" stroke-width="6"/><circle cx="50" cy="50" r="12" fill="%2306b6d4"/></svg>',
  },
  {
    id: 'pixel-art',
    name: 'Retro Pixel Art',
    description: 'Đồ họa Pixel 8-bit hoài cổ như game arcade huyền thoại',
    badge: '8-Bit 🎮',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><rect width="100" height="100" fill="%2310b981"/><rect x="20" y="20" width="20" height="20" fill="%23047857"/><rect x="60" y="20" width="20" height="20" fill="%23047857"/><rect x="30" y="60" width="40" height="20" fill="%23064e3b"/></svg>',
  },
  {
    id: 'doodle-cartoon',
    name: 'Doodle Cartoon',
    description: 'Nét vẽ tay nghịch ngợm, ngộ nghĩnh kèm phụ kiện vui nhộn',
    badge: 'Fun 🎨',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23f59e0b"/><path d="M 30 35 L 45 40 L 30 45 Z" fill="%2378350f"/><path d="M 70 35 L 55 40 L 70 45 Z" fill="%2378350f"/><path d="M 30 65 Q 50 85 70 65" stroke="%2378350f" stroke-width="6" fill="none"/></svg>',
  },
  {
    id: 'vector-flat',
    name: 'Modern Vector',
    description: 'Thiết kế phẳng tối giản, màu sắc tương phản nổi bật',
    badge: 'Clean 💎',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%233b82f6"/><rect x="25" y="30" width="50" height="10" rx="5" fill="white"/><rect x="25" y="50" width="30" height="10" rx="5" fill="white"/><circle cx="70" cy="55" r="8" fill="%23ef4444"/></svg>',
  },
  {
    id: 'neon-glow',
    name: 'Neon Sticker',
    description: 'Viền sáng phát quang lấp lánh như bảng hiệu dạ quang phố đêm',
    badge: 'Glow 🌟',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%231e1b4b" stroke="%23a855f7" stroke-width="5"/><circle cx="50" cy="50" r="30" fill="none" stroke="%2322d3ee" stroke-width="4"/></svg>',
  },
  {
    id: 'vintage-retro',
    name: 'Vintage Badge',
    description: 'Họa tiết đĩa than, màu film hoài cổ thập niên 90s',
    badge: 'Classic 📻',
    previewUrl: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="45" fill="%23d97706"/><circle cx="50" cy="50" r="35" fill="%2378350f"/><circle cx="50" cy="50" r="15" fill="%23fef3c7"/></svg>',
  }
];

export const INITIAL_PIPELINE_STEPS: ProcessStep[] = [
  {
    id: 'step-1',
    title: 'Phân Tách Nhân Vật & Xóa Nền AI',
    description: 'Segment-Anything Model đang tách chính xác nhân vật khỏi hậu cảnh',
    status: 'idle',
    progress: 0,
    estimatedTimeSec: 2,
  },
  {
    id: 'step-2',
    title: 'Trích Xuất Biểu Cảm & Dáng Đứng',
    description: 'AI đang phân tích các nét mặt chính (Mắt, Miệng, Lông mày, Khuôn diện)',
    status: 'idle',
    progress: 0,
    estimatedTimeSec: 3,
  },
  {
    id: 'step-3',
    title: 'Áp Dụng Phong Cách Nghệ Thuật',
    description: 'Khởi tạo khuông mẫu style vector & đổ bóng ánh sáng 3D',
    status: 'idle',
    progress: 0,
    estimatedTimeSec: 4,
  },
  {
    id: 'step-4',
    title: 'Sinh 20 Biểu Cảm Độc Đáo',
    description: 'Đang biến hóa 20 trạng thái cảm xúc (Vui, Buồn, Phẫn Nộ, Thả Tim, Ngủ...)',
    status: 'idle',
    progress: 0,
    estimatedTimeSec: 5,
  },
  {
    id: 'step-5',
    title: 'Tạo Viền Sticker & Tối Ưu HD',
    description: 'Phủ lớp viền trắng die-cut siêu sắc nét & đóng gói định dạng PNG 4K',
    status: 'idle',
    progress: 0,
    estimatedTimeSec: 2,
  }
];

const createStickerSvg = (
  bgColor: string, 
  faceSvg: string, 
  accessorySvg: string, 
  caption: string
): string => {
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="512" height="512">
    <defs>
      <filter id="white-stroke" x="-20%" y="-20%" width="140%" height="140%">
        <feMorphology in="SourceAlpha" operator="dilate" radius="6" result="expanded"/>
        <feFlood flood-color="white" result="white"/>
        <feComposite in="white" in2="expanded" operator="in" result="stroke"/>
        <feMerge>
          <feMergeNode in="stroke"/>
          <feMergeNode in="SourceGraphic"/>
        </feMerge>
      </filter>
      <linearGradient id="grad-${bgColor.replace('#','')}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgColor}" />
        <stop offset="100%" stop-color="#1e1b4b" />
      </linearGradient>
    </defs>
    <g filter="url(#white-stroke)">
      <circle cx="100" cy="85" r="65" fill="url(#grad-${bgColor.replace('#','')})" />
      ${faceSvg}
      ${accessorySvg}
      <rect x="25" y="152" width="150" height="34" rx="17" fill="%23ffffff" stroke="%23e2e8f0" stroke-width="3" />
      <text x="100" y="174" font-family="'Plus Jakarta Sans', sans-serif" font-weight="800" font-size="14" fill="%230f172a" text-anchor="middle">${caption}</text>
    </g>
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svgString)}`;
};

export const MOCK_20_STICKERS: StickerItem[] = [
  {
    id: 'st-01',
    title: 'Siêu Hảo Hạng',
    emotion: 'Happy & Proud',
    tags: ['Vui Vẻ', 'Like', 'No.1'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 342,
    sizeKb: 145,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#8b5cf6',
      `<circle cx="75" cy="85" r="9" fill="white"/><circle cx="125" cy="85" r="9" fill="white"/><circle cx="75" cy="85" r="5" fill="%230f172a"/><circle cx="125" cy="85" r="5" fill="%230f172a"/><path d="M 70 115 Q 100 140 130 115" stroke="white" stroke-width="6" fill="none" stroke-linecap="round"/>`,
      `<text x="100" y="45" font-size="30" text-anchor="middle">👑</text>`,
      'ĐỈNH CAO! 👍'
    )
  },
  {
    id: 'st-02',
    title: 'Thả Tim Ngập Tràn',
    emotion: 'Love & Affection',
    tags: ['Thả Tim', 'Yêu Thương', 'Cute'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 512,
    sizeKb: 152,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#ec4899',
      `<text x="70" y="95" font-size="28" text-anchor="middle">💖</text><text x="130" y="95" font-size="28" text-anchor="middle">💖</text><path d="M 80 120 Q 100 135 120 120" stroke="white" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      `<text x="100" y="50" font-size="26" text-anchor="middle">✨</text>`,
      'THẢ TIM ❤️'
    )
  },
  {
    id: 'st-03',
    title: 'Đang Suy Nghĩ',
    emotion: 'Thinking',
    tags: ['Suy Nghĩ', 'Hỏi Đáo', 'Confused'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 189,
    sizeKb: 138,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#06b6d4',
      `<circle cx="75" cy="85" r="7" fill="white"/><circle cx="125" cy="80" r="7" fill="white"/><circle cx="75" cy="85" r="4" fill="%230f172a"/><circle cx="125" cy="80" r="4" fill="%230f172a"/><path d="M 85 115 Q 105 115 125 120" stroke="white" stroke-width="5" fill="none" stroke-linecap="round"/>`,
      `<text x="150" y="55" font-size="36" text-anchor="middle">🤔</text>`,
      'ỦA BẠN ƠI?'
    )
  },
  {
    id: 'st-04',
    title: 'Cực Kỳ Phẫn Nộ',
    emotion: 'Angry',
    tags: ['Tức Giận', 'Nóng Máu', 'Fire'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 275,
    sizeKb: 160,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#ef4444',
      `<line x1="60" y1="70" x2="85" y2="80" stroke="white" stroke-width="5"/><line x1="140" y1="70" x2="115" y2="80" stroke="white" stroke-width="5"/><path d="M 75 125 Q 100 100 125 125" stroke="white" stroke-width="6" fill="none" stroke-linecap="round"/>`,
      `<text x="100" y="45" font-size="32" text-anchor="middle">🔥</text>`,
      'NÓNG MÁU! 😡'
    )
  },
  {
    id: 'st-05',
    title: 'Ngủ Ngon Lành',
    emotion: 'Sleeping & Chill',
    tags: ['Ngủ', 'Chill', 'Mệt'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 310,
    sizeKb: 140,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#6366f1',
      `<path d="M 65 90 Q 75 100 85 90" stroke="white" stroke-width="5" fill="none"/><path d="M 115 90 Q 125 100 135 90" stroke="white" stroke-width="5" fill="none"/><circle cx="100" cy="115" r="8" fill="white"/>`,
      `<text x="145" y="55" font-size="28" font-weight="bold" fill="%23a5b4fc">ZZZ...</text>`,
      'ĐI NGỦ ĐÂY 😴'
    )
  },
  {
    id: 'st-06',
    title: 'Cười Bể Bụng',
    emotion: 'LOL Laughing',
    tags: ['Cười', 'Hài Hước', 'LOL'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 440,
    sizeKb: 148,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#f59e0b',
      `<path d="M 60 80 Q 75 65 90 80" stroke="white" stroke-width="6" fill="none"/><path d="M 110 80 Q 125 65 140 80" stroke="white" stroke-width="6" fill="none"/><path d="M 70 105 Q 100 150 130 105 Z" fill="white"/>`,
      `<text x="150" y="55" font-size="26" text-anchor="middle">🤣</text>`,
      'CƯỜI XỈU 🤣'
    )
  },
  {
    id: 'st-07',
    title: 'Khóc Nổi Sông',
    emotion: 'Crying',
    tags: ['Khóc', 'Tội Nghiệp', 'Sad'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 215,
    sizeKb: 155,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#3b82f6',
      `<circle cx="75" cy="85" r="8" fill="white"/><circle cx="125" cy="85" r="8" fill="white"/><path d="M 70 95 Q 65 130 75 130" stroke="%2360a5fa" stroke-width="6" fill="none"/><path d="M 130 95 Q 135 130 125 130" stroke="%2360a5fa" stroke-width="6" fill="none"/><path d="M 80 120 Q 100 105 120 120" stroke="white" stroke-width="5" fill="none"/>`,
      `<text x="100" y="45" font-size="26" text-anchor="middle">💧</text>`,
      'HU HU HU 😭'
    )
  },
  {
    id: 'st-08',
    title: 'Ngầu Như Bồn Cầu',
    emotion: 'Cool Sunglasses',
    tags: ['Ngầu', 'Sunglasses', 'Boss'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 620,
    sizeKb: 165,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#10b981',
      `<rect x="55" y="70" width="40" height="25" rx="5" fill="%230f172a"/><rect x="105" y="70" width="40" height="25" rx="5" fill="%230f172a"/><line x1="95" y1="80" x2="105" y2="80" stroke="%230f172a" stroke-width="5"/><path d="M 75 115 Q 100 130 125 115" stroke="white" stroke-width="5" fill="none"/>`,
      `<text x="100" y="45" font-size="30" text-anchor="middle">😎</text>`,
      'QUÁ NGẦU 🕶️'
    )
  },
  {
    id: 'st-09',
    title: 'Chăm Chỉ Cày Code',
    emotion: 'Working Hard',
    tags: ['Work', 'Laptop', 'Deadline'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 480,
    sizeKb: 158,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#8b5cf6',
      `<circle cx="75" cy="75" r="6" fill="white"/><circle cx="125" cy="75" r="6" fill="white"/><rect x="65" y="105" width="70" height="35" rx="4" fill="%23475569"/><polygon points="55,140 145,140 135,145 65,145" fill="%23334155"/>`,
      `<text x="100" y="45" font-size="26" text-anchor="middle">💻</text>`,
      'CẠY DEADLINE 💻'
    )
  },
  {
    id: 'st-10',
    title: 'Xin Lỗi Được Chưa',
    emotion: 'Apologetic',
    tags: ['Xin Lỗi', 'Sorry', 'Bow'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 290,
    sizeKb: 142,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#f43f5e',
      `<circle cx="75" cy="90" r="7" fill="white"/><circle cx="125" cy="90" r="7" fill="white"/><ellipse cx="100" cy="115" rx="6" ry="10" fill="white"/><line x1="50" y1="75" x2="65" y2="80" stroke="white" stroke-width="4"/><line x1="150" y1="75" x2="135" y2="80" stroke="white" stroke-width="4"/>`,
      `<text x="100" y="45" font-size="28" text-anchor="middle">🙏</text>`,
      'XIN LỖI NHA 🥺'
    )
  },
  {
    id: 'st-11',
    title: 'Bất Ngờ Chưa',
    emotion: 'Shocked',
    tags: ['Bất Ngờ', 'OMG', 'Shock'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 388,
    sizeKb: 146,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#0284c7',
      `<circle cx="70" cy="80" r="12" fill="white"/><circle cx="130" cy="80" r="12" fill="white"/><circle cx="70" cy="80" r="5" fill="%230f172a"/><circle cx="130" cy="80" r="5" fill="%230f172a"/><circle cx="100" cy="120" r="14" fill="white"/>`,
      `<text x="100" y="45" font-size="28" text-anchor="middle">⚡</text>`,
      'HẢ??? 😲'
    )
  },
  {
    id: 'st-12',
    title: 'Ting Ting Tiền Về',
    emotion: 'Money Rich',
    tags: ['Tiền', 'Rich', 'Shopping'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 710,
    sizeKb: 168,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#10b981',
      `<text x="75" y="90" font-size="24" text-anchor="middle">💲</text><text x="125" y="90" font-size="24" text-anchor="middle">💲</text><path d="M 75 115 Q 100 135 125 115" stroke="white" stroke-width="6" fill="none"/>`,
      `<text x="100" y="45" font-size="30" text-anchor="middle">💸</text>`,
      'TING TING 💸'
    )
  },
  {
    id: 'st-13',
    title: 'Ăn Uống Thả Ga',
    emotion: 'Eating Foodie',
    tags: ['Ăn Uống', 'Yummy', 'Boba'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 430,
    sizeKb: 150,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#f97316',
      `<circle cx="75" cy="80" r="7" fill="white"/><circle cx="125" cy="80" r="7" fill="white"/><path d="M 85 105 Q 100 125 115 105 Z" fill="white"/><text x="100" y="145" font-size="32" text-anchor="middle">🧋</text>`,
      `<text x="100" y="45" font-size="26" text-anchor="middle">🍕</text>`,
      'NGON QUÁ 🧋'
    )
  },
  {
    id: 'st-14',
    title: 'OK Nhanh Gọn',
    emotion: 'OK Gesture',
    tags: ['OK', 'Chốt', 'Agree'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 395,
    sizeKb: 144,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#14b8a6',
      `<circle cx="75" cy="85" r="7" fill="white"/><circle cx="125" cy="85" r="7" fill="white"/><path d="M 80 115 Q 100 130 120 115" stroke="white" stroke-width="5" fill="none"/>`,
      `<text x="100" y="45" font-size="32" text-anchor="middle">👌</text>`,
      'CHỐT DEAL! 👌'
    )
  },
  {
    id: 'st-15',
    title: 'Bí Ẩn Trốn Tìm',
    emotion: 'Sneaky Ninjia',
    tags: ['Bí Ẩn', 'Ninja', 'Hide'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 260,
    sizeKb: 139,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#64748b',
      `<rect x="50" y="70" width="100" height="20" fill="%230f172a"/><circle cx="75" cy="80" r="5" fill="white"/><circle cx="125" cy="80" r="5" fill="white"/>`,
      `<text x="100" y="45" font-size="28" text-anchor="middle">🥷</text>`,
      'TRỐN THỜI 🥷'
    )
  },
  {
    id: 'st-16',
    title: 'Tiệc Tùng Quẩy Lên',
    emotion: 'Party Celebrate',
    tags: ['Quẩy', 'Party', 'Dance'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 530,
    sizeKb: 162,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#a855f7',
      `<path d="M 65 75 Q 80 60 95 75" stroke="white" stroke-width="5" fill="none"/><path d="M 105 75 Q 120 60 135 75" stroke="white" stroke-width="5" fill="none"/><path d="M 75 110 Q 100 140 125 110 Z" fill="white"/>`,
      `<text x="100" y="40" font-size="32" text-anchor="middle">🎉</text>`,
      'QUẨY LÊN! 🥳'
    )
  },
  {
    id: 'st-17',
    title: 'Bị Ốm Rồi',
    emotion: 'Sick Fever',
    tags: ['Ốm', 'Mệt', 'Fever'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 195,
    sizeKb: 141,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#64748b',
      `<circle cx="75" cy="85" r="6" fill="white"/><circle cx="125" cy="85" r="6" fill="white"/><rect x="85" y="110" width="30" height="8" rx="3" fill="white"/><rect x="70" y="55" width="60" height="15" fill="%2338bdf8"/>`,
      `<text x="100" y="40" font-size="28" text-anchor="middle">🤒</text>`,
      'BỊ ỐM RỒI 🤒'
    )
  },
  {
    id: 'st-18',
    title: 'Chúc Mừng Sinh Nhật',
    emotion: 'Birthday Cake',
    tags: ['Sinh Nhật', 'Birthday', 'Gift'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 670,
    sizeKb: 170,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#ec4899',
      `<circle cx="75" cy="75" r="7" fill="white"/><circle cx="125" cy="75" r="7" fill="white"/><path d="M 80 100 Q 100 115 120 100" stroke="white" stroke-width="5" fill="none"/>`,
      `<text x="100" y="45" font-size="34" text-anchor="middle">🎂</text>`,
      'HAPPY BIRTHDAY 🎂'
    )
  },
  {
    id: 'st-19',
    title: 'Cổ Vũ Cố Lên',
    emotion: 'Cheer Fight',
    tags: ['Cố Lên', 'Fight', 'Power'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 490,
    sizeKb: 153,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#eab308',
      `<circle cx="75" cy="80" r="7" fill="white"/><circle cx="125" cy="80" r="7" fill="white"/><path d="M 75 110 Q 100 135 125 110" stroke="white" stroke-width="6" fill="none"/>`,
      `<text x="100" y="45" font-size="32" text-anchor="middle">💪</text>`,
      'CỐ LÊN! 💪'
    )
  },
  {
    id: 'st-20',
    title: 'Tạm Biệt Hẹn Gặp Lại',
    emotion: 'Goodbye Wave',
    tags: ['Tạm Biệt', 'Bye', 'Wave'],
    style: '3d-chibi',
    styleName: '3D Chibi Cutie',
    likes: 380,
    sizeKb: 147,
    dimensions: '1024 x 1024',
    imageUrl: createStickerSvg(
      '#6366f1',
      `<circle cx="75" cy="85" r="7" fill="white"/><circle cx="125" cy="85" r="7" fill="white"/><path d="M 80 115 Q 100 130 120 115" stroke="white" stroke-width="5" fill="none"/>`,
      `<text x="100" y="45" font-size="32" text-anchor="middle">👋</text>`,
      'BYE BYE 👋'
    )
  }
];
