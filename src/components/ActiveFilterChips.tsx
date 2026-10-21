import React from 'react';
import { X } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { SearchFilters } from '../hooks/useSearchFilters';
import { useFilterLabels } from './filterLabels';

interface ActiveFilterChipsProps {
  filters: SearchFilters;
  onChange: (changes: Partial<SearchFilters>) => void;
  onToggleTopic: (id: string) => void;
  onClear: () => void;
}

/** One removable chip per filter that is on, so it is always visible what the list is narrowed by. */
export const ActiveFilterChips: React.FC<ActiveFilterChipsProps> = ({ filters, onChange, onToggleTopic, onClear }) => {
  const { t } = useTranslation();
  const labels = useFilterLabels();

  const chips: Array<{ key: string; text: string; remove: () => void }> = [];
  if (filters.state) chips.push({ key: 'state', text: labels.state(filters.state), remove: () => onChange({ state: '' }) });
  if (filters.age) chips.push({ key: 'age', text: `${t('ageYearsLabel')}: ${filters.age}`, remove: () => onChange({ age: '' }) });
  if (filters.gender) chips.push({ key: 'gender', text: labels.gender(filters.gender), remove: () => onChange({ gender: '' }) });
  if (filters.socialCategory) chips.push({ key: 'social', text: labels.socialCategory(filters.socialCategory), remove: () => onChange({ socialCategory: '' }) });
  if (filters.occupation) chips.push({ key: 'occupation', text: labels.occupation(filters.occupation), remove: () => onChange({ occupation: '' }) });
  if (filters.income) chips.push({ key: 'income', text: labels.income(filters.income), remove: () => onChange({ income: '' }) });
  for (const id of filters.topics) chips.push({ key: `topic-${id}`, text: labels.topic(id), remove: () => onToggleTopic(id) });
  if (filters.level) chips.push({ key: 'level', text: labels.level(filters.level), remove: () => onChange({ level: '' }) });
  if (filters.ministry) chips.push({ key: 'ministry', text: labels.ministry(filters.ministry), remove: () => onChange({ ministry: '' }) });

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2" aria-label={t('activeFiltersLabel')}>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className="inline-flex items-center gap-1 rounded-full bg-secondary/10 text-secondary dark:bg-sky-500/15 dark:text-sky-300 pl-3 pr-1 py-1 text-xs font-semibold"
        >
          {chip.text}
          <button
            type="button"
            onClick={chip.remove}
            aria-label={`${t('removeFilter')}: ${chip.text}`}
            className="rounded-full p-0.5 hover:bg-secondary/20 dark:hover:bg-sky-500/25"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </span>
      ))}
      <button type="button" onClick={onClear} className="text-xs font-bold text-on-surface-variant dark:text-zinc-400 hover:underline px-1">
        {t('clearAll')}
      </button>
    </div>
  );
};

export default ActiveFilterChips;
