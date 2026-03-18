/**
 * Varsovia — Google Sheets Setup Script
 *
 * Adds new columns and tabs to your EXISTING spreadsheet.
 * Run once: node setup-sheets.js
 *
 * What it does:
 * 1. Adds "Descuento" (M1) and "Cuotas" (N1) headers to "Productos"
 * 2. Creates "Ventas" tab with all required headers
 */

require('dotenv').config();
const { google } = require('googleapis');

function getAuth() {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    return new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
  }
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

const SHEET_ID = process.env.GOOGLE_SHEETS_ID;

async function setup() {
  if (!SHEET_ID) {
    console.error('ERROR: GOOGLE_SHEETS_ID not set in .env');
    process.exit(1);
  }

  console.log('Setting up Google Sheets for Varsovia...\n');

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Add Descuento, Cuotas & Talle headers to Productos (M1, N1, O1)
  console.log('1. Adding Descuento, Cuotas & Talle columns to Productos...');
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Productos!M1:O1',
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [['Descuento', 'Cuotas', 'Talle']] },
    });
    console.log('   Done — M1: Descuento, N1: Cuotas, O1: Talle');
  } catch (err) {
    console.error('   Error:', err.message);
  }

  // 2. Create "Ventas" tab
  console.log('2. Creating Ventas tab...');
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          addSheet: { properties: { title: 'Ventas' } }
        }]
      }
    });
    console.log('   Ventas tab created');
  } catch (err) {
    if (err.message?.includes('already exists')) {
      console.log('   Ventas tab already exists, skipping');
    } else {
      console.error('   Error:', err.message);
    }
  }

  // 3. Add headers to Ventas tab
  console.log('3. Adding headers to Ventas...');
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Ventas!A1:K1',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[
          'ID Pedido', 'Nombre', 'Email', 'Telefono', 'Direccion',
          'Productos', 'Total', 'Metodo de Pago', 'Zona de Envio',
          'Fecha', 'Hora'
        ]]
      },
    });
    console.log('   Headers added');
  } catch (err) {
    console.error('   Error:', err.message);
  }

  // 4. Create "Configuracion" tab
  console.log('4. Creating Configuracion tab...');
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SHEET_ID,
      requestBody: {
        requests: [{
          addSheet: { properties: { title: 'Configuracion' } }
        }]
      }
    });
    console.log('   Configuracion tab created');
  } catch (err) {
    if (err.message?.includes('already exists')) {
      console.log('   Configuracion tab already exists, skipping');
    } else {
      console.error('   Error:', err.message);
    }
  }

  // 5. Add headers and default values to Configuracion
  console.log('5. Adding config data to Configuracion...');
  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: 'Configuracion!A1:B10',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [
          ['Clave', 'Valor'],
          ['anuncio_1', 'Envios a todo Tucuman'],
          ['anuncio_2', '3 cuotas sin interes'],
          ['anuncio_3', '10% OFF con transferencia'],
          ['anuncio_4', 'Retiro gratis en tienda'],
          ['whatsapp', ''],
          ['instagram', ''],
          ['email_contacto', ''],
          ['descuento_transferencia', '10'],
        ]
      },
    });
    console.log('   Config data added');
  } catch (err) {
    console.error('   Error:', err.message);
  }

  console.log('\nDone! Your Google Sheet is ready.');
  console.log('  - Set "Descuento" (e.g. 20 for 20% off) per product in column M');
  console.log('  - Set "Cuotas" (e.g. 6 for 6 installments) per product in column N');
  console.log('  - Sales will auto-log to the "Ventas" tab on each purchase');
  console.log('  - Edit "Configuracion" tab to change announcement bar messages');
}

setup().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
