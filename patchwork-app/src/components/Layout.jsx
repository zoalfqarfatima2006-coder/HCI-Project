import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../state.jsx';

const NAV = [
  ['/home', 'Home'],
  ['/resources', 'My resources'],
  ['/saved', 'Saved ideas'],
  ['/projects', 'My projects'],
  ['/inspiration', 'Inspiration'],
  ['/settings', 'Settings'],
];

function UserMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const ref = useRef();
  useEffect(() => {
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  if (!user) return <Link className="user-btn" to="/login" style={{ textDecoration: 'none' }}>Log in</Link>;
  const first = user.name.split(' ')[0];
  return (
    <div className="user-menu" ref={ref}>
      <button className="user-btn" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        <span>{first[0].toUpperCase()}</span> {first} <span className="caret">▼</span>
      </button>
      {open && (
        <div className="menu" role="menu" onClick={() => setOpen(false)}>
          <div className="menu-head">{user.email}</div>
          <Link role="menuitem" to="/settings/profile">Profile</Link>
          <Link role="menuitem" to="/impact">Personal impact</Link>
          <Link role="menuitem" to="/settings">Settings</Link>
          <button role="menuitem" onClick={() => { navigate('/'); logout(); }}>Log out</button>
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const isLanding = pathname === '/';

  useEffect(() => { document.querySelector('.main')?.scrollTo?.(0, 0); window.scrollTo(0, 0); }, [pathname]);

  return (
    <div className="shell">
      <header className="topbar">
        <Link className="logo" to={user ? '/home' : '/'}>patchwork</Link>
        <span className="tagline">Make useful things from what you have</span>
        <div className="topbar-actions">
          {!isLanding && (
            <button className="back-btn" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(user ? '/home' : '/'))}>
              <span aria-hidden="true">←</span> Back
            </button>
          )}
          <UserMenu />
        </div>
      </header>
      <nav className="sidebar" aria-label="Main">
        {NAV.map(([to, label]) => (
          <NavLink key={to} to={to} className="nav-link">{label}</NavLink>
        ))}
      </nav>
      <main className="main" id="main">
        <div className="page"><Outlet /></div>
      </main>
    </div>
  );
}
