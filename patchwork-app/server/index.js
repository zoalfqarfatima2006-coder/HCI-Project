// Patchwork API server (Express 5 + SQLite).
import express from 'express';
import cookieParser from 'cookie-parser';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { db, json, tx } from './db.js';
import { seed } from './seed.js';
import { hydrateIdea, matchIdea, discover, matchGoal } from './matching.js';
import { INSPIRATION_CATEGORIES } from './catalog.js';
import { cleanDesign } from './designs.js';

await seed();

const app = express();
const isProd = process.env.NODE_ENV === 'production';
// In dev the Vite proxy expects the API on 4000 (PORT may belong to the web dev server).
const PORT = Number(process.env.API_PORT || (isProd && process.env.PORT) || 4000);
const SESSION_COOKIE = 'pw_session';

app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());

// ---------- helpers ----------
class HttpError extends Error { constructor(status, message) { super(message); this.status = status; } }
const fail = (status, message) => { throw new HttpError(status, message); };

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

const publicUser = (u) => u && ({
  id: u.id, name: u.name, email: u.email, interests: json(u.interests, []), skillLevel: u.skill_level,
  onboarded: !!u.onboarded, preferences: json(u.preferences, {}), settings: json(u.settings, {}), createdAt: u.created_at,
});

function startSession(res, userId, remember) {
  const token = randomBytes(32).toString('hex');
  const days = remember ? 30 : 1;
  db.prepare(`INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,datetime('now', ?))`).run(token, userId, `+${days} days`);
  res.cookie(SESSION_COOKIE, token, {
    // Production (e.g. Hugging Face Spaces) is shown inside an iframe on another site,
    // so the cookie must be SameSite=None (which requires Secure / HTTPS).
    httpOnly: true, sameSite: isProd ? 'none' : 'lax', secure: isProd, partitioned: isProd, path: '/',
    ...(remember ? { maxAge: days * 864e5 } : {}),
  });
}

function currentUser(req) {
  const token = req.cookies[SESSION_COOKIE];
  if (!token) return null;
  return db.prepare(`SELECT u.* FROM sessions s JOIN users u ON u.id = s.user_id
    WHERE s.token = ? AND s.expires_at > datetime('now')`).get(token) || null;
}

function auth(req, _res, next) {
  const user = currentUser(req);
  if (!user) fail(401, 'Please log in to continue.');
  req.user = user;
  next();
}

const allIdeas = () => db.prepare('SELECT * FROM ideas ORDER BY title').all().map(hydrateIdea);
const getIdea = (id) => hydrateIdea(db.prepare('SELECT * FROM ideas WHERE id = ?').get(id));
const userResources = (uid) => db.prepare('SELECT * FROM resources WHERE user_id = ? ORDER BY created_at DESC, id DESC').all(uid);
const savedSet = (uid) => new Set(db.prepare('SELECT idea_id FROM saved_ideas WHERE user_id = ?').all(uid).map((r) => r.idea_id));

const ideaCard = (idea, match, saved) => ({
  id: idea.id, title: idea.title, summary: idea.summary, category: idea.category, minutes: idea.minutes,
  difficulty: idea.difficulty, safety: idea.safety, saved: saved ? saved.has(idea.id) : undefined,
  ...(match ? { score: match.score, haveCount: match.haveCount, requiredCount: match.requiredCount, missingCost: match.missingCost } : {}),
});

