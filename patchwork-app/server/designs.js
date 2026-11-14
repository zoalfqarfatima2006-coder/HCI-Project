// 2D patchwork design model — shared by the server, the browser-only build and the studio UI.
// A design is a grid of patches. Patch order in the array = position in the grid (row-major),
// so rearranging patches is just reordering the array.

export const MATERIALS = [
  { key: 'cotton', name: 'Cotton', keywords: ['cotton', 'offcut', 'shirt', 'fabric', 'cloth'] },
  { key: 'denim', name: 'Denim', keywords: ['denim', 'jean'] },
  { key: 'linen', name: 'Linen', keywords: ['linen'] },
  { key: 'corduroy', name: 'Corduroy', keywords: ['corduroy', 'cord'] },
  { key: 'felt', name: 'Felt', keywords: ['felt', 'wool'] },
  { key: 'gingham', name: 'Gingham', keywords: ['gingham', 'check'] },
  { key: 'polka', name: 'Polka dot', keywords: ['polka', 'dot'] },
  { key: 'floral', name: 'Floral print', keywords: ['floral', 'print', 'flower'] },
  { key: 'stripes', name: 'Stripes', keywords: ['stripe'] },
];
export const MATERIAL_KEYS = MATERIALS.map((m) => m.key);
export const SHAPES = ['square', 'triangle', 'circle', 'diamond'];
export const ROTATIONS = [0, 90, 180, 270];
export const HEX_RE = /^#[0-9a-f]{6}$/i;
export const LIMITS = { minGrid: 2, maxGrid: 8, maxName: 60, maxVariations: 6 };

const isObj = (v) => v && typeof v === 'object' && !Array.isArray(v);

function cleanComposition(c, label) {
  if (!isObj(c)) throw new Error(`${label} is missing.`);
  const cols = Number(c.cols);
  const rows = Number(c.rows);
  if (!Number.isInteger(cols) || !Number.isInteger(rows) || cols < LIMITS.minGrid || rows < LIMITS.minGrid || cols > LIMITS.maxGrid || rows > LIMITS.maxGrid) {
    throw new Error(`Grid must be between ${LIMITS.minGrid}×${LIMITS.minGrid} and ${LIMITS.maxGrid}×${LIMITS.maxGrid}.`);
  }
  if (!Array.isArray(c.patches) || c.patches.length !== cols * rows) throw new Error(`${label} must have exactly ${cols * rows} patches.`);
  const patches = c.patches.map((p, i) => {
    if (!isObj(p)) throw new Error(`Patch ${i + 1} is invalid.`);
    if (!MATERIAL_KEYS.includes(p.material)) throw new Error(`Patch ${i + 1} has an unknown material.`);
    if (!HEX_RE.test(p.color || '')) throw new Error(`Patch ${i + 1} needs a colour like #496a56.`);
    const shape = SHAPES.includes(p.shape) ? p.shape : 'square';
    const rotation = ROTATIONS.includes(Number(p.rotation)) ? Number(p.rotation) : 0;
    return { material: p.material, color: p.color.toLowerCase(), shape, rotation };
  });
  const background = HEX_RE.test(c.background || '') ? c.background.toLowerCase() : '#fffdf7';
  const seam = HEX_RE.test(c.seam || '') ? c.seam.toLowerCase() : '#f8f4eb';
  return { cols, rows, patches, background, seam };
}

/** Validates and normalises a design payload. Throws Error(message) for bad input. */
export function cleanDesign(body) {
  if (!isObj(body)) throw new Error('Design data is missing.');
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) throw new Error('Give your design a name.');
  if (name.length > LIMITS.maxName) throw new Error(`Name must be at most ${LIMITS.maxName} characters.`);
  const composition = cleanComposition(body.composition, 'Design');
  const variations = Array.isArray(body.variations) ? body.variations.slice(0, LIMITS.maxVariations).map((v, i) => {
    if (!isObj(v)) throw new Error(`Variation ${i + 1} is invalid.`);
    const label = typeof v.label === 'string' && v.label.trim() ? v.label.trim().slice(0, 30) : `Variation ${i + 1}`;
    return { label, composition: cleanComposition(v.composition, `Variation ${i + 1}`) };
  }) : [];
  return { name, composition, variations };
}

/** Counts patches per material, e.g. { cotton: 9, denim: 4 }. */
export function materialCounts(composition) {
  const out = {};
  for (const p of composition.patches) out[p.material] = (out[p.material] || 0) + 1;
  return out;
}

/** Matches the design's materials against the user's resource shelf. */
export function materialPlan(composition, resources) {
  const counts = materialCounts(composition);
  return Object.entries(counts).map(([key, needed]) => {
    const mat = MATERIALS.find((m) => m.key === key);
    const match = resources.find((r) => mat.keywords.some((k) => r.name.toLowerCase().includes(k)))
      || (key === 'cotton' ? resources.find((r) => r.category === 'Fabric') : null);
    const have = match ? Number(match.quantity) : 0;
    return { key, name: mat.name, needed, have, resource: match ? { id: match.id, name: match.name, unit: match.unit } : null, enough: have >= needed };
  }).sort((a, b) => b.needed - a.needed);
}

// ---------- starter templates ----------
const P = (material, color, shape = 'square', rotation = 0) => ({ material, color, shape, rotation });
const grid = (cols, rows, fn) => ({ cols, rows, background: '#fffdf7', seam: '#f8f4eb', patches: Array.from({ length: cols * rows }, (_, i) => fn(i % cols, Math.floor(i / cols), i)) });

export const TEMPLATES = [
  { key: 'blank', name: 'Blank canvas', description: 'Sixteen plain cotton patches to start from scratch.',
    composition: grid(4, 4, () => P('cotton', '#efe6d2')) },
  { key: 'checkerboard', name: 'Classic checkerboard', description: 'Alternating green cotton and natural linen.',
    composition: grid(4, 4, (x, y) => ((x + y) % 2 ? P('linen', '#efe6d2') : P('cotton', '#496a56'))) },
  { key: 'herb-garden', name: 'Herb garden quilt', description: 'Greens, sunny yellow and floral accents.',
    composition: grid(4, 4, (x, y) => {
      if ((x === 0 || x === 3) && (y === 0 || y === 3)) return P('floral', '#e3b059');
      if (x === 1 && y === 1) return P('felt', '#496a56', 'circle');
      if (x === 2 && y === 2) return P('felt', '#496a56', 'circle');
      if ((x + y) % 2) return P('gingham', '#7f9f84');
      return P('cotton', '#deebd9', 'triangle', ((x + y) * 90) % 360);
    }) },
  { key: 'sunset', name: 'Sunset strips', description: 'Warm horizontal bands, striped and corded.',
    composition: grid(5, 4, (x, y) => {
      const colors = ['#e3b059', '#d98b4a', '#be6047', '#8c3a24'];
      return P(y % 2 ? 'corduroy' : 'stripes', colors[y], 'square', y % 2 ? 90 : 0);
    }) },
  { key: 'denim-mix', name: 'Denim remix', description: 'Old jeans with gingham and polka-dot pops.',
    composition: grid(4, 4, (x, y) => {
      if (x === y) return P('polka', '#be6047', 'diamond');
      if (x + y === 3) return P('gingham', '#e3b059');
      return P('denim', ['#3f5b7a', '#5b7898', '#2f4560'][(x + 2 * y) % 3]);
    }) },
];
