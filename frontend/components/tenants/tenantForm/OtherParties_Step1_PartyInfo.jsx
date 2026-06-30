import Select from 'react-select';
import { Controller } from 'react-hook-form';
import { Field, inp, SELECT_STYLES } from './OtherParties_formUtils.jsx';

export default function Step1_PartyInfo({ register, control, errors, watch, companies }) {
  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

        {/* Legal Name */}
        <div style={{ gridColumn:'1/-1' }}>
          <Field label="Legal / Registered Name" required error={errors.name && 'Required'}>
            <input {...register('name', { required: true })} className={inp} placeholder="e.g. Arjun Mehta Enterprises Pvt. Ltd."/>
          </Field>
        </div>

        {/* Company */}
        <div style={{ gridColumn:'1/-1' }}>
          <Field label="Registered Company">
            <Controller name="company" control={control} render={({ field }) => (
              <Select
                options={companies.map(c => ({ value: c.companyName, label: c.companyName }))}
                placeholder="Select company..."
                isClearable
                value={companies.map(c => ({ value: c.companyName, label: c.companyName })).find(o => o.value === field.value) || null}
                onChange={opt => field.onChange(opt?.value || '')}
                styles={SELECT_STYLES}
              />
            )}/>
          </Field>
        </div>

        <Field label="Contact Person" required error={errors.contactPerson && 'Required'}>
          <input {...register('contactPerson', { required: true })} className={inp} placeholder="Full Name"/>
        </Field>
        <Field label="Designation">
          <input {...register('designation')} className={inp} placeholder="Position / Role"/>
        </Field>

        <Field label="Mobile" required error={errors.mobile && 'Required'}>
          <input {...register('mobile', { required: true })} className={inp} placeholder="+91 98765 43210"/>
        </Field>
        <Field label="Email">
          <input {...register('email')} type="email" className={inp} placeholder="email@company.com"/>
        </Field>

        {/* Alternate Contact */}
        <div style={{ gridColumn:'1/-1' }}>
          <Field label="Alternate Contact">
            <input {...register('alternateContactPerson')} className={inp} placeholder="Secondary contact name / number"/>
          </Field>
        </div>

        {/* GST */}
        <Field label="GST Number">
          <input {...register('gstNo')} className={inp} placeholder="e.g. 27AABCA1234Z1Z5"/>
        </Field>

        <Field label="PAN Number">
          <input {...register('panNumber')} className={inp} placeholder="e.g. AABCA1234Z"/>
        </Field>
        <Field label="State">
          <input {...register('state')} className={inp} placeholder="e.g. Madhya Pradesh"/>
        </Field>
        <Field label="Pincode">
          <input {...register('pincode')} className={inp} placeholder="e.g. 474001"/>
        </Field>

        {/* Billing Address */}
        <div style={{ gridColumn:'1/-1' }}>
          <Field label="Billing / Office Address" required error={errors.billingAddress && 'Required'}>
            <textarea {...register('billingAddress', { required: true })} rows={3} className={inp}
              style={{ height:'auto', padding:'12px 16px', resize:'none', lineHeight:1.6 }}
              placeholder="Complete office address for billing..."/>
          </Field>
        </div>
      </div>
    </div>
  );
}
