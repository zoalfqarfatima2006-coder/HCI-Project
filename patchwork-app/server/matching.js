// Matching engine: compares an idea's materials with a user's resources.
// Pure JS with no Node imports, so the browser-only (static) build can reuse it.
const json = (s, fallback) => { if (typeof s !== 'string') return s ?? fallback; try { return JSON.parse(s); } catch { return fallback; } };

export function hydrateIdea(row) {
  if (!row) return null;
  return {
    ...row,
    materials: json(row.materials, []),
    steps: json(row.steps, []),
    substitutes: json(row.substitutes, []),
    tags: json(row.tags, []),
  };
}

function findResource(material, resources) {
  const byName = resources.find((r) => material.keywords.some((k) => r.name.toLowerCase().includes(k)));
  if (byName) return byName;
  if (material.category === 'Custom') return null;
  return resources.find((r) => r.category === material.category) || null;
}

/** Returns per-material availability, a 0..1 score and the PKR cost of what is missing. */
export function matchIdea(idea, resources) {
  const materials = idea.materials.map((mat) => {
    const res = findResource(mat, resources);
    let status = 'missing';
    if (res) status = res.quantity >= mat.qty ? 'have' : 'partial';
    return {
      ...mat,
      status,
      resource: res ? { id: res.id, name: res.name, quantity: res.quantity, unit: res.unit, condition: res.condition } : null,
    };
  });
  const required = materials.filter((x) => !x.optional);
  const haveCount = required.filter((x) => x.status !== 'missing').length;
  const missing = materials.filter((x) => x.status === 'missing' && !x.optional);
  // A missing material with a free substitute (e.g. interlocking tabs instead of glue) adds no cost.
  const subsFor = new Set(idea.substitutes.filter((s) => s.free).map((s) => s.for));
  const missingCost = missing.reduce((sum, x) => sum + (subsFor.has(x.key) ? 0 : x.buyCost), 0);
  return {
    materials,
    haveCount,
    requiredCount: required.length,
    score: required.length ? haveCount / required.length : 1,
    missingCost,
    usedResourceIds: [...new Set(materials.filter((x) => x.resource && x.status !== 'missing').map((x) => x.resource.id))],
  };
}

const DIFF_RANK = { Easy: 1, Medium: 2, Hard: 3 };

/** Journey A: ideas that use the selected resources and fit the preferences. */
export function discover(ideas, resources, { selectedIds = [], time = 'any', budget = 'any', difficulty = 'any', type = 'any' } = {}) {
  const selected = new Set(selectedIds.map(Number));
  return ideas
    .map((idea) => ({ idea, match: matchIdea(idea, resources) }))
    .filter(({ idea, match }) => {
      if (selected.size && !match.usedResourceIds.some((id) => selected.has(id))) return false;
      if (match.haveCount === 0) return false;
      if (time !== 'any' && idea.minutes > Number(time)) return false;
      if (budget !== 'any' && match.missingCost > Number(budget)) return false;
      if (difficulty !== 'any' && DIFF_RANK[idea.difficulty] > DIFF_RANK[difficulty]) return false;
      if (type !== 'any' && idea.category !== type) return false;
      return true;
    })
    .sort((a, b) => b.match.score - a.match.score || a.match.missingCost - b.match.missingCost || a.idea.minutes - b.idea.minutes);
}

/** Journey B: ideas whose tags fit the goal text, ranked by goal fit then material match. */
export function matchGoal(ideas, resources, text) {
  const t = ` ${text.toLowerCase().replace(/[^a-z\s]/g, ' ')} `;
  return ideas
    .map((idea) => {
      const tagHits = idea.tags.filter((tag) => t.includes(` ${tag}`)).length;
      // Words from the idea's own title count extra ("desk" -> Desk organiser).
      const titleHits = idea.title.toLowerCase().split(/\s+/).filter((w) => w.length > 3 && t.includes(` ${w.replace(/s$/, '')}`)).length;
      const hits = tagHits ? tagHits + titleHits : 0;
      return { idea, goalScore: hits, match: matchIdea(idea, resources) };
    })
    .filter((x) => x.goalScore > 0)
    .sort((a, b) => b.goalScore - a.goalScore || b.match.score - a.match.score || a.match.missingCost - b.match.missingCost);
}
