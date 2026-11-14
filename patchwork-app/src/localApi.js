// Browser-only Patchwork backend used by the static build (e.g. a Hugging Face static Space).
// It answers the same /api routes as server/index.js, storing data in this browser's localStorage.
// Same matching engine and idea catalogue as the server.
import { IDEAS, STORIES, INSPIRATION_CATEGORIES } from '../server/catalog.js';
import { hydrateIdea, matchIdea, discover, matchGoal } from '../server/matching.js';
import { cleanDesign, TEMPLATES } from '../server/designs.js';

const DB_KEY = 'patchwork_db_v1';
const SESSION_KEY = 'patchwork_session';
const DEMO_EMAIL = 'fatima@example.com';
const DEMO_PASSWORD = 'patchwork123';

class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };

// ---------- storage ----------
const now = (offsetDays = 0) => new Date(Date.now() + offsetDays * 864e5).toISOString().slice(0, 19).replace('T', ' ');
let db = null;
function load() {
  if (db) return db;
  try { db = JSON.parse(localStorage.getItem(DB_KEY)); } catch { db = null; }
  if (db && !db.designs) db.designs = [];
  return db;
}
function save() { try { localStorage.setItem(DB_KEY, JSON.stringify(db)); } catch { /* storage full or blocked */ } }
const nextId = (table) => { db.seq[table] = (db.seq[table] || 0) + 1; return db.seq[table]; };

// ---------- password hashing (PBKDF2, Web Crypto) ----------
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
async function hashPassword(password, saltHex) {
  const salt = saltHex || hex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: new TextEncoder().encode(salt), iterations: 120000 }, key, 256);
  return `${salt}:${hex(bits)}`;
}
async function checkPassword(password, stored) {
  const [salt] = stored.split(':');
  return (await hashPassword(password, salt)) === stored;
}
const token = () => hex(crypto.getRandomValues(new Uint8Array(24)));

// ---------- seed (same sample data as server/seed.js) ----------
async function ensureSeeded() {
  if (load()) return;
  db = { seq: {}, users: [], sessions: [], resets: [], resources: [], saved: [], goals: [], projects: [], designs: [] };
  const uid = nextId('users');
  db.users.push({
    id: uid, name: 'Fatima', email: DEMO_EMAIL, password_hash: await hashPassword(DEMO_PASSWORD),
    interests: ['home', 'garden', 'food'], skill_level: 'Beginner', onboarded: true,
    preferences: { time: '120', budget: '500', difficulty: 'Easy', type: 'any' }, settings: {}, created_at: now(-30),
  });
  const r = {};
  for (const [key, name, category, quantity, unit, condition, location, notes] of [
    ['cardboard', 'Cardboard sheets', 'Paper', 4, 'sheets', 'Good', 'Store room', 'Flattened delivery boxes.'],
    ['jars', 'Glass jars', 'Glass', 6, 'jars', 'Good', 'Kitchen shelf', 'Clean; lids included. Check rims for chips.'],
    ['cotton', 'Cotton offcuts', 'Fabric', 12, 'pieces', 'Good', 'Sewing box', '100% cotton scraps from old shirts.'],
    ['usb', 'USB cables', 'Electronics', 3, 'cables', 'Good', 'Desk drawer', 'All three tested and working.'],
    ['rice', 'Rice', 'Food', 1, 'kg', 'New', 'Pantry', ''],
    ['tools', 'Basic tools', 'Tools', 1, 'set', 'Good', 'Toolbox', 'Scissors, screwdriver, needle and thread.'],
  ]) {
    const id = nextId('resources');
    r[key] = id;
    db.resources.push({ id, user_id: uid, name, category, quantity, unit, condition, location, notes, created_at: now(-20), updated_at: now(-20) });
  }
  for (const idea_id of ['jar-herb-garden', 'cardboard-caddy', 'cable-tidy', 'jar-pen-holder']) db.saved.push({ user_id: uid, idea_id, created_at: now(-10) });
  const proj = (idea_id, title, status, steps, budget, cost, reused, completedDays) => db.projects.push({
    id: nextId('projects'), user_id: uid, idea_id, goal_id: null, title, status, steps_done: steps, substitutions: [], budget,
    cost_recorded: cost, reused_items: reused, notes: '', started_at: now(-14), completed_at: completedDays == null ? null : now(-completedDays),
  });
  proj('jar-herb-garden', 'Jar herb garden', 'active', [true, true, false, false], 500, null, [], null);
  proj('desk-organiser', 'Desk organiser', 'active', [true, false, false, false], 300, null, [], null);
  proj('cable-tidy', 'Cable tidy', 'completed', [true, true, true, true], 0, 0,
    [{ resourceId: r.cotton, name: 'Cotton offcuts', qty: 3 }, { resourceId: r.cardboard, name: 'Cardboard sheets', qty: 1 }], 7);
  proj('jar-pen-holder', 'Jar pen holder', 'completed', [true, true, true, true], 0, 0,
    [{ resourceId: r.jars, name: 'Glass jars', qty: 1 }, { resourceId: r.cotton, name: 'Cotton offcuts', qty: 2 }], 6);
  db.designs.push({
    id: nextId('designs'), user_id: uid, name: 'Kitchen herb quilt',
    composition: TEMPLATES.find((t) => t.key === 'herb-garden').composition,
    variations: [{ label: 'Checker idea', composition: TEMPLATES.find((t) => t.key === 'checkerboard').composition }],
    created_at: now(-3), updated_at: now(-3),
  });
  save();
}

