import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import {
  Plus, Edit2, Trash2, X, Eye, EyeOff,
  CheckCircle2, XCircle, Search, Loader2, Key, Shield,
  Users, CheckCircle, UserX, Layers, UserCog, Lock
} from 'lucide-react';
import RightPanel, { PanelGrid, PanelField, PanelDivider } from '../components/RightPanel.jsx';
import { ActionButtons } from '../src/components/ui/ActionButtons.jsx';

// ── Shared input style ────────────────────────────────────────────────────────
const inp = {
  width:'100%', height:42, padding:'0 14px',
  background:'#fff', border:'2px solid #f0f2f5', borderRadius:10,
  fontSize:13, color:'#1a1a2e', outline:'none', fontFamily:'inherit',
  transition:'border 0.15s',
};

const MODULES = [
  { key: 'tenants',      label: 'Tenants',       actions: ['view','add','edit','delete'] },
  { key: 'otherParties', label: 'Other Parties',  actions: ['view','add','edit','delete'] },
  { key: 'invoices',     label: 'Invoices',       actions: ['view','add','edit','delete','payment','approve'] },
  { key: 'companies',    label: 'Companies',      actions: ['view','add','edit','delete'] },
  { key: 'users',        label: 'Users',          actions: ['view','add','edit','delete'] },
  { key: 'reports',      label: 'Reports',        actions: ['view','add','edit','delete'] },
  { key: 'ledger',       label: 'Ledger',         actions: ['view','adjustment'] },
];
const STD_ACTIONS = ['view','add','edit','delete'];

const ACTION_LABELS = { view:'View', add:'Add', edit:'Edit', delete:'Delete', payment:'Payment', approve:'Approve', adjustment:'Adjust' };

const DEFAULT_PERMISSIONS = {
  tenants:      { view: true,  add: true,  edit: true,  delete: false },
  otherParties: { view: true,  add: true,  edit: true,  delete: false },
  invoices:     { view: true,  add: true,  edit: true,  delete: false, payment: false, approve: false },
  companies:    { view: true,  add: false, edit: false, delete: false },
  users:        { view: false, add: false, edit: false, delete: false },
  reports:      { view: true,  add: false, edit: false, delete: false },
  ledger:       { view: true,  adjustment: false },
};

const ROLES_DEFAULT = [
  { value:'Super Admin', label:'Super Admin', color:'#ef4444', bg:'#fff1f2', description:'Full system access' },
  { value:'Admin',       label:'Admin',       color:'#f97316', bg:'#fff7ed', description:'All modules access' },
  { value:'MDO',         label:'MDO',         color:'#6366f1', bg:'#eef2ff', description:'Invoice & payment tracking' },
  { value:'Accounts',    label:'Accounts',    color:'#10b981', bg:'#f0fdf4', description:'Approve & tally entry' },
  { value:'CRM',         label:'CRM',         color:'#0ea5e9', bg:'#eff6ff', description:'Hard copy dispatch' },
  { value:'Viewer',      label:'Viewer',      color:'#94a3b8', bg:'#f8fafc', description:'Read-only access' },
];

function RoleBadge({ role }) {
  const r = ROLES_DEFAULT.find(x => x.value === role) || { color:'#94a3b8', bg:'#f8fafc', label: role };
  return (
    <span style={{ fontSize:11, fontWeight:700, padding:'3px 10px', borderRadius:20, background:r.bg, color:r.color }}>
      {r.label}
    </span>
  );
}

