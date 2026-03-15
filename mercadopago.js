const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');

const client = new MercadoPagoConfig({
  accessToken: process.env.MP_ACCESS_TOKEN,
  options: { timeout: 5000 }
});

// POST /api/mercadopago/create-preference
// Body: { items: [{name, qty, price}], buyer: {name, email}, deliveryFee }
router.post('/create-preference', async (req, res) => {
  try {
    const { items, buyer, deliveryFee = 1500 } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'Items requeridos' });

    const preference = new Preference(client);
    const result = await preference.create({
      body: {
        items: [
          ...items.map(i => ({
            id: String(i.id),
            title: i.name,
            quantity: Number(i.qty),
            unit_price: Number(i.price),
            currency_id: 'ARS',
          })),
          {
            id: 'delivery',
            title: 'Envío Uber',
            quantity: 1,
            unit_price: deliveryFee,
            currency_id: 'ARS',
          }
        ],
        payer: buyer ? { name: buyer.name, email: buyer.email } : undefined,
        back_urls: {
          success: `${process.env.FRONTEND_URL}/checkout/success`,
          failure: `${process.env.FRONTEND_URL}/checkout/failure`,
          pending: `${process.env.FRONTEND_URL}/checkout/pending`,
        },
        auto_return: 'approved',
        notification_url: `${process.env.BACKEND_URL}/api/mercadopago/webhook`,
        statement_descriptor: 'LUMIERE MODA',
        installments: 6,
      }
    });

    res.json({
      preferenceId: result.id,
      init_point: result.init_point,       // Redirect prod
      sandbox_init_point: result.sandbox_init_point, // Testing
    });
  } catch (err) {
    console.error('MP Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/mercadopago/webhook
// Receives IPN notifications from MercadoPago
router.post('/webhook', async (req, res) => {
  const { type, data } = req.body;
  console.log('📩 MP Webhook:', type, data?.id);

  if (type === 'payment') {
    try {
      const payment = new Payment(client);
      const info = await payment.get({ id: data.id });
      console.log(`💳 Pago ${info.status}: $${info.transaction_amount} — ${info.payer?.email}`);

      if (info.status === 'approved') {
        // 1. Mark order as paid in Google Sheets
        const sheetsService = require('../services/googleSheets');
        await sheetsService.updateOrderStatus(data.id, 'pagado', info.transaction_amount);

        // 2. Auto-request Uber delivery
        const uberService = require('../services/uberDelivery');
        // await uberService.requestDelivery({ orderId: data.id, ... });
      }
    } catch (e) {
      console.error('Webhook error:', e.message);
    }
  }

  res.sendStatus(200);
});

// GET /api/mercadopago/payment/:id
router.get('/payment/:id', async (req, res) => {
  try {
    const payment = new Payment(client);
    const info = await payment.get({ id: req.params.id });
    res.json({ status: info.status, amount: info.transaction_amount, payer: info.payer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
