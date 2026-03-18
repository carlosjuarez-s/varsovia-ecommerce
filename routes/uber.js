const express = require('express');
const router = express.Router();
const { addOrder, addClient, decreaseStock, addSale } = require('../googleSheets');

// ─── Delivery zones & pricing for Tucuman ────────────────────
const DELIVERY_ZONES = [
  { id: 'centro',    name: 'Centro / Microcentro',          price: 1000, estimatedMin: 20 },
  { id: 'norte',     name: 'Yerba Buena / Marcos Paz',      price: 1500, estimatedMin: 35 },
  { id: 'sur',       name: 'Barrio Sur / Villa Lujan',      price: 1500, estimatedMin: 35 },
  { id: 'este',      name: 'Banda del Rio Sali / Cruz Alta', price: 2000, estimatedMin: 45 },
  { id: 'periferia', name: 'Tafi Viejo / Las Talitas',      price: 2500, estimatedMin: 50 },
  { id: 'pickup',    name: 'Retiro en tienda',              price: 0,    estimatedMin: 0  },
];

// ─── In-memory orders (in production, use Google Sheets) ─────
let deliveryOrders = [];

// ─── GET /api/uber/zones ─────────────────────────────────────
// Returns available delivery zones with prices
router.get('/zones', (req, res) => {
  res.json({ zones: DELIVERY_ZONES });
});

// ─── POST /api/uber/estimate ─────────────────────────────────
// Body: { zone: "centro" }
router.post('/estimate', (req, res) => {
  const { zone } = req.body;
  const found = DELIVERY_ZONES.find(z => z.id === zone);
  if (!found) {
    return res.status(400).json({ error: 'Zona no encontrada' });
  }
  res.json({
    zone: found,
    currency: 'ARS',
    message: found.price === 0
      ? 'Retira tu pedido en nuestra tienda sin costo'
      : `Envio a ${found.name} — $${found.price.toLocaleString('es-AR')} (${found.estimatedMin} min aprox)`
  });
});

