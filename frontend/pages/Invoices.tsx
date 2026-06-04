import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  ReceiptIndianRupee, 
  MoreVertical, 
  Edit2,
  Trash2,
  Eye,
  X,
  Calendar,
  Building,
  Download,
  AlertCircle,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { type Invoice, type Tenant, type Company } from '../src/types';
import { cn } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { exportToExcel } from '../src/lib/exportUtils';
import { useResponsive } from '../src/hooks/useResponsive';
import { InvoiceFormModal, ViewInvoiceModal } from '../components/tenants/InvoiceModals';

export default function InvoiceList() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [search, setSearch] = useState('');
  const [statusFilter,     setStatusFilter]     = useState('All Status');
  const [companyFilter,    setCompanyFilter]    = useState('All Companies');
  const [particularFilter, setParticularFilter] = useState('All Types');
  const [monthFilter,      setMonthFilter]      = useState('All Months');

  const [showForm, setShowForm] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [deletingInvoice, setDeletingInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
    fetchTenants();
    fetchCompanies();
  }, []);

  const handleExportExcel = () => {
    setExporting(true);
    try {
      const dataToExport = filteredInvoices.map(inv => ({
        'Date': inv.billDate,
        'Invoice No.': inv.invoiceNo,
        'Tenant': inv.partyName,
        'Company': inv.company,
        'Invoice Amount': inv.totalInvoice,
        'Received': inv.received || 0,
        'TDS': inv.tdsAmount || 0,
        'Balance': inv.balance || 0,
        'Status': inv.paymentStatus
      }));
      
      exportToExcel(dataToExport, `Invoices_Export_${new Date().toISOString().split('T')[0]}`, 'Invoices');
      toast.success('Excel exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export Excel');
    } finally {
      setExporting(false);
    }
  };

  const fetchInvoices = () => {
    setLoading(true);
    fetch('/api/invoices')
      .then(res => res.ok ? res.json() : Promise.reject('Failed to fetch invoices'))
      .then(data => {
        if (Array.isArray(data)) {
          setInvoices(data);
        } else {
          setInvoices([]);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching invoices:', err);
        setInvoices([]);
        setLoading(false);
      });
  };

  const fetchTenants = () => {
    fetch('/api/tenants')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setTenants(data);
        } else {
          setTenants([]);
        }
      })
      .catch(err => {
        console.error('Error fetching tenants:', err);
        setTenants([]);
      });
  };

  const fetchCompanies = () => {
    fetch('/api/companies')
      .then(res => res.ok ? res.json() : [])
      .then(data => {
        if (Array.isArray(data)) {
          setCompanies(data);
        } else {
          setCompanies([]);
        }
      })
      .catch(err => {
        console.error('Error fetching companies:', err);
        setCompanies([]);
      });
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/invoices/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setDeletingInvoice(null);
        fetchInvoices();
      }
    } catch (err) {
      alert('Failed to delete invoice');
    }
  };

  const allParticulars = Array.from(new Set(
    (Array.isArray(invoices)?invoices:[]).flatMap(inv => inv.items?.map((it:any)=>it.particular).filter(Boolean)||[])
  )).sort() as string[];
  const DEFAULT_PARTICULARS = ['Rental Charges','Common Area Maintenance','Electricity Charges','Water Charges','Parking Charges','Generator Charges','Housekeeping Charges'];
  const allTypes = Array.from(new Set([...DEFAULT_PARTICULARS,...allParticulars])).sort();

  const filteredInvoices = (Array.isArray(invoices) ? invoices : []).filter(inv => {
    const matchesSearch    = inv.invoiceNo.toLowerCase().includes(search.toLowerCase()) ||
      inv.partyName.toLowerCase().includes(search.toLowerCase()) ||
      inv.company.toLowerCase().includes(search.toLowerCase());
    const matchesCompany   = companyFilter   === 'All Companies' || inv.companyId === companyFilter || inv.company === companyFilter;
    const matchesParticular= particularFilter === 'All Types'    || (inv.items?.some((it:any) => it.particular?.toLowerCase().includes(particularFilter.toLowerCase())));
    
    const matchesStatus = statusFilter === 'All Status' || inv.paymentStatus === statusFilter;
    
    let matchesMonth = true;
    if (monthFilter !== 'All Months' && inv.billDate) {
      const billDate = new Date(inv.billDate);
      const selectedMonth = parseInt(monthFilter);
      matchesMonth = billDate.getMonth() === selectedMonth;
    }

    return matchesSearch && matchesStatus && matchesMonth && matchesCompany && matchesParticular;
  });

  const totalInvoiced = filteredInvoices.reduce((acc, inv) => acc + (inv.totalInvoice || 0), 0);
  const totalReceived = filteredInvoices.reduce((acc, inv) => acc + (inv.received || 0), 0);
  const totalOutstanding = filteredInvoices.reduce((acc, inv) => acc + (inv.balance || 0), 0);

  return (
    <div className="w-full p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Invoices</h1>
          <p className="text-slate-500 text-sm">Track monthly rent payments and outstanding balances.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={handleExportExcel}
            disabled={exporting || loading}
            className="bg-emerald-500 text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-emerald-600 transition-all shadow-sm disabled:opacity-50"
          >
            {exporting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <Download size={18} />
            )}
            <span>{exporting ? 'Exporting...' : 'Download Excel'}</span>
          </button>
          <button 
            onClick={() => setShowForm(true)}
            className="bg-primary text-white px-4 py-2 rounded-md font-bold text-sm flex items-center gap-2 hover:bg-orange-600 transition-all shadow-sm"
          >
            <Plus size={18} />
            <span>+ New Invoice</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600">
            <ReceiptIndianRupee size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Invoiced</p>
            <p className="text-2xl font-bold text-slate-800">₹{totalInvoiced.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <ReceiptIndianRupee size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Received</p>
            <p className="text-2xl font-bold text-slate-800">₹{totalReceived.toLocaleString()}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-rose-50 text-rose-600">
            <ReceiptIndianRupee size={24} />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Outstanding</p>
            <p className="text-2xl font-bold text-slate-800">₹{totalOutstanding.toLocaleString()}</p>
          </div>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-4 items-center justify-between bg-white p-4 rounded-xl border border-border-card">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input 
            type="text" 
            placeholder="Search invoice or tenant name..." 
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
          {/* Company Filter */}
          <select value={companyFilter} onChange={e=>setCompanyFilter(e.target.value)}
            className="flex-1 lg:flex-none text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20">
            <option value="All Companies">🏢 All Companies</option>
            {companies.map((c:any)=><option key={c.id||c._id} value={c.id||c._id||c.companyName}>{c.companyName}</option>)}
          </select>
          {/* Charge Type Filter */}
          <select value={particularFilter} onChange={e=>setParticularFilter(e.target.value)}
            className="flex-1 lg:flex-none text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20">
            <option value="All Types">✅ All Charge Types</option>
            {allTypes.map((p:string)=><option key={p} value={p}>{p}</option>)}
          </select>
          <select 
            className="flex-1 lg:flex-none text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
            value={monthFilter}
            onChange={(e) => setMonthFilter(e.target.value)}
          >
            <option value="All Months">All Months</option>
            <option value="0">January</option>
            <option value="1">February</option>
            <option value="2">March</option>
            <option value="3">April</option>
            <option value="4">May</option>
            <option value="5">June</option>
            <option value="6">July</option>
            <option value="7">August</option>
            <option value="8">September</option>
            <option value="9">October</option>
            <option value="10">November</option>
            <option value="11">December</option>
          </select>
          <select 
            className="flex-1 lg:flex-none text-sm bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-primary/20"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All Status</option>
            <option>Paid</option>
            <option>Partial</option>
            <option>Pending</option>
          </select>
          <div className="h-8 w-px bg-slate-200"></div>
          <span className="text-sm text-slate-400 font-medium whitespace-nowrap">
            {filteredInvoices.length} invoices found
          </span>
        </div>
      </div>

      <div className="card-saas overflow-hidden">
        <div className="overflow-x-auto -mx-4 md:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr>
                  <th className="table-th hidden md:table-cell">Invoice No</th>
          <th className="table-th">Tenant Name</th>
                  <th className="table-th !text-right">Total Amount</th>
                  <th className="table-th text-center hidden sm:table-cell">Status</th>
                  <th className="table-th !text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9]">
                {loading ? (
                  [1, 2, 3].map(i => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={5} className="px-6 py-4 h-16 bg-slate-50/50"></td>
                    </tr>
                  ))
                ) : filteredInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-6 py-20 text-center text-slate-muted">
                      <ReceiptIndianRupee className="mx-auto mb-3 opacity-20" size={48} />
                      <p>No invoices generated yet.</p>
                    </td>
                  </tr>
                ) : filteredInvoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="table-td text-slate-400 font-medium whitespace-nowrap hidden md:table-cell">#{inv.invoiceNo}</td>
                    <td className="table-td font-bold">
                      <div className="flex flex-col">
                        <span className="truncate max-w-[120px] sm:max-w-[180px] md:max-w-none">{inv.partyName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">{inv.billDate}</span>
                      </div>
                    </td>
                    <td className="table-td text-right font-bold text-primary whitespace-nowrap px-4">
                      ₹{(inv.totalInvoice || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="table-td text-center hidden sm:table-cell">
                      <PaymentStatusBadge status={inv.paymentStatus} />
                    </td>
                    <td className="table-td text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                         <button 
                          onClick={() => setSelectedInvoice(inv)}
                          className="p-1.5 md:p-2 text-slate-400 hover:text-primary hover:bg-primary/5 rounded-lg transition-colors flex items-center gap-1 text-[10px] md:text-xs font-bold"
                          title="View Invoice"
                        >
                          <Eye size={16} />
                          <span className="hidden md:inline">View</span>
                        </button>
                        <button 
                          onClick={() => setEditingInvoice(inv)}
                          className="p-1.5 md:p-2 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors flex items-center gap-1 text-[10px] md:text-xs font-bold"
                          title="Edit Invoice"
                        >
                          <Edit2 size={16} />
                          <span className="hidden md:inline">Edit</span>
                        </button>
                        <button 
                          onClick={() => setDeletingInvoice(inv)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Delete Invoice"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <InvoiceFormModal 
            tenants={tenants}
            companies={companies}
            onClose={() => setShowForm(false)} 
            onSuccess={() => { setShowForm(false); fetchInvoices(); }} 
          />
        )}
        {editingInvoice && (
          <InvoiceFormModal 
            tenants={tenants}
            companies={companies}
            initialData={editingInvoice}
            onClose={() => setEditingInvoice(null)} 
            onSuccess={() => { setEditingInvoice(null); fetchInvoices(); }} 
          />
        )}
        {selectedInvoice && (
          <ViewInvoiceModal 
            invoice={selectedInvoice}
            tenant={tenants.find(t => t.id === selectedInvoice.tenantId)}
            company={companies.find(c => c.id === selectedInvoice.companyId || c.companyName === selectedInvoice.company)}
            onClose={() => setSelectedInvoice(null)}
          />
        )}
        {deletingInvoice && (
          <DeleteConfirmationModal
            invoiceNo={deletingInvoice.invoiceNo}
            onConfirm={() => handleDelete(deletingInvoice.id as string)}
            onCancel={() => setDeletingInvoice(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function PaymentStatusBadge({ status }: { status: string }) {
  const styles: any = {
    Paid: 'badge-paid',
    Partial: 'badge-partial',
    Pending: 'badge-pending',
  };
  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider leading-none",
      styles[status]
    )}>
      {status}
    </span>
  );
}


function DeleteConfirmationModal({ invoiceNo, onConfirm, onCancel }: { invoiceNo: string, onConfirm: () => void, onCancel: () => void }) {
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
    >
      <motion.div 
        initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
        className="bg-white w-full max-w-md rounded-2xl shadow-xl p-8 text-center"
      >
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto mb-6">
          <Trash2 size={32} />
        </div>
        <h2 className="text-xl font-bold text-slate-800 mb-2">Delete Invoice?</h2>
        <p className="text-slate-500 mb-8">Are you sure you want to delete invoice <span className="font-mono font-bold text-slate-700">#{invoiceNo}</span>? This action cannot be undone.</p>
        <div className="flex gap-3">
          <button 
            onClick={onCancel}
            className="flex-1 px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={onConfirm}
            className="flex-1 px-6 py-3 bg-rose-500 text-white rounded-xl font-bold hover:bg-rose-600 transition-all shadow-md"
          >
            Delete
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}


function numberToWords(num: number): string {
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
  
  if (num === 0) return 'Zero';
  
  function convert(n: number): string {
    if (n < 20) return units[n];
    if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? ' ' + units[n % 10] : '');
    if (n < 1000) return units[Math.floor(n / 100)] + ' Hundred' + (n % 100 !== 0 ? ' and ' + convert(n % 100) : '');
    if (n < 100000) return convert(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 !== 0 ? ' ' + convert(n % 1000) : '');
    if (n < 10000000) return convert(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 !== 0 ? ' ' + convert(n % 100000) : '');
    return convert(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 !== 0 ? ' ' + convert(n % 10000000) : '');
  }
  
  return convert(num);
}

function FormInput({ label, type = 'text', value, onChange, disabled }: any) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider px-1">{label}</label>
      <input 
        type={type} 
        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all disabled:opacity-60 disabled:bg-slate-100 font-medium"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
      />
    </div>
  );
}