// ---------- validation (same rules as the server) ----------
function str(v, field, { min = 1, max = 200, optional = false } = {}) {
  if (v === undefined || v === null || v === '') { if (optional) return ''; fail(400, `${field} is required.`); }
  if (typeof v !== 'string') fail(400, `${field} must be text.`);
  const t = v.trim();
  if (t.length < min) fail(400, `${field} must be at least ${min} characters.`);
  if (t.length > max) fail(400, `${field} must be at most ${max} characters.`);
  return t;
}
function oneOf(v, field, list, fallback) {
  if (v === undefined || v === null || v === '') return fallback;
  if (!list.includes(v)) fail(400, `${field} must be one of: ${list.join(', ')}.`);
  return v;
}
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CATEGORIES = ['Fabric', 'Paper', 'Glass', 'Electronics', 'Food', 'Tools', 'Garden', 'Custom'];
const CONDITIONS = ['New', 'Good', 'Worn', 'Needs repair'];
const INTERESTS = ['home', 'food', 'tech', 'art', 'repair', 'garden'];
const SKILLS = ['Beginner', 'Comfortable', 'Experienced'];

// ---------- helpers ----------
const publicUser = (u) => u && ({
  id: u.id, name: u.name, email: u.email, interests: u.interests, skillLevel: u.skill_level, onboarded: !!u.onboarded,
  preferences: u.preferences, settings: u.settings, createdAt: u.created_at,
});
const IDEA_LIST = IDEAS.map(hydrateIdea).sort((a, b) => a.title.localeCompare(b.title));
const getIdea = (id) => IDEA_LIST.find((i) => i.id === id) || null;
const userResources = (uid) => db.resources.filter((r) => r.user_id === uid).sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
const savedSet = (uid) => new Set(db.saved.filter((s) => s.user_id === uid).map((s) => s.idea_id));
const ideaCard = (idea, match, saved) => ({
  id: idea.id, title: idea.title, summary: idea.summary, category: idea.category, minutes: idea.minutes,
  difficulty: idea.difficulty, safety: idea.safety, saved: saved ? saved.has(idea.id) : undefined,
  ...(match ? { score: match.score, haveCount: match.haveCount, requiredCount: match.requiredCount, missingCost: match.missingCost } : {}),
});
function projectView(p) {
  const idea = getIdea(p.idea_id);
  const done = p.steps_done.filter(Boolean).length;
  return {
    id: p.id, ideaId: p.idea_id, goalId: p.goal_id, title: p.title, status: p.status, stepsDone: p.steps_done,
    progress: idea.steps.length ? Math.round((done / idea.steps.length) * 100) : 0, budget: p.budget, costRecorded: p.cost_recorded,
    reusedItems: p.reused_items, substitutions: p.substitutions, notes: p.notes, startedAt: p.started_at, completedAt: p.completed_at,
    idea: { id: idea.id, title: idea.title, minutes: idea.minutes, difficulty: idea.difficulty, category: idea.category, steps: idea.steps, safety: idea.safety, materials: idea.materials, substitutes: idea.substitutes },
  };
}

