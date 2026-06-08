import { X, Download, Clock, Building, FileText, Loader2,
         PieChart, Receipt, Calendar, FileCheck } from 'lucide-react';
import { StatusBadge } from '../TenantPrimitives.jsx';

const TABS = [
  { id:'overview',  label:'Overview',   icon: PieChart  },
  { id:'ledger',    label:'Ledger',     icon: FileText  },
  { id:'invoices',  label:'Billing',    icon: Receipt   },
  { id:'lease',     label:'Lease',      icon: Calendar  },
  { id:'documents', label:'Documents',  icon: FileCheck },
];

export default function TenantDetailHeader({ tenant, activeTab, setActiveTab, onClose, exportingPDF, onExportPDF }) {
  return (
    <div style={{ position:'sticky', top:0, zIndex:30, background:'#fff', borderBottom:'2px solid #f0f2f5', borderLeft:'4px solid #f97316', boxShadow:'0 4px 12px rgba(0,0,0,0.06)' }}>
      <div style={{ width:'100%', padding:'0 20px' }}>

        {/* Tenant info + action buttons */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:12, paddingBottom:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            {/* Avatar */}
            <div style={{ width:40, height:40, borderRadius:12, background:'rgba(249,115,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, fontWeight:900, color:'#f97316', border:'2px solid rgba(249,115,22,0.15)', flexShrink:0 }}>
              {tenant.name?.charAt(0)}
            </div>
            <div>
              {/* Name + status */}
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <h2 style={{ fontSize:15, fontWeight:800, color:'#1a1a2e', margin:0 }}>{tenant.name}</h2>
                <StatusBadge status={tenant.agreementStatus}/>
              </div>
              {/* Meta chips */}
              <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3, flexWrap:'wrap' }}>
                {[
                  { icon: <Building size={9} color="#f97316"/>, val: tenant.company },
                  { icon: <Clock    size={9} color="#f97316"/>, val: tenant.code    },
                ].map((b, i) => (
                  <span key={i} style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, fontWeight:600, color:'#9ba8b5', background:'#f8f9fb', padding:'2px 7px', borderRadius:5, border:'1px solid #f0f2f5' }}>
                    {b.icon} {b.val}
                  </span>
                ))}
                {tenant.gstNo && (
                  <span style={{ display:'flex', alignItems:'center', gap:3, fontSize:10, fontWeight:600, color:'#059669', background:'#f0fdf4', padding:'2px 7px', borderRadius:5, border:'1px solid #bbf7d0' }}>
                    <FileText size={9}/> {tenant.gstNo}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display:'flex', gap:8 }}>
            <button onClick={onExportPDF} disabled={exportingPDF}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#fff', border:'1.5px solid #f0f2f5', borderRadius:9, fontSize:11, fontWeight:600, color:'#5a6474', cursor:'pointer', fontFamily:'inherit' }}>
              {exportingPDF ? <Loader2 size={12} style={{ animation:'spin 1s linear infinite' }}/> : <Download size={12}/>} Ledger PDF
            </button>
            <button onClick={onClose}
              style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', background:'#1a1a2e', color:'#fff', border:'none', borderRadius:9, fontSize:11, fontWeight:700, cursor:'pointer', fontFamily:'inherit' }}>
              <X size={12}/> Close
            </button>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{ display:'flex', overflowX:'auto' }}>
          {TABS.map(t => {
            const Icon = t.icon;
            return (
              <button key={t.id} onClick={() => setActiveTab(t.id)}
                style={{ display:'flex', alignItems:'center', gap:5, padding:'9px 16px', background:'none', border:'none', cursor:'pointer', fontSize:12, fontFamily:'inherit', whiteSpace:'nowrap', transition:'all 0.15s',
                  fontWeight:    activeTab === t.id ? 700 : 500,
                  color:         activeTab === t.id ? '#f97316' : '#9ba8b5',
                  borderBottom:  activeTab === t.id ? '2px solid #f97316' : '2px solid transparent',
                  marginBottom: -2,
                }}>
                <Icon size={12}/> {t.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
