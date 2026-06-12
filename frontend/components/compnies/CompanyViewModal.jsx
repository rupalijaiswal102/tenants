import { Building2, MapPin, Mail, Phone, FileText, Edit, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { usePermission } from '../../src/hooks/usePermission.js';

export default function CompanyViewModal({ company, onClose, onEdit }) {
  const { canEdit } = usePermission();
  if (!company) return null;

  const DetailRow = ({ label, value }) => (
    <div className="flex justify-between items-center border-b border-white pb-3 gap-2">
      <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{label}</span>
      <span className="text-xs font-bold text-slate-700 text-right break-all">{value || '--'}</span>
    </div>
  );

  const ContactItem = ({ icon, label, value }) => (
    <div className="flex items-start gap-4">
      <div className="w-9 h-9 rounded-xl bg-orange-50 flex items-center justify-center text-orange-500 shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-400 uppercase tracking-tighter mb-0.5">{label}</div>
        <div className="text-sm font-bold text-slate-700 break-words">{value || '--'}</div>
      </div>
    </div>
  );

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
        <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
          onClick={onClose} className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" />

        <motion.div initial={{ scale:0.95, opacity:0 }} animate={{ scale:1, opacity:1 }} exit={{ scale:0.95, opacity:0 }}
          className="relative bg-[#F8FAFC] w-full md:w-[95vw] max-w-5xl rounded-none md:rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-y-auto border border-white">

          {/* Dark Header */}
          <div className="bg-[#1A1A2E] p-6 md:p-12 text-white relative flex-shrink-0">
            <button onClick={onClose} className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
              <X size={20} />
            </button>
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 md:gap-10">
              <div className="w-24 h-24 md:w-32 md:h-32 rounded-3xl bg-white p-4 flex items-center justify-center shadow-2xl shrink-0">
                {company.logoUrl
                  ? <img src={company.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                  : <Building2 size={40} className="text-[#1A1A2E]" />}
              </div>
              <div className="text-center md:text-left space-y-3">
                <span className="px-3 py-1 bg-orange-500 rounded-full text-[10px] font-black uppercase tracking-widest">Registered Entity</span>
                <h2 className="text-2xl md:text-5xl font-black tracking-tight leading-tight break-words">{company.companyName}</h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-5 text-white/50 text-xs font-bold uppercase tracking-widest pt-1">
                  <div className="flex items-center gap-2"><MapPin size={14} className="text-orange-500" /> {company.state || 'India'}</div>
                  <div className="flex items-center gap-2"><FileText size={14} className="text-orange-500" /> {company.gstNumber || 'NO GSTIN'}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Body */}
          <div className="p-4 md:p-10 -mt-6">
            <div className="bg-white rounded-[24px] md:rounded-[32px] shadow-xl p-4 md:p-8 space-y-10">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-12 gap-y-8">

                {/* Contact */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Contact Details</h4>
                  <div className="space-y-4">
                    <ContactItem icon={<Mail size={16} />} label="Primary Email" value={company.email} />
                    <ContactItem icon={<Phone size={16} />} label="Business Phone" value={company.phoneNumber} />
                    <ContactItem icon={<MapPin size={16} />} label="Office Address" value={company.address} />
                  </div>
                </div>

                {/* Bank */}
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Settlement Details</h4>
                  <div className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-4">
                    <DetailRow label="Bank Name"      value={company.bankName} />
                    <DetailRow label="Account No"     value={company.accountNumber} />
                    <DetailRow label="IFSC"           value={company.ifscCode} />
                    <div className="flex flex-col gap-1 pt-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">Account Holder</span>
                      <span className="text-xs font-bold text-slate-700 break-words">{company.accountHolderName || '--'}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit button */}
              {canEdit && (
                <div className="pt-6 flex items-center justify-center">
                  <button onClick={() => { onClose(); onEdit(company); }}
                    className="w-full md:w-auto px-10 py-4 bg-[#1A1A2E] text-white rounded-2xl text-xs font-black uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-xl">
                    <Edit size={16} /> Full Edit Profile
                  </button>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
