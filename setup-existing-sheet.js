/**
 * VARSOVIA — Setup tabs in existing Google Sheet
 * Adds "Productos" and "Pedidos" tabs with headers and sample data.
 */
require('dotenv').config();
const { google } = require('googleapis');

async function setup() {
  console.log('🚀 Configurando tabs en tu Google Sheet existente...\n');

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

  // 1. Get existing sheet tabs
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const existingTabs = meta.data.sheets.map(s => s.properties.title);
  console.log('📄 Tabs existentes:', existingTabs.join(', '));

  // 2. Create missing tabs
  const requests = [];
  if (!existingTabs.includes('Productos')) {
    requests.push({ addSheet: { properties: { title: 'Productos' } } });
    console.log('  + Creando tab "Productos"');
  }
  if (!existingTabs.includes('Pedidos')) {
    requests.push({ addSheet: { properties: { title: 'Pedidos' } } });
    console.log('  + Creando tab "Pedidos"');
  }

  if (requests.length > 0) {
    await sheets.spreadsheets.batchUpdate({ spreadsheetId, requestBody: { requests } });
  }

  // 3. Add headers to Productos
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Productos!A1:K1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['ID', 'Nombre', 'Categoría', 'Precio', 'PrecioOriginal', 'Stock', 'Color', 'Emoji', 'Badge', 'Activo', 'Descripción']]
    }
  });
  console.log('✅ Headers de Productos configurados');

  // 4. Add sample products
  const products = [
    [1, 'Vestido Rosa Elegante',  'Vestidos',    45000, 55000, 12, '#FFB6C1', '👗', 'SALE',  'Sí', 'Vestido midi rosa con detalles'],
    [2, 'Blusa Romántica',        'Blusas',      28000, '',    8,  '#FF69B4', '👚', 'NEW',   'Sí', 'Blusa con volados delicados'],
    [3, 'Falda Plisada',          'Faldas',      32000, 38000, 5,  '#FFD1DC', '🩱', 'SALE',  'Sí', 'Falda plisada talle alto'],
    [4, 'Pantalón Palazzo',       'Pantalones',  38000, '',    15, '#FFC0CB', '👖', '',      'Sí', 'Pantalón palazzo tiro alto'],
    [5, 'Campera Jean Rosa',      'Abrigos',     52000, 65000, 3,  '#FF85A2', '🧥', 'SALE',  'Sí', 'Campera jean oversize rosa'],
    [6, 'Top Crop Básico',        'Tops',        18000, '',    20, '#FFB6C1', '👕', 'NEW',   'Sí', 'Top crop de algodón'],
  ];

  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Productos!A2:K7',
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: products }
  });
  console.log(`✅ ${products.length} productos de ejemplo cargados`);

  // 5. Add headers to Pedidos
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: 'Pedidos!A1:H1',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [['ID', 'Cliente', 'Items', 'Total', 'Pago', 'Delivery', 'Estado', 'Fecha']]
    }
  });
  console.log('✅ Headers de Pedidos configurados');

  console.log('\n🎉 Setup completo! Tu Google Sheet está listo.');
  console.log(`🔗 https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`);
  console.log('\nPodes editar productos directamente en la planilla y se actualizan en la web.');
}

setup().catch(err => {
  console.error('❌ Error:', err.message);
  process.exit(1);
});
