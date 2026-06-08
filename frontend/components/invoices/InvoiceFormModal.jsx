import React, { useState, useEffect, useRef } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import Select from 'react-select';
import axios from 'axios';
import {
  Plus, X, Trash2, Download, ShieldCheck, Shield, CheckCircle, Loader2,
  ReceiptIndianRupee, Upload, Calendar, Building, AlertCircle,
  Eye, FileText, IndianRupee, CheckCircle2, Clock, Filter,
  Receipt
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { PDFDocument } from 'pdf-lib';
import imageCompression from 'browser-image-compression';
//import { ApproveSignatureModal } from './ApproveSignatureModal.jsx';

// ── Invoice Form Modal ───────────────────────────────────────────────────────
export function InvoiceFormModal({ tenants = [], companies, otherParties = [], onClose, onSuccess, initialData, initialPartyType, initialOtherPartyId }) {
  const [loading,   setLoading]   = useState(false);
  const [partyType, setPartyType] = useState(
    initialData?.partyType || (initialData?.otherPartyId ? 'OtherParty' : (initialPartyType || 'Tenant'))
  );

  const [localTenants, setLocalTenants] = useState(tenants);
  const [localOtherParties, setLocalOtherParties] = useState(otherParties);

  useEffect(() => {
    if (tenants && tenants.length > 0) {
      setLocalTenants(tenants);
    } else {
      axios.get('/api/tenants')
        .then(r => setLocalTenants(Array.isArray(r.data) ? r.data : []))
        .catch(() => {});
    }
  }, [tenants]);

  useEffect(() => {
    if (otherParties && otherParties.length > 0) {
      setLocalOtherParties(otherParties);
    } else {
      axios.get('/api/other-parties')
        .then(r => setLocalOtherParties(Array.isArray(r.data) ? r.data : []))
        .catch(() => {});
    }
  }, [otherParties]);

  // Auto-fill party details when opened from OtherParty billing tab
  useEffect(() => {
    if (initialOtherPartyId && initialPartyType === 'OtherParty' && !initialData) {
      const party = localOtherParties.find(p => 
        (p.id || p._id) === initialOtherPartyId || 
        String(p.id || p._id) === String(initialOtherPartyId)
      );
      if (party) {
        setValue('otherPartyId',  String(party.id || party._id));
        setValue('partyType',     'OtherParty');
        setValue('partyName',     party.name || '');
        setValue('company',       party.company || '');
        setValue('property',      party.property || '');
        setValue('gstNo',         party.gstNo || '');
        if (party.currentRent)    setValue('items[0].amount', party.currentRent);
        if (party.company) {
          // Auto-select company
          const co = companies?.find(c => c.companyName === party.company);
          if (co) setValue('companyId', String(co.id || co._id));
        }
      }
    }
  }, [initialOtherPartyId, localOtherParties]);
  
  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const currentMonthName = monthNames[new Date().getMonth()];
  const currentYear = new Date().getFullYear();
  
  const billDate = new Date();
  const fromDate = `${currentYear}-${(billDate.getMonth() + 1).toString().padStart(2, '0')}-01`;
  const lastDay = new Date(currentYear, billDate.getMonth() + 1, 0).getDate();
  const toDate = `${currentYear}-${(billDate.getMonth() + 1).toString().padStart(2, '0')}-${lastDay.toString().padStart(2, '0')}`;

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: {
      invoiceNo: initialData?.invoiceNo || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      billDate: initialData?.billDate || new Date().toISOString().split('T')[0],
      tenantId: initialData?.tenantId || '',
      otherPartyId: initialData?.otherPartyId || initialOtherPartyId || '',
      partyType: initialData?.partyType || initialPartyType || 'Tenant',
      companyId: initialData?.companyId || '',
      partyName: initialData?.partyName || '',
      company: initialData?.company || '',
      property: initialData?.property || '',
      gstNo: initialData?.gstNo || '',
      taxOption: initialData?.taxOption || 'None',
      items: initialData?.items || [
        { 
          particular: 'Rental Charges', 
          hsnSac: '997212', 
          month: `${currentMonthName}'${currentYear}`, 
          fromDate: fromDate, 
          toDate: toDate, 
          amount: initialData?.baseRent || 0 
        }
      ],
      baseRent: initialData?.baseRent || 0,
      cgst:      initialData?.cgst  || 0,
      sgst:      initialData?.sgst  || 0,
      applyGst:  (initialData?.cgst || 0) > 0,
      crmName:   (initialData)?.crmName  || '',
      crmPhone:  (initialData)?.crmPhone || '',
      crmEmail:  (initialData)?.crmEmail || '',
      totalInvoice: initialData?.totalInvoice || 0,
      receivedAmount: initialData?.receivedAmount || initialData?.received || 0,
      tdsAmount: initialData?.tdsAmount || 0,
      balanceAmount: initialData?.balanceAmount || initialData?.balance || 0,
      paymentStatus: initialData?.paymentStatus || 'Pending',
      remarks: initialData?.remarks || ''
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "items"
  });

  const watchedItems = watch("items");
  const watchedTaxOption = watch("taxOption");
  const watchedReceived = watch("receivedAmount");
  const watchedTds = watch("tdsAmount");

  // Auto calculation logic
  useEffect(() => {
    const subTotal = watchedItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const isGST = watchedTaxOption === 'GST';
    const cgstValue = isGST ? Number((subTotal * 0.09).toFixed(2)) : 0;
    const sgstValue = isGST ? Number((subTotal * 0.09).toFixed(2)) : 0;
    const totalValue = Number((subTotal + cgstValue + sgstValue).toFixed(2));
    const balanceValue = Number((totalValue - (watchedReceived + watchedTds)).toFixed(2));
    
    let status = 'Pending';
    if (balanceValue <= 0) status = 'Paid';
    else if (watchedReceived > 0) status = 'Partial';

    setValue('baseRent', subTotal);
    setValue('cgst', cgstValue);
    setValue('sgst', sgstValue);
    setValue('totalInvoice', totalValue);
    setValue('balanceAmount', balanceValue);
    setValue('paymentStatus', status);
  }, [watchedItems, watchedTaxOption, watchedReceived, watchedTds, setValue]);

  const handleTenantChange = (id) => {
    const tenant = localTenants.find((t) => t.id === id);
    if (tenant) {
      const companyRef = companies.find((c) => c.companyName === tenant.company);
      setValue('tenantId', id);
      setValue('companyId', companyRef?.id || '');
      setValue('partyName', tenant.name);
      setValue('company', tenant.company);
      setValue('property', tenant.property);
      setValue('gstNo', tenant.gstNo);
      
      if (watchedItems.length > 0 && watchedItems[0].particular === 'Rental Charges') {
        setValue(`items.0.amount`, tenant.currentRent);
      }
    }
  };

  const handleOtherPartyChange = (id) => {
    const party = localOtherParties.find((p) => p.id === id || p._id === id);
    if (party) {
      setValue('otherPartyId', id);
      setValue('tenantId', '');
      setValue('partyType', 'OtherParty');
      setValue('partyName', party.name);
      setValue('company',   party.company || party.companyName || '');
      setValue('property',  party.property || party.address || '');
      setValue('gstNo',     party.gstNo || '');

      // Auto-fill amount if party has currentRent set
      const rent = Number(party.currentRent) || 0;
      if (rent > 0 && watchedItems.length > 0) {
        setValue('items.0.amount', rent);
      }

      // Auto-select company if party has a matching company
      const partyCompanyName = party.company || party.companyName || '';
      if (partyCompanyName) {
        const matchedCompany = companies.find((c) =>
          c.companyName?.toLowerCase() === partyCompanyName.toLowerCase()
        );
        if (matchedCompany) {
          setValue('companyId', matchedCompany.id);
        }
      }
      // If only one company exists, auto-select it
      if (!partyCompanyName && companies.length === 1) {
        setValue('companyId', companies[0].id);
        setValue('company', companies[0].companyName);
      }
    }
  };

  const handleCompanyChange = (id) => {
    const company = companies.find((c) => c.id === id);
    if (company) {
      setValue('companyId', id);
      setValue('company', company.companyName);
    }
  };

  const onFormSubmit = async (data) => {
    setLoading(true);
    try {
      // Attach partyType so backend knows which collection
      data.partyType = partyType;
      if (partyType === 'OtherParty') data.tenantId    = undefined;
      else                             data.otherPartyId = undefined;

      const url    = initialData?.id ? `/api/invoices/${initialData.id}` : '/api/invoices';
      const method = initialData?.id ? 'PUT' : 'POST';

      const res = await axios({ url, method, data });
      if (res.status === 200 || res.status === 201) onSuccess();
      else toast.error('Failed to save invoice');
    } catch (err) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'Error saving invoice';
      toast.error(msg);
      console.error('Invoice save error:', err?.response?.data || err);
    } finally {
      setLoading(false);
    }
  };

  const watchBaseRent = watch("baseRent");
  const watchApplyGst = watch("applyGst");
  const watchCgst = watch("cgst");
  const watchSgst = watch("sgst");
  const watchTotalInvoice = watch("totalInvoice");
  const watchBalance = watch("balanceAmount");
  const watchPaymentStatus = watch("paymentStatus");
  const watchPartyName = watch("partyName");
  const watchCompany = watch("company");

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">{initialData ? 'Edit Invoice' : 'Generate Invoice'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Invoice No</label>
                <input {...register("invoiceNo")} disabled className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg font-medium opacity-70" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Bill Date</label>
                <input type="date" {...register("billDate")} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium" />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Billed From (Company)</label>
                <select 
                  className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                  value={watch('companyId') || ''}
                  onChange={(e) => handleCompanyChange(e.target.value)}
                  required
                >
                  <option value="">Select Billing Entity...</option>
                  {Array.isArray(companies) && companies.map((c) => (
                    <option key={c.id} value={c.id}>{c.companyName}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* ── Invoice For toggle ── */}
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Invoice For</label>
              <div style={{ display:'flex', gap:8 }}>
                {(['Tenant','OtherParty']).map(type => (
                  <button key={type} type="button"
                    onClick={() => {
                      setPartyType(type);
                      setValue('tenantId',''); setValue('otherPartyId','');
                      setValue('partyName',''); setValue('property',''); setValue('gstNo','');
                    }}
                    style={{ padding:'7px 20px', borderRadius:9, border:'none', cursor:'pointer', fontSize:12, fontWeight:700, transition:'all 0.15s',
                      background: partyType===type ? '#f97316' : '#f8fafc',
                      color:      partyType===type ? '#fff'    : '#64748b',
                      boxShadow:  partyType===type ? '0 2px 8px rgba(249,115,22,0.3)' : 'none',
                    }}>
                    {type==='Tenant' ? '🏢 Tenant' : '👤 Other Party'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {partyType==='Tenant' ? 'Select Tenant' : 'Select Other Party'}
                </label>
                {partyType==='Tenant' ? (
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                    value={watch('tenantId') || ''}
                    onChange={(e) => handleTenantChange(e.target.value)}
                    required={partyType==='Tenant'}
                  >
                    <option value="">Choose a tenant...</option>
                    {Array.isArray(localTenants) && localTenants.map((t) => (
                      <option key={t.id} value={t.id}>{t.name} (Code: {t.code})</option>
                    ))}
                  </select>
                ) : (
                  <select
                    className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
                    value={watch('otherPartyId') || ''}
                    onChange={(e) => handleOtherPartyChange(e.target.value)}
                    required={partyType==='OtherParty'}
                  >
                    <option value="">Choose other party...</option>
                    {Array.isArray(localOtherParties) && localOtherParties.map((p) => (
                      <option key={p.id||p._id} value={p.id||p._id}>{p.name} (Code: {p.code})</option>
                    ))}
                  </select>
                )}
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">
                  {partyType==='Tenant' ? 'Tenant Name' : 'Party Name'}
                </label>
                <input {...register("partyName")} disabled className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg font-medium opacity-70" />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                <Receipt size={18} className="text-primary" />
                Invoice Items
              </h3>
              <button 
                type="button"
                onClick={() => append({ particular: '', hsnSac: '997212', month: `${currentMonthName}'${currentYear}`, fromDate: fromDate, toDate: toDate, amount: 0 })}
                className="text-xs font-bold text-primary hover:text-orange-600 flex items-center gap-1 py-1 px-3 bg-primary/5 rounded-lg border border-primary/20 transition-all"
              >
                <Plus size={14} /> Add Charge Item
              </button>
            </div>

            <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left">
                <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 min-w-[200px]">Particular</th>
                    <th className="px-4 py-3">HSN/SAC</th>
                    <th className="px-4 py-3">Month</th>
                    <th className="px-4 py-3">From Date</th>
                    <th className="px-4 py-3">To Date</th>
                    <th className="px-4 py-3 w-32">Amount</th>
                    <th className="px-4 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {fields.map((field, index) => (
                    <tr key={field.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-2 py-2">
                        <input 
                          {...register(`items.${index}.particular`)} 
                          placeholder="e.g. Rental Charges"
                          className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-medium"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          {...register(`items.${index}.hsnSac`)} 
                          placeholder="HSN/SAC"
                          className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-medium"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          {...register(`items.${index}.month`)} 
                          placeholder="Month'Year"
                          className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-medium"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          type="date"
                          {...register(`items.${index}.fromDate`)} 
                          className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-[11px] font-medium"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          type="date"
                          {...register(`items.${index}.toDate`)} 
                          className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-[11px] font-medium"
                        />
                      </td>
                      <td className="px-2 py-2">
                        <input 
                          type="number"
                          step="0.01"
                          {...register(`items.${index}.amount`, { valueAsNumber: true })} 
                          className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-bold text-right"
                        />
                      </td>
                      <td className="px-2 py-2">
                        {fields.length > 1 && (
                          <button 
                            type="button" 
                            onClick={() => remove(index)}
                            className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
             <div className="space-y-6">
                <div className="flex flex-col gap-1.5">
                  <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Tax Calculation Mode</label>
                  <select 
                    className="w-full px-4 py-2 bg-white border-2 border-primary/40 rounded-lg focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-primary shadow-sm hover:bg-slate-50 cursor-pointer"
                    value={watch('taxOption') || 'None'}
                    onChange={e => {
                      const val = e.target.value;
                      setValue('taxOption', val);
                      const sub = watchedItems.reduce((a, i) => a + (Number(i.amount) || 0), 0);
                      if (val === 'GST') {
                        setValue('applyGst', true);
                        setValue('cgst', Number((sub * 0.09).toFixed(2)));
                        setValue('sgst', Number((sub * 0.09).toFixed(2)));
                      } else {
                        setValue('applyGst', false);
                        setValue('cgst', 0);
                        setValue('sgst', 0);
                      }
                    }}
                  >
                    <option value="None">None (0% Tax)</option>
                    <option value="GST">GST (CGST 9% + SGST 9%)</option>
                  </select>
                </div>

                {/* ── Apply GST Toggle ── */}
                {watchedTaxOption === 'GST' && (
                  <div style={{padding:'12px 14px',borderRadius:12,background:'#fff7ed',border:'1.5px solid rgba(249,115,22,0.25)'}}>
                    <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom: watchApplyGst ? 12 : 0}}>
                      <div>
                        <p style={{fontSize:11,fontWeight:800,color:'#1a1a2e',margin:0}}>Apply GST on this Invoice?</p>
                        <p style={{fontSize:10,color:'#9ba8b5',margin:'2px 0 0'}}>Toggle to include/exclude GST</p>
                      </div>
                      <label style={{position:'relative',display:'inline-block',width:44,height:24,cursor:'pointer',flexShrink:0}}>
                        <input type="checkbox" {...register('applyGst')}
                          style={{opacity:0,width:0,height:0,position:'absolute'}}
                          onChange={e=>{
                            const apply=e.target.checked; setValue('applyGst',apply);
                            const sub=watchedItems.reduce((a,i)=>a+(Number(i.amount)||0),0);
                            setValue('cgst',apply?Number((sub*0.09).toFixed(2)):0);
                            setValue('sgst',apply?Number((sub*0.09).toFixed(2)):0);
                          }}/>
                        <span style={{position:'absolute',inset:0,borderRadius:12,transition:'0.3s',background:watchApplyGst?'#f97316':'#e2e8f0'}}/>
                        <span style={{position:'absolute',left:watchApplyGst?22:2,top:2,width:20,height:20,borderRadius:'50%',background:'#fff',transition:'0.3s'}}/>
                      </label>
                    </div>
                    {watchApplyGst && (
                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:'#9ba8b5',textTransform:'uppercase',display:'block',marginBottom:4}}>CGST (₹)</label>
                          <input type="number" step="0.01" min="0" {...register('cgst',{valueAsNumber:true})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none"/>
                        </div>
                        <div>
                          <label style={{fontSize:10,fontWeight:700,color:'#9ba8b5',textTransform:'uppercase',display:'block',marginBottom:4}}>SGST (₹)</label>
                          <input type="number" step="0.01" min="0" {...register('sgst',{valueAsNumber:true})} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm font-bold outline-none"/>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* ── CRM Contact Details ── */}
                <div style={{background:'#f8f9fb',borderRadius:12,padding:'12px 14px',border:'1px solid #f0f2f5'}}>
                  <p style={{fontSize:10,fontWeight:800,color:'#1a1a2e',margin:'0 0 8px',display:'flex',alignItems:'center',gap:5}}>
                    <span>👤</span> CRM Contact Details <span style={{fontSize:9,color:'#9ba8b5'}}>(Optional)</span>
                  </p>
                  <div style={{display:'flex',flexDirection:'column',gap:8}}>
                    <div>
                      <label style={{fontSize:9,fontWeight:700,color:'#9ba8b5',textTransform:'uppercase',display:'block',marginBottom:3}}>CRM Name</label>
                      <input {...register('crmName')} placeholder="e.g. Rahul Sharma" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"/>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label style={{fontSize:9,fontWeight:700,color:'#9ba8b5',textTransform:'uppercase',display:'block',marginBottom:3}}>Phone</label>
                        <input {...register('crmPhone')} placeholder="98765 43210" type="tel" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"/>
                      </div>
                      <div>
                        <label style={{fontSize:9,fontWeight:700,color:'#9ba8b5',textTransform:'uppercase',display:'block',marginBottom:3}}>Email</label>
                        <input {...register('crmEmail')} placeholder="crm@company.com" type="email" className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-sm outline-none"/>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                  <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Information Preview</h3>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Party Name</p>
                    <p className="font-bold text-slate-700">{watchPartyName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Company</p>
                    <p className="font-bold text-slate-700">{watchCompany || 'N/A'}</p>
                  </div>
                </div>
             </div>

             <div className="bg-slate-900 rounded-[28px] p-8 text-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-16 -mt-16"></div>
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Financial Summary</h3>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center text-slate-400 text-sm">
                    <span>SubTotal (All Items)</span>
                    <span className="font-bold text-white">₹{watchBaseRent.toLocaleString()}</span>
                  </div>
                  
                  {watchedTaxOption === 'GST' && (
                    <>
                      <div className="flex justify-between items-center text-slate-400 text-xs">
                        <span>CGST (9%)</span>
                        <span className="font-bold text-white">₹{watchCgst.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-slate-400 text-xs">
                        <span>SGST (9%)</span>
                        <span className="font-bold text-white">₹{watchSgst.toLocaleString()}</span>
                      </div>
                    </>
                  )}
                  
                  <div className="h-px bg-white/10 my-4"></div>
                  
                  <div className="flex justify-between items-end">
                    <div>
                      <p className="text-[10px] text-primary font-black uppercase tracking-wider">Total Payable</p>
                      <p className="text-3xl font-black">₹{watchTotalInvoice.toLocaleString()}</p>
                    </div>
                    <div className="text-right">
                       <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Received</p>
                       <input 
                         type="number" 
                         {...register("receivedAmount", { valueAsNumber: true })}
                         className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-right text-sm font-bold focus:bg-white/20 outline-none transition-all"
                       />
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-2">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-slate-400 font-bold uppercase">TDS Deducted</span>
                      <input 
                         type="number" 
                         {...register("tdsAmount", { valueAsNumber: true })}
                         className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-right text-xs font-bold focus:bg-white/20 outline-none transition-all mt-1"
                       />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Balance Due</span>
                      <p className={cn("text-lg font-black", watchBalance > 0 ? "text-rose-400" : "text-emerald-400")}>
                        ₹{watchBalance.toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status:</span>
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest",
                      watchPaymentStatus === 'Paid' ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                      watchPaymentStatus === 'Partial' ? "bg-amber-500/20 text-amber-400 border border-amber-500/30" :
                      "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                    )}>
                      {watchPaymentStatus}
                    </span>
                  </div>
                </div>
             </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Notes</label>
            <textarea 
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-24"
              {...register("remarks")}
              placeholder="Internal notes or specific instructions..."
            />
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-md font-bold text-slate-500 hover:bg-slate-200 transition-colors">Cancel</button>
          <button 
            onClick={handleSubmit(onFormSubmit)}
            disabled={loading}
            className="px-10 py-3 bg-primary text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-[0_10px_20px_-10px_rgba(249,115,22,0.5)] disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {loading ? 'Processing...' : (initialData ? 'Update & Finalize' : 'Generate & Save Invoice')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── View Invoice Modal ───────────────────────────────────────────────────────