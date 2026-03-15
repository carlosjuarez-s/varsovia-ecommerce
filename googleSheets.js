const { google } = require('googleapis');

// ─── Auth ────────────────────────────────────────────────────
function getAuth() {
  // Option A: Service Account JSON (recommended for production)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }
  // Option B: Individual env vars
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;

// ─── Products ────────────────────────────────────────────────
// Sheet "Productos" columns: ID | Nombre | Categoría | Precio | PrecioOriginal | Stock | Color | Emoji | Badge | Activo

async function getProducts() {
  if (!SHEET_ID) throw new Error('GOOGLE_SHEETS_ID no configurado');
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Productos!A2:L100',
  });

  const rows = response.data.values || [];
  console.log('📊 Google Sheets raw data:');
  console.log(`   Total rows: ${rows.length}`);
  rows.forEach((row, i) => {
    console.log(`   Row ${i + 2}: [${row.join(' | ')}]`);
  });
  return rows
    .filter(r => r.length >= 2 && r[1]) // Must have at least a name
    .filter(r => {
      const activo = (r[9] || '').toString().toLowerCase().trim();
      return activo !== 'no' && activo !== 'false';
    })
    .map(r => ({
      id:        Number(r[0]) || 0,
      name:      r[1] || '',
      category:  r[2] || '',
      price:     Number(String(r[3]).replace(/[$.]/g, '')) || 0,
      oldPrice:  r[4] && r[4] !== 'null' ? Number(String(r[4]).replace(/[$.]/g, '')) : null,
      stock:     Number(r[5]) || 0,
      color:     r[6] && r[6] !== 'null' ? r[6] : '#E8DDD3',
      emoji:     r[7] && r[7] !== 'null' ? r[7] : '👗',
      badge:     r[8] && r[8] !== 'null' && r[8] !== '' ? r[8] : null,
      active:    true,
      image:     r[11] && r[11] !== 'null' && r[11] !== '' ? r[11] : null,
    }));
}

async function addProduct(product) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const id = Date.now();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Productos!A:K',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        id, product.name, product.category, product.price,
        product.oldPrice || '', product.stock || 0,
        product.color || '#E8DDD3', product.emoji || '👗',
        product.badge || '', 'Sí'
      ]]
    }
  });

  return { id, ...product };
}

async function updateProductStock(productId, newStock) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Find the row with matching ID
  const all = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Productos!A:A' });
  const rows = all.data.values || [];
  const rowIndex = rows.findIndex(r => r[0] === String(productId));
  if (rowIndex < 1) throw new Error('Producto no encontrado');

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Productos!F${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[newStock]] }
  });
}

// ─── Orders ──────────────────────────────────────────────────
// Sheet "Pedidos" columns: ID | Cliente | Items | Total | Pago | Delivery | Estado | Fecha

async function getOrders() {
  if (!SHEET_ID) return [];
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Pedidos!A2:H200',
  });

  const rows = response.data.values || [];
  return rows.map(r => ({
    id: r[0], client: r[1], items: r[2], total: r[3],
    pay: r[4], delivery: r[5], status: r[6], date: r[7]
  }));
}

async function addOrder(order) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Pedidos!A:H',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        order.id, order.client, order.items, order.total,
        order.pay, order.delivery, order.status || 'Pendiente',
        new Date().toLocaleDateString('es-AR')
      ]]
    }
  });
}

async function updateOrderStatus(orderId, status, amount) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const all = await sheets.spreadsheets.values.get({ spreadsheetId: SHEET_ID, range: 'Pedidos!A:A' });
  const rows = all.data.values || [];
  const rowIndex = rows.findIndex(r => r[0] === String(orderId));
  if (rowIndex < 1) {
    // Order not found: append it
    await addOrder({ id: orderId, client: 'MercadoPago', items: '-', total: `$${amount}`, pay: 'MP', delivery: 'Uber', status });
    return;
  }

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Pedidos!G${rowIndex + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[status]] }
  });
}

module.exports = { getProducts, addProduct, updateProductStock, getOrders, addOrder, updateOrderStatus };
