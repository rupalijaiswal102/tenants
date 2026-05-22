import { ReceiptIndianRupee } from 'lucide-react';

interface Props {
  totalInvoiced:   number;
  totalReceived:   number;
  totalOutstanding:number;
}

export function InvoiceStatCards({ totalInvoiced, totalReceived, totalOutstanding }: Props) {
  const cards = [
    { label:'Total Invoiced',    value: totalInvoiced,    color:'blue'   },
    { label:'Total Received',    value: totalReceived,    color:'emerald'},
    { label:'Total Outstanding', value: totalOutstanding, color:'rose'   },
  ];

  const bg:  any = { blue:'bg-blue-50',    emerald:'bg-emerald-50',    rose:'bg-rose-50'    };
  const txt: any = { blue:'text-blue-600', emerald:'text-emerald-600', rose:'text-rose-600' };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      {cards.map(c => (
        <div key={c.label} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className={`p-3 rounded-xl ${bg[c.color]} ${txt[c.color]}`}>
            <ReceiptIndianRupee size={24}/>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">{c.label}</p>
            <p className="text-2xl font-bold text-slate-800">₹{c.value.toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
