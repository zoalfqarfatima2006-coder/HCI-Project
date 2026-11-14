// Patchwork Prototype Builder
// Creates a "Patchwork — Interactive Prototype" page with all 29 screens, clickable hotspots,
// interactive components (selectable chips/cards, checkboxes, tap-to-fill inputs),
// demo-limit toasts, an auto-advancing loading state, and a flow starting at 01 Landing Page.

figma.showUI(__html__, { visible: false });

// ---------- design tokens (sampled from the screens) ----------
const hex = (h) => ({ r: parseInt(h.slice(1, 3), 16) / 255, g: parseInt(h.slice(3, 5), 16) / 255, b: parseInt(h.slice(5, 7), 16) / 255 });
const GREEN = hex('#496a56');
const CREAM = hex('#fffdf7');
const INK = hex('#252a26');
const WHITE = hex('#ffffff');
const solid = (color, opacity = 1) => ({ type: 'SOLID', color, opacity });

// Figma Linux can't load fonts, so every piece of text the plugin adds is rendered to a PNG
// in the plugin UI (browser canvas, system fonts) and used as an image fill. No font service needed.
let RENDERED = {}; // key -> { hash, w, h }
const labelKey = (kind, label, w, h) => `${kind}|${label}|${w}x${h}`;
const imgFill = (hash) => ({ type: 'IMAGE', scaleMode: 'FILL', imageHash: hash });

function labelLayer(w, h) {
  const r = figma.createRectangle();
  r.name = 'Label';
  r.resize(w, h);
  r.fills = [];
  r.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
  return r;
}

function checkMark(size) {
  const v = figma.createVector();
  v.name = 'Check';
  v.vectorPaths = [{ windingRule: 'NONE', data: `M ${size * 0.28} ${size * 0.52} L ${size * 0.44} ${size * 0.68} L ${size * 0.74} ${size * 0.34}` }];
  v.fills = [];
  v.strokes = [solid(WHITE)];
  v.strokeWeight = 2;
  v.strokeCap = 'ROUND';
  v.strokeJoin = 'ROUND';
  return v;
}

function badge(size) {
  const f = figma.createFrame();
  f.name = 'Badge';
  f.resize(size, size);
  f.cornerRadius = size / 2;
  f.fills = [solid(GREEN)];
  const c = checkMark(size);
  f.appendChild(c);
  c.x = (size - c.width) / 2;
  c.y = (size - c.height) / 2;
  return f;
}

async function setReactions(node, reactions) {
  await node.setReactionsAsync(reactions);
}

const FADE = { type: 'DISSOLVE', easing: { type: 'EASE_OUT' }, duration: 0.25 };
const SNAP = { type: 'SMART_ANIMATE', easing: { type: 'EASE_OUT' }, duration: 0.15 };

// ---------- interactive component sets (Off <-> On on click) ----------
async function toggleSet(name, w, h, build, holder) {
  const off = figma.createComponent();
  const on = figma.createComponent();
  for (const [c, state] of [[off, 'Off'], [on, 'On']]) {
    c.name = `State=${state}`;
    c.resize(w, h);
    c.fills = [];
    c.clipsContent = false;
    build(c, state === 'On');
  }
  const set = figma.combineAsVariants([off, on], holder);
  set.name = name;
  set.layoutMode = 'HORIZONTAL';
  set.primaryAxisSizingMode = 'AUTO';
  set.counterAxisSizingMode = 'AUTO';
  set.itemSpacing = 32;
  set.paddingLeft = set.paddingRight = set.paddingTop = set.paddingBottom = 24;
  set.fills = [solid(hex('#f8f4eb'))];
  await setReactions(off, [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: on.id, navigation: 'CHANGE_TO', transition: SNAP }] }]);
  await setReactions(on, [{ trigger: { type: 'ON_CLICK' }, actions: [{ type: 'NODE', destinationId: off.id, navigation: 'CHANGE_TO', transition: SNAP }] }]);
  return off; // default variant
}

