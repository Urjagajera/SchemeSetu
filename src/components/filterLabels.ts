import { useTranslation } from '../contexts/LanguageContext';
import { useVocabulary } from '../hooks/useVocabulary';
import { stateLabel } from '../utils/stateLabel';

const rupees = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 });

/** The words shown for filter values, shared by the sidebar and the chips above the results. */
export function useFilterLabels() {
  const { t, language } = useTranslation();
  const { vocab } = useVocabulary(language);
  const tk = t as (key: any) => string;

  return {
    topic: (id: string) => tk(`topic_${id}`) || id,
    occupation: (id: string) => tk(`occ_${id.replace(/\s+/g, '_')}`) || id,
    gender: (id: string) => tk(id) || id,
    socialCategory: (id: string) => (id === 'general' ? t('shCatGeneral') : id.toUpperCase()),
    level: (id: string) => (id === 'Central' ? t('centralGov') : id === 'State' ? t('stateGov') : id),
    state: (name: string) => stateLabel(name, vocab, tk),
    // The ministry list holds central authorities; the Hindi vocabulary has a name for each one.
    ministry: (name: string) => vocab?.names[name.trim()] ?? name,
    income: (value: string) => rupees.format(Number(value)),
  };
}
