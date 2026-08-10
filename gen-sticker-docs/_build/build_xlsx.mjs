import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";
import JSZip from "jszip";


const BUILD_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(BUILD_DIR, "..");
const MANIFEST_PATH = path.join(ROOT, "project-docs.json");
const CONFIGURED_OUTPUT_DIR = typeof process !== "undefined" ? process.env.GENSTICKER_DOCS_OUTPUT : undefined;
const OUTPUT_DIR = CONFIGURED_OUTPUT_DIR
  ? path.resolve(CONFIGURED_OUTPUT_DIR)
  : path.join(ROOT, "originals");
const CONFIGURED_QA_DIR = typeof process !== "undefined" ? process.env.GENSTICKER_DOCS_QA : undefined;
const QA_DIR = CONFIGURED_QA_DIR
  ? path.resolve(CONFIGURED_QA_DIR)
  : path.join(os.tmpdir(), "gensticker-docs-xlsx-qa");

function writeLine(value) {
  if (typeof process !== "undefined") {
    process.stdout.write(`${value}\n`);
  } else if (globalThis.nodeRepl) {
    globalThis.nodeRepl.write(`${value}\n`);
  }
}

const COLORS = {
  primary: "#5B3DF5",
  primaryDark: "#4338CA",
  pink: "#DB2777",
  ink: "#0F172A",
  muted: "#475569",
  light: "#EEF2FF",
  lightAlt: "#F8FAFC",
  border: "#CBD5E1",
  white: "#FFFFFF",
  amber: "#F59E0B",
  red: "#DC2626",
  green: "#059669",
};


function columnName(index) {
  let value = index + 1;
  let result = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    result = String.fromCharCode(65 + remainder) + result;
    value = Math.floor((value - 1) / 26);
  }
  return result;
}


function safeSheetName(name, used) {
  const base = name.replace(/[\\/?*:[\]]/g, "-").slice(0, 31) || "Sheet";
  let candidate = base;
  let suffix = 2;
  while (used.has(candidate)) {
    const tail = `-${suffix}`;
    candidate = `${base.slice(0, 31 - tail.length)}${tail}`;
    suffix += 1;
  }
  used.add(candidate);
  return candidate;
}


function estimateColumnWidth(header, rows, colIndex) {
  const values = [header, ...rows.map((row) => String(row[colIndex] ?? ""))];
  const longest = Math.max(...values.map((value) => Math.min(value.length, 80)));
  if (colIndex === 0 && /^(ID|STT|Bước|Method|Priority)$/i.test(header)) {
    return Math.min(14, Math.max(9, longest + 2));
  }
  if (/^(Nguồn|File|Path|Source|Lệnh)$/i.test(header)) {
    return Math.min(42, Math.max(24, Math.ceil(longest * 0.58)));
  }
  return Math.min(44, Math.max(14, Math.ceil(longest * 0.56) + 3));
}


function applyPriorityHighlight(sheet, headers, rows, startRow) {
  const priorityIndex = headers.findIndex((header) => header === "Priority" || header === "Ưu tiên");
  const statusIndex = headers.findIndex((header) => header === "Trạng thái");
  rows.forEach((row, rowIndex) => {
    if (priorityIndex >= 0) {
      const priority = String(row[priorityIndex] ?? "").toUpperCase();
      const cell = sheet.getRange(`${columnName(priorityIndex)}${startRow + rowIndex}`);
      if (priority === "P0") {
        cell.format = { fill: "#FEE2E2", font: { color: COLORS.red, bold: true } };
      } else if (priority === "P1") {
        cell.format = { fill: "#FEF3C7", font: { color: "#92400E", bold: true } };
      } else if (priority === "P2") {
        cell.format = { fill: "#E0E7FF", font: { color: COLORS.primaryDark, bold: true } };
      }
    }
    if (statusIndex >= 0) {
      const status = String(row[statusIndex] ?? "").toLowerCase();
      const cell = sheet.getRange(`${columnName(statusIndex)}${startRow + rowIndex}`);
      if (status === "có" || status.includes("passed") || status.includes("đạt")) {
        cell.format = { fill: "#D1FAE5", font: { color: COLORS.green, bold: true } };
      } else if (status.includes("chưa") || status === "open") {
        cell.format = { fill: "#FEF3C7", font: { color: "#92400E", bold: true } };
      }
    }
  });
}


