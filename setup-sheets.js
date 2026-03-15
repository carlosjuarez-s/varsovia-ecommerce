/**
 * LUMIÈRE — Google Sheets Setup Script
 * 
 * Corre este script UNA VEZ para crear y poblar el spreadsheet con los productos iniciales.
 * 
 * Uso:
 *   node scripts/setup-sheets.js
 */

require('dotenv').config();
const { google } = require('googleapis');

async function setup() {
  console.log('🚀 Configurando Google Sheets para LUMIÈRE...\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets', 'https://www.googleapis.com/auth/drive'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const drive  = google.drive({ version: 'v3', auth });

  // ── 1. Crear Spreadsheet ─────────────────────────────────
  const spreadsheet = await sheets.spreadsheets.create({
    requestBody: {
      properties: { title: 'LUMIÈRE — Catálogo & Pedidos' },
      sheets: [
        { properties: { title: 'Productos', sheetId: 0 } },
        { properties: { title: 'Pedidos',   sheetId: 1 } },
        { properties: { title: 'Dashboard', sheetId: 2 } },
      ]
    }
  });

  const spreadsheetId = spreadsheet.data.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;
  console.log(`✅ Spreadsheet creado: ${spreadsheetUrl}`);
  console.log(`   ID: ${spreadsheetId}\n`);

  // ── 2. Headers Productos ─────────────────────────────────
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Productos!A1:K1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['ID', 'Nombre', 'Categoría', 'Precio', 'PrecioOriginal', 'Stock', 'Color', 'Emoji', 'Badge', 'Activo', 'Descripción']]
    }
  });

  // ── 3. Productos iniciales ───────────────────────────────
  const products = [
    [1, 'Vestido Claudine',    'vestidos',   28900, 35000, 12, '#D4B5A0', '👗', 'Nuevo',    'Sí', 'Vestido midi con escote en V'],
    [2, 'Top Celestine',       'tops',       12500, '',    20, '#B8C4BB', '👚', '',         'Sí', 'Top de lino con tiras'],
    [3, 'Pantalón Wide Leg',   'pantalones', 19800, '',    8,  '#C5BCCA', '👖', 'Tendencia','Sí', 'Pantalón palazzo tiro alto'],
    [4, 'Vestido Midi Floral', 'vestidos',   32500, 40000, 6,  '#D4C5A9', '🌸', '-20%',     'Sí', 'Vestido floral manga larga'],
    [5, 'Blusa Seda Lore',     'tops',       15900, '',    15, '#BCC8D0', '✨', '',         'Sí', 'Blusa de seda italiana'],
    [6, 'Maxi Vestido Noche',  'vestidos',   45000, '',    4,  '#2C2C3E', '🖤', 'Premium',  'Sí', 'Vestido largo para eventos'],
    [7, 'Crop Linen Belle',    'tops',       11200, '',    18, '#E8D5B7', '🌿', '',         'Sí', 'Crop top de lino natural'],
    [8, 'Bolso Cuero Nano',    'accesorios', 22000, '',    7,  '#8B6F5E', '👜', 'Nuevo',    'Sí', 'Mini bolso de cuero genuino'],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Productos!A2',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: products }
  });
  console.log(`✅ ${products.length} productos cargados en "Productos"\n`);

  // ── 4. Headers Pedidos ───────────────────────────────────
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Pedidos!A1:H1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['ID', 'Cliente', 'Items', 'Total', 'Pago', 'Delivery', 'Estado', 'Fecha']]
    }
  });

  // ── 5. Pedidos de ejemplo ────────────────────────────────
  const orders = [
    ['#4821', 'María González', 'Vestido Claudine x1', '$30,400', 'MercadoPago', 'Uber', 'Entregado', new Date().toLocaleDateString('es-AR')],
    ['#4822', 'Ana Martínez',   'Top Celestine x2',    '$25,000', 'Tarjeta',     'Uber', 'En tránsito', new Date().toLocaleDateString('es-AR')],
  ];

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: 'Pedidos!A2',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: orders }
  });
  console.log(`✅ Pedidos de ejemplo cargados\n`);

  // ── 6. Formato: cabeceras en negrita ─────────────────────
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId,
    requestBody: {
      requests: [0, 1].map(sheetId => ({
        repeatCell: {
          range: { sheetId, startRowIndex: 0, endRowIndex: 1 },
          cell: { userEnteredFormat: { textFormat: { bold: true }, backgroundColor: { red: 0.1, green: 0.1, blue: 0.1 } } },
          fields: 'userEnteredFormat(textFormat,backgroundColor)'
        }
      }))
    }
  });

  // ── 7. Hacer público (solo lectura) ─────────────────────
  await drive.permissions.create({
    fileId: spreadsheetId,
    requestBody: { role: 'writer', type: 'anyone' },
  }).catch(() => console.log('  (permisos drive opcionales)'));

  // ── 8. Actualizar .env ───────────────────────────────────
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('📋 Agregá esto a tu archivo .env:');
  console.log(`GOOGLE_SHEETS_ID=${spreadsheetId}`);
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log(`\n🔗 URL del Spreadsheet:\n   ${spreadsheetUrl}\n`);
  console.log('✨ Setup completo! Los productos del e-commerce se leen desde este archivo.');
}

setup().catch(err => {
  console.error('❌ Error en setup:', err.message);
  process.exit(1);
});
