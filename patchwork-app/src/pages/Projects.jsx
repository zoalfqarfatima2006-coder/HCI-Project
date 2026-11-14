import { useEffect, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { api, pkr } from '../api.js';
import { useLoad, useToast } from '../state.jsx';
import { Card, ErrorBox, Footer, Loader, MaterialList, Modal, PageHeader, StatePanel } from '../components/ui.jsx';

const fmtDate = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '');

// ---------- 19 My projects ----------
export function MyProjects() {
  const navigate = useNavigate();
  const load = useLoad('/projects');
  return (
    <>
      <PageHeader title="Your projects" sub="See active and completed projects." />
      <Loader load={load}>
        {({ projects }) => {
          if (!projects.length) {
            return <StatePanel kind="empty" title="No projects yet" text="Start one from an idea — it will appear here with its progress."
              action={<button className="btn" onClick={() => navigate('/make')}>Find an idea</button>} />;
          }
          const active = projects.filter((p) => p.status === 'active');
          const done = projects.filter((p) => p.status === 'completed');
          return (
            <>
              <div className="grid">
                {active.map((p) => (
                  <Card key={p.id} to={`/projects/${p.id}`} title={`${p.title} · ${p.progress}%`}
                    desc={`Started ${fmtDate(p.startedAt)} · next: ${p.idea.steps[p.stepsDone.indexOf(false)]?.title.toLowerCase() || 'finish up'}`}>
                    <div className="progress" style={{ width: '100%', margin: '14px 0 0' }}><span style={{ width: `${p.progress}%` }} /></div>
                  </Card>
                ))}
                {done.map((p) => (
                  <Card key={p.id} to={`/projects/${p.id}/complete`} tone="sun" title={`Completed · ${p.title}`} desc={`Finished ${fmtDate(p.completedAt)} · ${pkr(p.costRecorded || 0)} spent`} />
                ))}
              </div>
              <Footer>{active[0] && <button className="btn" onClick={() => navigate(`/projects/${active[0].id}/guide`)}>Continue</button>}</Footer>
            </>
          );
        }}
      </Loader>
    </>
  );
}

// ---------- 20 Project planner ----------
export function ProjectPlanner() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const load = useLoad(`/projects/${id}`);
  const [notes, setNotes] = useState(null);
  const [budgetOpen, setBudgetOpen] = useState(false);
  const [budget, setBudget] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState(null);

  async function patch(body, msg) {
    try { const { project } = await api.patch(`/projects/${id}`, body); load.setData((d) => ({ project: { ...d.project, ...project } })); toast(msg); }
    catch (e) { setError(e); }
  }
  async function remove() {
    await api.del(`/projects/${id}`);
    toast('Project deleted.');
    navigate('/projects');
  }

  return (
    <Loader load={load}>
      {({ project: p }) => {
        if (p.status === 'completed') return <Navigate to={`/projects/${p.id}/complete`} replace />;
        const steps = p.idea.steps;
        return (
          <>
            <PageHeader title="Plan your next steps" sub="Turn an idea into a manageable plan." />
            <div className="grid">
              <Card title={`Project · ${p.title}`} desc={`${p.idea.minutes} min · ${p.idea.difficulty} · ${p.progress}% done`} />
              {steps.slice(0, 3).map((s, i) => (
                <Card key={i} title={s.title} desc={s.detail} tone={p.stepsDone[i] ? undefined : 'sun'} />
              ))}
              <Card title={`Budget · ${pkr(p.budget)}`} desc={`Missing items cost about ${pkr(p.missingCost)}. Tap to change.`}
                onClick={() => { setBudget(String(p.budget)); setBudgetOpen(true); }} />
            </div>
            <h2 className="section-title">Materials</h2>
            <MaterialList materials={p.materials} substitutes={p.idea.substitutes} chosenSubs={p.substitutions} />
            <h2 className="section-title">Notes</h2>
            <textarea className="textarea" style={{ maxWidth: 760, minHeight: 90 }} placeholder="Measurements, reminders, what to buy…"
              value={notes ?? p.notes} onChange={(e) => setNotes(e.target.value)} />
            {notes !== null && notes !== p.notes && (
              <div className="btn-row" style={{ marginTop: 10 }}><button className="btn sm" onClick={() => patch({ notes }, 'Notes saved.').then(() => setNotes(null))}>Save notes</button></div>
            )}
            <ErrorBox error={error} />
            <Footer>
              <button className="btn" onClick={() => navigate(`/projects/${p.id}/guide`)}>Open making guide</button>
              <button className="btn ghost sm" onClick={() => setConfirmDelete(true)}>Delete project</button>
            </Footer>
            {budgetOpen && (
              <Modal title="Set budget" onClose={() => setBudgetOpen(false)}>
                <label className="label" htmlFor="budget">Budget in PKR</label>
                <input id="budget" className="input" type="number" min="0" value={budget} onChange={(e) => setBudget(e.target.value)} />
                <div className="btn-row" style={{ marginTop: 18 }}>
                  <button className="btn sm" onClick={() => { patch({ budget: Number(budget) }, 'Budget updated.'); setBudgetOpen(false); }}>Save</button>
                  <button className="btn ghost sm" onClick={() => setBudgetOpen(false)}>Cancel</button>
                </div>
              </Modal>
            )}
            {confirmDelete && (
              <Modal title="Delete this project?" onClose={() => setConfirmDelete(false)}>
                <p className="muted">Progress and notes for {p.title} will be removed. This cannot be undone.</p>
                <div className="btn-row" style={{ marginTop: 18 }}>
                  <button className="btn danger sm" onClick={remove}>Delete</button>
                  <button className="btn ghost sm" onClick={() => setConfirmDelete(false)}>Cancel</button>
                </div>
              </Modal>
            )}
          </>
        );
      }}
    </Loader>
  );
}