function projectView(p) {
  const idea = getIdea(p.idea_id);
  const steps = json(p.steps_done, []);
  const done = steps.filter(Boolean).length;
  return {
    id: p.id, ideaId: p.idea_id, goalId: p.goal_id, title: p.title, status: p.status,
    stepsDone: steps, progress: idea.steps.length ? Math.round((done / idea.steps.length) * 100) : 0,
    budget: p.budget, costRecorded: p.cost_recorded, reusedItems: json(p.reused_items, []),
    substitutions: json(p.substitutions, []), notes: p.notes, startedAt: p.started_at, completedAt: p.completed_at,
    idea: { id: idea.id, title: idea.title, minutes: idea.minutes, difficulty: idea.difficulty, category: idea.category, steps: idea.steps, safety: idea.safety, materials: idea.materials, substitutes: idea.substitutes },
  };
}
function ownProject(req) {
  const p = db.prepare('SELECT * FROM projects WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
  if (!p) fail(404, 'Project not found.');
  return p;
}

const api = express.Router();

// ---------- auth ----------
api.post('/auth/signup', (req, res) => {
  const name = str(req.body.name, 'Full name', { max: 80 });
  const email = str(req.body.email, 'Email address', { max: 120 }).toLowerCase();
  if (!EMAIL_RE.test(email)) fail(400, 'Enter a valid email address.');
  const password = str(req.body.password, 'Password', { min: 8, max: 128 });
  if (req.body.confirm !== undefined && req.body.confirm !== req.body.password) fail(400, 'Passwords do not match.');
  if (!req.body.agree) fail(400, 'Please agree to the Terms of Service and Privacy Policy.');
  if (db.prepare('SELECT 1 FROM users WHERE email = ?').get(email)) fail(409, 'An account with this email already exists. Try logging in.');
  const { lastInsertRowid } = db.prepare('INSERT INTO users (name,email,password_hash) VALUES (?,?,?)')
    .run(name, email, bcrypt.hashSync(password, 10));
  startSession(res, Number(lastInsertRowid), true);
  res.status(201).json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(lastInsertRowid)) });
});

api.post('/auth/login', (req, res) => {
  const email = str(req.body.email, 'Email address').toLowerCase();
  const password = str(req.body.password, 'Password', { max: 128 });
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) fail(401, 'Email or password is incorrect.');
  startSession(res, user.id, !!req.body.remember);
  res.json({ user: publicUser(user) });
});

api.post('/auth/logout', (req, res) => {
  const token = req.cookies[SESSION_COOKIE];
  if (token) db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  res.clearCookie(SESSION_COOKIE, { path: '/', sameSite: isProd ? 'none' : 'lax', secure: isProd, partitioned: isProd });
  res.json({ ok: true });
});

api.get('/auth/me', (req, res) => res.json({ user: publicUser(currentUser(req)) }));

// No email service is configured: the reset link is printed to the server console.
api.post('/auth/forgot', (req, res) => {
  const email = str(req.body.email, 'Email address').toLowerCase();
  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (user) {
    const token = randomBytes(24).toString('hex');
    db.prepare(`INSERT INTO password_resets (token,user_id,expires_at) VALUES (?,?,datetime('now','+1 hour'))`).run(token, user.id);
    console.log(`\n[password reset] ${email}: ${req.get('origin') || 'http://localhost:5173'}/reset/${token}\n`);
  }
  res.json({ ok: true, message: 'If an account exists for that email, a reset link has been created. (No email service is configured — the link is printed in the server console.)' });
});

api.post('/auth/reset', (req, res) => {
  const token = str(req.body.token, 'Reset token', { max: 100 });
  const password = str(req.body.password, 'Password', { min: 8, max: 128 });
  const row = db.prepare(`SELECT * FROM password_resets WHERE token = ? AND expires_at > datetime('now')`).get(token);
  if (!row) fail(400, 'This reset link is invalid or has expired.');
  tx(() => {
    db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(password, 10), row.user_id);
    db.prepare('DELETE FROM password_resets WHERE user_id = ?').run(row.user_id);
    db.prepare('DELETE FROM sessions WHERE user_id = ?').run(row.user_id);
  });
  startSession(res, row.user_id, false);
  res.json({ ok: true });
});

// ---------- everything below requires login ----------
api.use(auth);

