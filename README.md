# LUMIÈRE — Backend Express

API backend para el e-commerce LUMIÈRE. Integra **MercadoPago**, **Uber Direct**, **Figma Sync** y **Google Sheets**.

## 🚀 Deploy en Railway (recomendado)

```bash
# 1. Instalar Railway CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Crear proyecto desde esta carpeta
railway init

# 4. Subir variables de entorno
railway variables set MP_ACCESS_TOKEN=... UBER_CLIENT_ID=... FIGMA_TOKEN=... GOOGLE_SHEETS_ID=...

# 5. Deploy
railway up
```

### O deploy manual en Railway.app:
1. Ir a **railway.app** → New Project → Deploy from GitHub
2. Conectar este repositorio
3. En Variables, agregar todas las de `.env.example`
4. Railway detecta automáticamente Node.js y hace el deploy

## 🔧 Desarrollo local

```bash
# Instalar dependencias
npm install

# Configurar entorno
cp .env.example .env
# Editar .env con tus credenciales

# Iniciar servidor
npm run dev
# → http://localhost:3001
```

## 📋 Endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/health` | Estado del servidor |
| POST | `/api/mercadopago/create-preference` | Crear preferencia de pago |
| POST | `/api/mercadopago/webhook` | Recibir notificaciones MP |
| GET | `/api/mercadopago/payment/:id` | Estado de un pago |
| POST | `/api/uber/request` | Solicitar delivery |
| GET | `/api/uber/status/:id` | Estado del delivery |
| GET | `/api/figma/tokens` | Design tokens de Figma |
| POST | `/api/figma/invalidate` | Invalidar caché de tokens |
| GET | `/api/products` | Listar productos (desde Sheets) |
| POST | `/api/products` | Agregar producto |
| PUT | `/api/products/:id/stock` | Actualizar stock |
| GET | `/api/admin/export-excel` | Descargar Excel de admin |
| GET | `/api/admin/dashboard` | Stats del dashboard |

## 📊 Configurar Google Sheets

1. Crear un nuevo Google Spreadsheet
2. Crear dos hojas: **Productos** y **Pedidos**

### Hoja "Productos" (columnas A→J):
```
ID | Nombre | Categoría | Precio | PrecioOriginal | Stock | Color | Emoji | Badge | Activo
1  | Vestido Claudine | vestidos | 28900 | 35000 | 12 | #D4B5A0 | 👗 | Nuevo | Sí
```

### Hoja "Pedidos" (columnas A→H):
```
ID | Cliente | Items | Total | Pago | Delivery | Estado | Fecha
```

3. Compartir el spreadsheet con el email de tu Service Account (con permiso de Editor)
4. Copiar el ID del spreadsheet de la URL: `https://docs.google.com/spreadsheets/d/[ID]/edit`

## 🎨 Integrar con Figma

En tu archivo de Figma:
1. Crear colección de variables: **Design Tokens**
2. Agregar variables con estos nombres:
   - `color/primary` → #1a1a1a
   - `color/accent` → #C4956A
   - `color/secondary` → #8B6F5E
   - `color/bg` → #FAF8F5
   - `font/body` → Jost, sans-serif

El backend las expone en `/api/figma/tokens` y el frontend las aplica como CSS variables.

## 📁 Estructura

```
lumiere-backend/
├── src/
│   ├── index.js              ← Entry point Express
│   ├── routes/
│   │   ├── mercadopago.js    ← Pagos
│   │   ├── uber.js           ← Delivery
│   │   ├── figma.js          ← Design tokens
│   │   ├── products.js       ← Catálogo
│   │   └── admin.js          ← Admin + Excel
│   └── services/
│       ├── googleSheets.js   ← Google Sheets API
│       └── uberDelivery.js   ← Uber Direct API
├── .env.example
├── package.json
└── README.md
```