function sessionToken() {
  try { return localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY); } catch { return null; }
}
function currentUser() {
  const t = sessionToken();
  const s = t && db.sessions.find((x) => x.token === t);
  return (s && db.users.find((u) => u.id === s.user_id)) || null;
}
function startSession(userId, remember) {
  const t = token();
  db.sessions.push({ token: t, user_id: userId });
  try {
    localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY);
    (remember ? localStorage : sessionStorage).setItem(SESSION_KEY, t);
  } catch { /* ignore */ }
}
function endSession() {
  const t = sessionToken();
  db.sessions = db.sessions.filter((s) => s.token !== t);
  try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch { /* ignore */ }
}
const ownProject = (user, id) => db.projects.find((p) => p.id === Number(id) && p.user_id === user.id) || fail(404, 'Project not found.');
const ownResource = (user, id) => db.resources.find((r) => r.id === Number(id) && r.user_id === user.id) || fail(404, 'Resource not found.');

function resourceBody(b) {
  const quantity = Number(b.quantity);
  if (!Number.isFinite(quantity) || quantity < 0 || quantity > 100000) fail(400, 'Quantity must be a number of 0 or more.');
  return {
    name: str(b.name, 'Resource name', { max: 80 }),
    category: oneOf(b.category, 'Category', CATEGORIES, null) || fail(400, 'Choose a category.'),
    quantity,
    unit: str(b.unit, 'Unit', { max: 20, optional: true }) || 'pieces',
    condition: oneOf(b.condition, 'Condition', CONDITIONS, 'Good'),
    location: str(b.location, 'Storage location', { max: 80, optional: true }),
    notes: str(b.notes, 'Notes', { max: 500, optional: true }),
  };
}

// ---------- routes ----------
const routes = [];
const on = (method, pattern, handler, { open = false } = {}) => {
  const keys = [];
  const re = new RegExp(`^${pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return '([^/]+)'; })}$`);
  routes.push({ method, re, keys, handler, open });
};

// auth
on('POST', '/auth/signup', async (b) => {
  const name = str(b.name, 'Full name', { max: 80 });
  const email = str(b.email, 'Email address', { max: 120 }).toLowerCase();
  if (!EMAIL_RE.test(email)) fail(400, 'Enter a valid email address.');
  const password = str(b.password, 'Password', { min: 8, max: 128 });
  if (b.confirm !== undefined && b.confirm !== b.password) fail(400, 'Passwords do not match.');
  if (!b.agree) fail(400, 'Please agree to the Terms of Service and Privacy Policy.');
  if (db.users.some((u) => u.email === email)) fail(409, 'An account with this email already exists. Try logging in.');
  const user = { id: nextId('users'), name, email, password_hash: await hashPassword(password), interests: [], skill_level: 'Beginner', onboarded: false, preferences: {}, settings: {}, created_at: now() };
  db.users.push(user);
  startSession(user.id, true);
  return { user: publicUser(user) };
}, { open: true });

on('POST', '/auth/login', async (b) => {
  const email = str(b.email, 'Email address').toLowerCase();
  const password = str(b.password, 'Password', { max: 128 });
  const user = db.users.find((u) => u.email === email);
  if (!user || !(await checkPassword(password, user.password_hash))) fail(401, 'Email or password is incorrect.');
  startSession(user.id, !!b.remember);
  return { user: publicUser(user) };
}, { open: true });

on('POST', '/auth/logout', () => { endSession(); return { ok: true }; }, { open: true });
on('GET', '/auth/me', () => ({ user: publicUser(currentUser()) }), { open: true });

on('POST', '/auth/forgot', (b) => {
  const email = str(b.email, 'Email address').toLowerCase();
  const user = db.users.find((u) => u.email === email);
  if (!user) return { ok: true, message: 'If an account exists for that email in this browser, a reset link will appear here.' };
  const t = token();
  db.resets.push({ token: t, user_id: user.id, expires: Date.now() + 3600e3 });
  return { ok: true, message: 'This demo runs in your browser and cannot send email, so here is your reset link:', resetPath: `/reset/${t}` };
}, { open: true });

