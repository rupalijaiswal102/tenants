import { useState } from 'react';
import { CheckCircle, Shield, Image } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import RightPanel, { PanelField, PanelInput } from '../RightPanel.jsx';

export function ApproveSignatureModal({ invoice, company, onClose, onSuccess }) {
  const [loading,    setLoading]    = useState(false);
  const [approvedBy, setApprovedBy] = useState('Authorized Signatory');

  const hasSeal = !!(company?.sealUrl);

  const handleApprove = async () => {
    setLoading(true);
    try {
      const apiBase = import.meta.env?.VITE_API_URL || '';
      const res = await axios.post(`${apiBase}/api/invoices/${invoice.id}/approve`, { approvedBy });
      toast.success('Invoice approved!');
      onSuccess({ ...invoice, ...res.data.invoice, approved: true, approvedBy });
    } catch (err) {
      toast.error(err.response?.data?.error || 'Approval failed');
    } finally { setLoading(false); }
  };

  return (
    <RightPanel
      isOpen
      onClose={onClose}
      title="Approve & Sign Invoice"
      subtitle={`Invoice #${invoice.invoiceNo}`}
      badge={invoice.partyName}
      icon={<Shield size={20}/>}
      iconBg="#fff7ed"
      iconColor="#f97316"
      width="480px"
      submitLabel="Approve & Apply Seal"
      onSubmit={handleApprove}
      submitLoading={loading}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Invoice summary */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
          {[
            { label:'Party',   value: invoice.partyName },
            { label:'Amount',  value: `₹ ${Math.round(invoice.totalInvoice||0).toLocaleString('en-IN')}`, highlight: true },
            { label:'Company', value: invoice.company },
          ].map(({ label, value, highlight }) => (
            <div key={label} style={{ padding:'10px 12px', background:'#f8f9fb', borderRadius:10, border:'1px solid #f0f2f5' }}>
              <p style={{ fontSize:9, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.06em', margin:0 }}>{label}</p>
              <p style={{ fontSize:13, fontWeight:800, color: highlight ? '#f97316' : '#1a1a2e', margin:'3px 0 0' }}>{value}</p>
            </div>
          ))}
        </div>

        {/* Approved By */}
        <PanelField label="Approved By">
          <PanelInput value={approvedBy} placeholder="Enter approver name…"
            onChange={e => setApprovedBy(e.target.value)}/>
        </PanelField>

        {/* Seal status */}
        <PanelField label="Company Seal">
          {hasSeal ? (
            <div style={{ padding:'14px 16px', background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:10, display:'flex', alignItems:'center', gap:12 }}>
              <img src={company.sealUrl} alt="Seal" referrerPolicy="no-referrer"
                style={{ width:48, height:48, objectFit:'contain', borderRadius:'50%', border:'2px solid #d1fae5', background:'#fff', padding:3 }}/>
              <div style={{ flex:1 }}>
                <p style={{ fontSize:12, fontWeight:700, color:'#15803d', margin:0 }}>Seal Ready</p>
                <p style={{ fontSize:11, color:'#9ba8b5', margin:'2px 0 0' }}>{company.companyName} — will be stamped on invoice</p>
              </div>
              <CheckCircle size={18} color="#10b981"/>
            </div>
          ) : (
            <div style={{ padding:'14px 16px', background:'#fffbeb', border:'1.5px solid #fde68a', borderRadius:10, display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44, height:44, borderRadius:'50%', background:'#fff', border:'2px dashed #fde68a', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                <Image size={18} color="#f59e0b"/>
              </div>
              <div>
                <p style={{ fontSize:12, fontWeight:700, color:'#b45309', margin:0 }}>No seal uploaded</p>
                <p style={{ fontSize:11, color:'#9ba8b5', margin:'2px 0 0' }}>Go to <strong>Companies</strong> → upload company seal</p>
              </div>
            </div>
          )}
        </PanelField>

        <p style={{ fontSize:10, color:'#c5cdd6', textAlign:'center', margin:0 }}>
          This action will approve and stamp the invoice with company seal
        </p>
      </div>
    </RightPanel>
  );
}
