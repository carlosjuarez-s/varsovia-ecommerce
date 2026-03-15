const express = require('express');
const router = express.Router();

// ─── Initialize MercadoPago ─────────────────────────────────
let client, Preference, Payment;
const MP_ENABLED = !!process.env.MP_ACCESS_TOKEN;

if (MP_ENABLED) {
  const mercadopago = require('mercadopago');
  client = new mercadopago.MercadoPagoConfig({
    accessToken: process.env.MP_ACCESS_TOKEN,
    options: { timeout: 5000 }
  });
  Preference = mercadopago.Preference;
  Payment = mercadopago.Payment;
  console.log('💳 MercadoPago: Configurado');
} else {
  console.log('⚠️  MercadoPago: Sin ACCESS_TOKEN — modo demo activo');
}

// ─── POST /api/mercadopago/create-preference ─────────────────
// Body: { items: [{id, name, qty, price}], buyer: {name, email}, deliveryFee }
router.post('/create-preference', async (req, res) => {
  try {
    const { items, buyer, deliveryFee = 0 } = req.body;

    if (!items?.length) {
      return res.status(400).json({ error: 'Items requeridos' });
    }

    // If MercadoPago is not configured, return demo response
    if (!MP_ENABLED) {
      console.log('📦 Pedido recibido (modo demo):', {
        items: items.map(i => `${i.qty}x ${i.name}`),
        buyer,
        deliveryFee
      });
      return res.json({
        demo: true,
        message: 'MercadoPago no configurado. Pedido registrado en modo demo.',
        orderId: 'DEMO-' + Date.now()
      });
    }

    // Build MercadoPago preference
    const preferenceItems = items.map(i => ({
      id: String(i.id),
      title: i.name,
      quantity: Number(i.qty),
      unit_price: Number(i.price),
      currency_id: 'ARS',
    }));

    // Add delivery fee as item if > 0
    if (deliveryFee > 0) {
      preferenceItems.push({
        id: 'delivery',
        title: 'Envio a domicilio',
        quantity: 1,
        unit_price: Number(deliveryFee),
        currency_id: 'ARS',
      });
    }

    const preference = new Preference(client);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3001';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const isLocalhost = frontendUrl.includes('localhost') || frontendUrl.includes('127.0.0.1');

    // Build preference body
    const prefBody = {
      items: preferenceItems,
      payer: buyer ? {
        name: buyer.name,
        email: buyer.email
      } : undefined,
      statement_descriptor: 'VARSOVIA MODA',
      installments: 6,
    };

    // Only set back_urls and auto_return for production (public URLs)
    if (!isLocalhost) {
      prefBody.back_urls = {
        success: `${frontendUrl}/checkout/success`,
        failure: `${frontendUrl}/checkout/failure`,
        pending: `${frontendUrl}/checkout/pending`,
      };
      prefBody.auto_return = 'approved';
      prefBody.notification_url = `${backendUrl}/api/mercadopago/webhook`;
    }

    const result = await preference.create({ body: prefBody });

    console.log('✅ Preferencia creada:', result.id);

    res.json({
      preferenceId: result.id,
      init_point: result.init_point,
      sandbox_init_point: result.sandbox_init_point,
    });
  } catch (err) {
    console.error('❌ MP Error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── POST /api/mercadopago/webhook ───────────────────────────
// Receives IPN notifications from MercadoPago
router.post('/webhook', async (req, res) => {
  const { type, data } = req.body;
  console.log('📩 MP Webhook:', type, data?.id);

  if (type === 'payment' && MP_ENABLED) {
    try {
      const payment = new Payment(client);
      const info = await payment.get({ id: data.id });
      console.log(`💳 Pago ${info.status}: $${info.transaction_amount} — ${info.payer?.email}`);

      if (info.status === 'approved') {
        // TODO: Update order status in Google Sheets
        // TODO: Trigger Uber delivery
        console.log('✅ Pago aprobado — ID:', data.id);
      }
    } catch (e) {
      console.error('Webhook error:', e.message);
    }
  }

  res.sendStatus(200);
});

// ─── GET /api/mercadopago/payment/:id ────────────────────────
router.get('/payment/:id', async (req, res) => {
  if (!MP_ENABLED) {
    return res.json({ error: 'MercadoPago no configurado' });
  }
  try {
    const payment = new Payment(client);
    const info = await payment.get({ id: req.params.id });
    res.json({
      status: info.status,
      amount: info.transaction_amount,
      payer: info.payer
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/mercadopago/status ─────────────────────────────
router.get('/status', (req, res) => {
  res.json({
    enabled: MP_ENABLED,
    publicKey: process.env.MP_PUBLIC_KEY || null
  });
});

module.exports = router;