on('POST', '/auth/reset', async (b) => {
  const t = str(b.token, 'Reset token', { max: 100 });
  const password = str(b.password, 'Password', { min: 8, max: 128 });
  const row = db.resets.find((r) => r.token === t && r.expires > Date.now());
  if (!row) fail(400, 'This reset link is invalid or has expired.');
  const user = db.users.find((u) => u.id === row.user_id);
  user.password_hash = await hashPassword(password);
  db.resets = db.resets.filter((r) => r.user_id !== user.id);
  db.sessions = db.sessions.filter((s) => s.user_id !== user.id);
  startSession(user.id, false);
  return { ok: true };
}, { open: true });

// account
on('PUT', '/me', (b, u) => {
  const name = str(b.name, 'Full name', { max: 80 });
  const email = str(b.email, 'Email address', { max: 120 }).toLowerCase();
  if (!EMAIL_RE.test(email)) fail(400, 'Enter a valid email address.');
  if (db.users.some((x) => x.email === email && x.id !== u.id)) fail(409, 'That email is already used by another account.');
  Object.assign(u, { name, email });
  return { user: publicUser(u) };
});
on('PUT', '/me/password', async (b, u) => {
  const current = str(b.current, 'Current password', { max: 128 });
  const next = str(b.password, 'New password', { min: 8, max: 128 });
  if (!(await checkPassword(current, u.password_hash))) fail(400, 'Current password is incorrect.');
  u.password_hash = await hashPassword(next);
  return { ok: true };
});
on('PUT', '/me/onboarding', (b, u) => {
  u.interests = Array.isArray(b.interests) ? b.interests.filter((i) => INTERESTS.includes(i)) : [];
  u.skill_level = oneOf(b.skillLevel, 'Skill level', SKILLS, 'Beginner');
  u.onboarded = true;
  return { user: publicUser(u) };
});
on('PUT', '/me/preferences', (b, u) => {
  u.preferences = {
    time: oneOf(String(b.time ?? 'any'), 'Time', ['30', '60', '120', '240', 'any'], 'any'),
    budget: oneOf(String(b.budget ?? 'any'), 'Budget', ['0', '500', '1000', 'any'], 'any'),
    difficulty: oneOf(b.difficulty, 'Difficulty', ['Easy', 'Medium', 'Hard', 'any'], 'any'),
    type: oneOf(b.type, 'Project type', [...INTERESTS, 'any'], 'any'),
  };
  return { preferences: u.preferences };
});
on('PUT', '/me/settings', (b, u) => {
  const s = { ...u.settings };
  for (const k of ['emailReminders', 'projectReminders', 'weeklySummary', 'reduceMotion', 'highContrast', 'showCommunity']) if (b[k] !== undefined) s[k] = !!b[k];
  if (b.textSize !== undefined) s.textSize = oneOf(b.textSize, 'Text size', ['normal', 'large', 'larger'], 'normal');
  u.settings = s;
  return { settings: s };
});
on('GET', '/me/export', (_b, u) => ({
  exportedAt: new Date().toISOString(), user: publicUser(u), resources: userResources(u.id), savedIdeas: [...savedSet(u.id)],
  goals: db.goals.filter((g) => g.user_id === u.id), projects: db.projects.filter((p) => p.user_id === u.id).map(projectView),
  designs: db.designs.filter((d) => d.user_id === u.id),
}));
on('DELETE', '/me', async (b, u) => {
  const password = str(b?.password, 'Password', { max: 128 });
  if (!(await checkPassword(password, u.password_hash))) fail(400, 'Password is incorrect.');
  for (const t of ['resources', 'saved', 'goals', 'projects', 'designs', 'sessions', 'resets']) db[t] = db[t].filter((x) => x.user_id !== u.id);
  db.users = db.users.filter((x) => x.id !== u.id);
  endSession();
  return { ok: true };
});

// dashboard
on('GET', '/dashboard', (_b, u) => {
  const resources = userResources(u.id);
  const mine = db.projects.filter((p) => p.user_id === u.id);
  return {
    resourceCount: resources.length,
    categoryCount: new Set(resources.map((r) => r.category)).size,
    activeProjects: mine.filter((p) => p.status === 'active').length,
    savedIdeas: savedSet(u.id).size,
    recentProjects: mine.filter((p) => p.status === 'active').sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 3).map(projectView),
  };
});

