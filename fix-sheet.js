require('dotenv').config();
const { google } = require('googleapis');

async function fix() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  // 1. Read current data to debug
  console.log('📋 Reading current sheet data...\n');
  try {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Productos!A1:K10',
    });
    const rows = res.data.values || [];
    rows.forEach((row, i) => {
      console.log(`  Row ${i + 1}: [${row.join(' | ')}]`);
    });
  } catch (e) {
    console.log('  Error reading:', e.message);
  }

  // 2. Clear and rewrite with correct format
  console.log('\n🔧 Fixing data...\n');

  await sheets.spreadsheets.values.clear({
    spreadsheetId,
    range: 'Productos!A1:K100',
  });

  // Headers in Row 1
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Productos!A1:K1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['ID', 'Nombre', 'Categoría', 'Precio', 'PrecioOriginal', 'Stock', 'Color', 'Emoji', 'Badge', 'Activo', 'Descripción']]
    }
  });

  // Sample products in Row 2+
  const products = [
    [1,  'Vestido Rojo Elegante',  'Vestidos',    25000, 55000, 20, '#FFB6C1', '👗', 'SALE',  'Sí', 'Vestido elegante rojo'],
    [2,  'Blusa Romántica',        'Blusas',      28000, '',    8,  '#FF69B4', '👚', 'NEW',   'Sí', 'Blusa con volados'],
    [3,  'Falda Plisada',          'Faldas',      32000, 38000, 5,  '#FFD1DC', '🩱', 'SALE',  'Sí', 'Falda plisada talle alto'],
    [4,  'Pantalón Palazzo',       'Pantalones',  38000, '',    15, '#FFC0CB', '👖', '',      'Sí', 'Pantalón palazzo tiro alto'],
    [5,  'Campera Jean Rosa',      'Abrigos',     52000, 65000, 3,  '#FF85A2', '🧥', 'SALE',  'Sí', 'Campera jean oversize'],
    [6,  'Top Crop Básico',        'Tops',        18000, '',    20, '#FFB6C1', '👕', 'NEW',   'Sí', 'Top crop de algodón'],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Productos!A2:K7',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: products }
  });

  console.log('✅ Sheet fixed! 6 products with correct format.\n');
  console.log('Key rules:');
  console.log('  - Precio: just numbers, no $ sign → 25000');
  console.log('  - PrecioOriginal: number or leave EMPTY (not "null")');
  console.log('  - Badge: SALE, NEW, or leave EMPTY (not "null")');
  console.log('  - Activo: must be "Sí" (not TRUE/FALSE)');
}

fix().catch(err => {
  console.error('❌ Error:', err.message);
});
