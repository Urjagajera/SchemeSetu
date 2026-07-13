import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { X, RefreshCw } from 'lucide-react';
import { cn } from '../utils/cn';

export interface FilterState {
  category: string;
  state: string;
  occupation: string;
  gender: string;
  income: number;
  age: string;
  level: string;
  ministry: string;
}

interface FilterSidebarProps {
  filters: FilterState;
  categories: string[];
  ministries: string[];
  states: string[];
  occupations: string[];
  onFilterChange: (updates: Partial<FilterState>) => void;
  onClear: () => void;
  className?: string;
}

export const FilterSidebar: React.FC<FilterSidebarProps> = ({
  filters,
  categories,
  ministries,
  states,
  occupations,
  onFilterChange,
  onClear,
  className
}) => {
  const { t } = useTranslation();

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ income: parseInt(e.target.value) });
  };

  const genders = [
    { label: 'All Genders', value: '' },
    { label: 'Male', value: 'male' },
    { label: 'Female', value: 'female' },
    { label: 'Other', value: 'other' }
  ];

  const levels = [
    { label: 'All Levels', value: '' },
    { label: 'Central Government', value: 'Central' },
    { label: 'State Government', value: 'State' }
  ];

  return (
    <aside className={cn(
      "bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar transition-colors",
      className
    )}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant dark:border-zinc-800">
        <h2 className="font-heading text-sm md:text-base font-bold text-primary dark:text-white">
          Filters
        </h2>
        <button
          onClick={onClear}
          className="text-secondary dark:text-sky-400 text-xs font-bold flex items-center gap-1 hover:underline focus:outline-none"
        >
          <RefreshCw className="w-3 h-3" />
          Clear All
        </button>
      </div>

      {/* Category Radio Filters */}
      <div className="space-y-2.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
          Category
        </label>
        <div className="space-y-1.5 max-h-40 overflow-y-auto custom-scrollbar pr-1">
          <label className="flex items-center group cursor-pointer text-xs md:text-sm">
            <input
              type="radio"
              name="category"
              checked={filters.category === ''}
              onChange={() => onFilterChange({ category: '' })}
              className="mr-2 w-4 h-4 text-secondary focus:ring-secondary border-outline-variant dark:bg-zinc-800 dark:border-zinc-700"
            />
            <span className="text-on-surface dark:text-zinc-350 group-hover:text-secondary dark:group-hover:text-sky-400 font-medium">All Categories</span>
          </label>
          {categories.map(cat => (
            <label key={cat} className="flex items-center group cursor-pointer text-xs md:text-sm">
              <input
                type="radio"
                name="category"
                checked={filters.category === cat}
                onChange={() => onFilterChange({ category: cat })}
                className="mr-2 w-4 h-4 text-secondary focus:ring-secondary border-outline-variant dark:bg-zinc-800 dark:border-zinc-700"
              />
              <span className="text-on-surface dark:text-zinc-350 group-hover:text-secondary dark:group-hover:text-sky-400 font-medium">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Level Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
          Government Level
        </label>
        <select
          value={filters.level}
          onChange={(e) => onFilterChange({ level: e.target.value })}
          className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-950 dark:text-zinc-300 text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2"
        >
          {levels.map(l => (
            <option key={l.value} value={l.value} className="dark:bg-zinc-900 dark:text-zinc-300">{l.label}</option>
          ))}
        </select>
      </div>

      {/* State Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
          State
        </label>
        <select
          value={filters.state}
          onChange={(e) => onFilterChange({ state: e.target.value })}
          className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-950 dark:text-zinc-300 text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2"
        >
          <option value="" className="dark:bg-zinc-900 dark:text-zinc-300">All States</option>
          {states.map(s => (
            <option key={s} value={s} className="dark:bg-zinc-900 dark:text-zinc-300">{s}</option>
          ))}
        </select>
      </div>

      {/* Occupation Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
          Occupation
        </label>
        <select
          value={filters.occupation}
          onChange={(e) => onFilterChange({ occupation: e.target.value })}
          className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-950 dark:text-zinc-300 text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2"
        >
          <option value="" className="dark:bg-zinc-900 dark:text-zinc-300">All Occupations</option>
          {occupations.map(o => (
            <option key={o} value={o} className="dark:bg-zinc-900 dark:text-zinc-300">{o.charAt(0).toUpperCase() + o.slice(1)}</option>
          ))}
        </select>
      </div>

      {/* Gender Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
          Gender
        </label>
        <select
          value={filters.gender}
          onChange={(e) => onFilterChange({ gender: e.target.value })}
          className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-950 dark:text-zinc-300 text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2"
        >
          {genders.map(g => (
            <option key={g.value} value={g.value} className="dark:bg-zinc-900 dark:text-zinc-300">{g.label}</option>
          ))}
        </select>
      </div>

      {/* Ministry Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
          Ministry
        </label>
        <select
          value={filters.ministry}
          onChange={(e) => onFilterChange({ ministry: e.target.value })}
          className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-950 dark:text-zinc-300 text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2"
        >
          <option value="" className="dark:bg-zinc-900 dark:text-zinc-300">All Ministries</option>
          {ministries.map(m => (
            <option key={m} value={m} className="dark:bg-zinc-900 dark:text-zinc-300">{m}</option>
          ))}
        </select>
      </div>

      {/* Age Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
          Age (Beneficiary)
        </label>
        <input
          type="number"
          min="0"
          max="110"
          value={filters.age}
          onChange={(e) => onFilterChange({ age: e.target.value })}
          placeholder="Enter age..."
          className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-zinc-300 text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2"
        />
      </div>

      {/* Income Range Slider */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
          Annual Income (Up to)
        </label>
        <input
          type="range"
          min="100000"
          max="1000000"
          step="50000"
          value={filters.income}
          onChange={handleIncomeChange}
          className="w-full h-2 bg-surface-container-highest dark:bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-secondary dark:accent-sky-400"
        />
        <div className="flex justify-between text-xs text-on-surface-variant dark:text-zinc-500 font-semibold">
          <span>₹1L</span>
          <span className="text-secondary dark:text-sky-400">
            {filters.income >= 1000000 ? '₹10L+' : `₹${(filters.income / 100000).toFixed(1)}L`}
          </span>
        </div>
      </div>

    </aside>
  );
};

export default FilterSidebar;