// resources
on('GET', '/resources', (_b, u) => ({ resources: userResources(u.id) }));
on('POST', '/resources', (b, u) => {
  const r = { id: nextId('resources'), user_id: u.id, ...resourceBody(b), created_at: now(), updated_at: now() };
  db.resources.push(r);
  return { resource: r };
});
on('GET', '/resources/:id', (_b, u, p) => {
  const r = ownResource(u, p.id);
  const uses = IDEA_LIST.filter((idea) => matchIdea(idea, [r]).usedResourceIds.includes(r.id)).map((idea) => ideaCard(idea));
  return { resource: r, uses };
});
on('PUT', '/resources/:id', (b, u, p) => {
  const r = ownResource(u, p.id);
  Object.assign(r, resourceBody(b), { updated_at: now() });
  return { resource: r };
});
on('DELETE', '/resources/:id', (_b, u, p) => {
  const r = ownResource(u, p.id);
  db.resources = db.resources.filter((x) => x.id !== r.id);
  return { ok: true };
});

// ideas
on('GET', '/ideas/discover', (_b, u, _p, q) => {
  if (q.get('simulateError')) fail(503, 'Ideas could not load right now.');
  const resources = userResources(u.id);
  const own = new Set(resources.map((r) => r.id));
  const selectedIds = String(q.get('selected') || '').split(',').filter(Boolean).map(Number).filter((id) => own.has(id));
  const results = discover(IDEA_LIST, resources, {
    selectedIds, time: q.get('time') || 'any', budget: q.get('budget') || 'any', difficulty: q.get('difficulty') || 'any', type: q.get('type') || 'any',
  });
  const saved = savedSet(u.id);
  return { ideas: results.map(({ idea, match }) => ideaCard(idea, match, saved)) };
});
on('GET', '/ideas', (_b, u, _p, q) => {
  const resources = userResources(u.id);
  const saved = savedSet(u.id);
  const cat = q.get('category');
  return { ideas: IDEA_LIST.filter((i) => !cat || i.category === cat).map((i) => ideaCard(i, matchIdea(i, resources), saved)) };
});
on('GET', '/ideas/:id', (_b, u, p) => {
  const idea = getIdea(p.id) || fail(404, 'Idea not found.');
  const match = matchIdea(idea, userResources(u.id));
  const story = STORIES.find((s) => s.idea_id === idea.id);
  const active = db.projects.find((x) => x.user_id === u.id && x.idea_id === idea.id && x.status === 'active');
  return {
    idea: { ...ideaCard(idea, match, savedSet(u.id)), steps: idea.steps, substitutes: idea.substitutes, materials: match.materials },
    story: story ? { id: story.id, title: story.title } : null,
    activeProjectId: active?.id ?? null,
  };
});
on('POST', '/ideas/:id/save', (_b, u, p) => {
  getIdea(p.id) || fail(404, 'Idea not found.');
  if (!db.saved.some((s) => s.user_id === u.id && s.idea_id === p.id)) db.saved.push({ user_id: u.id, idea_id: p.id, created_at: now() });
  return { saved: true };
});
on('DELETE', '/ideas/:id/save', (_b, u, p) => {
  db.saved = db.saved.filter((s) => !(s.user_id === u.id && s.idea_id === p.id));
  return { saved: false };
});
on('GET', '/saved', (_b, u) => {
  const resources = userResources(u.id);
  const saved = savedSet(u.id);
  const rows = db.saved.filter((s) => s.user_id === u.id).sort((a, b) => b.created_at.localeCompare(a.created_at));
  return { ideas: rows.map((s) => getIdea(s.idea_id)).filter(Boolean).map((i) => ideaCard(i, matchIdea(i, resources), saved)) };
});

// goals
on('POST', '/goals', (b, u) => {
  const text = str(b.text, 'Goal', { min: 3, max: 300 });
  const goal = { id: nextId('goals'), user_id: u.id, text, created_at: now() };
  db.goals.push(goal);
  return { goal: { id: goal.id, text } };
});
on('GET', '/goals', (_b, u) => ({ goals: db.goals.filter((g) => g.user_id === u.id).sort((a, b) => b.id - a.id).slice(0, 5) }));
on('GET', '/goals/:id', (_b, u, p) => {
  const goal = db.goals.find((g) => g.id === Number(p.id) && g.user_id === u.id) || fail(404, 'Goal not found.');
  const routesFound = matchGoal(IDEA_LIST, userResources(u.id), goal.text).slice(0, 3);
  return { goal, routes: routesFound.map(({ idea, match }, i) => ({ label: 'ABC'[i], ...ideaCard(idea, match), materials: match.materials, substitutes: idea.substitutes })) };
});

