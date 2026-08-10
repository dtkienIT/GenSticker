import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const sharp = require("sharp");


const BUILD_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(BUILD_DIR, "..");
const FIGURE_DIR = process.env.GENSTICKER_FIGURE_DIR
  ? path.resolve(process.env.GENSTICKER_FIGURE_DIR)
  : path.join(ROOT, "assets", "figures");
const SVG_DIR = path.join(FIGURE_DIR, "svg");
const PNG_DIR = path.join(FIGURE_DIR, "png");
const W = 1600;
const H = 900;

const TONES = {
  client: { fill: "#ECFEFF", stroke: "#0891B2", text: "#164E63" },
  frontend: { fill: "#EEF2FF", stroke: "#5B3DF5", text: "#312E81" },
  backend: { fill: "#FDF2F8", stroke: "#DB2777", text: "#831843" },
  data: { fill: "#ECFDF5", stroke: "#059669", text: "#065F46" },
  external: { fill: "#FFF7ED", stroke: "#EA580C", text: "#7C2D12" },
  quality: { fill: "#F0FDFA", stroke: "#0D9488", text: "#134E4A" },
  risk: { fill: "#FEF2F2", stroke: "#DC2626", text: "#7F1D1D" },
  neutral: { fill: "#F8FAFC", stroke: "#64748B", text: "#0F172A" },
  ink: { fill: "#0F172A", stroke: "#0F172A", text: "#FFFFFF" },
};

const esc = (value) => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;");

const normalizeSvg = (value) => `${value.replace(/[ \t]+$/gm, "").trim()}\n`;

function textLines(x, y, lines, { size = 22, color = "#334155", weight = 500, anchor = "start", gap = 29 } = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}">${lines.map((line, index) => `<tspan x="${x}" dy="${index === 0 ? 0 : gap}">${esc(line)}</tspan>`).join("")}</text>`;
}

function label(x, y, value, { size = 20, color = "#475569", weight = 600, anchor = "start" } = {}) {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}" font-family="Arial, sans-serif" font-size="${size}" font-weight="${weight}">${esc(value)}</text>`;
}

function node(x, y, w, h, title, lines = [], tone = "neutral", options = {}) {
  const palette = TONES[tone];
  const dashed = options.dashed ? ' stroke-dasharray="10 8"' : "";
  const titleSize = options.titleSize ?? 27;
  const lineSize = options.lineSize ?? 20;
  const tag = options.tag
    ? `<rect x="${x + 18}" y="${y + 16}" width="${Math.max(58, options.tag.length * 13 + 24)}" height="30" rx="15" fill="${palette.stroke}"/><text x="${x + 31}" y="${y + 38}" fill="#FFFFFF" font-family="Arial, sans-serif" font-size="16" font-weight="700">${esc(options.tag)}</text>`
    : "";
  const titleY = y + (options.tag ? 79 : 43);
  const bodyGap = lineSize + 9;
  const defaultBodyY = titleY + 38;
  const fittedBodyY = y + h - 10 - Math.max(0, lines.length - 1) * bodyGap;
  const bodyY = Math.min(defaultBodyY, fittedBodyY);
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="24" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="3"${dashed}/>
    ${tag}
    ${label(x + 22, titleY, title, { size: titleSize, color: palette.text, weight: 800 })}
    ${textLines(x + 22, bodyY, lines, { size: lineSize, color: palette.text, weight: 500, gap: bodyGap })}
  </g>`;
}

function entity(x, y, w, title, fields, tone = "data", tag = "I/F") {
  const palette = TONES[tone];
  const rowH = 31;
  const h = 82 + fields.length * rowH;
  return `<g>
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18" fill="#FFFFFF" stroke="${palette.stroke}" stroke-width="3"/>
    <rect x="${x}" y="${y}" width="${w}" height="62" rx="18" fill="${palette.fill}"/>
    <rect x="${x}" y="${y + 44}" width="${w}" height="18" fill="${palette.fill}"/>
    ${label(x + 20, y + 39, title, { size: 26, color: palette.text, weight: 800 })}
    <rect x="${x + w - 66}" y="${y + 17}" width="46" height="28" rx="14" fill="${palette.stroke}"/>
    ${label(x + w - 43, y + 37, tag, { size: 15, color: "#FFFFFF", weight: 800, anchor: "middle" })}
    ${fields.map((field, index) => `${index > 0 ? `<line x1="${x + 16}" y1="${y + 71 + index * rowH}" x2="${x + w - 16}" y2="${y + 71 + index * rowH}" stroke="#E2E8F0"/>` : ""}${label(x + 20, y + 91 + index * rowH, field, { size: 18, color: "#334155", weight: index < 2 ? 700 : 500 })}`).join("")}
  </g>`;
}

function lane(x, y, w, h, title, tone = "neutral", dashed = false) {
  const palette = TONES[tone];
  return `<g><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="26" fill="${palette.fill}" fill-opacity="0.55" stroke="${palette.stroke}" stroke-width="2" ${dashed ? 'stroke-dasharray="12 9"' : ""}/>${label(x + 24, y + 37, title, { size: 21, color: palette.text, weight: 800 })}</g>`;
}

function arrow(x1, y1, x2, y2, value = "", tone = "neutral", options = {}) {
  const palette = TONES[tone];
  const marker = `arrow-${options.prefix ?? "base"}-${tone}`;
  const dash = options.dashed ? ' stroke-dasharray="10 8"' : "";
  const bend = options.bend;
  const d = bend
    ? `M ${x1} ${y1} L ${bend[0]} ${bend[1]} L ${bend[2]} ${bend[3]} L ${x2} ${y2}`
    : `M ${x1} ${y1} L ${x2} ${y2}`;
  const tx = options.labelX ?? (x1 + x2) / 2;
  const ty = options.labelY ?? ((y1 + y2) / 2 - 12);
  return `<g><path d="${d}" fill="none" stroke="${palette.stroke}" stroke-width="4" marker-end="url(#${marker})"${dash}/>${value ? `<rect x="${tx - Math.max(55, value.length * 6.8)}" y="${ty - 22}" width="${Math.max(110, value.length * 13.6)}" height="32" rx="16" fill="#FFFFFF" opacity="0.96"/>${label(tx, ty, value, { size: 16, color: palette.text, weight: 700, anchor: "middle" })}` : ""}</g>`;
}

function step(x, y, w, index, title, detail, tone = "frontend", options = {}) {
  const palette = TONES[tone];
  const titleSize = options.titleSize ?? 23;
  const detailSize = options.detailSize ?? 17;
  return `<g><rect x="${x}" y="${y}" width="${w}" height="120" rx="22" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="3"/><circle cx="${x + 42}" cy="${y + 38}" r="24" fill="${palette.stroke}"/>${label(x + 42, y + 46, index, { size: 19, color: "#FFFFFF", weight: 800, anchor: "middle" })}${label(x + 78, y + 43, title, { size: titleSize, color: palette.text, weight: 800 })}${textLines(x + 24, y + 81, detail, { size: detailSize, color: palette.text, weight: 500, gap: detailSize + 6 })}</g>`;
}

function legend(items, y = 846) {
  let x = 60;
  return `<g>${items.map(([tone, value, dashed = false]) => {
    const palette = TONES[tone];
    const width = Math.max(150, value.length * 11 + 62);
    const result = `<rect x="${x}" y="${y - 24}" width="28" height="28" rx="8" fill="${palette.fill}" stroke="${palette.stroke}" stroke-width="2" ${dashed ? 'stroke-dasharray="5 4"' : ""}/>${label(x + 40, y - 3, value, { size: 17, color: "#475569", weight: 600 })}`;
    x += width;
    return result;
  }).join("")}</g>`;
}

function defs(prefix) {
  return `<defs>
    <filter id="shadow-${prefix}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#0F172A" flood-opacity="0.10"/></filter>
    ${Object.entries(TONES).map(([name, palette]) => `<marker id="arrow-${prefix}-${name}" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${palette.stroke}"/></marker>`).join("")}
  </defs>`;
}

function figureInner(figure, prefix = figure.id) {
  return `${defs(prefix)}
  <rect width="${W}" height="${H}" rx="36" fill="#FFFFFF"/>
  <rect x="0" y="0" width="${W}" height="112" rx="36" fill="#0F172A"/>
  <rect x="0" y="76" width="${W}" height="36" fill="#0F172A"/>
  <circle cx="62" cy="55" r="22" fill="#5B3DF5"/>
  ${label(62, 63, figure.number, { size: 20, color: "#FFFFFF", weight: 800, anchor: "middle" })}
  ${label(102, 50, figure.title, { size: 34, color: "#FFFFFF", weight: 800 })}
  ${label(103, 82, figure.subtitle, { size: 18, color: "#CBD5E1", weight: 500 })}
  <g filter="url(#shadow-${prefix})">${figure.body(prefix)}</g>
  ${legend(figure.legend ?? [["frontend", "Đã triển khai"], ["neutral", "Suy ra từ source"], ["risk", "Gap / rủi ro"], ["quality", "Khuyến nghị"]])}`;
}

function figureShell(figure, prefix = figure.id) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${figureInner(figure, prefix)}
</svg>`;
}

