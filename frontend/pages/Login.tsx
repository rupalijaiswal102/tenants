import { useState } from 'react';
import { Eye, EyeOff, LogIn, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';

interface Props {
  onLogin: (user: { name:string; role:string; initials:string; token:string }) => void;
}

export default function Login({ onLogin }: Props) {
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/login', {
        email:    email.trim().toLowerCase(),
        password,
      });
      const { token, user } = res.data;
      const initials = user.name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0,2);
      const authData = { name:user.name, role:user.role, initials, token };
      localStorage.setItem('neoteric_auth', JSON.stringify(authData));
      onLogin(authData);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const inp = {
    width:'100%', height:44, padding:'0 14px', borderRadius:11,
    border:'1.5px solid #f0f2f5', fontSize:14, fontWeight:500,
    color:'#1a1a2e', outline:'none', fontFamily:'inherit',
    background:'#f8f9fb', boxSizing:'border-box' as const, transition:'border 0.15s'
  };

  return (
    <div style={{ minHeight:'100vh', background:'#F5F7FA', display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}>
      <motion.div initial={{opacity:0,y:20}} animate={{opacity:1,y:0}}
        style={{ background:'#fff', borderRadius:24, border:'1px solid #f0f2f5', boxShadow:'0 8px 40px rgba(0,0,0,0.08)', width:'100%', maxWidth:420, overflow:'hidden' }}>

        {/* Orange top bar */}
        <div style={{ height:6, background:'linear-gradient(90deg,#f97316,#fb923c)' }}/>

        <div style={{ padding:'40px 40px 32px' }}>
          {/* Logo */}
          <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:32 }}>
            <div style={{ width:44, height:44, borderRadius:12, background:'#f97316', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 4px 12px rgba(249,115,22,0.3)' }}>
              <span style={{ fontSize:20, fontWeight:900, color:'#fff' }}>N</span>
            </div>
            <div>
              <p style={{ fontSize:16, fontWeight:800, color:'#1a1a2e', margin:0 }}>Neoteric Properties</p>
              <p style={{ fontSize:11, color:'#9ba8b5', margin:0 }}>Tenant Management Portal</p>
            </div>
          </div>

          <h1 style={{ fontSize:22, fontWeight:800, color:'#1a1a2e', margin:'0 0 6px' }}>Welcome Back</h1>
          <p style={{ fontSize:13, color:'#9ba8b5', margin:'0 0 28px' }}>Sign in to continue to your dashboard</p>

          <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:16 }}>

            {/* Email */}
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>
                Email Address
              </label>
              <input value={email} onChange={e=>setEmail(e.target.value)}
                type="email" required placeholder="admin@neoteric.in"
                style={inp}
                onFocus={e=>(e.target as HTMLElement).style.borderColor='#f97316'}
                onBlur={e=>(e.target as HTMLElement).style.borderColor='#f0f2f5'}
              />
            </div>

            {/* Password */}
            <div>
              <label style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.08em', display:'block', marginBottom:6 }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <input value={password} onChange={e=>setPassword(e.target.value)}
                  type={showPwd?'text':'password'} required placeholder="••••••••"
                  style={{ ...inp, padding:'0 44px 0 14px' }}
                  onFocus={e=>(e.target as HTMLElement).style.borderColor='#f97316'}
                  onBlur={e=>(e.target as HTMLElement).style.borderColor='#f0f2f5'}
                />
                <button type="button" onClick={()=>setShowPwd(v=>!v)}
                  style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', padding:4, color:'#9ba8b5' }}>
                  {showPwd ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Error */}
            {error && (
              <motion.div initial={{opacity:0,y:-6}} animate={{opacity:1,y:0}}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'10px 14px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:10 }}>
                <AlertCircle size={14} color="#ef4444"/>
                <span style={{ fontSize:12, color:'#be123c', fontWeight:600 }}>{error}</span>
              </motion.div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loading}
              style={{ height:46, background:'#f97316', color:'#fff', border:'none', borderRadius:11, fontSize:14, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8, boxShadow:'0 4px 14px rgba(249,115,22,0.35)', marginTop:4, opacity:loading?0.7:1, transition:'all 0.15s' }}>
              {loading
                ? <div style={{ width:18, height:18, border:'2px solid rgba(255,255,255,0.4)', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 1s linear infinite' }}/>
                : <LogIn size={16}/>}
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>

        <div style={{ padding:'14px 40px', borderTop:'1px solid #f8f9fb', background:'#fafbfc', textAlign:'center' }}>
          <p style={{ fontSize:10, color:'#c5cdd6', margin:0 }}>© 2026 Neoteric Properties. All rights reserved.</p>
        </div>
      </motion.div>
    </div>
  );
}
