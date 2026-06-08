import React from 'react';
import { Plus, Trash2, Receipt } from 'lucide-react';
import { UseFormRegister } from 'react-hook-form';

interface Props {
  fields:       any[];
  register:     UseFormRegister<any>;
  append:       (value: any) => void;
  remove:       (index: number) => void;
  fromDate:     string;
  toDate:       string;
  currentMonthName: string;
  currentYear:  number;
}

export function InvoiceItemsTable({
  fields, register, append, remove,
  fromDate, toDate, currentMonthName, currentYear,
}: Props) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
          <Receipt size={18} className="text-primary" />
          Invoice Items
        </h3>
        <button
          type="button"
          onClick={() => append({
            particular: '', hsnSac: '997212',
            month: `${currentMonthName}'${currentYear}`,
            fromDate, toDate, amount: 0,
          })}
          className="text-xs font-bold text-primary hover:text-orange-600 flex items-center gap-1 py-1 px-3 bg-primary/5 rounded-lg border border-primary/20 transition-all"
        >
          <Plus size={14} /> Add Charge Item
        </button>
      </div>

      <div className="border border-slate-100 rounded-xl overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 text-[10px] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200">
            <tr>
              <th className="px-4 py-3 min-w-[200px]">Particular</th>
              <th className="px-4 py-3">HSN/SAC</th>
              <th className="px-4 py-3">Month</th>
              <th className="px-4 py-3">From Date</th>
              <th className="px-4 py-3">To Date</th>
              <th className="px-4 py-3 w-32">Amount</th>
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {fields.map((field, index) => (
              <tr key={field.id} className="group hover:bg-slate-50/50 transition-colors">
                <td className="px-2 py-2">
                  <input
                    {...register(`items.${index}.particular` as const)}
                    placeholder="e.g. Rental Charges"
                    className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-medium"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    {...register(`items.${index}.hsnSac` as const)}
                    placeholder="HSN/SAC"
                    className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-medium"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    {...register(`items.${index}.month` as const)}
                    placeholder="Month'Year"
                    className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-medium"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="date"
                    {...register(`items.${index}.fromDate` as const)}
                    className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-[11px] font-medium"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="date"
                    {...register(`items.${index}.toDate` as const)}
                    className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-[11px] font-medium"
                  />
                </td>
                <td className="px-2 py-2">
                  <input
                    type="number" step="0.01"
                    {...register(`items.${index}.amount` as const, { valueAsNumber: true })}
                    className="w-full px-3 py-1.5 border border-transparent group-hover:border-slate-200 focus:border-primary focus:bg-white rounded outline-none transition-all text-sm font-bold text-right"
                  />
                </td>
                <td className="px-2 py-2">
                  {fields.length > 1 && (
                    <button
                      type="button"
                      onClick={() => remove(index)}
                      className="p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 rounded transition-all"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