function figmaBoard() {
  const columns = 2;
  const gap = 120;
  const margin = 120;
  const rows = Math.ceil(figures.length / columns);
  const boardWidth = margin * 2 + columns * W + (columns - 1) * gap;
  const boardHeight = margin * 2 + rows * H + (rows - 1) * gap;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${boardWidth}" height="${boardHeight}" viewBox="0 0 ${boardWidth} ${boardHeight}">
    <rect width="${boardWidth}" height="${boardHeight}" fill="#E2E8F0"/>
    ${figures.map((figure, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      const x = margin + column * (W + gap);
      const y = margin + row * (H + gap);
      return `<g id="${figure.id}" transform="translate(${x} ${y})">${figureInner(figure, `board-${figure.id}`)}</g>`;
    }).join("\n")}
  </svg>`;
}

/*
  The exported Figma board contains only source-derived vector primitives.
  It intentionally does not embed sample-project images, AI-generated art,
  user uploads, or runtime sticker payloads.
*/

const figures = [
  {
    id: "value-flow", number: "01", title: "Dòng giá trị của GenSticker", subtitle: "Từ chân dung người dùng đến bộ 20 sticker có thể tải và chia sẻ",
    body: (p) => `${lane(45, 142, 1510, 610, "Phạm vi MVP đang chạy", "frontend")}${step(85, 235, 245, "1", "Upload", ["JPEG · PNG · WebP", "≤15 MiB · ≤40 MP"], "client")}${arrow(330, 295, 390, 295, "", "frontend", { prefix: p })}${step(390, 235, 245, "2", "Giữ danh tính", ["Selfie → canonical", "1 image edit call"], "frontend")}${arrow(635, 295, 695, 295, "", "frontend", { prefix: p })}${step(695, 235, 245, "3", "Sinh biểu cảm", ["3 sheet 4×2", "8 + 8 + 4 sticker"], "backend")}${arrow(940, 295, 1000, 295, "", "backend", { prefix: p })}${step(1000, 235, 245, "4", "Kiểm thử", ["Gutter · occupancy", "Crop · outline · 512px"], "quality")}${arrow(1245, 295, 1305, 295, "", "quality", { prefix: p })}${step(1305, 235, 205, "5", "Sử dụng", ["Gallery · ZIP", "History · Telegram"], "data")}${node(210, 455, 360, 170, "Giá trị chính", ["Tạo trọn bộ 20 biểu cảm", "giữ phong cách và nhận diện", "trong một luồng có tiến độ."], "frontend")}${node(620, 455, 360, 170, "Điểm kiểm soát", ["JWT owner guard · giới hạn job", "quality gate lưới · safe error", "persistence chỉ best-effort."], "quality")}${node(1030, 455, 360, 170, "Biên hiện tại", ["QA chưa chấm likeness/anatomy", "job nằm trong RAM/temp", "storage có thể trả public URL."], "risk")}`,
  },
  {
    id: "user-journey", number: "02", title: "User journey và nhánh phục hồi", subtitle: "Luồng UI thực tế trên kien_v5, gồm auth, polling và rejected state",
    body: (p) => `${lane(50, 145, 1500, 230, "Happy path", "frontend")}${step(75, 205, 205, "1", "Chọn ảnh", ["Preview local", "chọn style"], "client")}${arrow(280, 265, 340, 265, "", "frontend", { prefix: p })}${step(340, 205, 205, "2", "Xác thực", ["JWT Supabase", "guest → modal"], "frontend")}${arrow(545, 265, 605, 265, "", "frontend", { prefix: p })}${step(605, 205, 205, "3", "Tạo job", ["multipart POST", "session job_id"], "backend")}${arrow(810, 265, 870, 265, "", "backend", { prefix: p })}${step(870, 205, 205, "4", "Theo dõi", ["poll mỗi 1 giây", "timeout 12 phút"], "quality")}${arrow(1075, 265, 1135, 265, "", "quality", { prefix: p })}${step(1135, 205, 205, "5", "Nhận bộ", ["đúng 20 PNG", "gallery/confetti"], "data")}${arrow(1340, 265, 1400, 265, "", "data", { prefix: p })}${node(1400, 205, 115, 120, "Dùng", ["ZIP", "Bot"], "external", { titleSize: 22, lineSize: 16 })}${lane(50, 415, 1500, 310, "Nhánh lỗi và phục hồi", "risk")}${node(90, 485, 300, 155, "Validation rejected", ["Hiện raw-sheet preview", "quality_status=rejected"], "risk")}${arrow(390, 563, 515, 563, "CTA hiện tại", "risk", { prefix: p })}${node(515, 485, 300, 155, "Thử Lại Ngay", ["resetGenerator()", "xóa active job", "trở về Upload"], "frontend")}${arrow(815, 563, 950, 563, "upload lại", "frontend", { prefix: p })}${node(950, 485, 300, 155, "Job mới", ["Tạo lại từ đầu", "có thể phát sinh 4 call"], "backend")}${node(1285, 475, 225, 175, "Retry API", ["Backend có /retry", "tái dùng artifact", "UI chưa nối"], "neutral", { dashed: true, tag: "UNWIRED", titleSize: 23, lineSize: 17 })}${arrow(1285, 603, 1180, 640, "nét đứt", "neutral", { prefix: p, dashed: true })}`,
  },
  {
    id: "system-boundary", number: "03", title: "Ranh giới hệ thống và actor", subtitle: "Những gì thuộc GenSticker, những gì do nền tảng bên ngoài quản lý",
    body: (p) => `${lane(360, 160, 830, 560, "GENSTICKER — code trong repository", "frontend")}${node(55, 265, 250, 150, "Người dùng", ["Upload chân dung", "xem / tải / export"], "client")}${node(55, 485, 250, 145, "Nhà vận hành", ["Cấu hình secrets", "theo dõi lỗi / chi phí"], "neutral")}${node(415, 240, 300, 155, "React + Vite", ["Auth · upload · state", "polling · gallery · docs"], "frontend")}${node(835, 240, 300, 155, "FastAPI", ["JWT owner guard", "job orchestration · API"], "backend")}${node(625, 500, 300, 150, "Generation core", ["canonical · 3 sheets", "grid gate · postprocess"], "quality")}${node(1240, 170, 300, 130, "Supabase", ["Auth · Storage · data"], "data")}${node(1240, 360, 300, 130, "Image API", ["OpenAI-compatible edits", "nhận selfie/reference"], "external")}${node(1240, 550, 300, 130, "Telegram + QR", ["pending pack · Bot API", "dịch vụ QR ngoài"], "external")}${arrow(305, 340, 415, 315, "UI", "client", { prefix: p })}${arrow(715, 315, 835, 315, "REST + JWT", "frontend", { prefix: p })}${arrow(985, 395, 865, 500, "điều phối", "backend", { prefix: p })}${arrow(1135, 280, 1240, 235, "Auth/data", "data", { prefix: p })}${arrow(1135, 330, 1240, 425, "image[]", "external", { prefix: p })}${arrow(1135, 365, 1240, 615, "export", "external", { prefix: p })}${arrow(180, 485, 180, 415, "vận hành", "neutral", { prefix: p })}`,
  },
  {
    id: "job-state", number: "03", title: "State machine của trình tạo sticker", subtitle: "Trạng thái hiển thị ở frontend và nhánh retry backend chưa được nối vào CTA",
    body: (p) => `${node(90, 310, 250, 150, "idle", ["Upload + chọn style", "không có active job"], "client", { tag: "UI" })}${node(470, 185, 280, 160, "processing", ["POST generate", "poll job mỗi 1 giây"], "frontend", { tag: "UI" })}${node(890, 165, 280, 160, "completed", ["đủ 20 stickers", "gallery / history / export"], "data", { tag: "UI" })}${node(890, 505, 280, 160, "error", ["safe error hoặc rejected", "có thể kèm raw previews"], "risk", { tag: "UI" })}${node(1260, 505, 250, 160, "backend retry", ["tối đa 2 lần", "tái dùng artifact hợp lệ"], "neutral", { tag: "UNWIRED", dashed: true })}${arrow(340, 350, 470, 265, "Generate", "frontend", { prefix: p })}${arrow(750, 245, 890, 245, "20 outputs", "data", { prefix: p })}${arrow(720, 325, 890, 545, "API / QA fail", "risk", { prefix: p })}${arrow(890, 595, 340, 420, "Thử Lại Ngay → reset", "risk", { prefix: p, bend: [705, 740, 405, 650], labelX: 615, labelY: 735 })}${arrow(1170, 585, 1260, 585, "retryJob()", "neutral", { prefix: p, dashed: true })}${arrow(1385, 505, 750, 300, "resume processing", "neutral", { prefix: p, dashed: true, bend: [1385, 405, 900, 405], labelX: 1110, labelY: 390 })}`,
  },
  {
    id: "system-context", number: "04", title: "Kiến trúc runtime GenSticker", subtitle: "Component topology hiện tại và các external trust boundaries",
    body: (p) => `${lane(40, 155, 235, 565, "Client", "client")}${lane(310, 155, 820, 565, "GenSticker runtime", "frontend")}${lane(1165, 155, 390, 565, "Dịch vụ ngoài", "external")}${node(70, 330, 175, 150, "Browser", ["React UI", "JWT · polling"], "client", { titleSize: 24, lineSize: 17 })}${node(350, 220, 240, 145, "React + Vite", ["state machine", "docs hub"], "frontend")}${node(680, 220, 250, 145, "FastAPI /api/v1", ["security guard", "API routers"], "backend")}${node(350, 500, 240, 145, "RAM + Temp", ["jobs · attempts", "raw/canonical/crops"], "risk")}${node(680, 500, 250, 145, "Grouped generator", ["prompts · identity", "grid QA · 512px"], "quality", { titleSize: 25 })}${node(965, 345, 135, 150, "Telegram", ["pending", "polling"], "neutral", { titleSize: 21, lineSize: 16 })}${node(1195, 215, 330, 135, "Supabase", ["Auth · Storage · PostgREST"], "data")}${node(1195, 395, 330, 135, "Compatible Image API", ["POST /images/edits", "1–3 references"], "external")}${node(1195, 580, 330, 110, "Telegram Bot / QR", ["20 sticker export"], "external")}${arrow(245, 405, 350, 292, "UI", "client", { prefix: p })}${arrow(590, 292, 680, 292, "REST + JWT", "frontend", { prefix: p })}${arrow(805, 365, 805, 500, "async job", "backend", { prefix: p })}${arrow(680, 572, 590, 572, "artifacts", "risk", { prefix: p })}${arrow(930, 260, 1195, 282, "Auth / history", "data", { prefix: p })}${arrow(930, 572, 1195, 462, "image[]", "external", { prefix: p, labelX: 1065, labelY: 548 })}${arrow(1100, 420, 1195, 635, "Bot API", "external", { prefix: p, bend: [1140, 420, 1140, 635], labelX: 1160, labelY: 612 })}`,
  },
  {
    id: "generation-sequence", number: "04", title: "Sequence tạo một bộ 20 sticker", subtitle: "4 image requests/job: canonical + ba sheet landscape, sau đó structural QA và persistence best-effort",
    body: (p) => `${[180,430,680,930,1180,1430].map((x, i) => `${label(x, 165, ["Browser","FastAPI","Pipeline","Image API","Quality","Supabase"][i], { size: 21, color: ["#164E63","#831843","#312E81","#7C2D12","#134E4A","#065F46"][i], weight: 800, anchor: "middle" })}<line x1="${x}" y1="180" x2="${x}" y2="760" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="7 7"/>`).join("")}${arrow(180, 225, 430, 225, "POST file + style_id", "frontend", { prefix: p })}${arrow(430, 280, 680, 280, "create async job", "backend", { prefix: p })}${arrow(680, 335, 930, 335, "1 · canonical 1024²", "external", { prefix: p })}${arrow(680, 395, 930, 395, "2 · sheet 1 / 8", "external", { prefix: p })}${arrow(680, 455, 930, 455, "3 · sheet 2 / 8", "external", { prefix: p })}${arrow(680, 515, 930, 515, "4 · sheet 3 / keep 4", "external", { prefix: p })}${arrow(930, 575, 1180, 575, "raw PNG", "quality", { prefix: p })}${arrow(1180, 630, 680, 630, "crop + postprocess 512px", "quality", { prefix: p })}${arrow(680, 690, 1430, 690, "upload + insert (best-effort)", "data", { prefix: p })}${arrow(430, 740, 180, 740, "poll → completed / rejected", "frontend", { prefix: p })}${node(1040, 220, 255, 255, "Mỗi sheet", ["Refs: selfie + canonical", "+ guide lưới 4×2", "1536×1024", "transparent PNG", "quality=medium"], "external", { titleSize: 23, lineSize: 17 })}`,
  },
  {
    id: "pipeline-five-stage", number: "04", title: "Pipeline năm giai đoạn", subtitle: "Mốc tiến độ user-facing và artifact tạo ra ở từng giai đoạn",
    body: (p) => `${step(60, 245, 270, "01", "Normalize", ["EXIF transpose · strip metadata", "RGB · max side 1536"], "client")}${arrow(330, 305, 370, 305, "", "frontend", { prefix: p })}${step(370, 245, 270, "02", "Canonical", ["Khoá identity/style", "1 selfie reference"], "frontend")}${arrow(640, 305, 680, 305, "", "frontend", { prefix: p })}${step(680, 245, 270, "03", "Three sheets", ["strict 4×2", "8 + 8 + 4 keep"], "backend")}${arrow(950, 305, 990, 305, "", "backend", { prefix: p })}${step(990, 245, 270, "04", "Structural QA", ["adaptive gutters", "cut score · occupancy"], "quality")}${arrow(1260, 305, 1300, 305, "", "quality", { prefix: p })}${step(1300, 245, 240, "05", "Postprocess", ["crop · outline", "20 × 512 PNG"], "data")}${node(95, 480, 300, 160, "Artifact", ["sanitized-selfie.png", "canonical.png"], "neutral")}${node(450, 480, 300, 160, "Artifact", ["raw-sheet-1..3.png", "layout guide"], "neutral")}${node(805, 480, 300, 160, "Decision", ["accepted → crop", "rejected → raw preview"], "quality")}${node(1160, 480, 300, 160, "Delivery", ["data URLs → UI", "Storage/DB best-effort"], "data")}${arrow(395, 560, 450, 560, "", "neutral", { prefix: p })}${arrow(750, 560, 805, 560, "", "neutral", { prefix: p })}${arrow(1105, 560, 1160, 560, "", "neutral", { prefix: p })}`,
  },
  {
    id: "roadmap-now-next-later", number: "05", title: "Roadmap Now / Next / Later", subtitle: "Ưu tiên đề xuất từ source audit; không phải cam kết lịch phát hành",
    body: (p) => `${lane(55, 160, 470, 590, "NOW — giảm rủi ro dữ liệu", "risk")}${lane(565, 160, 470, 590, "NEXT — tăng độ bền", "frontend")}${lane(1075, 160, 470, 590, "LATER — tối ưu vận hành", "quality")}${node(85, 230, 410, 125, "P0 · Runtime data", ["Bỏ base64 user images khỏi Git", "tách/purge pending Telegram data"], "risk")}${node(85, 385, 410, 125, "P0 · Credentials", ["Bỏ demo credential hard-code", "rotate và đưa vào controlled config"], "risk")}${node(85, 540, 410, 135, "P1 · Privacy", ["Private bucket + signed URL", "retention/delete selfie rõ ràng"], "risk")}${node(595, 230, 410, 125, "P1 · Durable jobs", ["Persist job state/artifacts", "hỗ trợ multi-worker/restart"], "frontend")}${node(595, 385, 410, 125, "P1 · Schema + RLS", ["Version-control DDL/policies", "FK + ownership integration tests"], "data")}${node(595, 540, 410, 135, "P1 · Automated UX", ["Frontend unit/E2E", "a11y + responsive regression"], "frontend")}${node(1105, 230, 410, 125, "P2 · Observability", ["request_id · latency · actual cost", "provider error dashboard"], "quality")}${node(1105, 385, 410, 125, "P2 · QA mở rộng", ["identity/anatomy/OCR review", "real-provider contract canary"], "quality")}${node(1105, 540, 410, 135, "P2 · Deprecations", ["Pydantic/FastAPI/datetime", "docs drift + dead retry branch"], "neutral")}`,
  },
  {
    id: "screen-flow", number: "06", title: "Screen flow của web app", subtitle: "Các view, overlay và state chuyển đổi thực tế trong frontend",
    body: (p) => `${node(60, 280, 235, 150, "Upload", ["file preview", "style picker"], "client")}${node(365, 155, 235, 145, "Auth modal", ["login · register", "demo dev-only"], "frontend")}${node(365, 430, 235, 145, "Processing", ["5-step progress", "raw previews"], "frontend")}${node(690, 180, 250, 150, "Gallery", ["20 cards", "download / favorite"], "data")}${node(690, 465, 250, 150, "Rejected", ["comparison preview", "reset → upload"], "risk")}${node(1040, 155, 235, 145, "History modal", ["authenticated only", "soft delete"], "data")}${node(1040, 430, 235, 145, "Telegram modal", ["deep link · QR", "export progress"], "external")}${node(1350, 280, 190, 150, "Docs hub", ["#tai-lieu", "12 files"], "frontend")}${arrow(295, 325, 365, 230, "guest", "frontend", { prefix: p })}${arrow(295, 355, 365, 500, "generate", "frontend", { prefix: p })}${arrow(600, 500, 690, 255, "success", "data", { prefix: p, bend: [640, 500, 640, 255] })}${arrow(600, 520, 690, 540, "failure", "risk", { prefix: p })}${arrow(940, 240, 1040, 225, "open", "data", { prefix: p })}${arrow(940, 270, 1040, 500, "export", "external", { prefix: p })}${arrow(690, 580, 295, 400, "Thử Lại Ngay", "risk", { prefix: p, bend: [565, 700, 290, 610], labelX: 505, labelY: 690 })}${arrow(1275, 230, 1350, 335, "header", "frontend", { prefix: p })}${arrow(1350, 380, 1275, 500, "back", "frontend", { prefix: p })}`,
  },
  {
    id: "docs-hub-layout", number: "06", title: "Bố cục Documentation Hub", subtitle: "Desktop hai cột, mobile xếp dọc và visual có thể phóng to",
    body: () => `${lane(55, 165, 910, 565, "Desktop ≥ 1024px", "frontend")}${node(90, 225, 265, 445, "Sidebar", ["Search", "Category filters", "11 document cards", "DOCX/XLSX badge"], "neutral")}${node(390, 225, 535, 445, "Viewer", ["Title + source snapshot", "visual gallery + caption", "section / sheet tabs", "table + source refs", "download Office file"], "frontend")}${lane(1015, 165, 530, 565, "Mobile 390px", "client")}${node(1065, 220, 430, 110, "Hero + search", ["baseline và thống kê thu gọn"], "client")}${node(1065, 360, 430, 120, "Document picker", ["horizontal/stacked cards"], "neutral")}${node(1065, 510, 430, 160, "Viewer stacked", ["visual scroll/expand", "sheet tabs có keyboard", "download luôn hiển thị"], "frontend")}${label(635, 708, "Visual assets dùng chung cho web, Word và Excel", { size: 18, color: "#475569", weight: 700, anchor: "middle" })}`,
  },
  {
    id: "quality-gates", number: "07", title: "Chuỗi quality gates trước bàn giao", subtitle: "Từ source tests đến kiểm tra trực quan tất cả tài liệu và UI",
    body: (p) => `${step(55, 250, 245, "1", "Backend", ["pytest 75 cases", "mock paid providers"], "backend")}${arrow(300, 310, 360, 310, "", "quality", { prefix: p })}${step(360, 250, 245, "2", "Frontend", ["ESLint", "production build"], "frontend")}${arrow(605, 310, 665, 310, "", "quality", { prefix: p })}${step(665, 250, 245, "3", "Docs build", ["5 DOCX + 6 XLSX", "manifest/assets sync"], "neutral")}${arrow(910, 310, 970, 310, "", "quality", { prefix: p })}${step(970, 250, 245, "4", "Visual QA", ["render every page", "render every sheet"], "quality")}${arrow(1215, 310, 1275, 310, "", "quality", { prefix: p })}${step(1275, 250, 265, "5", "Browser QA", ["desktop + mobile", "keyboard + download"], "client")}${node(135, 475, 370, 175, "Pass criteria", ["Không lỗi test/build", "không clipping/overlap", "mỗi figure có caption + alt"], "quality")}${node(615, 475, 370, 175, "Manual boundary", ["Không gọi paid API trong CI", "không dùng user/base64 runtime", "không sao chép sample assets"], "neutral")}${node(1095, 475, 370, 175, "Open gaps", ["Chưa có frontend unit/E2E", "chưa có DB/RLS integration", "chưa có provider canary"], "risk")}`,
  },
  {
    id: "coverage-map", number: "07", title: "Bản đồ coverage hiện tại", subtitle: "75 backend tests được phân bổ theo module; vùng trắng được ghi rõ thay vì suy đoán",
    body: () => `${lane(55, 160, 1020, 575, "Automated backend coverage — 75 cases", "quality")}${node(85, 220, 300, 145, "Grouped generation · 18", ["4 calls · 4×2 split", "3×2 reject · resume"], "quality", { titleSize: 21 })}${node(415, 220, 300, 145, "Pipeline service · 10", ["owner · rate · retry", "TTL · persistence"], "backend", { titleSize: 23 })}${node(745, 220, 300, 145, "Stickers API · 9", ["Bearer · MIME · owner", "cache · missing key"], "backend", { titleSize: 23 })}${node(85, 405, 300, 145, "Prompts · 9", ["exact cells/reserve", "invalid plans"], "frontend")}${node(415, 405, 300, 145, "Providers · 14", ["OpenAI 7 · Gemini/Fal 7", "multipart · billing"], "external")}${node(745, 405, 300, 145, "Other · 15", ["CLI · catalog · postprocess", "pose refs · quality"], "neutral")}${node(85, 590, 960, 105, "Boundary", ["Provider tests dùng mocks; số pass không chứng minh live model quality, actual cost hay Supabase policy."], "neutral", { titleSize: 22, lineSize: 17 })}${lane(1120, 160, 425, 575, "Coverage gaps", "risk")}${node(1150, 220, 365, 120, "Frontend", ["0 unit/spec · 0 browser E2E"], "risk")}${node(1150, 365, 365, 120, "External integration", ["Supabase/RLS · Telegram · live provider"], "risk")}${node(1150, 510, 365, 145, "Non-functional", ["load/concurrency · security fuzz", "a11y · visual regression", "backup/retention"], "risk")}`,
  },
  {
    id: "data-model", number: "08", title: "ERD as-is: Database Schema & Storage", subtitle: "Đường liền = source xác nhận; nét đứt = quan hệ suy ra vì repo thiếu base DDL/FK",
    legend: [["data", "Implemented / referenced"], ["neutral", "Inferred — DDL missing", true], ["risk", "Gap / mismatch"], ["quality", "Recommended target"]],
    body: (p) => `${entity(65, 205, 330, "auth.users", ["id UUID · PK [F]", "email [F]", "raw_user_meta_data.full_name [F]"], "neutral", "F")}${entity(530, 155, 430, "public.sticker_packs", ["id · PK [F]", "user_id UUID [I]", "title · style_name · total_stickers [I]", "created_at [F]", "is_deleted · deleted_at [I]", "CHECK soft-delete invariant [I]"], "data", "I/F")}${entity(1095, 175, 430, "public.stickers", ["id · PK [F]", "pack_id [I]", "title · emotion · tags [I]", "image_url [I]", "extra FE fields [G — not persisted]"], "data", "I/F")}${entity(1095, 560, 430, "storage.objects / bucket", ["uploads/{uuid}_{file_name} [I]", "public URL returned [I]", "input selfie has no DB row [I]"], "external", "I/F")}${node(65, 555, 330, 150, "EphemeralJob", ["RAM dictionaries + temp dir", "owner_id + raw artifacts", "không phải PostgreSQL entity"], "risk", { dashed: true, tag: "RUNTIME", titleSize: 24, lineSize: 17 })}${arrow(395, 290, 530, 265, "1 → N semantic", "neutral", { prefix: p, dashed: true })}${arrow(960, 290, 1095, 290, "1 → N semantic", "neutral", { prefix: p, dashed: true })}${arrow(1310, 395, 1310, 560, "image_url (loose)", "external", { prefix: p })}${arrow(230, 555, 230, 380, "owner map", "risk", { prefix: p, dashed: true })}${node(480, 590, 490, 140, "Repo gap", ["Không có CREATE TABLE / POLICY / ENABLE RLS", "và không có FK migration trong repo.", "Chỉ migration 001 version-control soft delete."], "risk", { titleSize: 22, lineSize: 16 })}`,
  },
  {
    id: "rls-owner-flow", number: "08", title: "Ownership & RLS — current versus target", subtitle: "Service-role có thể bypass RLS; owner filter trong backend hiện là lớp kiểm soát chính",
    body: (p) => `${lane(55, 155, 720, 590, "CURRENT — đã thấy trong code", "backend")}${node(90, 230, 270, 135, "Bearer JWT", ["require_user_id()", "Supabase Auth verify"], "client")}${node(470, 230, 270, 135, "Owner filters", ["job owner guard", ".eq(user_id, ...)"], "backend")}${node(90, 480, 270, 145, "Service-role client", ["được ưu tiên", "thường bypass RLS"], "risk")}${node(470, 480, 270, 145, "External policies", ["không versioned", "trạng thái không xác minh"], "neutral", { dashed: true })}${arrow(360, 298, 470, 298, "user.id", "backend", { prefix: p })}${arrow(605, 365, 225, 480, "admin client", "risk", { prefix: p, bend: [605, 420, 225, 420] })}${arrow(360, 552, 470, 552, "DB/Storage", "neutral", { prefix: p, dashed: true })}${lane(825, 155, 720, 590, "TARGET — cần version-control", "quality")}${node(865, 220, 300, 150, "sticker_packs RLS", ["SELECT/UPDATE/DELETE", "auth.uid() = user_id"], "quality")}${node(1215, 220, 290, 150, "stickers RLS", ["EXISTS owned parent pack", "no direct client write"], "quality")}${node(865, 480, 300, 150, "Private Storage", ["object_path in DB", "signed URL ngắn hạn"], "data")}${node(1215, 480, 290, 150, "Schema migrations", ["FK + NOT NULL", "policy tests in CI"], "quality")}${arrow(1165, 295, 1215, 295, "parent", "quality", { prefix: p })}${arrow(1015, 370, 1015, 480, "owned path", "data", { prefix: p })}${arrow(1360, 370, 1360, 480, "DDL", "quality", { prefix: p })}`,
  },
  {
    id: "data-lifecycle", number: "08", title: "Vòng đời dữ liệu và điểm giữ lại", subtitle: "Luồng as-is của selfie, artifact tạm, output và soft delete",
    body: (p) => `${step(60, 245, 245, "1", "Upload", ["selfie → Storage", "public URL logged"], "client")}${arrow(305, 305, 365, 305, "", "risk", { prefix: p })}${step(365, 245, 245, "2", "Generate", ["RAM job + temp dir", "provider receives refs"], "backend")}${arrow(610, 305, 670, 305, "", "backend", { prefix: p })}${step(670, 245, 245, "3", "Persist", ["20 outputs upload", "pack then stickers"], "data")}${arrow(915, 305, 975, 305, "", "data", { prefix: p })}${step(975, 245, 245, "4", "History", ["owner filter", "active packs only"], "data")}${arrow(1220, 305, 1280, 305, "", "risk", { prefix: p })}${step(1280, 245, 260, "5", "Soft delete", ["is_deleted + deleted_at", "objects remain"], "risk")}${node(90, 485, 410, 165, "Selfie source", ["Upload xảy ra trước rate/capacity checks.", "Không có DB row liên kết; chưa thấy", "retention cleanup cho selfie."], "risk", { lineSize: 17 })}${node(595, 485, 410, 165, "Temp artifacts", ["TTL/retention cleanup xoá temp dir", "nhưng restart làm mất active/retryable state."], "neutral", { lineSize: 17 })}${node(1100, 485, 410, 165, "Target lifecycle", ["private bucket · object_path", "delete cascade · retention policy", "audit trail · failed-upload cleanup"], "quality", { lineSize: 17 })}`,
  },
  {
    id: "validation-boundaries", number: "09", title: "Validation theo từng trust boundary", subtitle: "Mỗi lớp chặn một loại input khác nhau trước khi ảnh tới provider",
    body: (p) => `${lane(45, 155, 1510, 585, "Defense in depth", "quality")}${step(75, 230, 260, "1", "Browser", ["MIME allow-list", "≤15 MiB · preview"], "client")}${arrow(335, 290, 390, 290, "", "frontend", { prefix: p })}${step(390, 230, 260, "2", "FastAPI", ["Bearer · bytes · format", "≤40 MP · style_id"], "backend")}${arrow(650, 290, 705, 290, "", "backend", { prefix: p })}${step(705, 230, 260, "3", "Sanitize", ["EXIF transpose", "strip metadata · RGB"], "quality")}${arrow(965, 290, 1020, 290, "", "quality", { prefix: p })}${step(1020, 230, 260, "4", "Provider guard", ["≤10 MiB/reference", "≤30 MiB total"], "external", { titleSize: 20 })}${arrow(1280, 290, 1335, 290, "", "external", { prefix: p })}${step(1335, 230, 185, "5", "Decode", ["b64 PNG", "≤20 MiB"], "quality")}${node(110, 465, 390, 170, "Safe rejection", ["400/401/403/402/429 được map", "sang message không lộ raw provider error."], "quality", { lineSize: 18 })}${node(605, 465, 390, 170, "Current gaps", ["Không có malware/NSFW policy local", "không có frontend test", "decompression fuzz còn thiếu"], "risk", { lineSize: 18 })}${node(1100, 465, 390, 170, "Privacy boundary", ["Selfie sanitized vẫn là dữ liệu chân dung", "và được gửi sang API ảnh bên thứ ba."], "external", { lineSize: 18 })}`,
  },
  {
    id: "sheet-plan", number: "10", title: "Kế hoạch ba sheet 4×2", subtitle: "Mỗi cell là một sticker độc lập; sheet cuối sinh reserve nhưng chỉ giữ bốn cell đầu",
    body: () => `${[0,1,2].map((sheetIndex) => {
      const x = 70 + sheetIndex * 510;
      const keep = sheetIndex < 2 ? 8 : 4;
      return `<g>${label(x, 185, `RAW SHEET ${sheetIndex + 1} · KEEP ${keep}`, { size: 21, color: sheetIndex === 2 ? "#7C2D12" : "#312E81", weight: 800 })}<rect x="${x}" y="210" width="460" height="360" rx="22" fill="#F8FAFC" stroke="${sheetIndex === 2 ? "#EA580C" : "#5B3DF5"}" stroke-width="3"/>${Array.from({ length: 8 }, (_, index) => {
        const col = index % 4;
        const row = Math.floor(index / 4);
        const active = index < keep;
        return `<rect x="${x + 18 + col * 108}" y="${230 + row * 165}" width="96" height="145" rx="16" fill="${active ? ["#EEF2FF","#ECFDF5","#FDF2F8"][sheetIndex] : "#FFF7ED"}" stroke="${active ? ["#5B3DF5","#059669","#DB2777"][sheetIndex] : "#EA580C"}" stroke-width="2" ${active ? "" : 'stroke-dasharray="7 5"'}/><circle cx="${x + 66 + col * 108}" cy="${275 + row * 165}" r="25" fill="${active ? ["#5B3DF5","#059669","#DB2777"][sheetIndex] : "#EA5800"}" opacity="0.85"/><path d="M ${x + 42 + col * 108} ${335 + row * 165} Q ${x + 66 + col * 108} ${300 + row * 165} ${x + 90 + col * 108} ${335 + row * 165}" fill="none" stroke="${active ? "#334155" : "#9A3412"}" stroke-width="7" stroke-linecap="round"/>${label(x + 66 + col * 108, 360 + row * 165, active ? `${sheetIndex * 8 + index + 1}` : "R", { size: 16, color: active ? "#334155" : "#9A3412", weight: 800, anchor: "middle" })}`;
      }).join("")}</g>`;
    }).join("")}${node(380, 625, 840, 105, "Output contract", ["8 + 8 + 4 = 20 PNG · mỗi ảnh 512×512 · transparent canvas + white outline"], "quality", { titleSize: 22, lineSize: 18 })}`,
  },
  {
    id: "quality-decision-flow", number: "10", title: "Decision flow của grid quality gate", subtitle: "Ngưỡng đang dùng trong GroupedStickerGenerator; pass mới được crop/postprocess",
    body: (p) => `${node(65, 250, 220, 130, "Decode RGBA", ["raw sheet"], "neutral")}${arrow(285, 315, 350, 315, "", "quality", { prefix: p })}${node(350, 235, 260, 160, "Dimensions", ["width ≥1000", "height ≥600"], "quality")}${arrow(610, 315, 675, 315, "pass", "quality", { prefix: p })}${node(675, 215, 280, 200, "Foreground mask", ["alpha ratio >5%?", "transparent: alpha>16", "opaque: local contrast"], "quality")}${arrow(955, 315, 1020, 315, "", "quality", { prefix: p })}${node(1020, 200, 280, 230, "Adaptive 4×2", ["gutter search ≈4%", "cut_score", "minimum_occupancy", "dominant crossing"], "quality")}${arrow(1300, 315, 1360, 315, "pass", "quality", { prefix: p })}${node(1360, 235, 180, 160, "Crop 8", ["postprocess", "512px"], "data", { titleSize: 23, lineSize: 18 })}${node(300, 525, 310, 165, "Reject: size", ["pack_sheet_too_small"], "risk")}${node(675, 515, 350, 190, "Reject: transparent", ["cut ≥0.45", "hoặc cut >0.10 + crossing", "occupancy <0.03"], "risk")}${node(1080, 525, 315, 165, "Reject: opaque", ["cut >0.18", "hoặc occupancy <0.03"], "risk")}${arrow(480, 395, 455, 525, "fail", "risk", { prefix: p })}${arrow(875, 415, 850, 515, "fail", "risk", { prefix: p })}${arrow(1160, 430, 1235, 525, "fail", "risk", { prefix: p })}${label(800, 756, "Structural gate only — chưa tự chấm likeness, anatomy, OCR/watermark hoặc semantic pose", { size: 19, color: "#7F1D1D", weight: 800, anchor: "middle" })}`,
  },
  {
    id: "repo-runtime-map", number: "11", title: "Bản đồ repository và dependency direction", subtitle: "Web grouped pipeline được tách khỏi adapters/CLI nhưng vẫn dùng chung generation core",
    body: (p) => `${lane(50, 155, 1500, 570, "E:\\python\\GenSticker", "neutral")}${node(85, 225, 330, 165, "frontend/", ["React components + hooks", "services · types · assets", "public/gen-sticker-docs"], "frontend")}${node(515, 225, 330, 165, "backend/app/", ["FastAPI routers · security", "StickerPipelineService", "Supabase · Telegram"], "backend")}${node(945, 225, 330, 165, "backend/sticker_generation/", ["grouped generator · prompts", "providers · postprocess", "standalone CLI pipeline"], "quality", { titleSize: 21, lineSize: 18 })}${node(1285, 225, 230, 165, "external", ["Supabase", "Image API", "Telegram"], "external")}${node(85, 500, 330, 145, "gen-sticker-docs/", ["manifest · figure assets", "DOCX/XLSX builders", "12 Office outputs"], "frontend")}${node(515, 500, 330, 145, "backend/migrations/", ["001 soft delete only", "base schema/RLS absent"], "data")}${node(945, 500, 330, 145, "runtime state", ["RAM/temp jobs", "pending Telegram JSON"], "risk")}${arrow(415, 305, 515, 305, "REST", "frontend", { prefix: p })}${arrow(845, 305, 945, 305, "calls core", "backend", { prefix: p })}${arrow(1275, 305, 1285, 305, "", "external", { prefix: p })}${arrow(680, 390, 680, 500, "schema use", "data", { prefix: p })}${arrow(1110, 390, 1110, 500, "artifacts", "risk", { prefix: p })}${arrow(250, 500, 250, 390, "docs UI", "frontend", { prefix: p })}`,
  },
  {
    id: "risk-control-map", number: "11", title: "Security & operations control map", subtitle: "Các trust boundary có dữ liệu chân dung, token hoặc quyền service-role",
    body: (p) => `${lane(55, 155, 1490, 580, "Trust boundaries", "risk")}${node(85, 220, 260, 150, "TB-0 Browser", ["selfie · JWT localStorage", "base64 sticker export"], "client", { lineSize: 17 })}${node(430, 220, 280, 150, "TB-2 FastAPI", ["API keys · service-role", "RAM/temp artifacts"], "backend", { lineSize: 17 })}${node(795, 220, 280, 150, "TB-3 Supabase", ["Auth · public URLs", "external RLS state"], "data", { lineSize: 17 })}${node(1160, 220, 335, 150, "TB-4/5 Providers", ["Image API receives portrait refs", "Telegram/QR receives pack/deep link"], "external", { lineSize: 17 })}${arrow(345, 295, 430, 295, "JWT + upload", "risk", { prefix: p })}${arrow(710, 295, 795, 295, "service-role", "risk", { prefix: p })}${arrow(1075, 295, 1160, 295, "portrait/export", "risk", { prefix: p })}${node(85, 465, 300, 170, "P0 controls", ["remove tracked user/base64", "data from Git", "remove/rotate demo credential", "bound/auth Telegram export"], "risk", { lineSize: 16 })}${node(465, 465, 300, 170, "P1 data controls", ["private bucket + signed URL", "retention/delete selfie", "retention/delete outputs", "versioned schema/RLS tests"], "data", { lineSize: 16 })}${node(845, 465, 300, 170, "P1 runtime controls", ["durable job queue/store", "multi-worker safe", "pending store", "structured redacted errors"], "quality", { lineSize: 16 })}${node(1225, 465, 270, 170, "P2 assurance", ["cost/latency telemetry", "security fuzz + audit", "incident/runbook drills"], "neutral", { lineSize: 17 })}`,
  },
];

