// SVG renderer for a 2D patchwork composition: fabric textures, selection, drag-to-swap and keyboard control.
import { useId, useRef, useState } from 'react';
import { MATERIALS } from '../../server/designs.js';

export const CELL = 100;
export const SEAM = 6;

// ---------- colour helpers ----------
export function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c) => Math.round(amt < 0 ? c * (1 + amt) : c + (255 - c) * amt);
  const r = mix(n >> 16), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
export const isDark = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) < 140;
};
export const materialName = (key) => MATERIALS.find((m) => m.key === key)?.name || key;

// ---------- fabric textures (SVG pattern contents, 20×20 tile) ----------
function Texture({ material, color }) {
  const dk = shade(color, -0.28);
  const lt = shade(color, 0.35);
  const base = <rect width="20" height="20" fill={color} />;
  switch (material) {
    case 'denim':
      return <>{base}{[-20, -10, 0, 10, 20].map((o) => <line key={o} x1={o} y1="20" x2={o + 20} y2="0" stroke={dk} strokeWidth="2.2" opacity=".45" />)}
        {[-15, -5, 5, 15].map((o) => <line key={o} x1={o} y1="20" x2={o + 20} y2="0" stroke={lt} strokeWidth=".8" opacity=".35" />)}</>;
    case 'linen':
      return <>{base}{[2, 7, 12, 17].map((v) => <g key={v}><line x1="0" y1={v} x2="20" y2={v} stroke={dk} strokeWidth=".7" opacity=".22" /><line x1={v} y1="0" x2={v} y2="20" stroke={lt} strokeWidth=".7" opacity=".3" /></g>)}</>;
    case 'corduroy':
      return <>{base}{[0, 5, 10, 15].map((x) => <g key={x}><rect x={x} width="2.5" height="20" fill={lt} opacity=".35" /><rect x={x + 3.5} width="1" height="20" fill={dk} opacity=".4" /></g>)}</>;
    case 'felt':
      return <>{base}{[[3, 4], [11, 2], [16, 9], [7, 12], [14, 16], [2, 17], [9, 7]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 0.9 : 0.6} fill={i % 3 ? dk : lt} opacity=".5" />)}</>;
    case 'gingham':
      return <><rect width="20" height="20" fill={lt} /><rect width="10" height="20" fill={color} opacity=".55" /><rect width="20" height="10" fill={color} opacity=".55" /><rect width="10" height="10" fill={color} /></>;
    case 'polka':
      return <>{base}<circle cx="5" cy="5" r="2.6" fill={isDark(color) ? '#fffdf7' : dk} opacity=".85" /><circle cx="15" cy="15" r="2.6" fill={isDark(color) ? '#fffdf7' : dk} opacity=".85" /></>;
    case 'floral': {
      const petal = isDark(color) ? '#fffdf7' : lt;
      const flower = (cx, cy, r) => <g>{[0, 72, 144, 216, 288].map((a) => <circle key={a} cx={cx + r * Math.cos((a * Math.PI) / 180)} cy={cy + r * Math.sin((a * Math.PI) / 180)} r={r * 0.75} fill={petal} opacity=".8" />)}<circle cx={cx} cy={cy} r={r * 0.6} fill={dk} /></g>;
      return <>{base}{flower(5, 6, 2.4)}{flower(15, 15, 2.4)}<circle cx="16" cy="4" r=".9" fill={dk} opacity=".5" /><circle cx="4" cy="16" r=".9" fill={dk} opacity=".5" /></>;
    }
    case 'stripes':
      return <>{base}<rect y="2" width="20" height="4" fill={isDark(color) ? lt : dk} opacity=".55" /><rect y="12" width="20" height="4" fill={isDark(color) ? lt : dk} opacity=".55" /></>;
    case 'cotton':
    default:
      return <>{base}<line x1="0" y1="20" x2="20" y2="0" stroke={dk} strokeWidth=".5" opacity=".12" /><line x1="-10" y1="20" x2="10" y2="0" stroke={dk} strokeWidth=".5" opacity=".08" /></>;
  }
}

export function patchLabel(p, i, cols) {
  const row = Math.floor(i / cols) + 1;
  const col = (i % cols) + 1;
  return `Row ${row}, column ${col}: ${materialName(p.material)} ${p.shape}, colour ${p.color}${p.rotation ? `, rotated ${p.rotation}°` : ''}`;
}

