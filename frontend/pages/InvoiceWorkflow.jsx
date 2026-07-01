import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';
import { ArrowLeft, FileText, GitBranch } from 'lucide-react';
import Spinner from '../src/components/ui/Spinner.jsx';
import InvoiceWorkflowTab from '../components/invoices/InvoiceWorkflowTab.jsx';

export default function InvoiceWorkflowPage() {
  const { invoiceId } = useParams();
  const navigate      = useNavigate();

  const authData = JSON.parse(localStorage.getItem('neoteric_auth') || 'null');
  const userRole = authData?.role || 'Admin';
  const userName = authData?.name || 'User';

  const [invoice,  setInvoice]  = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    if (!invoiceId) return;
    axios.get(`/api/invoices/${invoiceId}`)
      .then(r => setInvoice(r.data))
      .catch(() => toast.error('Failed to load invoice'))
      .finally(() => setLoading(false));
  }, [invoiceId]);

  if (loading) return <Spinner fullPage/>;

  return (
    <div style={{ padding:'24px', maxWidth:860, margin:'0 auto', paddingBottom:60 }}>

      {/* Page header */}
      <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
        <button onClick={() => navigate('/invoices')}
          style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', background:'#fff', border:'1.5px solid #f0f2f5', borderRadius:10, fontSize:12, fontWeight:600, color:'#5a6474', cursor:'pointer', fontFamily:'inherit' }}>
          <ArrowLeft size={14}/> Back to Invoices
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
          <GitBranch size={16} color="#f97316"/>
          <span style={{ fontSize:14, fontWeight:800, color:'#1a1a2e' }}>
            Invoice Workflow — #{invoice?.invoiceNo || invoiceId}
          </span>
        </div>
      </div>

      {/* Invoice info card */}
      {invoice && (
        <div style={{ background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', padding:'16px 20px', marginBottom:16, display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ width:44, height:44, borderRadius:12, background:'#fff7ed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <FileText size={20} color="#f97316"/>
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>#{invoice.invoiceNo}</p>
            <p style={{ fontSize:11, color:'#9ba8b5', margin:'2px 0 0' }}>
              {invoice.partyName || invoice.company} · {invoice.billDate} · ₹{Math.round(invoice.totalInvoice || 0).toLocaleString('en-IN')}
            </p>
          </div>
        </div>
      )}

      {/* Reusable workflow tab — handles all workflow logic internally */}
      <InvoiceWorkflowTab invoice={invoice || { _id: invoiceId }} userRole={userRole} userName={userName}/>
    </div>
  );
}
