import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { User, Building, IndianRupee, FileCheck, Loader2, X, ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

import { getSteps }            from '../components/tenants/tenantForm/OtherParties_formUtils.jsx';
import StepIndicator           from '../components/tenants/tenantForm/OtherParties_StepIndicator.jsx';
import Step1_PartyInfo         from '../components/tenants/tenantForm/OtherParties_Step1_PartyInfo.jsx';
import Step2_LeaseProperty     from '../components/tenants/tenantForm/OtherParties_Step2_LeaseProperty.jsx';
import Step3_Financials        from '../components/tenants/tenantForm/OtherParties_Step3_Financials.jsx';
import Step4_Documents         from '../components/tenants/tenantForm/OtherParties_Step4_Documents.jsx';

const STEP_ICONS = [
  <User size={15} color="#f97316"/>,
  <Building size={15} color="#f97316"/>,
  <IndianRupee size={15} color="#f97316"/>,
  <FileCheck size={15} color="#f97316"/>,
];

const DEFAULT_VALUES = {
  code: 'Loading...', name: '', company: '', property: '', contactPerson: '', designation: '',
  mobile: '', email: '', alternateContactPerson: '', rentalPurpose: '',
  leaseStart: '', leaseEnd: '', tenure: 12, lockIn: 6, noticePeriod: 60,
  escalationPercent: 5, nextEscalationDate: '', referenceDate: '',
  securityDeposit: 0, currentRent: 0, rentFreePeriodDays: 0,
  gstNo: '', panNumber: '', legalName: '', billingAddress: '', state: '', pincode: '',
  agreementStatus: 'Pending', agreementFileUrl: '', agreementFileType: 'PDF',
  openingBalanceAmount: 0, openingBalanceType: 'Debit',
  openingBalanceDate: new Date().toISOString().split('T')[0], openingBalanceNotes: '',
};

export default function TenantFormPage({ mode = 'tenant', propId, onClose: propOnClose, onSuccess: propOnSuccess }) {
  const STEPS    = getSteps(mode);
  const basePath = mode === 'otherParty' ? '/other-parties' : '/tenants';
  const apiBase  = mode === 'otherParty' ? '/api/other-parties' : '/api/tenants';

  const { id: paramId } = useParams();
  const id              = propId ?? paramId;   // prefer prop, fall back to URL param
  const navigate        = useNavigate();

  const [step,           setStep]           = useState(1);
  const [loading,        setLoading]        = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);
  const [compressing,    setCompressing]    = useState(false);
  const [gstLoading,     setGstLoading]     = useState(false);
  const [gstSuccess,     setGstSuccess]     = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadSpeed,    setUploadSpeed]    = useState('0 KB/s');
  const [agreementFile,  setAgreementFile]  = useState(null);
  const [filePreview,    setFilePreview]    = useState(null);
  const [companies,      setCompanies]      = useState([]);
  const [visible,        setVisible]        = useState(false);

  const { register, handleSubmit, control, setValue, watch, reset, getValues, formState: { errors } } = useForm({
    defaultValues: DEFAULT_VALUES,
  });

  // Animate in on mount
  useEffect(() => { setTimeout(() => setVisible(true), 10); }, []);

  useEffect(() => {
    fetchCompanies();
    if (id) fetchTenant();
    else    fetchNextCode();
  }, [id, mode]);

  const fetchCompanies = async () => {
    try { const r = await axios.get('/api/companies'); setCompanies(r.data); } catch {}
  };

  const fetchNextCode = async () => {
    try {
      const r = await axios.get(`${apiBase}/next-code`);
      setValue('code', r.data.code);
    } catch {
      const prefix = mode === 'otherParty' ? 'OP' : 'TN';
      setValue('code', `${prefix}${Math.floor(Math.random() * 900) + 100}`);
    }
  };

  const fetchTenant = async () => {
    try {
      const { data: t } = await axios.get(`${apiBase}/${id}`);
      const str = (v) => v ?? '';
      reset({
        ...DEFAULT_VALUES, ...t,
        name: str(t.name), company: str(t.company), property: str(t.property),
        contactPerson: str(t.contactPerson), designation: str(t.designation),
        mobile: str(t.mobile), email: str(t.email),
        alternateContactPerson: str(t.alternateContactPerson),
        rentalPurpose: str(t.rentalPurpose),
        leaseStart: str(t.leaseStart), leaseEnd: str(t.leaseEnd),
        nextEscalationDate: str(t.nextEscalationDate), referenceDate: str(t.referenceDate),
        gstNo: str(t.gstNo), panNumber: str(t.panNumber), legalName: str(t.legalName),
        billingAddress: str(t.billingAddress), state: str(t.state), pincode: str(t.pincode),
        agreementStatus: t.agreementStatus || 'Pending',
        agreementFileUrl: str(t.agreementFileUrl),
        openingBalanceType: t.openingBalanceType || 'Debit',
        openingBalanceNotes: str(t.openingBalanceNotes),
        tenure: t.tenure ?? 12, lockIn: t.lockIn ?? 6,
        noticePeriod: t.noticePeriod ?? 60, escalationPercent: t.escalationPercent ?? 5,
        securityDeposit: t.securityDeposit ?? 0, currentRent: t.currentRent ?? 0,
        rentFreePeriodDays: t.rentFreePeriodDays ?? 0,
        openingBalanceAmount: t.openingBalanceAmount ?? 0,
        openingBalanceDate: t.openingBalanceDate || DEFAULT_VALUES.openingBalanceDate,
      });
    } catch {
      toast.error('Failed to load');
      navigate(basePath);
    } finally {
      setInitialLoading(false);
    }
  };

  const handleGstFetch = async (gstNo) => {
    if (!gstNo || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]{3}$/.test(gstNo)) return;
    setGstLoading(true); setGstSuccess(false);
    try {
      const r = await fetch(`/api/gst/${gstNo}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d.billingAddress || d.address) {
        setValue('billingAddress', d.billingAddress || d.address);
        setGstSuccess(true); toast.success('Address autofilled');
      }
    } catch {} finally { setGstLoading(false); }
  };

  const onFormSubmit = async (data) => {
    setLoading(true);
    const startTime = Date.now();
    try {
      const allValues = { ...getValues(), ...data };
      const formData  = new FormData();
      Object.keys(allValues).forEach(k => {
        if (allValues[k] !== null && allValues[k] !== undefined) formData.append(k, allValues[k]);
      });
      if (agreementFile) formData.append('agreementFile', agreementFile);

      const config = {
        timeout: 300000,
        onUploadProgress: (e) => {
          const pct = Math.round((e.loaded * 100) / (e.total || 1));
          setUploadProgress(pct);
          const bps = e.loaded / ((Date.now() - startTime) / 1000);
          setUploadSpeed(bps > 1048576 ? `${(bps/1048576).toFixed(1)} MB/s` : `${(bps/1024).toFixed(0)} KB/s`);
        },
      };

      if (id) {
        await axios.put(`${apiBase}/${id}`, formData, config);
        toast.success(mode === 'otherParty' ? 'Other party updated' : 'Tenant updated');
      } else {
        await axios.post(apiBase, formData, config);
        toast.success(mode === 'otherParty' ? 'Other party created' : 'Tenant created');
      }
      if (propOnSuccess) propOnSuccess();
      else               navigate(basePath);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVisible(false);
    setTimeout(() => {
      if (propOnClose) propOnClose();
      else             navigate(basePath);
    }, 300);
  };

  const currentStepData = STEPS[step - 1];
  const isLastStep      = step === STEPS.length;
  const submitLabel     = id
    ? 'Save Changes'
    : (mode === 'otherParty' ? 'Create Other Party' : 'Create Tenant');

  if (initialLoading) return (
    <div style={{ position:'fixed', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(15,23,42,0.35)', zIndex:200 }}>
      <Loader2 size={36} color="#f97316" style={{ animation:'spin 1s linear infinite' }}/>
    </div>
  );

  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* ── Backdrop ── */}
      <div
        onClick={handleClose}
        style={{
          position:'fixed', inset:0, zIndex:199,
          background: visible ? 'rgba(15,23,42,0.4)' : 'transparent',
          backdropFilter: visible ? 'blur(2px)' : 'none',
          transition:'all 0.3s',
        }}
      />

      {/* ── Panel ── */}
      <div style={{
        position:'fixed', top:0, right:0, bottom:0, zIndex:200,
        width: 780, maxWidth:'100vw',
        background:'#fff',
        display:'flex', flexDirection:'column',
        boxShadow:'-8px 0 40px rgba(0,0,0,0.12)',
        borderRadius:'20px 0 0 20px',
        transform: visible ? 'translateX(0)' : 'translateX(100%)',
        transition:'transform 0.3s cubic-bezier(0.32,0.72,0,1)',
      }}>

        {/* ── Panel Header ── */}
        <div style={{
          padding:'18px 24px',
          borderBottom:'1px solid #f0f2f5',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexShrink:0,
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:12, background:'#fff7ed', display:'flex', alignItems:'center', justifyContent:'center' }}>
              {STEP_ICONS[step - 1]}
            </div>
            <div>
              <h2 style={{ fontSize:16, fontWeight:800, color:'#1a1a2e', margin:0 }}>
                {id ? `Edit ${mode === 'otherParty' ? 'Other Party' : 'Tenant'}` : `New ${mode === 'otherParty' ? 'Other Party' : 'Tenant'}`}
              </h2>
              <p style={{ fontSize:11, color:'#9ba8b5', margin:'2px 0 0', fontWeight:500 }}>
                Step {step} of {STEPS.length} — {currentStepData.sub}
              </p>
            </div>
          </div>
          <button onClick={handleClose}
            style={{ width:32, height:32, borderRadius:8, border:'1px solid #e5e7eb', background:'#fff', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', color:'#9ba8b5' }}>
            <X size={16}/>
          </button>
        </div>

        {/* ── Step Indicator ── */}
        <div style={{ padding:'12px 24px 0', borderBottom:'1px solid #f8f9fb', flexShrink:0 }}>
          <StepIndicator steps={STEPS} currentStep={step} onStepClick={setStep}/>
        </div>

        {/* ── Scrollable Form Content ── */}
        <div style={{ flex:1, overflowY:'auto', padding:'20px 24px' }}>
          <form onSubmit={handleSubmit(onFormSubmit)}>
            <AnimatePresence mode="wait">
              <motion.div key={step}
                initial={{ opacity:0, x:16 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-16 }}
                transition={{ duration:0.18 }}>

                {/* Step section header */}
                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:20, paddingBottom:12, borderBottom:'1px solid #f0f2f5' }}>
                  <div style={{ width:28, height:28, borderRadius:8, background:'rgba(249,115,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {STEP_ICONS[step - 1]}
                  </div>
                  <div>
                    <p style={{ fontSize:10, fontWeight:800, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.12em', margin:0 }}>{currentStepData.title}</p>
                    <p style={{ fontSize:11, color:'#94a3b8', margin:0 }}>{currentStepData.sub}</p>
                  </div>
                </div>

                {step === 1 && (
                  <Step1_PartyInfo
                    register={register} control={control} errors={errors} watch={watch}
                    companies={companies} gstLoading={gstLoading} gstSuccess={gstSuccess}
                    onGstBlur={e => handleGstFetch(e.target.value)}
                  />
                )}
                {step === 2 && (
                  <Step2_LeaseProperty
                    register={register} watch={watch} setValue={setValue}
                    errors={errors} mode={mode}
                  />
                )}
                {step === 3 && (
                  <Step3_Financials register={register}/>
                )}
                {step === 4 && (
                  <Step4_Documents
                    register={register} watch={watch} setValue={setValue}
                    agreementFile={agreementFile} setAgreementFile={setAgreementFile}
                    setFilePreview={setFilePreview}
                    loading={loading} uploadProgress={uploadProgress} uploadSpeed={uploadSpeed}
                    mode={mode}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          </form>
        </div>

        {/* ── Panel Footer (Back / Next / Submit) ── */}
        <div style={{
          padding:'14px 24px',
          borderTop:'1px solid #f0f2f5',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          flexShrink:0, background:'#fff',
        }}>
          {/* Back */}
          <button type="button" onClick={() => setStep(s => s - 1)} disabled={step === 1}
            style={{
              display:'flex', alignItems:'center', gap:6,
              padding:'9px 18px', borderRadius:9, fontFamily:'inherit',
              border: step > 1 ? '1px solid #e5e7eb' : 'none',
              background: step > 1 ? '#fff' : 'transparent',
              color: step > 1 ? '#64748b' : 'transparent',
              fontSize:13, fontWeight:600, cursor: step > 1 ? 'pointer' : 'default',
            }}>
            <ArrowLeft size={14}/> Back
          </button>

          {/* Step dots */}
          <div style={{ display:'flex', gap:5 }}>
            {STEPS.map(s => (
              <div key={s.id} style={{
                height:6, borderRadius:4, transition:'all 0.3s',
                width: step === s.id ? 20 : 6,
                background: step >= s.id ? '#f97316' : '#e8edf4',
              }}/>
            ))}
          </div>

          {/* Next / Submit */}
          {!isLastStep ? (
            <button type="button" onClick={() => setStep(s => s + 1)}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'9px 20px', background:'#f97316', color:'#fff',
                border:'none', borderRadius:9, fontSize:13, fontWeight:700,
                cursor:'pointer', fontFamily:'inherit',
                boxShadow:'0 2px 8px rgba(249,115,22,0.3)',
              }}>
              Next <ArrowRight size={14}/>
            </button>
          ) : (
            <button type="button" onClick={handleSubmit(onFormSubmit)}
              disabled={loading || compressing}
              style={{
                display:'flex', alignItems:'center', gap:6,
                padding:'9px 20px', borderRadius:9, fontFamily:'inherit',
                background: loading ? '#fdba74' : '#f97316',
                color:'#fff', border:'none', fontSize:13, fontWeight:700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow:'0 2px 8px rgba(249,115,22,0.3)',
              }}>
              {loading
                ? <Loader2 size={14} style={{ animation:'spin 1s linear infinite' }}/>
                : <Save size={14}/>}
              {loading ? 'Saving…' : submitLabel}
            </button>
          )}
        </div>
      </div>
    </>
  );
}
