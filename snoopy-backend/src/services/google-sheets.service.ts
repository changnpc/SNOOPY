import { sheets_v4 } from 'googleapis';
import { sheetsClient, SPREADSHEET_ID } from '../config/sheets.config';

// ─── Types ──────────────────────────────────────────────────
type SheetRow = string[];
type SheetData = SheetRow[];

// ─── Exponential Backoff Retry ───────────────────────────────
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 3): Promise<T> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err: any) {
      const isRateLimit = err?.code === 429 || err?.status === 429;
      if (isRateLimit && attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000 + Math.random() * 500;
        console.warn(`[Sheets] Rate limit hit. Retry ${attempt + 1}/${maxRetries} in ${delay}ms`);
        await new Promise(r => setTimeout(r, delay));
      } else {
        throw err;
      }
    }
  }
  throw new Error('Max retries exceeded');
}

// ─── Simple In-Memory Cache (for Teams) ─────────────────────
const cache = new Map<string, { data: SheetData; expiresAt: number }>();

function getCache(key: string): SheetData | null {
  const entry = cache.get(key);
  if (!entry || Date.now() > entry.expiresAt) { cache.delete(key); return null; }
  return entry.data;
}
function setCache(key: string, data: SheetData, ttlMs = 300_000): void {
  cache.set(key, { data, expiresAt: Date.now() + ttlMs });
}
export function invalidateCache(sheetName: string): void {
  cache.delete(sheetName);
}

// ─── Core Read ───────────────────────────────────────────────
// Reads are cached by default (TTL 5 min). Every write helper below calls
// invalidateCache(), so a single-instance backend never serves stale data
// after its own writes. Pass useCache=false to force a fresh read.
export async function readSheet(
  sheetName: string,
  useCache = true
): Promise<SheetData> {
  if (useCache) {
    const cached = getCache(sheetName);
    if (cached) return cached;
  }

  const rows = await withRetry(() =>
    sheetsClient.spreadsheets.values.get({
      spreadsheetId: SPREADSHEET_ID(),
      range: sheetName,
    })
  );

  const data: SheetData = (rows.data.values ?? []) as SheetData;
  if (useCache) setCache(sheetName, data);
  return data;
}

// ─── Batch Read ──────────────────────────────────────────────
export async function batchReadSheets(
  sheetNames: string[]
): Promise<Record<string, SheetData>> {
  const ranges = sheetNames.map(s => s);
  const res = await withRetry(() =>
    sheetsClient.spreadsheets.values.batchGet({
      spreadsheetId: SPREADSHEET_ID(),
      ranges,
    })
  );

  const result: Record<string, SheetData> = {};
  (res.data.valueRanges ?? []).forEach((vr, i) => {
    result[sheetNames[i]] = (vr.values ?? []) as SheetData;
  });
  return result;
}

// ─── Get All Rows (excluding header) ────────────────────────
export async function getAllRows(
  sheetName: string,
  useCache = true
): Promise<SheetData> {
  const rows = await readSheet(sheetName, useCache);
  return rows.slice(1); // skip header row
}

// ─── Get Header ──────────────────────────────────────────────
export async function getHeaders(sheetName: string): Promise<string[]> {
  const rows = await readSheet(sheetName);
  return (rows[0] ?? []) as string[];
}

// ─── Row → Object mapper ─────────────────────────────────────
export function rowToObject(headers: string[], row: SheetRow): Record<string, string> {
  const obj: Record<string, string> = {};
  headers.forEach((h, i) => { obj[h] = row[i] ?? ''; });
  return obj;
}

// ─── Object → Row (ordered by headers) ──────────────────────
export function objectToRow(headers: string[], obj: Record<string, unknown>): SheetRow {
  return headers.map(h => {
    const v = obj[h];
    if (v === null || v === undefined) return '';
    return String(v);
  });
}

// ─── Append Row ──────────────────────────────────────────────
export async function appendRow(
  sheetName: string,
  row: SheetRow
): Promise<void> {
  await withRetry(() =>
    sheetsClient.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID(),
      range: `${sheetName}!A:A`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: [row] },
    })
  );
  invalidateCache(sheetName);
}

