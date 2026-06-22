import { useState, useEffect } from 'react';
import { History, ShieldCheck, IndianRupee, CalendarDays, CreditCard, Hash, FileText } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { formatCurrency } from '../../src/utils/formatCurrency.js';
import RightPanel, { PanelGrid, PanelField, PanelInput, PanelSelect, PanelTextarea, PanelDivider } from '../RightPanel.jsx';

// ── Opening Balance Adjustment ────────────────────────────────────────────────
export function OpeningAdjustmentModal({ tenant, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    date:           new Date().toISOString().split('T')[0],
    amount:         0,
    type:           'ADJUSTMENT',
    adjustmentSide: 'DEBIT',
    particular:     'Adjustment',
    notes:          '',
  });

  const isDebit = formData.adjustmentSide === 'DEBIT';

  const handleSubmit = async () => {
    if (formData.amount <= 0) { toast.error('Amount must be greater than 0'); return; }
    setLoading(true);
    try {
      const apiBase = import.meta.env?.VITE_API_URL || '';
      await axios.post(`${apiBase}/api/ledger/entry`, {
        tenantId:   tenant.id,
        date:       formData.date,
        type:       formData.type,
        particular: formData.particular,
        debit:      isDebit ? formData.amount : 0,
        credit:     !isDebit ? formData.amount : 0,
        notes:      formData.notes,
      });
      toast.success(`${formData.adjustmentSide} Adjustment saved!`);
      onSuccess();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to save adjustment');
    } finally { setLoading(false); }
  };

  return (
    <RightPanel
      isOpen
      onClose={onClose}
      title="Ledger Adjustment"
      subtitle="Add a manual debit or credit entry"
      badge={tenant.name}
      icon={<History size={20}/>}
      iconBg="#fefce8"
      iconColor="#eab308"
      submitLabel={`Save ${formData.adjustmentSide} Adjustment`}
      onSubmit={handleSubmit}
      submitLoading={loading}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Debit / Credit toggle */}
        <PanelField label="Adjustment Side" required>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {['DEBIT','CREDIT'].map(s => {
              const active = formData.adjustmentSide === s;
              const color  = s === 'DEBIT' ? '#ef4444' : '#10b981';
              return (
                <button key={s} type="button"
                  onClick={() => setFormData({ ...formData, adjustmentSide: s })}
                  style={{
                    padding: '14px 0', borderRadius: 10, fontFamily:'inherit', cursor:'pointer',
                    border: active ? `2px solid ${color}` : '2px solid #f0f2f5',
                    background: active ? (s==='DEBIT' ? '#fff1f2' : '#f0fdf4') : '#f8f9fb',
                    color: active ? color : '#9ba8b5',
                    fontWeight: 700, fontSize: 13,
                    display:'flex', flexDirection:'column', alignItems:'center', gap:4,
                    transition:'all 0.15s',
                  }}>
                  <span style={{ fontSize:20 }}>{s==='DEBIT' ? '📤' : '📥'}</span>
                  <span>{s}</span>
                  <span style={{ fontSize:10, fontWeight:500, opacity:0.7 }}>
                    {s==='DEBIT' ? 'Debit column' : 'Credit column'}
                  </span>
                </button>
              );
            })}
          </div>
          <div style={{
            marginTop: 8, padding:'8px 12px', borderRadius:8, fontSize:11, fontWeight:600,
            background: isDebit ? '#fff1f2' : '#f0fdf4',
            border: `1px solid ${isDebit ? '#fecdd3' : '#86efac'}`,
            color: isDebit ? '#ef4444' : '#10b981',
          }}>
            {isDebit ? '📤 Amount will appear in DEBIT column' : '📥 Amount will appear in CREDIT column'}
          </div>
        </PanelField>

        <PanelGrid>
          <PanelField label="Entry Date" required>
            <PanelInput type="date" icon={CalendarDays} value={formData.date}
              onChange={e => setFormData({ ...formData, date: e.target.value })}/>
          </PanelField>
          <PanelField label="Amount (₹)" required>
            <PanelInput type="number" icon={IndianRupee} value={formData.amount}
              onChange={e => setFormData({ ...formData, amount: parseFloat(e.target.value)||0 })}/>
          </PanelField>
        </PanelGrid>

        <PanelField label="Particular" required>
          <PanelInput icon={FileText} value={formData.particular}
            onChange={e => setFormData({ ...formData, particular: e.target.value })}/>
        </PanelField>

        <PanelField label="Notes">
          <PanelTextarea value={formData.notes} placeholder="Reason for adjustment…"
            onChange={e => setFormData({ ...formData, notes: e.target.value })}/>
        </PanelField>
      </div>
    </RightPanel>
  );
}

