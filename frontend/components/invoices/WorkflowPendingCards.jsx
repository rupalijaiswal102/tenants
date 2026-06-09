import { useState, useEffect } from 'react';
import axios from 'axios';
import { CheckCircle2, BookOpen, Truck, IndianRupee, Mail, AlertCircle } from 'lucide-react';

const PENDING_CARDS = [
  { key:'pendingApprovals',    label:'Pending Approvals',      icon: CheckCircle2, color:'#ef4444', bg:'#fff1f2', border:'#fecdd3', role:'Accounts' },
  { key:'pendingTallyEntry',   label:'Pending Tally Entry',    icon: BookOpen,     color:'#8b5cf6', bg:'#f5f3ff', border:'#ddd6fe', role:'Accounts' },
  { key:'pendingEmail',        label:'Pending Email',          icon: Mail,         color:'#f59e0b', bg:'#fffbeb', border:'#fde68a', role:'MDO'      },
  { key:'pendingDispatch',     label:'Pending Dispatch',       icon: Truck,        color:'#0ea5e9', bg:'#eff6ff', border:'#bfdbfe', role:'CRM'      },
  { key:'pendingPayment',      label:'Pending Payment',        icon: IndianRupee,  color:'#10b981', bg:'#f0fdf4', border:'#bbf7d0', role:'MDO'      },
  { key:'pendingTallyReceipt', label:'Tally Receipt Pending',  icon: BookOpen,     color:'#8b5cf6', bg:'#f5f3ff', border:'#ddd6fe', role:'Accounts' },
];

export default function WorkflowPendingCards({ userRole }) {
  const [stats,   setStats]   = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get('/api/workflow/stats')
      .then(r => setStats(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Filter cards relevant to user's role
  const visibleCards = ROLE_FILTER[userRole]
    ? PENDING_CARDS.filter(c => ROLE_FILTER[userRole].includes(c.key))
    : PENDING_CARDS;

  if (loading) return null;
  if (!stats)  return null;

  const hasAny = visibleCards.some(c => (stats[c.key] || 0) > 0);
  if (!hasAny) return null;

  return (
    <div style={{ marginBottom:20 }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <AlertCircle size={14} color="#f97316"/>
        <p style={{ fontSize:11, fontWeight:800, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>
          Pending Actions
        </p>
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px,1fr))', gap:10 }}>
        {visibleCards.map(card => {
          const count = stats[card.key] || 0;
          if (!count) return null;
          const Icon = card.icon;
          return (
            <div key={card.key} style={{ background:card.bg, border:`1.5px solid ${card.border}`, borderRadius:14, padding:'14px 16px', display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:36, height:36, borderRadius:10, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:`0 2px 8px ${card.color}20` }}>
                <Icon size={17} color={card.color}/>
              </div>
              <div>
                <div style={{ fontSize:22, fontWeight:900, color:card.color, lineHeight:1 }}>{count}</div>
                <div style={{ fontSize:10, fontWeight:700, color:card.color, opacity:0.8, marginTop:2, lineHeight:1.3 }}>{card.label}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

const ROLE_FILTER = {
  MDO:      ['pendingApprovals','pendingEmail','pendingPayment'],
  Accounts: ['pendingApprovals','pendingTallyEntry','pendingTallyReceipt'],
  CRM:      ['pendingDispatch'],
  Admin:    null, // show all
};
