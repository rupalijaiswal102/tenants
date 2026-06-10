import { useState, useEffect } from 'react';
import { X, History, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { cn } from '@/lib/utils';
import { FormInput } from './TenantPrimitives.jsx';
import { formatCurrency } from '../../src/utils/formatCurrency.js';

// ── Opening Balance Adjustment Modal ─────────────────────────────────────────
export function OpeningAdjustmentModal({ tenant, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date:          new Date().toISOString().split('T')[0],
    amount:        0,
    type:          'ADJUSTMENT',
    adjustmentSide:'DEBIT',   // ← NEW: DEBIT or CREDIT
    particular:    'Adjustment',
    notes:         ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.amount <= 0) { toast.error('Amount must be greater than 0'); return; }
    setLoading(true);
    try {
      // Debit or Credit based on adjustmentSide
      const isDebit  = formData.adjustmentSide === 'DEBIT';
      const apiBase  = import.meta.env?.VITE_API_URL || '';
      await axios.post(`${apiBase}/api/ledger/entry`, {
        tenantId:   tenant.id,
        date:       formData.date,
        type:       formData.type,
        particular: formData.particular,
        debit:      isDebit  ? formData.amount : 0,   // ← Debit column
        credit:     !isDebit ? formData.amount : 0,   // ← Credit column
        notes:      formData.notes,
      });
      toast.success(`${formData.adjustmentSide} Adjustment saved!`);
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save adjustment');
    } finally { setLoading(false); }
  };

  const isDebit = formData.adjustmentSide === 'DEBIT';

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{scale:0.9,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.9,opacity:0,y:20}}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 md:p-8 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shadow-inner">
              <History size={20}/>
            </div>
            <div>
              <h3 className="font-black text-slate-800 tracking-tight">Ledger Adjustment</h3>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">{tenant.name}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 md:p-8 space-y-5 overflow-y-auto">

          {/* ── Debit / Credit Toggle ── */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 block mb-2">
              Adjustment Side *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {/* DEBIT */}
              <button type="button"
                onClick={() => setFormData({...formData, adjustmentSide:'DEBIT'})}
                style={{
                  padding:'14px 0',
                  borderRadius:14,
                  border: isDebit ? '2px solid #ef4444' : '2px solid #f1f5f9',
                  background: isDebit ? '#fff1f2' : '#f8f9fb',
                  color: isDebit ? '#ef4444' : '#94a3b8',
                  fontWeight:800, fontSize:14, cursor:'pointer',
                  fontFamily:'inherit', transition:'all 0.15s',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                }}>
                <span style={{fontSize:22}}>📤</span>
                <span>DEBIT</span>
                <span style={{fontSize:10, fontWeight:500, opacity:0.7}}>Goes to Debit col</span>
              </button>

              {/* CREDIT */}
              <button type="button"
                onClick={() => setFormData({...formData, adjustmentSide:'CREDIT'})}
                style={{
                  padding:'14px 0',
                  borderRadius:14,
                  border: !isDebit ? '2px solid #10b981' : '2px solid #f1f5f9',
                  background: !isDebit ? '#f0fdf4' : '#f8f9fb',
                  color: !isDebit ? '#10b981' : '#94a3b8',
                  fontWeight:800, fontSize:14, cursor:'pointer',
                  fontFamily:'inherit', transition:'all 0.15s',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                }}>
                <span style={{fontSize:22}}>📥</span>
                <span>CREDIT</span>
                <span style={{fontSize:10, fontWeight:500, opacity:0.7}}>Goes to Credit col</span>
              </button>
            </div>
            {/* Live preview */}
            <div style={{
              marginTop:10, padding:'10px 14px', borderRadius:10,
              background: isDebit ? '#fff1f2' : '#f0fdf4',
              border: `1px solid ${isDebit ? '#fecdd3' : '#86efac'}`,
              fontSize:12, fontWeight:600,
              color: isDebit ? '#ef4444' : '#10b981',
            }}>
              {isDebit
                ? '📤 This amount will appear in DEBIT column (amount going out / charge)'
                : '📥 This amount will appear in CREDIT column (amount received / refund)'}
            </div>
          </div>

          {/* Date + Amount */}
          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Entry Date" type="date" value={formData.date}
              onChange={(v)=>setFormData({...formData,date:v})} required/>
            <FormInput label="Amount (₹)" type="number" value={formData.amount}
              onChange={(v)=>setFormData({...formData,amount:parseFloat(v)||0})} required/>
          </div>

          {/* Particular */}
          <FormInput label="Particular" value={formData.particular}
            onChange={(v)=>setFormData({...formData,particular:v})} required/>

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Notes</label>
            <textarea className="form-input-saas min-h-[80px] py-3 h-auto"
              value={formData.notes} onChange={e=>setFormData({...formData,notes:e.target.value})}
              placeholder="Reason for adjustment..."/>
          </div>

          {/* Submit */}
          <button type="submit" disabled={loading}
            style={{
              width:'100%', padding:'14px 0', borderRadius:16,
              background: isDebit ? '#ef4444' : '#10b981',
              color:'#fff', fontWeight:800, fontSize:15,
              border:'none', cursor:loading?'wait':'pointer',
              fontFamily:'inherit', display:'flex', alignItems:'center',
              justifyContent:'center', gap:8, transition:'all 0.15s',
            }}>
            {loading ? <Loader2 size={18} className="animate-spin"/> : <ShieldCheck size={18}/>}
            {loading ? 'Saving...' : `Save ${formData.adjustmentSide} Adjustment`}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}

