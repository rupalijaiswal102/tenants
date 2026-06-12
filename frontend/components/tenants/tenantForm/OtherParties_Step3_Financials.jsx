import { IndianRupee, AlertCircle } from 'lucide-react';
import { Field, inp } from './OtherParties_formUtils.jsx';

export default function Step3_Financials({ register }) {
  const iconStyle = { position:'absolute', left:12, top:'50%', transform:'translateY(-50%)' };

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

      {/* Monthly Rent */}
      <Field label="Monthly Rent (₹)" required>
        <div style={{ position:'relative' }}>
          <IndianRupee size={14} color="#94a3b8" style={iconStyle}/>
          <input {...register('currentRent')} type="number" className={inp} style={{ paddingLeft:32 }} placeholder="0.00"/>
        </div>
      </Field>

      {/* Escalation */}
      <Field label="Escalation (% per year)">
        <input {...register('escalationPercent')} type="number" step="0.1" className={inp} placeholder="5"/>
      </Field>

      {/* Security Deposit */}
      <Field label="Security Deposit (₹)">
        <div style={{ position:'relative' }}>
          <IndianRupee size={14} color="#94a3b8" style={iconStyle}/>
          <input {...register('securityDeposit')} type="number" className={inp} style={{ paddingLeft:32 }} placeholder="0.00"/>
        </div>
      </Field>
      <div/>

      {/* Opening Balance */}
      <div style={{ gridColumn:'1/-1', paddingTop:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
          <div style={{ width:3, height:16, background:'#f97316', borderRadius:2 }}/>
          <p style={{ fontSize:12, fontWeight:800, color:'#0f172a', textTransform:'uppercase', letterSpacing:'0.08em', margin:0 }}>Opening Balance</p>
        </div>

        <div style={{ background:'#f8fafc', borderRadius:14, padding:20, border:'1px solid #e8edf4' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

            <Field label="Balance Amount (₹)">
              <div style={{ position:'relative' }}>
                <IndianRupee size={14} color="#94a3b8" style={iconStyle}/>
                <input {...register('openingBalanceAmount')} type="number" className={inp} style={{ paddingLeft:32 }} placeholder="0.00"/>
              </div>
            </Field>

            <Field label="Transaction Type">
              <select {...register('openingBalanceType')} className={inp} style={{ cursor:'pointer' }}>
                <option value="Debit">Debit (Pending Dues)</option>
                <option value="Credit">Credit (Advance)</option>
              </select>
            </Field>

            <Field label="Reference Date">
              <input {...register('openingBalanceDate')} type="date" className={inp}/>
            </Field>

            <Field label="Notes">
              <input {...register('openingBalanceNotes')} className={inp} placeholder="Brief note..."/>
            </Field>
          </div>

          {/* Info banner */}
          <div style={{ marginTop:14, padding:'10px 14px', background:'#fff7ed', borderRadius:10, border:'1px solid #fed7aa', display:'flex', alignItems:'flex-start', gap:8 }}>
            <AlertCircle size={14} color="#f97316" style={{ flexShrink:0, marginTop:1 }}/>
            <p style={{ fontSize:11, color:'#92400e', margin:0, fontWeight:500, lineHeight:1.5 }}>
              This initializes the tenant ledger with any prior balance carried forward.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