function buildSheet(workbook, item, sheetData, meta, usedNames, sheetIndex) {
  const name = safeSheetName(sheetData.name, usedNames);
  const sheet = workbook.worksheets.add(name);
  const headers = sheetData.headers;
  const rows = sheetData.rows;
  const lastColumn = columnName(headers.length - 1);
  const metadataLastColumn = sheetData.chart ? columnName(headers.length + 1) : lastColumn;
  const headerRow = 6;
  const firstDataRow = 7;
  const lastDataRow = Math.max(firstDataRow, firstDataRow + rows.length - 1);

  sheet.mergeCells(`A1:${metadataLastColumn}1`);
  sheet.getRange("A1").values = [[`${item.number}  /  ${item.title}`]];
  sheet.getRange(`A1:${metadataLastColumn}1`).format = {
    fill: COLORS.primaryDark,
    font: { name: "Aptos Display", size: 16, bold: true, color: COLORS.white },
    verticalAlignment: "center",
  };
  sheet.getRange(`A1:${metadataLastColumn}1`).format.rowHeight = 38;

  sheet.mergeCells(`A2:${metadataLastColumn}2`);
  sheet.getRange("A2").values = [[sheetData.summary]];
  sheet.getRange(`A2:${metadataLastColumn}2`).format = {
    fill: COLORS.light,
    font: { name: "Aptos", size: 11, color: COLORS.muted, italic: true },
    wrapText: true,
    verticalAlignment: "center",
  };
  sheet.getRange(`A2:${metadataLastColumn}2`).format.rowHeight = 30;

  sheet.mergeCells(`A3:${metadataLastColumn}3`);
  sheet.getRange("A3").values = [[
    `GS-DOC-${item.number}  •  ${meta.branch} @ ${meta.commit}  •  ${meta.verifiedAt}  •  ${item.status}`,
  ]];
  sheet.getRange(`A3:${metadataLastColumn}3`).format = {
    font: { name: "Aptos", size: 9, bold: true, color: COLORS.primaryDark },
  };

  sheet.mergeCells(`A4:${metadataLastColumn}4`);
  sheet.getRange("A4").values = [["AS-BUILT • Nội dung viết từ source hiện tại; bộ mẫu chỉ cung cấp cấu trúc trình bày."]];
  sheet.getRange(`A4:${metadataLastColumn}4`).format = {
    font: { name: "Aptos", size: 9, color: COLORS.muted },
  };

  sheet.getRange(`A${headerRow}:${lastColumn}${headerRow}`).values = [headers];
  sheet.getRange(`A${headerRow}:${lastColumn}${headerRow}`).format = {
    fill: COLORS.primary,
    font: { name: "Aptos", size: 10, bold: true, color: COLORS.white },
    wrapText: true,
    verticalAlignment: "center",
    horizontalAlignment: "left",
    borders: { preset: "all", style: "thin", color: COLORS.primaryDark },
  };
  sheet.getRange(`A${headerRow}:${lastColumn}${headerRow}`).format.rowHeight = 30;

  if (rows.length > 0) {
    sheet.getRange(`A${firstDataRow}:${lastColumn}${lastDataRow}`).values = rows;
    sheet.getRange(`A${firstDataRow}:${lastColumn}${lastDataRow}`).format = {
      font: { name: "Aptos", size: 9, color: COLORS.ink },
      wrapText: true,
      verticalAlignment: "top",
      horizontalAlignment: "left",
      borders: { preset: "all", style: "thin", color: COLORS.border },
    };
    rows.forEach((_, rowIndex) => {
      const rowNumber = firstDataRow + rowIndex;
      if (rowIndex % 2 === 1) {
        sheet.getRange(`A${rowNumber}:${lastColumn}${rowNumber}`).format.fill = COLORS.lightAlt;
      }
    });
    applyPriorityHighlight(sheet, headers, rows, firstDataRow);
    for (const formulaCell of sheetData.formulas ?? []) {
      const formulaAddress = `${columnName(formulaCell.column)}${firstDataRow + formulaCell.row}`;
      sheet.getRange(formulaAddress).formulas = [[formulaCell.formula]];
    }
    sheet.getRange(`A${firstDataRow}:${lastColumn}${lastDataRow}`).format.autofitRows();

    const tableName = `GS${item.number}${String(sheetIndex + 1).padStart(2, "0")}Table`;
    const table = sheet.tables.add(`A${headerRow}:${lastColumn}${lastDataRow}`, true, tableName);
    table.style = "TableStyleMedium2";
    table.showBandedRows = true;
    table.showFilterButton = true;

    const priorityIndex = headers.findIndex((header) => header === "Priority" || header === "Ưu tiên");
    if (priorityIndex >= 0) {
      const priorityRange = sheet.getRange(`${columnName(priorityIndex)}${firstDataRow}:${columnName(priorityIndex)}${lastDataRow}`);
      priorityRange.conditionalFormats.add("containsText", { text: "P0", format: { fill: "#FEE2E2", font: { color: COLORS.red, bold: true } } });
      priorityRange.conditionalFormats.add("containsText", { text: "P1", format: { fill: "#FEF3C7", font: { color: "#92400E", bold: true } } });
      priorityRange.conditionalFormats.add("containsText", { text: "P2", format: { fill: "#E0E7FF", font: { color: COLORS.primaryDark, bold: true } } });
    }

    if (sheetData.chart) {
      const chartLastColumn = columnName(Math.max(sheetData.chart.categoryColumn, ...sheetData.chart.valueColumns));
      const chart = sheet.charts.add(sheetData.chart.type, sheet.getRange(`A${headerRow}:${chartLastColumn}${lastDataRow}`));
      chart.title = sheetData.chart.title;
      chart.titleTextStyle.fontSize = 13;
      chart.hasLegend = true;
      chart.setPosition(`${columnName(headers.length + 1)}${headerRow}`, `${columnName(headers.length + 10)}24`);
    }
  }

  headers.forEach((header, colIndex) => {
    const width = estimateColumnWidth(header, rows, colIndex);
    sheet.getRange(`${columnName(colIndex)}1:${columnName(colIndex)}${lastDataRow}`).format.columnWidth = width;
  });

  sheet.freezePanes.freezeRows(headerRow);
  return { sheet, name };
}