/** One patch drawn in a CELL×CELL box at the origin. */
function PatchShape({ p, fillId, background }) {
  const c = CELL / 2;
  const fill = `url(#${fillId})`;
  let shape;
  switch (p.shape) {
    case 'triangle':
      shape = <><rect width={CELL} height={CELL} fill={background} /><polygon points={`0,0 0,${CELL} ${CELL},${CELL}`} fill={fill} /></>;
      break;
    case 'circle':
      shape = <><rect width={CELL} height={CELL} fill={background} /><circle cx={c} cy={c} r={CELL * 0.38} fill={fill} /></>;
      break;
    case 'diamond':
      shape = <><rect width={CELL} height={CELL} fill={background} /><polygon points={`${c},4 ${CELL - 4},${c} ${c},${CELL - 4} 4,${c}`} fill={fill} /></>;
      break;
    default:
      shape = <rect width={CELL} height={CELL} fill={fill} />;
  }
  return <g transform={`rotate(${p.rotation} ${c} ${c})`}>{shape}</g>;
}

export function canvasSize(comp) {
  return { w: comp.cols * CELL + (comp.cols + 1) * SEAM, h: comp.rows * CELL + (comp.rows + 1) * SEAM };
}

/**
 * Props: composition, selected (Set of indexes), onSelect(i, additive), onSwap(from, to),
 * onMove(i, dx, dy), finished (show quilting stitches), interactive, title, svgRef
 */
export default function PatchCanvas({ composition: comp, selected = new Set(), onSelect, onSwap, onMove, finished = false, interactive = true, title = 'Patchwork design', svgRef, style }) {
  const uid = useId().replace(/:/g, '');
  const localRef = useRef(null);
  const ref = svgRef || localRef;
  // Drag data lives in a ref (always current, even for very fast taps); state only drives rendering.
  const dragRef = useRef(null); // { from, start, x, y, over, moved, additive }
  const [drag, setDragState] = useState(null);
  const setDrag = (d) => { dragRef.current = d; setDragState(d); };
  const { w, h } = canvasSize(comp);
  const pos = (i) => ({ x: SEAM + (i % comp.cols) * (CELL + SEAM), y: SEAM + Math.floor(i / comp.cols) * (CELL + SEAM) });

  function cellAt(clientX, clientY) {
    const r = ref.current.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * w;
    const y = ((clientY - r.top) / r.height) * h;
    const col = Math.floor((x - SEAM / 2) / (CELL + SEAM));
    const row = Math.floor((y - SEAM / 2) / (CELL + SEAM));
    if (col < 0 || row < 0 || col >= comp.cols || row >= comp.rows) return null;
    return row * comp.cols + col;
  }
  function svgPoint(e) {
    const r = ref.current.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * w, y: ((e.clientY - r.top) / r.height) * h };
  }

  const onPointerDown = (e, i) => {
    if (!interactive || e.button > 0) return;
    e.preventDefault();
    ref.current.setPointerCapture?.(e.pointerId);
    setDrag({ from: i, start: { x: e.clientX, y: e.clientY }, ...svgPoint(e), over: i, moved: false, additive: e.shiftKey || e.metaKey || e.ctrlKey });
  };
  const onPointerMove = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    const moved = drag.moved || Math.hypot(e.clientX - drag.start.x, e.clientY - drag.start.y) > 5;
    setDrag({ ...drag, ...svgPoint(e), over: cellAt(e.clientX, e.clientY), moved });
  };
  const onPointerUp = (e) => {
    const drag = dragRef.current;
    if (!drag) return;
    if (!drag.moved) onSelect?.(drag.from, drag.additive);
    else {
      const to = cellAt(e.clientX, e.clientY);
      if (to !== null && to !== drag.from) onSwap?.(drag.from, to);
    }
    setDrag(null);
  };

  const onKeyDown = (e, i) => {
    const dirs = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect?.(i, e.shiftKey); return; }
    const d = dirs[e.key];
    if (!d) return;
    e.preventDefault();
    const col = (i % comp.cols) + d[0];
    const row = Math.floor(i / comp.cols) + d[1];
    if (col < 0 || row < 0 || col >= comp.cols || row >= comp.rows) return;
    const target = row * comp.cols + col;
    if (e.shiftKey) onMove?.(i, d[0], d[1]); // move the patch itself
    // keep focus on the same patch after a move, otherwise follow the arrow
    const focusIndex = target;
    setTimeout(() => ref.current?.querySelector(`[data-cell="${focusIndex}"]`)?.focus(), 0);
  };

  return (
    <svg
      ref={ref} viewBox={`0 0 ${w} ${h}`} role={interactive ? 'group' : 'img'} aria-label={title}
      style={{ width: '100%', height: 'auto', display: 'block', touchAction: interactive ? 'none' : undefined, borderRadius: 12, userSelect: 'none', ...style }}
      onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={() => setDrag(null)}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {comp.patches.map((p, i) => (
          <pattern key={i} id={`${uid}-f${i}`} width="20" height="20" patternUnits="userSpaceOnUse">
            <Texture material={p.material} color={p.color} />
          </pattern>
        ))}
        {finished && (
          <filter id={`${uid}-shadow`} x="-5%" y="-5%" width="110%" height="110%">
            <feDropShadow dx="0" dy="3" stdDeviation="4" floodOpacity=".18" />
          </filter>
        )}
      </defs>
      <rect width={w} height={h} rx="12" fill={comp.seam} filter={finished ? `url(#${uid}-shadow)` : undefined} />
      {comp.patches.map((p, i) => {
        const { x, y } = pos(i);
        const isSel = selected.has(i);
        const isDragSrc = drag?.moved && drag.from === i;
        const isTarget = drag?.moved && drag.over === i && drag.from !== i;
        return (
          <g
            key={i} transform={`translate(${x} ${y})`} data-cell={i}
            tabIndex={interactive ? 0 : undefined} role={interactive ? 'button' : undefined}
            aria-pressed={interactive ? isSel : undefined} aria-label={patchLabel(p, i, comp.cols)}
            onPointerDown={(e) => onPointerDown(e, i)} onKeyDown={interactive ? (e) => onKeyDown(e, i) : undefined}
            style={{ cursor: interactive ? (drag?.moved ? 'grabbing' : 'pointer') : undefined, outline: 'none', opacity: isDragSrc ? 0.35 : 1 }}
            className="patch"
          >
            <PatchShape p={p} fillId={`${uid}-f${i}`} background={comp.background} />
            {finished && <rect x="7" y="7" width={CELL - 14} height={CELL - 14} fill="none" stroke={isDark(p.color) ? '#fffdf7' : shade(p.color, -0.45)} strokeWidth="1.4" strokeDasharray="5 4" opacity=".7" />}
            {isTarget && <rect x="2" y="2" width={CELL - 4} height={CELL - 4} fill="#fffdf7" opacity=".35" stroke="#496a56" strokeWidth="4" strokeDasharray="10 6" />}
            {isSel && <rect x="2" y="2" width={CELL - 4} height={CELL - 4} fill="none" stroke="#e3b059" strokeWidth="5" rx="3" />}
            {interactive && <rect className="patch-focus" x="1" y="1" width={CELL - 2} height={CELL - 2} fill="none" stroke="#252b27" strokeWidth="2" strokeDasharray="4 3" rx="3" />}
          </g>
        );
      })}
      {drag?.moved && (
        <g transform={`translate(${drag.x - CELL / 2} ${drag.y - CELL / 2})`} opacity=".85" style={{ pointerEvents: 'none' }}>
          <PatchShape p={comp.patches[drag.from]} fillId={`${uid}-f${drag.from}`} background={comp.background} />
          <rect width={CELL} height={CELL} fill="none" stroke="#496a56" strokeWidth="3" />
        </g>
      )}
      {finished && <rect x="1.5" y="1.5" width={w - 3} height={h - 3} rx="11" fill="none" stroke={shade(comp.seam, -0.35)} strokeWidth="3" />}
    </svg>
  );
}

