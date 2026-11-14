import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api, pkr } from '../api.js';
import { useLoad, useToast } from '../state.jsx';
import { Card, Chip, ErrorBox, Footer, Loader, MaterialList, PageHeader, StatePanel } from '../components/ui.jsx';

const EYEBROW = 'I have a goal';
const SUGGESTIONS = ['Organize a small space', 'Repair a loose item', 'Grow herbs at home', 'Reduce everyday clutter'];
const names = (list) => list.map((m) => m.name.toLowerCase()).join(', ');

// ---------- 14 Describe goal ----------
export function DescribeGoal() {
  const navigate = useNavigate();
  const [text, setText] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const recent = useLoad('/goals');

  async function submit(e) {
    e?.preventDefault();
    setBusy(true); setError(null);
    try { const { goal } = await api.post('/goals', { text }); navigate(`/goal/${goal.id}`); }
    catch (err) { setError(err); setBusy(false); }
  }

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader eyebrow={EYEBROW} title="What would you like to do?" sub="Journey B — tell Patchwork what you want to accomplish." />
      <label className="label" htmlFor="goal">Describe the outcome you want</label>
      <textarea id="goal" className="textarea" style={{ maxWidth: 760 }} placeholder="Organize my desk using things I already own." value={text} onChange={(e) => setText(e.target.value)} />
      <p className="label" style={{ marginTop: 34 }}>Or start with a suggested goal</p>
      <div className="chips tight">
        {SUGGESTIONS.map((s) => <Chip key={s} size="xl" pressed={text === s} onClick={() => setText(s)}>{s}</Chip>)}
      </div>
      <p className="muted small" style={{ marginTop: 26 }}>Your goal stays in your Patchwork workspace.</p>
      {recent.data?.goals?.length > 0 && (
        <p className="small muted">Recent: {recent.data.goals.slice(0, 3).map((g, i) => (
          <span key={g.id}>{i > 0 && ' · '}<button type="button" className="link" onClick={() => navigate(`/goal/${g.id}`)}>{g.text}</button></span>
        ))}</p>
      )}
      <ErrorBox error={error} />
      <Footer><button className="btn" disabled={busy || text.trim().length < 3}>{busy ? 'Matching…' : 'Find my resources'}</button></Footer>
    </form>
  );
}

function NoMatch({ goal }) {
  const navigate = useNavigate();
  return (
    <StatePanel kind="empty" title="No routes match that goal yet" text={`We couldn't match “${goal.text}”. Try words like organize, repair, grow, cables or kitchen.`}
      action={<button className="btn" onClick={() => navigate('/goal')}>Rewrite goal</button>} />
  );
}

// ---------- 15 Match resources ----------
export function MatchResources() {
  const { id } = useParams();
  const navigate = useNavigate();
  const load = useLoad(`/goals/${id}`);
  return (
    <>
      <PageHeader eyebrow={EYEBROW} title="Your resource match" sub="Match your goal with resources you already own." />
      <Loader load={load} loadingTitle="Matching your goal" loadingText="Comparing your goal with your shelf.">
        {({ goal, routes }) => {
          if (!routes.length) return <NoMatch goal={goal} />;
          const best = routes[0];
          const have = best.materials.filter((m) => m.status !== 'missing');
          const missing = best.materials.filter((m) => m.status === 'missing');
          return (
            <>
              <div className="grid">
                <Card title={`Goal · ${goal.text}`} desc={`Best route: ${best.title}`} />
                <Card title={`Available · ${have.length ? names(have) : 'nothing yet'}`} desc="Already on your shelf." />
                <Card tone={missing.length ? 'clay' : undefined} title={`Missing · ${missing.length ? names(missing) : 'nothing'}`}
                  desc={missing.length ? `${missing.some((m) => best.substitutes.some((s) => s.for === m.key)) ? 'Safe substitutes available.' : `About ${pkr(best.missingCost)} to buy.`}` : 'Ready to start.'} />
                {routes[1] && <Card title={`Alternative · ${routes[1].title.toLowerCase()}`} desc={`${routes[1].minutes} min · ${pkr(routes[1].missingCost)} · ${routes[1].difficulty}`} />}
                <Card title={`Match · ${best.haveCount} of ${best.requiredCount} materials`} desc={`${Math.round(best.score * 100)}% of what you need is already yours.`} />
              </div>
              <h2 className="section-title">Materials for {best.title.toLowerCase()}</h2>
              <MaterialList materials={best.materials} substitutes={best.substitutes} />
              <Footer><button className="btn" onClick={() => navigate(`/goal/${id}/compare`)}>Compare solutions</button></Footer>
            </>
          );
        }}
      </Loader>
    </>
  );
}