// ── Payment Entry Modal ───────────────────────────────────────────────────────
export function PaymentEntryModal({ invoice, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    receivedAmount:      invoice.receivedAmount || invoice.received || 0,
    tdsAmount:           invoice.tdsAmount || 0,
    paymentDate:         invoice.paymentDate || new Date().toISOString().split('T')[0],
    paymentMode:         invoice.paymentMode || 'NEFT',
    transactionRef:      invoice.transactionRef || '',
    latePenaltyPercentage: invoice.latePenaltyPercentage ?? 1.5,
    latePenaltyAmount:   invoice.latePenaltyAmount || 0,
    remarks:             invoice.remarks || ''
  });

  const rentBase = invoice.baseRent || invoice.totalInvoice;
  const calculatedPenalty = Number((rentBase * (formData.latePenaltyPercentage / 100)).toFixed(2));

  useEffect(() => {
    if (calculatedPenalty !== formData.latePenaltyAmount) {
      setFormData(prev => ({ ...prev, latePenaltyAmount: calculatedPenalty }));
    }
  }, [calculatedPenalty]);

  const remainingBalance = (invoice.totalInvoice + calculatedPenalty) - (formData.receivedAmount + formData.tdsAmount);

  const handleSubmit = async (e) => {
    e?.preventDefault();
    setLoading(true);
    try {
      await axios.put(`/api/invoices/${String(invoice.id)}`, formData);
      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Error recording payment');
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[200] flex items-start md:items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto pt-10 md:pt-4">
      <motion.div initial={{scale:0.95,y:20}} animate={{scale:1,y:0}} exit={{scale:0.95,y:20}}
        className="bg-white w-full max-w-lg rounded-[24px] md:rounded-[32px] shadow-2xl overflow-hidden flex flex-col border border-slate-100 my-auto max-h-[90vh]">

        {/* Header */}
        <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between sticky top-0 z-20 bg-white/95 backdrop-blur-sm">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Record Payment</h2>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Invoice #{invoice.invoiceNo}</p>
            <p className="text-[11px] text-primary font-black uppercase tracking-tight">{invoice.partyName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"><X size={24}/></button>
        </div>

        {/* Summary row */}
        <div className="px-6 md:px-8 py-4 bg-slate-50/50 border-b border-slate-50 grid grid-cols-2 gap-3 flex-shrink-0">
          <div className="p-3 bg-white rounded-xl border border-slate-100 shadow-sm">
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total Payable (+Penalty)</p>
            <p className="text-base font-black text-slate-800">{formatCurrency(invoice.totalInvoice + calculatedPenalty)}</p>
          </div>
          <div className={cn('p-3 rounded-xl border shadow-sm', remainingBalance<=0?'bg-emerald-50 border-emerald-100':'bg-rose-50 border-rose-100')}>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Final Balance Due</p>
            <p className={cn('text-base font-black', remainingBalance<=0?'text-emerald-600':'text-rose-600')}>{formatCurrency(Math.max(0, Math.round(remainingBalance)))}</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 md:p-8 space-y-6">
          {/* Penalty */}
          <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-center justify-between">
            <div className="flex flex-col">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Late Payment Penalty (%)</span>
              <input type="number" step="0.1" value={formData.latePenaltyPercentage}
                onChange={e=>setFormData({...formData,latePenaltyPercentage:parseFloat(e.target.value)||0})}
                className="bg-transparent border-b border-amber-200 text-lg font-black text-amber-900 focus:border-amber-500 outline-none w-20"/>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-bold text-amber-700 uppercase tracking-widest block">Penalty Charge</span>
              <span className="text-xl font-black text-amber-900">{formatCurrency(calculatedPenalty)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <FormInput label="Received Amount" type="number" value={formData.receivedAmount} onChange={(v)=>setFormData({...formData,receivedAmount:parseFloat(v)||0})} required/>
            <FormInput label="TDS Amount"       type="number" value={formData.tdsAmount}      onChange={(v)=>setFormData({...formData,tdsAmount:parseFloat(v)||0})}/>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
            <FormInput label="Payment Date" type="date"   value={formData.paymentDate} onChange={(v)=>setFormData({...formData,paymentDate:v})}/>
            <FormInput label="Payment Mode" type="select" options={['NEFT','IMPS','UPI','Cheque','Cash']} value={formData.paymentMode} onChange={(v)=>setFormData({...formData,paymentMode:v})}/>
          </div>
          <FormInput label="Transaction Reference" value={formData.transactionRef} onChange={(v)=>setFormData({...formData,transactionRef:v})} placeholder="UTR Number / Cheque No."/>
          <FormInput label="Remarks"                value={formData.remarks}        onChange={(v)=>setFormData({...formData,remarks:v})}        placeholder="Internal notes..."/>
        </form>

        <div className="sticky bottom-0 z-20 bg-white border-t border-slate-50 p-6 md:p-8">
          <button type="button" onClick={handleSubmit} disabled={loading}
            className="w-full py-4 bg-primary text-white rounded-2xl font-bold hover:bg-orange-600 transition-all shadow-xl shadow-primary/20 flex items-center justify-center gap-2">
            {loading ? <Loader2 size={20} className="animate-spin"/> : <ShieldCheck size={20}/>}
            {loading ? 'Processing...' : 'Save Payment & Penalty'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ── Edit Adjustment Modal ────────────────────────────────────────────────────
export function EditAdjustmentModal({ entry, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const isDebit = entry.debit > 0;
  const [form, setForm] = useState({
    date:           entry.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    amount:         entry.debit > 0 ? entry.debit : entry.credit,
    adjustmentSide: entry.debit > 0 ? 'DEBIT' : 'CREDIT',
    particular:     entry.particular || 'Adjustment',
    notes:          entry.notes || '',
  });

  const side = form.adjustmentSide === 'DEBIT';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.amount <= 0) { toast.error('Amount must be > 0'); return; }
    setLoading(true);
    try {
      const apiBase = import.meta.env?.VITE_API_URL || '';
      await axios.put(`${apiBase}/api/ledger/entry/${entry.id}`, {
        date:       form.date,
        particular: form.particular,
        debit:      side  ? form.amount : 0,
        credit:     !side ? form.amount : 0,
        notes:      form.notes,
      });
      toast.success('Adjustment updated!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <motion.div initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div initial={{scale:0.9,opacity:0,y:20}} animate={{scale:1,opacity:1,y:0}} exit={{scale:0.9,opacity:0,y:20}}
        className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden flex flex-col">

        <div className="p-6 bg-amber-50 border-b border-amber-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
              <History size={20}/>
            </div>
            <div>
              <h3 className="font-black text-slate-800">Edit Adjustment</h3>
              <p className="text-[10px] font-bold text-amber-700 uppercase tracking-widest">Modify ledger entry</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600"><X size={20}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto">

          {/* Debit / Credit toggle */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1 block mb-2">Adjustment Side *</label>
            <div className="grid grid-cols-2 gap-3">
              {(['DEBIT','CREDIT']).map(s => (
                <button key={s} type="button" onClick={() => setForm({...form, adjustmentSide:s})}
                  style={{
                    padding:'12px 0', borderRadius:14, fontFamily:'inherit', cursor:'pointer',
                    border: form.adjustmentSide===s ? `2px solid ${s==='DEBIT'?'#ef4444':'#10b981'}` : '2px solid #f1f5f9',
                    background: form.adjustmentSide===s ? (s==='DEBIT'?'#fff1f2':'#f0fdf4') : '#f8f9fb',
                    color: form.adjustmentSide===s ? (s==='DEBIT'?'#ef4444':'#10b981') : '#94a3b8',
                    fontWeight:800, fontSize:13, display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                  }}>
                  <span style={{fontSize:20}}>{s==='DEBIT'?'📤':'📥'}</span>
                  <span>{s}</span>
                </button>
              ))}
            </div>
            <div style={{
              marginTop:8, padding:'8px 12px', borderRadius:10, fontSize:11, fontWeight:600,
              background: side ? '#fff1f2' : '#f0fdf4',
              border: `1px solid ${side ? '#fecdd3' : '#86efac'}`,
              color: side ? '#ef4444' : '#10b981',
            }}>
              {side ? '📤 Will appear in DEBIT column' : '📥 Will appear in CREDIT column'}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <FormInput label="Entry Date"  type="date"   value={form.date}   onChange={(v)=>setForm({...form,date:v})} required/>
            <FormInput label="Amount (₹)"  type="number" value={form.amount} onChange={(v)=>setForm({...form,amount:parseFloat(v)||0})} required/>
          </div>
          <FormInput label="Particular" value={form.particular} onChange={(v)=>setForm({...form,particular:v})} required/>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Notes</label>
            <textarea className="form-input-saas min-h-[70px] py-3 h-auto"
              value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} placeholder="Reason..."/>
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'13px 0', borderRadius:14, background: side ? '#ef4444' : '#10b981', color:'#fff', fontWeight:800, fontSize:14, border:'none', cursor:loading?'wait':'pointer', fontFamily:'inherit', display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
            {loading ? <Loader2 size={17} className="animate-spin"/> : <ShieldCheck size={17}/>}
            {loading ? 'Saving...' : `Update ${form.adjustmentSide} Adjustment`}
          </button>
        </form>
      </motion.div>
    </motion.div>
  );
}
