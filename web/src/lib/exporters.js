import { SUBSTATE_ORDER, summariseBySubstate } from './manifest.js';

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoke on the next tick so the download has definitely started.
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

const stamp = () => new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');

/* ------------------------------------------------------------------
   1. Serials-only CSV — no headers, no extra columns, one per line.
   ------------------------------------------------------------------ */
export function exportScannedSerialsCsv(scannedItems) {
  const serials = scannedItems.map((item) => item.scannedSn).filter(Boolean);
  // CRLF keeps Excel happy when the file is opened directly.
  const blob = new Blob([serials.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
  triggerDownload(blob, `Scanned_Serials_${stamp()}.csv`);
  return serials.length;
}

/* ------------------------------------------------------------------
   2. Full stock-count workbook matching the existing template.
   ------------------------------------------------------------------ */

const TEMPLATE_HEADERS = [
  '1st scan serial No.',
  'Serial from ticket',
  'Model catagory',
  'Model (Matches Column B)',
  'State',
  'Substate',
  '1st check (formula based)',
];

const COLUMN_WIDTHS = [20, 20, 18, 40, 12, 22, 24];

const GOLD = 'FFFFD966';
const PEACH = 'FFFCE4D6';
const GREEN = 'FFC6EFCE';
const RED = 'FFFFC7CE';
const YELLOW = 'FFFFFF00';

const thin = { style: 'thin', color: { argb: 'FFBFBFBF' } };
const BORDER = { top: thin, left: thin, bottom: thin, right: thin };

function decodeDataUrl(dataUrl) {
  const match = /^data:image\/(png|jpeg|jpg|gif);base64,(.+)$/i.exec(dataUrl || '');
  if (!match) return null;
  const ext = match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
  return { extension: ext, base64: match[2] };
}

/** Builds the workbook buffer. Split from the download so it can be tested headlessly. */
export async function buildStockCountWorkbook(scannedItems, screenshots = [], meta = {}) {
  const ExcelJS = (await import('exceljs')).default || (await import('exceljs'));
  const workbook = new ExcelJS.Workbook();
  workbook.creator = meta.operatorName || 'Operator';
  workbook.created = new Date();

  const sheet = workbook.addWorksheet('Stock Count', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  sheet.columns = COLUMN_WIDTHS.map((width) => ({ width }));

  // --- header row -------------------------------------------------
  const header = sheet.getRow(1);
  TEMPLATE_HEADERS.forEach((title, i) => {
    const cell = header.getCell(i + 1);
    cell.value = title;
    cell.font = { bold: true, size: 11 };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: GOLD } };
    cell.border = BORDER;
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  });
  header.height = 28;

  // --- data rows --------------------------------------------------
  scannedItems.forEach((item, index) => {
    const rowNumber = index + 2;
    const row = sheet.getRow(rowNumber);
    const matched = item.matchStatus === 'TRUE';

    row.getCell(1).value = item.scannedSn || '';
    row.getCell(2).value = matched ? item.serialFromticket : '';
    row.getCell(3).value = matched ? item.category : '';
    row.getCell(4).value = matched ? item.model : '';
    row.getCell(5).value = matched ? item.state : '';
    row.getCell(6).value = matched ? item.substate : '';

    // Kept formula-driven, as in the original sheet, so edits recalculate.
    row.getCell(7).value = {
      formula: `IF(EXACT(TRIM(A${rowNumber}),TRIM(B${rowNumber})),"Match","No Match")`,
      result: matched ? 'Match' : 'No Match',
    };

    for (let c = 1; c <= 7; c++) row.getCell(c).border = BORDER;
    row.getCell(7).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: matched ? PEACH : RED } };
    row.getCell(7).alignment = { horizontal: 'center' };
    if (!matched) {
      row.getCell(1).font = { bold: true, color: { argb: 'FF9C0006' } };
    }
  });

  const lastRow = scannedItems.length + 1;
  const matchedCount = scannedItems.filter((i) => i.matchStatus === 'TRUE').length;

  // --- match-rate footer ------------------------------------------
  const footerRow = lastRow + 2;
  const pctCell = sheet.getCell(`A${footerRow}`);
  pctCell.value = scannedItems.length ? matchedCount / scannedItems.length : 0;
  pctCell.numFmt = '0.0%';
  pctCell.font = { bold: true, size: 14 };
  pctCell.alignment = { horizontal: 'center' };
  pctCell.border = BORDER;

  const verdictCell = sheet.getCell(`B${footerRow}`);
  const allMatched = scannedItems.length > 0 && matchedCount === scannedItems.length;
  verdictCell.value = allMatched ? 'Match' : `${scannedItems.length - matchedCount} deviation(s)`;
  verdictCell.font = { bold: true, size: 12, color: { argb: allMatched ? 'FF006100' : 'FF9C0006' } };
  verdictCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: allMatched ? GREEN : RED } };
  verdictCell.alignment = { horizontal: 'center' };
  verdictCell.border = BORDER;

  // --- Substate / Qty summary (mirrors the block in the template) ---
  const summary = summariseBySubstate(scannedItems.filter((i) => i.matchStatus === 'TRUE'));
  const SUMMARY_COL = 9; // column I
  const summaryHeaderRow = 1;

  const writeSummaryCell = (rowNum, colOffset, value, opts = {}) => {
    const cell = sheet.getRow(rowNum).getCell(SUMMARY_COL + colOffset);
    cell.value = value;
    cell.border = BORDER;
    if (opts.fill) cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: opts.fill } };
    if (opts.bold) cell.font = { bold: true };
    return cell;
  };

  writeSummaryCell(summaryHeaderRow, 0, 'Substate', { fill: YELLOW, bold: true });
  writeSummaryCell(summaryHeaderRow, 1, 'Qty', { fill: YELLOW, bold: true });

  summary.forEach((entry, i) => {
    writeSummaryCell(summaryHeaderRow + 1 + i, 0, entry.label);
    writeSummaryCell(summaryHeaderRow + 1 + i, 1, entry.qty);
  });

  const totalRow = summaryHeaderRow + 1 + summary.length;
  writeSummaryCell(totalRow, 0, 'total', { fill: YELLOW, bold: true });
  writeSummaryCell(totalRow, 1, matchedCount, { fill: YELLOW, bold: true });

  sheet.getColumn(SUMMARY_COL).width = 24;
  sheet.getColumn(SUMMARY_COL + 1).width = 10;

  // --- pasted screenshots, stacked down the right-hand side --------
  let imageTopRow = totalRow + 2;
  screenshots.forEach((shot) => {
    const decoded = decodeDataUrl(shot.dataUrl);
    if (!decoded) return;
    const imageId = workbook.addImage({ base64: decoded.base64, extension: decoded.extension });
    const width = Math.min(shot.width || 900, 900);
    const scale = width / (shot.width || width);
    const height = Math.round((shot.height || 400) * scale);
    sheet.addImage(imageId, {
      tl: { col: SUMMARY_COL - 1, row: imageTopRow - 1 },
      ext: { width, height },
    });
    // ~20px per default row; leave a gap so stacked shots don't collide.
    imageTopRow += Math.ceil(height / 20) + 2;
  });

  const buffer = await workbook.xlsx.writeBuffer();
  return { buffer, rows: scannedItems.length, matched: matchedCount, images: screenshots.length };
}

export async function exportStockCountTemplate(scannedItems, screenshots = [], meta = {}) {
  const { buffer, rows, matched, images } = await buildStockCountWorkbook(scannedItems, screenshots, meta);
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  triggerDownload(blob, `Stock_Count_EMEA_${stamp()}.xlsx`);
  return { rows, matched, images };
}

export { SUBSTATE_ORDER };