const faceGateFigureUpdates = {
  "value-flow": {
    subtitle: "Từ ảnh chân dung qua gate đúng một khuôn mặt đến bộ 20 sticker",
    body: (p) => `${lane(45, 142, 1510, 610, "Phạm vi MVP đang chạy", "frontend")}${step(60, 215, 225, "1", "Chọn ảnh", ["JPEG · PNG · WebP", "≤15 MiB"], "client")}${arrow(285, 275, 315, 275, "", "frontend", { prefix: p })}${step(315, 215, 225, "2", "Gate 1 mặt", ["MediaPipe CPU/WASM", "faceCount === 1"], "quality")}${arrow(540, 275, 570, 275, "PASS", "quality", { prefix: p })}${step(570, 215, 225, "3", "Khóa nhận diện", ["Selfie → canonical", "1 image edit call"], "frontend")}${arrow(795, 275, 825, 275, "", "backend", { prefix: p })}${step(825, 215, 225, "4", "Sinh biểu cảm", ["3 sheet 4×2", "8 + 8 + 4"], "backend")}${arrow(1050, 275, 1080, 275, "", "quality", { prefix: p })}${step(1080, 215, 225, "5", "QA + cắt", ["Gutter · occupancy", "20 PNG 512px"], "quality")}${arrow(1305, 275, 1335, 275, "", "data", { prefix: p })}${step(1335, 215, 205, "6", "Sử dụng", ["Gallery · ZIP", "History · Bot"], "data")}${node(90, 455, 420, 180, "Gate miễn phí", ["Chạy cục bộ trên CPU thiết bị", "không GPU server · không paid vision API", "0 hoặc >1 mặt → không POST."], "quality")}${node(590, 455, 420, 180, "Trust boundary", ["Model TFLite cùng origin", "WASM runtime tải từ CDN", "ảnh không rời thiết bị khi preflight."], "frontend")}${node(1090, 455, 420, 180, "Giới hạn", ["Client gate có thể bị direct API bypass", "không chứng minh identity/liveness", "ảnh pass vẫn sang provider khi Generate."], "risk")}`,
  },
  "user-journey": {
    subtitle: "Face preflight cục bộ đứng trước job và mọi image call trả phí",
    body: (p) => `${lane(45, 142, 1510, 235, "Happy path", "frontend")}${step(65, 205, 210, "1", "Chọn ảnh", ["MIME · size", "file local"], "client")}${arrow(275, 265, 310, 265, "", "frontend", { prefix: p })}${step(310, 205, 210, "2", "Kiểm tra", ["Worker MediaPipe", "đúng 1 mặt"], "quality")}${arrow(520, 265, 555, 265, "verified", "quality", { prefix: p })}${step(555, 205, 210, "3", "Xác thực", ["JWT Supabase", "guest → modal"], "frontend")}${arrow(765, 265, 800, 265, "", "backend", { prefix: p })}${step(800, 205, 210, "4", "Tạo job", ["multipart POST", "session job_id"], "backend")}${arrow(1010, 265, 1045, 265, "", "quality", { prefix: p })}${step(1045, 205, 210, "5", "Theo dõi", ["poll mỗi giây", "timeout 12 phút"], "quality")}${arrow(1255, 265, 1290, 265, "", "data", { prefix: p })}${step(1290, 205, 210, "6", "Nhận bộ", ["đúng 20 PNG", "gallery/export"], "data")}${lane(45, 420, 1510, 310, "Nhánh từ chối và phục hồi", "risk")}${node(90, 485, 350, 165, "Input rejected", ["0 mặt · >1 mặt", "worker/model/45s timeout", "fail closed · không POST"], "risk")}${arrow(440, 568, 510, 568, "chọn lại", "risk", { prefix: p })}${node(510, 485, 350, 165, "Upload sạch", ["file/preview không hợp lệ", "same-file có thể chọn lại", "stale result bị bỏ qua"], "client")}${node(930, 485, 310, 165, "Output rejected", ["raw-sheet preview", "quality_status=rejected", "CTA reset về Upload"], "risk")}${node(1275, 475, 240, 185, "Retry API", ["backend có /retry", "tái dùng artifact", "UI chưa nối"], "neutral", { dashed: true, tag: "UNWIRED", titleSize: 22, lineSize: 16 })}${arrow(1275, 610, 1190, 645, "nét đứt", "neutral", { prefix: p, dashed: true })}`,
  },
  "system-boundary": {
    subtitle: "Detector chạy trong browser; backend semantic face gate vẫn là khoảng trống",
    body: (p) => `${lane(330, 150, 870, 585, "GENSTICKER — code trong repository", "frontend")}${node(45, 300, 245, 155, "Người dùng", ["chọn chân dung", "xem / tải / export"], "client")}${node(375, 205, 300, 150, "React + Vite", ["upload UI · auth", "state · docs hub"], "frontend")}${node(745, 205, 390, 150, "FaceDetector Web Worker", ["ImageBitmap transfer · CPU/WASM", "local TFLite · exact-one verdict"], "quality", { titleSize: 23, lineSize: 17 })}${node(375, 500, 300, 150, "Generation core", ["canonical · 3 sheets", "grid gate · postprocess"], "quality")}${node(745, 500, 390, 150, "FastAPI", ["JWT · MIME · bytes · decode", "không semantic face recheck"], "backend")}${node(1240, 140, 300, 120, "jsDelivr", ["WASM runtime 1.0.1", "không nhận ảnh"], "external")}${node(1240, 285, 300, 120, "Supabase", ["Auth · Storage · data"], "data")}${node(1240, 430, 300, 120, "Image API", ["nhận selfie/reference", "sau Generate"], "external")}${node(1240, 575, 300, 120, "Telegram + QR", ["20 sticker export"], "external")}${arrow(290, 375, 375, 280, "UI", "client", { prefix: p })}${arrow(675, 280, 745, 280, "ImageBitmap", "quality", { prefix: p })}${arrow(935, 205, 1240, 200, "WASM only", "external", { prefix: p })}${arrow(940, 355, 940, 500, "faceCount = 1", "quality", { prefix: p })}${arrow(745, 575, 675, 575, "orchestrate", "backend", { prefix: p })}${arrow(1135, 540, 1240, 345, "auth/data", "data", { prefix: p })}${arrow(1135, 575, 1240, 490, "image[]", "external", { prefix: p })}${label(805, 705, "0 / >1 / error → reject cục bộ · direct API vẫn có thể bypass", { size: 18, color: "#7F1D1D", weight: 800, anchor: "middle" })}`,
  },
  "job-state": {
    title: "State machine upload và trình tạo sticker",
    subtitle: "Preflight checking/verified chạy trước generation processing",
    body: (p) => `${node(55, 315, 205, 145, "idle", ["chọn file", "chưa verified"], "client", { tag: "UPLOAD" })}${node(325, 170, 235, 155, "face_checking", ["ImageBitmap → Worker", "upload/style/CTA khóa"], "quality", { tag: "UPLOAD", titleSize: 22, lineSize: 16 })}${node(630, 170, 235, 155, "face_verified", ["detections = 1", "preview + CTA ready"], "data", { tag: "UPLOAD", titleSize: 22, lineSize: 16 })}${node(935, 170, 235, 155, "processing", ["POST generate", "poll job"], "frontend", { tag: "JOB" })}${node(1260, 170, 260, 155, "completed", ["20 stickers", "gallery / export"], "data", { tag: "JOB" })}${node(365, 515, 270, 165, "input_rejected", ["0 / >1 mặt", "worker/model/timeout", "không tạo job"], "risk", { tag: "UPLOAD", titleSize: 22, lineSize: 16 })}${node(915, 515, 280, 165, "generation_error", ["safe error/rejected", "có thể có raw preview"], "risk", { tag: "JOB", titleSize: 21, lineSize: 16 })}${node(1270, 515, 250, 165, "backend retry", ["tối đa 2 lần", "UI chưa nối"], "neutral", { tag: "UNWIRED", dashed: true, titleSize: 22, lineSize: 16 })}${arrow(260, 365, 325, 250, "select", "frontend", { prefix: p })}${arrow(560, 250, 630, 250, "1 face", "quality", { prefix: p })}${arrow(865, 250, 935, 250, "Generate", "frontend", { prefix: p })}${arrow(1170, 250, 1260, 250, "20 outputs", "data", { prefix: p })}${arrow(445, 325, 500, 515, "0/>1/error", "risk", { prefix: p })}${arrow(365, 600, 210, 450, "reselect", "risk", { prefix: p, bend: [260, 600, 210, 520] })}${arrow(1070, 325, 1055, 515, "API/QA fail", "risk", { prefix: p })}${arrow(915, 620, 260, 430, "Thử Lại → reset", "risk", { prefix: p, bend: [750, 740, 370, 700], labelX: 630, labelY: 720 })}${arrow(1195, 595, 1270, 595, "retryJob", "neutral", { prefix: p, dashed: true })}`,
  },
  "system-context": {
    subtitle: "MediaPipe CPU/WASM trên client, backend grouped pipeline không đổi",
    body: (p) => `${lane(40, 150, 390, 590, "Client device", "client")}${lane(470, 150, 650, 590, "GenSticker runtime", "frontend")}${lane(1160, 150, 390, 590, "Dịch vụ ngoài", "external")}${node(70, 210, 300, 130, "Browser UI", ["React · file/style", "auth · polling"], "client")}${node(70, 430, 300, 170, "MediaPipe Worker", ["createImageBitmap + transfer", "CPU/WASM · faceCount", "0/>1/error → local reject"], "quality", { titleSize: 23, lineSize: 16 })}${node(500, 210, 250, 140, "React + Vite", ["state machine", "static model URL"], "frontend")}${node(820, 210, 250, 140, "FastAPI /api/v1", ["JWT · technical guards", "async jobs"], "backend")}${node(500, 475, 250, 140, "BlazeFace model", ["same-origin TFLite", "~230 KB"], "quality")}${node(820, 475, 250, 140, "Grouped generator", ["canonical · 3 sheets", "grid QA · 512px"], "backend", { titleSize: 22 })}${node(1190, 185, 330, 115, "jsDelivr", ["pinned WASM runtime"], "external")}${node(1190, 325, 330, 115, "Supabase", ["Auth · Storage · PostgREST"], "data")}${node(1190, 465, 330, 115, "Compatible Image API", ["POST /images/edits"], "external")}${node(1190, 605, 330, 105, "Telegram Bot / QR", ["20 sticker export"], "external")}${arrow(370, 270, 500, 270, "UI", "client", { prefix: p })}${arrow(220, 340, 220, 430, "ImageBitmap", "quality", { prefix: p })}${arrow(370, 515, 500, 545, "model", "quality", { prefix: p })}${arrow(370, 480, 1190, 242, "WASM fetch", "external", { prefix: p, bend: [430, 400, 1120, 400], labelX: 785, labelY: 385 })}${arrow(750, 280, 820, 280, "PASS only", "frontend", { prefix: p })}${arrow(945, 350, 945, 475, "async job", "backend", { prefix: p })}${arrow(1070, 280, 1190, 382, "auth/data", "data", { prefix: p })}${arrow(1070, 545, 1190, 522, "image[]", "external", { prefix: p })}`,
  },
  "generation-sequence": {
    subtitle: "Preflight exact-one-face trước POST; pass mới phát sinh canonical + ba sheet",
    body: (p) => `${[120,340,560,780,1000,1220,1440].map((x, i) => `${label(x, 160, ["Browser UI","Face Worker","FastAPI","Pipeline","Image API","Quality","Supabase"][i], { size: 19, color: ["#164E63","#134E4A","#831843","#312E81","#7C2D12","#134E4A","#065F46"][i], weight: 800, anchor: "middle" })}<line x1="${x}" y1="178" x2="${x}" y2="790" stroke="#CBD5E1" stroke-width="2" stroke-dasharray="7 7"/>`).join("")}${arrow(120, 220, 340, 220, "ImageBitmap transfer", "quality", { prefix: p })}${arrow(340, 275, 120, 275, "0/>1/error → reject", "risk", { prefix: p })}${arrow(340, 335, 560, 335, "faceCount = 1 · POST", "frontend", { prefix: p })}${arrow(560, 390, 780, 390, "create async job", "backend", { prefix: p })}${arrow(780, 445, 1000, 445, "1 · canonical 1024²", "external", { prefix: p })}${arrow(780, 500, 1000, 500, "2 · sheet 1 / 8", "external", { prefix: p })}${arrow(780, 555, 1000, 555, "3 · sheet 2 / 8", "external", { prefix: p })}${arrow(780, 610, 1000, 610, "4 · sheet 3 / keep 4", "external", { prefix: p })}${arrow(1000, 665, 1220, 665, "raw PNG", "quality", { prefix: p })}${arrow(1220, 715, 780, 715, "crop + 20 × 512px", "quality", { prefix: p })}${arrow(780, 765, 1440, 765, "upload/insert best-effort", "data", { prefix: p })}${label(340, 310, "Model local + WASM CDN · 45s fail-closed", { size: 15, color: "#475569", weight: 700, anchor: "middle" })}`,
  },
  "roadmap-now-next-later": {
    subtitle: "Face gate MVP đã có; enforcement, test và telemetry được tách theo giai đoạn",
    body: (p) => `${lane(55, 160, 470, 590, "NOW — đã triển khai", "quality")}${lane(565, 160, 470, 590, "NEXT — làm gate đáng tin cậy", "frontend")}${lane(1075, 160, 470, 590, "LATER — đo và tối ưu", "neutral")}${node(85, 230, 410, 125, "DONE · Browser gate", ["MediaPipe CPU/WASM", "0/1/>1 verdict · fail closed"], "quality")}${node(85, 385, 410, 125, "DONE · UX/privacy", ["checking/verified/error states", "reject giữ ảnh trên thiết bị"], "quality")}${node(85, 540, 410, 135, "DONE · Documentation", ["source/model provenance", "Office + SVG/PNG synchronized"], "frontend")}${node(595, 230, 410, 125, "P1 · Automated tests", ["hook/service race + timeout", "E2E assert reject không POST"], "frontend")}${node(595, 385, 410, 125, "P1 · Backend policy", ["quyết định authoritative detector", "direct API contract + tests"], "backend")}${node(595, 540, 410, 135, "P1 · Hardening", ["pixel/decompression guard client", "CSP/CDN incident strategy"], "risk")}${node(1105, 230, 410, 125, "P2 · Telemetry", ["latency · accept/reject/error", "false reject from real images"], "neutral")}${node(1105, 385, 410, 125, "P2 · Policy", ["multi-face/occlusion thresholds", "browser compatibility matrix"], "neutral")}${node(1105, 540, 410, 135, "P2 · Runtime fallback", ["self-host/fallback WASM", "cache/version rollout"], "neutral")}`,
  },
  "screen-flow": {
    subtitle: "Upload có preflight checking/verified; input reject tách khỏi output reject",
    body: (p) => `${node(45, 280, 210, 145, "Upload", ["idle · file/style", "chưa verified"], "client")}${node(315, 280, 245, 145, "Face checking", ["Worker MediaPipe", "upload/CTA khóa"], "quality")}${node(315, 525, 245, 145, "Input rejected", ["0 / >1 mặt", "timeout / runtime error"], "risk")}${node(625, 145, 225, 140, "Auth modal", ["guest login/register"], "frontend")}${node(625, 420, 225, 140, "Processing", ["5-step progress", "raw previews"], "frontend")}${node(915, 165, 235, 145, "Gallery", ["20 cards", "download / favorite"], "data")}${node(915, 470, 235, 155, "Output rejected", ["raw comparison", "reset → upload"], "risk")}${node(1210, 145, 205, 140, "History", ["auth only", "soft delete"], "data")}${node(1210, 420, 205, 140, "Telegram", ["deep link · QR"], "external")}${node(1430, 280, 140, 145, "Docs", ["#tai-lieu", "12 files"], "frontend", { titleSize: 22, lineSize: 16 })}${arrow(255, 350, 315, 350, "select", "quality", { prefix: p })}${arrow(560, 315, 625, 215, "1 face + guest", "frontend", { prefix: p })}${arrow(560, 380, 625, 490, "1 face + auth", "frontend", { prefix: p })}${arrow(435, 425, 435, 525, "0/>1/error", "risk", { prefix: p })}${arrow(315, 610, 210, 425, "reselect", "risk", { prefix: p, bend: [255, 610, 210, 520] })}${arrow(850, 490, 915, 238, "success", "data", { prefix: p, bend: [880, 490, 880, 238] })}${arrow(850, 520, 915, 548, "failure", "risk", { prefix: p })}${arrow(1150, 220, 1210, 215, "open", "data", { prefix: p })}${arrow(1150, 255, 1210, 490, "export", "external", { prefix: p })}${arrow(915, 580, 255, 405, "Thử Lại", "risk", { prefix: p, bend: [700, 720, 400, 690], labelX: 610, labelY: 705 })}${arrow(1415, 215, 1430, 335, "header", "frontend", { prefix: p })}`,
  },
  "docs-hub-layout": {
    subtitle: "Desktop hai cột, mobile xếp dọc và visual có thể phóng to",
    body: () => `${lane(55, 165, 910, 565, "Desktop ≥ 1024px", "frontend")}${node(90, 225, 265, 445, "Sidebar", ["Search", "Category filters", "12 document cards", "DOCX/XLSX badge"], "neutral")}${node(390, 225, 535, 445, "Viewer", ["Title + source snapshot", "visual gallery + caption", "section / sheet tabs", "table + source refs", "download Office file"], "frontend")}${lane(1015, 165, 530, 565, "Mobile 390px", "client")}${node(1065, 220, 430, 110, "Hero + search", ["baseline và thống kê thu gọn"], "client")}${node(1065, 360, 430, 120, "Document carousel", ["một hàng · snap · touch scroll"], "neutral")}${node(1065, 510, 430, 160, "Viewer stacked", ["visual scroll/expand", "sheet tabs có keyboard", "download luôn hiển thị"], "frontend")}${label(635, 708, "Visual assets dùng chung cho web, Word và Excel", { size: 18, color: "#475569", weight: 700, anchor: "middle" })}`,
  },
  "quality-gates": {
    subtitle: "Source tests, face-gate smoke, Office render và browser QA trước bàn giao",
    body: (p) => `${step(55, 250, 245, "1", "Backend", ["pytest 75 cases", "mock paid providers"], "backend")}${arrow(300, 310, 360, 310, "", "quality", { prefix: p })}${step(360, 250, 245, "2", "Frontend", ["Oxlint + build", "0/1/2 face smoke"], "frontend")}${arrow(605, 310, 665, 310, "", "quality", { prefix: p })}${step(665, 250, 245, "3", "Docs build", ["6 DOCX + 6 XLSX", "20 figure pairs"], "neutral")}${arrow(910, 310, 970, 310, "", "quality", { prefix: p })}${step(970, 250, 245, "4", "Visual QA", ["mọi page/sheet", "SVG + PNG + fallback"], "quality")}${arrow(1215, 310, 1275, 310, "", "quality", { prefix: p })}${step(1275, 250, 265, "5", "Browser QA", ["desktop + 375 mobile", "console + overflow"], "client")}${node(135, 475, 370, 175, "Pass criteria", ["0 reject · 1 verified · 2 reject", "không clipping/overlap", "hash source/public khớp"], "quality")}${node(615, 475, 370, 175, "Cost/privacy boundary", ["Không gọi paid image API trong QA", "face gate CPU/WASM local", "không dùng user/runtime images"], "neutral")}${node(1095, 475, 370, 175, "Open gaps", ["Chưa có frontend unit/E2E", "direct API bypass semantic gate", "chưa có DB/provider integration"], "risk")}`,
  },
  "coverage-map": {
    subtitle: "75 backend tests + manual face-gate proof; automated frontend coverage vẫn là gap",
    body: () => `${lane(50, 155, 970, 585, "Automated backend coverage — 75 cases", "quality")}${node(80, 215, 280, 135, "Grouped · 18", ["4 calls · 4×2 split", "reject · resume"], "quality", { titleSize: 21 })}${node(390, 215, 280, 135, "Pipeline · 10", ["owner · rate · retry", "TTL · persistence"], "backend", { titleSize: 21 })}${node(700, 215, 280, 135, "API · 9", ["Bearer · MIME · owner", "cache · missing key"], "backend", { titleSize: 21 })}${node(80, 385, 280, 135, "Prompts · 9", ["cells/reserve", "invalid plans"], "frontend", { titleSize: 21 })}${node(390, 385, 280, 135, "Providers · 14", ["HTTP mocks", "multipart · billing"], "external", { titleSize: 21 })}${node(700, 385, 280, 135, "Other · 15", ["CLI · catalog", "postprocess · quality"], "neutral", { titleSize: 21 })}${node(80, 565, 900, 125, "Manual browser evidence", ["0 face → reject · 1 face → verified · 2 faces → reject · 375×667 no overflow · console clean"], "quality", { titleSize: 22, lineSize: 17 })}${lane(1060, 155, 485, 585, "Coverage gaps", "risk")}${node(1090, 215, 425, 125, "Frontend automation", ["0 unit/spec · 0 browser E2E"], "risk")}${node(1090, 370, 425, 135, "Face-gate authority", ["Direct API bypass", "backend semantic detector chưa có"], "risk")}${node(1090, 535, 425, 145, "External / non-functional", ["CDN outage · browser matrix", "Supabase/RLS · provider canary", "load · security fuzz"], "risk")}`,
  },
  "data-lifecycle": {
    subtitle: "Local preflight đứng trước upload từ giao diện; direct API lifecycle giữ nguyên",
    body: (p) => `${step(55, 235, 220, "0", "Local gate", ["File → ImageBitmap", "MediaPipe CPU/WASM"], "quality")}${arrow(275, 295, 305, 295, "1 face", "quality", { prefix: p })}${step(305, 235, 220, "1", "Upload", ["selfie → Storage", "khi user Generate"], "client")}${arrow(525, 295, 555, 295, "", "backend", { prefix: p })}${step(555, 235, 220, "2", "Generate", ["RAM job + temp", "provider refs"], "backend")}${arrow(775, 295, 805, 295, "", "data", { prefix: p })}${step(805, 235, 220, "3", "Persist", ["20 outputs", "pack + stickers"], "data")}${arrow(1025, 295, 1055, 295, "", "data", { prefix: p })}${step(1055, 235, 220, "4", "History", ["owner filter", "active packs"], "data")}${arrow(1275, 295, 1305, 295, "", "risk", { prefix: p })}${step(1305, 235, 235, "5", "Soft delete", ["row flags", "objects remain"], "risk")}${node(85, 455, 420, 190, "Rejected preflight", ["0 / >1 / detector error", "không preview hợp lệ · không POST", "ảnh ở trên thiết bị."], "quality")}${node(590, 455, 420, 190, "Accepted path", ["Model local; CDN chỉ trả WASM", "Generate mới gửi ảnh backend/provider", "retention hiện tại vẫn áp dụng."], "external")}${node(1095, 455, 420, 190, "Residual gaps", ["Direct API bypass client gate", "Storage source chưa cleanup rõ", "soft delete chưa xóa object."], "risk")}`,
  },
  "validation-boundaries": {
    title: "Exact-one face gate và validation boundaries",
    subtitle: "Technical file checks → local MediaPipe decision → backend/provider guards",
    body: (p) => `${lane(40, 145, 1520, 605, "Defense in depth", "quality")}${step(65, 205, 225, "1", "Technical", ["JPEG/PNG/WebP", "≤15 MiB"], "client")}${arrow(290, 265, 320, 265, "", "quality", { prefix: p })}${step(320, 205, 225, "2", "ImageBitmap", ["decode local", "transfer Worker"], "client")}${arrow(545, 265, 575, 265, "", "quality", { prefix: p })}${step(575, 205, 250, "3", "MediaPipe", ["BlazeFace · CPU/WASM", "conf 0.6 · suppr 0.3"], "quality")}${arrow(825, 265, 855, 265, "", "quality", { prefix: p })}${node(855, 205, 210, 120, "faceCount?", ["=== 1"], "quality", { titleSize: 24, lineSize: 18 })}${arrow(1065, 265, 1100, 265, "PASS", "quality", { prefix: p })}${step(1100, 205, 220, "4", "FastAPI", ["JWT · bytes · format", "≤40 MP · style"], "backend")}${arrow(1320, 265, 1350, 265, "", "external", { prefix: p })}${step(1350, 205, 185, "5", "Provider", ["ref limits", "decode output"], "external", { titleSize: 20 })}${node(105, 455, 320, 165, "0 mặt", ["No-face error", "không file/preview", "không POST"], "risk")}${node(465, 455, 320, 165, ">1 mặt", ["Count error", "chọn lại ảnh", "không POST"], "risk")}${node(825, 455, 320, 165, "Runtime failure", ["unsupported / worker / model", "45s timeout → fail closed", "reset worker"], "risk")}${node(1185, 435, 320, 205, "Boundary thật", ["UX/spend guard phía client", "không chứng minh person/identity/liveness", "direct API vẫn bypass", "backend technical validation độc lập"], "neutral", { titleSize: 22, lineSize: 16 })}${arrow(950, 325, 260, 455, "0", "risk", { prefix: p, bend: [950, 385, 260, 385] })}${arrow(960, 325, 625, 455, ">1", "risk", { prefix: p, bend: [960, 410, 625, 410] })}${arrow(980, 325, 985, 455, "error", "risk", { prefix: p })}`,
  },
  "repo-runtime-map": {
    subtitle: "Face service/worker/model nằm ở frontend; grouped generation và backend API giữ nguyên",
    body: (p) => `${lane(45, 150, 1510, 585, "E:\\python\\GenSticker", "neutral")}${node(80, 215, 400, 190, "frontend/", ["useImageUpload → faceDetectionService", "→ faceDetector.worker", "@mediapipe/tasks-vision 1.0.1", "public/models/blaze_face_short_range.tflite"], "frontend", { lineSize: 16 })}${node(545, 215, 300, 190, "backend/app/", ["FastAPI routers · security", "StickerPipelineService", "Supabase · Telegram"], "backend", { lineSize: 17 })}${node(910, 215, 365, 190, "sticker_generation/", ["grouped generator · prompts", "providers · postprocess", "75 backend tests"], "quality", { titleSize: 21, lineSize: 17 })}${node(1330, 215, 190, 190, "external", ["jsDelivr", "Supabase", "Image API", "Telegram"], "external", { titleSize: 22, lineSize: 16 })}${node(80, 510, 400, 145, "gen-sticker-docs/", ["manifest · 20 figure pairs", "DOCX/XLSX builders", "12 Office outputs"], "frontend")}${node(545, 510, 300, 145, "worker runtime", ["ImageBitmap · request map", "45s timeout · fail closed"], "quality")}${node(910, 510, 365, 145, "backend runtime", ["RAM/temp jobs", "pending Telegram JSON"], "risk")}${arrow(480, 310, 545, 310, "PASS → REST", "frontend", { prefix: p })}${arrow(845, 310, 910, 310, "calls core", "backend", { prefix: p })}${arrow(1275, 310, 1330, 310, "providers", "external", { prefix: p })}${arrow(280, 510, 280, 405, "docs UI", "frontend", { prefix: p })}${arrow(695, 405, 695, 510, "client state", "quality", { prefix: p })}${arrow(1090, 405, 1090, 510, "job state", "risk", { prefix: p })}`,
  },
  "risk-control-map": {
    subtitle: "Local face gate giảm upload nhầm nhưng không phải API security boundary",
    body: (p) => `${lane(50, 150, 1500, 590, "Trust boundaries và controls", "risk")}${node(80, 210, 300, 165, "TB-0 Browser", ["raw File · ImageBitmap", "MediaPipe exact-one gate", "JWT localStorage"], "client", { lineSize: 17 })}${node(440, 210, 260, 165, "TB-1 CDN", ["pinned WASM 1.0.1", "không nhận image bytes"], "external", { lineSize: 17 })}${node(760, 210, 300, 165, "TB-2 FastAPI", ["JWT · service-role", "technical image guards", "direct API entry"], "backend", { lineSize: 17 })}${node(1120, 210, 350, 165, "TB-3/4 Providers", ["Supabase Storage/data", "Image API receives portrait refs", "Telegram/QR export"], "external", { lineSize: 16 })}${arrow(380, 292, 440, 292, "WASM fetch", "external", { prefix: p })}${arrow(700, 292, 760, 292, "PASS → POST", "risk", { prefix: p })}${arrow(1060, 292, 1120, 292, "data/portrait", "risk", { prefix: p })}${node(80, 470, 320, 180, "Implemented controls", ["0/>1/error fail closed", "exact package + model hash", "bitmap close · request id · timeout", "reject path không POST qua UI"], "quality", { titleSize: 21, lineSize: 15 })}${node(455, 470, 320, 180, "Authority caveat", ["Client code có thể bị bỏ qua", "backend chưa semantic face check", "detector chỉ đếm mặt phát hiện", "không identity/liveness/person proof"], "risk", { titleSize: 21, lineSize: 15 })}${node(830, 470, 320, 180, "Release checks", ["model có trong dist + hash", "CSP/network cho jsDelivr", "0/1/2 browser matrix", "console/viewport sạch"], "frontend", { titleSize: 21, lineSize: 15 })}${node(1205, 470, 265, 180, "Next controls", ["unit/E2E no-POST", "backend policy decision", "CDN fallback", "latency/error telemetry"], "neutral", { titleSize: 21, lineSize: 15 })}`,
  },
};

