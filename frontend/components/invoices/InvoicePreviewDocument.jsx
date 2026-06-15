import React from 'react';
import { numberToWords } from './invoiceUtils.js';

export function InvoicePreviewDocument({ invoice, tenant, company, invoiceItems, totalAmount, dueDate }) {
  return (
    <>
      {/* Header info + Logo */}
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
      {(() => {
        const shipAddr = tenant?.property || invoice.property || '';
        return (
        <div className={`grid gap-8 mb-8 text-[12px] ${shipAddr ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div>
            <h3 className="font-bold mb-2">Bill To</h3>
            <p className="font-bold">{tenant?.name || invoice.partyName}</p>
            <div className="space-y-1 mt-1 text-[#4a4a4a]">
              {(tenant?.billingAddress) && <p className="whitespace-pre-line leading-relaxed mb-2">{tenant.billingAddress}</p>}
              {(tenant?.gstNo)          && <p>GSTIN : {tenant.gstNo}</p>}
              {(tenant?.state)          && <p>State: {tenant.state}</p>}
              {tenant?.securityDeposit  ? <p>Security Deposit : {tenant.securityDeposit}/-</p> : null}
              {tenant?.leaseStart && (
                <p>Rent Start Date : {new Date(tenant.leaseStart).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
              )}
              {tenant?.leaseEnd && (
                <p>Agreement End Date: {new Date(tenant.leaseEnd).toLocaleDateString('en-GB', { day:'numeric', month:'long', year:'numeric' })}</p>
              )}
            </div>
          </div>

          {shipAddr && (
            <div>
              <h3 className="font-bold mb-2">Ship To</h3>
              <div className="space-y-1 text-[#4a4a4a]">
                <p className="font-bold">{tenant?.name || invoice.partyName}</p>
                <p className="whitespace-pre-line leading-relaxed">{shipAddr}</p>
              </div>
            </div>
          )}

          <div className="text-right">
            <h3 className="font-bold mb-2">Invoice Details</h3>
            <div className="space-y-1 text-[#4a4a4a]">
              <p>Invoice No. : {invoice.invoiceNo}</p>
              <p>Date : {new Date(invoice.billDate).toLocaleDateString('en-GB')}</p>
              <p>Due Date : {dueDate.toLocaleDateString('en-GB')}</p>
            </div>
          </div>
        </div>
        );
      })()}

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
            {invoiceItems.map((item, idx) => (
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
          {/* Description */}
          {invoice.remarks && (
            <div className="mb-4">
              <h4 className="font-bold mb-1">Description</h4>
              <p className="text-[#4a4a4a] whitespace-pre-line">{invoice.remarks}</p>
            </div>
          )}
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
          <p style={{ fontSize:11, fontWeight:700, color:'#1a1a2e', marginBottom:8 }}>Pay To:</p>
          <div style={{ display:'flex', flexDirection:'column', gap:5 }}>
            {[
              company?.bankName          && ['Bank Name',             company.bankName],
              company?.accountNumber     && ['Bank Account No.',      company.accountNumber],
              company?.ifscCode          && ['Bank IFSC code',        company.ifscCode],
              company?.accountHolderName && ["Account holder's name", company.accountHolderName],
            ].filter(Boolean).map(([lbl, val]) => (
              <p key={lbl} style={{ fontSize:10, color:'#1a1a2e', margin:0, lineHeight:1.5, wordBreak:'break-word' }}>
                <span style={{ fontWeight:700 }}>{lbl} : </span>{val}
              </p>
            ))}
          </div>
        </div>
        <div className="flex flex-col justify-end items-end">
          <div style={{ display:'inline-flex', flexDirection:'column', alignItems:'center' }}>
            <p className="text-[10px] font-bold mb-3" style={{ color:'#1a1a2e', whiteSpace:'nowrap' }}>
              For :{company?.companyName || invoice.company}
            </p>
            {invoice.approved && company?.sealUrl ? (
              <div style={{ display:'flex', justifyContent:'center', marginBottom:4 }}>
                <img
                  src={company.sealUrl}
                  alt="Seal"
                  referrerPolicy="no-referrer"
                  style={{ height:80, width:80, objectFit:'contain', opacity:0.92 }}
                />
              </div>
            ) : (
              <div className="h-14" />
            )}
            <p className="text-[11px] font-bold text-slate-800 border-t border-slate-200 pt-2"
               style={{ width:'100%', textAlign:'center' }}>
              Authorized Signatory
            </p>
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
