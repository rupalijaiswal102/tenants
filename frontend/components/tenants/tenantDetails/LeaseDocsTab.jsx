import { Clock, IndianRupee, FileCheck, FileText, Zap, Trash2, Upload, Eye, Download } from 'lucide-react';
import { motion } from 'motion/react';
import { useState, useRef } from 'react';
import axios from 'axios';
import { TimelineItemLarge, ConfigBlock } from '../TenantPrimitives.jsx';
import { fmtDate } from '../../../src/utils/formatCurrency.js';

const SC = { background:'#fff', borderRadius:16, border:'1px solid #f0f2f5', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' };

// ── Lease Tab ─────────────────────────────────────────────────────────────────
export function LeaseTab({ tenant, lockInExpiry }) {
  const configs = [
    ['Monthly Rent',     `₹${tenant.currentRent?.toLocaleString()}`,     true  ],
    ['Security Deposit', `₹${tenant.securityDeposit?.toLocaleString()}`, true  ],
    ['Rent-Free Period', `${tenant.rentFreePeriodDays} Days`,             false ],
    ['Notice Period',    `${tenant.noticePeriod} Days`,                   false ],
    ['Lease Tenure',     `${tenant.tenure} Months`,                      false ],
    ['Lock-in Period',   `${tenant.lockIn} Months`,                      false ],
    ['Escalation',       `${tenant.escalationPercent}%`,                 false ],
    ['Purpose',          tenant.rentalPurpose || '—',                    false ],
  ];

  return (
    <motion.div key="ls" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
      style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

      {/* Timeline */}
      <div style={{ ...SC, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'#fff7ed', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Clock size={15} color="#f97316"/>
          </div>
          <p style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:0 }}>Lease Roadmap</p>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <TimelineItemLarge label="Lease Commencement" date={tenant.leaseStart} desc="Initial move-in and rent start date" active/>
          <TimelineItemLarge label="Lock-in Period Ends" date={lockInExpiry}     desc="Minimum commitment period ends"/>
          <TimelineItemLarge label="Lease Expiration"   date={tenant.leaseEnd}   desc="Agreement renewal or termination" danger/>
        </div>
      </div>

      {/* Financial config */}
      <div style={{ ...SC, padding:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <div style={{ width:32, height:32, borderRadius:9, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <IndianRupee size={15} color="#10b981"/>
          </div>
          <p style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:0 }}>Financial Configuration</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {configs.map(([l, v, h]) => <ConfigBlock key={l} label={l} value={v} highlight={h}/>)}
        </div>
      </div>
    </motion.div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────
export function DocumentsTab({ tenant, onRefresh }) {
  const [bills, setBills]       = useState(tenant.electricityBills || []);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting]   = useState(null);
  const fileRef = useRef();

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('billFile', file);
      fd.append('billName', file.name);
      const { data } = await axios.post(`/api/tenants/${tenant._id}/electricity-bills`, fd);
      setBills(prev => [...prev, data.bill]);
    } catch (err) {
      alert('Upload failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setUploading(false);
      fileRef.current.value = '';
    }
  };

  const handleDelete = async (idx) => {
    if (!confirm('Delete this bill?')) return;
    setDeleting(idx);
    try {
      await axios.delete(`/api/tenants/${tenant._id}/electricity-bills/${idx}`);
      setBills(prev => prev.filter((_, i) => i !== idx));
    } catch (err) {
      alert('Delete failed: ' + (err.response?.data?.error || err.message));
    } finally {
      setDeleting(null);
    }
  };

  const fmt = fmtDate;

  return (
    <motion.div key="doc" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}
      style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Lease Agreement */}
      {tenant.agreementFileUrl ? (
        <div style={{ ...SC, padding:24, maxWidth:360, display:'flex', flexDirection:'column', alignItems:'center', gap:16, textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <FileCheck size={26} color="#10b981"/>
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:0 }}>Lease Agreement</p>
            <p style={{ fontSize:11, color:'#9ba8b5', marginTop:4 }}>Digital scanned copy of original contract</p>
          </div>
          <div style={{ display:'flex', gap:10, width:'100%' }}>
            <a href={tenant.agreementFileUrl} target="_blank" rel="noopener noreferrer"
              style={{ flex:1, padding:9, background:'#f8f9fb', color:'#5a6474', borderRadius:9, fontWeight:600, fontSize:12, textAlign:'center', textDecoration:'none', border:'1px solid #f0f2f5' }}>
              Preview
            </a>
            <a href={tenant.agreementFileUrl} download
              style={{ flex:1, padding:9, background:'#10b981', color:'#fff', borderRadius:9, fontWeight:700, fontSize:12, textAlign:'center', textDecoration:'none' }}>
              Download
            </a>
          </div>
        </div>
      ) : (
        <div style={{ ...SC, padding:40, maxWidth:300, display:'flex', flexDirection:'column', alignItems:'center', gap:10, textAlign:'center', border:'2px dashed #f0f2f5', background:'transparent' }}>
          <FileText size={32} color="#e0e4ea"/>
          <p style={{ fontSize:13, fontWeight:600, color:'#9ba8b5', margin:0 }}>No documents uploaded</p>
        </div>
      )}

      {/* Electricity Bills */}
      <div style={{ ...SC, padding:20 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:32, height:32, borderRadius:9, background:'#fefce8', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Zap size={15} color="#eab308"/>
            </div>
            <p style={{ fontSize:14, fontWeight:600, color:'#1e293b', margin:0 }}>Electricity Bills</p>
          </div>
          <label style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', background:'#f97316', color:'#fff', borderRadius:8, fontWeight:600, fontSize:12, cursor: uploading ? 'not-allowed' : 'pointer', opacity: uploading ? 0.7 : 1 }}>
            <Upload size={13}/>
            {uploading ? 'Uploading…' : 'Upload Bill'}
            <input ref={fileRef} type="file" accept=".pdf,image/*" style={{ display:'none' }} onChange={handleUpload} disabled={uploading}/>
          </label>
        </div>

        {/* Bill list */}
        {bills.length === 0 ? (
          <div style={{ padding:'28px 0', display:'flex', flexDirection:'column', alignItems:'center', gap:8, border:'2px dashed #f0f2f5', borderRadius:10 }}>
            <Zap size={28} color="#e0e4ea"/>
            <p style={{ fontSize:12, color:'#9ba8b5', margin:0 }}>No electricity bills uploaded yet</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {bills.map((bill, idx) => (
              <div key={idx} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#f8f9fb', borderRadius:10, border:'1px solid #f0f2f5' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <FileText size={18} color="#eab308"/>
                  <div>
                    <p style={{ fontSize:12, fontWeight:500, color:'#1e293b', margin:0 }}>{bill.name || `Bill ${idx+1}`}</p>
                    <p style={{ fontSize:10, color:'#9ba8b5', margin:0 }}>{fmt(bill.uploadedAt)}</p>
                  </div>
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <a href={bill.url} target="_blank" rel="noopener noreferrer"
                    title="Preview"
                    style={{ width:30, height:30, background:'#fff', border:'1px solid #e5e7eb', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none' }}>
                    <Eye size={13} color="#6b7280"/>
                  </a>
                  <a href={bill.url} download
                    title="Download"
                    style={{ width:30, height:30, background:'#fff', border:'1px solid #e5e7eb', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', textDecoration:'none' }}>
                    <Download size={13} color="#6b7280"/>
                  </a>
                  <button onClick={() => handleDelete(idx)} disabled={deleting === idx}
                    title="Delete"
                    style={{ width:30, height:30, background:'#fff5f5', border:'1px solid #fecaca', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer' }}>
                    <Trash2 size={13} color={deleting === idx ? '#ccc' : '#ef4444'}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
}
