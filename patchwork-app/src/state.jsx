import { createContext, startTransition, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api } from './api.js';

// ---------- auth ----------
const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(undefined); // undefined = loading, null = signed out

  const refresh = useCallback(async () => {
    try { setUser((await api.get('/auth/me')).user); } catch { setUser(null); }
  }, []);
  useEffect(() => { refresh(); }, [refresh]);

  const logout = useCallback(async () => {
    await api.post('/auth/logout').catch(() => {});
    sessionStorage.removeItem('pw_journey');
    // Router navigations are transitions; clearing the user in a transition too means the
    // caller's navigate('/') and the sign-out commit together (no bounce to /login).
    startTransition(() => setUser(null));
  }, []);

  // Apply accessibility settings to the whole page.
  useEffect(() => {
    const s = user?.settings || {};
    const c = document.documentElement.classList;
    c.toggle('reduce-motion', !!s.reduceMotion);
    c.toggle('high-contrast', !!s.highContrast);
    c.toggle('text-large', s.textSize === 'large');
    c.toggle('text-larger', s.textSize === 'larger');
  }, [user]);

  return <AuthCtx.Provider value={{ user, setUser, refresh, logout }}>{children}</AuthCtx.Provider>;
}
export const useAuth = () => useContext(AuthCtx);

// ---------- toast ----------
const ToastCtx = createContext(() => {});
export function ToastProvider({ children }) {
  const [msg, setMsg] = useState(null);
  const timer = useRef();
  const show = useCallback((text) => {
    setMsg(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setMsg(null), 2800);
  }, []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {msg && <div className="toast" role="status" onClick={() => setMsg(null)}>{msg}</div>}
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

// ---------- Journey A selection (survives refresh within the tab) ----------
const JourneyCtx = createContext(null);
export function JourneyProvider({ children }) {
  const { user } = useAuth();
  const [state, setState] = useState(() => {
    try { return JSON.parse(sessionStorage.getItem('pw_journey')) || { selected: [] }; } catch { return { selected: [] }; }
  });
  // A selection belongs to one user: reset it when someone else signs in (or on logout).
  useEffect(() => {
    if (user === undefined) return;
    const owner = user?.id ?? null;
    setState((s) => (s.owner === owner ? s : { owner, selected: [] }));
  }, [user]);
  useEffect(() => { try { sessionStorage.setItem('pw_journey', JSON.stringify(state)); } catch { /* ignore */ } }, [state]);
  const toggle = (id) => setState((s) => ({ ...s, selected: s.selected.includes(id) ? s.selected.filter((x) => x !== id) : [...s.selected, id] }));
  const setSelected = (selected) => setState((s) => ({ ...s, selected }));
  return <JourneyCtx.Provider value={{ selected: state.selected, toggle, setSelected }}>{children}</JourneyCtx.Provider>;
}
export const useJourney = () => useContext(JourneyCtx);

// ---------- data loading ----------
export function useLoad(path, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  const load = useCallback(async () => {
    if (!path) return;
    setState((s) => ({ ...s, loading: true, error: null }));
    try { setState({ data: await api.get(path), error: null, loading: false }); }
    catch (e) { setState({ data: null, error: e, loading: false }); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps]);
  useEffect(() => { load(); }, [load]);
  return { ...state, reload: load, setData: (fn) => setState((s) => ({ ...s, data: typeof fn === 'function' ? fn(s.data) : fn })) };
}
