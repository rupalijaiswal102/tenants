import React from 'react';
import { UseFormRegister } from 'react-hook-form';
import { cn } from '@/lib/utils';

interface Props {
  register:         UseFormRegister<any>;
  watchedTaxOption: string;
  watchBaseRent:    number;
  watchCgst:        number;
  watchSgst:        number;
  watchTotalInvoice:number;
  watchBalance:     number;
  watchPaymentStatus: string;
}

const statusStyles: Record<string, string> = {
  Paid:    'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
  Partial: 'bg-amber-500/20  text-amber-400  border border-amber-500/30',
  Pending: 'bg-rose-500/20   text-rose-400   border border-rose-500/30',
};

export function FinancialSummaryPanel({
  register, watchedTaxOption,
  watchBaseRent, watchCgst, watchSgst,
  watchTotalInvoice, watchBalance, watchPaymentStatus,
}: Props) {
  return (
    <div className="bg-slate-900 rounded-[28px] p-8 text-white shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 blur-[60px] rounded-full -mr-16 -mt-16" />
      <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-6">Financial Summary</h3>

      <div className="space-y-4">
        {/* Subtotal */}
        <div className="flex justify-between items-center text-slate-400 text-sm">
          <span>SubTotal (All Items)</span>
          <span className="font-bold text-white">₹{watchBaseRent.toLocaleString()}</span>
        </div>

        {/* GST breakdown */}
        {watchedTaxOption === 'GST' && (
          <>
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>CGST (9%)</span>
              <span className="font-bold text-white">₹{watchCgst.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>SGST (9%)</span>
              <span className="font-bold text-white">₹{watchSgst.toLocaleString()}</span>
            </div>
          </>
        )}

        <div className="h-px bg-white/10 my-4" />

        {/* Total + Received */}
        <div className="flex justify-between items-end">
          <div>
            <p className="text-[10px] text-primary font-black uppercase tracking-wider">Total Payable</p>
            <p className="text-3xl font-black">₹{watchTotalInvoice.toLocaleString()}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Received</p>
            <input
              type="number"
              {...register('receivedAmount', { valueAsNumber: true })}
              className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-right text-sm font-bold focus:bg-white/20 outline-none transition-all"
            />
          </div>
        </div>

        {/* TDS + Balance */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex flex-col">
            <span className="text-[10px] text-slate-400 font-bold uppercase">TDS Deducted</span>
            <input
              type="number"
              {...register('tdsAmount', { valueAsNumber: true })}
              className="w-24 bg-white/10 border border-white/20 rounded px-2 py-1 text-right text-xs font-bold focus:bg-white/20 outline-none transition-all mt-1"
            />
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Balance Due</span>
            <p className={cn('text-lg font-black', watchBalance > 0 ? 'text-rose-400' : 'text-emerald-400')}>
              ₹{watchBalance.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Status badge */}
        <div className="mt-4 flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Status:</span>
          <span className={cn('px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest', statusStyles[watchPaymentStatus] || statusStyles.Pending)}>
            {watchPaymentStatus}
          </span>
        </div>
      </div>
    </div>
  );
}
