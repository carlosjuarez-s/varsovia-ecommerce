const express = require('express');
const router = express.Router();

router.get('/tokens', (req, res) => {
  res.json({ message: 'Figma tokens endpoint ready' });
});

module.exports = router;