async function buildVisualSheet(workbook, item, visual, figure, meta, usedNames) {
  const name = safeSheetName(visual.sheetName ?? `Visual ${figure.title}`, usedNames);
  const sheet = workbook.worksheets.add(name);
  const lastColumn = "N";

  sheet.mergeCells(`A1:${lastColumn}1`);
  sheet.getRange("A1").values = [[`${item.number}  /  ${figure.title}`]];
  sheet.getRange(`A1:${lastColumn}1`).format = {
    fill: COLORS.primaryDark,
    font: { name: "Aptos Display", size: 17, bold: true, color: COLORS.white },
    verticalAlignment: "center",
  };
  sheet.getRange(`A1:${lastColumn}1`).format.rowHeight = 38;

  sheet.mergeCells(`A2:${lastColumn}2`);
  sheet.getRange("A2").values = [[figure.subtitle]];
  sheet.getRange(`A2:${lastColumn}2`).format = {
    fill: COLORS.light,
    font: { name: "Aptos", size: 10, italic: true, color: COLORS.muted },
    wrapText: true,
    verticalAlignment: "center",
  };
  sheet.getRange(`A2:${lastColumn}2`).format.rowHeight = 30;

  // Keep a compact cell-native map behind the PNG. Excel shows the full source
  // diagram; renderers that do not support worksheet drawings still show a
  // readable structural fallback instead of an empty sheet.
  sheet.mergeCells("A4:N5");
  sheet.getRange("A4").values = [[`SƠ ĐỒ • ${figure.title}`]];
  sheet.getRange("A4:N5").format = {
    fill: COLORS.ink,
    font: { name: "Aptos Display", size: 14, bold: true, color: COLORS.white },
    verticalAlignment: "center",
    horizontalAlignment: "center",
  };

  const fallbackParts = String(figure.alt)
    .split(/;|\.(?=\s|$)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 4);
  const fallbackSlots = ["A8:F13", "I8:N13", "A18:F23", "I18:N23"];
  const fallbackFills = ["#EEF2FF", "#ECFDF5", "#FFF1F2", "#ECFEFF"];
  const fallbackBorders = ["#5B3DF5", "#059669", "#E11D48", "#0891B2"];
  fallbackSlots.forEach((slot, index) => {
    sheet.mergeCells(slot);
    sheet.getRange(slot.split(":")[0]).values = [[fallbackParts[index] ?? figure.caption]];
    sheet.getRange(slot).format = {
      fill: fallbackFills[index],
      font: { name: "Aptos", size: 10, bold: index === 0, color: COLORS.ink },
      wrapText: true,
      verticalAlignment: "center",
      horizontalAlignment: "center",
      borders: { preset: "all", style: "thin", color: fallbackBorders[index] },
    };
  });
  for (const connector of ["G10:H11", "G20:H21"]) {
    sheet.mergeCells(connector);
    sheet.getRange(connector.split(":")[0]).values = [["→"]];
    sheet.getRange(connector).format = {
      font: { name: "Aptos Display", size: 18, bold: true, color: COLORS.primary },
      horizontalAlignment: "center",
      verticalAlignment: "center",
    };
  }
  sheet.mergeCells("A28:N32");
  sheet.getRange("A28").values = [[`${figure.subtitle}\n${figure.statusLegend.join("  •  ")}`]];
  sheet.getRange("A28:N32").format = {
    fill: "#F8FAFC",
    font: { name: "Aptos", size: 9, italic: true, color: COLORS.muted },
    wrapText: true,
    verticalAlignment: "center",
    horizontalAlignment: "center",
    borders: { preset: "all", style: "thin", color: "#CBD5E1" },
  };

  const pngPath = path.join(ROOT, figure.png);
  const pngBytes = await fs.readFile(pngPath);
  sheet.images.add({
    dataUrl: `data:image/png;base64,${pngBytes.toString("base64")}`,
    anchor: { from: { row: 3, col: 0 }, extent: { widthPx: 1232, heightPx: 693 } },
  });

  sheet.mergeCells(`A42:${lastColumn}42`);
  sheet.getRange("A42").values = [[`Hình GS-DOC-${item.number} — ${figure.title}. ${figure.caption}`]];
  sheet.getRange(`A42:${lastColumn}42`).format = {
    fill: "#F8FAFC",
    font: { name: "Aptos", size: 9, italic: true, color: COLORS.muted },
    wrapText: true,
    verticalAlignment: "center",
  };
  sheet.getRange(`A42:${lastColumn}42`).format.rowHeight = 34;

  sheet.mergeCells(`A44:${lastColumn}44`);
  sheet.getRange("A44").values = [[`Mô tả sơ đồ: ${figure.alt}`]];
  sheet.getRange(`A44:${lastColumn}44`).format = {
    fill: "#ECFEFF",
    font: { name: "Aptos", size: 9, color: "#164E63" },
    wrapText: true,
    verticalAlignment: "center",
    borders: { preset: "all", style: "thin", color: "#0891B2" },
  };
  sheet.getRange(`A44:${lastColumn}44`).format.rowHeight = 42;

  sheet.mergeCells(`A46:${lastColumn}46`);
  sheet.getRange("A46").values = [[`Nguồn: ${figure.sourceRefs.join("; ")}  •  ${meta.branch} @ ${meta.commit}  •  ${meta.verifiedAt}`]];
  sheet.getRange(`A46:${lastColumn}46`).format = {
    font: { name: "Aptos", size: 8, color: COLORS.muted },
    wrapText: true,
  };

  for (let index = 0; index < 14; index += 1) {
    sheet.getRange(`${columnName(index)}1:${columnName(index)}46`).format.columnWidth = 11;
  }
  sheet.freezePanes.freezeRows(3);
  return { sheet, name };
}


