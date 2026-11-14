import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { CATEGORY_LABELS, pkr } from '../api.js';
import { useLoad } from '../state.jsx';
import { Card, Footer, IdeaCard, Loader, PageHeader, StatePanel } from '../components/ui.jsx';

// ---------- 23 Inspiration shelf ----------
export function InspirationShelf() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const cat = params.get('c');
  const cats = useLoad('/inspiration');
  const stories = useLoad(cat ? `/stories?category=${cat}` : null);
  const ideas = useLoad(cat ? `/ideas?category=${cat}` : null);

  return (
    <>
      <PageHeader title="A little inspiration goes a long way" sub="Explore food, repair, home, garden and creative ideas." />
      <Loader load={cats}>
        {({ categories }) => (
          <div className="grid">
            {categories.map((c) => (
              <Card key={c.key} title={c.title} desc={`${c.ideas} ${c.ideas === 1 ? 'idea' : 'ideas'} · ${c.stories} ${c.stories === 1 ? 'story' : 'stories'}`}
                selectable selected={cat === c.key} onClick={() => setParams(cat === c.key ? {} : { c: c.key })} />
            ))}
          </div>
        )}
      </Loader>
      {cat && (
        <>
          <h2 className="section-title">Community stories</h2>
          {stories.data && (stories.data.stories.length ? (
            <div className="rows">
              {stories.data.stories.map((s) => (
                <Link key={s.id} className="row" to={`/inspiration/${s.id}`}>
                  <span><span className="row-title">{s.title}</span><br /><span className="muted small">{s.summary}</span></span>
                  <span className="row-aside">Read →</span>
                </Link>
              ))}
            </div>
          ) : <p className="muted">No stories in this category yet.</p>)}
          <h2 className="section-title">Ideas in {CATEGORY_LABELS[cat]?.toLowerCase()}</h2>
          {ideas.data && <div className="grid">{ideas.data.ideas.map((i) => <IdeaCard key={i.id} idea={i} to={`/ideas/${i.id}`} />)}</div>}
        </>
      )}
      <Footer>
        <button className="btn" onClick={() => (cat && stories.data?.stories[0] ? navigate(`/inspiration/${stories.data.stories[0].id}`) : setParams({ c: 'garden' }))}>
          {cat && stories.data?.stories[0] ? 'Read a story' : 'Continue'}
        </button>
      </Footer>
    </>
  );
}

// ---------- 24 Community story ----------
export function CommunityStory() {
  const { id } = useParams();
  const navigate = useNavigate();
  const load = useLoad(`/stories/${id}`);
  return (
    <Loader load={load}>
      {({ story, idea }) => (
        <>
          <PageHeader title={story.title} sub="Community story · shared to inspire, adapt to your own resources." />
          <div className="grid">
            <Card title={`Community example · ${idea ? idea.title.toLowerCase() : story.category}`} desc={story.summary} />
            <Card title={`By · ${story.author}`} desc={`Category · ${CATEGORY_LABELS[story.category]}`} />
            <Card title={story.summary} desc={story.body} />
            <Card tone="sun" title={`Lesson · ${story.lesson.split(/[—:.]/)[0].toLowerCase()}`} desc={story.lesson} />
          </div>
          {idea && (
            <>
              <h2 className="section-title">Make it yourself</h2>
              <div className="grid"><IdeaCard idea={idea} to={`/ideas/${idea.id}`} /></div>
            </>
          )}
          <Footer>{idea && <button className="btn" onClick={() => navigate(`/ideas/${idea.id}`)}>Try this idea</button>}</Footer>
        </>
      )}
    </Loader>
  );
}

// ---------- 25 Personal impact ----------
export function PersonalImpact() {
  const navigate = useNavigate();
  const load = useLoad('/impact');
  return (
    <>
      <PageHeader title="Your reuse activity" sub="Counts based only on completed project records." />
      <Loader load={load}>
        {(d) => d.completedProjects === 0 ? (
          <StatePanel kind="empty" title="No completed projects yet" text="Finish a project and your reuse activity will appear here."
            action={<button className="btn" onClick={() => navigate('/projects')}>Go to my projects</button>} />
        ) : (
          <>
            <div className="grid">
              <Card title="Completed projects"><p className="stat">{d.completedProjects}</p></Card>
              <Card title="Reused items"><p className="stat">{d.reusedItems}</p></Card>
              <Card title="Skills explored"><p className="stat">{d.skillsExplored}</p><p className="card-desc">{d.skills.map((s) => CATEGORY_LABELS[s]).join(' · ')}</p></Card>
              <Card title="Money not spent" tone="sun"><p className="stat">{pkr(d.moneySaved)}</p><p className="card-desc">Estimated cost of reused materials · you spent {pkr(d.spent)}.</p></Card>
            </div>
            <h2 className="section-title">Recently completed</h2>
            <div className="rows">
              {d.recent.map((p) => (
                <Link key={p.id} className="row" to={`/projects/${p.id}/complete`}>
                  <span className="row-title">{p.title}</span>
                  <span className="row-aside">{p.reusedItems.map((r) => r.name).join(', ') || '—'} →</span>
                </Link>
              ))}
            </div>
          </>
        )}
      </Loader>
      <Footer><button className="btn" onClick={() => navigate('/home')}>Continue</button></Footer>
    </>
  );
}
