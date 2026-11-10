import React, { useEffect, useState } from 'react';
import { Users, Plus, Pencil, Trash2 } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { familyService, FamilyMember, FamilyAnswers } from '../services/familyService';
import { useStates } from '../hooks/useStates';
import { cn } from '../utils/cn';
import type { TRANSLATIONS } from '../constants/translations';

type Key = keyof typeof TRANSLATIONS['en'];

interface Props {
  /** null = the signed-in person themselves. */
  selectedId: string | null;
  onSelect: (member: FamilyMember | null) => void;
}

const field = 'w-full rounded-lg border-outline-variant dark:border-zinc-700 dark:bg-zinc-850 dark:text-white text-xs md:text-sm py-2 px-3';
const labelCls = 'block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500';

const SELECTS: Array<{ name: keyof FamilyAnswers; label: Key; options: Array<[string, Key]> }> = [
  { name: 'gender', label: 'genderLabel', options: [['male', 'male'], ['female', 'female'], ['other', 'other']] },
  { name: 'category', label: 'socialCategory', options: [['general', 'pfCatGeneral'], ['sc', 'pfCatSc'], ['st', 'pfCatSt'], ['obc', 'pfCatObc']] },
  { name: 'occupation', label: 'occupationLabel', options: [['student', 'occ_student'], ['farmer', 'occ_farmer'], ['entrepreneur', 'occ_entrepreneur'], ['employee', 'occ_employee'], ['unemployed', 'occ_unemployed'], ['senior citizen', 'occ_senior_citizen'], ['other', 'occ_other']] },
  { name: 'residence', label: 'pfResidence', options: [['rural', 'wzRural'], ['urban', 'wzUrban']] },
  { name: 'land', label: 'pfLand', options: [['yes', 'optYes'], ['no', 'optNo']] },
  { name: 'govtJob', label: 'pfGovtJob', options: [['self', 'stOptSelf'], ['family', 'stOptFamily'], ['no', 'stOptNo']] },
  { name: 'incomeTax', label: 'pfIncomeTax', options: [['self', 'stOptSelf'], ['family', 'stOptFamily'], ['no', 'stOptNo']] },
  { name: 'bpl', label: 'pfBpl', options: [['yes', 'optYes'], ['no', 'optNo']] },
  { name: 'pension', label: 'pfPension', options: [['yes', 'optYes'], ['no', 'optNo']] },
];

const EMPTY: FamilyAnswers = { label: '', dob: '', gender: '', state: '', category: '', occupation: '', income: '', residence: '', land: '', govtJob: '', incomeTax: '', bpl: '', pension: '' };

/**
 * "Checking for": the signed-in person or one of up to 6 family members, whose answers are kept under the account
 * so schemes can be checked for a parent or child without changing the person's own profile.
 */
