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
// Sheet "Productos" columns: A:ID | B:Nombre | C:Categoría | D:Precio | E:PrecioOriginal | F:Stock | G:Color | H:Emoji | I:Badge | J:Activo | K:Descripcion | L:ImageURL | M:Descuento | N:Cuotas | O:Talle

async function getProducts() {
  if (!SHEET_ID) throw new Error('GOOGLE_SHEETS_ID no configurado');
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Productos!A2:O500',
  });

  const rows = response.data.values || [];
  console.log('📊 Google Sheets raw data:');
  console.log(`   Total rows: ${rows.length}`);
  rows.forEach((row, i) => {
    console.log(`   Row ${i + 2}: [${row.join(' | ')}]`);
  });

  const activeRows = rows
    .filter(r => r.length >= 2 && r[1])
    .filter(r => {
      const activo = (r[9] || '').toString().toLowerCase().trim();
      return activo !== 'no' && activo !== 'false';
    })
    .map(r => ({
      id:           Number(r[0]) || 0,
      name:         r[1] || '',
      category:     r[2] || '',
      price:        Number(String(r[3]).replace(/[$.]/g, '')) || 0,
      oldPrice:     r[4] && r[4] !== 'null' ? Number(String(r[4]).replace(/[$.]/g, '')) : null,
      stock:        Number(r[5]) || 0,
      color:        r[6] && r[6] !== 'null' ? r[6] : '#E8DDD3',
      emoji:        r[7] && r[7] !== 'null' ? r[7] : '👗',
      badge:        r[8] && r[8] !== 'null' && r[8] !== '' ? r[8] : null,
      active:       true,
      description:  r[10] && r[10] !== 'null' && r[10] !== '' ? r[10] : null,
      image:        r[11] && r[11] !== 'null' && r[11] !== '' ? r[11] : null,
      discount:     Number(r[12]) || 0,
      installments: Number(r[13]) || 3,
      size:         r[14] && r[14] !== 'null' && r[14] !== '' ? r[14].trim() : null,
    }));

  // Group products by name — aggregate sizes
  const grouped = new Map();
  for (const row of activeRows) {
    const key = row.name;
    if (!grouped.has(key)) {
      grouped.set(key, {
        ...row,
        sizes: row.size ? [{ id: row.id, size: row.size, stock: row.stock }] : [],
        stock: row.stock,
      });
    } else {
      const existing = grouped.get(key);
      if (row.size) {
        existing.sizes.push({ id: row.id, size: row.size, stock: row.stock });
        existing.stock += row.stock; // total stock across all sizes
      }
    }
  }

  return Array.from(grouped.values());
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

// ─── Stock management ────────────────────────────────────────

async function decreaseStock(items) {
  if (!SHEET_ID || !items?.length) return;
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const all = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Productos!A:F',
  });
  const rows = all.data.values || [];

  const updates = [];
  for (const item of items) {
    const rowIndex = rows.findIndex(r => String(r[0]) === String(item.id));
    if (rowIndex < 1) continue;
    const currentStock = Number(rows[rowIndex][5]) || 0;
    const newStock = Math.max(0, currentStock - item.qty);
    updates.push({ range: `Productos!F${rowIndex + 1}`, values: [[newStock]] });
  }

  if (updates.length > 0) {
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
    });
    console.log(`📦 Stock actualizado para ${updates.length} producto(s)`);
  }
}

// ─── Sales ───────────────────────────────────────────────────
// Sheet "Ventas" columns: A:ID Pedido | B:Nombre | C:Email | D:Telefono | E:Direccion | F:Productos | G:Total | H:Metodo Pago | I:Zona Envio | J:Fecha | K:Hora

async function addSale(sale) {
  if (!SHEET_ID) return;
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });
  const now = new Date();

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Ventas!A:K',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        sale.orderId,
        sale.customerName,
        sale.email || '',
        sale.phone || '',
        sale.address || '',
        sale.products,
        sale.total,
        sale.paymentMethod || 'MercadoPago',
        sale.deliveryZone || '',
        now.toLocaleDateString('es-AR'),
        now.toLocaleTimeString('es-AR'),
      ]]
    }
  });
  console.log('💰 Venta registrada en Google Sheets:', sale.orderId);
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

// ─── Clients ─────────────────────────────────────────────────
// Sheet "Clients" columns: ID | Nombre | Email | Telefono | Direccion | FechaRegistro

async function addClient(client) {
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Check if email already exists
  try {
    const existing = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Clients!C2:C500',
    });
    const emails = (existing.data.values || []).flat();
    if (emails.includes(client.email)) {
      return { exists: true };
    }
  } catch (e) {
    // Sheet might not exist yet, continue
  }

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: 'Clients!A:F',
    valueInputOption: 'USER_ENTERED',
    requestBody: {
      values: [[
        'CLI-' + Date.now(),
        client.name,
        client.email,
        client.phone || '',
        client.address || '',
        new Date().toLocaleDateString('es-AR')
      ]]
    }
  });

  return { success: true };
}

async function getClients() {
  if (!SHEET_ID) return [];
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Clients!A2:F500',
  });

  const rows = response.data.values || [];
  return rows.map(r => ({
    id: r[0], name: r[1], email: r[2], phone: r[3], address: r[4], date: r[5]
  }));
}

// ─── Configuration ──────────────────────────────────────
// Sheet "Configuracion" columns: A:Clave | B:Valor

async function getConfig() {
  if (!SHEET_ID) return {};
  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  const response = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: 'Configuracion!A2:B50',
  });

  const rows = response.data.values || [];
  const config = {};
  for (const row of rows) {
    if (row[0]) config[row[0]] = row[1] || '';
  }
  return config;
}

module.exports = { getProducts, addProduct, updateProductStock, decreaseStock, addSale, getOrders, addOrder, updateOrderStatus, addClient, getClients, getConfig };
