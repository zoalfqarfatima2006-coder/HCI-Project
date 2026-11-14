import { startTransition, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, useToast } from '../state.jsx';
import { Chip, ErrorBox, Field, Footer, Modal, PageHeader } from '../components/ui.jsx';

// ---------- 26 Account settings ----------
export function AccountSettings() {
  const { logout } = useAuth();
  const navigate = useNavigate();
  const ROWS = [
    ['Profile information', '/settings/profile', 'Manage preferences'],
    ['Interests and skill level', '/onboarding?from=settings', 'Manage preferences'],
    ['Notifications and reminders', '/settings/notifications', 'Manage preferences'],
    ['Accessibility preferences', '/settings/accessibility', 'Reduce motion · Text size · Contrast'],
    ['Privacy and account', '/settings/privacy', 'Manage preferences'],
    ['Help and support', '/settings/help', 'Manage preferences'],
  ];
  return (
    <>
      <PageHeader title="Your account, your settings" sub="Manage your profile, preferences and accessibility." />
      <div className="rows">
        {ROWS.map(([title, to, aside]) => (
          <Link key={to} className="row" to={to}><span className="row-title">{title}</span><span className="row-aside" style={{ width: 230 }}>{aside} →</span></Link>
        ))}
        <button className="row" onClick={() => { navigate('/'); logout(); }}>
          <span className="row-title">Log out</span><span className="row-aside" style={{ width: 230 }}>End this session →</span>
        </button>
      </div>
      <Footer><button className="btn" onClick={() => navigate('/home')}>Continue</button></Footer>
    </>
  );
}

function SubHeader({ title, sub }) {
  return <PageHeader eyebrow="Settings" title={title} sub={sub} />;
}

function Toggle({ label, hint, checked, onChange }) {
  return (
    <label className="row" style={{ cursor: 'pointer' }}>
      <span><span className="row-title">{label}</span>{hint && <><br /><span className="muted small">{hint}</span></>}</span>
      <input type="checkbox" checked={!!checked} onChange={(e) => onChange(e.target.checked)} style={{ width: 20, height: 20, accentColor: 'var(--green)' }} />
    </label>
  );
}

function useSettings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [error, setError] = useState(null);
  const update = async (patch) => {
    setUser({ ...user, settings: { ...user.settings, ...patch } }); // apply immediately
    try { const { settings } = await api.put('/me/settings', patch); setUser((u) => ({ ...u, settings })); toast('Saved.'); }
    catch (e) { setError(e); }
  };
  return { settings: user.settings || {}, update, error };
}

// ---------- Profile ----------
export function ProfileSettings() {
  const { user, setUser } = useAuth();
  const toast = useToast();
  const [f, setF] = useState({ name: user.name, email: user.email });
  const [pw, setPw] = useState({ current: '', password: '', confirm: '' });
  const [error, setError] = useState(null);
  const [pwError, setPwError] = useState(null);

  async function saveProfile(e) {
    e.preventDefault(); setError(null);
    try { const { user: u } = await api.put('/me', f); setUser(u); toast('Profile updated.'); } catch (err) { setError(err); }
  }
  async function savePassword(e) {
    e.preventDefault(); setPwError(null);
    if (pw.password !== pw.confirm) return setPwError('New passwords do not match.');
    try { await api.put('/me/password', pw); setPw({ current: '', password: '', confirm: '' }); toast('Password changed.'); } catch (err) { setPwError(err); }
  }

  return (
    <>
      <SubHeader title="Profile information" sub={`Member since ${new Date(user.createdAt.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}.`} />
      <form className="form" onSubmit={saveProfile} noValidate>
        <Field label="Full name" id="name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
        <Field label="Email address" id="email" type="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <ErrorBox error={error} />
        <div className="btn-row" style={{ marginTop: 18 }}><button className="btn sm">Save profile</button></div>
      </form>
      <h2 className="section-title">Change password</h2>
      <form className="form" onSubmit={savePassword} noValidate>
        <Field label="Current password" id="cur" type="password" autoComplete="current-password" value={pw.current} onChange={(e) => setPw({ ...pw, current: e.target.value })} />
        <Field label="New password" id="new" type="password" autoComplete="new-password" hint="At least 8 characters." value={pw.password} onChange={(e) => setPw({ ...pw, password: e.target.value })} />
        <Field label="Confirm new password" id="conf" type="password" autoComplete="new-password" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} />
        <ErrorBox error={pwError} />
        <div className="btn-row" style={{ marginTop: 18 }}><button className="btn sm">Change password</button></div>
      </form>
      <Footer />
    </>
  );
}

