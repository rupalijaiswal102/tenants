import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import axios from 'axios';
import { X, ShieldCheck, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { toast } from 'react-hot-toast';
import { type Tenant, type Company } from '../../src/types';

import { getMonthDefaults } from './invoiceUtils';
import { InvoiceItemsTable }    from './InvoiceItemsTable';
import { GSTPanel }             from './GSTPanel';
import { CRMPanel }             from './CRMPanel';
import { FinancialSummaryPanel }from './FinancialSummaryPanel';

interface Props {
  tenants:     Tenant[];
  companies:   Company[];
  onClose:     () => void;
  onSuccess:   () => void;
  initialData?: any;
}

export function InvoiceFormModal({ tenants, companies, onClose, onSuccess, initialData }: Props) {
  const [loading, setLoading] = useState(false);
  const { currentMonthName, currentYear, fromDate, toDate } = getMonthDefaults();

  const { register, control, handleSubmit, watch, setValue } = useForm({
    defaultValues: {
      invoiceNo:      initialData?.invoiceNo || `INV-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
      billDate:       initialData?.billDate  || new Date().toISOString().split('T')[0],
      tenantId:       initialData?.tenantId  || '',
      companyId:      initialData?.companyId || '',
      partyName:      initialData?.partyName || '',
      company:        initialData?.company   || '',
      property:       initialData?.property  || '',
      gstNo:          initialData?.gstNo     || '',
      taxOption:      initialData?.taxOption || 'None',
      items: initialData?.items || [{
        particular: 'Rental Charges', hsnSac: '997212',
        month: `${currentMonthName}'${currentYear}`,
        fromDate, toDate,
        amount: initialData?.baseRent || 0,
      }],
      baseRent:       initialData?.baseRent       || 0,
      cgst:           initialData?.cgst           || 0,
      sgst:           initialData?.sgst           || 0,
      applyGst:       (initialData?.cgst || 0) > 0,
      crmName:        initialData?.crmName        || '',
      crmPhone:       initialData?.crmPhone       || '',
      crmEmail:       initialData?.crmEmail       || '',
      totalInvoice:   initialData?.totalInvoice   || 0,
      receivedAmount: initialData?.receivedAmount || initialData?.received || 0,
      tdsAmount:      initialData?.tdsAmount      || 0,
      balanceAmount:  initialData?.balanceAmount  || initialData?.balance  || 0,
      paymentStatus:  initialData?.paymentStatus  || 'Pending',
      remarks:        initialData?.remarks        || '',
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const watchedItems      = watch('items');
  const watchedTaxOption  = watch('taxOption');
  const watchedReceived   = watch('receivedAmount');
  const watchedTds        = watch('tdsAmount');
  const watchApplyGst     = watch('applyGst');
  const watchBaseRent     = watch('baseRent');
  const watchCgst         = watch('cgst');
  const watchSgst         = watch('sgst');
  const watchTotalInvoice = watch('totalInvoice');
  const watchBalance      = watch('balanceAmount');
  const watchPaymentStatus= watch('paymentStatus');
  const watchPartyName    = watch('partyName');
  const watchCompany      = watch('company');

  // ── Auto-calculate totals ────────────────────────────────────────────────
  useEffect(() => {
    const subTotal    = watchedItems.reduce((acc, item) => acc + (Number(item.amount) || 0), 0);
    const isGST       = watchedTaxOption === 'GST';
    const cgstValue   = isGST ? Number((subTotal * 0.09).toFixed(2)) : 0;
    const sgstValue   = isGST ? Number((subTotal * 0.09).toFixed(2)) : 0;
    const totalValue  = Number((subTotal + cgstValue + sgstValue).toFixed(2));
    const balanceValue= Number((totalValue - (watchedReceived + watchedTds)).toFixed(2));

    let status: string = 'Pending';
    if (balanceValue <= 0)     status = 'Paid';
    else if (watchedReceived > 0) status = 'Partial';

    setValue('baseRent',      subTotal);
    setValue('cgst',          cgstValue);
    setValue('sgst',          sgstValue);
    setValue('totalInvoice',  totalValue);
    setValue('balanceAmount', balanceValue);
    setValue('paymentStatus', status);
  }, [watchedItems, watchedTaxOption, watchedReceived, watchedTds, setValue]);

  // ── Tenant / Company change handlers ────────────────────────────────────
  const handleTenantChange = (id: string) => {
    const tenant = tenants.find(t => t.id === id);
    if (!tenant) return;
    const companyRef = companies.find(c => c.companyName === tenant.company);
    setValue('tenantId',  id);
    setValue('companyId', companyRef?.id || '');
    setValue('partyName', tenant.name);
    setValue('company',   tenant.company);
    setValue('property',  tenant.property);
    setValue('gstNo',     tenant.gstNo);
    if (watchedItems.length > 0 && watchedItems[0].particular === 'Rental Charges') {
      setValue('items.0.amount', tenant.currentRent);
    }
  };

  const handleCompanyChange = (id: string) => {
    const company = companies.find(c => c.id === id);
    if (!company) return;
    setValue('companyId', id);
    setValue('company',   company.companyName);
  };

  // ── Submit ───────────────────────────────────────────────────────────────
  const onFormSubmit = async (data: any) => {
    setLoading(true);
    try {
      const url    = initialData?.id ? `/api/invoices/${initialData.id}` : '/api/invoices';
      const method = initialData?.id ? 'PUT' : 'POST';
      const res    = await axios({ url, method, data });
      if (res.status === 200 || res.status === 201) onSuccess();
      else toast.error('Failed to save invoice');
    } catch {
      toast.error('Error saving invoice');
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[150] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
        className="bg-white w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col"
      >
        {/* ── Header ── */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-800">
            {initialData ? 'Edit Invoice' : 'Generate Invoice'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onFormSubmit)} className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">

          {/* ── Row 1: Invoice No / Bill Date / Company ── */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Invoice No</label>
              <input {...register('invoiceNo')} disabled className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg font-medium opacity-70" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Bill Date</label>
              <input type="date" {...register('billDate')} className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all font-medium" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Billed From (Company)</label>
              <select
                {...register('companyId')}
                onChange={e => handleCompanyChange(e.target.value)}
                required
                className="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
              >
                <option value="">Select Billing Entity...</option>
                {companies.map(c => <option key={c.id} value={c.id}>{c.companyName}</option>)}
              </select>
            </div>
          </div>

          {/* ── Row 2: Tenant selector ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Select Tenant</label>
              <select
                {...register('tenantId')}
                onChange={e => handleTenantChange(e.target.value)}
                required
                className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all shadow-sm"
              >
                <option value="">Choose a tenant...</option>
                {tenants.map(t => <option key={t.id} value={t.id}>{t.name} (Code: {t.code})</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">Tenant Name</label>
              <input {...register('partyName')} disabled className="w-full px-4 py-2 bg-slate-100 border border-slate-200 rounded-lg font-medium opacity-70" />
            </div>
          </div>

          {/* ── Invoice Items Table ── */}
          <InvoiceItemsTable
            fields={fields} register={register} append={append} remove={remove}
            fromDate={fromDate} toDate={toDate}
            currentMonthName={currentMonthName} currentYear={currentYear}
          />

          {/* ── Tax / CRM / Summary ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
            <div className="space-y-6">
              {/* Tax mode selector */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-primary uppercase tracking-wider">Tax Calculation Mode</label>
                <select
                  {...register('taxOption')}
                  className="w-full px-4 py-2 bg-white border-2 border-primary/40 rounded-lg focus:ring-4 focus:ring-primary/10 focus:border-primary outline-none transition-all font-bold text-primary shadow-sm hover:bg-slate-50 cursor-pointer"
                >
                  <option value="None">None (0% Tax)</option>
                  <option value="GST">GST (CGST 9% + SGST 9%)</option>
                </select>
              </div>

              {/* GST toggle (only when GST selected) */}
              {watchedTaxOption === 'GST' && (
                <GSTPanel
                  register={register} setValue={setValue}
                  watchApplyGst={watchApplyGst} watchedItems={watchedItems}
                />
              )}

              {/* CRM details */}
              <CRMPanel register={register} />

              {/* Info preview */}
              <div className="p-6 bg-slate-50 rounded-2xl border border-slate-100 flex flex-col gap-3">
                <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-200 pb-2">Information Preview</h3>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Party Name</p>
                  <p className="font-bold text-slate-700">{watchPartyName || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-400 uppercase font-bold">Company</p>
                  <p className="font-bold text-slate-700">{watchCompany || 'N/A'}</p>
                </div>
              </div>
            </div>

            {/* Financial summary */}
            <FinancialSummaryPanel
              register={register}
              watchedTaxOption={watchedTaxOption}
              watchBaseRent={watchBaseRent}
              watchCgst={watchCgst}
              watchSgst={watchSgst}
              watchTotalInvoice={watchTotalInvoice}
              watchBalance={watchBalance}
              watchPaymentStatus={watchPaymentStatus}
            />
          </div>

          {/* ── Remarks ── */}
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Remarks / Notes</label>
            <textarea
              {...register('remarks')}
              placeholder="Internal notes or specific instructions..."
              className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all resize-none h-24"
            />
          </div>
        </form>

        {/* ── Footer ── */}
        <div className="p-6 border-t border-slate-100 flex items-center justify-end gap-3 bg-slate-50/50">
          <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-md font-bold text-slate-500 hover:bg-slate-200 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSubmit(onFormSubmit)}
            disabled={loading}
            className="px-10 py-3 bg-primary text-white rounded-xl font-bold hover:bg-orange-600 transition-all shadow-[0_10px_20px_-10px_rgba(249,115,22,0.5)] disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
            {loading ? 'Processing...' : (initialData ? 'Update & Finalize' : 'Generate & Save Invoice')}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}
