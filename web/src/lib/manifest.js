/**
 * Parsing for the ALM / Ticket queue stock export.
 *
 * The real export ships five columns — Serial number, Model category,
 * Display name, State, Substate — which become columns B..F of the stock
 * count template. Column A (scanned serial) and column G (check) are
 * produced by scanning, not by the import.
 *
 * Header matching is deliberately tolerant: these exports get re-saved by
 * hand and column titles drift ("Serial No.", "Model", "Sub state", …).
 */

const COLUMN_ALIASES = {
  serial: ['serial number', 'serial no', 'serial no.', 'serial', 'serial from ticket', 'serialnumber'],
  category: ['model category', 'model catagory', 'category', 'model cat'],
  model: ['display name', 'model', 'model (matches column b)', 'display', 'description'],
  state: ['state', 'status'],
  substate: ['substate', 'sub state', 'sub-state'],
};

const normaliseHeader = (h) => String(h || '').trim().toLowerCase().replace(/\s+/g, ' ');

export const normaliseSerial = (s) => String(s ?? '').trim().toUpperCase();

function buildHeaderMap(headerRow) {
  const map = {};
  headerRow.forEach((raw, index) => {
    const header = normaliseHeader(raw);
    if (!header) return;
    for (const [field, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (map[field] !== undefined) continue;
      if (aliases.includes(header)) {
        map[field] = index;
        return;
      }
    }
  });
  return map;
}

/**
 * @returns {{ items: Array, warnings: string[], headerMap: object }}
 */
export function parseManifestRows(rows) {
  const warnings = [];
  if (!rows || rows.length === 0) {
    return { items: [], warnings: ['The file is empty.'], headerMap: {} };
  }

  // Tolerate a few junk/title rows above the real header.
  let headerIndex = rows.findIndex((row) => {
    const map = buildHeaderMap(row);
    return map.serial !== undefined;
  });
  if (headerIndex === -1) headerIndex = 0;

  const headerMap = buildHeaderMap(rows[headerIndex]);
  if (headerMap.serial === undefined) {
    return {
      items: [],
      warnings: ['No serial-number column found. Expected a column named "Serial number".'],
      headerMap,
    };
  }

  ['category', 'model', 'state', 'substate'].forEach((field) => {
    if (headerMap[field] === undefined) warnings.push(`No "${field}" column found — it will be blank on export.`);
  });

  const seen = new Set();
  const items = [];
  let duplicates = 0;

  rows.slice(headerIndex + 1).forEach((row) => {
    const serial = normaliseSerial(row[headerMap.serial]);
    if (!serial) return;
    if (seen.has(serial)) {
      duplicates += 1;
      return;
    }
    seen.add(serial);
    items.push({
      serial,
      category: String(row[headerMap.category] ?? '').trim(),
      model: String(row[headerMap.model] ?? '').trim(),
      state: String(row[headerMap.state] ?? '').trim(),
      substate: String(row[headerMap.substate] ?? '').trim(),
    });
  });

  if (duplicates > 0) warnings.push(`${duplicates} duplicate serial${duplicates === 1 ? '' : 's'} in the file were ignored.`);
  if (items.length === 0) warnings.push('No rows with a serial number were found.');

  return { items, warnings, headerMap };
}

/** Reads a File/Blob into manifest items. Accepts .xlsx, .xls and .csv. */
export async function parseManifestFile(file) {
  const XLSX = await import('xlsx');
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) return { items: [], warnings: ['The workbook has no sheets.'], headerMap: {} };
  const rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { header: 1, defval: '', blankrows: false });
  const result = parseManifestRows(rows);
  return { ...result, sheetName };
}

/** Fixed ordering for the summary block, so the template is stable run to run. */
export const SUBSTATE_ORDER = [
  'Available',
  'Damaged',
  'Legal Hold',
  'New',
  'Pending disposal',
  'Pending Repair',
  'Reserved',
  'Retention - 30 Days',
  'Retention - 90 Days',
];

export function summariseBySubstate(scannedItems) {
  const counts = new Map(SUBSTATE_ORDER.map((s) => [s.toLowerCase(), 0]));
  const extras = new Map();

  scannedItems.forEach((item) => {
    const key = String(item.substate || '').trim();
    if (!key || key === 'N/A') return;
    const lower = key.toLowerCase();
    if (counts.has(lower)) counts.set(lower, counts.get(lower) + 1);
    else extras.set(key, (extras.get(key) || 0) + 1);
  });

  const rows = SUBSTATE_ORDER.map((label) => ({ label, qty: counts.get(label.toLowerCase()) || 0 }));
  extras.forEach((qty, label) => rows.push({ label, qty }));
  return rows;
}
