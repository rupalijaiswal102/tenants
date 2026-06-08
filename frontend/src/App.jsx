import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Menu, Bell, ChevronRight, Settings, LogOut, User, ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// ── Sidebar Component ─────────────────────────────────────────────────────────
import Sidebar from '../components/Sidebar.jsx';

// ── Pages ─────────────────────────────────────────────────────────────────────
import Dashboard    from '../pages/Dashboard.jsx';
import TenantList   from '../pages/Tenants.jsx';
import TenantFormPage from '../pages/TenantFormPage.jsx';
import InvoiceList  from '../pages/Invoices.jsx';
import CompanyList  from '../pages/Companies.jsx';
import Reports      from '../pages/Reports.jsx';

// ── Page title map ────────────────────────────────────────────────────────────
const PAGE_TITLES = {
  '/':               'Overview',
  '/tenants':        'Tenants',
  '/other-parties':  'Other Parties',
  '/invoices':       'Invoices',
  '/reports':        'Reports',
  '/companies':      'Companies',
  '/settings':       'Settings',
};

export default function App({ onLogout }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth <= 768);
  const [dbStatus,    setDbStatus]    = useState(null);
  const [userMenuOpen,setUserMenuOpen]= useState(false);
  const userMenuRef = useRef(null);
  const location  = useLocation();
  const navigate  = useNavigate();

  // ── Read user from localStorage ──────────────────────────────────────────
  const authData = JSON.parse(localStorage.getItem('neoteric_auth') || 'null');
  const user = authData || { name: 'Admin', role: 'Super Admin', initials: 'AD' };

  // ── Logout ────────────────────────────────────────────────────────────────
  const handleLogout = () => {
    localStorage.removeItem('neoteric_auth');
    setUserMenuOpen(false);
    if (onLogout) onLogout();
    else window.location.href = '/';
  };

  // ── Close user menu on outside click ─────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    const onResize = () => {
      const mobile = window.innerWidth <= 768;
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
    || (location.pathname.startsWith('/tenants')       ? 'Tenants'
    :   location.pathname.startsWith('/other-parties') ? 'Other Parties'
    :   location.pathname.replace('/', '').replace(/-/g, ' ') || 'Overview');

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
                onMouseEnter={e => (e.currentTarget).style.background = '#f5f7fa'}
                onMouseLeave={e => (e.currentTarget).style.background = 'none'}
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
              {/* Team avatars */}
              
              

              {/* Bell */}
              <div style={{ position: 'relative' }}>
                <button style={{ width: 34, height: 34, borderRadius: 9, border: '1px solid #f0f2f5', background: '#fafafa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  <Bell size={16} color="#9ba8b5" />
                </button>
                <div style={{ position: 'absolute', top: 7, right: 7, width: 7, height: 7, background: '#ef4444', borderRadius: '50%', border: '2px solid #fff' }} />
              </div>

              {/* User Avatar + Dropdown */}
              <div ref={userMenuRef} style={{ position: 'relative' }}>
                <button
                  onClick={() => setUserMenuOpen(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 10px 4px 4px', borderRadius: 10, border: '1px solid #f0f2f5', background: userMenuOpen ? '#f8fafc' : '#fff', cursor: 'pointer', transition: 'all 0.15s' }}
                  onMouseEnter={e => (e.currentTarget).style.background = '#f8fafc'}
                  onMouseLeave={e => { if (!userMenuOpen) (e.currentTarget).style.background = '#fff'; }}
                >
                  <div style={{ width: 30, height: 30, borderRadius: 8, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: '#fff', boxShadow: '0 2px 6px rgba(249,115,22,0.25)' }}>
                    {user.initials || 'AD'}
                  </div>
                  <div style={{ display: isMobile ? 'none' : 'block', textAlign: 'left' }}>
                    <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', margin: 0, lineHeight: 1.2 }}>{user.name || 'Admin'}</p>
                    <p style={{ fontSize: 10, color: '#94a3b8', margin: 0 }}>{user.role || 'Super Admin'}</p>
                  </div>
                  <ChevronDown size={13} color="#94a3b8" style={{ transform: userMenuOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
                </button>

                {/* Dropdown Menu */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.94, y: -6 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.94, y: -6 }}
                      transition={{ duration: 0.12 }}
                      style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, background: '#fff', borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', border: '1px solid #f0f2f5', minWidth: 180, zIndex: 100, overflow: 'hidden' }}
                    >
                      {/* User info header */}
                      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f8fafc' }}>
                        <p style={{ fontSize: 12, fontWeight: 700, color: '#1a1a2e', margin: 0 }}>{user.name || 'Admin'}</p>
                        <p style={{ fontSize: 10, color: '#94a3b8', margin: '2px 0 0' }}>{user.role || 'Super Admin'}</p>
                      </div>

                      {/* Profile option */}
                      <button
                        onClick={() => { setUserMenuOpen(false); navigate('/settings'); }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget).style.background = '#f8fafc'}
                        onMouseLeave={e => (e.currentTarget).style.background = 'none'}
                      >
                        <User size={14} color="#94a3b8" /> Profile Settings
                      </button>

                      {/* Divider */}
                      <div style={{ height: 1, background: '#f8fafc', margin: '2px 0' }} />

                      {/* Logout */}
                      <button
                        onClick={handleLogout}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 16px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, color: '#ef4444', transition: 'background 0.1s' }}
                        onMouseEnter={e => (e.currentTarget).style.background = '#fff1f2'}
                        onMouseLeave={e => (e.currentTarget).style.background = 'none'}
                      >
                        <LogOut size={14} color="#ef4444" /> Logout
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
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
              {/* ── Other Parties — reuse same components with mode prop ── */}
              <Route path="/other-parties"            element={<TenantList mode="otherParty" />} />
              <Route path="/other-parties/create"     element={<TenantFormPage mode="otherParty" />} />
              <Route path="/other-parties/edit/:id"   element={<TenantFormPage mode="otherParty" />} />
              <Route path="/other-parties/:id"        element={<TenantList mode="otherParty" />} />
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