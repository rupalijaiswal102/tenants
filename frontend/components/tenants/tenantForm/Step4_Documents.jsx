import { useRef } from 'react';
import { FileCheck, FileText, Upload, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import imageCompression from 'browser-image-compression';
import { formatCurrency } from '../../../src/utils/formatCurrency.js';

export default function Step4_Documents({
  register, watch, setValue,
  agreementFile, setAgreementFile,
  setFilePreview,
  loading, uploadProgress, uploadSpeed,
  mode,
}) {
  const fileInputRef = useRef(null);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    let finalFile = file;
    if (file.type.includes('image')) {
      try {
        finalFile = await imageCompression(file, { maxSizeMB: 1, maxWidthOrHeight: 1920, useWebWorker: true });
      } catch {}
    }
    setAgreementFile(finalFile);
    if (finalFile.type.includes('image')) {
      const r = new FileReader();
      r.onloadend = () => setFilePreview(r.result);
      r.readAsDataURL(finalFile);
    } else {
      setFilePreview(null);
    }
  };

  const existingUrl = watch('agreementFileUrl');

  const summaryRows = [
    [mode === 'otherParty' ? 'Party Name' : 'Tenant Name', watch('name')],
    ['Company',      watch('company')],
    [mode === 'otherParty' ? 'Address' : 'Property', watch('property')],
    ['Monthly Rent', watch('currentRent') ? formatCurrency(watch('currentRent')) : '—'],
    ['Lease Period', watch('leaseStart')  ? `${watch('leaseStart')} → ${watch('leaseEnd')}` : '—'],
    ['Status',       watch('agreementStatus')],
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".pdf,image/*" style={{ display:'none' }}/>

      {/* Existing file */}
      {!agreementFile && existingUrl && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 18px', background:'#f0fdf4', border:'1.5px solid #86efac', borderRadius:14 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:40, height:40, background:'#fff', borderRadius:10, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
              <FileCheck size={20} color="#10b981"/>
            </div>
            <div>
              <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:0 }}>Existing Agreement File</p>
              <p style={{ fontSize:11, color:'#16a34a', margin:'2px 0 0', fontWeight:500 }}>Previously uploaded</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <a href={`${import.meta.env?.VITE_API_URL || ''}${existingUrl}`} target="_blank" rel="noopener noreferrer"
              style={{ padding:'6px 14px', background:'#fff', border:'1px solid #86efac', borderRadius:8, fontSize:11, fontWeight:700, color:'#16a34a', textDecoration:'none' }}>
              👁 View
            </a>
            <button type="button" onClick={() => fileInputRef.current?.click()}
              style={{ padding:'6px 14px', background:'#f97316', border:'none', borderRadius:8, fontSize:11, fontWeight:700, color:'#fff', cursor:'pointer', fontFamily:'inherit' }}>
              🔄 Replace
            </button>
            <button type="button"
              onClick={() => {
                if (window.confirm('Delete this document?')) {
                  setValue('agreementFileUrl', '');
                  setValue('agreementFileType', '');
                  toast.success('Document removed. Save to confirm.');
                }
              }}
              style={{ padding:'6px 10px', background:'#fff1f2', border:'1.5px solid #fecdd3', borderRadius:8, fontSize:11, fontWeight:700, color:'#e11d48', cursor:'pointer', fontFamily:'inherit' }}>
              🗑 Delete
            </button>
          </div>
        </div>
      )}

      {/* Upload zone */}
      <div onClick={() => fileInputRef.current?.click()}
        style={{ border:`2px dashed ${agreementFile ? '#10b981' : '#e2e8f0'}`, borderRadius:16, padding:'36px 24px', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', background: agreementFile ? '#f0fdf4' : '#fafbfd', textAlign:'center', transition:'all 0.15s' }}>
        {agreementFile ? (
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:44, height:44, background:'#fff', borderRadius:12, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.08)' }}>
              {agreementFile.type.includes('image') ? <FileText size={22} color="#10b981"/> : <FileCheck size={22} color="#10b981"/>}
            </div>
            <div style={{ textAlign:'left' }}>
              <p style={{ fontSize:13, fontWeight:700, color:'#0f172a', margin:0 }}>{agreementFile.name}</p>
              <button type="button" onClick={e => { e.stopPropagation(); setAgreementFile(null); setFilePreview(null); }}
                style={{ fontSize:11, fontWeight:700, color:'#ef4444', background:'none', border:'none', cursor:'pointer', padding:0, marginTop:2 }}>
                Remove File
              </button>
            </div>
          </div>
        ) : (
          <>
            <div style={{ width:48, height:48, background:'#fff', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 1px 4px rgba(0,0,0,0.06)', marginBottom:12 }}>
              <Upload size={22} color="#94a3b8"/>
            </div>
            <p style={{ fontSize:14, fontWeight:700, color:'#475569', margin:0 }}>
              {existingUrl ? 'Upload New File (Replace)' : 'Click to Upload Agreement'}
            </p>
            <p style={{ fontSize:11, color:'#94a3b8', marginTop:5, fontWeight:500 }}>PDF or Image — Max 25MB</p>
          </>
        )}
      </div>

      {/* Upload progress */}
      {loading && uploadProgress > 0 && (
        <div style={{ padding:'14px 16px', background:'#f8fafc', borderRadius:12, border:'1px solid #e8edf4' }}>
          <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
            <span style={{ fontSize:11, fontWeight:600, color:'#94a3b8' }}>{uploadSpeed}</span>
            <span style={{ fontSize:11, fontWeight:700, color:'#f97316' }}>{uploadProgress}%</span>
          </div>
          <div style={{ height:6, background:'#e8edf4', borderRadius:6, overflow:'hidden' }}>
            <motion.div initial={{ width:0 }} animate={{ width:`${uploadProgress}%` }}
              style={{ height:'100%', background:'#f97316', borderRadius:6 }}/>
          </div>
        </div>
      )}

      {/* Summary card */}
      <div style={{ background:'#f8fafc', borderRadius:14, padding:20, border:'1px solid #e8edf4' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
          <div style={{ width:3, height:16, background:'#f97316', borderRadius:2 }}/>
          <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>Summary</p>
        </div>
        {summaryRows.map(([k, v]) => (
          <div key={k} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:'1px solid #e8edf4' }}>
            <span style={{ fontSize:11, color:'#94a3b8', fontWeight:600 }}>{k}</span>
            <span style={{ fontSize:12, fontWeight:700, color:'#0f172a', maxWidth:200, textAlign:'right', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
              {v || '—'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}