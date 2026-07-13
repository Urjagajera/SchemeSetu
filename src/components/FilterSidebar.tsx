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
  sidebarQuery: string;
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
  states,
  occupations,
  ministries,
  onFilterChange,
  onClear,
  className
}) => {
  const { t } = useTranslation();

  const handleIncomeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFilterChange({ income: parseInt(e.target.value) });
  };

  const genders = [
    { label: t('allGenders'), value: '' },
    { label: t('male'), value: 'male' },
    { label: t('female'), value: 'female' },
    { label: t('other'), value: 'other' }
  ];

  const levels = [
    { label: t('allCategories') || 'All Levels', value: '' },
    { label: t('centralGov'), value: 'Central' },
    { label: t('stateGov'), value: 'State' }
  ];

  const getCategoryLabel = (c: string) => {
    if (c === '') return t('allCategories');
    if (c.toLowerCase() === 'education') return t('scholarships');
    if (c.toLowerCase() === 'healthcare') return t('healthInsurance');
    if (c.toLowerCase() === 'agriculture') return t('farmerLoans');
    if (c.toLowerCase() === 'senior citizens') return t('pensions');
    return t(c.toLowerCase() as any) || c;
  };

  const getStateLabel = (s: string) => {
    const key = `state_${s.replace(/\s+/g, '_').toLowerCase()}`;
    return t(key as any) || s;
  };

  const getOccupationLabel = (o: string) => {
    const key = `occ_${o.replace(/\s+/g, '_').toLowerCase()}`;
    return t(key as any) || o;
  };

  return (
    <aside className={cn(
      "bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-6 max-h-[85vh] overflow-y-auto custom-scrollbar transition-colors w-full",
      className
    )}>
      
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant dark:border-zinc-800">
        <h2 className="font-heading text-sm md:text-base font-bold text-primary dark:text-white">
          {t('filterTitle')}
        </h2>
        <button
          onClick={onClear}
          className="text-secondary dark:text-sky-400 text-xs font-bold flex items-center gap-1 hover:underline focus:outline-none cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" />
          {t('clearAll')}
        </button>
      </div>

      {/* Category Radio Filters */}
      <div className="space-y-2.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-white">
          {t('categoryLabel')}
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
            <span className="text-on-surface dark:text-white group-hover:text-secondary dark:group-hover:text-sky-400 font-medium">
              {t('allCategories')}
            </span>
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
              <span className="text-on-surface dark:text-white group-hover:text-secondary dark:group-hover:text-sky-400 font-medium">
                {getCategoryLabel(cat)}
              </span>
            </label>
          ))}
        </div>
      </div>

      {/* Level Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-white">
          {t('govtLevelLabel')}
        </label>
        <select
          value={filters.level}
          onChange={(e) => onFilterChange({ level: e.target.value })}
          className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-950 dark:text-white text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2"
        >
          {levels.map(l => (
            <option key={l.value} value={l.value} className="dark:bg-zinc-900 dark:text-white">{l.label}</option>
          ))}
        </select>
      </div>

      {/* State Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-white">
          {t('stateLabel')}
        </label>
        <select
          value={filters.state}
          onChange={(e) => onFilterChange({ state: e.target.value })}
          className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-950 dark:text-white text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2"
        >
          <option value="" className="dark:bg-zinc-900 dark:text-white">{t('allStates')}</option>
          {states.map(s => (
            <option key={s} value={s} className="dark:bg-zinc-900 dark:text-white">{getStateLabel(s)}</option>
          ))}
        </select>
      </div>

      {/* Occupation Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-white">
          {t('occupationLabel')}
        </label>
        <select
          value={filters.occupation}
          onChange={(e) => onFilterChange({ occupation: e.target.value })}
          className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-950 dark:text-white text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2"
        >
          <option value="" className="dark:bg-zinc-900 dark:text-white">{t('allOccupations')}</option>
          {occupations.map(o => (
            <option key={o} value={o} className="dark:bg-zinc-900 dark:text-white">{getOccupationLabel(o)}</option>
          ))}
        </select>
      </div>

      {/* Gender Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-white">
          {t('genderLabel')}
        </label>
        <select
          value={filters.gender}
          onChange={(e) => onFilterChange({ gender: e.target.value })}
          className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-950 dark:text-white text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2"
        >
          {genders.map(g => (
            <option key={g.value} value={g.value} className="dark:bg-zinc-900 dark:text-white">{g.label}</option>
          ))}
        </select>
      </div>

      {/* Ministry Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-white">
          {t('ministryLabel')}
        </label>
        <select
          value={filters.ministry}
          onChange={(e) => onFilterChange({ ministry: e.target.value })}
          className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-950 dark:text-white text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2"
        >
          <option value="" className="dark:bg-zinc-900 dark:text-white">{t('allMinistries')}</option>
          {ministries.map(m => (
            <option key={m} value={m} className="dark:bg-zinc-900 dark:text-white">{m}</option>
          ))}
        </select>
      </div>

      {/* Age Filter */}
      <div className="space-y-1.5">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-white">
          {t('ageLabel')}
        </label>
        <input
          type="number"
          min="0"
          max="110"
          value={filters.age}
          onChange={(e) => onFilterChange({ age: e.target.value })}
          placeholder={t('enterAge')}
          className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2"
        />
      </div>

      {/* Income Range Slider */}
      <div className="space-y-2">
        <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-white">
          {t('incomeLabel')}
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
