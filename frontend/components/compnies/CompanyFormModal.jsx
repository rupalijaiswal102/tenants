import { useState } from 'react';
import { Building2, Phone, Mail, CreditCard, ChevronRight, X, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useForm } from 'react-hook-form';
import axios from 'axios';

export default function CompanyFormModal({ isOpen, onClose, company, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview]   = useState(company?.logoUrl || null);
  const [sealPreview, setSealPreview]   = useState(company?.sealUrl || null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: company ? { ...company } : { status: true, state: 'Maharashtra' }
  });

  const handleLogoChange = e => {
    const file = e.target.files?.[0];
    if (file) { const r = new FileReader(); r.onloadend = () => setLogoPreview(r.result); r.readAsDataURL(file); }
  };

  const handleSealChange = e => {
    const file = e.target.files?.[0];
    if (file) { const r = new FileReader(); r.onload = () => setSealPreview(r.result); r.readAsDataURL(file); }
  };

  const onSubmit = async (data) => {
    try {
      setIsSubmitting(true);
      const formData = new FormData();
      Object.keys(data).forEach(key => {
        if (data[key] !== undefined && data[key] !== null) formData.append(key, data[key]);
      });
      const logoInput = document.getElementById('logoFile');
      if (logoInput?.files?.[0]) formData.append('logoFile', logoInput.files[0]);
      const sealInput = document.getElementById('sealFile');
      if (sealInput?.files?.[0]) formData.append('sealFile', sealInput.files[0]);

      const config = { headers: { 'Content-Type': 'multipart/form-data' } };
      if (company) {
        await axios.put(`/api/companies/${company.id}`, formData, config);
      } else {
        await axios.post('/api/companies', formData, config);
      }
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving company');
    } finally {
      setIsSubmitting(false);
    }
  };

  const SectionTitle = ({ children }) => (
    <h3 className="text-xs font-bold text-orange-500 uppercase tracking-widest mb-6 flex items-center gap-2">
      <span className="w-4 h-px bg-orange-200" />
      {children}
    </h3>
  );

  const Field = ({ label, children }) => (
    <div>
      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1">{label}</label>
      {children}
    </div>
  );

  const inp = "w-full px-5 py-3.5 bg-slate-50 border border-slate-100 rounded-2xl focus:outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/5 text-slate-800";
  const inpWhite = inp.replace('bg-slate-50', 'bg-white');

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div initial={{ opacity:0 }} animate={{ opacity:1 }} exit={{ opacity:0 }}
            onClick={onClose} className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" />

          <motion.div initial={{ scale:0.95, opacity:0, y:20 }} animate={{ scale:1, opacity:1, y:0 }}
            exit={{ scale:0.95, opacity:0, y:20 }}
            className="relative bg-white w-full md:w-[95vw] max-w-4xl max-h-[92vh] rounded-none md:rounded-[32px] shadow-2xl flex flex-col overflow-hidden">

            {/* Header */}
            <div className="p-6 md:p-8 border-b border-slate-100 flex items-center justify-between shrink-0">
              <div>
                <h2 className="text-xl md:text-2xl font-black text-slate-800 tracking-tight">
                  {company ? 'Update Company Profile' : 'New Company Registration'}
                </h2>
                <p className="text-slate-500 text-xs mt-0.5">Enter business details and branding assets.</p>
              </div>
              <button onClick={onClose} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="overflow-y-auto p-8 pt-6 space-y-10">

              {/* Basic Info */}
              <section>
                <SectionTitle>Basic Information</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Field label="Company Name *">
                      <input {...register('companyName', { required: 'Required' })}
                        className={`${inp} ${errors.companyName ? 'border-rose-200 bg-rose-50/30' : ''}`}
                        placeholder="e.g. Swastik Grah Nirman Company" />
                      {errors.companyName && <p className="text-rose-500 text-[10px] mt-1 ml-2 font-bold uppercase">{errors.companyName.message}</p>}
                    </Field>
                  </div>
                  <div className="md:col-span-2">
                    <Field label="Office Address">
                      <textarea {...register('address')} rows={3} className={inp} placeholder="Full address for invoice header..." />
                    </Field>
                  </div>
                  <Field label="GSTIN Number">
                    <input {...register('gstNumber')} className={`${inp} font-mono`} placeholder="27AAAAA0000A1Z5" />
                  </Field>
                  <Field label="State">
                    <input {...register('state')} className={inp} placeholder="e.g. Maharashtra" />
                  </Field>
                  <div className="md:col-span-2">
                    <label className="inline-flex items-center cursor-pointer gap-3">
                      <input type="checkbox" {...register('status')} className="sr-only peer" />
                      <div className="relative w-11 h-6 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-orange-500 after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all" />
                      <span className="text-sm font-bold text-slate-600 uppercase tracking-tight">Active Business Unit</span>
                    </label>
                  </div>
                </div>
              </section>

              {/* Contact */}
              <section>
                <SectionTitle>Contact Information</SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Field label="Phone Number">
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input {...register('phoneNumber')} className={`${inp} pl-12`} />
                    </div>
                  </Field>
                  <Field label="Email Address">
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input {...register('email')} className={`${inp} pl-12`} />
                    </div>
                  </Field>
                </div>
              </section>

              {/* Bank Details */}
              <section>
                <SectionTitle>Bank Details</SectionTitle>
                <div className="bg-slate-50/50 border border-slate-100 rounded-3xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <Field label="Account Holder Name">
                      <input {...register('accountHolderName')} className={inpWhite} />
                    </Field>
                  </div>
                  <Field label="Bank Name">
                    <div className="relative">
                      <Building2 className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input {...register('bankName')} className={`${inpWhite} pl-12`} />
                    </div>
                  </Field>
                  <Field label="Account Number">
                    <div className="relative">
                      <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                      <input {...register('accountNumber')} className={`${inpWhite} pl-12`} />
                    </div>
                  </Field>
                  <Field label="IFSC Code">
                    <input {...register('ifscCode')} className={`${inpWhite} font-mono`} />
                  </Field>
                  <Field label="Branch">
                    <input {...register('branchName')} className={inpWhite} />
                  </Field>
                </div>
              </section>

              {/* Logo */}
              <section>
                <SectionTitle>Branding & Logo</SectionTitle>
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="w-32 h-32 rounded-3xl bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center overflow-hidden p-4">
                    {logoPreview ? <img src={logoPreview} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
                      : <Building2 size={40} className="text-slate-200" />}
                  </div>
                  <div className="flex-1 w-full">
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-4 ml-1">Choose Company Logo</label>
                    <label className="flex items-center justify-center bg-white border-2 border-dashed border-slate-200 hover:border-orange-500 hover:bg-orange-50/30 px-6 py-6 rounded-3xl cursor-pointer transition-all group">
                      <input type="file" id="logoFile" accept="image/*" onChange={handleLogoChange} className="hidden" />
                      <div className="text-center">
                        <Upload className="mx-auto mb-2 text-slate-400 group-hover:text-orange-500 transition-colors" size={24} />
                        <span className="text-xs font-bold text-slate-500 block">Click to upload brand logo</span>
                        <span className="text-[10px] text-slate-400 mt-1 block">Ideal: 400×200px transparent</span>
                      </div>
                    </label>
                  </div>
                </div>
              </section>

              {/* Seal */}
              <section>
                <SectionTitle>Company Seal</SectionTitle>
                <div className="flex flex-col md:flex-row items-center gap-8">
                  <div className="w-28 h-28 rounded-full border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    {sealPreview ? <img src={sealPreview} alt="Seal" className="w-full h-full object-contain rounded-full" />
                      : <span className="text-[9px] font-bold text-slate-300">SEAL</span>}
                  </div>
                  <div className="flex-1 w-full">
                    <p className="text-xs text-slate-500 mb-3">Upload company seal (PNG with transparent background recommended)</p>
                    <label className="flex items-center justify-center bg-white border-2 border-dashed border-slate-200 hover:border-orange-400 hover:bg-orange-50/30 px-6 py-5 rounded-2xl cursor-pointer transition-all">
                      <input type="file" id="sealFile" accept="image/*" onChange={handleSealChange} className="hidden" />
                      <div className="text-center">
                        <Upload className="mx-auto mb-2 text-slate-400" size={22} />
                        <span className="text-xs font-semibold text-slate-500 block">Click to upload seal</span>
                        <span className="text-[10px] text-slate-400 mt-1 block">PNG, JPG up to 5MB</span>
                      </div>
                    </label>
                    {sealPreview && (
                      <button type="button" onClick={() => { setSealPreview(null); const i = document.getElementById('sealFile'); if(i) i.value=''; }}
                        className="mt-2 text-xs font-bold text-red-400 hover:text-red-600">✕ Remove Seal</button>
                    )}
                  </div>
                </div>
              </section>

              {/* Actions */}
              <div className="flex items-center justify-end gap-4 pt-10 border-t border-slate-100 sticky bottom-0 bg-white pb-2">
                <button type="button" onClick={onClose} className="px-6 py-3 rounded-2xl text-slate-500 hover:bg-slate-50 font-bold">Cancel</button>
                <button type="submit" disabled={isSubmitting}
                  className="px-8 py-3 bg-[#F97316] hover:bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 disabled:opacity-50 flex items-center gap-2">
                  {isSubmitting ? 'Saving...' : (company ? 'Update Profile' : 'Register Company')}
                  {!isSubmitting && <ChevronRight size={18} />}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
