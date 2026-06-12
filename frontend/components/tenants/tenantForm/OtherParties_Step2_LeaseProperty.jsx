import { useState } from 'react';
import { Field, inp } from './OtherParties_formUtils.jsx';

const PURPOSES = ['Office','Bank','Nescafe','ATM','Retail Shop','Restaurant','Warehouse','Clinic','Salon','Showroom'];

export default function Step2_LeaseProperty({ register, watch, setValue, errors, mode }) {
  const [otherMode, setOtherMode] = useState(false);
  const currentPurpose = watch('rentalPurpose');

  // Show text input if user clicked "Other" OR if existing record has a custom purpose
  const showCustomInput = otherMode || (currentPurpose && !PURPOSES.includes(currentPurpose));
  const selectValue = showCustomInput ? 'Other' : (currentPurpose || '');

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

      {/* Property */}
      <div style={{ gridColumn:'1/-1' }}>
        <Field label="Premises / Property Address" required error={errors.property && 'Required'}>
          <textarea {...register('property', { required: true })} rows={2} className={inp}
            style={{ height:'auto', padding:'12px 16px', resize:'none', lineHeight:1.6 }}
            placeholder="e.g. Tower A, 3rd Floor, Neo Meridian, Gwalior (M.P)"/>
        </Field>
      </div>

      <Field label="Lease Start Date">
        <input {...register('leaseStart')} type="date" className={inp}/>
      </Field>
      <Field label="Lease End Date">
        <input {...register('leaseEnd')} type="date" className={inp}/>
      </Field>

      <Field label="Tenure (Months)">
        <input {...register('tenure')} type="number" className={inp} placeholder="12"/>
      </Field>
      <Field label="Lock-in Period (Months)">
        <input {...register('lockIn')} type="number" className={inp} placeholder="6"/>
      </Field>

      <Field label="Notice Period (Days)">
        <input {...register('noticePeriod')} type="number" className={inp} placeholder="60"/>
      </Field>
      <Field label="Rent-Free Period (Days)">
        <input {...register('rentFreePeriodDays')} type="number" className={inp} placeholder="0"/>
      </Field>

      {/* Rental Purpose */}
      <div style={{ gridColumn:'1/-1' }}>
        <Field label="Rental Purpose">
          <div style={{ display:'grid', gridTemplateColumns: showCustomInput ? '1fr 1fr' : '1fr', gap:10 }}>
            <select className={inp} style={{ cursor:'pointer' }}
              value={selectValue}
              onChange={e => {
                if (e.target.value === 'Other') {
                  setOtherMode(true);
                  setValue('rentalPurpose', '');
                } else {
                  setOtherMode(false);
                  setValue('rentalPurpose', e.target.value);
                }
              }}>
              <option value="">Select purpose...</option>
              {PURPOSES.map(o => <option key={o}>{o}</option>)}
              <option value="Other">Other</option>
            </select>
            {showCustomInput && (
              <input {...register('rentalPurpose')} className={inp} placeholder="Specify purpose..."/>
            )}
          </div>
        </Field>
      </div>

      <Field label="Next Escalation Date">
        <input {...register('nextEscalationDate')} type="date" className={inp}/>
      </Field>
      <Field label="Reference Date">
        <input {...register('referenceDate')} type="date" className={inp}/>
      </Field>

      <Field label="Agreement Status">
        <select {...register('agreementStatus')} className={inp} style={{ cursor:'pointer' }}>
          <option value="Pending">Pending Verification</option>
          <option value="Active">Active</option>
          <option value="Expired">Expired</option>
        </select>
      </Field>

      {/* System Code */}
      <div style={{ gridColumn:'1/-1' }}>
        <Field label={mode === 'otherParty' ? 'System Party Code' : 'System Tenant Code'}>
          <input {...register('code')} readOnly className={inp}
            style={{ background:'#f8fafc', color:'#94a3b8', cursor:'not-allowed', fontFamily:'monospace', fontSize:13 }}/>
        </Field>
      </div>
    </div>
  );
}
