import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { RefreshCw, User, Layers, Landmark } from 'lucide-react';
import { cn } from '../utils/cn';
import { SearchFilters } from '../hooks/useSearchFilters';
import { FilterOptions } from '../services/schemeService';
import { MAX_FILTER_AGE } from '../constants/searchFilters';
import { useFilterLabels } from './filterLabels';

interface FilterSidebarProps {
  filters: SearchFilters;
  options: FilterOptions | null;
  activeCount: number;
  onChange: (changes: Partial<SearchFilters>) => void;
  onToggleTopic: (id: string) => void;
  onClear: () => void;
  /** Fill the "About you" filters from the saved profile (only given when that would change something). */
  onUseProfile?: () => void;
  /** The "About you" filters are exactly the saved profile's answers. */
  fromProfile?: boolean;
  className?: string;
}

const selectClass =
  'w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-950 dark:text-white text-xs md:text-sm font-medium focus:ring-secondary focus:border-secondary py-2 px-3';
const optionClass = 'dark:bg-zinc-900 dark:text-white';
const fieldLabelClass = 'block text-xs font-bold text-on-surface-variant dark:text-zinc-500 uppercase tracking-wider';

const Section: React.FC<{ icon: React.ReactNode; title: string; hint?: string; last?: boolean; children: React.ReactNode }> = ({ icon, title, hint, last, children }) => (
  <section className={cn('space-y-3', !last && 'border-b border-outline-variant dark:border-zinc-800 pb-4')}>
    <div>
      <div className="flex items-center gap-2 text-primary dark:text-white">
        {icon}
        <h3 className="text-xs font-extrabold uppercase tracking-wider">{title}</h3>
      </div>
      {hint && <p className="mt-1 text-xs text-on-surface-variant dark:text-zinc-500">{hint}</p>}
    </div>
    {children}
  </section>
);

const Field: React.FC<{ id: string; label: string; children: React.ReactNode }> = ({ id, label, children }) => (
  <div className="space-y-1">
    <label htmlFor={id} className={fieldLabelClass}>{label}</label>
    {children}
  </div>
);

/** "(123)" after an option, when the count is known. */
const countSuffix = (count: number | null | undefined) => (typeof count === 'number' ? ` (${count})` : '');

/**
 * The Search filters in three plain groups, in the order a person thinks about them:
 * who I am (narrows to what I could get), what I need (topics), and who runs the scheme.
 */