// ---------- Notifications ----------
export function NotificationSettings() {
  const { settings: s, update, error } = useSettings();
  return (
    <>
      <SubHeader title="Notifications and reminders" sub="Choose what Patchwork reminds you about." />
      <div className="rows">
        <Toggle label="Project reminders" hint="Nudge me about unfinished projects." checked={s.projectReminders ?? true} onChange={(v) => update({ projectReminders: v })} />
        <Toggle label="Weekly summary" hint="A weekly round-up of your reuse activity." checked={s.weeklySummary} onChange={(v) => update({ weeklySummary: v })} />
        <Toggle label="Email reminders" hint="Saved now; sending needs an email service configured on the server." checked={s.emailReminders} onChange={(v) => update({ emailReminders: v })} />
      </div>
      <ErrorBox error={error} />
      <Footer />
    </>
  );
}

// ---------- Accessibility ----------
export function AccessibilitySettings() {
  const { settings: s, update, error } = useSettings();
  return (
    <>
      <SubHeader title="Accessibility preferences" sub="Changes apply immediately across Patchwork." />
      <div className="rows">
        <Toggle label="Reduce motion" hint="Turn off animations and transitions." checked={s.reduceMotion} onChange={(v) => update({ reduceMotion: v })} />
        <Toggle label="Higher contrast" hint="Darker text and stronger borders." checked={s.highContrast} onChange={(v) => update({ highContrast: v })} />
        <div className="row">
          <span className="row-title">Text size</span>
          <div className="chips tight" role="radiogroup" aria-label="Text size" style={{ justifyContent: 'flex-end' }}>
            {[['normal', 'Normal'], ['large', 'Large'], ['larger', 'Larger']].map(([v, l]) => (
              <Chip key={v} pressed={(s.textSize || 'normal') === v} onClick={() => update({ textSize: v })}>{l}</Chip>
            ))}
          </div>
        </div>
      </div>
      <ErrorBox error={error} />
      <Footer />
    </>
  );
}

// ---------- Privacy ----------
export function PrivacySettings() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);

  // Works for both the server build and the browser-only build.
  async function downloadData() {
    try {
      const data = await api.get('/me/export');
      const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
      const a = Object.assign(document.createElement('a'), { href: url, download: 'patchwork-data.json' });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) { setError(e); }
  }

  async function deleteAccount() {
    setError(null);
    try { await api.del('/me', { password }); navigate('/'); startTransition(() => setUser(null)); } catch (e) { setError(e); }
  }
  return (
    <>
      <SubHeader title="Privacy and account" sub="Your data stays in your Patchwork workspace." />
      <div className="rows">
        <button className="row" onClick={downloadData}>
          <span><span className="row-title">Download my data</span><br /><span className="muted small">Resources, projects, goals and saved ideas as JSON.</span></span>
          <span className="row-aside">Download →</span>
        </button>
        <button className="row" onClick={() => setOpen(true)}>
          <span><span className="row-title" style={{ color: 'var(--danger)' }}>Delete account</span><br /><span className="muted small">Permanently removes your account and everything in it.</span></span>
          <span className="row-aside">Delete →</span>
        </button>
      </div>
      <Footer />
      {open && (
        <Modal title="Delete your account?" onClose={() => setOpen(false)}>
          <p className="muted">This permanently deletes your account, resources, projects and saved ideas. It cannot be undone.</p>
          <Field label="Confirm with your password" id="delpw" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <ErrorBox error={error} />
          <div className="btn-row" style={{ marginTop: 18 }}>
            <button className="btn danger sm" disabled={!password} onClick={deleteAccount}>Delete permanently</button>
            <button className="btn ghost sm" onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ---------- Help ----------
const FAQ = [
  ['How does Patchwork pick ideas?', 'It compares each idea’s materials with the resources on your shelf (by name and category), then filters by your time, budget, difficulty and project type.'],
  ['What does “missing cost” mean?', 'An estimate in PKR of what you would need to buy. Missing items with a free safe substitute — like interlocking tabs instead of glue — add nothing.'],
  ['What is the difference between the two journeys?', '“What can I make?” starts from things you own. “I have a goal” starts from an outcome and compares routes to reach it.'],
  ['How is personal impact counted?', 'Only from completed projects: the items reused from your shelf, the extra money you recorded, and the categories you have tried.'],
  ['Can I undo a deleted resource?', 'No — deletes are permanent. Completed projects keep their own record of what they used.'],
];
export function HelpSupport() {
  return (
    <>
      <SubHeader title="Help and support" sub="Answers to common questions." />
      <div className="rows">
        {FAQ.map(([q, a]) => (
          <details key={q} className="row" style={{ display: 'block' }}>
            <summary className="row-title" style={{ cursor: 'pointer' }}>{q}</summary>
            <p className="muted small" style={{ margin: '10px 0 0' }}>{a}</p>
          </details>
        ))}
      </div>
      <Footer />
    </>
  );
}
