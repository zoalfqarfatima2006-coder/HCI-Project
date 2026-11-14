import { useNavigate } from 'react-router-dom';
import { useAuth, useLoad } from '../state.jsx';
import { Card, Footer, Loader, PageHeader } from '../components/ui.jsx';

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---------- 05 Home dashboard ----------
export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const load = useLoad('/dashboard');
  const h = new Date().getHours();
  const greeting = h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <>
      <PageHeader title={`${greeting}, ${user.name.split(' ')[0]}`} sub="Your resources, ideas and projects in one place." />
      <Loader load={load}>
        {(d) => (
          <>
            <div className="grid">
              <Card title="Resource library" desc={`${plural(d.resourceCount, 'item')} · ${plural(d.categoryCount, 'category', 'categories')}`} to="/resources" />
              <Card title="Projects in progress" desc={`${plural(d.activeProjects, 'project')} underway`} to="/projects" />
              <Card title="Saved ideas" desc={`${plural(d.savedIdeas, 'idea')} to explore`} to="/saved" />
            </div>
            <div className="grid two" style={{ marginTop: 34 }}>
              <Card title="What can I make?" desc="Choose resources and discover ideas." to="/make" />
              <Card title="I have a goal" desc="Describe an outcome and compare routes." to="/goal" />
            </div>
            <div className="grid two" style={{ marginTop: 34 }}>
              <Card title="Design studio" desc="Plan a 2D patchwork — try materials, colours and layouts before you cut." to="/studio" tone="sun" />
            </div>
            {d.recentProjects.length > 0 && (
              <>
                <h2 className="section-title">Pick up where you left off</h2>
                <div className="grid">
                  {d.recentProjects.map((p) => (
                    <Card key={p.id} title={`${p.title} · ${p.progress}%`} desc={`Next: ${p.idea.steps[p.stepsDone.indexOf(false)]?.title || 'Finish up'}`} to={`/projects/${p.id}/guide`} tone="sun" />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </Loader>
      <Footer><button className="btn" onClick={() => navigate('/resources')}>Open resource library</button></Footer>
    </>
  );
}
