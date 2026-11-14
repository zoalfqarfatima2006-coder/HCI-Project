import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api, pkr } from '../api.js';
import { useLoad, useToast } from '../state.jsx';
import { Card, ErrorBox, Footer, IdeaCard, Loader, MaterialList, PageHeader, StatePanel } from '../components/ui.jsx';

const names = (list) => list.map((m) => m.name.toLowerCase()).join(', ');

// ---------- 13 Idea details ----------
export function IdeaDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const load = useLoad(`/ideas/${id}`);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function toggleSave(idea) {
    try {
      const { saved } = idea.saved ? await api.del(`/ideas/${idea.id}/save`) : await api.post(`/ideas/${idea.id}/save`);
      load.setData((d) => ({ ...d, idea: { ...d.idea, saved } }));
      toast(saved ? 'Saved to your ideas.' : 'Removed from saved ideas.');
    } catch (e) { setError(e); }
  }
  async function start(idea) {
    setBusy(true);
    try {
      const { project, existing } = await api.post('/projects', { ideaId: idea.id });
      toast(existing ? 'You already have this project — opening it.' : 'Project started.');
      navigate(`/projects/${project.id}`);
    } catch (e) { setError(e); setBusy(false); }
  }

  return (
    <Loader load={load}>
      {({ idea, story, activeProjectId }) => {
        const have = idea.materials.filter((m) => m.status !== 'missing');
        const missing = idea.materials.filter((m) => m.status === 'missing');
        return (
          <>
            <PageHeader title={idea.title} sub="See what you need, what you have and how to begin." />
            <div className="grid">
              <Card title={`Available · ${have.length ? names(have) : 'nothing yet'}`} desc={`You have ${idea.haveCount} of ${idea.requiredCount} required materials.`} />
              <Card tone={missing.length ? 'clay' : undefined} title={`Missing · ${missing.length ? names(missing) : 'nothing'}`}
                desc={missing.length ? `Estimated extra cost ${pkr(idea.missingCost)}.` : 'You can start right away.'} />
              <Card title={`Time · ${idea.minutes} minutes · ${idea.difficulty}`} desc={idea.summary} />
              <Card tone="sun" title={`Safety · ${idea.safety.split(/[—;.]/)[0].toLowerCase()}`} desc={idea.safety} />
              <Card title={`${idea.saved ? 'Saved' : 'Save idea'} · ${activeProjectId ? 'Continue project' : 'Start project'}`}
                desc={idea.saved ? 'Tap to remove from saved ideas.' : 'Keep it for later in Saved ideas.'} onClick={() => toggleSave(idea)} />
            </div>

            <h2 className="section-title">What you need</h2>
            <MaterialList materials={idea.materials} substitutes={idea.substitutes} />
            {idea.substitutes.length > 0 && (
              <div className="callout">
                <strong>Safe substitutes:</strong>{' '}
                {idea.substitutes.map((s) => `${s.use} instead of ${idea.materials.find((m) => m.key === s.for)?.name.toLowerCase()}`).join('; ')}.
              </div>
            )}

            <h2 className="section-title">How it's made</h2>
            <ol className="steps" style={{ paddingLeft: 0, listStyle: 'none', margin: 0 }}>
              {idea.steps.map((s, i) => (
                <li key={i} className="step" style={{ cursor: 'default' }}>
                  <span className="step-num">{i + 1}</span>
                  <span><strong>{s.title}</strong><br /><span className="muted small">{s.detail}</span></span>
                </li>
              ))}
            </ol>
            {['fabric-wall-art', 'patch-bag'].includes(idea.id) && (
              <div className="callout" style={{ background: 'var(--sage)', borderColor: 'var(--green)' }}>
                <strong>Plan the look first:</strong> try fabrics, colours and layouts in the{' '}
                <Link className="link" to="/studio/new?template=herb-garden">Design studio</Link>.
              </div>
            )}
            {story && <p className="small" style={{ marginTop: 22 }}>Community story: <Link className="link" to={`/inspiration/${story.id}`}>{story.title}</Link></p>}
            <ErrorBox error={error} />
            <Footer>
              {activeProjectId
                ? <button className="btn" onClick={() => navigate(`/projects/${activeProjectId}`)}>Continue project</button>
                : <button className="btn" disabled={busy} onClick={() => start(idea)}>{busy ? 'Starting…' : 'Start project'}</button>}
              <button className="btn ghost sm" onClick={() => toggleSave(idea)}>{idea.saved ? 'Unsave' : 'Save idea'}</button>
            </Footer>
          </>
        );
      }}
    </Loader>
  );
}

// ---------- 18 Saved ideas ----------
export function SavedIdeas() {
  const navigate = useNavigate();
  const toast = useToast();
  const load = useLoad('/saved');

  async function unsave(e, idea) {
    e.preventDefault(); e.stopPropagation();
    await api.del(`/ideas/${idea.id}/save`);
    load.setData((d) => ({ ideas: d.ideas.filter((i) => i.id !== idea.id) }));
    toast(`${idea.title} removed.`);
  }

  return (
    <>
      <PageHeader title="Ideas worth keeping" sub="Keep promising ideas together for later." />
      <Loader load={load}>
        {({ ideas }) => ideas.length === 0 ? (
          <StatePanel kind="empty" title="No saved ideas yet" text="Save ideas you like from Discover or Inspiration."
            action={<button className="btn" onClick={() => navigate('/make')}>Discover ideas</button>} />
        ) : (
          <>
            <div className="grid">
              {ideas.map((i) => (
                <IdeaCard key={i.id} idea={i} to={`/ideas/${i.id}`}
                  extra={<button className="link small" onClick={(e) => unsave(e, i)} aria-label={`Unsave ${i.title}`}>Unsave</button>} />
              ))}
            </div>
            <Footer><button className="btn" onClick={() => navigate(`/ideas/${ideas[0].id}`)}>Continue</button></Footer>
          </>
        )}
      </Loader>
    </>
  );
}
