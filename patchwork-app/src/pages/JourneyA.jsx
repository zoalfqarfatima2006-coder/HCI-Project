import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth, useJourney, useLoad } from '../state.jsx';
import { Card, Chip, ErrorBox, Footer, IdeaCard, Loader, PageHeader, StatePanel } from '../components/ui.jsx';

const EYEBROW = 'What can I make?';

// ---------- 09 Select resources ----------
export function SelectResources() {
  const navigate = useNavigate();
  const loc = useLocation();
  const { selected, toggle, setSelected } = useJourney();
  const load = useLoad('/resources');

  // Coming from a resource's "Make something with this" button.
  useEffect(() => { if (loc.state?.preselect) setSelected([loc.state.preselect]); /* eslint-disable-next-line */ }, []);

  return (
    <>
      <PageHeader eyebrow={EYEBROW} title="What can I make?" sub="Journey A · Step 1 of 4 — select resources." progress={25} />
      <Loader load={load}>
        {({ resources }) => {
          if (!resources.length) {
            return <StatePanel kind="empty" title="Add your first resource" text="You need at least one resource on your shelf to discover ideas."
              action={<button className="btn" onClick={() => navigate('/resources/new')}>Add first resource</button>} />;
          }
          const valid = selected.filter((id) => resources.some((r) => r.id === id));
          return (
            <>
              <div className="btn-row" style={{ margin: '0 0 18px', justifyContent: 'space-between', maxWidth: 990 }}>
                <span className="muted small">{valid.length} selected · tap cards to choose</span>
                <button className="link small" onClick={() => setSelected(valid.length === resources.length ? [] : resources.map((r) => r.id))}>
                  {valid.length === resources.length ? 'Clear all' : 'Select all'}
                </button>
              </div>
              <div className="grid">
                {resources.map((r) => (
                  <Card key={r.id} selectable selected={valid.includes(r.id)} onClick={() => toggle(r.id)}
                    title={`${r.name} · ${Number(r.quantity)}`} desc={`${r.unit} · ${r.condition}${r.location ? ` · ${r.location}` : ''}`} />
                ))}
                <Card title="Add custom resource" desc="Something not on your shelf yet?" to="/resources/new" tone="sun" />
              </div>
              <Footer>
                <button className="btn" disabled={!valid.length} onClick={() => { setSelected(valid); navigate('/make/review'); }}>Review resources</button>
              </Footer>
            </>
          );
        }}
      </Loader>
    </>
  );
}

// ---------- 10 Review resources ----------
export function ReviewResources() {
  const navigate = useNavigate();
  const { selected, toggle } = useJourney();
  const load = useLoad('/resources');
  return (
    <>
      <PageHeader eyebrow={EYEBROW} title="Review your resources" sub="Journey A · Step 2 of 4 — confirm availability." progress={50} />
      <Loader load={load}>
        {({ resources }) => {
          const chosen = resources.filter((r) => selected.includes(r.id));
          if (!chosen.length) {
            return <StatePanel kind="empty" title="Nothing selected yet" text="Choose at least one resource to review."
              action={<button className="btn" onClick={() => navigate('/make')}>Select resources</button>} />;
          }
          const issues = chosen.filter((r) => r.quantity <= 0 || r.condition === 'Needs repair');
          return (
            <>
              <div className="grid">
                {chosen.map((r) => {
                  const bad = r.quantity <= 0 || r.condition === 'Needs repair';
                  return (
                    <Card key={r.id} tone={bad ? 'clay' : undefined} title={`${Number(r.quantity)} ${r.condition === 'New' || r.condition === 'Good' ? '' : r.condition.toLowerCase() + ' '}${r.name.toLowerCase()}`}
                      desc={bad ? (r.quantity <= 0 ? 'None left — update quantity or remove.' : 'Needs repair before use.') : `${r.condition} · ${r.location || 'location not set'}`}>
                      <div className="card-meta"><button className="link small" onClick={() => toggle(r.id)}>Remove from selection</button></div>
                    </Card>
                  );
                })}
                <Card title={issues.length ? `${issues.length} resource${issues.length > 1 ? 's' : ''} need attention` : 'All selected resources available'}
                  desc={issues.length ? 'You can continue — ideas will treat them as limited.' : 'Everything is ready to use.'} tone={issues.length ? 'sun' : undefined} />
              </div>
              <Footer><button className="btn" onClick={() => navigate('/make/preferences')}>Set preferences</button></Footer>
            </>
          );
        }}
      </Loader>
    </>
  );
}

