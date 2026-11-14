import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useToast } from '../state.jsx';
import { Card, Chip, ErrorBox, Footer, Loader, Modal, PageHeader, StatePanel } from '../components/ui.jsx';

export const CATEGORIES = ['Fabric', 'Paper', 'Glass', 'Electronics', 'Food', 'Tools', 'Garden', 'Custom'];
export const CONDITIONS = ['New', 'Good', 'Worn', 'Needs repair'];
const fmtQty = (r) => `${Number(r.quantity)} ${r.unit}`;

// ---------- 06 Resource library (+ 27 empty state) ----------
export function Library() {
  const navigate = useNavigate();
  const load = useLoad('/resources');
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');

  return (
    <Loader load={load}>
      {({ resources }) => {
        if (resources.length === 0) {
          return (
            <>
              <PageHeader title="Your shelf is waiting" sub="Add your first resource to begin." />
              <StatePanel kind="empty" title="Add your first resource" text="Your shelf is empty. Add something useful you already own."
                action={<button className="btn" onClick={() => navigate('/resources/new')}>Add first resource</button>} />
              <Footer />
            </>
          );
        }
        const cats = ['All', ...CATEGORIES.filter((c) => resources.some((r) => r.category === c))];
        const shown = resources.filter((r) => (cat === 'All' || r.category === cat) && r.name.toLowerCase().includes(q.toLowerCase()));
        return (
          <>
            <PageHeader title="Your resource shelf" sub="Track jars, cables, ingredients and more." />
            <div className="btn-row" style={{ marginBottom: 26 }}>
              <input className="input" style={{ maxWidth: 300 }} placeholder="Search resources" aria-label="Search resources" value={q} onChange={(e) => setQ(e.target.value)} />
              <div className="chips tight" style={{ maxWidth: 'none' }}>
                {cats.map((c) => <Chip key={c} pressed={cat === c} onClick={() => setCat(c)}>{c}</Chip>)}
              </div>
            </div>
            <div className="grid">
              {shown.map((r) => (
                <Card key={r.id} to={`/resources/${r.id}`} title={`${r.name} · ${fmtQty(r)}`}
                  desc={[r.category, r.condition, r.location].filter(Boolean).join(' · ')} tone={r.condition === 'Needs repair' ? 'clay' : undefined} />
              ))}
            </div>
            {shown.length === 0 && <p className="muted">No resources match that search.</p>}
            <Footer><button className="btn" onClick={() => navigate('/resources/new')}>Add resource</button></Footer>
          </>
        );
      }}
    </Loader>
  );
}

