import { useState } from 'react';
import { Building2, Phone, Mail, CreditCard, Upload } from 'lucide-react';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import RightPanel, { PanelGrid, PanelField, PanelInput, PanelTextarea, PanelDivider } from '../RightPanel.jsx';

export default function CompanyFormModal({ isOpen, onClose, company, onSuccess }) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoPreview, setLogoPreview]   = useState(company?.logoUrl || null);
  const [sealPreview, setSealPreview]   = useState(company?.sealUrl || null);

  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: company ? { ...company } : { status: true, state: 'Madhya Pradesh' },
  });

  const handleLogoChange = e => {
    const file = e.target.files?.[0];
    if (file) { const r = new FileReader(); r.onloadend = () => setLogoPreview(r.result); r.readAsDataURL(file); }
  };

  const handleSealChange = e => {
    const file = e.target.files?.[0];
    if (file) { const r = new FileReader(); r.onload = () => setSealPreview(r.result); r.readAsDataURL(file); }
  };

  const onSubmit = handleSubmit(async (data) => {
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
      if (company) await axios.put(`/api/companies/${company.id}`, formData, config);
      else         await axios.post('/api/companies', formData, config);
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.error || 'Error saving company');
    } finally { setIsSubmitting(false); }
  });

  return (
    <RightPanel
      isOpen={isOpen}
      onClose={onClose}
      title={company ? 'Update Company Profile' : 'New Company'}
      subtitle="Enter business details and branding assets"
      icon={<Building2 size={20}/>}
      iconBg="#fff7ed"
      iconColor="#f97316"
      width="620px"
      submitLabel={company ? 'Update Profile' : 'Register Company'}
      onSubmit={onSubmit}
      submitLoading={isSubmitting}
    >
      <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

        {/* ── Basic Info ── */}
        <PanelDivider label="Basic Information"/>
        <PanelField label="Company Name" required>
          <PanelInput {...register('companyName', { required:'Required' })}
            placeholder="e.g. Gravity Infrastructure Pvt. Ltd."
            style={errors.companyName ? { borderColor:'#f87171' } : {}}/>
          {errors.companyName && <span style={{ fontSize:10, color:'#ef4444', marginTop:3 }}>{errors.companyName.message}</span>}
        </PanelField>

        <PanelField label="Office Address">
          <PanelTextarea {...register('address')} rows={3} placeholder="Full address for invoice header…"/>
        </PanelField>

        <PanelGrid>
          <PanelField label="GSTIN Number">
            <PanelInput {...register('gstNumber')} placeholder="22AAAAA0000A1Z5" style={{ fontFamily:'monospace' }}/>
          </PanelField>
          <PanelField label="State">
            <PanelInput {...register('state')} placeholder="e.g. Madhya Pradesh"/>
          </PanelField>
        </PanelGrid>

        <label style={{ display:'inline-flex', alignItems:'center', gap:10, cursor:'pointer' }}>
          <input type="checkbox" {...register('status')} style={{ accentColor:'#f97316', width:16, height:16 }}/>
          <span style={{ fontSize:12, fontWeight:700, color:'#64748b' }}>Active Business Unit</span>
        </label>

        {/* ── Contact ── */}
        <PanelDivider label="Contact Information"/>
        <PanelGrid>
          <PanelField label="Phone Number">
            <PanelInput {...register('phoneNumber')} icon={Phone} placeholder="+91 98765 43210"/>
          </PanelField>
          <PanelField label="Email Address">
            <PanelInput {...register('email')} icon={Mail} type="email" placeholder="info@company.com"/>
          </PanelField>
        </PanelGrid>

        {/* ── Bank ── */}
        <PanelDivider label="Bank Details"/>
        <PanelField label="Account Holder Name" fullWidth>
          <PanelInput {...register('accountHolderName')} placeholder="Name as per bank records"/>
        </PanelField>
        <PanelGrid>
          <PanelField label="Bank Name">
            <PanelInput {...register('bankName')} icon={Building2} placeholder="State Bank of India"/>
          </PanelField>
          <PanelField label="Account Number">
            <PanelInput {...register('accountNumber')} icon={CreditCard} placeholder="XXXX XXXX XXXX"/>
          </PanelField>
        </PanelGrid>
        <PanelGrid>
          <PanelField label="IFSC Code">
            <PanelInput {...register('ifscCode')} placeholder="SBIN0001234" style={{ fontFamily:'monospace' }}/>
          </PanelField>
          <PanelField label="Branch">
            <PanelInput {...register('branchName')} placeholder="Branch name"/>
          </PanelField>
        </PanelGrid>

        {/* ── Logo ── */}
        <PanelDivider label="Branding"/>
        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          <div style={{ width:72, height:72, borderRadius:12, border:'1px solid #e5e7eb', background:'#f8f9fb', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
            {logoPreview
              ? <img src={logoPreview} alt="Logo" style={{ maxWidth:'100%', maxHeight:'100%', objectFit:'contain' }} referrerPolicy="no-referrer"/>
              : <Building2 size={28} color="#d1d5db"/>}
          </div>
          <label style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', padding:'16px', border:'2px dashed #e5e7eb', borderRadius:10, cursor:'pointer', gap:6, transition:'all 0.15s' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='#f97316'}
            onMouseLeave={e => e.currentTarget.style.borderColor='#e5e7eb'}>
            <input type="file" id="logoFile" accept="image/*" onChange={handleLogoChange} style={{ display:'none' }}/>
            <Upload size={18} color="#9ba8b5"/>
            <span style={{ fontSize:11, fontWeight:600, color:'#64748b' }}>Upload Logo</span>
            <span style={{ fontSize:10, color:'#9ba8b5' }}>Transparent PNG, 400×200px ideal</span>
          </label>
        </div>

        {/* ── Seal ── */}
        <PanelDivider label="Company Seal"/>
        <div style={{ display:'flex', gap:16, alignItems:'center' }}>
          <div style={{ width:72, height:72, borderRadius:'50%', border:'2px dashed #e5e7eb', background:'#f8f9fb', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
            {sealPreview
              ? <img src={sealPreview} alt="Seal" style={{ width:'100%', height:'100%', objectFit:'contain' }}/>
              : <span style={{ fontSize:9, fontWeight:700, color:'#d1d5db' }}>SEAL</span>}
          </div>
          <div style={{ flex:1, display:'flex', flexDirection:'column', gap:6 }}>
            <label style={{ display:'flex', flexDirection:'column', alignItems:'center', padding:'14px', border:'2px dashed #e5e7eb', borderRadius:10, cursor:'pointer', gap:5, transition:'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='#f97316'}
              onMouseLeave={e => e.currentTarget.style.borderColor='#e5e7eb'}>
              <input type="file" id="sealFile" accept="image/*" onChange={handleSealChange} style={{ display:'none' }}/>
              <Upload size={16} color="#9ba8b5"/>
              <span style={{ fontSize:11, fontWeight:600, color:'#64748b' }}>Upload Seal</span>
              <span style={{ fontSize:10, color:'#9ba8b5' }}>PNG with transparent background</span>
            </label>
            {sealPreview && (
              <button type="button"
                onClick={() => { setSealPreview(null); const i=document.getElementById('sealFile'); if(i) i.value=''; }}
                style={{ fontSize:11, fontWeight:700, color:'#ef4444', background:'none', border:'none', cursor:'pointer', alignSelf:'flex-start' }}>
                ✕ Remove Seal
              </button>
            )}
          </div>
        </div>

      </div>
    </RightPanel>
  );
}
