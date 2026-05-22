import { Eye, Edit2, Trash2, Search, ReceiptIndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';
import { type Invoice } from '../../src/types';

interface Props {
  invoices:     Invoice[];
  loading:      boolean;
  search:       string;
  statusFilter: string;
  monthFilter:  string;
  onSearch:     (v: string) => void;
  onStatus:     (v: string) => void;
  onMonth:      (v: string) => void;
  onView:       (inv: Invoice) => void;
  onEdit:       (inv: Invoice) => void;
  onDelete:     (inv: Invoice) => void;
}

function StatusBadge({ status }: { status: string }) {
  const map: any = {
    Paid:    'bg-emerald-100 text-emerald-700',
    Partial: 'bg-amber-100 text-amber-700',
    Pending: 'bg-rose-100 text-rose-700',
  };
  return (
    <span className={cn('px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider', map[status] || map.Pending)}>
      {status}
    </span>
  );
}

export function InvoiceTable({ invoices, loading, search, statusFilter, monthFilter, onSearch, onStatus, onMonth, onView, onEdit, onDelete }: Props) {
  return (
    <>
      {/* ── Filter Bar ── */}
      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18}/>
          <input type="text" placeholder="Search invoice or tenant..." value={search} onChange={e=>onSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"/>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          <select value={monthFilter} onChange={e=>onMonth(e.target.value)}
            className="flex-1 lg:flex-none text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20">
            <option value="All Months">All Months</option>
            {['January','February','March','April','May','June','July','August','September','October','November','December'].map((m,i)=>(
              <option key={i} value={String(i)}>{m}</option>
            ))}
          </select>
          <select value={statusFilter} onChange={e=>onStatus(e.target.value)}
            className="flex-1 lg:flex-none text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20">
            <option>All Status</option>
            <option>Paid</option>
            <option>Partial</option>
            <option>Pending</option>
          </select>
          <div className="h-8 w-px bg-slate-200"/>
          <span className="text-sm text-slate-400 font-medium whitespace-nowrap">{invoices.length} invoices</span>
        </div>
      </div>

      {/* ── Table ── */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50">
                {['Invoice No','Tenant Name','Total Amount','Status','Actions'].map(h=>(
                  <th key={h} style={{padding:'12px 18px',fontSize:10,fontWeight:800,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.08em',borderBottom:'2px solid #f1f5f9',whiteSpace:'nowrap'}}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1,2,3].map(i=>(
                  <tr key={i}><td colSpan={5} style={{padding:'16px 18px',borderBottom:'1px solid #f8f9fb'}}>
                    <div style={{height:12,background:'#f0f2f5',borderRadius:6,width:'60%'}}/>
                  </td></tr>
                ))
              ) : invoices.length===0 ? (
                <tr><td colSpan={5} style={{padding:'60px 24px',textAlign:'center'}}>
                  <ReceiptIndianRupee size={44} style={{margin:'0 auto 10px',display:'block',color:'#e0e4ea'}}/>
                  <p style={{fontSize:14,fontWeight:600,color:'#94a3b8'}}>No invoices found</p>
                </td></tr>
              ) : invoices.map(inv=>(
                <tr key={inv.id} style={{borderBottom:'1px solid #f8f9fb',transition:'background 0.1s'}}
                  onMouseEnter={e=>(e.currentTarget as HTMLElement).style.background='#fafbfc'}
                  onMouseLeave={e=>(e.currentTarget as HTMLElement).style.background='transparent'}>
                  <td style={{padding:'14px 18px',fontSize:12,color:'#94a3b8',fontWeight:600}}>#{inv.invoiceNo}</td>
                  <td style={{padding:'14px 18px'}}>
                    <p style={{fontSize:13,fontWeight:700,color:'#1a1a2e',margin:0}}>{inv.partyName}</p>
                    <p style={{fontSize:10,color:'#94a3b8',margin:0}}>{inv.billDate}</p>
                  </td>
                  <td style={{padding:'14px 18px',fontSize:14,fontWeight:800,color:'#f97316'}}>
                    ₹{(inv.totalInvoice||0).toLocaleString('en-IN',{minimumFractionDigits:2})}
                  </td>
                  <td style={{padding:'14px 18px'}}><StatusBadge status={inv.paymentStatus}/></td>
                  <td style={{padding:'14px 18px'}}>
                    <div style={{display:'flex',alignItems:'center',gap:6}}>
                      <button onClick={()=>onView(inv)} style={{padding:'5px 12px',background:'rgba(249,115,22,0.08)',border:'1px solid rgba(249,115,22,0.15)',borderRadius:8,cursor:'pointer',color:'#f97316',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:4,fontFamily:'inherit'}}>
                        <Eye size={13}/> View
                      </button>
                      <button onClick={()=>onEdit(inv)} style={{padding:'5px 12px',background:'#fffbeb',border:'1px solid #fde68a',borderRadius:8,cursor:'pointer',color:'#b45309',fontSize:11,fontWeight:700,display:'flex',alignItems:'center',gap:4,fontFamily:'inherit'}}>
                        <Edit2 size={13}/> Edit
                      </button>
                      <button onClick={()=>onDelete(inv)} style={{padding:'5px 9px',background:'#fff1f2',border:'1px solid #fecdd3',borderRadius:8,cursor:'pointer',color:'#e11d48',display:'flex',alignItems:'center',fontFamily:'inherit'}}>
                        <Trash2 size={13}/>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
