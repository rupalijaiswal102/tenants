import { Clock, IndianRupee, FileCheck, FileText } from 'lucide-react';
import { motion } from 'motion/react';
import { TimelineItemLarge, ConfigBlock } from '../TenantPrimitives.jsx';

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
          <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Lease Roadmap</p>
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
          <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Financial Configuration</p>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
          {configs.map(([l, v, h]) => <ConfigBlock key={l} label={l} value={v} highlight={h}/>)}
        </div>
      </div>
    </motion.div>
  );
}

// ── Documents Tab ─────────────────────────────────────────────────────────────
export function DocumentsTab({ tenant }) {
  return (
    <motion.div key="doc" initial={{ opacity:0, y:8 }} animate={{ opacity:1, y:0 }} exit={{ opacity:0, y:-8 }}>
      {tenant.agreementFileUrl ? (
        <div style={{ ...SC, padding:24, maxWidth:360, display:'flex', flexDirection:'column', alignItems:'center', gap:16, textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:14, background:'#f0fdf4', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <FileCheck size={26} color="#10b981"/>
          </div>
          <div>
            <p style={{ fontSize:14, fontWeight:800, color:'#1a1a2e', margin:0 }}>Lease Agreement</p>
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
    </motion.div>
  );
}
