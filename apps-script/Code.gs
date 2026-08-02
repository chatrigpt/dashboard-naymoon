const SHEET_ID = '1adYU679Xib_KnwT8WiOFB70AgaX-ng5rA-uq0AmVfgw';
const SHEET_NAME = ''; // Laisser vide pour utiliser le premier onglet.
const API_KEY = PropertiesService.getScriptProperties().getProperty('SHEET_API_KEY');
const STATUS_HEADER = 'status';
const ALLOWED_STATUSES = ['pending', 'paid', 'cancelled'];

function jsonOutput(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function getSheet() {
  const spreadsheet = SpreadsheetApp.openById(SHEET_ID);
  const sheet = SHEET_NAME ? spreadsheet.getSheetByName(SHEET_NAME) : spreadsheet.getSheets()[0];
  if (!sheet) throw new Error('Onglet Google Sheet introuvable.');
  return sheet;
}

function verifyKey(key) {
  if (!API_KEY) throw new Error('SHEET_API_KEY absent dans les propriétés du script.');
  if (String(key || '') !== API_KEY) throw new Error('Clé API invalide.');
}

function ensureStatusColumn(sheet) {
  const lastColumn = Math.max(sheet.getLastColumn(), 1);
  const headers = sheet.getRange(1, 1, 1, lastColumn).getDisplayValues()[0].map(v => String(v).trim());
  let index = headers.findIndex(h => h.toLowerCase() === STATUS_HEADER);
  if (index === -1) {
    index = lastColumn;
    sheet.getRange(1, index + 1).setValue(STATUS_HEADER);
  }
  return index + 1;
}

function listRequests() {
  const sheet = getSheet();
  const statusColumn = ensureStatusColumn(sheet);
  const lastRow = sheet.getLastRow();
  const lastColumn = Math.max(sheet.getLastColumn(), statusColumn);
  if (lastRow < 2) return [];

  const values = sheet.getRange(1, 1, lastRow, lastColumn).getDisplayValues();
  const headers = values[0].map(v => String(v).trim());

  return values.slice(1).map((row, index) => {
    const object = { _row: index + 2 };
    headers.forEach((header, columnIndex) => {
      if (header) object[header] = row[columnIndex] ?? '';
    });
    object.status = String(object.status || 'pending').toLowerCase();
    if (!ALLOWED_STATUSES.includes(object.status)) object.status = 'pending';
    return object;
  }).reverse();
}

function updateStatus(rowNumber, status) {
  const sheet = getSheet();
  const normalized = String(status || '').toLowerCase();
  const row = Number(rowNumber);
  if (!Number.isInteger(row) || row < 2 || row > sheet.getLastRow()) throw new Error('Ligne invalide.');
  if (!ALLOWED_STATUSES.includes(normalized)) throw new Error('Statut invalide.');
  const statusColumn = ensureStatusColumn(sheet);
  sheet.getRange(row, statusColumn).setValue(normalized);
  SpreadsheetApp.flush();
  return { rowNumber: row, status: normalized };
}

function doGet(e) {
  try {
    verifyKey(e && e.parameter && e.parameter.key);
    const action = String((e && e.parameter && e.parameter.action) || 'list');
    if (action !== 'list') throw new Error('Action inconnue.');
    return jsonOutput({ ok: true, rows: listRequests(), updatedAt: new Date().toISOString() });
  } catch (error) {
    return jsonOutput({ ok: false, error: error.message });
  }
}

function doPost(e) {
  try {
    const payload = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    verifyKey(payload.key);
    if (payload.action !== 'updateStatus') throw new Error('Action inconnue.');
    return jsonOutput({ ok: true, result: updateStatus(payload.rowNumber, payload.status) });
  } catch (error) {
    return jsonOutput({ ok: false, error: error.message });
  }
}