async function buildComponents(holder) {
  // Pill chip: selected = solid green pill with white label (label text is overridden per instance)
  const chip = await toggleSet('Toggle / Chip', 195, 34, (c, on) => {
    c.cornerRadius = 17;
    c.fills = on ? [solid(GREEN)] : [];
    const l = labelLayer(195, 34);
    c.appendChild(l);
    l.opacity = on ? 1 : 0;
  }, holder);

  // Selectable card: selected = green outline + check badge
  const card = await toggleSet('Toggle / Card', 310, 126, (c, on) => {
    c.cornerRadius = 14;
    c.fills = on ? [solid(GREEN, 0.06)] : [];
    c.strokes = on ? [solid(GREEN)] : [];
    c.strokeWeight = 2;
    c.strokeAlign = 'INSIDE';
    const b = badge(24);
    c.appendChild(b);
    b.x = 310 - 38; b.y = 14;
    b.constraints = { horizontal: 'MAX', vertical: 'MIN' };
    b.opacity = on ? 1 : 0;
  }, holder);

  // Checkbox: covers box + label; checked = green box with tick
  const checkbox = await toggleSet('Toggle / Checkbox', 200, 18, (c, on) => {
    const b = badge(18);
    b.name = 'Box';
    b.cornerRadius = 4;
    c.appendChild(b);
    b.x = 0; b.y = 0;
    b.constraints = { horizontal: 'MIN', vertical: 'MIN' };
    b.opacity = on ? 1 : 0;
  }, holder);

  // Input: tap to fill with sample value (value text overridden per instance)
  const input = await toggleSet('Toggle / Input', 440, 46, (c, on) => {
    c.cornerRadius = 8;
    c.strokes = on ? [solid(GREEN)] : [];
    c.strokeWeight = 1.5;
    c.strokeAlign = 'INSIDE';
    const cover = figma.createRectangle();
    cover.name = 'Cover';
    cover.resize(436, 42);
    cover.x = 2; cover.y = 2;
    cover.cornerRadius = 6;
    cover.fills = [solid(CREAM)];
    cover.constraints = { horizontal: 'STRETCH', vertical: 'STRETCH' };
    cover.opacity = on ? 1 : 0;
    c.appendChild(cover);
    const v = labelLayer(440, 46);
    c.appendChild(v);
    v.opacity = on ? 1 : 0;
  }, holder);

  return { chip, card, checkbox, input };
}

// ---------- toasts for things the demo intentionally doesn't cover ----------
const TOASTS = {
  reset: 'Password recovery is not connected in this demo.',
  resource: 'Only the Glass jars detail screen is included in this prototype.',
  idea: 'Only the Jar herb garden idea has a detail screen in this prototype.',
  project: 'Only the Jar herb garden project is included in this prototype.',
  category: 'Only the Gardening story is included in this prototype.',
  settings: 'This settings editor is not included in the prototype yet.',
};

async function buildToasts(originX, originY) {
  const out = {};
  let i = 0;
  for (const key of Object.keys(TOASTS)) {
    const img = RENDERED[labelKey('toast', key, 0, 0)];
    const f = figma.createFrame();
    f.name = `Toast / ${key}`;
    f.resize(img.w, img.h);
    f.fills = [imgFill(img.hash)];
    f.cornerRadius = 12;
    f.x = originX + (i % 3) * 640;
    f.y = originY + Math.floor(i / 3) * 120;
    await setReactions(f, [
      { trigger: { type: 'ON_CLICK' }, actions: [{ type: 'CLOSE' }] },
      { trigger: { type: 'AFTER_TIMEOUT', timeout: 2800 }, actions: [{ type: 'CLOSE' }] },
    ]);
    out[key] = f;
    i++;
  }
  return out;
}

// ---------- screen interaction map (coordinates in 1440x900 screen space) ----------
const CTA = [250, 790, 220, 44];
const R1 = [250, 590, 930].map((x) => [x, 255, 310, 126]);
const R2 = [250, 590, 930].map((x) => [x, 405, 310, 126]);
const SIDEBAR = [['Home', '05'], ['My resources', '06'], ['Saved ideas', '18'], ['My projects', '19'], ['Inspiration', '23'], ['Settings', '26']];
const AUTH = new Set(['01', '02', '03', '04']);
const T = (k) => ({ toast: k });
const chipRow = (xs, y, w, labels) => labels.map((l, i) => [[xs[i], y, w, 34], l]);

