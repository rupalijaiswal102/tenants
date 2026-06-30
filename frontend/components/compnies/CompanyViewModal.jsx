import { Building2, MapPin, Mail, Phone, FileText, Edit } from 'lucide-react';
import { usePermission } from '../../src/hooks/usePermission.js';
import RightPanel, { PanelDivider } from '../RightPanel.jsx';

export default function CompanyViewModal({ isOpen, company, onClose, onEdit }) {
  const { canEdit } = usePermission();
  if (!company) return null;

  const DetailRow = ({ label, value }) => (
    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', borderBottom:'1px solid #f0f2f5', paddingBottom:10, gap:8 }}>
      <span style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.06em', flexShrink:0 }}>{label}</span>
      <span style={{ fontSize:12, fontWeight:700, color:'#1e293b', textAlign:'right', wordBreak:'break-all' }}>{value || '--'}</span>
    </div>
  );

  const ContactRow = ({ icon, label, value }) => (
    <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
      <div style={{ width:36, height:36, borderRadius:10, background:'#fff7ed', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
        <span style={{ color:'#f97316', display:'flex' }}>{icon}</span>
      </div>
      <div>
        <p style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 2px' }}>{label}</p>
        <p style={{ fontSize:13, fontWeight:600, color:'#1e293b', margin:0, wordBreak:'break-word' }}>{value || '--'}</p>
      </div>
    </div>
  );

  return (
    <RightPanel
      isOpen={isOpen}
      onClose={onClose}
      title={company.companyName}
      subtitle="Company Profile"
      icon={
        company.logoUrl
          ? <img src={company.logoUrl} alt="Logo" style={{ width:28, height:28, objectFit:'contain' }} referrerPolicy="no-referrer"/>
          : <Building2 size={20}/>
      }
      iconBg="#f8fafc"
      iconColor="#1a1a2e"
      badge={company.state || 'India'}
      width="540px"
      submitLabel="Edit Profile"
      onSubmit={canEdit ? () => { onClose(); onEdit(company); } : undefined}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* Company identity strip */}
        <div style={{ background:'#1a1a2e', borderRadius:14, padding:'16px 18px', display:'flex', alignItems:'center', gap:14 }}>
          <div style={{ width:52, height:52, borderRadius:12, background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden' }}>
            {company.logoUrl
              ? <img src={company.logoUrl} alt="Logo" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} referrerPolicy="no-referrer"/>
              : <Building2 size={24} color="#1a1a2e"/>}
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:'#fff', margin:0, lineHeight:1.3 }}>{company.companyName}</p>
            <div style={{ display:'flex', flexWrap:'wrap', gap:12, marginTop:6 }}>
              {company.state && (
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  <MapPin size={11} color="#f97316"/> {company.state}
                </span>
              )}
              {company.gstNumber && (
                <span style={{ display:'flex', alignItems:'center', gap:4, fontSize:10, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                  <FileText size={11} color="#f97316"/> {company.gstNumber}
                </span>
              )}
            </div>
          </div>
          <span style={{ marginLeft:'auto', padding:'3px 10px', background:'#f97316', borderRadius:20, fontSize:9, fontWeight:800, color:'#fff', textTransform:'uppercase', letterSpacing:'0.1em', flexShrink:0 }}>
            Registered Entity
          </span>
        </div>

        {/* Contact */}
        <PanelDivider label="Contact Details"/>
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          <ContactRow icon={<Mail size={15}/>}  label="Primary Email"   value={company.email}/>
          <ContactRow icon={<Phone size={15}/>} label="Business Phone"  value={company.phoneNumber}/>
          <ContactRow icon={<MapPin size={15}/>} label="Office Address" value={company.address}/>
        </div>

        {/* Bank */}
        <PanelDivider label="Settlement Details"/>
        <div style={{ background:'#f8fafc', border:'1px solid #f0f2f5', borderRadius:12, padding:'14px 16px', display:'flex', flexDirection:'column', gap:10 }}>
          <DetailRow label="Bank Name"       value={company.bankName}/>
          <DetailRow label="Account No"      value={company.accountNumber}/>
          <DetailRow label="IFSC"            value={company.ifscCode}/>
          <DetailRow label="Branch"          value={company.branchName}/>
          <div style={{ paddingTop:4 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#9ba8b5', textTransform:'uppercase', letterSpacing:'0.06em', margin:'0 0 3px' }}>Account Holder</p>
            <p style={{ fontSize:13, fontWeight:700, color:'#1e293b', margin:0 }}>{company.accountHolderName || '--'}</p>
          </div>
        </div>

        {/* Seal preview if present */}
        {company.sealUrl && (
          <>
            <PanelDivider label="Company Seal"/>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:72, height:72, borderRadius:'50%', border:'2px dashed #e5e7eb', overflow:'hidden', flexShrink:0 }}>
                <img src={company.sealUrl} alt="Seal" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
              </div>
              <p style={{ fontSize:11, color:'#94a3b8', fontWeight:500 }}>Company seal on file</p>
            </div>
          </>
        )}

      </div>
    </RightPanel>
  );
}
