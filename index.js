require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const mercadopagoRouter = require('./routes/mercadopago');
const uberRouter = require('./routes/uber');
const figmaRouter = require('./routes/figma');
const productsRouter = require('./routes/products');
const adminRouter = require('./routes/admin');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Static files ───────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'public')));

// ─── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(morgan('dev'));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 100 });
app.use('/api/', limiter);

// ─── Routes ─────────────────────────────────────────────────
app.use('/api/mercadopago', mercadopagoRouter);
app.use('/api/uber',        uberRouter);
app.use('/api/figma',       figmaRouter);
app.use('/api/products',    productsRouter);
app.use('/api/admin',       adminRouter);

// ─── Checkout return URLs (redirect to frontend) ────────────
app.get('/checkout/:status', (req, res) => {
  res.redirect('/?checkout=' + req.params.status);
});

// ─── Health check ────────────────────────────────────────────
app.get('/health', (req, res) => res.json({
  status: 'ok',
  service: 'varsovia-backend',
  version: '1.0.0',
  timestamp: new Date().toISOString(),
  integrations: {
    mercadopago: !!process.env.MP_ACCESS_TOKEN,
    uber: !!process.env.UBER_CLIENT_ID,
    figma: !!process.env.FIGMA_TOKEN,
    googleSheets: !!process.env.GOOGLE_SHEETS_ID,
  }
}));

// ─── Error handler ───────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log(`🚀 Varsovia Backend corriendo en http://localhost:${PORT}`);
  console.log(`📋 Health: http://localhost:${PORT}/health`);
});

module.exports = app;