const SPEC = {
  '01': { links: [[[250, 260, 490, 126], '02', 'What can I make?'], [[770, 260, 490, 126], '02', 'I have a goal'], [[250, 440, 190, 44], '02', 'Create free account'], [[455, 440, 140, 44], '03', 'Log in'], [CTA, '02', 'Choose a journey']] },
  '02': {
    inputs: [[[250, 276, 440, 46], 'Fatima Ahmed'], [[250, 364, 440, 46], 'fatima@example.com'], [[250, 452, 440, 46], '••••••••••'], [[250, 540, 440, 46], '••••••••••']],
    checks: [[250, 600, 305, 18]],
    links: [[[248, 654, 156, 20], '04', 'Continue with Google'], [[394, 694, 40, 20], '03', 'Log in'], [CTA, '04', 'Continue']],
  },
  '03': {
    inputs: [[[250, 291, 440, 46], 'fatima@example.com'], [[250, 386, 440, 46], '••••••••••']],
    checks: [[250, 455, 112, 18]],
    links: [[[538, 453, 108, 20], T('reset'), 'Forgot password?'], [[358, 519, 128, 20], '02', 'Create a free account'], [CTA, '04', 'Continue']],
  },
  '04': {
    chips: [
      ...chipRow([250, 470, 690], 295, 195, ['Home & everyday', 'Food & ingredients', 'Tech & tinkering']),
      ...chipRow([250, 470, 690], 357, 195, ['Art & making', 'Repair & restore', 'Garden & outdoors']),
      ...chipRow([250, 400, 550], 482, 135, ['Beginner', 'Comfortable', 'Experienced']),
    ],
    links: [[CTA, '05', 'Continue']],
  },
  '05': { links: [[[250, 260, 310, 126], '06', 'Resource library'], [[590, 260, 310, 126], '19', 'Projects in progress'], [[930, 260, 310, 126], '18', 'Saved ideas'], [[250, 420, 490, 126], '09', 'What can I make?'], [[770, 420, 490, 126], '14', 'I have a goal'], [CTA, '06', 'Open resource library']] },
  '06': {
    links: [
      [R1[0], T('resource'), 'Cardboard sheets'], [R1[1], '08', 'Glass jars'], [R1[2], T('resource'), 'Cotton offcuts'],
      [R2[0], T('resource'), 'USB cables'], [R2[1], T('resource'), 'Rice'], [R2[2], T('resource'), 'Basic tools'],
      [[248, 588, 315, 22], '27', 'Preview empty library'], [[248, 628, 285, 22], '28', 'Preview error'], [CTA, '07', 'Add resource'],
    ],
  },
  '07': {
    inputs: [[[250, 271, 440, 46], 'Glass jars'], [[250, 496, 210, 46], '6'], [[480, 496, 210, 46], 'jars'], [[250, 671, 440, 46], 'Kitchen shelf']],
    chips: [
      ...chipRow([250, 370, 490, 610], 360, 108, ['Fabric', 'Paper', 'Glass', 'Electronics']),
      ...chipRow([250, 370, 490, 610], 408, 108, ['Food', 'Tools', 'Garden', 'Custom']),
      ...chipRow([250, 370, 490, 610], 586, 108, ['New', 'Good', 'Worn', 'Needs repair']),
    ],
    links: [[CTA, '06', 'Continue']],
  },
  '08': { links: [[R2[0], '12', 'Possible uses'], [R2[1], '07', 'Edit resource'], [CTA, '09', 'Continue']] },
  '09': { cards: [R1[0], R1[1], R1[2], R2[0]], links: [[R2[1], '07', 'Add custom resource'], [CTA, '10', 'Review resources']] },
  '10': { links: [[CTA, '11', 'Set preferences']] },
  '11': { cards: [R1[0], R1[1], R1[2], R2[0], R2[1]], links: [[CTA, '29', 'Discover ideas']] },
  '12': { links: [[R1[0], '13', 'Jar herb garden'], [R1[1], T('idea'), 'Desk organiser'], [R1[2], T('idea'), 'Cable tidy'], [R2[0], T('idea'), 'Cardboard dividers'], [CTA, '13', 'Open idea details']] },
  '13': { links: [[R2[1], '18', 'Save idea'], [CTA, '20', 'Start project']] },
  '14': {
    chips: [...chipRow([250, 500], 508, 225, ['Organize a small space', 'Repair a loose item']), ...chipRow([250, 500], 563, 225, ['Grow herbs at home', 'Reduce everyday clutter'])],
    links: [[CTA, '15', 'Find my resources']],
  },
  '15': { links: [[CTA, '16', 'Compare solutions']] },
  '16': { cards: [R1[0], R1[1], R1[2]], links: [[CTA, '17', 'Adapt materials']] },
  '17': { links: [[CTA, '20', 'Plan project']] },
  '18': { links: [[R1[0], '13', 'Jar herb garden'], [R1[1], T('idea'), 'Folded cardboard caddy'], [R1[2], T('idea'), 'Cable tidy'], [R2[0], T('idea'), 'Jar pen holder'], [CTA, '13', 'Continue']] },
  '19': { links: [[R1[0], '20', 'Jar herb garden'], [R1[1], T('project'), 'Desk organiser'], [R1[2], T('project'), 'Cable tidy'], [CTA, '20', 'Continue']] },
  '20': { links: [[CTA, '21', 'Open making guide']] },
  '21': { cards: [R1[0], R1[1], R1[2], R2[0]], links: [[CTA, '22', 'Complete project']] },
  '22': { links: [[CTA, '25', 'View personal impact']] },
  '23': { links: [[R1[0], T('category'), 'Food & ingredients'], [R1[1], T('category'), 'Electronics & repair'], [R1[2], T('category'), 'Home improvement'], [R2[0], '24', 'Gardening'], [R2[1], T('category'), 'Art & making'], [R2[2], T('category'), 'Everyday fixes'], [CTA, '24', 'Continue']] },
  '24': { links: [[R1[0], '13', 'Community example'], [CTA, '13', 'Continue']] },
  '25': { links: [[CTA, '05', 'Continue']] },
  '26': {
    links: [
      [[250, 250, 760, 58], T('settings'), 'Profile information'], [[250, 322, 760, 58], '04', 'Interests and skill level'],
      [[250, 394, 760, 58], T('settings'), 'Notifications'], [[250, 466, 760, 58], T('settings'), 'Accessibility'],
      [[250, 538, 760, 58], T('settings'), 'Privacy and account'], [[250, 610, 760, 58], T('settings'), 'Help and support'],
      [[250, 682, 760, 58], '01', 'Log out'], [CTA, '05', 'Continue'],
    ],
  },
  '27': { links: [[[690, 290, 110, 110], '07', 'Add (+)'], [[430, 645, 210, 44], '07', 'Add first resource'], [CTA, '07', 'Continue']] },
  '28': { links: [[[430, 645, 210, 44], '29', 'Retry'], [CTA, '29', 'Retry']] },
  '29': { links: [[[430, 645, 210, 44], '05', 'Back to dashboard'], [CTA, '12', 'Continue']], timeout: ['12', 2500] },
};

