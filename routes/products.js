const express = require('express');
const router = express.Router();
const { getProducts, addProduct, updateProductStock } = require('../googleSheets');

// GET /api/products — fetch all active products from Google Sheets
router.get('/', async (req, res) => {
  // Only use demo if Google Sheets is not configured at all
  if (!process.env.GOOGLE_SHEETS_ID || !process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
    console.log('⚠️  Google Sheets not configured, using demo products');
    return res.json({
      success: true,
      demo: true,
      products: getDemoProducts()
    });
  }

  try {
    const products = await getProducts();
    console.log(`✅ Fetched ${products.length} products from Google Sheets`);
    res.json({ success: true, products });
  } catch (err) {
    console.error('❌ Error fetching from Google Sheets:', err.message);
    res.status(500).json({ success: false, error: err.message });
  }
});

// POST /api/products — add a new product
router.post('/', async (req, res) => {
  try {
    const product = await addProduct(req.body);
    res.json({ success: true, product });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// PUT /api/products/:id/stock — update stock
router.put('/:id/stock', async (req, res) => {
  try {
    await updateProductStock(req.params.id, req.body.stock);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Demo products only used when Google Sheets credentials are not set
function getDemoProducts() {
  return [
    { id: 1, name: 'Vestido Rosa Elegante', category: 'Vestidos', price: 45000, oldPrice: 55000, stock: 12, color: '#FFB6C1', emoji: '👗', badge: 'SALE', active: true },
    { id: 2, name: 'Blusa Romántica', category: 'Blusas', price: 28000, oldPrice: null, stock: 8, color: '#FF69B4', emoji: '👚', badge: 'NEW', active: true },
  ];
}

module.exports = router;