// ─── Append Multiple Rows (single API call) ──────────────────
export async function appendRows(
  sheetName: string,
  rows: SheetRow[]
): Promise<void> {
  if (rows.length === 0) return;
  await withRetry(() =>
    sheetsClient.spreadsheets.values.append({
      spreadsheetId: SPREADSHEET_ID(),
      range: `${sheetName}!A:A`,
      valueInputOption: 'RAW',
      insertDataOption: 'INSERT_ROWS',
      requestBody: { values: rows },
    })
  );
  invalidateCache(sheetName);
}

// ─── Update Row by index (1-based, including header = row 1) ─
export async function updateRow(
  sheetName: string,
  rowIndex: number,   // 1-based (row 2 = first data row)
  row: SheetRow
): Promise<void> {
  const range = `${sheetName}!A${rowIndex}`;
  await withRetry(() =>
    sheetsClient.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID(),
      range,
      valueInputOption: 'RAW',
      requestBody: { values: [row] },
    })
  );
  invalidateCache(sheetName);
}

// ─── Batch Update Multiple Rows ──────────────────────────────
export async function batchUpdateRows(
  sheetName: string,
  updates: { rowIndex: number; row: SheetRow }[]
): Promise<void> {
  if (updates.length === 0) return;
  const data: sheets_v4.Schema$ValueRange[] = updates.map(({ rowIndex, row }) => ({
    range: `${sheetName}!A${rowIndex}`,
    values: [row],
  }));

  await withRetry(() =>
    sheetsClient.spreadsheets.values.batchUpdate({
      spreadsheetId: SPREADSHEET_ID(),
      requestBody: { valueInputOption: 'RAW', data },
    })
  );
  invalidateCache(sheetName);
}

// ─── Find Row by field value ─────────────────────────────────
export async function findRowIndex(
  sheetName: string,
  colIndex: number,
  value: string
): Promise<number> {
  const rows = await readSheet(sheetName);
  const idx = rows.findIndex((row, i) => i > 0 && row[colIndex] === value);
  return idx === -1 ? -1 : idx + 1; // return 1-based sheet row index
}

// ─── Find Row by field value → return object ─────────────────
export async function findOne<T>(
  sheetName: string,
  fieldName: string,
  value: string,
  useCache = true
): Promise<{ data: T; rowIndex: number } | null> {
  const rows = await readSheet(sheetName, useCache);
  const headers = rows[0] as string[];
  const colIdx = headers.indexOf(fieldName);
  if (colIdx === -1) return null;

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][colIdx] === value) {
      return {
        data: rowToObject(headers, rows[i] as SheetRow) as T,
        rowIndex: i + 1,
      };
    }
  }
  return null;
}

// ─── Find All matching rows ──────────────────────────────────
export async function findMany<T>(
  sheetName: string,
  filter: Partial<Record<string, string>>,
  useCache = true
): Promise<T[]> {
  const rows = await readSheet(sheetName, useCache);
  if (rows.length < 2) return [];

  const headers = rows[0] as string[];
  // Resolve each filter key's column index once (not per row).
  const conditions = Object.entries(filter)
    .filter(([, v]) => v !== undefined)
    .map(([key, val]) => ({ idx: headers.indexOf(key), val }));

  return rows.slice(1)
    .filter(row => conditions.every(c => c.idx !== -1 && row[c.idx] === c.val))
    .map(row => rowToObject(headers, row as SheetRow) as T);
}

// ─── Get all rows as typed objects ───────────────────────────
export async function findAll<T>(
  sheetName: string,
  useCache = true
): Promise<T[]> {
  const rows = await readSheet(sheetName, useCache);
  if (rows.length < 2) return [];
  const headers = rows[0] as string[];
  return rows.slice(1).map(row => rowToObject(headers, row as SheetRow) as T);
}

// ─── Check duplicate with multi-key ──────────────────────────
export async function checkDuplicate(
  sheetName: string,
  filter: Record<string, string>
): Promise<boolean> {
  const rows = await readSheet(sheetName);
  if (rows.length < 2) return false;
  const headers = rows[0] as string[];
  // Resolve each filter key's column index once (not per row).
  const conditions = Object.entries(filter)
    .map(([key, val]) => ({ idx: headers.indexOf(key), val }));

  return rows.slice(1).some(row =>
    conditions.every(c => c.idx !== -1 && row[c.idx] === c.val)
  );
}
