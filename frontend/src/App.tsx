import { useState, useEffect } from 'react';
import axios from 'axios';
import { Routes, Route, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Menu, Bell, ChevronRight, Settings, LogOut, User, ChevronDown } from 'lucide-react';
import { motion } from 'motion/react';

// ── Auth ─────────────────────────────────────────────────────────────────────
import Login from '../pages/Login';

// ── Sidebar Component ─────────────────────────────────────────────────────────
import Sidebar from '../components/Sidebar';

// ── Pages ─────────────────────────────────────────────────────────────────────
import Dashboard    from '../pages/Dashboard';
import TenantList   from '../pages/Tenants';
import TenantFormPage from '../pages/TenantFormPage';
import InvoiceList  from '../pages/Invoices';
import CompanyList  from '../pages/Companies';
import Reports      from '../pages/Reports';

// ── Page title map ────────────────────────────────────────────────────────────
const PAGE_TITLES: Record<string, string> = {
  '/':          'Overview',
  '/tenants':   'Tenants',
  '/invoices':  'Invoices',
  '/reports':   'Reports',
  '/companies': 'Companies',
  '/settings':  'Settings',
};

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth <= 1024);
  // ── Auth ──
  const getAuth = () => {
    try {
      const data = JSON.parse(localStorage.getItem('neoteric_auth') || 'null');
      // Set axios default auth header on app load
      if (data?.token) axios.defaults.headers.common['Authorization'] = `Bearer ${data.token}`;
      return data;
    } catch { return null; }
  };
  const [authUser, setAuthUser] = useState<{ name:string; role:string; initials:string; token?:string }|null>(getAuth);
  const [showUserMenu, setShowUserMenu] = useState(false);

  // ── Logout ──
  const handleLogout = () => {
    localStorage.removeItem('neoteric_auth');
    delete axios.defaults.headers.common['Authorization'];
    setAuthUser(null);
    setShowUserMenu(false);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!showUserMenu) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-user-menu]')) setShowUserMenu(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [showUserMenu]);
  const [dbStatus,    setDbStatus]    = useState<{ isDemo: boolean } | null>(null);
  const location = useLocation();

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 1024;
      setIsMobile(mobile);
      if (mobile) setSidebarOpen(false);
      else setSidebarOpen(true);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    fetch('/api/status').then(r => r.json()).then(setDbStatus).catch(() => setDbStatus({ isDemo: true }));
    if (isMobile) setSidebarOpen(false);
  }, [location.pathname]);

  const pageTitle = PAGE_TITLES[location.pathname]
    || (location.pathname.startsWith('/tenants') ? 'Tenants' : location.pathname.replace('/', '').replace(/-/g, ' ') || 'Overview');

  // ── Show Login if not authenticated ──
  if (!authUser) {
    return (
      <>
        <Toaster position="top-right" toastOptions={{ style: { fontFamily:'system-ui,sans-serif', fontSize:13, borderRadius:12 } }}/>
        <Login onLogin={user => {
          axios.defaults.headers.common['Authorization'] = `Bearer ${user.token}`;
          setAuthUser(user);
        }} />
      </>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#F5F7FA', overflow: 'hidden', flexDirection: 'column' }}>
      <Toaster position="top-right" toastOptions={{
        style: { fontFamily: 'system-ui,sans-serif', fontSize: 13, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }
      }}/>

      {/* ── Demo Banner ── */}
      {dbStatus?.isDemo && (
        <div style={{ background: '#fffbeb', borderBottom: '1px solid #fde68a', padding: '6px 20px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontSize: 11, color: '#92400e', fontWeight: 600, flexShrink: 0 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', animation: 'pulse 1.5s infinite' }}/>
          DEMO MODE — MongoDB not connected.
          <a href="https://cloud.mongodb.com" target="_blank" rel="noreferrer" style={{ color: '#b45309', textDecoration: 'underline' }}>Configure Atlas →</a>
        </div>
      )}

      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Sidebar ── */}
        <Sidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          isMobile={isMobile}
        />

        {/* ── Main ── */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

          {/* ── Topbar ── */}
          <header style={{
            height:       58,
            background:   '#ffffff',
            borderBottom: '1px solid #f0f2f5',
            display:      'flex',
            alignItems:   'center',
            justifyContent: 'space-between',
            padding:      '0 20px',
            flexShrink:   0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {/* Hamburger */}
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 7, borderRadius: 8, display: 'flex', color: '#9ba8b5', transition: 'background 0.15s' }}
                onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f5f7fa'}
                onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
              >
                <Menu size={19} />
              </button>

              {/* Breadcrumb */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                <span style={{ color: '#9ba8b5', fontWeight: 500 }}>Neoteric Properties</span>
                <ChevronRight size={13} color="#d1d5db" />
                <span style={{ color: '#1a1a2e', fontWeight: 700, textTransform: 'capitalize' }}>{pageTitle}</span>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
             
              

              {/* Bell */}
              <div style={{ position: 'relative' }}>
                <button style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #f0f2f5', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Bell size={16} color="#9ba8b5" />
                </button>
                <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, background: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }} />
              </div>

              {/* Avatar + Logout Dropdown */}
              <div data-user-menu style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowUserMenu(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '5px 10px 5px 5px', background: '#fff', border: '1.5px solid #f0f2f5', borderRadius: 10, cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => (e.currentTarget as HTMLElement).style.borderColor = '#f97316'}
                  onMouseLeave={e => (e.currentTarget as HTMLElement).style.borderColor = '#f0f2f5'}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', boxShadow: '0 2px 6px rgba(249,115,22,0.25)' }}>
                    {authUser.initials}
                  </div>
                  <div style={{ textAlign: 'left' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{authUser.name}</p>
                    <p style={{ fontSize: 9, color: '#9ba8b5', margin: 0 }}>{authUser.role}</p>
                  </div>
                  <ChevronDown size={13} color="#9ba8b5" style={{ transition: 'transform 0.2s', transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                </button>

                {/* Dropdown */}
                {showUserMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -8, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -8, scale: 0.95 }}
                    style={{ position: 'absolute', top: '110%', right: 0, background: '#fff', border: '1.5px solid #f0f2f5', borderRadius: 14, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', minWidth: 180, zIndex: 100, overflow: 'hidden' }}
                  >
                    {/* User info */}
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid #f8f9fb', background: '#fafbfc' }}>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{authUser.name}</p>
                      <p style={{ fontSize: 10, color: '#9ba8b5', margin: '2px 0 0' }}>{authUser.role}</p>
                    </div>

                    {/* Profile */}
                    <button
                      onClick={() => setShowUserMenu(false)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#5a6474', fontFamily: 'inherit', transition: 'background 0.1s', textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8f9fb'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                    >
                      <User size={14} color="#9ba8b5" /> My Profile
                    </button>

                    {/* Settings */}
                    <button
                      onClick={() => setShowUserMenu(false)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#5a6474', fontFamily: 'inherit', transition: 'background 0.1s', textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#f8f9fb'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                    >
                      <Settings size={14} color="#9ba8b5" /> Settings
                    </button>

                    {/* Divider */}
                    <div style={{ height: 1, background: '#f0f2f5', margin: '4px 0' }} />

                    {/* Logout */}
                    <button
                      onClick={handleLogout}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', marginBottom: 4, background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#ef4444', fontFamily: 'inherit', transition: 'background 0.1s', textAlign: 'left' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = '#fff1f2'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'none'}
                    >
                      <LogOut size={14} color="#ef4444" /> Logout
                    </button>
                  </motion.div>
                )}
              </div>
            </div>
          </header>

          {/* ── Content ── */}
          <main style={{ flex: 1, overflowY: 'auto', background: '#F5F7FA' }}>
            <Routes>
              <Route path="/"                 element={<Dashboard />} />
              <Route path="/companies"        element={<CompanyList />} />
              <Route path="/tenants"          element={<TenantList />} />
              <Route path="/tenants/create"   element={<TenantFormPage />} />
              <Route path="/tenants/edit/:id" element={<TenantFormPage />} />
              <Route path="/tenants/:id"      element={<TenantList />} />
              <Route path="/invoices"         element={<InvoiceList />} />
              <Route path="/reports"          element={<Reports />} />
              <Route path="*" element={
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '60vh', gap: 12, color: '#9ba8b5' }}>
                  <Settings size={40} strokeWidth={1} />
                  <p style={{ fontWeight: 600, fontSize: 14 }}>Page under construction</p>
                </div>
              } />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}