// ---------- account & settings ----------
api.put('/me', (req, res) => {
  const name = str(req.body.name, 'Full name', { max: 80 });
  const email = str(req.body.email, 'Email address', { max: 120 }).toLowerCase();
  if (!EMAIL_RE.test(email)) fail(400, 'Enter a valid email address.');
  const clash = db.prepare('SELECT 1 FROM users WHERE email = ? AND id != ?').get(email, req.user.id);
  if (clash) fail(409, 'That email is already used by another account.');
  db.prepare('UPDATE users SET name = ?, email = ? WHERE id = ?').run(name, email, req.user.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

api.put('/me/password', (req, res) => {
  const current = str(req.body.current, 'Current password', { max: 128 });
  const next = str(req.body.password, 'New password', { min: 8, max: 128 });
  if (!bcrypt.compareSync(current, req.user.password_hash)) fail(400, 'Current password is incorrect.');
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(bcrypt.hashSync(next, 10), req.user.id);
  res.json({ ok: true });
});

api.put('/me/onboarding', (req, res) => {
  const interests = Array.isArray(req.body.interests) ? req.body.interests.filter((i) => INTERESTS.includes(i)) : [];
  const skill = oneOf(req.body.skillLevel, 'Skill level', SKILLS, 'Beginner');
  db.prepare('UPDATE users SET interests = ?, skill_level = ?, onboarded = 1 WHERE id = ?').run(JSON.stringify(interests), skill, req.user.id);
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) });
});

api.put('/me/preferences', (req, res) => {
  const prefs = {
    time: oneOf(String(req.body.time ?? 'any'), 'Time', ['30', '60', '120', '240', 'any'], 'any'),
    budget: oneOf(String(req.body.budget ?? 'any'), 'Budget', ['0', '500', '1000', 'any'], 'any'),
    difficulty: oneOf(req.body.difficulty, 'Difficulty', ['Easy', 'Medium', 'Hard', 'any'], 'any'),
    type: oneOf(req.body.type, 'Project type', [...INTERESTS, 'any'], 'any'),
  };
  db.prepare('UPDATE users SET preferences = ? WHERE id = ?').run(JSON.stringify(prefs), req.user.id);
  res.json({ preferences: prefs });
});

api.put('/me/settings', (req, res) => {
  const cur = json(req.user.settings, {});
  const b = req.body || {};
  const next = {
    ...cur,
    ...(b.emailReminders !== undefined && { emailReminders: !!b.emailReminders }),
    ...(b.projectReminders !== undefined && { projectReminders: !!b.projectReminders }),
    ...(b.weeklySummary !== undefined && { weeklySummary: !!b.weeklySummary }),
    ...(b.reduceMotion !== undefined && { reduceMotion: !!b.reduceMotion }),
    ...(b.highContrast !== undefined && { highContrast: !!b.highContrast }),
    ...(b.textSize !== undefined && { textSize: oneOf(b.textSize, 'Text size', ['normal', 'large', 'larger'], 'normal') }),
    ...(b.showCommunity !== undefined && { showCommunity: !!b.showCommunity }),
  };
  db.prepare('UPDATE users SET settings = ? WHERE id = ?').run(JSON.stringify(next), req.user.id);
  res.json({ settings: next });
});

api.get('/me/export', (req, res) => {
  const uid = req.user.id;
  res.setHeader('Content-Disposition', 'attachment; filename="patchwork-data.json"');
  res.json({
    exportedAt: new Date().toISOString(),
    user: publicUser(req.user),
    resources: userResources(uid),
    savedIdeas: [...savedSet(uid)],
    goals: db.prepare('SELECT * FROM goals WHERE user_id = ?').all(uid),
    projects: db.prepare('SELECT * FROM projects WHERE user_id = ?').all(uid).map(projectView),
    designs: db.prepare('SELECT * FROM designs WHERE user_id = ?').all(uid).map((d) => ({ ...d, composition: json(d.composition, null), variations: json(d.variations, []) })),
  });
});

api.delete('/me', (req, res) => {
  const password = str(req.body?.password, 'Password', { max: 128 });
  if (!bcrypt.compareSync(password, req.user.password_hash)) fail(400, 'Password is incorrect.');
  db.prepare('DELETE FROM users WHERE id = ?').run(req.user.id);
  res.clearCookie(SESSION_COOKIE, { path: '/' });
  res.json({ ok: true });
});