// ─── POST /api/uber/create-delivery ──────────────────────────
// Body: { orderId, customer: {name, phone, address, zone, notes}, items }
router.post('/create-delivery', async (req, res) => {
  try {
    const { orderId, customer, items } = req.body;

    if (!customer?.name || !customer?.phone || !customer?.address) {
      return res.status(400).json({ error: 'Datos del cliente incompletos' });
    }

    const zone = DELIVERY_ZONES.find(z => z.id === customer.zone) || DELIVERY_ZONES[0];

    const delivery = {
      id: 'DEL-' + Date.now(),
      orderId: orderId || 'ORD-' + Date.now(),
      status: 'pending', // pending → confirmed → delivering → delivered
      createdAt: new Date().toISOString(),
      customer: {
        name: customer.name,
        phone: customer.phone,
        address: customer.address,
        zone: zone.name,
        notes: customer.notes || ''
      },
      items: items || [],
      deliveryFee: zone.price,
      estimatedMinutes: zone.estimatedMin,
      whatsappSent: false,
    };

    deliveryOrders.push(delivery);

    // Send WhatsApp notification to store owner
    const storePhone = process.env.STORE_PHONE || '';
    const whatsappUrl = buildWhatsAppUrl(storePhone, delivery);

    delivery.whatsappUrl = whatsappUrl;

    // Save order to Google Sheets "Pedidos"
    const itemsSummary = (items || []).map(i => {
      const sizeTag = i.size ? ` (${i.size})` : '';
      return `${i.qty}x ${i.name}${sizeTag}`;
    }).join(', ');
    const total = (items || []).reduce((sum, i) => sum + (i.price * i.qty), 0) + zone.price;
    try {
      await addOrder({
        id: delivery.orderId,
        client: customer.name,
        items: itemsSummary,
        total: '$' + total.toLocaleString('es-AR'),
        pay: 'MercadoPago',
        delivery: zone.name,
        status: 'Pendiente'
      });
      console.log('📝 Pedido guardado en Google Sheets:', delivery.orderId);
    } catch (sheetErr) {
      console.error('⚠️ Error saving order to Sheets:', sheetErr.message);
    }

    // Decrease stock for purchased items
    try {
      await decreaseStock((items || []).map(i => ({ id: i.id, qty: i.qty })));
    } catch (stockErr) {
      console.error('⚠️ Error decreasing stock:', stockErr.message);
    }

    // Log sale to "Ventas" sheet
    try {
      await addSale({
        orderId: delivery.orderId,
        customerName: customer.name,
        email: customer.email || '',
        phone: customer.phone,
        address: customer.address,
        products: itemsSummary,
        total: '$' + total.toLocaleString('es-AR'),
        paymentMethod: 'MercadoPago',
        deliveryZone: zone.name,
      });
    } catch (saleErr) {
      console.error('⚠️ Error logging sale:', saleErr.message);
    }

    console.log('📦 Nuevo pedido de delivery:', delivery.id);
    console.log('   Cliente:', customer.name, '—', customer.phone);
    console.log('   Direccion:', customer.address, '(' + zone.name + ')');
    console.log('   Items:', items?.map(i => `${i.qty}x ${i.name}${i.size ? ' (' + i.size + ')' : ''}`).join(', '));
    console.log('   WhatsApp URL:', whatsappUrl);

    res.json({
      delivery,
      whatsappUrl,
      message: `Pedido ${delivery.id} creado. Envio a ${zone.name} — $${zone.price.toLocaleString('es-AR')}`
    });
  } catch (err) {
    console.error('Delivery error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── GET /api/uber/orders ────────────────────────────────────
// Admin: list all delivery orders
router.get('/orders', (req, res) => {
  res.json({
    orders: deliveryOrders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
  });
});

// ─── PUT /api/uber/orders/:id/status ─────────────────────────
// Admin: update delivery status
router.put('/orders/:id/status', (req, res) => {
  const { status } = req.body;
  const validStatuses = ['pending', 'confirmed', 'delivering', 'delivered', 'cancelled'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Estado invalido. Opciones: ' + validStatuses.join(', ') });
  }

  const order = deliveryOrders.find(o => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }

  order.status = status;
  order.updatedAt = new Date().toISOString();

  // Build WhatsApp message for customer notification
  const customerWhatsapp = buildCustomerWhatsApp(order);

  console.log(`📦 Pedido ${order.id} → ${status}`);

  res.json({
    order,
    customerWhatsapp,
    message: `Pedido ${order.id} actualizado a: ${status}`
  });
});

// ─── GET /api/uber/track/:orderId ────────────────────────────
// Customer: track delivery status
router.get('/track/:orderId', (req, res) => {
  const order = deliveryOrders.find(o =>
    o.id === req.params.orderId || o.orderId === req.params.orderId
  );

  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado' });
  }

  const statusLabels = {
    pending: { label: 'Pendiente', description: 'Tu pedido esta siendo preparado', icon: '📋', progress: 25 },
    confirmed: { label: 'Confirmado', description: 'Tu pedido fue confirmado y se esta preparando', icon: '✅', progress: 50 },
    delivering: { label: 'En camino', description: 'Tu pedido esta en camino!', icon: '🚚', progress: 75 },
    delivered: { label: 'Entregado', description: 'Tu pedido fue entregado. Gracias!', icon: '🎉', progress: 100 },
    cancelled: { label: 'Cancelado', description: 'Tu pedido fue cancelado', icon: '❌', progress: 0 },
  };

  res.json({
    orderId: order.orderId,
    deliveryId: order.id,
    status: order.status,
    ...statusLabels[order.status],
    estimatedMinutes: order.estimatedMinutes,
    customer: { name: order.customer.name, address: order.customer.address },
    createdAt: order.createdAt,
  });
});

// ─── POST /api/uber/register-client ───────────────────────────
// Register a new client (Be a Varsovia Girl)
router.post('/register-client', async (req, res) => {
  try {
    const { name, email, phone, address } = req.body;
    if (!name || !email) {
      return res.status(400).json({ error: 'Nombre y email son requeridos' });
    }
    const result = await addClient({ name, email, phone, address });
    if (result.exists) {
      return res.json({ success: true, message: 'Ya estas registrada! Bienvenida de vuelta.' });
    }
    console.log('👩 Nueva Varsovia Girl:', name, email);
    res.json({ success: true, message: 'Bienvenida a Varsovia Girl! Ya tenes acceso a descuentos exclusivos.' });
  } catch (err) {
    console.error('Client registration error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ─── Helper: Build WhatsApp URL for store owner ──────────────
function buildWhatsAppUrl(storePhone, delivery) {
  const items = delivery.items.map(i => {
    const sizeTag = i.size ? ` (${i.size})` : '';
    return `  • ${i.qty}x ${i.name}${sizeTag}`;
  }).join('\n');
  const message = [
    `🛍️ *NUEVO PEDIDO — ${delivery.id}*`,
    ``,
    `👤 *Cliente:* ${delivery.customer.name}`,
    `📱 *Tel:* ${delivery.customer.phone}`,
    `📍 *Direccion:* ${delivery.customer.address}`,
    `🗺️ *Zona:* ${delivery.customer.zone}`,
    delivery.customer.notes ? `📝 *Notas:* ${delivery.customer.notes}` : '',
    ``,
    `📦 *Productos:*`,
    items,
    ``,
    `💰 *Envio:* $${delivery.deliveryFee.toLocaleString('es-AR')}`,
    `⏱️ *Tiempo estimado:* ${delivery.estimatedMinutes} min`,
  ].filter(Boolean).join('\n');

  const phone = storePhone.replace(/[^0-9]/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

// ─── Helper: Build WhatsApp URL for customer notification ────
function buildCustomerWhatsApp(order) {
  const statusMessages = {
    confirmed: `✅ Hola ${order.customer.name}! Tu pedido *${order.orderId}* fue confirmado y lo estamos preparando.`,
    delivering: `🚚 Hola ${order.customer.name}! Tu pedido *${order.orderId}* esta en camino a ${order.customer.address}. Llegara en aprox ${order.estimatedMinutes} min.`,
    delivered: `🎉 Hola ${order.customer.name}! Tu pedido *${order.orderId}* fue entregado. Gracias por tu compra en Varsovia!`,
    cancelled: `❌ Hola ${order.customer.name}, lamentamos informarte que tu pedido *${order.orderId}* fue cancelado. Contactanos para mas info.`,
  };

  const message = statusMessages[order.status] || `Tu pedido ${order.orderId} fue actualizado: ${order.status}`;
  const phone = order.customer.phone.replace(/[^0-9]/g, '');
  return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
}

module.exports = router;
