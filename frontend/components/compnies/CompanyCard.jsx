import { Building2, MapPin, CreditCard, CheckCircle2, Edit, Eye, Trash2, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import { usePermission } from '../../src/hooks/usePermission.js';

export default function CompanyCard({ company, onEdit, onView, onDelete }) {
  const { canEdit, canDelete } = usePermission();
  return (
    <motion.div
      layout
      key={company.id}
      className="bg-white rounded-3xl border border-slate-100 shadow-sm hover:shadow-xl hover:shadow-orange-500/5 transition-all overflow-hidden group"
    >
      <div className="p-6">
        {/* Header: Logo + Actions */}
        <div className="flex items-start justify-between mb-6">
          <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center p-2">
            {company.logoUrl ? (
              <img src={company.logoUrl} alt={company.companyName} className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
            ) : (
              <Building2 className="text-slate-300" size={24} />
            )}
          </div>
          <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
            <button onClick={() => onView(company)} title="View"
              style={{ width:30, height:30, borderRadius:7, border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#94a3b8', transition:'all 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='#eff6ff'; e.currentTarget.style.color='#3b82f6'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}>
              <Eye size={15}/>
            </button>
            {canEdit && (
              <button onClick={() => onEdit(company)} title="Edit"
                style={{ width:30, height:30, borderRadius:7, border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#94a3b8', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background='#fff7ed'; e.currentTarget.style.color='#f97316'; }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}>
                <Edit size={15}/>
              </button>
            )}
            {canDelete && (
              <button onClick={() => onDelete(company.id)} title="Delete"
                style={{ width:30, height:30, borderRadius:7, border:'none', background:'transparent', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#94a3b8', transition:'all 0.15s' }}
                onMouseEnter={e => { e.currentTarget.style.background='#fff1f2'; e.currentTarget.style.color='#ef4444'; }}
                onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='#94a3b8'; }}>
                <Trash2 size={15}/>
              </button>
            )}
          </div>
        </div>

        {/* Info */}
        <div>
          <h3 className="text-lg font-bold text-slate-800 line-clamp-1 mb-1">{company.companyName}</h3>
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">
            <CheckCircle2 size={12} className={company.status ? 'text-green-500' : 'text-slate-300'} />
            {company.status ? 'Active Unit' : 'Inactive'}
          </div>
          <div className="space-y-2.5">
            <div className="flex items-center gap-3 text-slate-500 text-sm">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                <MapPin size={14} />
              </div>
              <span className="line-clamp-1 truncate">{company.address || 'Address not listed'}</span>
            </div>
            <div className="flex items-center gap-3 text-slate-500 text-sm">
              <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center text-slate-400 shrink-0">
                <CreditCard size={14} />
              </div>
              <span className="font-mono text-[11px] font-bold tracking-tight text-slate-600">
                {company.gstNumber || 'GSTIN PENDING'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-50 flex items-center justify-between">
        <div className="flex -space-x-2">
          <div className="w-8 h-8 rounded-full bg-orange-100 border-2 border-white flex items-center justify-center text-orange-600 text-[10px] font-bold">BK</div>
          <div className="w-8 h-8 rounded-full bg-blue-100 border-2 border-white flex items-center justify-center text-blue-600 text-[10px] font-bold">TX</div>
        </div>
        <button onClick={() => onView(company)} className="text-xs font-bold text-orange-500 hover:text-orange-600 flex items-center gap-1 group/btn">
          View Profile
          <ChevronRight size={14} className="group-hover/btn:translate-x-0.5 transition-transform" />
        </button>
      </div>
    </motion.div>
  );
}