// ---------- 07 Add / edit resource ----------
export function ResourceForm() {
  const { id } = useParams();
  const editing = !!id;
  const navigate = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ name: '', category: '', quantity: '', unit: '', condition: 'Good', location: '', notes: '' });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(!editing);

  useEffect(() => {
    if (!editing) return;
    api.get(`/resources/${id}`).then(({ resource: r }) => {
      setF({ name: r.name, category: r.category, quantity: String(r.quantity), unit: r.unit, condition: r.condition, location: r.location, notes: r.notes });
      setReady(true);
    }).catch(setError);
  }, [id, editing]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  async function submit(e) {
    e.preventDefault();
    if (!f.category) return setError('Choose a category.');
    setBusy(true); setError(null);
    try {
      const body = { ...f, quantity: Number(f.quantity || 1) };
      const { resource } = editing ? await api.put(`/resources/${id}`, body) : await api.post('/resources', body);
      toast(editing ? 'Resource updated.' : `${resource.name} added to your shelf.`);
      navigate(editing ? `/resources/${id}` : '/resources');
    } catch (err) { setError(err); } finally { setBusy(false); }
  }

  if (!ready) return error ? <ErrorBox error={error} /> : <StatePanel kind="loading" title="Loading resource" text="One moment…" />;

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader title={editing ? 'Edit resource' : 'Add a resource'} sub="Manual entry is always available. No scanning required." />
      <div className="form" style={{ maxWidth: 470 }}>
        <label className="label" htmlFor="name">Resource name</label>
        <input className="input" id="name" placeholder="e.g. Glass jars" value={f.name} onChange={set('name')} />
        <p className="label">Category</p>
        <div className="chips tight" role="radiogroup" aria-label="Category">
          {CATEGORIES.map((c) => <Chip key={c} pressed={f.category === c} onClick={() => setF({ ...f, category: c })}>{c}</Chip>)}
        </div>
        <div className="input-row">
          <div><label className="label" htmlFor="qty">Quantity</label><input className="input" id="qty" type="number" min="0" step="any" placeholder="e.g. 6" value={f.quantity} onChange={set('quantity')} /></div>
          <div><label className="label" htmlFor="unit">Unit</label><input className="input" id="unit" placeholder="jars, pieces, kg…" value={f.unit} onChange={set('unit')} /></div>
        </div>
        <p className="label">Condition</p>
        <div className="chips tight" role="radiogroup" aria-label="Condition">
          {CONDITIONS.map((c) => <Chip key={c} pressed={f.condition === c} onClick={() => setF({ ...f, condition: c })}>{c}</Chip>)}
        </div>
        <label className="label" htmlFor="loc">Storage location</label>
        <input className="input" id="loc" placeholder="e.g. Kitchen shelf" value={f.location} onChange={set('location')} />
        <label className="label" htmlFor="notes">Notes</label>
        <textarea className="input" id="notes" rows={3} placeholder="Optional notes · Include safety details where relevant." value={f.notes} onChange={set('notes')} />
        <ErrorBox error={error} />
      </div>
      <Footer>
        <button className="btn" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add to shelf'}</button>
        <button type="button" className="btn ghost sm" onClick={() => navigate(-1)}>Cancel</button>
      </Footer>
    </form>
  );
}

// ---------- 08 Resource details ----------
export function ResourceDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const load = useLoad(`/resources/${id}`);
  const [confirm, setConfirm] = useState(false);

  async function remove() {
    await api.del(`/resources/${id}`);
    toast('Resource removed.');
    navigate('/resources');
  }

  return (
    <Loader load={load}>
      {({ resource: r, uses }) => (
        <>
          <PageHeader title={r.name} sub="Quantity, condition and possible uses." />
          <div className="grid">
            <Card title={`Quantity · ${fmtQty(r)}`} desc={`Category · ${r.category}`} />
            <Card title={`Condition · ${r.condition}`} desc={r.condition === 'Needs repair' ? 'Consider a repair project first.' : 'Ready to use.'} tone={r.condition === 'Needs repair' ? 'clay' : undefined} />
            <Card title={`Location · ${r.location || 'Not set'}`} desc={r.notes || 'No notes yet.'} />
            <Card title="Possible uses" desc={uses.length ? `${uses.length} ideas can use this.` : 'No matching ideas yet.'} to={uses.length ? `/ideas/${uses[0].id}` : undefined} />
            <Card title="Edit resource" desc="Update quantity, condition or notes." to={`/resources/${r.id}/edit`} />
          </div>
          {uses.length > 0 && (
            <>
              <h2 className="section-title">Ideas that use {r.name.toLowerCase()}</h2>
              <div className="rows">
                {uses.map((i) => (
                  <Link key={i.id} className="row" to={`/ideas/${i.id}`}>
                    <span className="row-title">{i.title}</span>
                    <span className="row-aside">{i.minutes} min · {i.difficulty} →</span>
                  </Link>
                ))}
              </div>
            </>
          )}
          <Footer>
            <button className="btn" onClick={() => navigate('/make', { state: { preselect: r.id } })}>Make something with this</button>
            <button className="btn ghost sm" onClick={() => setConfirm(true)}>Remove</button>
          </Footer>
          {confirm && (
            <Modal title={`Remove ${r.name}?`} onClose={() => setConfirm(false)}>
              <p className="muted">This removes it from your shelf. Past projects keep their records.</p>
              <div className="btn-row" style={{ marginTop: 20 }}>
                <button className="btn danger sm" onClick={remove}>Remove</button>
                <button className="btn ghost sm" onClick={() => setConfirm(false)}>Cancel</button>
              </div>
            </Modal>
          )}
        </>
      )}
    </Loader>
  );
}
