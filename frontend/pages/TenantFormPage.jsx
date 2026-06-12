import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { User, Building, IndianRupee, FileCheck, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-hot-toast';
import axios from 'axios';

// ── Sub-components ────────────────────────────────────────────────────────────
import { getSteps }      from '../components/tenants/tenantForm/OtherParties_formUtils.jsx';
import FormHeader from '../components/tenants/tenantForm/OtherParties_FormHeader.jsx';
import StepIndicator     from '../components/tenants/tenantForm/OtherParties_StepIndicator.jsx';
import FormNavFooter     from '../components/tenants/tenantForm/OtherParties_FormNavFooter.jsx';
import Step1_PartyInfo   from '../components/tenants/tenantForm/OtherParties_Step1_PartyInfo.jsx';
import Step2_LeaseProperty from '../components/tenants/tenantForm/OtherParties_Step2_LeaseProperty.jsx';
import Step3_Financials  from '../components/tenants/tenantForm/OtherParties_Step3_Financials.jsx';
import Step4_Documents   from '../components/tenants/tenantForm/OtherParties_Step4_Documents.jsx';

// ── Step icon map ─────────────────────────────────────────────────────────────
const STEP_ICONS = [
  <User size={15} color="#f97316"/>,
  <Building size={15} color="#f97316"/>,
  <IndianRupee size={15} color="#f97316"/>,
  <FileCheck size={15} color="#f97316"/>,
];

// ── Default form values ───────────────────────────────────────────────────────
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

export default function TenantFormPage({ mode = 'tenant' }) {
  const STEPS   = getSteps(mode);
  const basePath = mode === 'otherParty' ? '/other-parties' : '/tenants';
  const apiBase  = mode === 'otherParty' ? '/api/other-parties' : '/api/tenants';

  const { id }   = useParams();
  const navigate = useNavigate();

  // ── State ──────────────────────────────────────────────────────────────────
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

  const { register, handleSubmit, control, setValue, watch, reset, getValues, formState: { errors } } = useForm({
    defaultValues: DEFAULT_VALUES,
  });

  // ── Fetch data on mount ────────────────────────────────────────────────────
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
        ...DEFAULT_VALUES,
        ...t,
        name:                   str(t.name),
        company:                str(t.company),
        property:               str(t.property),
        contactPerson:          str(t.contactPerson),
        designation:            str(t.designation),
        mobile:                 str(t.mobile),
        email:                  str(t.email),
        alternateContactPerson: str(t.alternateContactPerson),
        rentalPurpose:          str(t.rentalPurpose),
        leaseStart:             str(t.leaseStart),
        leaseEnd:               str(t.leaseEnd),
        nextEscalationDate:     str(t.nextEscalationDate),
        referenceDate:          str(t.referenceDate),
        gstNo:                  str(t.gstNo),
        panNumber:              str(t.panNumber),
        legalName:              str(t.legalName),
        billingAddress:         str(t.billingAddress),
        state:                  str(t.state),
        pincode:                str(t.pincode),
        agreementStatus:        t.agreementStatus   || 'Pending',
        agreementFileUrl:       str(t.agreementFileUrl),
        openingBalanceType:     t.openingBalanceType || 'Debit',
        openingBalanceNotes:    str(t.openingBalanceNotes),
        tenure:               t.tenure               || 12,
        lockIn:               t.lockIn               || 6,
        noticePeriod:         t.noticePeriod         || 60,
        escalationPercent:    t.escalationPercent    ?? 5,
        securityDeposit:      t.securityDeposit      || 0,
        currentRent:          t.currentRent          || 0,
        rentFreePeriodDays:   t.rentFreePeriodDays   || 0,
        openingBalanceAmount: t.openingBalanceAmount || 0,
        openingBalanceDate:   t.openingBalanceDate   || DEFAULT_VALUES.openingBalanceDate,
      });
    } catch {
      toast.error('Failed to load');
      navigate(basePath);
    } finally {
      setInitialLoading(false);
    }
  };

  // ── GST autofill ──────────────────────────────────────────────────────────
  const handleGstFetch = async (gstNo) => {
    if (!gstNo || !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][A-Z0-9]{3}$/.test(gstNo)) return;
    setGstLoading(true); setGstSuccess(false);
    try {
      const r = await fetch(`/api/gst/${gstNo}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      if (d.billingAddress || d.address) {
        setValue('billingAddress', d.billingAddress || d.address);
        setGstSuccess(true);
        toast.success('Address autofilled');
      }
    } catch {} finally { setGstLoading(false); }
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const onFormSubmit = async (data) => {
    setLoading(true);
    const startTime = Date.now();
    try {
      // getValues() ensures unmounted step fields (e.g. Step 3 when submitting from Step 4) are included
      const allValues = { ...getValues(), ...data };
      const formData = new FormData();
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
      navigate(basePath);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (initialLoading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:400 }}>
      <Loader2 size={36} color="#f97316" style={{ animation:'spin 1s linear infinite' }}/>
    </div>
  );

  const currentStepData = STEPS[step - 1];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:'100vh', background:'#F4F6FA', paddingBottom:60 }}>

      {/* Orange top bar */}
      <div style={{ background:'linear-gradient(135deg,#f97316,#ea580c)', height:8, width:'100%' }}/>

      {/* Sticky header */}
      <FormHeader
        mode={mode} id={id}
        step={step} totalSteps={STEPS.length}
        stepSub={currentStepData.sub}
        loading={loading} compressing={compressing}
        onSubmit={handleSubmit(onFormSubmit)}
      />

      <div style={{ maxWidth:900, margin:'0 auto', padding:'20px 24px 0' }}>

        {/* Step indicator */}
        <StepIndicator steps={STEPS} currentStep={step} onStepClick={setStep}/>

        {/* Form card */}
        <form onSubmit={handleSubmit(onFormSubmit)}>
          <AnimatePresence mode="wait">
            <motion.div key={step} initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }} exit={{ opacity:0, x:-20 }} transition={{ duration:0.2 }}
              style={{ background:'#fff', borderRadius:20, border:'1px solid #e8edf4', boxShadow:'0 1px 3px rgba(0,0,0,0.04)', overflow:'hidden' }}>

              {/* Card header */}
              <div style={{ borderBottom:'2px solid #f8fafc', padding:'20px 28px', display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:32, height:32, borderRadius:9, background:'rgba(249,115,22,0.1)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {STEP_ICONS[step - 1]}
                </div>
                <div>
                  <p style={{ fontSize:10, fontWeight:800, color:'#f97316', textTransform:'uppercase', letterSpacing:'0.12em', margin:0 }}>{currentStepData.title}</p>
                  <p style={{ fontSize:12, color:'#94a3b8', margin:0, fontWeight:500 }}>{currentStepData.sub}</p>
                </div>
              </div>

              {/* Step content */}
              <div style={{ padding:28 }}>
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
              </div>

              {/* Navigation footer */}
              <FormNavFooter
                steps={STEPS} currentStep={step}
                onPrev={() => setStep(s => s - 1)}
                onNext={() => setStep(s => s + 1)}
                onSubmit={handleSubmit(onFormSubmit)}
                loading={loading} compressing={compressing}
                mode={mode} id={id}
              />
            </motion.div>
          </AnimatePresence>
        </form>
      </div>
    </div>
  );
}