// ---------- 21 Making guide ----------
export function MakingGuide() {
  const { id } = useParams();
  const navigate = useNavigate();
  const load = useLoad(`/projects/${id}`);
  const [finishing, setFinishing] = useState(false);
  const [cost, setCost] = useState('0');
  const [useUp, setUseUp] = useState(false);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function toggleStep(p, i) {
    const done = !p.stepsDone[i];
    load.setData((d) => ({ project: { ...d.project, stepsDone: d.project.stepsDone.map((v, j) => (j === i ? done : v)) } })); // optimistic
    try {
      const { project } = await api.patch(`/projects/${p.id}/steps/${i}`, { done });
      load.setData((d) => ({ project: { ...d.project, ...project } }));
    } catch (e) { setError(e); load.reload(); }
  }
  async function complete(p) {
    setBusy(true);
    try { await api.post(`/projects/${p.id}/complete`, { cost: Number(cost) || 0, useUpResources: useUp }); navigate(`/projects/${p.id}/complete`); }
    catch (e) { setError(e); setBusy(false); }
  }

  return (
    <Loader load={load}>
      {({ project: p }) => {
        if (p.status === 'completed') return <Navigate to={`/projects/${p.id}/complete`} replace />;
        const doneCount = p.stepsDone.filter(Boolean).length;
        const pct = Math.round((doneCount / p.stepsDone.length) * 100);
        return (
          <>
            <PageHeader title="Make it happen, one step at a time" sub={`${p.title} · clear steps, visible progress and safety reminders.`} progress={pct} />
            <p className="muted small" style={{ margin: '10px 0 22px' }}>{doneCount} of {p.stepsDone.length} steps done · tap a step to tick it off</p>
            <div className="steps">
              {p.idea.steps.map((s, i) => (
                <button key={i} className={`step${p.stepsDone[i] ? ' done' : ''}`} aria-pressed={p.stepsDone[i]} onClick={() => toggleStep(p, i)}>
                  <span className="step-num">{p.stepsDone[i] ? '✓' : i + 1}</span>
                  <span><strong>Step {i + 1} · {s.title}</strong><br /><span className="muted small">{s.detail}</span></span>
                </button>
              ))}
            </div>
            <div className="callout"><strong>Safety ·</strong> {p.idea.safety}</div>
            <ErrorBox error={error} />
            <Footer>
              <button className="btn" onClick={() => setFinishing(true)}>Complete project</button>
              {doneCount < p.stepsDone.length && <span className="muted small">You can still complete it early.</span>}
            </Footer>
            {finishing && (
              <Modal title={`Complete ${p.title}?`} onClose={() => setFinishing(false)}>
                <label className="label" htmlFor="cost">Additional money spent (PKR)</label>
                <input id="cost" className="input" type="number" min="0" value={cost} onChange={(e) => setCost(e.target.value)} />
                <label className="checkbox"><input type="checkbox" checked={useUp} onChange={(e) => setUseUp(e.target.checked)} /> Reduce the used resources on my shelf</label>
                <div className="btn-row" style={{ marginTop: 18 }}>
                  <button className="btn sm" disabled={busy} onClick={() => complete(p)}>{busy ? 'Saving…' : 'Mark complete'}</button>
                  <button className="btn ghost sm" onClick={() => setFinishing(false)}>Not yet</button>
                </div>
              </Modal>
            )}
          </>
        );
      }}
    </Loader>
  );
}

// ---------- 22 Project completion ----------
export function ProjectCompletion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const load = useLoad(`/projects/${id}`);
  useEffect(() => { document.title = 'Project complete · Patchwork'; return () => { document.title = 'Patchwork'; }; }, []);
  return (
    <Loader load={load}>
      {({ project: p }) => {
        if (p.status !== 'completed') return <Navigate to={`/projects/${p.id}/guide`} replace />;
        const count = p.reusedItems.reduce((n, r) => n + (Number(r.qty) || 0), 0);
        return (
          <>
            <PageHeader title="Project complete!" sub="Review your completed project and recorded activity." />
            <div className="grid">
              <Card title={`${p.title} completed`} desc={`Finished ${fmtDate(p.completedAt)}.`} />
              <Card title={`Resources · ${p.reusedItems.length ? p.reusedItems.map((r) => `${r.qty} ${r.name.toLowerCase()}`).join(', ') : 'none recorded'}`} desc="Taken from your shelf." />
              <Card title={`Recorded additional cost · ${pkr(p.costRecorded || 0)}`} desc="What you spent on top of what you had." />
              <Card title={`Reused item count · ${count}`} desc="Things that got a second life." tone="sun" />
            </div>
            <Footer>
              <button className="btn" onClick={() => navigate('/impact')}>View personal impact</button>
              <button className="btn ghost sm" onClick={() => navigate('/make')}>Make something else</button>
            </Footer>
          </>
        );
      }}
    </Loader>
  );
}
