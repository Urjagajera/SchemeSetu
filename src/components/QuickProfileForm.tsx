import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { User } from 'lucide-react';
import { useAuth, ProfileSaveError } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useStates } from '../hooks/useStates';
import { useVocabulary } from '../hooks/useVocabulary';
import { stateLabel } from '../utils/stateLabel';
import { cn } from '../utils/cn';
import { ELIGIBILITY_FIELD_LABELS, EligibilityField, profileCompleteness } from '../utils/profileCompleteness';
import type { TRANSLATIONS } from '../constants/translations';

type Key = keyof (typeof TRANSLATIONS)['en'];

/** The same options the full profile form offers (pages/Profile.tsx), so an answer given here reads the same there. */
const SELECT_OPTIONS: Partial<Record<EligibilityField, Array<[string, Key]>>> = {
  gender: [['male', 'male'], ['female', 'female'], ['other', 'other']],
  category: [['general', 'pfCatGeneral'], ['sc', 'pfCatSc'], ['st', 'pfCatSt'], ['obc', 'pfCatObc']],
  occupation: [
    ['farmer', 'pfOccFarmer'], ['student', 'pfOccStudent'], ['entrepreneur', 'pfOccEntrepreneur'], ['employee', 'occ_employee'],
    ['senior citizen', 'pfOccSenior'], ['unemployed', 'pfOccUnemployed'], ['other', 'other'],
  ],
  residence: [['rural', 'pfRural'], ['urban', 'pfUrban']],
};

/** Same rules as the full profile form. */
const CHECKS: Partial<Record<EligibilityField, { test: (v: string) => boolean; message: Key }>> = {
  age: { test: (v) => /^\d{1,3}$/.test(v) && Number(v) >= 1 && Number(v) <= 120, message: 'pfErrAge' },
  income: { test: (v) => /^\d{1,12}$/.test(v), message: 'pfErrIncome' },
};

const inputClass =
  'w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary';

/**
 * Asks for the profile answers the eligibility check still needs, right where the user is (dashboard, eligibility
 * page), and saves them to the profile, so nobody has to go to the profile page first. Only the missing questions
 * are shown, and only the answers given are sent: whatever else is already saved stays as it is.
 */
export const QuickProfileForm: React.FC<{ className?: string }> = ({ className }) => {
  const { profile, updateProfile } = useAuth();
  const { t, language } = useTranslation();
  const states = useStates();
  const { vocab } = useVocabulary(language);

  const completeness = profileCompleteness(profile);
  // The questions are the ones missing when the card opened, so a field doesn't vanish while it is being answered.
  const [fields] = useState<EligibilityField[]>(completeness.missing);
  const [answers, setAnswers] = useState<Partial<Record<EligibilityField, string>>>({});
  const [errors, setErrors] = useState<Partial<Record<EligibilityField, string>>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const stillMissing = fields.filter((f) => profileCompleteness(profile).missing.includes(f));
  if (stillMissing.length === 0) return null;

  const set = (field: EligibilityField, value: string) => {
    setAnswers((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError('');
    const given = Object.fromEntries(
      stillMissing.map((f) => [f, (answers[f] ?? '').trim()] as const).filter(([, v]) => v !== ''),
    ) as Partial<Record<EligibilityField, string>>;

    const found: Partial<Record<EligibilityField, string>> = {};
    for (const [f, v] of Object.entries(given) as Array<[EligibilityField, string]>) {
      const check = CHECKS[f];
      if (check && !check.test(v)) found[f] = t(check.message);
    }
    if (Object.keys(given).length === 0) {
      setSaveError(t('qpNothingToSave'));
      return;
    }
    if (Object.keys(found).length > 0) {
      setErrors(found);
      return;
    }

    try {
      setSaving(true);
      await updateProfile(given);
    } catch (err) {
      const fieldsFromServer = err instanceof ProfileSaveError ? err.fields : {};
      setErrors(Object.fromEntries(Object.entries(fieldsFromServer).filter(([f]) => fields.includes(f as EligibilityField))));
      setSaveError(t('pfSaveFailed'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={save}
      noValidate
      data-testid="quick-profile"
      className={cn(
        'bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-5 transition-colors',
        className,
      )}
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary-container/20 text-secondary dark:text-sky-400 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5" />
        </div>
        <div className="flex-grow min-w-0">
          <h3 className="font-heading text-sm md:text-base font-bold text-primary dark:text-white">{t('qpTitle')}</h3>
          <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5 leading-relaxed">{t('qpDesc')}</p>
        </div>
        <span className="text-[11px] font-bold text-secondary bg-secondary-container/20 px-2.5 py-0.5 rounded-full whitespace-nowrap">
          {completeness.percentage}% {t('shComplete')}
        </span>
      </div>

      <div className="w-full h-2 bg-surface-container-highest dark:bg-zinc-800 rounded-full overflow-hidden">
        <div className="h-full bg-secondary dark:bg-sky-500 rounded-full transition-all duration-500" style={{ width: `${completeness.percentage}%` }} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {stillMissing.map((f) => {
          const id = `qp-${f}`;
          const options = SELECT_OPTIONS[f];
          return (
            <div key={f} className="space-y-1">
              <label htmlFor={id} className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                {t(ELIGIBILITY_FIELD_LABELS[f])}
              </label>
              {f === 'age' || f === 'income' ? (
                <input
                  id={id}
                  type="number"
                  inputMode="numeric"
                  min={f === 'age' ? 1 : 0}
                  max={f === 'age' ? 120 : undefined}
                  step={f === 'income' ? 10000 : 1}
                  value={answers[f] ?? ''}
                  onChange={(e) => set(f, e.target.value)}
                  placeholder={f === 'age' ? t('enterAge') : t('enterIncome')}
                  aria-invalid={!!errors[f]}
                  className={inputClass}
                />
              ) : (
                <select id={id} value={answers[f] ?? ''} onChange={(e) => set(f, e.target.value)} aria-invalid={!!errors[f]} className={inputClass}>
                  <option value="">{t('optSelect')}</option>
                  {f === 'state'
                    ? states.map((s) => <option key={s} value={s}>{stateLabel(s, vocab, t as (key: any) => string)}</option>)
                    : (options ?? []).map(([value, label]) => <option key={value} value={value}>{t(label)}</option>)}
                </select>
              )}
              {errors[f] && <p className="text-[10px] text-red-500 font-bold">{errors[f]}</p>}
            </div>
          );
        })}
      </div>

      {saveError && <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">{saveError}</p>}

      <div className="flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-3">
        <Link to="/profile" className="text-xs font-bold text-secondary dark:text-sky-400 hover:underline">
          {t('qpMoreLink')}
        </Link>
        <button
          type="submit"
          disabled={saving}
          className="bg-primary text-white dark:bg-sky-500 dark:text-zinc-950 px-5 py-2 rounded-lg font-heading text-xs font-bold hover:bg-secondary dark:hover:opacity-90 transition-all active:scale-95 shadow-sm disabled:opacity-60"
        >
          {saving ? t('qpSaving') : t('qpSave')}
        </button>
      </div>
    </form>
  );
};

export default QuickProfileForm;
