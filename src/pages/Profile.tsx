import React, { useState, useEffect } from 'react';
import { useForm, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth, ProfileSaveError } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useStates } from '../hooks/useStates';
import { useVocabulary } from '../hooks/useVocabulary';
import { stateLabel } from '../utils/stateLabel';
import { UserProfile } from '../types';
import { 
  User, 
  GraduationCap, 
  Coins, 
  MapPin, 
  Bookmark, 
  ShieldCheck,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

// Only the name is required. Every other answer is optional: a blank means "unknown", and the eligibility
// engine never rules a scheme out because of an unknown. What IS filled in must still be sensible.
// The messages are locale keys (see locales/*.json) and are translated where they are shown.
// The server checks the same rules again (backend/src/utils/profileSchema.ts), so keep the two in step.
const isRealPastDate = (v: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === v && d.getUTCFullYear() >= 1900 && d.getTime() <= Date.now();
};

const profileSchema = z.object({
  name: z.string().trim().min(2, 'pfErrNameMin').max(100, 'pfErrNameMax'),
  age: z.string().refine(v => v.trim() === '' || (/^\d{1,3}$/.test(v.trim()) && Number(v) >= 1 && Number(v) <= 120), {
    message: 'pfErrAge'
  }),
  dob: z.string().refine(v => v === '' || isRealPastDate(v), {
    message: 'pfErrDob'
  }),
  gender: z.string(),
  occupation: z.string(),
  education: z.string(),
  income: z.string().refine(v => v.trim() === '' || /^\d{1,12}$/.test(v.trim()), {
    message: 'pfErrIncome'
  }),
  category: z.string(),
  state: z.string().max(100, 'pfErrState'),
  district: z.string().max(100, 'pfErrDistrict'),
  residence: z.string(),
  minority: z.string(),
  disability: z.string(),
  farmer: z.string(),
  widow: z.string(),
  veteran: z.string(),
  land: z.string()
});

// Which tab each field lives on, and (as a locale key) what to call it in the error summary.
const FIELD_INFO: Record<string, { label: string; section: 'personal' | 'academic' | 'finance' | 'location' | 'special' }> = {
  name: { label: 'pfName', section: 'personal' },
  age: { label: 'pfAge', section: 'personal' },
  dob: { label: 'pfFDob', section: 'personal' },
  gender: { label: 'genderLabel', section: 'personal' },
  education: { label: 'education', section: 'academic' },
  occupation: { label: 'occupationLabel', section: 'finance' },
  income: { label: 'pfFIncome', section: 'finance' },
  farmer: { label: 'pfFFarmer', section: 'finance' },
  land: { label: 'pfFLand', section: 'finance' },
  state: { label: 'stateLabel', section: 'location' },
  district: { label: 'pfDistrict', section: 'location' },
  residence: { label: 'residence', section: 'location' },
  category: { label: 'socialCategory', section: 'special' },
  minority: { label: 'pfFMinority', section: 'special' },
  disability: { label: 'pfFDisability', section: 'special' },
  widow: { label: 'pfFWidow', section: 'special' },
  veteran: { label: 'pfFVeteran', section: 'special' }
};

interface FormProblem {
  field: string;
  label: string;
  message: string;
}

type ProfileFormValues = z.infer<typeof profileSchema>;

export const Profile: React.FC = () => {
  const { user, profile, updateProfile } = useAuth();
  const { t, language } = useTranslation();
  const states = useStates();
  const { vocab } = useVocabulary(language);
  
  const [successMsg, setSuccessMsg] = useState('');
  // What stopped a save, shown at the top of the page whichever tab you are on.
  const [saveProblem, setSaveProblem] = useState<{ message: string; items: FormProblem[] } | null>(null);
  const [activeSection, setActiveSection] = useState<'personal' | 'academic' | 'finance' | 'location' | 'special'>('personal');
  
  const [selectedTags, setSelectedTags] = useState<string[]>(profile.interests || profile.profileTags || []);
  const [newTagInput, setNewTagInput] = useState('');

  // Same class of bug as the form's `values` fix above, for this separately-
  // managed piece of state: useState's initializer only runs once at mount,
  // so without this, selectedTags would stay stuck on whatever profile was
  // at that instant even after the real server data loads. Not applying the
  // same keepDirtyValues-style protection here — accepted narrow edge case:
  // if profile updates while the user has already started toggling tags but
  // before saving, their in-progress tag edits could get overwritten. Only
  // happens in the split-second window right after page load; flagging it
  // rather than building separate dirty-tracking for this one field.
  useEffect(() => {
    setSelectedTags(profile.interests || profile.profileTags || []);
  }, [profile]);

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const val = newTagInput.trim();
      if (val && !selectedTags.includes(val)) {
        setSelectedTags([...selectedTags, val]);
        setNewTagInput('');
      }
    }
  };

  const handleAddCustomTagBtn = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    const val = newTagInput.trim();
    if (val && !selectedTags.includes(val)) {
      setSelectedTags([...selectedTags, val]);
      setNewTagInput('');
    }
  };

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting }
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    // `values` (not `defaultValues`) so the form stays in sync when `profile`
    // loads asynchronously from GET /api/profile. defaultValues is a
    // mount-time-only snapshot — it doesn't react to profile updating after
    // the initial render, so with a plain profile.age fallback here, loading
    // this page right after logging in could show default placeholder values
    // in the form while the real server data was still in flight, and
    // hitting Save at that moment would silently overwrite real saved data
    // with those placeholders. Confirmed live: reloading immediately after a
    // save showed stale defaults for a moment before the real data settled.
    // keepDirtyValues stops this reactive sync from clobbering an in-progress
    // edit if profile happens to update while the user is mid-form (e.g. the
    // background fetch resolving right as they start typing).
    values: {
      name: user?.name || '',
      age: profile.age || '',
      dob: profile.dob || '',
      gender: profile.gender || '',
      occupation: profile.occupation || '',
      education: profile.education || '',
      income: profile.income || '',
      category: profile.category || '',
      state: profile.state || '',
      district: profile.district || '',
      residence: profile.residence || '',
      minority: profile.minority || '',
      disability: profile.disability || '',
      farmer: profile.farmer || '',
      widow: profile.widow || '',
      veteran: profile.veteran || '',
      land: profile.land || ''
    },
    resetOptions: { keepDirtyValues: true }
  });

  // A locale key becomes its text in the current language; anything else (a message from the server) is shown as it is.
  const text = (keyOrText: string): string => t(keyOrText as Parameters<typeof t>[0]);

  const toProblems = (entries: Array<[string, string]>): FormProblem[] =>
    entries.map(([field, message]) => ({ field, label: FIELD_INFO[field] ? text(FIELD_INFO[field].label) : field, message }));

  // Jump to the first tab that has a problem, so the error is not hidden on a tab you are not looking at.
  const showFirstProblem = (items: FormProblem[]) => {
    const first = items.find(i => FIELD_INFO[i.field]);
    if (first) setActiveSection(FIELD_INFO[first.field].section);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const onInvalid = (invalid: FieldErrors<ProfileFormValues>) => {
    setSuccessMsg('');
    const items = toProblems(Object.entries(invalid).map(([field, err]) => [field, String(err?.message ?? 'pfNotValid')]));
    setSaveProblem({ message: 'pfNotSaved', items });
    showFirstProblem(items);
  };

  const onSubmit = async (values: ProfileFormValues) => {
    try {
      setSuccessMsg('');
      setSaveProblem(null);
      // A blank answer is sent as blank: the server turns it into "unknown", which also clears a value saved earlier.
      await updateProfile({
        ...values,
        interests: selectedTags,
        profileTags: selectedTags
      });
      setSuccessMsg('pfSaved');
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error(err);
      const failure = err instanceof ProfileSaveError ? err : new ProfileSaveError('pfSaveFailed');
      const items = toProblems(Object.entries(failure.fields));
      items.forEach(i => {
        if (i.field in FIELD_INFO) setError(i.field as keyof ProfileFormValues, { type: 'server', message: i.message });
      });
      setSaveProblem({
        message: items.length > 0 ? 'pfServerRejected' : failure.message,
        items
      });
      showFirstProblem(items);
    }
  };

  const sections = [
    { id: 'personal', label: t('pfTabPersonal'), icon: User },
    { id: 'academic', label: t('pfTabEducation'), icon: GraduationCap },
    { id: 'finance', label: t('pfTabFinance'), icon: Coins },
    { id: 'location', label: t('pfTabLocation'), icon: MapPin },
    { id: 'special', label: t('pfTabSpecial'), icon: Bookmark }
  ] as const;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto w-full space-y-6"
    >
      <div>
        <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary dark:text-white">
          {t('profile')}
        </h1>
        <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
          {t('pfIntro')}
        </p>
        <p className="font-body text-xs text-on-surface-variant dark:text-zinc-400 mt-2">
          {t('pfOnlyName')}
        </p>
      </div>

      {saveProblem && (
        <div role="alert" className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300 rounded-xl p-4 space-y-2 text-xs md:text-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span className="font-bold">{text(saveProblem.message)}</span>
          </div>
          {saveProblem.items.length > 0 && (
            <ul className="list-disc pl-9 space-y-0.5">
              {saveProblem.items.map(i => (
                <li key={i.field}>
                  <button
                    type="button"
                    className="underline font-semibold text-left"
                    onClick={() => FIELD_INFO[i.field] && setActiveSection(FIELD_INFO[i.field].section)}
                  >
                    {i.label}
                  </button>
                  : {text(i.message)}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {successMsg && (
        <div className="bg-[#d1fadf] border border-green-200 text-[#027a48] rounded-xl p-4 flex items-center gap-2 text-xs md:text-sm">
          <CheckCircle className="w-5 h-5 flex-shrink-0" />
          <span className="font-bold">{text(successMsg)}</span>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">
        
        {/* Left column navigation tabs */}
        <div className="md:col-span-1 space-y-3">
          <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-3 shadow-sm flex flex-col space-y-1 transition-colors">
            {sections.map(sec => {
              const Icon = sec.icon;
              return (
                <button
                  key={sec.id}
                  type="button"
                  onClick={() => setActiveSection(sec.id)}
                  className={cn(
                    "flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs md:text-sm font-bold text-left transition-colors focus:outline-none",
                    activeSection === sec.id
                      ? "bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950"
                      : "text-on-surface-variant hover:bg-surface-container-low dark:text-zinc-400 dark:hover:bg-zinc-800"
                  )}
                >
                  <Icon className="w-4.5 h-4.5" />
                  {sec.label}
                  {Object.keys(errors).some(f => FIELD_INFO[f]?.section === sec.id) && (
                    <span className="ml-auto w-2 h-2 rounded-full bg-red-500" aria-label={t('pfTabProblem')} />
                  )}
                </button>
              );
            })}
          </div>

          {/* Verification badge */}
          <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-5 shadow-sm text-center space-y-3 transition-colors">
            <div className="flex justify-center text-green-600 dark:text-green-400">
              <ShieldCheck className="w-12 h-12" />
            </div>
            <div>
              <h4 className="font-heading text-xs md:text-sm font-extrabold text-primary dark:text-white">
                {t('verifiedCitizen')}
              </h4>
            </div>
          </div>
        </div>

        {/* Right column form parameters */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-6 transition-colors">
          
          {/* Section 1: Personal */}
          {activeSection === 'personal' && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm md:text-base font-extrabold text-primary dark:text-white pb-2 border-b dark:border-zinc-800">
                {t('pfTabPersonal')}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfName')}</label>
                  <input
                    type="text"
                    {...register('name')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.name && <p className="text-[10px] text-red-500 font-bold">{text(String(errors.name.message))}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfAge')}</label>
                  <input
                    type="number"
                    {...register('age')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.age && <p className="text-[10px] text-red-500 font-bold">{text(String(errors.age.message))}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfDob')}</label>
                  <input
                    type="date"
                    {...register('dob')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.dob && <p className="text-[10px] text-red-500 font-bold">{text(String(errors.dob.message))}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('genderLabel')}</label>
                  <select
                    {...register('gender')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">{t('optSelect')}</option>
                    <option value="male">{t('male')}</option>
                    <option value="female">{t('female')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Education */}
          {activeSection === 'academic' && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm md:text-base font-extrabold text-primary dark:text-white pb-2 border-b dark:border-zinc-800">
                {t('pfHeadEducation')}
              </h3>
              
              <div className="space-y-1 max-w-sm">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfEducation')}</label>
                <select
                  {...register('education')}
                  className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                >
                  <option value="">{t('optSelect')}</option>
                  <option value="below 10th">{t('pfEdBelow10')}</option>
                  <option value="10th">{t('pfEd10')}</option>
                  <option value="12th">{t('pfEd12')}</option>
                  <option value="undergraduate">{t('pfEdUg')}</option>
                  <option value="graduate">{t('pfEdGrad')}</option>
                  <option value="post-graduate">{t('pfEdPg')}</option>
                </select>
              </div>
            </div>
          )}

          {/* Section 3: Financial */}
          {activeSection === 'finance' && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm md:text-base font-extrabold text-primary dark:text-white pb-2 border-b dark:border-zinc-800">
                {t('pfTabFinance')}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('occupationLabel')}</label>
                  <select
                    {...register('occupation')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">{t('optSelect')}</option>
                    <option value="farmer">{t('pfOccFarmer')}</option>
                    <option value="student">{t('pfOccStudent')}</option>
                    <option value="entrepreneur">{t('pfOccEntrepreneur')}</option>
                    <option value="employee">{t('occ_employee')}</option>
                    <option value="senior citizen">{t('pfOccSenior')}</option>
                    <option value="unemployed">{t('pfOccUnemployed')}</option>
                    <option value="other">{t('other')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfIncome')}</label>
                  <input
                    type="number"
                    step="10000"
                    {...register('income')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  />
                  {errors.income && <p className="text-[10px] text-red-500 font-bold">{text(String(errors.income.message))}</p>}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfFarmer')}</label>
                  <select
                    {...register('farmer')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">{t('optSelect')}</option>
                    <option value="yes">{t('optYes')}</option>
                    <option value="no">{t('optNo')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfLand')}</label>
                  <select
                    {...register('land')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">{t('optSelect')}</option>
                    <option value="yes">{t('optYes')}</option>
                    <option value="no">{t('optNo')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 4: Location */}
          {activeSection === 'location' && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm md:text-base font-extrabold text-primary dark:text-white pb-2 border-b dark:border-zinc-800">
                {t('pfHeadLocation')}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfState')}</label>
                  {/* Rendered once the list has arrived, so the saved state is selected as soon as the dropdown exists. */}
                  {states.length > 0 ? (
                    <select
                      {...register('state')}
                      className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                    >
                      <option value="">{t('optSelect')}</option>
                      {states.map(s => (
                        <option key={s} value={s}>{stateLabel(s, vocab, t as (key: any) => string)}</option>
                      ))}
                      {/* A value saved before this was a dropdown that is not on the list stays visible instead of vanishing. */}
                      {profile.state && !states.includes(profile.state) && (
                        <option value={profile.state}>{profile.state} {t('pfNotOnList')}</option>
                      )}
                    </select>
                  ) : (
                    <select disabled className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 text-xs md:text-sm py-2 px-3 opacity-60">
                      <option>{t('optLoading')}</option>
                    </select>
                  )}
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfDistrict')}</label>
                  <input
                    type="text"
                    {...register('district')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfResidence')}</label>
                  <select
                    {...register('residence')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">{t('optSelect')}</option>
                    <option value="rural">{t('pfRural')}</option>
                    <option value="urban">{t('pfUrban')}</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Section 5: Special Categories */}
          {activeSection === 'special' && (
            <div className="space-y-4">
              <h3 className="font-heading text-sm md:text-base font-extrabold text-primary dark:text-white pb-2 border-b dark:border-zinc-800">
                {t('pfHeadSpecial')}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('socialCategory')}</label>
                  <select
                    {...register('category')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">{t('optSelect')}</option>
                    <option value="general">{t('pfCatGeneral')}</option>
                    <option value="sc">{t('pfCatSc')}</option>
                    <option value="st">{t('pfCatSt')}</option>
                    <option value="obc">{t('pfCatObc')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfMinority')}</label>
                  <select
                    {...register('minority')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">{t('optSelect')}</option>
                    <option value="yes">{t('optYes')}</option>
                    <option value="no">{t('optNo')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfDisability')}</label>
                  <select
                    {...register('disability')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">{t('optSelect')}</option>
                    <option value="yes">{t('optYes')}</option>
                    <option value="no">{t('optNo')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfWidow')}</label>
                  <select
                    {...register('widow')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">{t('optSelect')}</option>
                    <option value="yes">{t('optYes')}</option>
                    <option value="no">{t('optNo')}</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">{t('pfVeteran')}</label>
                  <select
                    {...register('veteran')}
                    className="w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                  >
                    <option value="">{t('optSelect')}</option>
                    <option value="yes">{t('optYes')}</option>
                    <option value="no">{t('optNo')}</option>
                  </select>
                </div>
              </div>

              {/* Keywords & Interests */}
              <div className="space-y-4 pt-4 border-t dark:border-zinc-800">
                <h4 className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                  {t('pfTagsHeading')}
                </h4>
                
                <div className="flex flex-wrap gap-2">
                  {[
                    'Student', 'Scholarship', 'Education', 'Stipend', 'Internship',
                    'Farmer', 'Agriculture', 'Animal Husbandry', 'Dairy Farmer',
                    'Woman', 'Women', 'Maternity', 'Widow',
                    'Scheduled Caste', 'Scheduled Tribe', 'OBC',
                    'Disabled', 'PwD', 'Artisan', 'Entrepreneur', 'Business'
                  ].map((tag, idx) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-semibold cursor-pointer border transition-all",
                          isSelected
                            ? "bg-secondary border-secondary text-white dark:bg-sky-500 dark:border-sky-500 dark:text-zinc-950"
                            : "bg-surface-container-low border-outline-variant text-primary dark:bg-zinc-850 dark:border-zinc-800 dark:text-zinc-300 hover:bg-secondary/10 dark:hover:bg-sky-500/10"
                        )}
                      >
                        {tag}
                      </button>
                    );
                  })}
                </div>

                {/* Custom Tag Input */}
                <div className="space-y-1 pt-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                    {t('pfCustomTags')}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTagInput}
                      onChange={(e) => setNewTagInput(e.target.value)}
                      onKeyDown={handleAddCustomTag}
                      placeholder={t('pfCustomTagsHint')}
                      className="flex-1 rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3 focus:ring-secondary focus:border-secondary"
                    />
                    <button
                      type="button"
                      onClick={handleAddCustomTagBtn}
                      className="px-4 py-2 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 font-bold text-xs rounded-lg active:scale-95"
                    >
                      {t('pfAdd')}
                    </button>
                  </div>
                  
                  {/* Selected Tags list preview */}
                  {selectedTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-2">
                      {selectedTags.map((tag, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-secondary-container/10 border border-secondary/20 text-secondary dark:bg-zinc-850 dark:border-zinc-800 dark:text-sky-400 text-[10px] font-bold"
                        >
                          {tag}
                          <button
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className="text-red-500 hover:text-red-700 focus:outline-none ml-1 font-extrabold text-[12px]"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* Action Submission Buttons */}
          <div className="pt-4 border-t border-outline-variant dark:border-zinc-800 flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-secondary hover:bg-opacity-95 text-white dark:bg-sky-500 dark:text-zinc-950 font-bold text-xs md:text-sm rounded-lg transition-all shadow-sm active:scale-95 disabled:opacity-50 focus:outline-none"
            >
              {isSubmitting ? t('pfSaving') : t('pfSave')}
            </button>
          </div>

        </div>

      </form>
    </motion.div>
  );
};

export default Profile;