export const FamilyPanel: React.FC<Props> = ({ selectedId, onSelect }) => {
  const { t } = useTranslation();
  const states = useStates();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [max, setMax] = useState(6);
  const [editing, setEditing] = useState<FamilyMember | 'new' | null>(null);
  const [form, setForm] = useState<FamilyAnswers>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    familyService.list().then((r) => { setMembers(r.members); setMax(r.max); }, () => { /* backend away: just "Me" */ });
  }, []);

  const open = (m: FamilyMember | 'new') => {
    setEditing(m);
    setError(null);
    setForm(m === 'new' ? EMPTY : { ...EMPTY, ...Object.fromEntries(Object.entries(m).filter(([k]) => k !== 'id' && k !== 'age')) });
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label?.trim()) { setError(t('famErrName')); return; }
    setSaving(true);
    setError(null);
    try {
      const saved = editing === 'new' || !editing ? await familyService.create(form) : await familyService.update(editing.id, form);
      setMembers((prev) => (prev.some((m) => m.id === saved.id) ? prev.map((m) => (m.id === saved.id ? saved : m)) : [...prev, saved]));
      setEditing(null);
      onSelect(saved);
    } catch {
      setError(t('famErrSave'));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: FamilyMember) => {
    if (!window.confirm(t('famConfirmDelete').replace('{name}', m.label))) return;
    try {
      await familyService.remove(m.id);
      setMembers((prev) => prev.filter((x) => x.id !== m.id));
      if (selectedId === m.id) onSelect(null);
    } catch {
      setError(t('famErrSave'));
    }
  };

  const chip = (active: boolean) =>
    cn('px-3 py-1.5 rounded-full border text-xs font-bold transition-colors', active
      ? 'bg-secondary text-white border-secondary dark:bg-sky-500 dark:text-zinc-950 dark:border-sky-500'
      : 'border-outline-variant text-on-surface dark:text-zinc-300 dark:border-zinc-700 hover:border-secondary');

  const selected = members.find((m) => m.id === selectedId) ?? null;

  return (
    <section aria-labelledby="family-title" className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-5 shadow-sm space-y-3">
      <h2 id="family-title" className="font-heading text-sm md:text-base font-bold text-primary dark:text-white flex items-center gap-2">
        <Users className="w-4 h-4 text-secondary dark:text-sky-400" aria-hidden="true" /> {t('famCheckingFor')}
      </h2>
      <div role="group" aria-labelledby="family-title" className="flex flex-wrap gap-2">
        <button type="button" aria-pressed={selectedId === null} className={chip(selectedId === null)} onClick={() => onSelect(null)}>{t('famMe')}</button>
        {members.map((m) => (
          <button key={m.id} type="button" aria-pressed={selectedId === m.id} className={chip(selectedId === m.id)} onClick={() => onSelect(m)}>{m.label}</button>
        ))}
        {members.length < max && (
          <button type="button" onClick={() => open('new')} className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full border border-dashed border-secondary text-secondary dark:border-sky-500 dark:text-sky-400 text-xs font-bold">
            <Plus className="w-3.5 h-3.5" aria-hidden="true" /> {t('famAdd')}
          </button>
        )}
      </div>

      {selected && !editing && (
        <div className="flex flex-wrap items-center gap-2 text-xs text-on-surface-variant dark:text-zinc-400">
          <span>{t('famShowingFor').replace('{name}', selected.label)}</span>
          <button type="button" onClick={() => open(selected)} className="inline-flex items-center gap-1 font-bold text-secondary dark:text-sky-400"><Pencil className="w-3.5 h-3.5" aria-hidden="true" /> {t('famEdit')}</button>
          <button type="button" onClick={() => remove(selected)} className="inline-flex items-center gap-1 font-bold text-red-600 dark:text-red-400"><Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> {t('famDelete')}</button>
        </div>
      )}

      {editing && (
        <form onSubmit={save} className="space-y-3 border-t border-outline-variant dark:border-zinc-800 pt-3" aria-label={t('famFormTitle')}>
          <p className="text-xs text-on-surface-variant dark:text-zinc-400">{t('famFormHelp')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor="fam-label" className={labelCls}>{t('famName')}</label>
              <input id="fam-label" className={field} maxLength={40} value={form.label ?? ''} onChange={(e) => setForm({ ...form, label: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor="fam-dob" className={labelCls}>{t('pfFDob')}</label>
              <input id="fam-dob" type="date" className={field} value={form.dob ?? ''} max={new Date().toISOString().slice(0, 10)} onChange={(e) => setForm({ ...form, dob: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor="fam-income" className={labelCls}>{t('pfFIncome')}</label>
              <input id="fam-income" type="number" min={0} className={field} value={form.income ?? ''} onChange={(e) => setForm({ ...form, income: e.target.value })} />
            </div>
            <div className="space-y-1">
              <label htmlFor="fam-state" className={labelCls}>{t('stateLabel')}</label>
              <select id="fam-state" className={field} value={form.state ?? ''} onChange={(e) => setForm({ ...form, state: e.target.value })}>
                <option value="">{t('optSelect')}</option>
                {states.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            {SELECTS.map((s) => (
              <div key={s.name} className="space-y-1">
                <label htmlFor={`fam-${s.name}`} className={labelCls}>{t(s.label)}</label>
                <select id={`fam-${s.name}`} className={field} value={(form[s.name] as string) ?? ''} onChange={(e) => setForm({ ...form, [s.name]: e.target.value })}>
                  <option value="">{t('optSelect')}</option>
                  {s.options.map(([v, k]) => <option key={v} value={v}>{t(k)}</option>)}
                </select>
              </div>
            ))}
          </div>
          {error && <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setEditing(null)} className="px-4 py-2 rounded-lg border border-outline-variant dark:border-zinc-700 text-xs font-bold">{t('famCancel')}</button>
            <button type="submit" disabled={saving} className="px-4 py-2 rounded-lg bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 text-xs font-bold disabled:opacity-60">{t('famSave')}</button>
          </div>
        </form>
      )}
      {!editing && error && <p role="alert" className="text-xs font-bold text-red-600 dark:text-red-400">{error}</p>}
    </section>
  );
};

export default FamilyPanel;
