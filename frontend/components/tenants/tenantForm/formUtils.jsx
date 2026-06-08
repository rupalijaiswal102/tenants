// ── Shared input class ────────────────────────────────────────────────────────
export const inp = "w-full h-11 px-4 bg-white border-2 border-slate-100 rounded-xl text-sm text-slate-800 outline-none transition-all focus:border-orange-400 focus:ring-4 focus:ring-orange-50 placeholder:text-slate-300 font-medium";
export const lbl = "block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5";

// ── Field wrapper ─────────────────────────────────────────────────────────────
export function Field({ label, required, children, error, hint }) {
  return (
    <div>
      <label className={lbl}>
        {label}
        {required && <span className="text-orange-500 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[10px] text-slate-400 mt-1 font-medium">{hint}</p>}
      {error && <p className="text-[10px] text-red-500 mt-1 font-bold">{error}</p>}
    </div>
  );
}

// ── Step config ───────────────────────────────────────────────────────────────
export const STEPS_BASE = [
  { id: 1, title: 'Tenant Info',      sub: 'Legal & Contact Details' },
  { id: 2, title: 'Lease & Property', sub: 'Agreement Setup'         },
  { id: 3, title: 'Financials',       sub: 'Rent & Deposits'         },
  { id: 4, title: 'Documents',        sub: 'Attachments & Status'    },
];

export const getSteps = (mode) =>
  STEPS_BASE.map((s, i) =>
    i === 0 ? { ...s, title: mode === 'otherParty' ? 'Party Info' : s.title } : s
  );

// ── react-select styles ───────────────────────────────────────────────────────
export const SELECT_STYLES = {
  control: (b, s) => ({
    ...b, minHeight: 44, borderRadius: 12, borderWidth: 2,
    borderColor: s.isFocused ? '#FB923C' : '#f1f5f9',
    backgroundColor: '#fff',
    boxShadow: s.isFocused ? '0 0 0 4px rgba(251,146,60,0.1)' : 'none',
    fontSize: 14, fontWeight: 500,
    '&:hover': { borderColor: '#FB923C' },
  }),
  placeholder: (b) => ({ ...b, color: '#cbd5e1', fontSize: 13 }),
  menu: (b) => ({ ...b, borderRadius: 12, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', border: '1px solid #f1f5f9', zIndex: 1000 }),
  option: (b, s) => ({
    ...b,
    background: s.isSelected ? '#f97316' : s.isFocused ? '#fff7ed' : '#fff',
    color: s.isSelected ? '#fff' : '#475569',
    fontWeight: s.isSelected ? 700 : 500, fontSize: 13,
  }),
};