async function applyPrintLayout(outputPath, visualSheetCount) {
  const zip = await JSZip.loadAsync(await fs.readFile(outputPath));
  for (let sheetIndex = 1; sheetIndex <= visualSheetCount; sheetIndex += 1) {
    const entryPath = `xl/worksheets/sheet${sheetIndex}.xml`;
    const entry = zip.file(entryPath);
    if (!entry) continue;
    let xml = await entry.async("string");
    if (!xml.includes("<x:sheetPr")) {
      xml = xml.replace(
        /(<x:worksheet\b[^>]*>)/,
        '$1<x:sheetPr><x:pageSetUpPr fitToPage="1" /></x:sheetPr>',
      );
    }
    xml = xml.replace(
      /<x:pageMargins\b[^>]*\/>/,
      '<x:printOptions horizontalCentered="1" /><x:pageMargins left="0.25" right="0.25" top="0.4" bottom="0.4" header="0.2" footer="0.2" />',
    );
    const pageSetup = '<x:pageSetup paperSize="9" orientation="landscape" fitToWidth="1" fitToHeight="1" />';
    xml = xml.includes("<x:drawing")
      ? xml.replace("<x:drawing", `${pageSetup}<x:drawing`)
      : xml.replace(/<\/x:worksheet>$/, `${pageSetup}</x:worksheet>`);
    zip.file(entryPath, xml);
  }
  const outputBytes = await zip.generateAsync({
    type: "uint8array",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  await fs.writeFile(outputPath, outputBytes);
}


async function buildWorkbook(item, meta) {
  const workbook = Workbook.create();
  const usedNames = new Set();
  const renderedSheets = [];
  const payload = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  for (const visual of item.visuals ?? []) {
    const figure = payload.figures[visual.figureId];
    renderedSheets.push(await buildVisualSheet(workbook, item, visual, figure, meta, usedNames));
  }
  for (const [sheetIndex, sheetData] of item.sheets.entries()) {
    const result = buildSheet(workbook, item, sheetData, meta, usedNames, sheetIndex);
    renderedSheets.push(result);
  }

  await fs.mkdir(OUTPUT_DIR, { recursive: true });
  await fs.mkdir(QA_DIR, { recursive: true });

  for (const { sheet, name } of renderedSheets) {
    const preview = await workbook.render({
      sheetName: name,
      autoCrop: "all",
      scale: 1,
      format: "png",
    });
    const safeName = `${item.number}-${name}`.replace(/[^A-Za-z0-9._-]+/g, "-");
    await fs.writeFile(
      path.join(QA_DIR, `${safeName}.png`),
      new Uint8Array(await preview.arrayBuffer()),
    );
  }

  const exported = await SpreadsheetFile.exportXlsx(workbook);
  const outputPath = path.join(OUTPUT_DIR, item.filename);
  await exported.save(outputPath);
  await applyPrintLayout(outputPath, item.visuals?.length ?? 0);
  await fs.rm(`${outputPath}.inspect.ndjson`, { force: true });
  return outputPath;
}


async function main() {
  const payload = JSON.parse(await fs.readFile(MANIFEST_PATH, "utf8"));
  const built = [];
  for (const item of payload.documents) {
    if (item.kind === "XLSX") {
      built.push(await buildWorkbook(item, payload.meta));
    }
  }
  for (const outputPath of built) {
    writeLine(outputPath);
  }
  writeLine(`QA previews: ${QA_DIR}`);
}


try {
  await main();
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  if (typeof process !== "undefined") {
    process.stderr.write(`BUILD_XLSX_ERROR: ${message}\n`);
    process.exitCode = 1;
  } else {
    throw error;
  }
}
