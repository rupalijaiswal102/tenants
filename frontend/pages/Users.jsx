import { useState, useEffect } from 'react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import {
  Plus, Edit2, Trash2, X, Eye, EyeOff,
  CheckCircle2, XCircle, Search, Loader2, Key, Shield,
  Users, CheckCircle, UserX, Layers
} from 'lucide-react';

// ── Shared input style ────────────────────────────────────────────────────────
const inp = {
  width:'100%', height:42, padding:'0 14px',
  background:'#fff', border:'2px solid #f0f2f5', borderRadius:10,
  fontSize:13, color:'#1a1a2e', outline:'none', fontFamily:'inherit',
  transition:'border 0.15s',
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

// ── Add / Edit Modal ──────────────────────────────────────────────────────────
function UserModal({ user, onClose, onSuccess }) {
  const isEdit = !!user;
  const [form, setForm] = useState({
    name:       user?.name       || '',
    email:      user?.email      || '',
    password:   '',
    role:       user?.role       || 'MDO',
    phone:      user?.phone      || '',
    department: user?.department || '',
    isActive:   user?.isActive   ?? true,
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

  return (
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }}/>
      <motion.div initial={{ scale:0.95, opacity:0, y:20 }} animate={{ scale:1, opacity:1, y:0 }}
        style={{ position:'relative', background:'#fff', width:'100%', maxWidth:520, borderRadius:24, boxShadow:'0 20px 60px rgba(0,0,0,0.15)', overflow:'hidden' }}>

        {/* Header */}
        <div style={{ padding:'20px 24px', borderBottom:'1px solid #f0f2f5', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <h2 style={{ fontSize:18, fontWeight:900, color:'#1a1a2e', margin:0 }}>{isEdit ? 'Edit User' : 'Add New User'}</h2>
            <p style={{ fontSize:11, color:'#9ba8b5', margin:'2px 0 0' }}>Set user details and access role</p>
          </div>
          <button onClick={onClose} style={{ width:34, height:34, borderRadius:'50%', border:'none', background:'#f8f9fb', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#9ba8b5' }}>
            <X size={16}/>
          </button>
        </div>

        {/* Form */}
        <div style={{ padding:24, display:'flex', flexDirection:'column', gap:16, maxHeight:'70vh', overflowY:'auto' }}>

          {/* Name + Email */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:10, fontWeight:800, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>Full Name *</label>
              <input value={form.name} onChange={e => set('name', e.target.value)}
                style={inp} placeholder="e.g. Simran Singh"
                onFocus={e => e.target.style.borderColor='#f97316'}
                onBlur={e => e.target.style.borderColor='#f0f2f5'}/>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:800, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>Email *</label>
              <input value={form.email} onChange={e => set('email', e.target.value)}
                type="email" style={inp} placeholder="user@neoteric.in"
                onFocus={e => e.target.style.borderColor='#f97316'}
                onBlur={e => e.target.style.borderColor='#f0f2f5'}/>
            </div>
          </div>

          {/* Password */}
          <div>
            <label style={{ fontSize:10, fontWeight:800, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>
              {isEdit ? 'New Password (blank = keep existing)' : 'Password *'}
            </label>
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
          </div>

          {/* Role selector */}
          <div>
            <label style={{ fontSize:10, fontWeight:800, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:8 }}>Role & Permissions *</label>
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
          </div>

          {/* Phone + Department */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            <div>
              <label style={{ fontSize:10, fontWeight:800, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)}
                style={inp} placeholder="+91 98765 43210"
                onFocus={e => e.target.style.borderColor='#f97316'}
                onBlur={e => e.target.style.borderColor='#f0f2f5'}/>
            </div>
            <div>
              <label style={{ fontSize:10, fontWeight:800, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>Department</label>
              <input value={form.department} onChange={e => set('department', e.target.value)}
                style={inp} placeholder="e.g. Accounts"
                onFocus={e => e.target.style.borderColor='#f97316'}
                onBlur={e => e.target.style.borderColor='#f0f2f5'}/>
            </div>
          </div>

          {/* Active toggle (edit only) */}
          {isEdit && (
            <label style={{ display:'flex', alignItems:'center', gap:12, cursor:'pointer' }}>
              <div onClick={() => set('isActive', !form.isActive)}
                style={{ width:44, height:24, borderRadius:12, background: form.isActive?'#f97316':'#e2e8f0', position:'relative', cursor:'pointer', transition:'background 0.2s', flexShrink:0 }}>
                <div style={{ position:'absolute', top:2, left: form.isActive?20:2, width:20, height:20, borderRadius:'50%', background:'#fff', boxShadow:'0 1px 3px rgba(0,0,0,0.2)', transition:'left 0.2s' }}/>
              </div>
              <span style={{ fontSize:13, fontWeight:700, color:'#1a1a2e' }}>Active Account</span>
            </label>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding:'16px 24px', borderTop:'1px solid #f0f2f5', display:'flex', justifyContent:'flex-end', gap:10 }}>
          <button onClick={onClose} style={{ padding:'9px 20px', borderRadius:10, border:'1.5px solid #f0f2f5', background:'#fff', fontSize:13, fontWeight:600, color:'#5a6474', cursor:'pointer', fontFamily:'inherit' }}>
            Cancel
          </button>
          <button onClick={handleSubmit} disabled={saving}
            style={{ padding:'9px 24px', borderRadius:10, border:'none', background:'#f97316', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', gap:7, opacity: saving?0.7:1, boxShadow:'0 4px 12px rgba(249,115,22,0.3)' }}>
            {saving ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/> : <CheckCircle2 size={14}/>}
            {isEdit ? 'Save Changes' : 'Create User'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Reset Password Modal ──────────────────────────────────────────────────────
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
    <div style={{ position:'fixed', inset:0, zIndex:100, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
        onClick={onClose} style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)' }}/>
      <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }}
        style={{ position:'relative', background:'#fff', width:'100%', maxWidth:380, borderRadius:20, padding:24, boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>
        <h3 style={{ fontSize:16, fontWeight:900, color:'#1a1a2e', margin:'0 0 4px' }}>Reset Password</h3>
        <p style={{ fontSize:12, color:'#9ba8b5', margin:'0 0 20px' }}>for <strong style={{ color:'#1a1a2e' }}>{user.name}</strong></p>
        <div style={{ position:'relative', marginBottom:16 }}>
          <input value={pass} onChange={e => setPass(e.target.value)} type={show?'text':'password'}
            style={{ ...inp, paddingRight:44 }} placeholder="New password (min 6 chars)"
            onFocus={e => e.target.style.borderColor='#f97316'}
            onBlur={e => e.target.style.borderColor='#f0f2f5'}/>
          <button onClick={() => setShow(v=>!v)} type="button"
            style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#9ba8b5' }}>
            {show ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={onClose} style={{ flex:1, padding:10, borderRadius:10, border:'1.5px solid #f0f2f5', background:'#fff', fontSize:13, fontWeight:600, color:'#5a6474', cursor:'pointer', fontFamily:'inherit' }}>Cancel</button>
          <button onClick={handleReset} disabled={saving}
            style={{ flex:1, padding:10, borderRadius:10, border:'none', background:'#f97316', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'inherit', opacity: saving?0.7:1 }}>
            {saving ? 'Resetting...' : 'Reset'}
          </button>
        </div>
      </motion.div>
    </div>
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
                      <div style={{ display:'flex', gap:2 }}>
                        {[
                          { icon: Edit2,  title:'Edit',           onClick: () => setModal(u),       color:'#f97316', hbg:'#fff7ed', show: true },
                          { icon: Key,    title:'Reset Password', onClick: () => setResetting(u),   color:'#3b82f6', hbg:'#eff6ff', show: true },
                          { icon: Trash2, title:'Deactivate',     onClick: () => handleDeactivate(u), color:'#ef4444', hbg:'#fff1f2', show: String(u.id || u._id) !== String(authData?.id) },
                        ].filter(b => b.show).map(({ icon: Ic, title, onClick, color, hbg }) => (
                          <button key={title} onClick={onClick} title={title}
                            style={{ width:30, height:30, borderRadius:7, border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#94a3b8', transition:'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.background=hbg; e.currentTarget.style.color=color; }}
                            onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}>
                            <Ic size={15}/>
                          </button>
                        ))}
                      </div>
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

      {/* Modals */}
      <AnimatePresence>
        {modal && <UserModal user={modal === 'add' ? null : modal} onClose={() => setModal(null)} onSuccess={fetchUsers}/>}
        {resetting && <ResetPassModal user={resetting} onClose={() => setResetting(null)}/>}
      </AnimatePresence>
    </div>
  );
}