// ---------- dashboard ----------
api.get('/dashboard', (req, res) => {
  const uid = req.user.id;
  const resources = userResources(uid);
  res.json({
    resourceCount: resources.length,
    categoryCount: new Set(resources.map((r) => r.category)).size,
    activeProjects: db.prepare(`SELECT COUNT(*) n FROM projects WHERE user_id = ? AND status = 'active'`).get(uid).n,
    savedIdeas: db.prepare('SELECT COUNT(*) n FROM saved_ideas WHERE user_id = ?').get(uid).n,
    recentProjects: db.prepare(`SELECT * FROM projects WHERE user_id = ? AND status = 'active' ORDER BY started_at DESC LIMIT 3`).all(uid).map(projectView),
  });
});

// ---------- resources ----------
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

api.get('/resources', (req, res) => res.json({ resources: userResources(req.user.id) }));

api.post('/resources', (req, res) => {
  const r = resourceBody(req.body);
  const { lastInsertRowid } = db.prepare(`INSERT INTO resources (user_id,name,category,quantity,unit,condition,location,notes)
    VALUES (?,?,?,?,?,?,?,?)`).run(req.user.id, r.name, r.category, r.quantity, r.unit, r.condition, r.location, r.notes);
  res.status(201).json({ resource: db.prepare('SELECT * FROM resources WHERE id = ?').get(lastInsertRowid) });
});

