/**
 * Portfolio Filter Bar — Sticky horizontal filter with searchable dropdowns
 */

interface PortfolioFilterBarProps {
  businessUnits: string[];
  accounts: string[];
  projectTypes: string[];
  projectCategories: string[];
  selectedBu: string;
  selectedAccount: string;
  selectedType: string;
  selectedCategory: string;
  onBuChange: (value: string) => void;
  onAccountChange: (value: string) => void;
  onTypeChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
}

function FilterSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</label>
      <div className="relative">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full appearance-none rounded-lg border border-slate-300 bg-white px-3 py-2 pr-8 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100 transition-all"
        >
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
        {/* Custom chevron */}
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </span>
      </div>
    </div>
  );
}

export function PortfolioFilterBar({
  businessUnits, accounts, projectTypes, projectCategories,
  selectedBu, selectedAccount, selectedType, selectedCategory,
  onBuChange, onAccountChange, onTypeChange, onCategoryChange,
}: PortfolioFilterBarProps) {
  return (
    <div className="sticky top-0 z-10 rounded-xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect label="Business Unit" value={selectedBu} options={businessUnits} onChange={onBuChange} />
        <FilterSelect label="Account" value={selectedAccount} options={accounts} onChange={onAccountChange} />
        <FilterSelect label="Project Type" value={selectedType} options={projectTypes} onChange={onTypeChange} />
        <FilterSelect label="Project Category" value={selectedCategory} options={projectCategories} onChange={onCategoryChange} />
      </div>
    </div>
  );
}
