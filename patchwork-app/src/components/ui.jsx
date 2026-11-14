import { Link, useNavigate } from 'react-router-dom';
import { CATEGORY_LABELS, pkr } from '../api.js';

export function PageHeader({ eyebrow = 'Patchwork / Workspace', title, sub, progress }) {
  return (
    <>
      <p className="eyebrow">{eyebrow}</p>
      <h1 className="page-title">{title}</h1>
      {sub && <p className="page-sub">{sub}</p>}
      {progress !== undefined && (
        <div className="progress" role="progressbar" aria-valuenow={progress} aria-valuemin="0" aria-valuemax="100">
          <span style={{ width: `${progress}%` }} />
        </div>
      )}
    </>
  );
}

export function Card({ title, desc, to, onClick, selected, selectable, tone, children, ...rest }) {
  const cls = `card${selected ? ' selected' : ''}${tone ? ` ${tone}` : ''}`;
  const body = (
    <>
      {selectable && <span className="check" aria-hidden="true" />}
      <p className="card-title">{title}</p>
      {desc && <p className="card-desc">{desc}</p>}
      {children}
    </>
  );
  if (to) return <Link className={cls} to={to} {...rest}>{body}</Link>;
  if (onClick) return <button type="button" className={cls} onClick={onClick} aria-pressed={selectable ? !!selected : undefined} {...rest}>{body}</button>;
  return <div className={cls} {...rest}>{body}</div>;
}

export function IdeaCard({ idea, to, onClick, selected, selectable, extra }) {
  return (
    <Card
      to={to} onClick={onClick} selected={selected} selectable={selectable}
      title={`${idea.title} · ${idea.minutes} min · ${pkr(idea.missingCost ?? 0)}`}
      desc={idea.summary}
    >
      <div className="card-meta">
        <span className="tag">{idea.difficulty}</span>
        <span className="tag">{CATEGORY_LABELS[idea.category]}</span>
        {idea.requiredCount !== undefined && (
          <span className={`tag ${idea.haveCount === idea.requiredCount ? '' : 'warn'}`}>
            You have {idea.haveCount} of {idea.requiredCount}
          </span>
        )}
        {idea.saved && <span className="tag">Saved</span>}
        {extra}
      </div>
    </Card>
  );
}

export function Chip({ pressed, onClick, children, size = '' }) {
  return <button type="button" className={`chip ${size}`} aria-pressed={!!pressed} onClick={onClick}>{children}</button>;
}

export function Footer({ children }) {
  return (
    <div className="page-footer">
      {children && <div className="btn-row">{children}</div>}
      <div className="footnote">All costs in PKR · No paid features</div>
    </div>
  );
}

export function StatePanel({ kind, title, text, action }) {
  const icon = kind === 'loading' ? <span className="dots" aria-hidden="true"><i /><i /><i /></span> : kind === 'error' ? '!' : '+';
  return (
    <div className="state" role={kind === 'error' ? 'alert' : 'status'}>
      <div className="state-art"><div className="state-dot">{icon}</div></div>
      <h2 className="state-title">{title}</h2>
      <p className="state-text">{text}</p>
      {action}
    </div>
  );
}

/** Standard loading / error wrapper for a useLoad() result. */
export function Loader({ load, children, loadingTitle = 'Loading…', loadingText = 'Fetching your workspace.' }) {
  const navigate = useNavigate();
  if (load.loading && !load.data) {
    return <StatePanel kind="loading" title={loadingTitle} text={loadingText}
      action={<button className="btn" onClick={() => navigate('/home')}>Back to dashboard</button>} />;
  }
  if (load.error) {
    return <StatePanel kind="error" title="Let's try that again" text={`${load.error.message} Your work is safe.`}
      action={<button className="btn" onClick={load.reload}>Retry</button>} />;
  }
  return children(load.data);
}

export function ErrorBox({ error }) {
  if (!error) return null;
  return <div className="error-box" role="alert">{typeof error === 'string' ? error : error.message}</div>;
}

export function Field({ label, id, hint, ...props }) {
  return (
    <>
      <label className="label" htmlFor={id}>{label}</label>
      <input className="input" id={id} {...props} />
      {hint && <p className="hint">{hint}</p>}
    </>
  );
}

export function Modal({ title, children, onClose }) {
  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h2>{title}</h2>
        {children}
      </div>
    </div>
  );
}

export function MaterialList({ materials, substitutes = [], chosenSubs = [] }) {
  return (
    <div className="mat-list">
      {materials.map((m) => {
        const sub = substitutes.find((s) => s.for === m.key);
        const usingSub = sub && chosenSubs.includes(m.key);
        return (
          <div className="mat" key={m.key}>
            <span>
              <strong>{m.name}</strong> <span className="muted">· {m.qty} {m.unit}{m.optional ? ' · optional' : ''}</span>
              {m.resource && <span className="muted small"> — from your “{m.resource.name}” ({m.resource.quantity} {m.resource.unit})</span>}
              {usingSub && <span className="muted small"> — using {sub.use.toLowerCase()}</span>}
            </span>
            {m.status === 'have' && <span className="tag">Available</span>}
            {m.status === 'partial' && <span className="tag warn">Not enough</span>}
            {m.status === 'missing' && (usingSub ? <span className="tag">Substituted</span> : <span className={`tag ${m.optional ? 'warn' : 'miss'}`}>{m.optional ? 'Optional' : `Missing · ~${pkr(m.buyCost)}`}</span>)}
          </div>
        );
      })}
    </div>
  );
}