for (const figure of figures) {
  const update = faceGateFigureUpdates[figure.id];
  if (update) Object.assign(figure, update);
}

async function main() {
  await fs.mkdir(SVG_DIR, { recursive: true });
  await fs.mkdir(PNG_DIR, { recursive: true });
  const index = [];
  for (const figure of figures) {
    const svg = normalizeSvg(figureShell(figure));
    const svgPath = path.join(SVG_DIR, `${figure.id}.svg`);
    const pngPath = path.join(PNG_DIR, `${figure.id}.png`);
    await fs.writeFile(svgPath, svg, "utf8");
    const png = await sharp(Buffer.from(svg))
      .flatten({ background: "#ffffff" })
      .removeAlpha()
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toBuffer();
    await fs.writeFile(pngPath, png);
    index.push({
      id: figure.id,
      title: figure.title,
      subtitle: figure.subtitle,
      svg: `assets/figures/svg/${figure.id}.svg`,
      png: `assets/figures/png/${figure.id}.png`,
      width: W,
      height: H,
    });
  }
  await fs.writeFile(path.join(FIGURE_DIR, "index.json"), `${JSON.stringify(index, null, 2)}\n`, "utf8");
  await fs.writeFile(path.join(FIGURE_DIR, "figma-board.svg"), normalizeSvg(figmaBoard()), "utf8");
  process.stdout.write(`Built ${index.length} SVG + PNG figure pairs in ${FIGURE_DIR}\n`);
}

await main();