// ── Add / Edit Panel ──────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSuccess }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name:        user?.name       || '',
    email:       user?.email      || '',
    password:    '',
    role:        user?.role       || 'MDO',
    phone:       user?.phone      || '',
    department:  user?.department || '',
    isActive:    user?.isActive   ?? true,
    permissions: (() => {
      if (!user?.permissions) return DEFAULT_PERMISSIONS;
      const p = JSON.parse(JSON.stringify(user.permissions));
      return {
        ...DEFAULT_PERMISSIONS,
        ...p,
        invoices: { ...DEFAULT_PERMISSIONS.invoices, ...(p.invoices || {}) },
        ledger:   { ...DEFAULT_PERMISSIONS.ledger,   ...(p.ledger   || {}) },
      };
    })(),
  });
  const [showPass, setShowPass] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim())  return toast.error('Name required');
    if (!form.email.trim()) return toast.error('Email required');
    if (!isEdit && form.password.length < 6) return toast.error('Password min 6 characters');
    try {
      setSaving(true);
      const payload = { ...form };
      if (isEdit && !payload.password) delete payload.password;
      if (isEdit) await axios.put(`/api/users/${user.id || user._id}`, payload);
      else        await axios.post('/api/users', payload);
      toast.success(isEdit ? `${form.name} updated!` : `${form.name} created!`);
      onSuccess(); onClose();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Failed to save user');
    } finally { setSaving(false); }
  };

  const selectedRole = ROLES_DEFAULT.find(r => r.value === form.role);

  return (
    <RightPanel
      isOpen
      onClose={onClose}
      title={isEdit ? 'Edit User' : 'Add New User'}
      subtitle={isEdit ? `Update details for ${user.name}` : 'Create a new team member account'}
      badge={isEdit ? form.role : undefined}
      icon={<UserCog size={20}/>}
      iconBg="#fff7ed"
      iconColor="#f97316"
      width="680px"
      submitLabel={saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create User')}
      onSubmit={handleSubmit}
      submitLoading={saving}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:18 }}>

        <PanelDivider label="Basic Information"/>

        {/* Name + Email */}
        <PanelGrid cols={2}>
          <PanelField label="Full Name" required>
            <input value={form.name} onChange={e => set('name', e.target.value)}
              style={inp} placeholder="e.g. Simran Singh"
              onFocus={e => e.target.style.borderColor='#f97316'}
              onBlur={e => e.target.style.borderColor='#f0f2f5'}/>
          </PanelField>
          <PanelField label="Email Address" required>
            <input value={form.email} onChange={e => set('email', e.target.value)}
              type="email" style={inp} placeholder="user@neoteric.in"
              onFocus={e => e.target.style.borderColor='#f97316'}
              onBlur={e => e.target.style.borderColor='#f0f2f5'}/>
          </PanelField>
        </PanelGrid>

        {/* Password */}
        <PanelField label={isEdit ? 'New Password (blank = keep existing)' : 'Password'} required={!isEdit}>
          <div style={{ position:'relative' }}>
            <input value={form.password} onChange={e => set('password', e.target.value)}
              type={showPass ? 'text' : 'password'}
              style={{ ...inp, paddingRight:44 }} placeholder="Min 6 characters"
              onFocus={e => e.target.style.borderColor='#f97316'}
              onBlur={e => e.target.style.borderColor='#f0f2f5'}/>
            <button onClick={() => setShowPass(v => !v)} type="button"
              style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ba8b5' }}>
              {showPass ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
        </PanelField>

        {/* Phone + Department */}
        <PanelGrid cols={2}>
          <PanelField label="Phone">
            <input value={form.phone} onChange={e => set('phone', e.target.value)}
              style={inp} placeholder="+91 98765 43210"
              onFocus={e => e.target.style.borderColor='#f97316'}
              onBlur={e => e.target.style.borderColor='#f0f2f5'}/>
          </PanelField>
          <PanelField label="Department">
            <input value={form.department} onChange={e => set('department', e.target.value)}
              style={inp} placeholder="e.g. Accounts"
              onFocus={e => e.target.style.borderColor='#f97316'}
              onBlur={e => e.target.style.borderColor='#f0f2f5'}/>
          </PanelField>
        </PanelGrid>

        {/* Active toggle (edit only) */}
        {isEdit && (
          <PanelField label="Account Status">
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div onClick={() => set('isActive', !form.isActive)}
                style={{ width:44, height:24, borderRadius:12, background: form.isActive?'#f97316':'#e2e8f0', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:2, left: form.isActive?20:2, width:20, height:20, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 0.2s' }}/>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color: form.isActive ? '#10b981' : '#ef4444' }}>
                {form.isActive ? 'Active Account' : 'Inactive Account'}
              </span>
            </div>
          </PanelField>
        )}

        <PanelDivider label="Role & Access"/>

        {/* Role selector */}
        <PanelField label="Select Role" required>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
            {ROLES_DEFAULT.map(r => (
              <button key={r.value} type="button" onClick={() => set('role', r.value)}
                style={{ padding:'10px 12px', borderRadius:12, border:`2px solid ${form.role===r.value ? r.color : '#f0f2f5'}`, background: form.role===r.value ? r.bg : '#fff', cursor:'pointer', textAlign:'left', transition:'all 0.15s' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3 }}>
                  <span style={{ width:8, height:8, borderRadius:'50%', background:r.color, flexShrink:0 }}/>
                  <span style={{ fontSize:12, fontWeight:800, color: form.role===r.value ? r.color : '#1a1a2e' }}>{r.label}</span>
                </div>
                <p style={{ fontSize:10, color:'#9ba8b5', margin:0, lineHeight:1.4 }}>{r.description}</p>
              </button>
            ))}
          </div>
        </PanelField>

        {/* Permission Matrix — hidden for Super Admin */}
        {form.role !== 'Super Admin' && (
          <>
            <PanelDivider label="Module Permissions"/>
            <div>
              <div style={{ display:'flex', justifyContent:'flex-end', gap:6, marginBottom:8 }}>
                <button type="button" onClick={() => set('permissions', Object.fromEntries(MODULES.map(m => [m.key, Object.fromEntries(m.actions.map(a => [a, true]))])))}
                  style={{ fontSize:10, fontWeight:700, padding:'4px 12px', borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', cursor:'pointer', fontFamily:'inherit' }}>
                  Select All
                </button>
                <button type="button" onClick={() => set('permissions', Object.fromEntries(MODULES.map(m => [m.key, Object.fromEntries(m.actions.map(a => [a, false]))])))}
                  style={{ fontSize:10, fontWeight:700, padding:'4px 12px', borderRadius:7, border:'1px solid #e2e8f0', background:'#f8fafc', color:'#64748b', cursor:'pointer', fontFamily:'inherit' }}>
                  Clear All
                </button>
              </div>
              <div style={{ border:'1.5px solid #f0f2f5', borderRadius:12, overflow:'hidden' }}>
                <div style={{ display:'grid', gridTemplateColumns:'140px repeat(6, 1fr)', background:'#f8fafc', borderBottom:'1px solid #f0f2f5', padding:'9px 14px', gap:4 }}>
                  <span style={{ fontSize:9, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em' }}>Module</span>
                  {['View','Add','Edit','Delete','Payment','Approve / Adjust'].map(a => (
                    <span key={a} style={{ fontSize:9, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.06em', textAlign:'center', lineHeight:1.3 }}>{a}</span>
                  ))}
                </div>
                {MODULES.map((mod, mi) => {
                  const defEmpty = Object.fromEntries(mod.actions.map(a => [a, false]));
                  const p = form.permissions?.[mod.key] || defEmpty;
                  const allOn = mod.actions.every(a => p[a]);
                  const colActions = ['view','add','edit','delete',
                    mod.key === 'invoices' ? 'payment'    : null,
                    mod.key === 'invoices' ? 'approve'    : mod.key === 'ledger' ? 'adjustment' : null,
                  ];
                  return (
                    <div key={mod.key} style={{ display:'grid', gridTemplateColumns:'140px repeat(6, 1fr)', padding:'10px 14px', gap:4, borderBottom: mi < MODULES.length-1 ? '1px solid #f8f9fb' : 'none', alignItems:'center', background: mi % 2 === 0 ? '#fff' : '#fafbfc' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div onClick={() => {
                          const newVal = !allOn;
                          set('permissions', { ...form.permissions, [mod.key]: Object.fromEntries(mod.actions.map(a => [a, newVal])) });
                        }} style={{ width:28, height:16, borderRadius:8, background: allOn ? '#f97316' : '#e2e8f0', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
                          <div style={{ position:'absolute', top:2, left: allOn ? 12 : 2, width:12, height:12, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 2px rgba(0,0,0,0.15)', transition:'left 0.2s' }}/>
                        </div>
                        <span style={{ fontSize:12, fontWeight:700, color:'#1a1a2e' }}>{mod.label}</span>
                      </div>
                      {colActions.map((action, ci) => (
                        <div key={ci} style={{ display:'flex', justifyContent:'center' }}>
                          {action && mod.actions.includes(action) ? (
                            <div onClick={() => set('permissions', { ...form.permissions, [mod.key]: { ...p, [action]: !p[action] } })}
                              style={{ width:18, height:18, borderRadius:5, border:`2px solid ${p[action] ? '#f97316' : '#d1d5db'}`, background: p[action] ? '#f97316' : '#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', transition:'all 0.15s', flexShrink:0 }}>
                              {p[action] && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l3 3 5-6" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                            </div>
                          ) : (
                            <span style={{ width:18, height:18, display:'block', background:'#f1f5f9', borderRadius:5 }}/>
                          )}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize:10, color:'#94a3b8', marginTop:6 }}>Toggle row to set all permissions at once. Super Admin always has full access.</p>
            </div>
          </>
        )}

      </div>
    </RightPanel>
  );
}

// ── Reset Password Panel ──────────────────────────────────────────────────────
function ResetPassModal({ user, onClose }) {
  const [pass, setPass]     = useState('');
  const [show, setShow]     = useState(false);
  const [saving, setSaving] = useState(false);

  const handleReset = async () => {
    if (pass.length < 6) return toast.error('Min 6 characters');
    try {
      setSaving(true);
      await axios.post(`/api/users/${user.id || user._id}/reset-password`, { newPassword: pass });
      toast.success(`Password reset for ${user.name}`);
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
    finally { setSaving(false); }
  };

  return (
    <RightPanel
      isOpen
      onClose={onClose}
      title="Reset Password"
      subtitle={`Set a new password for ${user.name}`}
      badge={user.role}
      icon={<Lock size={20}/>}
      iconBg="#eff6ff"
      iconColor="#3b82f6"
      width="420px"
      submitLabel={saving ? 'Resetting…' : 'Reset Password'}
      onSubmit={handleReset}
      submitLoading={saving}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* User info card */}
        <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', background:'#f8f9fb', borderRadius:12, border:'1px solid #f0f2f5' }}>
          <div style={{ width:44, height:44, borderRadius:12, background: (ROLES_DEFAULT.find(r=>r.value===user.role)?.color || '#94a3b8'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#fff', flexShrink:0 }}>
            {user.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>{user.name}</p>
            <p style={{ fontSize:11, color:'#9ba8b5', margin:'2px 0 0' }}>{user.email}</p>
          </div>
        </div>

        <PanelField label="New Password" required>
          <div style={{ position:'relative' }}>
            <input value={pass} onChange={e => setPass(e.target.value)} type={show?'text':'password'}
              style={{ ...inp, paddingRight:44 }} placeholder="Min 6 characters"
              onFocus={e => e.target.style.borderColor='#3b82f6'}
              onBlur={e => e.target.style.borderColor='#f0f2f5'}/>
            <button onClick={() => setShow(v=>!v)} type="button"
              style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ba8b5' }}>
              {show ? <EyeOff size={16}/> : <Eye size={16}/>}
            </button>
          </div>
        </PanelField>

        <p style={{ fontSize:11, color:'#9ba8b5', margin:0, padding:'10px 12px', background:'#fffbeb', borderRadius:8, border:'1px solid #fde68a' }}>
          ⚠️ User will need to log in again after password reset.
        </p>
      </div>
    </RightPanel>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function UsersPage() {
  const [users,     setUsers]     = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [modal,     setModal]     = useState(null);   // null | 'add' | user obj
  const [resetting, setResetting] = useState(null);

  const authData = JSON.parse(localStorage.getItem('neoteric_auth') || 'null');
  const isAdmin  = ['Super Admin','Admin'].includes(authData?.role);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const { data } = await axios.get('/api/users');
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      toast.error('Failed to load users');
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleDeactivate = async (u) => {
    if (!confirm(`Deactivate ${u.name}?`)) return;
    try {
      await axios.delete(`/api/users/${u.id || u._id}`);
      toast.success(`${u.name} deactivated`);
      fetchUsers();
    } catch (err) { toast.error(err.response?.data?.error || 'Failed'); }
  };

  const filtered = users.filter(u =>
    [u.name, u.email, u.role, u.department].some(v =>
      v?.toLowerCase().includes(search.toLowerCase())
    )
  );

  const SC = { background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' };

  return (
    <div style={{ padding:'24px', width:'100%', maxWidth:1200, margin:'0 auto' }}>

      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
        <div>
          <h1 style={{ fontSize:28, fontWeight:900, color:'#1a1a2e', margin:0 }}>User Management</h1>
          <p style={{ fontSize:13, color:'#9ba8b5', margin:'4px 0 0' }}>Manage team members and their access roles</p>
        </div>
        {isAdmin && (
          <button onClick={() => setModal('add')}
            style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 20px', background:'#f97316', color:'#fff', border:'none', borderRadius:12, fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', boxShadow:'0 4px 12px rgba(249,115,22,0.3)' }}>
            <Plus size={16}/> Add User
          </button>
        )}
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Users',  val: users.length,                        sub:'All members',  Icon: Users,     icoColor:'#6366f1' },
          { label:'Active',       val: users.filter(u=>u.isActive).length,  sub:'In operation', Icon: CheckCircle, icoColor:'#10b981' },
          { label:'Inactive',     val: users.filter(u=>!u.isActive).length, sub:'Suspended',    Icon: UserX,     icoColor:'#ef4444' },
          { label:'Roles',        val: new Set(users.map(u=>u.role)).size,  sub:'Distinct',     Icon: Layers,    icoColor:'#f59e0b' },
        ].map((s,i) => (
          <div key={i} style={{
            background:'#fff', borderRadius:14, padding:'20px 20px 16px', position:'relative', minHeight:108,
            border: i===0 ? '1.5px solid #3b82f6' : '1px solid #e8edf2',
            boxShadow: i===0 ? '0 0 0 4px rgba(59,130,246,0.06),0 2px 6px rgba(0,0,0,0.05)' : '0 1px 4px rgba(0,0,0,0.04)',
            transition:'all 0.2s',
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-2px)'; e.currentTarget.style.boxShadow='0 8px 24px rgba(0,0,0,0.09)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow= i===0 ? '0 0 0 4px rgba(59,130,246,0.06),0 2px 6px rgba(0,0,0,0.05)' : '0 1px 4px rgba(0,0,0,0.04)'; }}>
            <p style={{ fontSize:11, fontWeight:600, color:'#9ba8b5', margin:'0 0 10px', letterSpacing:'0.02em' }}>{s.label}</p>
            <p style={{ fontSize:30, fontWeight:900, color:'#1a1a2e', margin:0, letterSpacing:'-0.6px', lineHeight:1.1 }}>{s.val}</p>
            <p style={{ fontSize:11, color:'#b0b8c4', margin:'6px 0 0' }}>{s.sub}</p>
            <div style={{ position:'absolute', bottom:16, right:16 }}>
              <s.Icon size={28} color={s.icoColor} strokeWidth={1.5}/>
            </div>
          </div>
        ))}
      </div>

      {/* Search */}
      <div style={{ ...SC, padding:14, marginBottom:16, display:'flex', alignItems:'center', gap:10 }}>
        <Search size={16} color="#9ba8b5"/>
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, email, role or department..."
          style={{ flex:1, border:'none', outline:'none', fontSize:13, color:'#1a1a2e', fontFamily:'inherit', background:'transparent' }}/>
        {search && <button onClick={() => setSearch('')} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ba8b5' }}><X size={14}/></button>}
      </div>

      {/* Table */}
      <div style={{ ...SC, overflow:'hidden' }}>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead>
            <tr style={{ background:'#f8f9fb' }}>
              {['User','Role','Department','Phone','Status','Actions'].map(h => (
                <th key={h} style={{ padding:'12px 16px', fontSize:9, fontWeight:800, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.1em', borderBottom:'1px solid #f0f2f5', textAlign:'left', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} style={{ padding:60, textAlign:'center' }}>
                <Loader2 size={24} color="#f97316" style={{ animation:'spin 1s linear infinite', display:'block', margin:'0 auto 8px' }}/>
                <span style={{ fontSize:12, color:'#9ba8b5' }}>Loading users...</span>
              </td></tr>
            ) : filtered.length === 0 ? (
              <tr><td colSpan={6} style={{ padding:60, textAlign:'center', color:'#9ba8b5', fontSize:13 }}>
                {search ? 'No users match your search' : 'No users found'}
              </td></tr>
            ) : filtered.map(u => {
              const role = ROLES_DEFAULT.find(r => r.value === u.role);
              return (
                <tr key={u.id || u._id} style={{ borderBottom:'1px solid #f8f9fb', transition:'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background='#fafbfc'}
                  onMouseLeave={e => e.currentTarget.style.background='transparent'}>

                  {/* User */}
                  <td style={{ padding:'14px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:36, height:36, borderRadius:10, background: role?.color || '#94a3b8', display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:900, color:'#fff', flexShrink:0 }}>
                        {u.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <p style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', margin:0 }}>{u.name}</p>
                        <p style={{ fontSize:11, color:'#9ba8b5', margin:0 }}>{u.email}</p>
                      </div>
                    </div>
                  </td>

                  <td style={{ padding:'14px 16px' }}><RoleBadge role={u.role}/></td>
                  <td style={{ padding:'14px 16px', fontSize:12, color:'#5a6474' }}>{u.department || '—'}</td>
                  <td style={{ padding:'14px 16px', fontSize:12, color:'#5a6474' }}>{u.phone || '—'}</td>

                  {/* Status */}
                  <td style={{ padding:'14px 16px' }}>
                    {u.isActive
                      ? <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'#10b981' }}><CheckCircle2 size={13}/> Active</span>
                      : <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, fontWeight:700, color:'#ef4444' }}><XCircle size={13}/> Inactive</span>
                    }
                  </td>

                  {/* Actions */}
                  <td style={{ padding:'14px 16px' }}>
                    {isAdmin && (
                      <ActionButtons buttons={[
                        { icon: Edit2,  title:'Edit',           onClick: () => setModal(u),           color:'#f97316', hbg:'#fff7ed' },
                        { icon: Key,    title:'Reset Password', onClick: () => setResetting(u),       color:'#3b82f6', hbg:'#eff6ff' },
                        { icon: Trash2, title:'Deactivate',     onClick: () => handleDeactivate(u),   color:'#ef4444', hbg:'#fff1f2', show: String(u.id || u._id) !== String(authData?.id) },
                      ]}/>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Role reference */}
      <div style={{ ...SC, marginTop:20, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <Shield size={14} color="#f97316"/>
          <p style={{ fontSize:11, fontWeight:800, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.1em', margin:0 }}>Role Permissions</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
          {ROLES_DEFAULT.map(r => (
            <div key={r.value} style={{ background:r.bg, border:`1px solid ${r.color}20`, borderRadius:12, padding:'12px 14px' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                <span style={{ width:8, height:8, borderRadius:'50%', background:r.color }}/>
                <span style={{ fontSize:12, fontWeight:800, color:r.color }}>{r.label}</span>
              </div>
              <p style={{ fontSize:11, color:'#9ba8b5', margin:0 }}>{r.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Panels */}
      {modal && <UserModal user={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSuccess={fetchUsers}/>}
      {resetting && <ResetPassModal user={resetting} onClose={() => setResetting(null)}/>}
    </div>
  );
}