// ---------- build ----------
let SCREENS = null;
figma.ui.onmessage = async (msg) => {
  try {
    if (msg.type === 'images') {
      // Phase 1: got screens; ask the UI to render every text label as a PNG.
      SCREENS = msg.images;
      const items = [];
      for (const s of Object.values(SPEC)) {
        for (const [r, label] of s.chips || []) items.push({ key: labelKey('chip', label, r[2], r[3]), kind: 'chip', text: label, w: r[2], h: r[3] });
        for (const [r, label] of s.inputs || []) items.push({ key: labelKey('input', label, r[2], r[3]), kind: 'input', text: label, w: r[2], h: r[3] });
      }
      for (const [key, msgText] of Object.entries(TOASTS)) items.push({ key: labelKey('toast', key, 0, 0), kind: 'toast', text: msgText });
      figma.ui.postMessage({ type: 'render', items });
      return;
    }
    if (msg.type === 'rendered') {
      // Phase 2: labels ready; build everything.
      for (const it of msg.items) RENDERED[it.key] = { hash: figma.createImage(it.bytes).hash, w: it.w, h: it.h };
      await build(SCREENS);
    }
  } catch (e) {
    figma.closePlugin('❌ Build failed: ' + (e && e.message ? e.message : e));
  }
};

async function build(images) {
  figma.notify('Building Patchwork prototype…', { timeout: 4000 });

  const byKey = {};
  const docs = [];
  for (const img of images) {
    const m = img.name.match(/^(\d\d) /);
    if (m) byKey[m[1]] = img; else docs.push(img);
  }

  // Docs page (cover, declarations, inventory, traceability) — static
  await freshPage('Patchwork — Submission docs');
  const docOrder = ['SUBMISSION COVER', 'CORE USER JOURNEY', 'FOUR FUNCTIONAL AREAS', 'ASSIGNMENT', 'TRACEABILITY'];
  docs.sort((a, b) => docOrder.findIndex((p) => a.name.startsWith(p)) - docOrder.findIndex((p) => b.name.startsWith(p)));
  let dx = 0;
  for (const d of docs) {
    const f = await imageFrame(d);
    f.x = dx; f.y = 0;
    dx += f.width + 160;
  }

  // Prototype page
  const page = await freshPage('Patchwork — Interactive Prototype');

  const frames = {};
  const keys = Object.keys(SPEC);
  const COLS = 6, GAP_X = 200, GAP_Y = 280;
  for (let i = 0; i < keys.length; i++) {
    const k = keys[i];
    if (!byKey[k]) throw new Error(`Missing screen image ${k}`);
    const f = await imageFrame(byKey[k]);
    f.x = (i % COLS) * (1440 + GAP_X);
    f.y = Math.floor(i / COLS) * (900 + GAP_Y);
    frames[k] = f;
  }
  const rows = Math.ceil(keys.length / COLS);
  const belowY = rows * (900 + GAP_Y) + 200;

  const holder = figma.createFrame();
  holder.name = '⚙︎ Prototype components (do not delete)';
  holder.layoutMode = 'VERTICAL';
  holder.primaryAxisSizingMode = 'AUTO';
  holder.counterAxisSizingMode = 'AUTO';
  holder.itemSpacing = 40;
  holder.paddingLeft = holder.paddingRight = holder.paddingTop = holder.paddingBottom = 40;
  holder.x = 0; holder.y = belowY;
  const C = await buildComponents(holder);
  const toasts = await buildToasts(holder.x + holder.width + 300, belowY);

  const actionFor = (target) => {
    if (target === 'BACK') return { type: 'BACK' };
    if (typeof target === 'object') return { type: 'NODE', destinationId: toasts[target.toast].id, navigation: 'OVERLAY', transition: FADE };
    return { type: 'NODE', destinationId: frames[target].id, navigation: 'NAVIGATE', transition: FADE, preserveScrollPosition: false };
  };

  const hotspot = async (frame, [x, y, w, h], target, label) => {
    if (typeof target === 'string' && frames[target] === frame) return; // Figma rejects links to the current screen
    const n = figma.createFrame();
    n.name = `⟶ ${label}`;
    n.fills = [];
    n.resize(w, h);
    n.x = x; n.y = y;
    frame.appendChild(n);
    await setReactions(n, [{ trigger: { type: 'ON_CLICK' }, actions: [actionFor(target)] }]);
    count++;
  };

  const place = (frame, comp, [x, y, w, h], name) => {
    const inst = comp.createInstance();
    frame.appendChild(inst);
    inst.resize(w, h);
    inst.x = x; inst.y = y;
    inst.name = name;
    return inst;
  };

  let count = 0;
  for (const k of keys) {
    const f = frames[k];
    const s = SPEC[k];

    // Shared chrome: logo, sidebar, back, profile
    await hotspot(f, [30, 14, 130, 40], AUTH.has(k) ? '01' : '05', 'Logo');
    for (let i = 0; i < SIDEBAR.length; i++) {
      await hotspot(f, [18, 114 + 54 * i, 184, 40], SIDEBAR[i][1], `Nav · ${SIDEBAR[i][0]}`);
    }
    if (k !== '01') await hotspot(f, [1080, 18, 74, 34], 'BACK', 'Back');
    await hotspot(f, [1262, 18, 84, 30], AUTH.has(k) ? '03' : '26', 'Profile');

    for (const [r, label] of s.inputs || []) {
      const inst = place(f, C.input, r, `Input · ${label}`);
      inst.findOne((n) => n.name === 'Label').fills = [imgFill(RENDERED[labelKey('input', label, r[2], r[3])].hash)];
      count++;
    }
    for (const [r, label] of s.chips || []) {
      const inst = place(f, C.chip, r, `Chip · ${label}`);
      inst.findOne((n) => n.name === 'Label').fills = [imgFill(RENDERED[labelKey('chip', label, r[2], r[3])].hash)];
      count++;
    }
    for (const r of s.checks || []) { place(f, C.checkbox, r, 'Checkbox'); count++; }
    (s.cards || []).forEach((r, i) => { place(f, C.card, r, `Selectable card ${i + 1}`); count++; });
    for (const [r, target, label] of s.links || []) await hotspot(f, r, target, label);

    if (s.timeout) {
      await setReactions(f, [{ trigger: { type: 'AFTER_TIMEOUT', timeout: s.timeout[1] }, actions: [actionFor(s.timeout[0])] }]);
      count++;
    }
  }

  page.flowStartingPoints = [{ nodeId: frames['01'].id, name: 'Patchwork — full prototype' }];
  figma.viewport.scrollAndZoomIntoView([frames['01']]);
  figma.closePlugin(`✅ Patchwork prototype built: ${keys.length} screens, ${count} interactions. Press ▶ Present to try it.`);
}

// Reuses a page with this name (clearing it) so re-runs don't exceed the Free plan's 3-page limit.
async function freshPage(name) {
  let page = figma.root.children.find((p) => p.name === name);
  if (page) {
    await page.loadAsync();
    for (const n of [...page.children]) n.remove();
  } else {
    page = figma.createPage();
    page.name = name;
  }
  await figma.setCurrentPageAsync(page);
  return page;
}

async function imageFrame(img) {
  const image = figma.createImage(img.bytes);
  const { width, height } = await image.getSizeAsync();
  const f = figma.createFrame();
  f.name = img.name;
  f.resize(width, height);
  f.fills = [{ type: 'IMAGE', scaleMode: 'FILL', imageHash: image.hash }];
  f.clipsContent = true;
  return f;
}
