import { Eye, Edit2, Trash2, Search, ReceiptIndianRupee, Building2 } from 'lucide-react';
import { cn } from '@/lib/utils';
// Predefined charge types + dynamic from data
const DEFAULT_PARTICULARS = [
  'Rental Charges',
  'Common Area Maintenance',
  'Electricity Charges',
  'Water Charges',
  'Parking Charges',
  'Security Deposit',
  'Generator Charges',
  'Housekeeping Charges',
  'Property Tax',
  'Insurance',
];

function StatusBadge({ status }) {
  const map = {
    Paid:    'bg-emerald-100 text-emerald-700 border-emerald-200',
    Partial: 'bg-amber-100 text-amber-700 border-amber-200',
    Pending: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border', map[status]||map.Pending)}>
      {status}
    </span>
  );
}

// Shared cell style for both th and td to ensure alignment
const COL_STYLES = {
  invoiceNo: { width: '14%',  minWidth: 100 },
  tenant:    { width: '38%',  minWidth: 180 },
  amount:    { width: '14%',  minWidth: 110 },
  status:    { width: '12%',  minWidth: 90  },
  actions:   { width: '22%',  minWidth: 170 },
};

export function InvoiceTable({
  invoices, companies, particulars, loading, search,
  statusFilter, monthFilter, companyFilter, particularFilter,
  onSearch, onStatus, onMonth, onCompany, onParticular, onView, onEdit, onDelete
}) {
  // Merge default + dynamic particulars, deduplicate
  const allTypes = Array.from(new Set([...DEFAULT_PARTICULARS, ...particulars])).sort();
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>

      {/* ── Filter Bar ── */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #f0f2f5', padding:'10px 14px', display:'flex', gap:10, flexWrap:'wrap', alignItems:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>

        {/* Search */}
        <div style={{ flex:1, minWidth:200, display:'flex', alignItems:'center', gap:8, height:38, background:'#f8f9fb', border:'1.5px solid #f0f2f5', borderRadius:10, padding:'0 12px' }}>
          <Search size={13} color="#9ba8b5"/>
          <input type="text" placeholder="Search invoice or tenant..." value={search} onChange={e=>onSearch(e.target.value)}
            style={{ border:'none', outline:'none', fontSize:12, color:'#1a1a2e', background:'transparent', flex:1, fontFamily:'inherit' }}/>
        </div>

        {/* Company Filter */}
        <div style={{ display:'flex', alignItems:'center', gap:6, height:38, background:'#f8f9fb', border:'1.5px solid #f0f2f5', borderRadius:10, padding:'0 12px', minWidth:160 }}>
          <Building2 size={12} color="#f97316"/>
          <select value={companyFilter} onChange={e=>onCompany(e.target.value)}
            style={{ border:'none', outline:'none', fontSize:12, color:'#5a6474', background:'transparent', fontFamily:'inherit', cursor:'pointer', flex:1 }}>
            <option value="All Companies">All Companies</option>
            {companies.map(c=>(
              <option key={c.id} value={c.id||c.companyName}>{c.companyName}</option>
            ))}
          </select>
        </div>

        {/* Particular / Charge Type Filter */}
        <div style={{ display:'flex', alignItems:'center', gap:6, height:38, background:'#f8f9fb', border:'1.5px solid #f0f2f5', borderRadius:10, padding:'0 12px', minWidth:170 }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5">
            <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
          </svg>
          <select value={particularFilter} onChange={e=>onParticular(e.target.value)}
            style={{ border:'none', outline:'none', fontSize:12, color:'#5a6474', background:'transparent', fontFamily:'inherit', cursor:'pointer', flex:1 }}>
            <option value="All Types">All Charge Types</option>
            {allTypes.map(p=>(
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </div>

        {/* Month */}
        <select value={monthFilter} onChange={e=>onMonth(e.target.value)}
          style={{ height:38, padding:'0 10px', borderRadius:10, border:'1.5px solid #f0f2f5', fontSize:12, color:'#5a6474', background:'#f8f9fb', fontFamily:'inherit', outline:'none', cursor:'pointer' }}>
          <option value="All Months">All Months</option>
          {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i)=>(
            <option key={i} value={String(i)}>{m}</option>
          ))}
        </select>

        {/* Status */}
        <select value={statusFilter} onChange={e=>onStatus(e.target.value)}
          style={{ height:38, padding:'0 10px', borderRadius:10, border:'1.5px solid #f0f2f5', fontSize:12, color:'#5a6474', background:'#f8f9fb', fontFamily:'inherit', outline:'none', cursor:'pointer' }}>
          <option>All Status</option>
          <option>Paid</option>
          <option>Partial</option>
          <option>Pending</option>
        </select>

        <div style={{ width:1, height:22, background:'#f0f2f5' }}/>
        <span style={{ fontSize:12, color:'#9ba8b5', fontWeight:600, whiteSpace:'nowrap' }}>
          {invoices.length} invoices
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ background:'#fff', borderRadius:14, border:'1px solid #f0f2f5', overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', tableLayout:'fixed' }}>

            {/* ── colgroup for fixed widths ── */}
            <colgroup>
              <col style={{ width: COL_STYLES.invoiceNo.width }}/>
              <col style={{ width: COL_STYLES.tenant.width }}/>
              <col style={{ width: COL_STYLES.amount.width }}/>
              <col style={{ width: COL_STYLES.status.width }}/>
              <col style={{ width: COL_STYLES.actions.width }}/>
            </colgroup>

            <thead>
              <tr style={{ background:'#fafbfc', borderBottom:'2px solid #f1f5f9' }}>
                <th style={{ padding:'13px 18px', fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left' }}>
                  Invoice No
                </th>
                <th style={{ padding:'13px 18px', fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'left' }}>
                  Tenant / Company
                </th>
                <th style={{ padding:'13px 18px', fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'right' }}>
                  Amount
                </th>
                <th style={{ padding:'13px 18px', fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'center' }}>
                  Status
                </th>
                <th style={{ padding:'13px 18px', fontSize:10, fontWeight:800, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.08em', textAlign:'right' }}>
                  Actions
                </th>
              </tr>
            </thead>

            <tbody>
              {loading ? (
                [1,2,3].map(i=>(
                  <tr key={i} style={{ borderBottom:'1px solid #f8f9fb' }}>
                    <td colSpan={5} style={{ padding:'18px' }}>
                      <div style={{ height:12, background:'linear-gradient(90deg,#f0f2f5 25%,#e8eaed 50%,#f0f2f5 75%)', borderRadius:6, width:'60%', animation:'pulse 1.5s infinite' }}/>
                    </td>
                  </tr>
                ))
              ) : invoices.length===0 ? (
                <tr>
                  <td colSpan={5} style={{ padding:'60px 24px', textAlign:'center' }}>
                    <ReceiptIndianRupee size={44} style={{ margin:'0 auto 12px', display:'block', color:'#e0e4ea' }}/>
                    <p style={{ fontSize:14, fontWeight:600, color:'#94a3b8', margin:0 }}>No invoices found</p>
                    <p style={{ fontSize:12, color:'#c5cdd6', margin:'4px 0 0' }}>Try adjusting your filters</p>
                  </td>
                </tr>
              ) : invoices.map(inv=>(
                <tr key={inv.id}
                  style={{ borderBottom:'1px solid #f8f9fb', transition:'background 0.12s' }}
                  onMouseEnter={e=>(e.currentTarget).style.background='#fafbfc'}
                  onMouseLeave={e=>(e.currentTarget).style.background='transparent'}>

                  {/* Invoice No */}
                  <td style={{ padding:'14px 18px' }}>
                    <span style={{ fontSize:12, fontWeight:700, color:'#64748b', fontFamily:'monospace' }}>
                      #{inv.invoiceNo}
                    </span>
                  </td>

                  {/* Tenant / Company */}
                  <td style={{ padding:'14px 18px' }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'#1a1a2e', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {inv.partyName}
                    </p>
                    <div style={{ display:'flex', alignItems:'center', gap:4, marginBottom:2 }}>
                      <Building2 size={9} color="#9ba8b5"/>
                      <span style={{ fontSize:10, color:'#9ba8b5', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {inv.company}
                      </span>
                    </div>
                    {/* Charge type badge */}
                    {inv.items?.[0]?.particular && (
                      <span style={{ fontSize:9, fontWeight:700, color:'#f97316', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.15)', borderRadius:5, padding:'1px 7px', display:'inline-block' }}>
                        {inv.items[0].particular}
                      </span>
                    )}
                    <p style={{ fontSize:10, color:'#c5cdd6', margin:'2px 0 0' }}>{inv.billDate}</p>
                  </td>

                  {/* Amount */}
                  <td style={{ padding:'14px 18px', textAlign:'right' }}>
                    <span style={{ fontSize:14, fontWeight:800, color:'#f97316' }}>
                      ₹ {Math.round(inv.totalInvoice||0).toLocaleString('en-IN')}
                    </span>
                  </td>

                  {/* Status */}
                  <td style={{ padding:'14px 18px', textAlign:'center' }}>
                    <StatusBadge status={inv.paymentStatus}/>
                  </td>

                  {/* Actions */}
                  <td style={{ padding:'14px 18px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'flex-end', gap:6 }}>
                      <button onClick={()=>onView(inv)}
                        style={{ padding:'5px 12px', background:'rgba(249,115,22,0.08)', border:'1px solid rgba(249,115,22,0.2)', borderRadius:8, cursor:'pointer', color:'#f97316', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4, fontFamily:'inherit', whiteSpace:'nowrap' }}>
                        <Eye size={12}/> View
                      </button>
                      <button onClick={()=>onEdit(inv)}
                        style={{ padding:'5px 12px', background:'#fffbeb', border:'1px solid #fde68a', borderRadius:8, cursor:'pointer', color:'#b45309', fontSize:11, fontWeight:700, display:'flex', alignItems:'center', gap:4, fontFamily:'inherit', whiteSpace:'nowrap' }}>
                        <Edit2 size={12}/> Edit
                      </button>
                      <button onClick={()=>onDelete(inv)}
                        style={{ padding:'5px 9px', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:8, cursor:'pointer', color:'#e11d48', display:'flex', alignItems:'center', fontFamily:'inherit' }}>
                        <Trash2 size={12}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