/** Small swatch showing a material texture in a given colour. */
export function MaterialSwatch({ material, color, size = 44 }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true" style={{ display: 'block', borderRadius: 8 }}>
      <defs><pattern id={id} width="20" height="20" patternUnits="userSpaceOnUse"><Texture material={material} color={color} /></pattern></defs>
      <rect width="40" height="40" fill={`url(#${id})`} />
    </svg>
  );
}

/** Downloads the composition as a PNG (2× resolution). */
export async function exportPng(svgEl, filename) {
  const clone = svgEl.cloneNode(true);
  clone.querySelectorAll('.patch-focus').forEach((n) => n.remove());
  const vb = svgEl.viewBox.baseVal;
  clone.setAttribute('width', vb.width * 2);
  clone.setAttribute('height', vb.height * 2);
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  const url = URL.createObjectURL(new Blob([xml], { type: 'image/svg+xml' }));
  await new Promise((res, rej) => { img.onload = res; img.onerror = rej; img.src = url; });
  const canvas = Object.assign(document.createElement('canvas'), { width: vb.width * 2, height: vb.height * 2 });
  canvas.getContext('2d').drawImage(img, 0, 0);
  URL.revokeObjectURL(url);
  const a = Object.assign(document.createElement('a'), { href: canvas.toDataURL('image/png'), download: filename });
  document.body.appendChild(a); a.click(); a.remove();
}
