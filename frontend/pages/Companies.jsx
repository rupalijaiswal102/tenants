import { useState, useEffect } from 'react';
import { Building2, Plus } from 'lucide-react';
import axios from 'axios';
import { usePermission } from '../src/hooks/usePermission.js';

import CompanyCard       from '../components/compnies/CompanyCard.jsx';
import CompanyStatsBar   from '../components/compnies/CompanyStatsBar.jsx';
import CompanyFilters    from '../components/compnies/CompanyFilters.jsx';
import CompanyFormModal  from '../components/compnies/CompanyFormModal.jsx';
import CompanyViewModal  from '../components/compnies/CompanyViewModal.jsx';
export default function CompanyList() {
  const { canAdd } = usePermission();
  const [companies,      setCompanies]      = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [searchTerm,     setSearchTerm]     = useState('');
  const [stateFilter,    setStateFilter]    = useState('');
  const [formOpen,       setFormOpen]       = useState(false);
  const [viewOpen,       setViewOpen]       = useState(false);
  const [selected,       setSelected]       = useState(null);

  const fetchCompanies = async () => {
    try {
      setLoading(true);
      const res = await axios.get('/api/companies');
      setCompanies(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      console.error('Failed to fetch companies:', err);
      setCompanies([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCompanies(); }, []);

  const openAdd  = ()  => { setSelected(null); setFormOpen(true); };
  const openEdit = (c) => { setSelected(c);    setFormOpen(true); };
  const openView = (c) => { setSelected(c);    setViewOpen(true); };

  const handleDelete = async (id) => {
    if (!confirm('Delete this company?')) return;
    try { await axios.delete(`/api/companies/${id}`); fetchCompanies(); }
    catch { alert('Failed to delete company'); }
  };

  const filtered = companies.filter(c => {
    const q = searchTerm.toLowerCase();
    const matchName  = c.companyName?.toLowerCase().includes(q);
    const matchGst   = c.gstNumber?.toLowerCase().includes(q);
    const matchState = stateFilter ? c.state === stateFilter : true;
    return (matchName || matchGst) && matchState;
  });

  const states = Array.from(new Set(companies.map(c => c.state).filter(Boolean)));

  return (
    <div className="w-full p-4 md:p-6 space-y-8 pb-12">

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight">Company Master</h1>
          <p className="text-slate-500 mt-1">Manage multiple business entities and branding.</p>
        </div>
        {canAdd && (
          <button onClick={openAdd}
            className="flex items-center gap-2 bg-[#F97316] hover:bg-orange-600 text-white px-5 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-orange-200 active:scale-95">
            <Plus size={20} /> Add Company
          </button>
        )}
      </div>

      {/* Stats */}
      <CompanyStatsBar companies={companies} statesCount={states.length} />

      {/* Filters */}
      <CompanyFilters
        searchTerm={searchTerm}   setSearchTerm={setSearchTerm}
        stateFilter={stateFilter} setStateFilter={setStateFilter}
        states={states}
      />

      {/* Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="bg-white h-64 rounded-3xl border border-slate-100 animate-pulse" />
          ))
        ) : filtered.length > 0 ? (
          filtered.map(company => (
            <CompanyCard
              key={company.id}
              company={company}
              onEdit={openEdit}
              onView={openView}
              onDelete={handleDelete}
            />
          ))
        ) : (
          <div className="col-span-full py-20 text-center">
            <div className="inline-flex w-16 h-16 bg-slate-50 rounded-2xl items-center justify-center text-slate-200 mb-4">
              <Building2 size={32} />
            </div>
            <p className="text-slate-400 font-medium">No companies match your criteria.</p>
          </div>
        )}
      </div>

      {/* Modals */}
      {formOpen && (
        <CompanyFormModal
          isOpen={formOpen}
          company={selected}
          onClose={() => setFormOpen(false)}
          onSuccess={fetchCompanies}
        />
      )}

      {viewOpen && selected && (
        <CompanyViewModal
          company={selected}
          onClose={() => setViewOpen(false)}
          onEdit={openEdit}
        />
      )}
    </div>
  );
}
