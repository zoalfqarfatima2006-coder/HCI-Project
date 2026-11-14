import { useState } from 'react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, useToast } from '../state.jsx';
import { Card, Chip, ErrorBox, Field, Footer, PageHeader } from '../components/ui.jsx';

// ---------- 01 Landing ----------
export function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();
  return (
    <>
      <PageHeader title="A second life starts here." sub="Make something useful from things you already own." />
      <div className="grid two">
        <Card title="WHAT CAN I MAKE?" desc="Start with your resources and discover ideas." to={user ? '/make' : '/signup'} />
        <Card title="I HAVE A GOAL" desc="Tell us what you want to do. Match what you own." to={user ? '/goal' : '/signup'} />
      </div>
      {!user && (
        <div className="btn-row" style={{ marginTop: 54 }}>
          <Link className="btn" style={{ minWidth: 190 }} to="/signup">Create free account</Link>
          <Link className="btn sm" to="/login">Log in</Link>
        </div>
      )}
      <Footer>
        <button className="btn" onClick={() => navigate(user ? '/home' : '/signup')}>{user ? 'Go to my workspace' : 'Choose a journey'}</button>
      </Footer>
    </>
  );
}

// ---------- 02 Sign up ----------
export function SignUp() {
  const { setUser } = useAuth();
  const toast = useToast();
  const navigate = useNavigate();
  const [f, setF] = useState({ name: '', email: '', password: '', confirm: '', agree: false });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    if (f.password !== f.confirm) return setError('Passwords do not match.');
    setBusy(true); setError(null);
    try {
      const { user } = await api.post('/auth/signup', f);
      setUser(user);
      navigate('/onboarding');
    } catch (err) { setError(err); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title="Create your free account" sub="Create an account to save resources and projects." />
      <div className="form">
        <Field label="Full name" id="name" placeholder="Your name" autoComplete="name" value={f.name} onChange={set('name')} required />
        <Field label="Email address" id="email" type="email" placeholder="name@example.com" autoComplete="email" value={f.email} onChange={set('email')} required />
        <Field label="Password" id="password" type="password" placeholder="Create a strong password" autoComplete="new-password" value={f.password} onChange={set('password')} hint="At least 8 characters." required />
        <Field label="Confirm password" id="confirm" type="password" placeholder="Enter password again" autoComplete="new-password" value={f.confirm} onChange={set('confirm')} required />
        <label className="checkbox"><input type="checkbox" checked={f.agree} onChange={set('agree')} /> I agree to the Terms of Service and Privacy Policy</label>
        <ErrorBox error={error} />
        <p className="small" style={{ marginTop: 24 }}>
          <span className="muted">OR · </span>
          <button type="button" className="link" onClick={() => toast('Google sign-in needs OAuth keys — not configured on this server.')}>Continue with Google</button>
        </p>
        <p className="small muted" style={{ marginTop: 16 }}>Already have an account? <Link className="link" to="/login">Log in</Link></p>
      </div>
      <Footer><button className="btn" disabled={busy}>{busy ? 'Creating account…' : 'Continue'}</button></Footer>
    </form>
  );
}

// ---------- 03 Login ----------
export function Login() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const loc = useLocation();
  const [f, setF] = useState({ email: '', password: '', remember: true });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(null);
    try {
      const { user } = await api.post('/auth/login', f);
      setUser(user);
      navigate(!user.onboarded ? '/onboarding' : loc.state?.from || '/home', { replace: true });
    } catch (err) { setError(err); } finally { setBusy(false); }
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title="Welcome back" sub="Continue making useful things with your resources." />
      <div className="form">
        <Field label="Email address" id="email" type="email" placeholder="name@example.com" autoComplete="email" value={f.email} onChange={set('email')} />
        <Field label="Password" id="password" type="password" placeholder="Enter your password" autoComplete="current-password" value={f.password} onChange={set('password')} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <label className="checkbox"><input type="checkbox" checked={f.remember} onChange={set('remember')} /> Remember me</label>
          <Link className="link small" to="/forgot">Forgot password?</Link>
        </div>
        <ErrorBox error={error} />
        <p className="small muted" style={{ marginTop: 40 }}>New to Patchwork? <Link className="link" to="/signup">Create a free account</Link></p>
      </div>
      <Footer><button className="btn" disabled={busy}>{busy ? 'Logging in…' : 'Continue'}</button></Footer>
    </form>
  );
}

