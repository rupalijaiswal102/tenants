import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import axios from 'axios';
import {
  Plus, X, Trash2, Download, ShieldCheck, Shield, CheckCircle, Loader2, Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import { type Invoice, type Tenant, type Company } from '../../src/types';
import { InvoicePreview } from './InvoicePreview';
import { generateInvoicePDF } from './invoicePdf';
import { ApproveSignatureModal } from './ApproveSignatureModal';
import { formatCurrency } from '../../src/utils/formatCurrency';

// ── numberToWords ─────────────────────────────────────────────────────────────
function numberToWords(num: number): string {
  const units = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine','Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens  = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
  if (num === 0) return 'Zero';
  function convert(n: number): string {
    if (n < 20)       return units[n];
    if (n < 100)      return tens[Math.floor(n/10)] + (n%10 ? ' '+units[n%10] : '');
    if (n < 1000)     return units[Math.floor(n/100)] + ' Hundred' + (n%100 ? ' and '+convert(n%100) : '');
    if (n < 100000)   return convert(Math.floor(n/1000)) + ' Thousand' + (n%1000 ? ' '+convert(n%1000) : '');
    if (n < 10000000) return convert(Math.floor(n/100000)) + ' Lakh' + (n%100000 ? ' '+convert(n%100000) : '');
    return convert(Math.floor(n/10000000)) + ' Crore' + (n%10000000 ? ' '+convert(n%10000000) : '');
  }
  return convert(Math.floor(num));
}

// ── InvoiceFormModal ──────────────────────────────────────────────────────────
export function InvoiceFormModal({ tenants, companies, onClose, onSuccess, initialData }: any) {
  const [loading, setLoading] = useState(false);
  const monthNames = ["January","February","March","April","May","June","July","August","September","October","November","December"];
  const currentMonthName = monthNames[new Date().getMonth()];
  const currentYear      = new Date().getFullYear();
  const billDate         = new Date();
  const fromDate         = `${currentYear}-${(billDate.getMonth()+1).toString().padStart(2,'0')}-01`;
  const lastDay          = new Date(currentYear, billDate.getMonth()+1, 0).getDate();
  const toDate           = `${currentYear}-${(billDate.getMonth()+1).toString().padStart(2,'0')}-${lastDay.toString().padStart(2,'0')}`;

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      invoiceNo:      initialData?.invoiceNo || 'Loading...',
      billDate:       initialData?.billDate  || new Date().toISOString().split('T')[0],
      tenantId:       initialData?.tenantId  || '',
      companyId:      initialData?.companyId || '',
      partyName:      initialData?.partyName || '',
      company:        initialData?.company   || '',
      property:       initialData?.property  || '',
      gstNo:          initialData?.gstNo     || '',
      taxOption:      initialData?.taxOption || 'None',
      items: initialData?.items || [{ particular:'Rental Charges', hsnSac:'997212', month:`${currentMonthName}'${currentYear}`, fromDate, toDate, amount:initialData?.baseRent||0 }],
      crmName:        initialData?.crmName        || '',
      crmPhone:       initialData?.crmPhone       || '',
      crmEmail:       initialData?.crmEmail       || '',
      baseRent:       initialData?.baseRent       || 0,
      cgst:           initialData?.cgst           || 0,
      sgst:           initialData?.sgst           || 0,
      applyGst:       initialData?.cgst > 0 || initialData?.taxOption === 'GST' || false,
      totalInvoice:   initialData?.totalInvoice   || 0,
      receivedAmount: initialData?.receivedAmount || initialData?.received || 0,
      tdsAmount:      initialData?.tdsAmount      || 0,
      balanceAmount:  initialData?.balanceAmount  || initialData?.balance  || 0,
      paymentStatus:  initialData?.paymentStatus  || 'Pending',
      remarks:        initialData?.remarks        || ''
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name:'items' });
  const watchedItems     = watch('items');
  const watchedTaxOption = watch('taxOption');
  const watchedReceived  = watch('receivedAmount');
  const watchedTds       = watch('tdsAmount');
  const watchBaseRent    = watch('baseRent');
  const watchCgst        = watch('cgst');
  const watchApplyGst    = watch('applyGst');
  const watchSgst        = watch('sgst');
  const watchTotalInvoice= watch('totalInvoice');
  const watchBalance     = watch('balanceAmount');
  const watchPaymentStatus=watch('paymentStatus');
  const watchPartyName   = watch('partyName');
  const watchCompany     = watch('company');

  // Fetch next invoice number when companyId or taxOption changes
  const watchedCompanyId  = watch('companyId');
  const watchedTaxOpt     = watch('taxOption');

  useEffect(() => {
    if (initialData?.invoiceNo) return; // editing — keep existing
    if (!watchedCompanyId)      return; // wait for company selection

    const apiBase = (import.meta as any).env?.VITE_API_URL || '';
    axios.get(`${apiBase}/api/invoices/next-no`, {
      params: { companyId: watchedCompanyId, taxOption: watchedTaxOpt || 'None' }
    })
    .then(r => { if (r.data?.invoiceNo) setValue('invoiceNo', r.data.invoiceNo); })
    .catch(() => {
      const now  = new Date();
      const isGST = watchedTaxOpt === 'GST';
      if (isGST) {
        const nxt = String(now.getFullYear() + 1).slice(-2);
        setValue('invoiceNo', `${now.getFullYear()}${nxt}001`);
      } else {
        const yr = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
        setValue('invoiceNo', `FY${String(yr).slice(-2)}-${String(yr+1).slice(-2)}/01`);
      }
    });
  }, [watchedCompanyId, watchedTaxOpt]);

  // Auto-calc GST only when taxOption changes (not every item change)
  useEffect(() => {
    const sub    = watchedItems.reduce((a,i) => a+(Number(i.amount)||0), 0);
    const isGST  = watchedTaxOption === 'GST';
    const apply  = isGST && watch('applyGst');
    const cgstV  = apply ? Number((sub*0.09).toFixed(2)) : 0;
    const sgstV  = apply ? Number((sub*0.09).toFixed(2)) : 0;
    setValue('cgst', cgstV);
    setValue('sgst', sgstV);
  }, [watchedTaxOption]);

  // Recalculate total whenever amounts/gst change
  useEffect(() => {
    const sub   = watchedItems.reduce((a,i) => a+(Number(i.amount)||0), 0);
    const cgstV = Number(watch('cgst')) || 0;
    const sgstV = Number(watch('sgst')) || 0;
    const total = Number((sub + cgstV + sgstV).toFixed(2));
    const bal   = Number((total-(watchedReceived+watchedTds)).toFixed(2));
    let status: any = bal<=0?'Paid':watchedReceived>0?'Partial':'Pending';
    setValue('baseRent', sub);
    setValue('totalInvoice', total);
    setValue('balanceAmount', bal);
    setValue('paymentStatus', status);
  }, [watchedItems, watchCgst, watchSgst, watchedReceived, watchedTds, setValue]);

  const handleTenantChange = (id: string) => {
    const t = tenants.find((t: Tenant) => t.id===id);
    if (t) {
      const co = companies.find((c: any) => c.companyName===t.company);
      setValue('tenantId',id); setValue('companyId',co?.id||'');
      setValue('partyName',t.name); setValue('company',t.company);
      setValue('property',t.property); setValue('gstNo',t.gstNo);
      if (watchedItems.length>0&&watchedItems[0].particular==='Rental Charges')
        setValue('items.0.amount' as any, t.currentRent);
    }
  };

  const handleCompanyChange = (id: string) => {
    const co = companies.find((c: Company) => c.id===id);
    if (co) { setValue('companyId',id); setValue('company',co.companyName); }
  };

  const onFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const apiBase = (import.meta as any).env?.VITE_API_URL || '';
      const url    = initialData?.id
        ? `${apiBase}/api/invoices/${initialData.id}`
        : `${apiBase}/api/invoices`;
      const method = initialData?.id ? 'PUT' : 'POST';
      const res    = await axios({ url, method, data });
      if (res.status===200||res.status===201) onSuccess();
      else toast.error('Failed to save invoice');
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || 'Error saving invoice';
      console.error('Invoice save error:', err?.response?.data);
      toast.error(msg);
    }
    finally  { setLoading(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <motion.div initial={{scale:0.95,y:20}} animate={{scale:1,y:0}} exit={{scale:0.95,y:20}}
        className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{initialData?'Edit Invoice':'Generate Invoice'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto p-4 md:p-8 space-y-8">
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Invoice No</label>
                <input {...register('invoiceNo')} disabled className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg font-medium opacity-70"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Bill Date</label>
                <input type="date" {...register('billDate')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Billed From (Company)</label>
                <select {...register('companyId')} onChange={e=>handleCompanyChange(e.target.value)} required
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm">
                  <option value="">Select Billing Entity...</option>
                  {Array.isArray(companies)&&companies.map((c:Company)=><option key={c.id} value={c.id}>{c.companyName}</option>)}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Tenant</label>
                <select {...register('tenantId')} onChange={e=>handleTenantChange(e.target.value)} required
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm">
                  <option value="">Choose a tenant...</option>
                  {Array.isArray(tenants)&&tenants.map((t:Tenant)=><option key={t.id} value={t.id}>{t.name} (Code: {t.code})</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Tenant Name</label>
                <input {...register('partyName')} disabled className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg font-medium opacity-70"/>
              </div>
            </div>
          </div>

          {/* ── CRM Contact Details ── */}
          <div style={{ background:'#f8f9fb', borderRadius:14, padding:'16px 20px', border:'1px solid #f0f2f5' }}>
            <p style={{ fontSize:11, fontWeight:800, color:'#1a1a2e', margin:'0 0 12px', display:'flex', alignItems:'center', gap:6 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
              CRM Contact Details
              <span style={{ fontSize:9, color:'#9ba8b5', fontWeight:600 }}>(Optional — shows on invoice)</span>
            </p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">CRM Name</label>
                <input {...register('crmName')} placeholder="e.g. Rahul Sharma"
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">CRM Phone No.</label>
                <input {...register('crmPhone')} placeholder="e.g. 98765 43210" type="tel"
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"/>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">CRM Email</label>
                <input {...register('crmEmail')} placeholder="e.g. rahul@company.com" type="email"
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium"/>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Receipt size={18} className="text-primary"/> Invoice Items
              </h3>
              <button type="button"
                onClick={()=>append({particular:'',hsnSac:'997212',month:`${currentMonthName}'${currentYear}`,fromDate,toDate,amount:0})}
                className="text-xs font-bold text-primary hover:text-orange-600 flex items-center gap-1 py-1 px-3 bg-primary/5 rounded-lg border border-primary/20 transition-all">
                <Plus size={14}/> Add Charge Item
              </button>
            </div>
            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  <tr>
                    {['Particular','HSN/SAC','Month','From Date','To Date','Amount',''].map(h=>(
                      <th key={h} className="px-4 py-3">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field,index)=>(
                    <tr key={field.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-2 py-2"><input {...register(`items.${index}.particular` as const)} placeholder="e.g. Rental Charges" className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-medium"/></td>
                      <td className="px-2 py-2"><input {...register(`items.${index}.hsnSac` as const)} className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-medium"/></td>
                      <td className="px-2 py-2"><input {...register(`items.${index}.month` as const)} className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-medium"/></td>
                      <td className="px-2 py-2"><input type="date" {...register(`items.${index}.fromDate` as const)} className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-[11px] font-medium"/></td>
                      <td className="px-2 py-2"><input type="date" {...register(`items.${index}.toDate` as const)} className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-[11px] font-medium"/></td>
                      <td className="px-2 py-2"><input type="number" step="0.01" {...register(`items.${index}.amount` as const,{valueAsNumber:true})} className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-bold text-right"/></td>
                      <td className="px-2 py-2">{fields.length>1&&<button type="button" onClick={()=>remove(index)} className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"><Trash2 size={14}/></button>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-6">
              {/* Invoice Type */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Invoice Type</label>
                <select {...register('taxOption')} className="w-full px-4 py-2 bg-white border-2 border-primary/40 rounded-lg focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-primary shadow-sm hover:bg-slate-50 cursor-pointer">
                  <option value="None">Non-GST Invoice (FY26-27/01...)</option>
                  <option value="GST">GST Invoice (202627001...)</option>
                </select>
              </div>

              {/* Apply GST Toggle — only shown for GST invoice */}
              {watchedTaxOption === 'GST' && (
                <div style={{ padding:'14px 16px', borderRadius:14, background:'#fff7ed', border:'1.5px solid rgba(249,115,22,0.25)' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom: watchApplyGst ? 14 : 0 }}>
                    <div>
                      <p style={{ fontSize:12, fontWeight:800, color:'#1a1a2e', margin:0 }}>Apply GST on this Invoice?</p>
                      <p style={{ fontSize:10, color:'#9ba8b5', margin:'2px 0 0' }}>Toggle to include/exclude GST</p>
                    </div>
                    {/* Toggle Switch */}
                    <label style={{ position:'relative', display:'inline-block', width:44, height:24, cursor:'pointer', flexShrink:0 }}>
                      <input type="checkbox" {...register('applyGst')}
                        style={{ opacity:0, width:0, height:0, position:'absolute' }}
                        onChange={e => {
                          const apply = e.target.checked;
                          setValue('applyGst', apply);
                          const sub = watchedItems.reduce((a,i) => a+(Number(i.amount)||0), 0);
                          setValue('cgst', apply ? Number((sub*0.09).toFixed(2)) : 0);
                          setValue('sgst', apply ? Number((sub*0.09).toFixed(2)) : 0);
                        }}
                      />
                      <span style={{
                        position:'absolute', inset:0, borderRadius:12, transition:'0.3s',
                        background: watchApplyGst ? '#f97316' : '#e2e8f0',
                      }}/>
                      <span style={{
                        position:'absolute', left: watchApplyGst ? 22 : 2, top:2,
                        width:20, height:20, borderRadius:'50%', background:'#fff',
                        transition:'0.3s', boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
                      }}/>
                    </label>
                  </div>

                  {/* Manual CGST / SGST inputs */}
                  {watchApplyGst && (
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                      <div>
                        <label style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:4 }}>
                          CGST Amount (₹)
                        </label>
                        <input type="number" step="0.01" min="0"
                          {...register('cgst', { valueAsNumber: true })}
                          style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1.5px solid #f0f2f5', fontSize:13, fontWeight:700, color:'#1a1a2e', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <label style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.06em', display:'block', marginBottom:4 }}>
                          SGST Amount (₹)
                        </label>
                        <input type="number" step="0.01" min="0"
                          {...register('sgst', { valueAsNumber: true })}
                          style={{ width:'100%', padding:'8px 12px', borderRadius:10, border:'1.5px solid #f0f2f5', fontSize:13, fontWeight:700, color:'#1a1a2e', fontFamily:'inherit', outline:'none', boxSizing:'border-box' }}
                          placeholder="0.00"
                        />
                      </div>
                      <div style={{ gridColumn:'1/-1', fontSize:11, color:'#9ba8b5', fontStyle:'italic' }}>
                        💡 Default is 9% each. Edit manually if needed.
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Information Preview</h3>
                <div><p className="text-[10px] text-slate-400 uppercase font-bold">Party Name</p><p className="font-bold text-slate-700">{watchPartyName||'N/A'}</p></div>
                <div><p className="text-[10px] text-slate-400 uppercase font-bold">Company</p><p className="font-bold text-slate-700">{watchCompany||'N/A'}</p></div>
              </div>
            </div>
            <div className="bg-slate-900 rounded-[28px] p-8 text-white shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-16 -mt-16"/>
              <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Financial Summary</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center text-slate-400 text-sm"><span>SubTotal</span><span className="font-bold text-white">{formatCurrency(watchBaseRent)}</span></div>
                {watchedTaxOption==='GST' && watchApplyGst && watchCgst > 0 && <>
                  <div className="flex justify-between items-center text-slate-400 text-xs"><span>CGST</span><span className="font-bold text-white">{formatCurrency(watchCgst)}</span></div>
                  <div className="flex justify-between items-center text-slate-400 text-xs"><span>SGST</span><span className="font-bold text-white">{formatCurrency(watchSgst)}</span></div>
                </>}
                {watchedTaxOption==='GST' && !watchApplyGst && (
                  <div className="flex justify-between items-center text-slate-400 text-xs opacity-50"><span>GST (Not Applied)</span><span>₹ 0</span></div>
                )}
                <div className="h-px bg-white/10 my-4"/>
                <div className="flex justify-between items-end">
                  <div><p className="text-[10px] text-primary font-black uppercase tracking-wider">Total Payable</p><p className="text-3xl font-black">{formatCurrency(watchTotalInvoice)}</p></div>
                  <div className="text-right"><p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Received</p><input type="number" {...register('receivedAmount',{valueAsNumber:true})} className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-right text-sm font-bold focus:bg-white/20 outline-none transition-all"/></div>
                </div>
                <div className="flex justify-between items-center pt-2">
                  <div className="flex flex-col"><span className="text-[10px] text-slate-400 font-bold uppercase">TDS Deducted</span><input type="number" {...register('tdsAmount',{valueAsNumber:true})} className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-right text-xs font-bold focus:bg-white/20 outline-none transition-all mt-1"/></div>
                  <div className="text-right"><span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Balance Due</span><p className={cn("text-lg font-black",watchBalance>0?"text-rose-400":"text-emerald-400")}>{formatCurrency(watchBalance)}</p></div>
                </div>
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status:</span>
                  <span className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",watchPaymentStatus==='Paid'?"bg-emerald-500/20 text-emerald-400 border border-emerald-500/30":watchPaymentStatus==='Partial'?"bg-amber-500/20 text-amber-400 border border-amber-500/30":"bg-rose-500/20 text-rose-400 border border-rose-500/30")}>{watchPaymentStatus}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Notes</label>
            <textarea {...register('remarks')} placeholder="Internal notes..." className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-24"/>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-md font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancel</button>
          <button onClick={handleSubmit(onFormSubmit)} disabled={loading}
            className="px-10 py-3 bg-primary text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-[0_10px_20px_-10px_rgba(249,115,22,0.5)] disabled:opacity-50 flex items-center gap-2">
            {loading?<Loader2 size={18} className="animate-spin"/>:<ShieldCheck size={18}/>}
            {loading?'Processing...':(initialData?'Update & Finalize':'Generate & Save Invoice')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── ViewInvoiceModal ─────────────────────────────────────────────────────────
export function ViewInvoiceModal({ invoice, tenant, company, onClose }: {
  invoice: Invoice; tenant?: Tenant; company?: Company; onClose: () => void;
}) {
  const [showApprove,    setShowApprove]    = React.useState(false);
  const [currentInvoice, setCurrentInvoice] = React.useState<any>(invoice);
  const [downloading,    setDownloading]    = useState(false);

  React.useEffect(() => { setCurrentInvoice(invoice); }, [invoice]);

  const handleDownloadPDF = () => {
    setDownloading(true);
    try {
      generateInvoicePDF(currentInvoice, tenant, company);
      toast.success('PDF downloaded!');
    } catch (e:any) { toast.error('PDF failed: ' + e.message); }
    finally { setDownloading(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      style={{position:'fixed',inset:0,zIndex:150,background:'rgba(0,0,0,0.75)',backdropFilter:'blur(4px)',overflowY:'auto'}}>

      {/* ── Top Action Bar ── */}
      <div style={{position:'fixed',top:14,right:14,display:'flex',gap:10,zIndex:160,alignItems:'center'}}>

        {/* Approved badge */}
        {currentInvoice.approved && (
          <div style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',background:'#f0fdf4',border:'1.5px solid #86efac',borderRadius:9}}>
            <CheckCircle size={14} color="#10b981"/>
            <span style={{fontSize:12,fontWeight:700,color:'#15803d'}}>Approved</span>
          </div>
        )}

        {/* Approve & Sign — only if not approved */}
        {!currentInvoice.approved && (
          <button onClick={() => setShowApprove(true)}
            style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',
              background:'linear-gradient(135deg,#f97316,#ea580c)',
              color:'#fff',border:'none',borderRadius:9,cursor:'pointer',fontWeight:700,fontSize:13,fontFamily:'inherit',
              boxShadow:'0 4px 16px rgba(249,115,22,0.4)'}}>
            <Shield size={14}/> Approve & Sign
          </button>
        )}

        {/* Download PDF */}
        <button onClick={handleDownloadPDF} disabled={downloading}
          style={{display:'flex',alignItems:'center',gap:7,padding:'9px 18px',background:'#fff',borderRadius:9,boxShadow:'0 4px 20px rgba(0,0,0,0.18)',border:'none',cursor:'pointer',fontWeight:700,fontSize:13,fontFamily:'inherit'}}>
          {downloading
            ? <div style={{width:14,height:14,border:'2px solid #ddd',borderTopColor:'#f97316',borderRadius:'50%',animation:'spin 1s linear infinite'}}/>
            : <Download size={14}/>}
          {downloading ? 'Generating...' : 'Download PDF'}
        </button>

        <button onClick={onClose}
          style={{padding:'9px 16px',background:'#1a1a2e',color:'#fff',border:'none',borderRadius:9,cursor:'pointer',display:'flex',alignItems:'center',gap:6,fontWeight:700,fontSize:13,fontFamily:'inherit'}}>
          <X size={14}/> Close
        </button>
      </div>

      {/* ── Invoice Preview ── */}
      <div style={{padding:'64px 16px 32px',display:'flex',justifyContent:'center'}}>
        <InvoicePreview invoice={currentInvoice} tenant={tenant} company={company}/>
      </div>

      {/* ── Approve Signature Modal ── */}
      {showApprove && (
        <ApproveSignatureModal
          invoice={currentInvoice}
          company={company}
          onClose={() => setShowApprove(false)}
          onSuccess={(updated) => {
            setCurrentInvoice(updated);
            setShowApprove(false);
            toast.success('✅ Invoice approved & signed!');
          }}
        />
      )}
    </motion.div>
  );
}
