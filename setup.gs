/**
 * Setup.gs - Inisialisasi Database Google Sheets
 * Jalankan fungsi initDatabase() satu kali di Apps Script editor.
 */
function initDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  const schemas = {
    Transactions: [
      'transaction_id',
      'date',
      'type',
      'category',
      'amount',
      'need_want',
      'source',
      'note',
      'created_at',
    ],
    Budgets: ['budget_id', 'month', 'category', 'limit_amount', 'created_at'],
    Goals: [
      'goal_id',
      'name',
      'target_amount',
      'current_amount',
      'deadline',
      'status',
      'created_at',
    ],
    Investments: [
      'investment_id',
      'asset_name',
      'asset_type',
      'initial_amount',
      'current_value',
      'date',
      'note',
    ],
    Business: [
      'business_id',
      'project_name',
      'capital',
      'revenue',
      'profit',
      'date',
      'note',
    ],
    Settings: ['setting', 'value'],
  };

  Object.keys(schemas).forEach((sheetName) => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
    }
    // Set header jika masih kosong
    if (sheet.getLastRow() === 0) {
      sheet.appendRow(schemas[sheetName]);
      sheet.getRange(1, 1, 1, schemas[sheetName].length).setFontWeight('bold');
      sheet.setFrozenRows(1);
    }
  });

  // Isi default settings jika belum ada
  const settingsSheet = ss.getSheetByName('Settings');
  if (settingsSheet.getLastRow() <= 1) {
    settingsSheet.appendRow(['currency', 'IDR']);
    settingsSheet.appendRow(['default_budget_method', 'monthly']);
    settingsSheet.appendRow(['daily_limit_method', 'automatic']);
  }

  Logger.log('Inisialisasi database CASHFLOW selesai.');
}