// ---------- 11 Set preferences ----------
const TIME = [['30', 'Under 30 min'], ['60', 'Up to 1 hour'], ['120', '1–2 hours'], ['240', 'Half a day'], ['any', 'Any time']];
const BUDGET = [['0', 'Rs 0'], ['500', 'Rs 0–500'], ['1000', 'Up to Rs 1,000'], ['any', 'Any budget']];
const DIFF = [['Easy', 'Easy'], ['Medium', 'Up to medium'], ['any', 'Any difficulty']];
const TYPE = [['any', 'Any'], ['home', 'Home'], ['food', 'Food'], ['tech', 'Tech'], ['art', 'Art'], ['repair', 'Repair'], ['garden', 'Garden']];

export function SetPreferences() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const p0 = user.preferences || {};
  const [p, setP] = useState({ time: p0.time || '120', budget: p0.budget || '500', difficulty: p0.difficulty || (user.skillLevel === 'Beginner' ? 'Easy' : 'any'), type: p0.type || 'any' });
  const [error, setError] = useState(null);

  const group = (title, key, opts) => (
    <div style={{ marginBottom: 26 }}>
      <p className="label">{title}</p>
      <div className="chips tight" style={{ maxWidth: 760 }} role="radiogroup" aria-label={title}>
        {opts.map(([v, l]) => <Chip key={v} size="md" pressed={p[key] === v} onClick={() => setP({ ...p, [key]: v })}>{l}</Chip>)}
      </div>
    </div>
  );

  async function next() {
    try {
      const { preferences } = await api.put('/me/preferences', p);
      setUser({ ...user, preferences });
      navigate('/make/ideas');
    } catch (e) { setError(e); }
  }

  return (
    <>
      <PageHeader eyebrow={EYEBROW} title="Make it fit your day" sub={`Journey A · Step 3 of 4 — set preferences. Skill · ${user.skillLevel}`} progress={75} />
      <div style={{ marginTop: 28 }}>
        {group('Time', 'time', TIME)}
        {group('Budget for missing items', 'budget', BUDGET)}
        {group('Difficulty', 'difficulty', DIFF)}
        {group('Project type', 'type', TYPE)}
      </div>
      <ErrorBox error={error} />
      <Footer><button className="btn" onClick={next}>Discover ideas</button></Footer>
    </>
  );
}

// ---------- 12 Discover ideas (with 29 loading + 28 error states) ----------
export function DiscoverIdeas() {
  const { user } = useAuth();
  const { selected } = useJourney();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const pr = user.preferences || {};
  const qs = new URLSearchParams({ selected: selected.join(','), time: pr.time || 'any', budget: pr.budget || 'any', difficulty: pr.difficulty || 'any', type: pr.type || 'any' });
  if (params.get('simulateError')) qs.set('simulateError', '1');
  const [state, setState] = useState({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    setState({ status: 'loading' });
    const minWait = new Promise((r) => setTimeout(r, 900)); // let the matching feel deliberate
    Promise.all([api.get(`/ideas/discover?${qs}`), minWait])
      .then(([d]) => live && setState({ status: 'ok', ideas: d.ideas }))
      .catch((e) => live && setState({ status: 'error', error: e }));
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt, qs.toString()]);

  if (state.status === 'loading') {
    return (
      <>
        <PageHeader title="Finding ideas that fit" sub="Matching resources to suitable ideas." />
        <StatePanel kind="loading" title="Finding ideas that fit" text="Matching your resources and preferences."
          action={<button className="btn" onClick={() => navigate('/home')}>Back to dashboard</button>} />
        <Footer />
      </>
    );
  }
  if (state.status === 'error') {
    return (
      <>
        <PageHeader title="Let's try that again" sub="Your saved work remains unchanged." />
        <StatePanel kind="error" title="Let's try that again" text="The section could not load. Your work is safe."
          action={<button className="btn" onClick={() => { if (params.get('simulateError')) navigate('/make/ideas', { replace: true }); setAttempt((a) => a + 1); }}>Retry</button>} />
        <Footer />
      </>
    );
  }

  const { ideas } = state;
  return (
    <>
      <PageHeader eyebrow={EYEBROW} title="Ideas made from what you have" sub="Journey A · Step 4 of 4 — discover suitable ideas." progress={100} />
      {ideas.length === 0 ? (
        <StatePanel kind="empty" title="No ideas fit those limits yet" text="Try a longer time, a bigger budget or more resources."
          action={<button className="btn" onClick={() => navigate('/make/preferences')}>Adjust preferences</button>} />
      ) : (
        <div className="grid">
          {ideas.map((i) => <IdeaCard key={i.id} idea={i} to={`/ideas/${i.id}`} />)}
        </div>
      )}
      <Footer>
        {ideas.length > 0 && <button className="btn" onClick={() => navigate(`/ideas/${ideas[0].id}`)}>Open idea details</button>}
        <button className="btn ghost sm" onClick={() => navigate('/make/preferences')}>Change preferences</button>
      </Footer>
    </>
  );
}
