import { Building2, CheckCircle2, Globe } from 'lucide-react';

export default function CompanyStatsBar({ companies, statesCount }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <StatCard
        icon={<Building2 size={24} />}
        iconBg="bg-orange-50 text-orange-500"
        value={companies.length}
        label="Total Entities"
      />
      <StatCard
        icon={<CheckCircle2 size={24} />}
        iconBg="bg-green-50 text-green-500"
        value={companies.filter(c => c.status).length}
        label="Active Companies"
      />
      <StatCard
        icon={<Globe size={24} />}
        iconBg="bg-blue-50 text-blue-500"
        value={statesCount}
        label="State Presence"
      />
    </div>
  );
}

function StatCard({ icon, iconBg, value, label }) {
  return (
    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${iconBg}`}>
        {icon}
      </div>
      <div>
        <div className="text-2xl font-bold text-slate-800">{value}</div>
        <div className="text-xs font-medium text-slate-400 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}
