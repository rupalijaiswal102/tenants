import React from 'react';
import { type Invoice, type Tenant, type Company } from '../../src/types';
import { numberToWords } from './invoiceUtils';

interface Props {
  invoice:      Invoice;
  tenant?:      Tenant;
  company?:     Company;
  invoiceItems: any[];
  totalAmount:  number;
  dueDate:      Date;
}

export function InvoicePreviewDocument({ invoice, tenant, company, invoiceItems, totalAmount, dueDate }: Props) {
  return (
    <>
      {/* Header: Company info + Logo */}
      <div className="mb-8 flex justify-between items-start">
        <div>
          <h1 className="text-xl font-bold mb-1">{company?.companyName || invoice.company}</h1>
          <div className="text-[12px] text-[#4a4a4a] leading-relaxed">
            <p>{company?.address || 'Property Address Not Set'}</p>
            <p>Phone no. : {company?.phoneNumber || 'N/A'}</p>
            <p>Email : {company?.email || 'N/A'}</p>
            <p>GSTIN : {company?.gstNumber || 'N/A'}</p>
            <p>State: {company?.state || '23-Madhya Pradesh'}</p>
          </div>
        </div>
        {company?.logoUrl && (
          <div className="w-24 h-24 overflow-hidden flex items-center justify-center shrink-0 ml-4">
            <img src={company.logoUrl} alt="Logo" className="max-w-full max-h-full object-contain" referrerPolicy="no-referrer" />
          </div>
        )}
      </div>

      {/* Title */}
      <div className="border-t border-[#e2e2e2] pt-4 mb-8 text-center">
        <h2 className="text-[32px] font-bold text-[#b4b4b4] tracking-[0.2em] uppercase">INVOICE</h2>
      </div>

      {/* Bill To / Ship To / Invoice Details */}
      <div className="grid grid-cols-3 gap-8 mb-8 text-[12px]">
        <div>
          <h3 className="font-bold mb-2">Bill To</h3>
          <p className="font-bold">{tenant?.name || invoice.partyName}</p>
          <div className="space-y-1 mt-1 text-[#4a4a4a]">
            <p className="whitespace-pre-line leading-relaxed mb-2">{tenant?.billingAddress || 'N/A'}</p>
            <p>GSTIN : {tenant?.gstNo || 'Unregistered'}</p>
            <p>State: 23-Madhya Pradesh</p>
            <p>Security Deposit : {tenant?.securityDeposit ? `${tenant.securityDeposit}/-` : '-'}</p>
            {tenant?.leaseStart && (
              <p>Rent Start Date : {new Date(tenant.leaseStart).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
            )}
            {tenant?.leaseEnd && (
              <p>Agreement End Date: {new Date(tenant.leaseEnd).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
            )}
          </div>
        </div>

        <div>
          <h3 className="font-bold mb-2">Ship To</h3>
          <div className="space-y-1 text-[#4a4a4a]">
            <p className="font-bold">{tenant?.name || invoice.partyName}</p>
            <p className="whitespace-pre-line leading-relaxed">{tenant?.property || 'N/A'}</p>
          </div>
        </div>

        <div className="text-right">
          <h3 className="font-bold mb-2">Invoice Details</h3>
          <div className="space-y-1 text-[#4a4a4a]">
            <p>Invoice No. : {invoice.invoiceNo}</p>
            <p>Date : {new Date(invoice.billDate).toLocaleDateString('en-GB')}</p>
            <p>Due Date : {dueDate.toLocaleDateString('en-GB')}</p>
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="mb-8">
        <table className="w-full text-[12px] border-collapse">
          <thead style={{ backgroundColor: '#f2f2f2' }} className="text-[#1a1a1a] font-bold border-y border-[#d2d2d2]">
            <tr>
              <th className="py-2 px-3 text-left w-10">#</th>
              <th className="py-2 px-3 text-left">Particular</th>
              <th className="py-2 px-3 text-left">HSN/ SAC</th>
              <th className="py-2 px-3 text-left">Month</th>
              <th className="py-2 px-3 text-left">From</th>
              <th className="py-2 px-3 text-left">To</th>
              <th className="py-2 px-3 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoiceItems.map((item: any, idx: number) => (
              <tr key={idx} className="border-b border-[#eeeeee]">
                <td className="py-3 px-3">{idx + 1}</td>
                <td className="py-3 px-3 font-bold text-[#1a1a1a]">{item.particular}</td>
                <td className="py-3 px-3">{item.hsnSac}</td>
                <td className="py-3 px-3">{item.month}</td>
                <td className="py-3 px-3">{item.fromDate ? new Date(item.fromDate).toLocaleDateString('en-GB') : '-'}</td>
                <td className="py-3 px-3">{item.toDate ? new Date(item.toDate).toLocaleDateString('en-GB') : '-'}</td>
                <td className="py-3 px-3 text-right">₹ {(item.amount || 0).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Totals + Amount in words */}
      <div className="grid grid-cols-2 gap-12 text-[12px]">
        <div>
          <h4 className="font-bold mb-1">Invoice Amount In Words</h4>
          <p className="text-[#1a1a1a] italic capitalize">{numberToWords(totalAmount)} Rupees only</p>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between py-1 border-b border-slate-50">
            <span className="text-[#4a4a4a]">Sub Total</span>
            <span className="font-bold">₹ {invoice.baseRent.toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-1">
            <span className="text-[#4a4a4a]">GST ({invoice.taxOption === 'None' ? '0%' : '18%'})</span>
            <span className="font-bold">₹ {(invoice.cgst + invoice.sgst).toFixed(2)}</span>
          </div>
          <div className="flex justify-between py-2 px-4 bg-[#b4b4b4] text-white rounded font-bold text-base mt-4 shadow-inner">
            <span>Total</span>
            <span className="text-xl">₹ {totalAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Bank Details + Signatory */}
      <div className="mt-12 pt-8 border-t border-[#eeeeee] grid grid-cols-2 gap-12 text-[11px]">
        <div>
          <h4 className="font-bold mb-3 uppercase tracking-wider text-[#4a4a4a]">Bank Details</h4>
          <div className="space-y-1.5 text-[#333]">
            <p className="flex justify-between">
              <span className="text-slate-400">Account Name:</span>
              <span className="font-bold">{company?.accountHolderName || company?.companyName || invoice.company}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-400">Bank Name:</span>
              <span className="font-bold">{company?.bankName || 'N/A'}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-400">Account Number:</span>
              <span className="font-bold tracking-wider">{company?.accountNumber || 'N/A'}</span>
            </p>
            <p className="flex justify-between">
              <span className="text-slate-400">IFSC Code:</span>
              <span className="font-bold tracking-widest text-primary">{company?.ifscCode || 'N/A'}</span>
            </p>
          </div>
        </div>
        <div className="text-right flex flex-col justify-end items-end">
          <div className="mb-4">
            <p className="text-[10px] font-bold text-slate-400 mb-8">For {company?.companyName || invoice.company}</p>
            <div className="h-12" />
            <p className="font-bold text-slate-800 border-t border-slate-200 pt-2 px-4">Authorized Signatory</p>
          </div>
        </div>
      </div>

      {/* Notes */}
      <div className="mt-12 p-4 bg-slate-50 rounded-lg text-[10px] text-slate-400 text-center">
        <p className="font-bold text-slate-500 uppercase tracking-[0.2em] mb-1">Notes &amp; Terms</p>
        <p>Please pay the invoice by the due date. LATE PAYMENT INTEREST of 18% p.a. will be charged after due date.</p>
        <p>This is a computer generated invoice and does not require a physical signature.</p>
      </div>
    </>
  );
}
