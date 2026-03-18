/**
 * Seed 50+ test products into Google Sheets "Productos" tab.
 * Run: node seed-products.js
 *
 * Columns: A:ID | B:Nombre | C:Categoría | D:Precio | E:PrecioOriginal | F:Stock |
 *          G:Color | H:Emoji | I:Badge | J:Activo | K:Descripcion | L:ImageURL |
 *          M:Descuento | N:Cuotas | O:Talle
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

// ─── Product templates ────────────────────────────────────
const products = [
  // VESTIDOS (8 products, some with colors)
  { name: 'Vestido Lencero Jupiter',   cat: 'Vestidos',    price: 32000, old: 42000, color: '#D4B5A0', emoji: '👗', badge: 'SALE',  desc: 'Vestido lencero de seda con tirantes finos. Corte al bies que estiliza la figura.', disc: 25, cuotas: 6, sizes: ['S','M','L'], prodColors: ['Negro:#1a1a1a','Nude:#D4B5A0','Bordo:#800020'] },
  { name: 'Vestido Midi Floral',       cat: 'Vestidos',    price: 28500, old: 35000, color: '#FFB6C1', emoji: '🌸', badge: '',      desc: 'Vestido midi con estampado floral. Ideal para eventos de dia.', disc: 18, cuotas: 3, sizes: ['S','M','L','XL'] },
  { name: 'Vestido Rojo Elegante',     cat: 'Vestidos',    price: 45000, old: 55000, color: '#FF4444', emoji: '👗', badge: 'SALE',  desc: 'Vestido largo rojo para fiestas y eventos especiales.', disc: 20, cuotas: 6, sizes: ['S','M','L'], prodColors: ['Rojo:#FF4444','Negro:#1a1a1a'] },
  { name: 'Vestido Negro Basico',      cat: 'Vestidos',    price: 22000, old: '',    color: '#1a1a1a', emoji: '🖤', badge: '',      desc: 'Little black dress. Clasico y versatil para cualquier ocasion.', disc: 0, cuotas: 3, sizes: ['XS','S','M','L','XL'], prodColors: ['Negro:#1a1a1a','Blanco:#FAFAFA','Azul:#1E3A5F'] },
  { name: 'Vestido Blazer Rosa',       cat: 'Vestidos',    price: 38000, old: '',    color: '#FF85B3', emoji: '👗', badge: 'NEW',   desc: 'Vestido tipo blazer cruzado. Elegancia moderna.', disc: 0, cuotas: 6, sizes: ['S','M','L'], prodColors: ['Rosa:#FF85B3','Negro:#1a1a1a'] },
  { name: 'Vestido Crochet Playa',     cat: 'Vestidos',    price: 18500, old: 24000, color: '#F5E6D3', emoji: '🏖️', badge: '',     desc: 'Vestido tejido a crochet perfecto para la playa.', disc: 15, cuotas: 3, sizes: ['U'] },
  { name: 'Vestido Satinado Esmeralda',cat: 'Vestidos',    price: 41000, old: '',    color: '#2E8B57', emoji: '✨', badge: 'NEW',   desc: 'Vestido de satin color esmeralda. Ideal para galas y cenas.', disc: 0, cuotas: 6, sizes: ['S','M','L'] },
  { name: 'Vestido Cut-Out Blanco',    cat: 'Vestidos',    price: 29000, old: 36000, color: '#FAFAFA', emoji: '👗', badge: '',      desc: 'Vestido blanco con recortes laterales. Tendencia pura.', disc: 20, cuotas: 3, sizes: ['S','M','L'], prodColors: ['Blanco:#FAFAFA','Rosa:#FFB6C1'] },

  // BLUSAS (8 products)
  { name: 'Blusa Romantica',           cat: 'Blusas',      price: 18000, old: '',    color: '#FF69B4', emoji: '👚', badge: 'NEW',   desc: 'Blusa con volados y escote en V. Tela liviana y fresca.', disc: 0, cuotas: 3, sizes: ['S','M','L','XL'], prodColors: ['Blanco:#FAFAFA','Rosa:#FF69B4','Celeste:#87CEEB'] },
  { name: 'Blusa Crop Lino',           cat: 'Blusas',      price: 14500, old: '',    color: '#E8DDD3', emoji: '🌿', badge: '',      desc: 'Blusa crop de lino natural. Perfecta para el verano.', disc: 0, cuotas: 3, sizes: ['S','M','L'], prodColors: ['Natural:#E8DDD3','Blanco:#FAFAFA'] },
  { name: 'Blusa Off-Shoulder Negra',  cat: 'Blusas',      price: 16000, old: 21000, color: '#2C2C2C', emoji: '👚', badge: 'SALE',  desc: 'Blusa con hombros descubiertos. Elegancia nocturna.', disc: 25, cuotas: 3, sizes: ['S','M','L'] },
  { name: 'Blusa Estampada Animal',    cat: 'Blusas',      price: 19500, old: '',    color: '#C4A882', emoji: '🐆', badge: 'NEW',   desc: 'Blusa con print animal. La estrella de cualquier outfit.', disc: 0, cuotas: 3, sizes: ['S','M','L','XL'] },
  { name: 'Camisa Oversize Blanca',    cat: 'Blusas',      price: 21000, old: '',    color: '#FFFFFF', emoji: '👔', badge: '',      desc: 'Camisa oversize en algodon premium. Basico de armario.', disc: 0, cuotas: 3, sizes: ['S','M','L'] },
  { name: 'Blusa Transparente Tul',    cat: 'Blusas',      price: 15000, old: 19000, color: '#E0B0FF', emoji: '✨', badge: '',      desc: 'Blusa de tul con bordados. Romantica y delicada.', disc: 20, cuotas: 3, sizes: ['S','M','L'] },
  { name: 'Body Manga Larga',          cat: 'Blusas',      price: 12000, old: '',    color: '#1a1a1a', emoji: '👚', badge: '',      desc: 'Body basico de manga larga. Combina con todo.', disc: 0, cuotas: 3, sizes: ['S','M','L','XL'], prodColors: ['Negro:#1a1a1a','Blanco:#FAFAFA','Nude:#D4B5A0'] },
  { name: 'Blusa Peplum Coral',        cat: 'Blusas',      price: 17500, old: 22000, color: '#FF7F50', emoji: '👚', badge: 'SALE',  desc: 'Blusa peplum que marca la cintura. Color tendencia.', disc: 20, cuotas: 3, sizes: ['S','M','L'] },

  // FALDAS (6 products)
  { name: 'Falda Plisada',             cat: 'Faldas',      price: 22000, old: 30000, color: '#B8C4BB', emoji: '👗', badge: '',      desc: 'Falda midi plisada con cintura elastica. Movimiento y estilo.', disc: 25, cuotas: 3, sizes: ['S','M','L'] },
  { name: 'Minifalda Jean',            cat: 'Faldas',      price: 19000, old: '',    color: '#6B8CCC', emoji: '👖', badge: 'NEW',   desc: 'Minifalda de jean con bolsillos. Casual y divertida.', disc: 0, cuotas: 3, sizes: ['24','26','28','30'] },
  { name: 'Falda Larga Boho',          cat: 'Faldas',      price: 24000, old: '',    color: '#C4956A', emoji: '🌻', badge: '',      desc: 'Falda larga estilo boho con estampado etnico.', disc: 0, cuotas: 6, sizes: ['S','M','L'] },
  { name: 'Falda Tubo Cuero',          cat: 'Faldas',      price: 26500, old: 33000, color: '#2C2C2C', emoji: '🖤', badge: 'SALE',  desc: 'Falda tubo de cuero ecologico. Sexy y elegante.', disc: 20, cuotas: 3, sizes: ['S','M','L'] },
  { name: 'Falda Tennis Blanca',       cat: 'Faldas',      price: 15000, old: '',    color: '#FFFFFF', emoji: '🎾', badge: '',      desc: 'Falda estilo tennis con tablas. Sporty chic.', disc: 0, cuotas: 3, sizes: ['S','M','L'] },
  { name: 'Falda Wrap Estampada',      cat: 'Faldas',      price: 20000, old: 25000, color: '#D4C5A9', emoji: '🌸', badge: '',      desc: 'Falda cruzada con estampado floral. Romantica y femenina.', disc: 20, cuotas: 3, sizes: ['S','M','L'] },

  // PANTALONES (8 products)
  { name: 'Pantalon Palazzo',          cat: 'Pantalones',   price: 28000, old: '',    color: '#C5BCCA', emoji: '👖', badge: '',      desc: 'Pantalon palazzo de tiro alto. Elegante y comodo.', disc: 0, cuotas: 6, sizes: ['S','M','L','XL'] },
  { name: 'Jean Mom Celeste',          cat: 'Pantalones',   price: 32000, old: 39000, color: '#87CEEB', emoji: '👖', badge: 'SALE',  desc: 'Jean mom fit tiro alto color celeste. El must have.', disc: 18, cuotas: 6, sizes: ['24','26','28','30','32'] },
  { name: 'Pantalon Cargo Beige',      cat: 'Pantalones',   price: 27000, old: '',    color: '#D2B48C', emoji: '👖', badge: 'NEW',   desc: 'Pantalon cargo con bolsillos laterales. Street style.', disc: 0, cuotas: 3, sizes: ['S','M','L','XL'] },
  { name: 'Calza Deportiva Negra',     cat: 'Pantalones',   price: 14000, old: '',    color: '#1a1a1a', emoji: '🏃', badge: '',      desc: 'Calza deportiva de alta compresion. Para gym o salir.', disc: 0, cuotas: 3, sizes: ['S','M','L','XL'], prodColors: ['Negro:#1a1a1a','Gris:#808080','Bordo:#800020'] },
  { name: 'Jean Wide Leg Negro',       cat: 'Pantalones',   price: 34000, old: 42000, color: '#1a1a1a', emoji: '👖', badge: '',      desc: 'Jean wide leg negro. El pantalon mas versatil.', disc: 20, cuotas: 6, sizes: ['24','26','28','30','32'] },
  { name: 'Short Jean Roturas',        cat: 'Pantalones',   price: 18000, old: '',    color: '#6B8CCC', emoji: '👖', badge: 'NEW',   desc: 'Short de jean con roturas. Verano total.', disc: 0, cuotas: 3, sizes: ['24','26','28','30'] },
  { name: 'Pantalon Sastrero Gris',    cat: 'Pantalones',   price: 30000, old: '',    color: '#808080', emoji: '👖', badge: '',      desc: 'Pantalon de vestir corte recto. Oficina o salida.', disc: 0, cuotas: 6, sizes: ['S','M','L'] },
  { name: 'Jogger Algodon Rosa',       cat: 'Pantalones',   price: 16000, old: 20000, color: '#FFB6C1', emoji: '🩷', badge: '',      desc: 'Jogger de algodon rosa. Comodidad con estilo.', disc: 20, cuotas: 3, sizes: ['S','M','L','XL'] },

  // ABRIGOS (6 products)
  { name: 'Campera Jean Rosa',         cat: 'Abrigos',      price: 35000, old: 65000, color: '#FFB6C1', emoji: '🧥', badge: 'SALE',  desc: 'Campera de jean rosa lavado. Onda retro y moderna.', disc: 46, cuotas: 6, sizes: ['S','M','L'] },
  { name: 'Blazer Negro Oversize',     cat: 'Abrigos',      price: 42000, old: '',    color: '#1a1a1a', emoji: '🧥', badge: 'NEW',   desc: 'Blazer negro oversize. El aliado perfecto de cualquier look.', disc: 0, cuotas: 6, sizes: ['S','M','L'] },
  { name: 'Campera Puffer Blanca',     cat: 'Abrigos',      price: 48000, old: 60000, color: '#FAFAFA', emoji: '🧥', badge: '',      desc: 'Campera puffer ultraliviana. Calida sin volumen.', disc: 20, cuotas: 6, sizes: ['S','M','L','XL'] },
  { name: 'Cardigan Tejido Beige',     cat: 'Abrigos',      price: 25000, old: '',    color: '#E8DDD3', emoji: '🧶', badge: '',      desc: 'Cardigan largo tejido. Calidez artesanal.', disc: 0, cuotas: 3, sizes: ['U'] },
  { name: 'Tapado Largo Camel',        cat: 'Abrigos',      price: 55000, old: 70000, color: '#C4956A', emoji: '🧥', badge: 'SALE',  desc: 'Tapado largo color camel. Sofisticacion pura.', disc: 22, cuotas: 6, sizes: ['S','M','L'] },
  { name: 'Chaleco Puffer Negro',      cat: 'Abrigos',      price: 32000, old: '',    color: '#2C2C2C', emoji: '🧥', badge: 'NEW',   desc: 'Chaleco puffer acolchado. Pratico y trendy.', disc: 0, cuotas: 3, sizes: ['S','M','L','XL'] },

  // TOPS (6 products)
  { name: 'Top Crop Basico',           cat: 'Tops',         price: 12000, old: '',    color: '#1a1a1a', emoji: '👚', badge: 'NEW',   desc: 'Top crop basico en algodon. Disponible en varios colores.', disc: 0, cuotas: 3, sizes: ['S','M','L'], prodColors: ['Negro:#1a1a1a','Blanco:#FAFAFA','Rosa:#FFB6C1','Verde:#90EE90'] },
  { name: 'Corset Strapless Negro',    cat: 'Tops',         price: 19000, old: 24000, color: '#1a1a1a', emoji: '🖤', badge: 'SALE',  desc: 'Corset strapless con ballenas. Sensual y estructurado.', disc: 20, cuotas: 3, sizes: ['S','M','L'] },
  { name: 'Top Halter Satinado',       cat: 'Tops',         price: 15500, old: '',    color: '#E0B0FF', emoji: '✨', badge: '',      desc: 'Top halter de satin. Elegancia minimalista.', disc: 0, cuotas: 3, sizes: ['S','M','L'] },
  { name: 'Musculosa Deportiva',       cat: 'Tops',         price: 10000, old: '',    color: '#90EE90', emoji: '💪', badge: '',      desc: 'Musculosa para entrenamiento. Tela respirable DryFit.', disc: 0, cuotas: 3, sizes: ['S','M','L','XL'] },
  { name: 'Top Bandana Estampado',     cat: 'Tops',         price: 11000, old: 14000, color: '#FF7F50', emoji: '🧣', badge: '',      desc: 'Top estilo bandana con estampado paisley. Festival vibes.', disc: 20, cuotas: 3, sizes: ['S','M','L'] },
  { name: 'Remera Oversize Rock',      cat: 'Tops',         price: 16000, old: '',    color: '#2C2C2C', emoji: '🎸', badge: 'NEW',   desc: 'Remera oversize con estampa rock. Actitud pura.', disc: 0, cuotas: 3, sizes: ['S','M','L','XL'] },

  // CONJUNTOS (4 products)
  { name: 'Conjunto Lino Natural',     cat: 'Conjuntos',    price: 38000, old: 48000, color: '#E8DDD3', emoji: '👗', badge: 'SALE',  desc: 'Conjunto de top y pantalon de lino. Fresco y elegante.', disc: 20, cuotas: 6, sizes: ['S','M','L'] },
  { name: 'Set Deportivo Gris',        cat: 'Conjuntos',    price: 25000, old: '',    color: '#808080', emoji: '🏃', badge: 'NEW',   desc: 'Set de top y calza deportiva. Para entrenar con onda.', disc: 0, cuotas: 3, sizes: ['S','M','L','XL'] },
  { name: 'Conjunto Playa Tropical',   cat: 'Conjuntos',    price: 22000, old: 28000, color: '#FF7F50', emoji: '🌴', badge: '',      desc: 'Top cruzado y short estampado tropical. Vacaciones mode.', disc: 20, cuotas: 3, sizes: ['S','M','L'] },
  { name: 'Set Pijama Seda',           cat: 'Conjuntos',    price: 30000, old: '',    color: '#E0B0FF', emoji: '🌙', badge: 'NEW',   desc: 'Conjunto de camisa y short de seda. Lujo para dormir.', disc: 0, cuotas: 6, sizes: ['S','M','L'] },

  // ZAPATOS (4 products)
  { name: 'Sandalias Taco Cuadrado',   cat: 'Zapatos',      price: 35000, old: '',    color: '#1a1a1a', emoji: '👠', badge: 'NEW',   desc: 'Sandalias de taco cuadrado 7cm. Comodas y elegantes.', disc: 0, cuotas: 6, sizes: ['35','36','37','38','39','40'] },
  { name: 'Zapatillas Plataforma',     cat: 'Zapatos',      price: 42000, old: 52000, color: '#FFFFFF', emoji: '👟', badge: 'SALE',  desc: 'Zapatillas blancas con plataforma. El basico trendy.', disc: 20, cuotas: 6, sizes: ['35','36','37','38','39','40'] },
  { name: 'Botas Texanas Marron',      cat: 'Zapatos',      price: 55000, old: '',    color: '#8B6F5E', emoji: '🥾', badge: '',      desc: 'Botas texanas de cuero ecologico. Western style.', disc: 0, cuotas: 6, sizes: ['35','36','37','38','39'] },
  { name: 'Chatitas Bailarinas',       cat: 'Zapatos',      price: 18000, old: 23000, color: '#FFB6C1', emoji: '🩰', badge: '',      desc: 'Chatitas bailarinas acolchadas. Comodidad todo el dia.', disc: 22, cuotas: 3, sizes: ['35','36','37','38','39','40'] },

  // ACCESORIOS (3 products, no sizes)
  { name: 'Bolso Cuero Marron',        cat: 'Accesorios',   price: 28000, old: '',    color: '#8B6F5E', emoji: '👜', badge: 'NEW',   desc: 'Bolso de cuero genuino con correa ajustable.', disc: 0, cuotas: 6, sizes: [] },
  { name: 'Cinturon Dorado Cadena',    cat: 'Accesorios',   price: 9500,  old: 12000, color: '#FFD700', emoji: '⛓️', badge: '',     desc: 'Cinturon tipo cadena dorada. Detalle que transforma.', disc: 20, cuotas: 3, sizes: [] },
  { name: 'Panuelo Seda Estampado',    cat: 'Accesorios',   price: 8000,  old: '',    color: '#E0B0FF', emoji: '🧣', badge: '',      desc: 'Panuelo de seda con estampado exclusivo. Usalo como top, en el pelo o en el bolso.', disc: 0, cuotas: 3, sizes: [] },
];

async function seed() {
  if (!SHEET_ID) {
    console.error('ERROR: GOOGLE_SHEETS_ID not set in .env');
    process.exit(1);
  }

  const auth = getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // Clear existing data (keep headers)
  console.log('Clearing existing product data...');
  try {
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SHEET_ID,
      range: 'Productos!A2:P500',
    });
  } catch (e) {
    console.log('  (no data to clear)');
  }

  // Build rows — products with colors × sizes become multiple rows
  const rows = [];
  let id = 1;
  for (const p of products) {
    const hasSizes = p.sizes && p.sizes.length > 0;
    const hasColors = p.prodColors && p.prodColors.length > 0;

    if (hasColors && hasSizes) {
      // color × size combinations
      for (const colorStr of p.prodColors) {
        for (const size of p.sizes) {
          const stock = Math.floor(Math.random() * 10) + 1;
          rows.push([
            id++, p.name, p.cat, p.price, p.old || '', stock,
            p.color, p.emoji, p.badge, 'Sí', p.desc, '', p.disc || '', p.cuotas || '', size, colorStr
          ]);
        }
      }
    } else if (hasSizes) {
      for (const size of p.sizes) {
        const stock = Math.floor(Math.random() * 15) + 2;
        rows.push([
          id++, p.name, p.cat, p.price, p.old || '', stock,
          p.color, p.emoji, p.badge, 'Sí', p.desc, '', p.disc || '', p.cuotas || '', size, ''
        ]);
      }
    } else {
      const stock = Math.floor(Math.random() * 20) + 5;
      rows.push([
        id++, p.name, p.cat, p.price, p.old || '', stock,
        p.color, p.emoji, p.badge, 'Sí', p.desc, '', p.disc || '', p.cuotas || '', '', ''
      ]);
    }
  }

  console.log(`Writing ${rows.length} rows (${products.length} unique products)...`);

  await sheets.spreadsheets.values.update({
    spreadsheetId: SHEET_ID,
    range: `Productos!A2:P${rows.length + 1}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rows },
  });

  console.log(`\nDone! ${rows.length} rows written.`);
  console.log(`  ${products.length} unique products`);
  console.log(`  ${products.filter(p => p.sizes?.length > 0).length} products with sizes`);
  console.log(`  ${products.filter(p => p.prodColors?.length > 0).length} products with colors`);
  console.log(`  ${products.filter(p => p.disc > 0).length} products with discounts`);
  console.log(`  Categories: ${[...new Set(products.map(p => p.cat))].join(', ')}`);
}

seed().catch(err => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