// ---------- Forgot / reset password ----------
export function Forgot() {
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault(); setError(null);
    try { setMsg((await api.post('/auth/forgot', { email })).message); } catch (err) { setError(err); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title="Reset your password" sub="Enter your email and we'll create a reset link." />
      <div className="form">
        <Field label="Email address" id="email" type="email" placeholder="name@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <ErrorBox error={error} />
        {msg && <div className="success-box">{msg}</div>}
        <p className="small muted" style={{ marginTop: 16 }}><Link className="link" to="/login">Back to log in</Link></p>
      </div>
      <Footer><button className="btn">Send reset link</button></Footer>
    </form>
  );
}

export function Reset() {
  const { token } = useParams();
  const { refresh } = useAuth();
  const navigate = useNavigate();
  const [f, setF] = useState({ password: '', confirm: '' });
  const [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    if (f.password !== f.confirm) return setError('Passwords do not match.');
    try { await api.post('/auth/reset', { token, password: f.password }); await refresh(); navigate('/home'); } catch (err) { setError(err); }
  }
  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title="Choose a new password" sub="You'll be logged in once it's saved." />
      <div className="form">
        <Field label="New password" id="password" type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} hint="At least 8 characters." />
        <Field label="Confirm password" id="confirm" type="password" value={f.confirm} onChange={(e) => setF({ ...f, confirm: e.target.value })} />
        <ErrorBox error={error} />
      </div>
      <Footer><button className="btn">Save password</button></Footer>
    </form>
  );
}

// ---------- 04 Interests onboarding ----------
const INTERESTS = [
  ['home', 'Home & everyday'], ['food', 'Food & ingredients'], ['tech', 'Tech & tinkering'],
  ['art', 'Art & making'], ['repair', 'Repair & restore'], ['garden', 'Garden & outdoors'],
];
const SKILLS = ['Beginner', 'Comfortable', 'Experienced'];

export function Onboarding() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const [params] = useSearchParams();
  const fromSettings = params.get('from') === 'settings';
  const [interests, setInterests] = useState(user?.interests || []);
  const [skill, setSkill] = useState(user?.skillLevel || 'Beginner');
  const [error, setError] = useState(null);

  const toggle = (k) => setInterests((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));
  async function save() {
    try {
      const { user: u } = await api.put('/me/onboarding', { interests, skillLevel: skill });
      setUser(u);
      if (fromSettings) { toast('Interests updated.'); navigate('/settings'); } else navigate('/home');
    } catch (e) { setError(e); }
  }

  return (
    <>
      <PageHeader title="What do you love making?" sub="Choose interests. Change them any time." />
      <p className="muted small" style={{ margin: '0 0 22px' }}>Choose as many as you like</p>
      <div className="chips" style={{ maxWidth: 680 }}>
        {INTERESTS.map(([k, label]) => <Chip key={k} size="lg" pressed={interests.includes(k)} onClick={() => toggle(k)}>{label}</Chip>)}
      </div>
      <p className="label" style={{ marginTop: 40 }}>Your current skill level</p>
      <div className="chips tight" role="radiogroup" aria-label="Skill level">
        {SKILLS.map((s) => <Chip key={s} size="md" pressed={skill === s} onClick={() => setSkill(s)}>{s}</Chip>)}
      </div>
      <p className="muted small" style={{ marginTop: 26 }}>You can update your interests and skill level later in Settings.</p>
      <ErrorBox error={error} />
      <Footer><button className="btn" onClick={save}>{fromSettings ? 'Save changes' : 'Continue'}</button></Footer>
    </>
  );
}
