import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api } from '../api.js';
import { useLoad, useToast } from '../state.jsx';
import { Card, ErrorBox, Footer, Loader, Modal, PageHeader, StatePanel } from '../components/ui.jsx';
import PatchCanvas, { MaterialSwatch, exportPng, materialName } from '../studio/PatchCanvas.jsx';
import { LIMITS, MATERIALS, SHAPES, TEMPLATES, cleanDesign, materialCounts, materialPlan } from '../../server/designs.js';

const EYEBROW = 'Design studio';
const PALETTE = ['#496a56', '#7f9f84', '#deebd9', '#e3b059', '#d98b4a', '#be6047', '#8c3a24', '#d9a5b3', '#8a6fa8', '#3f5b7a', '#5b7898', '#efe6d2', '#fffdf7', '#252b27'];
const REMIX = {
  Garden: ['#496a56', '#7f9f84', '#deebd9', '#e3b059', '#efe6d2'],
  Sunset: ['#e3b059', '#d98b4a', '#be6047', '#8c3a24', '#efe6d2'],
  Denim: ['#2f4560', '#3f5b7a', '#5b7898', '#efe6d2', '#be6047'],
  Pastel: ['#deebd9', '#d9a5b3', '#c9d6ea', '#f3dfb1', '#e8d9f1'],
};
const SHAPE_LABELS = { square: 'Square', triangle: 'Half triangle', circle: 'Circle appliqué', diamond: 'Diamond' };
const clone = (c) => JSON.parse(JSON.stringify(c));
// Canonical form for "unsaved changes" checks (same normalisation the API applies).
const canon = (name, composition, variations) => {
  try { return JSON.stringify(cleanDesign({ name: name || ' ', composition, variations })); } catch { return `invalid:${Math.random()}`; }
};
const fmt = (s) => (s ? new Date(s.replace(' ', 'T') + 'Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : '');

// ---------- Studio gallery ----------
export function StudioHome() {
  const navigate = useNavigate();
  const toast = useToast();
  const load = useLoad('/designs');
  const [confirm, setConfirm] = useState(null);

  async function duplicate(d) {
    const { design } = await api.post('/designs', { name: `${d.name} (copy)`.slice(0, LIMITS.maxName), composition: d.composition, variations: d.variations });
    toast('Design duplicated.');
    navigate(`/studio/${design.id}`);
  }
  async function remove(d) {
    await api.del(`/designs/${d.id}`);
    load.setData((x) => ({ designs: x.designs.filter((y) => y.id !== d.id) }));
    setConfirm(null);
    toast('Design deleted.');
  }

  return (
    <>
      <PageHeader eyebrow={EYEBROW} title="Design your patchwork" sub="Plan a flat 2D patchwork: try materials, colours and layouts before you cut a single piece." />
      <h2 className="section-title" style={{ marginTop: 0 }}>Start from a template</h2>
      <div className="studio-templates">
        {TEMPLATES.map((t) => (
          <Link key={t.key} className="card studio-tile" to={`/studio/new?template=${t.key}`}>
            <PatchCanvas composition={t.composition} interactive={false} title={`${t.name} template preview`} />
            <p className="card-title" style={{ margin: '12px 0 4px' }}>{t.name}</p>
            <p className="card-desc">{t.description}</p>
          </Link>
        ))}
      </div>
      <h2 className="section-title">Your designs</h2>
      <Loader load={load}>
        {({ designs }) => designs.length === 0 ? (
          <p className="muted">No saved designs yet. Pick a template above to begin.</p>
        ) : (
          <div className="studio-templates">
            {designs.map((d) => (
              <div key={d.id} className="card studio-tile">
                <Link to={`/studio/${d.id}`} aria-label={`Open ${d.name}`}>
                  <PatchCanvas composition={d.composition} interactive={false} title={`${d.name} preview`} />
                </Link>
                <p className="card-title" style={{ margin: '12px 0 4px' }}><Link to={`/studio/${d.id}`} style={{ textDecoration: 'none' }}>{d.name}</Link></p>
                <p className="card-desc">{d.composition.cols}×{d.composition.rows} · {d.variations.length} variation{d.variations.length === 1 ? '' : 's'} · edited {fmt(d.updatedAt)}</p>
                <div className="card-meta">
                  <button className="link small" onClick={() => duplicate(d)}>Duplicate</button>
                  <button className="link small" style={{ color: 'var(--danger)' }} onClick={() => setConfirm(d)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Loader>
      <Footer><button className="btn" onClick={() => navigate('/studio/new?template=blank')}>New blank design</button></Footer>
      {confirm && (
        <Modal title={`Delete “${confirm.name}”?`} onClose={() => setConfirm(null)}>
          <p className="muted">The design and its variations will be removed. This cannot be undone.</p>
          <div className="btn-row" style={{ marginTop: 18 }}>
            <button className="btn danger sm" onClick={() => remove(confirm)}>Delete</button>
            <button className="btn ghost sm" onClick={() => setConfirm(null)}>Cancel</button>
          </div>
        </Modal>
      )}
    </>
  );
}

// ---------- editor state: composition + undo/redo ----------
function useHistory(initial) {
  const [state, setState] = useState({ past: [], present: initial, future: [] });
  const set = useCallback((fn) => setState((s) => {
    const next = typeof fn === 'function' ? fn(clone(s.present)) : fn;
    if (JSON.stringify(next) === JSON.stringify(s.present)) return s;
    return { past: [...s.past.slice(-99), s.present], present: next, future: [] };
  }), []);
  const undo = useCallback(() => setState((s) => (s.past.length ? { past: s.past.slice(0, -1), present: s.past.at(-1), future: [s.present, ...s.future] } : s)), []);
  const redo = useCallback(() => setState((s) => (s.future.length ? { past: [...s.past, s.present], present: s.future[0], future: s.future.slice(1) } : s)), []);
  const reset = useCallback((c) => setState({ past: [], present: c, future: [] }), []);
  return { comp: state.present, set, undo, redo, reset, canUndo: state.past.length > 0, canRedo: state.future.length > 0 };
}

function resizeGrid(c, cols, rows) {
  const filler = c.patches[c.patches.length - 1] || { material: 'cotton', color: '#efe6d2', shape: 'square', rotation: 0 };
  const patches = [];
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    patches.push(x < c.cols && y < c.rows ? c.patches[y * c.cols + x] : { ...filler });
  }
  return { ...c, cols, rows, patches };
}

// ---------- Studio editor ----------
export function StudioEditor() {
  const { id } = useParams();
  const isNew = !id;
  const [params] = useSearchParams();
  const templateKey = params.get('template') || 'blank';
  const navigate = useNavigate();
  const toast = useToast();
  const svgRef = useRef(null);
  const resources = useLoad('/resources');

  const [loaded, setLoaded] = useState(isNew ? { name: TEMPLATES.find((t) => t.key === templateKey)?.name || 'My patchwork', variations: [] } : null);
  const [loadError, setLoadError] = useState(null);
  const startComp = isNew ? clone((TEMPLATES.find((t) => t.key === templateKey) || TEMPLATES[0]).composition) : null;
  const h = useHistory(startComp);
  const [name, setName] = useState(loaded?.name || '');
  const [variations, setVariations] = useState([]);
  const [savedSnapshot, setSavedSnapshot] = useState(isNew ? null : '');
  const [selected, setSelected] = useState(new Set([0]));
  const [finished, setFinished] = useState(false);
  const [compareIdx, setCompareIdx] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  // load an existing design
  useEffect(() => {
    if (isNew) return;
    api.get(`/designs/${id}`).then(({ design }) => {
      setLoaded(design); setName(design.name); setVariations(design.variations); h.reset(design.composition);
      setSavedSnapshot(canon(design.name, design.composition, design.variations));
    }).catch(setLoadError);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const comp = h.comp;
  const snapshot = comp ? canon(name, comp, variations) : '';
  const dirty = savedSnapshot === null || snapshot !== savedSnapshot;

  useEffect(() => {
    const warn = (e) => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  // keyboard shortcuts: undo / redo
  useEffect(() => {
    const onKey = (e) => {
      if (!(e.ctrlKey || e.metaKey) || ['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.key.toLowerCase() === 'z' && !e.shiftKey) { e.preventDefault(); h.undo(); }
      if ((e.key.toLowerCase() === 'z' && e.shiftKey) || e.key.toLowerCase() === 'y') { e.preventDefault(); h.redo(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [h]);

  const sel = useMemo(() => [...selected].filter((i) => comp && i < comp.patches.length), [selected, comp]);
  const first = comp && sel.length ? comp.patches[sel[0]] : null;
  const plan = useMemo(() => (comp && resources.data ? materialPlan(comp, resources.data.resources) : []), [comp, resources.data]);

  if (loadError) return <StatePanel kind="error" title="Design not found" text={loadError.message} action={<button className="btn" onClick={() => navigate('/studio')}>Back to studio</button>} />;
  if (!comp || !loaded) return <StatePanel kind="loading" title="Opening your design" text="Laying out the patches…" />;

  // ---------- edits ----------
  const applyToSelection = (patch) => {
    if (!sel.length) { toast('Select a patch first — click one on the canvas.'); return; }
    h.set((c) => { for (const i of sel) c.patches[i] = { ...c.patches[i], ...patch }; return c; });
  };
  const select = (i, additive) => setSelected((s) => {
    if (!additive) return new Set([i]);
    const n = new Set(s);
    if (n.has(i)) n.delete(i); else n.add(i);
    return n;
  });
  const swap = (a, b) => {
    h.set((c) => { [c.patches[a], c.patches[b]] = [c.patches[b], c.patches[a]]; return c; });
    setSelected(new Set([b]));
  };
  const move = (i, dx, dy) => {
    const col = (i % comp.cols) + dx;
    const row = Math.floor(i / comp.cols) + dy;
    if (col < 0 || row < 0 || col >= comp.cols || row >= comp.rows) return;
    swap(i, row * comp.cols + col);
  };
  const shuffle = () => h.set((c) => {
    const p = c.patches;
    for (let i = p.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; }
    return c;
  });
  const remix = (palette) => h.set((c) => {
    // keep the same colour for patches that shared a colour, so the pattern logic survives the remix
    const map = {};
    const pool = [...palette].sort(() => Math.random() - 0.5);
    let k = 0;
    for (const p of c.patches) { if (!map[p.color]) map[p.color] = pool[k++ % pool.length]; p.color = map[p.color]; }
    return c;
  });
  const setGrid = (cols, rows) => {
    if (cols < LIMITS.minGrid || rows < LIMITS.minGrid || cols > LIMITS.maxGrid || rows > LIMITS.maxGrid) return;
    h.set((c) => resizeGrid(c, cols, rows));
    setSelected(new Set());
  };
  const selectWhere = (fn) => setSelected(new Set(comp.patches.map((p, i) => (fn(p) ? i : -1)).filter((i) => i >= 0)));

  // ---------- variations (what-if) ----------
  const saveVariation = () => {
    if (variations.length >= LIMITS.maxVariations) { toast(`You can keep up to ${LIMITS.maxVariations} variations — delete one first.`); return; }
    const label = `Variation ${String.fromCharCode(65 + variations.length)}`;
    setVariations((v) => [...v, { label, composition: clone(comp) }]);
    toast(`${label} saved — keep experimenting.`);
  };
  const loadVariation = (i) => { h.set(clone(variations[i].composition)); setSelected(new Set()); setCompareIdx(null); toast(`Loaded ${variations[i].label}. Undo to go back.`); };
  const deleteVariation = (i) => { setVariations((v) => v.filter((_, j) => j !== i)); if (compareIdx === i) setCompareIdx(null); };

  async function save() {
    setBusy(true); setError(null);
    try {
      const body = { name, composition: comp, variations };
      const { design } = isNew ? await api.post('/designs', body) : await api.put(`/designs/${id}`, body);
      setSavedSnapshot(canon(design.name, design.composition, design.variations));
      toast('Design saved.');
      if (isNew) navigate(`/studio/${design.id}`, { replace: true });
    } catch (e) { setError(e); } finally { setBusy(false); }
  }

  const counts = materialCounts(comp);
  const cmp = compareIdx !== null ? variations[compareIdx] : null;

  return (
    <>
      <PageHeader eyebrow={EYEBROW} title={name || 'Untitled design'} sub="Click a patch to select it (Shift-click for several), drag to rearrange, then choose a material, colour and shape." />
      <div className="studio">
        {/* ---------- canvas column ---------- */}
        <section className="studio-stage" aria-label="Design canvas">
          <div className="studio-toolbar" role="toolbar" aria-label="Design tools">
            <button className="tool" onClick={h.undo} disabled={!h.canUndo} title="Undo (Ctrl+Z)">↶ Undo</button>
            <button className="tool" onClick={h.redo} disabled={!h.canRedo} title="Redo (Ctrl+Shift+Z)">↷ Redo</button>
            <span className="tool-sep" />
            <button className="tool" onClick={shuffle} title="Randomly rearrange every patch">⤮ Shuffle</button>
            <div className="tool-group" role="group" aria-label="Remix colours">
              <span className="muted small">Remix:</span>
              {Object.entries(REMIX).map(([k, pal]) => (
                <button key={k} className="tool remix" onClick={() => remix(pal)} title={`Recolour with the ${k} palette`}>
                  <span className="remix-dots" aria-hidden="true">{pal.slice(0, 4).map((c) => <i key={c} style={{ background: c }} />)}</span>{k}
                </button>
              ))}
            </div>
            <span className="tool-sep" />
            <div className="seg" role="radiogroup" aria-label="Preview mode">
              <button role="radio" aria-checked={!finished} className={!finished ? 'on' : ''} onClick={() => setFinished(false)}>Edit</button>
              <button role="radio" aria-checked={finished} className={finished ? 'on' : ''} onClick={() => setFinished(true)}>Finished preview</button>
            </div>
          </div>

          <div className={`studio-canvas${cmp ? ' compare' : ''}`}>
            <figure>
              {cmp && <figcaption>Current design</figcaption>}
              <PatchCanvas
                composition={comp} selected={new Set(sel)} onSelect={select} onSwap={swap} onMove={move}
                finished={finished} svgRef={svgRef} title={`${name} — ${comp.cols} by ${comp.rows} patches. Arrow keys move between patches, Enter selects, Shift plus arrow moves a patch.`}
              />
            </figure>
            {cmp && (
              <figure>
                <figcaption>{cmp.label} <button className="link small" onClick={() => setCompareIdx(null)}>Close compare</button></figcaption>
                <PatchCanvas composition={cmp.composition} interactive={false} finished={finished} title={`${cmp.label} preview`} />
              </figure>
            )}
          </div>
          {cmp && <CompareSummary a={comp} b={cmp.composition} label={cmp.label} />}

          <div className="btn-row" style={{ marginTop: 14 }}>
            <span className="muted small">{sel.length ? `${sel.length} patch${sel.length > 1 ? 'es' : ''} selected` : 'No patch selected'}</span>
            <button className="link small" onClick={() => setSelected(new Set(comp.patches.map((_, i) => i)))}>Select all</button>
            {first && <button className="link small" onClick={() => selectWhere((p) => p.material === first.material)}>Select all {materialName(first.material).toLowerCase()}</button>}
            {first && <button className="link small" onClick={() => selectWhere((p) => p.color === first.color)}>Select same colour</button>}
            {sel.length > 0 && <button className="link small" onClick={() => setSelected(new Set())}>Clear</button>}
          </div>

          {/* ---------- variations ---------- */}
          <h2 className="section-title">What-if variations</h2>
          <p className="muted small" style={{ marginTop: -6 }}>Save snapshots while you experiment, then compare them side by side or bring one back.</p>
          <div className="variations">
            {variations.map((v, i) => (
              <div key={i} className={`variation${compareIdx === i ? ' active' : ''}`}>
                <PatchCanvas composition={v.composition} interactive={false} title={`${v.label} thumbnail`} />
                <p className="small" style={{ margin: '8px 0 4px', fontWeight: 600 }}>{v.label}</p>
                <div className="card-meta" style={{ marginTop: 0 }}>
                  <button className="link small" onClick={() => setCompareIdx(compareIdx === i ? null : i)}>{compareIdx === i ? 'Hide' : 'Compare'}</button>
                  <button className="link small" onClick={() => loadVariation(i)}>Use this</button>
                  <button className="link small" style={{ color: 'var(--danger)' }} onClick={() => deleteVariation(i)} aria-label={`Delete ${v.label}`}>Delete</button>
                </div>
              </div>
            ))}
            <button className="variation add" onClick={saveVariation}><span aria-hidden="true">＋</span>Save current as variation</button>
          </div>
        </section>

        {/* ---------- inspector ---------- */}
        <aside className="studio-panel" aria-label="Customise selected patches">
          <label className="label" htmlFor="dname" style={{ marginTop: 0 }}>Design name</label>
          <input id="dname" className="input" value={name} maxLength={LIMITS.maxName} onChange={(e) => setName(e.target.value)} />

          <p className="label">Material</p>
          <div className="swatches" role="radiogroup" aria-label="Material">
            {MATERIALS.map((m) => (
              <button key={m.key} role="radio" aria-checked={first?.material === m.key} className={`swatch${first?.material === m.key ? ' on' : ''}`}
                onClick={() => applyToSelection({ material: m.key })} title={m.name}>
                <MaterialSwatch material={m.key} color={first?.color || '#7f9f84'} />
                <span>{m.name}</span>
              </button>
            ))}
          </div>

          <p className="label">Colour</p>
          <div className="colors" role="radiogroup" aria-label="Colour">
            {PALETTE.map((c) => (
              <button key={c} role="radio" aria-checked={first?.color === c} aria-label={c} title={c}
                className={`color${first?.color === c ? ' on' : ''}`} style={{ background: c }} onClick={() => applyToSelection({ color: c })} />
            ))}
            <label className="color custom" title="Custom colour">
              <input type="color" aria-label="Custom colour" value={first?.color || '#496a56'} onChange={(e) => applyToSelection({ color: e.target.value })} />
              <span aria-hidden="true">＋</span>
            </label>
          </div>

          <p className="label">Shape</p>
          <div className="chips tight" role="radiogroup" aria-label="Shape">
            {SHAPES.map((s) => (
              <button key={s} type="button" className="chip" aria-pressed={first?.shape === s} onClick={() => applyToSelection({ shape: s })}>{SHAPE_LABELS[s]}</button>
            ))}
          </div>

          <p className="label">Arrange</p>
          <div className="arrange">
            <button className="tool" onClick={() => (sel.length ? h.set((c) => { for (const i of sel) c.patches[i].rotation = (c.patches[i].rotation + 90) % 360; return c; }) : toast('Select a patch first.'))}>⟳ Rotate 90°</button>
            <div className="dpad" role="group" aria-label="Move selected patch">
              <button className="tool" disabled={sel.length !== 1} onClick={() => move(sel[0], 0, -1)} aria-label="Move up">↑</button>
              <button className="tool" disabled={sel.length !== 1} onClick={() => move(sel[0], -1, 0)} aria-label="Move left">←</button>
              <button className="tool" disabled={sel.length !== 1} onClick={() => move(sel[0], 1, 0)} aria-label="Move right">→</button>
              <button className="tool" disabled={sel.length !== 1} onClick={() => move(sel[0], 0, 1)} aria-label="Move down">↓</button>
            </div>
          </div>
          <p className="hint">Tip: drag a patch onto another to swap them.</p>

          <p className="label">Grid size</p>
          <div className="grid-size">
            {[['Columns', 'cols'], ['Rows', 'rows']].map(([label, k]) => (
              <div key={k} className="stepper">
                <span className="small muted">{label}</span>
                <button className="tool" aria-label={`Fewer ${label.toLowerCase()}`} onClick={() => setGrid(k === 'cols' ? comp.cols - 1 : comp.cols, k === 'rows' ? comp.rows - 1 : comp.rows)}>−</button>
                <strong>{comp[k]}</strong>
                <button className="tool" aria-label={`More ${label.toLowerCase()}`} onClick={() => setGrid(k === 'cols' ? comp.cols + 1 : comp.cols, k === 'rows' ? comp.rows + 1 : comp.rows)}>+</button>
              </div>
            ))}
          </div>
          <div className="input-row" style={{ marginTop: 10 }}>
            <label className="small muted color-field">Background <input type="color" value={comp.background} onChange={(e) => h.set((c) => ({ ...c, background: e.target.value }))} /></label>
            <label className="small muted color-field">Seams <input type="color" value={comp.seam} onChange={(e) => h.set((c) => ({ ...c, seam: e.target.value }))} /></label>
          </div>

          <p className="label">Material plan</p>
          <div className="plan">
            {(plan.length ? plan : Object.entries(counts).map(([key, needed]) => ({ key, name: materialName(key), needed }))).map((m) => (
              <div key={m.key} className="plan-row">
                <span>{m.name} × {m.needed}</span>
                {m.resource
                  ? <span className={`tag ${m.enough ? '' : 'warn'}`}>{m.enough ? 'On your shelf' : `Have ${m.have}`}</span>
                  : resources.data && <span className="tag miss">Not on shelf</span>}
              </div>
            ))}
          </div>
          <p className="hint">Counts one offcut per patch, matched against <Link className="link" to="/resources">your resources</Link>.</p>
        </aside>
      </div>

      <ErrorBox error={error} />
      <Footer>
        <button className="btn" disabled={busy || !dirty} onClick={save}>{busy ? 'Saving…' : dirty ? (isNew ? 'Save design' : 'Save changes') : 'Saved'}</button>
        <button className="btn ghost sm" onClick={() => exportPng(svgRef.current, `${(name || 'patchwork').replace(/[^\w-]+/g, '-').toLowerCase()}.png`).catch(() => toast('Export failed in this browser.'))}>Export PNG</button>
        <button className="btn ghost sm" onClick={() => navigate('/studio')}>All designs</button>
        {dirty && !isNew && <span className="muted small">Unsaved changes</span>}
      </Footer>
    </>
  );
}

function CompareSummary({ a, b, label }) {
  const ca = materialCounts(a);
  const cb = materialCounts(b);
  const keys = [...new Set([...Object.keys(ca), ...Object.keys(cb)])];
  const sameSpots = a.patches.length === b.patches.length ? a.patches.filter((p, i) => JSON.stringify(p) === JSON.stringify(b.patches[i])).length : 0;
  const colorsA = new Set(a.patches.map((p) => p.color)).size;
  const colorsB = new Set(b.patches.map((p) => p.color)).size;
  return (
    <table className="compare" style={{ marginTop: 14 }}>
      <thead><tr><th>Material</th><th>Current</th><th>{label}</th></tr></thead>
      <tbody>
        {keys.map((k) => <tr key={k}><td>{materialName(k)}</td><td>{ca[k] || 0}</td><td>{cb[k] || 0}</td></tr>)}
        <tr><td>Distinct colours</td><td>{colorsA}</td><td>{colorsB}</td></tr>
        <tr><td>Grid</td><td>{a.cols}×{a.rows}</td><td>{b.cols}×{b.rows}</td></tr>
        {a.patches.length === b.patches.length && <tr><td>Identical patches</td><td colSpan="2">{sameSpots} of {a.patches.length}</td></tr>}
      </tbody>
    </table>
  );
}

export function StudioCard() {
  return <Card title="Design studio" desc="Plan a 2D patchwork — materials, colours and layout." to="/studio" tone="sun" />;
}