function ownResource(req) {
  const r = db.prepare('SELECT * FROM resources WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
  if (!r) fail(404, 'Resource not found.');
  return r;
}

api.get('/resources/:id', (req, res) => {
  const r = ownResource(req);
  const uses = allIdeas()
    .map((idea) => ({ idea, match: matchIdea(idea, [r]) }))
    .filter(({ match }) => match.usedResourceIds.includes(r.id))
    .map(({ idea }) => ideaCard(idea));
  res.json({ resource: r, uses });
});

api.put('/resources/:id', (req, res) => {
  const cur = ownResource(req);
  const r = resourceBody(req.body);
  db.prepare(`UPDATE resources SET name=?,category=?,quantity=?,unit=?,condition=?,location=?,notes=?,updated_at=datetime('now') WHERE id=?`)
    .run(r.name, r.category, r.quantity, r.unit, r.condition, r.location, r.notes, cur.id);
  res.json({ resource: db.prepare('SELECT * FROM resources WHERE id = ?').get(cur.id) });
});

api.delete('/resources/:id', (req, res) => {
  const r = ownResource(req);
  db.prepare('DELETE FROM resources WHERE id = ?').run(r.id);
  res.json({ ok: true });
});

// ---------- ideas ----------
api.get('/ideas/discover', (req, res) => {
  if (req.query.simulateError) fail(503, 'Ideas could not load right now.');
  const q = req.query;
  const resources = userResources(req.user.id);
  const own = new Set(resources.map((r) => r.id));
  const selectedIds = String(q.selected || '').split(',').filter(Boolean).map(Number).filter((id) => own.has(id));
  const results = discover(allIdeas(), resources, {
    selectedIds, time: q.time || 'any', budget: q.budget || 'any', difficulty: q.difficulty || 'any', type: q.type || 'any',
  });
  const saved = savedSet(req.user.id);
  res.json({ ideas: results.map(({ idea, match }) => ideaCard(idea, match, saved)) });
});

api.get('/ideas', (req, res) => {
  const resources = userResources(req.user.id);
  const saved = savedSet(req.user.id);
  let ideas = allIdeas();
  if (req.query.category) ideas = ideas.filter((i) => i.category === req.query.category);
  res.json({ ideas: ideas.map((i) => ideaCard(i, matchIdea(i, resources), saved)) });
});

api.get('/ideas/:id', (req, res) => {
  const idea = getIdea(req.params.id);
  if (!idea) fail(404, 'Idea not found.');
  const match = matchIdea(idea, userResources(req.user.id));
  const story = db.prepare('SELECT id, title FROM stories WHERE idea_id = ?').get(idea.id) || null;
  const activeProject = db.prepare(`SELECT id FROM projects WHERE user_id = ? AND idea_id = ? AND status = 'active'`).get(req.user.id, idea.id) || null;
  res.json({ idea: { ...ideaCard(idea, match, savedSet(req.user.id)), steps: idea.steps, substitutes: idea.substitutes, materials: match.materials }, story, activeProjectId: activeProject?.id ?? null });
});

api.post('/ideas/:id/save', (req, res) => {
  if (!getIdea(req.params.id)) fail(404, 'Idea not found.');
  db.prepare('INSERT OR IGNORE INTO saved_ideas (user_id, idea_id) VALUES (?,?)').run(req.user.id, req.params.id);
  res.json({ saved: true });
});
api.delete('/ideas/:id/save', (req, res) => {
  db.prepare('DELETE FROM saved_ideas WHERE user_id = ? AND idea_id = ?').run(req.user.id, req.params.id);
  res.json({ saved: false });
});

api.get('/saved', (req, res) => {
  const resources = userResources(req.user.id);
  const rows = db.prepare('SELECT i.* FROM saved_ideas s JOIN ideas i ON i.id = s.idea_id WHERE s.user_id = ? ORDER BY s.created_at DESC').all(req.user.id);
  const saved = savedSet(req.user.id);
  res.json({ ideas: rows.map(hydrateIdea).map((i) => ideaCard(i, matchIdea(i, resources), saved)) });
});

// ---------- goals (Journey B) ----------
api.post('/goals', (req, res) => {
  const text = str(req.body.text, 'Goal', { min: 3, max: 300 });
  const { lastInsertRowid } = db.prepare('INSERT INTO goals (user_id, text) VALUES (?,?)').run(req.user.id, text);
  res.status(201).json({ goal: { id: Number(lastInsertRowid), text } });
});

api.get('/goals', (req, res) => {
  res.json({ goals: db.prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY id DESC LIMIT 5').all(req.user.id) });
});

api.get('/goals/:id', (req, res) => {
  const goal = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
  if (!goal) fail(404, 'Goal not found.');
  const routes = matchGoal(allIdeas(), userResources(req.user.id), goal.text).slice(0, 3);
  res.json({
    goal,
    routes: routes.map(({ idea, match }, i) => ({
      label: 'ABC'[i], ...ideaCard(idea, match), materials: match.materials, substitutes: idea.substitutes,
    })),
  });
});

// ---------- projects ----------
api.get('/projects', (req, res) => {
  const rows = db.prepare(`SELECT * FROM projects WHERE user_id = ? ORDER BY status = 'completed', started_at DESC, id DESC`).all(req.user.id);
  res.json({ projects: rows.map(projectView) });
});

api.post('/projects', (req, res) => {
  const idea = getIdea(str(req.body.ideaId, 'Idea'));
  if (!idea) fail(404, 'Idea not found.');
  const goalId = req.body.goalId ? Number(req.body.goalId) : null;
  if (goalId && !db.prepare('SELECT 1 FROM goals WHERE id = ? AND user_id = ?').get(goalId, req.user.id)) fail(400, 'Goal not found.');
  const subs = Array.isArray(req.body.substitutions) ? req.body.substitutions.filter((k) => idea.substitutes.some((s) => s.for === k)) : [];
  const existing = db.prepare(`SELECT id FROM projects WHERE user_id = ? AND idea_id = ? AND status = 'active'`).get(req.user.id, idea.id);
  if (existing) {
    // Re-planning an active project keeps its progress but records the newly chosen substitutes/goal.
    if (Array.isArray(req.body.substitutions)) db.prepare('UPDATE projects SET substitutions = ? WHERE id = ?').run(JSON.stringify(subs), existing.id);
    if (goalId) db.prepare('UPDATE projects SET goal_id = ? WHERE id = ?').run(goalId, existing.id);
    return res.json({ project: projectView(db.prepare('SELECT * FROM projects WHERE id = ?').get(existing.id)), existing: true });
  }
  const match = matchIdea(idea, userResources(req.user.id));
  const budget = Number.isFinite(Number(req.body.budget)) ? Number(req.body.budget) : match.missingCost;
  const { lastInsertRowid } = db.prepare(`INSERT INTO projects (user_id,idea_id,goal_id,title,steps_done,substitutions,budget)
    VALUES (?,?,?,?,?,?,?)`).run(req.user.id, idea.id, goalId, idea.title, JSON.stringify(idea.steps.map(() => false)), JSON.stringify(subs), budget);
  res.status(201).json({ project: projectView(db.prepare('SELECT * FROM projects WHERE id = ?').get(lastInsertRowid)) });
});

api.get('/projects/:id', (req, res) => {
  const p = ownProject(req);
  const view = projectView(p);
  const match = matchIdea(getIdea(p.idea_id), userResources(req.user.id));
  res.json({ project: { ...view, materials: match.materials, missingCost: match.missingCost } });
});

api.patch('/projects/:id', (req, res) => {
  const p = ownProject(req);
  const notes = req.body.notes !== undefined ? str(req.body.notes, 'Notes', { max: 1000, optional: true }) : p.notes;
  const budget = req.body.budget !== undefined ? Math.max(0, Math.round(Number(req.body.budget) || 0)) : p.budget;
  db.prepare('UPDATE projects SET notes = ?, budget = ? WHERE id = ?').run(notes, budget, p.id);
  res.json({ project: projectView(db.prepare('SELECT * FROM projects WHERE id = ?').get(p.id)) });
});

api.patch('/projects/:id/steps/:index', (req, res) => {
  const p = ownProject(req);
  if (p.status === 'completed') fail(400, 'This project is already complete.');
  const steps = json(p.steps_done, []);
  const i = Number(req.params.index);
  if (!Number.isInteger(i) || i < 0 || i >= steps.length) fail(400, 'Unknown step.');
  steps[i] = !!req.body.done;
  db.prepare('UPDATE projects SET steps_done = ? WHERE id = ?').run(JSON.stringify(steps), p.id);
  res.json({ project: projectView(db.prepare('SELECT * FROM projects WHERE id = ?').get(p.id)) });
});

api.post('/projects/:id/complete', (req, res) => {
  const p = ownProject(req);
  if (p.status === 'completed') return res.json({ project: projectView(p) });
  const cost = Math.max(0, Math.round(Number(req.body.cost) || 0));
  const idea = getIdea(p.idea_id);
  const match = matchIdea(idea, userResources(req.user.id));
  const reused = match.materials
    .filter((m) => m.resource && m.status !== 'missing')
    .map((m) => ({ resourceId: m.resource.id, name: m.resource.name, qty: Math.min(m.qty, m.resource.quantity), unit: m.unit }));
  tx(() => {
    if (req.body.useUpResources) {
      const dec = db.prepare('UPDATE resources SET quantity = MAX(0, quantity - ?), updated_at = datetime(\'now\') WHERE id = ? AND user_id = ?');
      for (const r of reused) dec.run(r.qty, r.resourceId, req.user.id);
    }
    db.prepare(`UPDATE projects SET status='completed', steps_done=?, cost_recorded=?, reused_items=?, completed_at=datetime('now') WHERE id=?`)
      .run(JSON.stringify(idea.steps.map(() => true)), cost, JSON.stringify(reused), p.id);
  });
  res.json({ project: projectView(db.prepare('SELECT * FROM projects WHERE id = ?').get(p.id)) });
});

api.delete('/projects/:id', (req, res) => {
  const p = ownProject(req);
  db.prepare('DELETE FROM projects WHERE id = ?').run(p.id);
  res.json({ ok: true });
});

// ---------- 2D design studio ----------
const designView = (d) => ({
  id: d.id, name: d.name, composition: json(d.composition, null), variations: json(d.variations, []),
  createdAt: d.created_at, updatedAt: d.updated_at,
});
function designBody(body) {
  try { return cleanDesign(body); } catch (e) { fail(400, e.message); }
}
function ownDesign(req) {
  const d = db.prepare('SELECT * FROM designs WHERE id = ? AND user_id = ?').get(Number(req.params.id), req.user.id);
  if (!d) fail(404, 'Design not found.');
  return d;
}

api.get('/designs', (req, res) => {
  res.json({ designs: db.prepare('SELECT * FROM designs WHERE user_id = ? ORDER BY updated_at DESC, id DESC').all(req.user.id).map(designView) });
});
api.post('/designs', (req, res) => {
  const d = designBody(req.body);
  const { lastInsertRowid } = db.prepare('INSERT INTO designs (user_id,name,composition,variations) VALUES (?,?,?,?)')
    .run(req.user.id, d.name, JSON.stringify(d.composition), JSON.stringify(d.variations));
  res.status(201).json({ design: designView(db.prepare('SELECT * FROM designs WHERE id = ?').get(lastInsertRowid)) });
});
api.get('/designs/:id', (req, res) => res.json({ design: designView(ownDesign(req)) }));
api.put('/designs/:id', (req, res) => {
  const cur = ownDesign(req);
  const d = designBody(req.body);
  db.prepare(`UPDATE designs SET name=?, composition=?, variations=?, updated_at=datetime('now') WHERE id=?`)
    .run(d.name, JSON.stringify(d.composition), JSON.stringify(d.variations), cur.id);
  res.json({ design: designView(db.prepare('SELECT * FROM designs WHERE id = ?').get(cur.id)) });
});
api.delete('/designs/:id', (req, res) => {
  const d = ownDesign(req);
  db.prepare('DELETE FROM designs WHERE id = ?').run(d.id);
  res.json({ ok: true });
});

// ---------- impact ----------
api.get('/impact', (req, res) => {
  const done = db.prepare(`SELECT * FROM projects WHERE user_id = ? AND status = 'completed' ORDER BY completed_at DESC`).all(req.user.id).map(projectView);
  const reusedItems = done.reduce((n, p) => n + p.reusedItems.reduce((a, r) => a + (Number(r.qty) || 0), 0), 0);
  const skills = [...new Set(done.map((p) => p.idea.category))];
  // Money saved = what reused materials would have cost to buy.
  const saved = done.reduce((sum, p) => sum + p.idea.materials
    .filter((m) => p.reusedItems.some((r) => m.keywords.some((k) => r.name.toLowerCase().includes(k))))
    .reduce((a, m) => a + m.buyCost, 0), 0);
  const spent = done.reduce((s, p) => s + (p.costRecorded || 0), 0);
  res.json({ completedProjects: done.length, reusedItems, skillsExplored: skills.length, skills, moneySaved: saved, spent, recent: done.slice(0, 5) });
});

// ---------- inspiration ----------
api.get('/inspiration', (req, res) => {
  const ideaCounts = Object.fromEntries(db.prepare('SELECT category, COUNT(*) n FROM ideas GROUP BY category').all().map((r) => [r.category, r.n]));
  const storyCounts = Object.fromEntries(db.prepare('SELECT category, COUNT(*) n FROM stories GROUP BY category').all().map((r) => [r.category, r.n]));
  res.json({ categories: INSPIRATION_CATEGORIES.map((c) => ({ ...c, ideas: ideaCounts[c.key] || 0, stories: storyCounts[c.key] || 0 })) });
});

api.get('/stories', (req, res) => {
  const rows = req.query.category
    ? db.prepare('SELECT * FROM stories WHERE category = ? ORDER BY title').all(req.query.category)
    : db.prepare('SELECT * FROM stories ORDER BY title').all();
  res.json({ stories: rows });
});

api.get('/stories/:id', (req, res) => {
  const story = db.prepare('SELECT * FROM stories WHERE id = ?').get(req.params.id);
  if (!story) fail(404, 'Story not found.');
  const idea = story.idea_id ? getIdea(story.idea_id) : null;
  res.json({ story, idea: idea && ideaCard(idea, matchIdea(idea, userResources(req.user.id)), savedSet(req.user.id)) });
});

app.use('/api', api);
app.use('/api', (_req, _res) => fail(404, 'Not found.'));

// ---------- production: serve the built React app ----------
const dist = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist');
if (existsSync(dist)) {
  app.use(express.static(dist));
  app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(join(dist, 'index.html')));
}

// ---------- errors ----------
app.use((err, _req, res, _next) => {
  const status = err.status || (err.type === 'entity.parse.failed' ? 400 : 500);
  if (status >= 500) console.error(err);
  res.status(status).json({ error: status >= 500 ? 'Something went wrong on our side. Your saved work is unchanged.' : err.message });
});

app.listen(PORT, () => console.log(`Patchwork API on http://localhost:${PORT}`));