// projects
on('GET', '/projects', (_b, u) => ({
  projects: db.projects.filter((p) => p.user_id === u.id)
    .sort((a, b) => (a.status === 'completed') - (b.status === 'completed') || b.started_at.localeCompare(a.started_at) || b.id - a.id)
    .map(projectView),
}));
on('POST', '/projects', (b, u) => {
  const idea = getIdea(str(b.ideaId, 'Idea')) || fail(404, 'Idea not found.');
  const goalId = b.goalId ? Number(b.goalId) : null;
  if (goalId && !db.goals.some((g) => g.id === goalId && g.user_id === u.id)) fail(400, 'Goal not found.');
  const subs = Array.isArray(b.substitutions) ? b.substitutions.filter((k) => idea.substitutes.some((s) => s.for === k)) : [];
  const existing = db.projects.find((p) => p.user_id === u.id && p.idea_id === idea.id && p.status === 'active');
  if (existing) {
    if (Array.isArray(b.substitutions)) existing.substitutions = subs;
    if (goalId) existing.goal_id = goalId;
    return { project: projectView(existing), existing: true };
  }
  const match = matchIdea(idea, userResources(u.id));
  const project = {
    id: nextId('projects'), user_id: u.id, idea_id: idea.id, goal_id: goalId, title: idea.title, status: 'active',
    steps_done: idea.steps.map(() => false), substitutions: subs,
    budget: Number.isFinite(Number(b.budget)) ? Number(b.budget) : match.missingCost,
    cost_recorded: null, reused_items: [], notes: '', started_at: now(), completed_at: null,
  };
  db.projects.push(project);
  return { project: projectView(project) };
});
on('GET', '/projects/:id', (_b, u, p) => {
  const pr = ownProject(u, p.id);
  const match = matchIdea(getIdea(pr.idea_id), userResources(u.id));
  return { project: { ...projectView(pr), materials: match.materials, missingCost: match.missingCost } };
});
on('PATCH', '/projects/:id', (b, u, p) => {
  const pr = ownProject(u, p.id);
  if (b.notes !== undefined) pr.notes = str(b.notes, 'Notes', { max: 1000, optional: true });
  if (b.budget !== undefined) pr.budget = Math.max(0, Math.round(Number(b.budget) || 0));
  return { project: projectView(pr) };
});
on('PATCH', '/projects/:id/steps/:index', (b, u, p) => {
  const pr = ownProject(u, p.id);
  if (pr.status === 'completed') fail(400, 'This project is already complete.');
  const i = Number(p.index);
  if (!Number.isInteger(i) || i < 0 || i >= pr.steps_done.length) fail(400, 'Unknown step.');
  pr.steps_done = pr.steps_done.map((v, j) => (j === i ? !!b.done : v));
  return { project: projectView(pr) };
});
on('POST', '/projects/:id/complete', (b, u, p) => {
  const pr = ownProject(u, p.id);
  if (pr.status === 'completed') return { project: projectView(pr) };
  const idea = getIdea(pr.idea_id);
  const match = matchIdea(idea, userResources(u.id));
  const reused = match.materials.filter((m) => m.resource && m.status !== 'missing')
    .map((m) => ({ resourceId: m.resource.id, name: m.resource.name, qty: Math.min(m.qty, m.resource.quantity), unit: m.unit }));
  if (b.useUpResources) {
    for (const r of reused) {
      const res = db.resources.find((x) => x.id === r.resourceId && x.user_id === u.id);
      if (res) { res.quantity = Math.max(0, res.quantity - r.qty); res.updated_at = now(); }
    }
  }
  Object.assign(pr, { status: 'completed', steps_done: idea.steps.map(() => true), cost_recorded: Math.max(0, Math.round(Number(b.cost) || 0)), reused_items: reused, completed_at: now() });
  return { project: projectView(pr) };
});
on('DELETE', '/projects/:id', (_b, u, p) => {
  const pr = ownProject(u, p.id);
  db.projects = db.projects.filter((x) => x.id !== pr.id);
  return { ok: true };
});