// ---------- 16 Compare solutions ----------
export function CompareSolutions() {
  const { id } = useParams();
  const navigate = useNavigate();
  const load = useLoad(`/goals/${id}`);
  const [choice, setChoice] = useState(null);
  return (
    <>
      <PageHeader eyebrow={EYEBROW} title="Choose your best route" sub="Compare practical routes before choosing." />
      <Loader load={load}>
        {({ goal, routes }) => {
          if (!routes.length) return <NoMatch goal={goal} />;
          const picked = choice || routes[0].id;
          return (
            <>
              <div className="grid">
                {routes.map((r) => (
                  <Card key={r.id} selectable selected={picked === r.id} onClick={() => setChoice(r.id)}
                    title={`${r.label} · ${r.title} · ${pkr(r.missingCost)}`} desc={r.summary} />
                ))}
              </div>
              <h2 className="section-title">Compare time, materials and difficulty</h2>
              <table className="compare">
                <thead><tr><th>Route</th><th>Time</th><th>Extra cost</th><th>You have</th><th>Difficulty</th></tr></thead>
                <tbody>
                  {routes.map((r) => (
                    <tr key={r.id} style={picked === r.id ? { background: '#f6faf3' } : undefined}>
                      <td><strong>{r.label}</strong> · {r.title}</td><td>{r.minutes} min</td><td>{pkr(r.missingCost)}</td>
                      <td>{r.haveCount} of {r.requiredCount}</td><td>{r.difficulty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <Footer><button className="btn" onClick={() => navigate(`/goal/${id}/adapt/${picked}`)}>Adapt materials</button></Footer>
            </>
          );
        }}
      </Loader>
    </>
  );
}

// ---------- 17 Adapt materials ----------
export function AdaptMaterials() {
  const { id, ideaId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const load = useLoad(`/goals/${id}`);
  const [chosen, setChosen] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function plan(route, subs) {
    setBusy(true);
    try {
      const { project, existing } = await api.post('/projects', { ideaId: route.id, goalId: Number(id), substitutions: subs });
      toast(existing ? 'You already have this project — opening it.' : 'Project planned.');
      navigate(`/projects/${project.id}`);
    } catch (e) { setError(e); setBusy(false); }
  }

  return (
    <>
      <PageHeader eyebrow={EYEBROW} title="Find a safe substitute" sub="Adapt missing materials with safe alternatives." />
      <Loader load={load}>
        {({ routes }) => {
          const route = routes.find((r) => r.id === ideaId);
          if (!route) return <StatePanel kind="error" title="Route not found" text="Go back and choose a route." action={<button className="btn" onClick={() => navigate(`/goal/${id}/compare`)}>Compare solutions</button>} />;
          const missing = route.materials.filter((m) => m.status === 'missing');
          const adaptable = route.substitutes.filter((s) => missing.some((m) => m.key === s.for));
          const subs = chosen ?? adaptable.map((s) => s.for);
          const toggle = (k) => setChosen(subs.includes(k) ? subs.filter((x) => x !== k) : [...subs, k]);
          return (
            <>
              {adaptable.length === 0 ? (
                <div className="grid">
                  <Card title={missing.length ? `Missing · ${names(missing)}` : 'Nothing to adapt'} desc={missing.length ? `No safe substitute — about ${pkr(route.missingCost)} to buy.` : 'You already have every required material.'} tone={missing.length ? 'clay' : undefined} />
                  <Card title={`Route · ${route.title}`} desc={`${route.minutes} min · ${route.difficulty}`} />
                </div>
              ) : adaptable.map((s) => {
                const original = route.materials.find((m) => m.key === s.for);
                const on = subs.includes(s.for);
                return (
                  <div className="grid" key={s.for} style={{ marginBottom: 24 }}>
                    <Card title={`Original · ${original.name.toLowerCase()}`} desc={`Missing · ~${pkr(original.buyCost)} to buy.`} tone="clay" />
                    <Card selectable selected={on} onClick={() => toggle(s.for)} title={`Alternative · ${s.use.toLowerCase()}`} desc={on ? 'Using this substitute.' : 'Tap to use this substitute.'} />
                    <Card title={`Why · ${s.free ? 'no extra material required' : 'uses what you have'}`} desc={s.why} />
                    {s.safety && <Card tone="sun" title={`Safety · ${s.safety.replace(/\.$/, '').toLowerCase()}`} desc="Follow this when making the swap." />}
                  </div>
                );
              })}
              <h2 className="section-title">{route.title}: final materials</h2>
              <MaterialList materials={route.materials} substitutes={route.substitutes} chosenSubs={subs} />
              <ErrorBox error={error} />
              <Footer><button className="btn" disabled={busy} onClick={() => plan(route, subs)}>{busy ? 'Planning…' : 'Plan project'}</button></Footer>
            </>
          );
        }}
      </Loader>
    </>
  );
}