// ── Payment Entry ─────────────────────────────────────────────────────────────
export function PaymentEntryModal({ invoice, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    receivedAmount:        invoice.receivedAmount || invoice.received || 0,
    tdsAmount:             invoice.tdsAmount || 0,
    paymentDate:           invoice.paymentDate || new Date().toISOString().split('T')[0],
    paymentMode:           invoice.paymentMode || 'NEFT',
    transactionRef:        invoice.transactionRef || '',
    latePenaltyPercentage: invoice.latePenaltyPercentage ?? 1.5,
    latePenaltyAmount:     invoice.latePenaltyAmount || 0,
    remarks:               invoice.remarks || '',
  });

  const rentBase          = invoice.baseRent || invoice.totalInvoice;
  const calculatedPenalty = Number((rentBase * (formData.latePenaltyPercentage / 100)).toFixed(2));

  useEffect(() => {
    if (calculatedPenalty !== formData.latePenaltyAmount)
      setFormData(prev => ({ ...prev, latePenaltyAmount: calculatedPenalty }));
  }, [calculatedPenalty]);

  const remainingBalance = (invoice.totalInvoice + calculatedPenalty) - (formData.receivedAmount + formData.tdsAmount);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      await axios.put(`/api/invoices/${String(invoice.id)}`, formData);
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.error('Error recording payment');
    } finally { setLoading(false); }
  };

  const settled = remainingBalance <= 0;

  return (
    <RightPanel
      isOpen
      onClose={onClose}
      title="Record Payment"
      subtitle="Update payment details for this invoice"
      badge={`Invoice #${invoice.invoiceNo} · ${invoice.partyName}`}
      icon={<ShieldCheck size={20}/>}
      iconBg="#f0fdf4"
      iconColor="#10b981"
      submitLabel="Save Payment & Penalty"
      onSubmit={handleSubmit}
      submitLoading={loading}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          <div style={{ padding:'12px 14px', background:'#f8f9fb', borderRadius:10, border:'1px solid #f0f2f5' }}>
            <p style={{ fontSize:9, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>Total Payable</p>
            <p style={{ fontSize:16, fontWeight:800, color:'#1a1a2e', margin:'4px 0 0' }}>{formatCurrency(invoice.totalInvoice + calculatedPenalty)}</p>
          </div>
          <div style={{ padding:'12px 14px', background: settled ? '#f0fdf4' : '#fff1f2', borderRadius:10, border:`1px solid ${settled?'#bbf7d0':'#fecdd3'}` }}>
            <p style={{ fontSize:9, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>Balance Due</p>
            <p style={{ fontSize:16, fontWeight:800, color: settled ? '#10b981' : '#ef4444', margin:'4px 0 0' }}>{formatCurrency(Math.max(0, Math.round(remainingBalance)))}</p>
          </div>
        </div>

        {/* Penalty */}
        <div style={{ padding:'12px 14px', background:'#fefce8', borderRadius:10, border:'1px solid #fef08a', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <p style={{ fontSize:9, fontWeight:700, color:'#a16207', textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>Late Penalty %</p>
            <input type="number" step="0.1" value={formData.latePenaltyPercentage}
              onChange={e => setFormData({ ...formData, latePenaltyPercentage: parseFloat(e.target.value)||0 })}
              style={{ background:'transparent', border:'none', borderBottom:'1px solid #fbbf24', fontSize:16, fontWeight:800, color:'#92400e', outline:'none', width:60, marginTop:4 }}/>
          </div>
          <div style={{ textAlign:'right' }}>
            <p style={{ fontSize:9, fontWeight:700, color:'#a16207', textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>Penalty Charge</p>
            <p style={{ fontSize:18, fontWeight:800, color:'#92400e', margin:'4px 0 0' }}>{formatCurrency(calculatedPenalty)}</p>
          </div>
        </div>

        <PanelDivider label="Payment Details"/>

        <PanelGrid>
          <PanelField label="Received Amount" required>
            <PanelInput type="number" icon={IndianRupee} value={formData.receivedAmount}
              onChange={e => setFormData({ ...formData, receivedAmount: parseFloat(e.target.value)||0 })}/>
          </PanelField>
          <PanelField label="TDS Amount">
            <PanelInput type="number" icon={IndianRupee} value={formData.tdsAmount}
              onChange={e => setFormData({ ...formData, tdsAmount: parseFloat(e.target.value)||0 })}/>
          </PanelField>
        </PanelGrid>

        <PanelGrid>
          <PanelField label="Payment Date">
            <PanelInput type="date" icon={CalendarDays} value={formData.paymentDate}
              onChange={e => setFormData({ ...formData, paymentDate: e.target.value })}/>
          </PanelField>
          <PanelField label="Payment Mode">
            <PanelSelect value={formData.paymentMode}
              onChange={e => setFormData({ ...formData, paymentMode: e.target.value })}
              options={['NEFT','IMPS','UPI','Cheque','Cash']}/>
          </PanelField>
        </PanelGrid>

        <PanelField label="Transaction Reference">
          <PanelInput icon={Hash} value={formData.transactionRef} placeholder="UTR / Cheque No."
            onChange={e => setFormData({ ...formData, transactionRef: e.target.value })}/>
        </PanelField>

        <PanelField label="Remarks">
          <PanelTextarea value={formData.remarks} placeholder="Internal notes…"
            onChange={e => setFormData({ ...formData, remarks: e.target.value })}/>
        </PanelField>
      </div>
    </RightPanel>
  );
}

// ── Edit Adjustment ───────────────────────────────────────────────────────────
export function EditAdjustmentModal({ entry, onClose, onSuccess }) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    date:           entry.date?.split('T')[0] || new Date().toISOString().split('T')[0],
    amount:         entry.debit > 0 ? entry.debit : entry.credit,
    adjustmentSide: entry.debit > 0 ? 'DEBIT' : 'CREDIT',
    particular:     entry.particular || 'Adjustment',
    notes:          entry.notes || '',
  });

  const isDebit = form.adjustmentSide === 'DEBIT';

  const handleSubmit = async () => {
    if (form.amount <= 0) { toast.error('Amount must be > 0'); return; }
    setLoading(true);
    try {
      const apiBase = import.meta.env?.VITE_API_URL || '';
      await axios.put(`${apiBase}/api/ledger/entry/${entry.id}`, {
        date:       form.date,
        particular: form.particular,
        debit:      isDebit  ? form.amount : 0,
        credit:     !isDebit ? form.amount : 0,
        notes:      form.notes,
      });
      toast.success('Adjustment updated!');
      onSuccess();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Update failed');
    } finally { setLoading(false); }
  };

  return (
    <RightPanel
      isOpen
      onClose={onClose}
      title="Edit Adjustment"
      subtitle="Modify this ledger entry"
      icon={<History size={20}/>}
      iconBg="#fefce8"
      iconColor="#eab308"
      submitLabel={`Update ${form.adjustmentSide} Adjustment`}
      onSubmit={handleSubmit}
      submitLoading={loading}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        <PanelField label="Adjustment Side" required>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            {['DEBIT','CREDIT'].map(s => {
              const active = form.adjustmentSide === s;
              const color  = s === 'DEBIT' ? '#ef4444' : '#10b981';
              return (
                <button key={s} type="button"
                  onClick={() => setForm({ ...form, adjustmentSide: s })}
                  style={{
                    padding:'12px 0', borderRadius:10, fontFamily:'inherit', cursor:'pointer',
                    border: active ? `2px solid ${color}` : '2px solid #f0f2f5',
                    background: active ? (s==='DEBIT' ? '#fff1f2' : '#f0fdf4') : '#f8f9fb',
                    color: active ? color : '#9ba8b5',
                    fontWeight:700, fontSize:13,
                    display:'flex', flexDirection:'column', alignItems:'center', gap:3,
                    transition:'all 0.15s',
                  }}>
                  <span style={{ fontSize:18 }}>{s==='DEBIT' ? '📤' : '📥'}</span>
                  <span>{s}</span>
                </button>
              );
            })}
          </div>
        </PanelField>

        <PanelGrid>
          <PanelField label="Entry Date" required>
            <PanelInput type="date" icon={CalendarDays} value={form.date}
              onChange={e => setForm({ ...form, date: e.target.value })}/>
          </PanelField>
          <PanelField label="Amount (₹)" required>
            <PanelInput type="number" icon={IndianRupee} value={form.amount}
              onChange={e => setForm({ ...form, amount: parseFloat(e.target.value)||0 })}/>
          </PanelField>
        </PanelGrid>

        <PanelField label="Particular" required>
          <PanelInput icon={FileText} value={form.particular}
            onChange={e => setForm({ ...form, particular: e.target.value })}/>
        </PanelField>

        <PanelField label="Notes">
          <PanelTextarea value={form.notes} placeholder="Reason…"
            onChange={e => setForm({ ...form, notes: e.target.value })}/>
        </PanelField>
      </div>
    </RightPanel>
  );
}