// 2D design studio
const designView = (d) => ({ id: d.id, name: d.name, composition: d.composition, variations: d.variations, createdAt: d.created_at, updatedAt: d.updated_at });
const designBody = (b) => { try { return cleanDesign(b); } catch (e) { return fail(400, e.message); } };
const ownDesign = (u, id) => db.designs.find((d) => d.id === Number(id) && d.user_id === u.id) || fail(404, 'Design not found.');
on('GET', '/designs', (_b, u) => ({
  designs: db.designs.filter((d) => d.user_id === u.id).sort((a, b) => b.updated_at.localeCompare(a.updated_at) || b.id - a.id).map(designView),
}));
on('POST', '/designs', (b, u) => {
  const d = { id: nextId('designs'), user_id: u.id, ...designBody(b), created_at: now(), updated_at: now() };
  db.designs.push(d);
  return { design: designView(d) };
});
on('GET', '/designs/:id', (_b, u, p) => ({ design: designView(ownDesign(u, p.id)) }));
on('PUT', '/designs/:id', (b, u, p) => {
  const d = ownDesign(u, p.id);
  Object.assign(d, designBody(b), { updated_at: now() });
  return { design: designView(d) };
});
on('DELETE', '/designs/:id', (_b, u, p) => {
  const d = ownDesign(u, p.id);
  db.designs = db.designs.filter((x) => x.id !== d.id);
  return { ok: true };
});

// impact
on('GET', '/impact', (_b, u) => {
  const done = db.projects.filter((p) => p.user_id === u.id && p.status === 'completed')
    .sort((a, b) => (b.completed_at || '').localeCompare(a.completed_at || '')).map(projectView);
  const reusedItems = done.reduce((n, p) => n + p.reusedItems.reduce((a, r) => a + (Number(r.qty) || 0), 0), 0);
  const skills = [...new Set(done.map((p) => p.idea.category))];
  const moneySaved = done.reduce((sum, p) => sum + p.idea.materials
    .filter((m) => p.reusedItems.some((r) => m.keywords.some((k) => r.name.toLowerCase().includes(k))))
    .reduce((a, m) => a + m.buyCost, 0), 0);
  const spent = done.reduce((s, p) => s + (p.costRecorded || 0), 0);
  return { completedProjects: done.length, reusedItems, skillsExplored: skills.length, skills, moneySaved, spent, recent: done.slice(0, 5) };
});

// inspiration
on('GET', '/inspiration', () => ({
  categories: INSPIRATION_CATEGORIES.map((c) => ({ ...c, ideas: IDEA_LIST.filter((i) => i.category === c.key).length, stories: STORIES.filter((s) => s.category === c.key).length })),
}));
on('GET', '/stories', (_b, _u, _p, q) => {
  const cat = q.get('category');
  return { stories: STORIES.filter((s) => !cat || s.category === cat).sort((a, b) => a.title.localeCompare(b.title)) };
});
on('GET', '/stories/:id', (_b, u, p) => {
  const story = STORIES.find((s) => s.id === p.id) || fail(404, 'Story not found.');
  const idea = story.idea_id ? getIdea(story.idea_id) : null;
  return { story, idea: idea && ideaCard(idea, matchIdea(idea, userResources(u.id)), savedSet(u.id)) };
});

// ---------- dispatcher ----------
export async function localRequest(method, path, body) {
  await ensureSeeded();
  const [pathname, search = ''] = path.split('?');
  const query = new URLSearchParams(search);
  for (const r of routes) {
    if (r.method !== method) continue;
    const m = pathname.match(r.re);
    if (!m) continue;
    const params = Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])]));
    const user = currentUser();
    if (!r.open && !user) fail(401, 'Please log in to continue.');
    // Work on a copy so a failed request leaves stored data untouched.
    const snapshot = JSON.stringify(db);
    try {
      const out = await r.handler(body ?? {}, user, params, query);
      if (method !== 'GET') save();
      return JSON.parse(JSON.stringify(out)); // return copies, like a network response
    } catch (e) {
      db = JSON.parse(snapshot);
      throw e;
    }
  }
  fail(404, 'Not found.');
}
export { HttpError };
