const express = require('express');
const router = express.Router();
let cachedTokens = null;
let lastSync = null;

// GET /api/figma/tokens
// Frontend polls this endpoint; backend fetches from Figma (avoids CORS + token exposure)
router.get('/tokens', async (req, res) => {
  const CACHE_TTL = 60 * 1000; // 60 seconds
  if (cachedTokens && lastSync && (Date.now() - lastSync < CACHE_TTL)) {
    return res.json({ tokens: cachedTokens, cached: true, lastSync });
  }

  const fileKey = process.env.FIGMA_FILE_KEY;
  const token   = process.env.FIGMA_TOKEN;

  if (!fileKey || !token) {
    return res.json({ tokens: getDefaultTokens(), cached: false, note: 'Using defaults — set FIGMA_TOKEN & FIGMA_FILE_KEY' });
  }

  try {
    const response = await fetch(
      `https://api.figma.com/v1/files/${fileKey}/variables/local`,
      { headers: { 'X-Figma-Token': token } }
    );
    if (!response.ok) throw new Error(`Figma API ${response.status}`);
    const data = await response.json();
    cachedTokens = extractTokens(data);
    lastSync = Date.now();
    res.json({ tokens: cachedTokens, cached: false, lastSync });
  } catch (err) {
    console.error('Figma sync error:', err.message);
    res.json({ tokens: getDefaultTokens(), error: err.message, lastSync });
  }
});

// POST /api/figma/invalidate — force cache invalidation
router.post('/invalidate', (req, res) => {
  cachedTokens = null;
  lastSync = null;
  res.json({ invalidated: true });
});

function extractTokens(data) {
  const tokens = {};
  const variables = data.meta?.variables || {};
  for (const varId in variables) {
    const v = variables[varId];
    const name = v.name.toLowerCase().replace(/[\s\/]+/g, '-');
    const modeId = Object.keys(v.valuesByMode)[0];
    const val = v.valuesByMode[modeId];
    if (v.resolvedType === 'COLOR' && val?.r !== undefined) {
      const r = Math.round(val.r * 255);
      const g = Math.round(val.g * 255);
      const b = Math.round(val.b * 255);
      const a = val.a ?? 1;
      tokens[name] = a < 1 ? `rgba(${r},${g},${b},${a.toFixed(2)})` : `#${[r,g,b].map(x=>x.toString(16).padStart(2,'0')).join('')}`;
    } else if (v.resolvedType === 'FLOAT') {
      tokens[name] = `${val}px`;
    } else if (v.resolvedType === 'STRING') {
      tokens[name] = val;
    }
  }
  return Object.keys(tokens).length ? tokens : getDefaultTokens();
}

function getDefaultTokens() {
  return {
    'color-primary':   '#1a1a1a',
    'color-secondary': '#8B6F5E',
    'color-accent':    '#C4956A',
    'color-bg':        '#FAF8F5',
    'color-bg-warm':   '#F2EDE6',
    'color-border':    '#E8E0D8',
    'font-display':    'Cormorant Garamond, serif',
    'font-body':       'Jost, sans-serif',
  };
}

module.exports = router;
