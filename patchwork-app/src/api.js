// Tiny fetch wrapper for the Patchwork API.
export class ApiError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}

// Static build (VITE_STATIC=1): no server — the API runs in the browser with localStorage.
export const IS_STATIC = !!import.meta.env.VITE_STATIC;
let localApi = null;

async function request(method, path, body) {
  if (IS_STATIC) {
    localApi ||= await import('./localApi.js');
    try { return await localApi.localRequest(method, path, body); }
    catch (e) { throw new ApiError(e.status || 500, e.message || 'Something went wrong.'); }
  }
  let res;
  try {
    res = await fetch(`/api${path}`, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, 'Could not reach Patchwork. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const fallback = res.status >= 500 ? 'The Patchwork server is not responding. Make sure it is running, then retry.' : 'Something went wrong.';
    throw new ApiError(res.status, data.error || fallback);
  }
  return data;
}

export const api = {
  get: (p) => request('GET', p),
  post: (p, b = {}) => request('POST', p, b),
  put: (p, b = {}) => request('PUT', p, b),
  patch: (p, b = {}) => request('PATCH', p, b),
  del: (p, b) => request('DELETE', p, b),
};

export const pkr = (n) => (n === 0 ? 'Rs 0' : `Rs ${Number(n).toLocaleString('en-PK')}`);
export const CATEGORY_LABELS = { home: 'Home', food: 'Food', tech: 'Tech', art: 'Art', repair: 'Repair', garden: 'Garden' };