export const FilterSidebar: React.FC<FilterSidebarProps> = ({ filters, options, activeCount, onChange, onToggleTopic, onClear, onUseProfile, fromProfile, className }) => {
  const { t } = useTranslation();
  const labels = useFilterLabels();

  const states = options?.states ?? [];
  const ministries = options?.ministries ?? [];
  const levelCount = (id: string) => options?.levels.find((l) => l.id === id)?.count;

  return (
    <aside
      aria-label={t('filterTitle')}
      className={cn(
        'bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-5 max-h-[85vh] overflow-y-auto custom-scrollbar transition-colors w-full',
        className,
      )}
    >
      <div className="flex items-center justify-between pb-3 border-b border-outline-variant dark:border-zinc-800">
        <h2 className="font-heading text-sm md:text-base font-bold text-primary dark:text-white">
          {t('filterTitle')}
          {activeCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-full bg-secondary text-white text-xs font-bold min-w-5 h-5 px-1.5">
              {activeCount}
            </span>
          )}
        </h2>
        <button
          type="button"
          onClick={onClear}
          disabled={activeCount === 0}
          className="text-secondary dark:text-sky-400 text-xs font-bold flex items-center gap-1 hover:underline focus:outline-none cursor-pointer disabled:opacity-40 disabled:no-underline disabled:cursor-default"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          {t('clearAll')}
        </button>
      </div>

      {/* 1. About you */}
      <Section icon={<User className="w-4 h-4 text-secondary dark:text-sky-400" />} title={t('filterAboutYou')} hint={t('filterAboutYouHint')}>
        {fromProfile && (
          <p className="text-xs font-semibold text-emerald-700 dark:text-emerald-400">{t('filterFromProfile')}</p>
        )}
        {onUseProfile && (
          <button
            type="button"
            onClick={onUseProfile}
            className="text-xs font-bold text-secondary dark:text-sky-400 hover:underline"
          >
            {t('filterUseProfile')}
          </button>
        )}
        <Field id="filter-state" label={t('stateLabel')}>
          <select id="filter-state" value={filters.state} onChange={(e) => onChange({ state: e.target.value })} className={selectClass}>
            <option value="" className={optionClass}>{t('allStates')}</option>
            {states.map((s) => (
              <option key={s} value={s} className={optionClass}>{labels.state(s)}</option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field id="filter-age" label={t('ageYearsLabel')}>
            <input
              id="filter-age"
              type="number"
              inputMode="numeric"
              min={0}
              max={MAX_FILTER_AGE}
              value={filters.age}
              onChange={(e) => onChange({ age: e.target.value })}
              placeholder={t('enterAge')}
              className={selectClass}
            />
          </Field>
          <Field id="filter-gender" label={t('genderLabel')}>
            <select id="filter-gender" value={filters.gender} onChange={(e) => onChange({ gender: e.target.value })} className={selectClass}>
              <option value="" className={optionClass}>{t('allGenders')}</option>
              {(options?.genders ?? ['male', 'female', 'other']).map((g) => (
                <option key={g} value={g} className={optionClass}>{labels.gender(g)}</option>
              ))}
            </select>
          </Field>
        </div>

        <Field id="filter-social" label={t('socialCategory')}>
          <select id="filter-social" value={filters.socialCategory} onChange={(e) => onChange({ socialCategory: e.target.value })} className={selectClass}>
            <option value="" className={optionClass}>{t('allSocialCategories')}</option>
            {(options?.socialCategories ?? ['general', 'sc', 'st', 'obc']).map((c) => (
              <option key={c} value={c} className={optionClass}>{labels.socialCategory(c)}</option>
            ))}
          </select>
        </Field>

        <Field id="filter-occupation" label={t('occupationLabel')}>
          <select id="filter-occupation" value={filters.occupation} onChange={(e) => onChange({ occupation: e.target.value })} className={selectClass}>
            <option value="" className={optionClass}>{t('allOccupations')}</option>
            {(options?.occupations ?? []).map((o) => (
              <option key={o.id} value={o.id} className={optionClass}>{labels.occupation(o.id)}{countSuffix(o.count)}</option>
            ))}
          </select>
        </Field>

        <Field id="filter-income" label={t('annualIncomeLabel')}>
          <input
            id="filter-income"
            type="number"
            inputMode="numeric"
            min={0}
            step={10000}
            value={filters.income}
            onChange={(e) => onChange({ income: e.target.value })}
            placeholder={t('enterIncome')}
            className={selectClass}
          />
          {filters.income !== '' && !isNaN(Number(filters.income)) && (
            <p className="text-xs font-semibold text-secondary dark:text-sky-400">{labels.income(filters.income)}</p>
          )}
        </Field>
      </Section>

      {/* 2. What you need */}
      <Section icon={<Layers className="w-4 h-4 text-secondary dark:text-sky-400" />} title={t('filterWhatYouNeed')} hint={t('filterWhatYouNeedHint')}>
        <div className="flex flex-wrap gap-2" role="group" aria-label={t('filterWhatYouNeed')}>
          {(options?.topics ?? []).map((topic) => {
            const on = filters.topics.includes(topic.id);
            return (
              <button
                key={topic.id}
                type="button"
                aria-pressed={on}
                onClick={() => onToggleTopic(topic.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors',
                  on
                    ? 'bg-secondary border-secondary text-white dark:bg-sky-500 dark:border-sky-500'
                    : 'bg-white border-outline-variant text-on-surface hover:border-secondary hover:text-secondary dark:bg-zinc-900 dark:border-zinc-700 dark:text-zinc-300 dark:hover:text-sky-400',
                )}
              >
                {labels.topic(topic.id)}
                {typeof topic.count === 'number' && <span className={cn('ml-1 font-normal', on ? 'text-white/80' : 'text-on-surface-variant dark:text-zinc-500')}>{topic.count}</span>}
              </button>
            );
          })}
        </div>
      </Section>

      {/* 3. Who runs it */}
      <Section icon={<Landmark className="w-4 h-4 text-secondary dark:text-sky-400" />} title={t('filterWhoRuns')} last>
        <Field id="filter-level" label={t('govtLevelLabel')}>
          <select
            id="filter-level"
            value={filters.level}
            // A ministry is a central body, so choosing State schemes drops it.
            onChange={(e) => onChange(e.target.value === 'State' ? { level: 'State', ministry: '' } : { level: e.target.value })}
            className={selectClass}
          >
            <option value="" className={optionClass}>{t('allLevels')}</option>
            <option value="Central" className={optionClass}>{t('centralGov')}{countSuffix(levelCount('Central'))}</option>
            <option value="State" className={optionClass}>{t('stateGov')}{countSuffix(levelCount('State'))}</option>
          </select>
        </Field>

        {filters.level !== 'State' && (
          <Field id="filter-ministry" label={t('ministryLabel')}>
            <select id="filter-ministry" value={filters.ministry} onChange={(e) => onChange({ ministry: e.target.value })} className={selectClass}>
              <option value="" className={optionClass}>{t('allMinistries')}</option>
              {ministries.map((m) => (
                <option key={m.name} value={m.name} className={optionClass}>{labels.ministry(m.name)}{countSuffix(m.count)}</option>
              ))}
            </select>
          </Field>
        )}
      </Section>
    </aside>
  );
};

export default FilterSidebar;
