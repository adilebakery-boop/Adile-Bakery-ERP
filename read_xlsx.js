const xl = require('exceljs');
(async () => {
  const wb = new xl.Workbook();

  // Single branch file - (3) has "Main Branch"
  let fname = 'C:\\Users\\dell\\Downloads\\New folder\\yearly-report-2026-05-12 (3).xlsx';
  await wb.xlsx.readFile(fname);
  console.log('=== SINGLE BRANCH (Main Branch) ===');
  let sheet = wb.worksheets[0];
  for (let i = 1; i <= 30; i++) {
    const row = sheet.getRow(i);
    if (row.values && row.values.some(v => v !== null && v !== undefined)) {
      console.log(`Row ${i}:`, JSON.stringify(row.values));
    }
  }

  console.log('\n\n=== ALL BRANCHES ===');
  const wb2 = new xl.Workbook();
  fname = 'C:\\Users\\dell\\Downloads\\New folder\\yearly-report-2026-05-12 (2).xlsx';
  await wb2.xlsx.readFile(fname);
  sheet = wb2.worksheets[0];
  for (let i = 1; i <= 30; i++) {
    const row = sheet.getRow(i);
    if (row.values && row.values.some(v => v !== null && v !== undefined)) {
      console.log(`Row ${i}:`, JSON.stringify(row.values));
    }
  }
})();