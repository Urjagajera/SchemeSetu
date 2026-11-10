import React, { useEffect, useState } from 'react';
import { Printer, ArrowLeft, CheckSquare, Square } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { checklistService, ChecklistTicks } from '../services/checklistService';
import { DOCUMENT_KINDS } from '../utils/documentKinds';
import { buildCarryList, CarryScheme } from '../utils/carryList';
import type { TRANSLATIONS } from '../constants/translations';

type Key = keyof typeof TRANSLATIONS['en'];

/**
 * A printable list of every document the saved schemes ask for, merged, with what is already ready (kept under
 * "My documents" or ticked on a scheme's checklist) at the end.
 */
export const WhatToCarry: React.FC<{ schemes: CarryScheme[]; onClose: () => void }> = ({ schemes, onClose }) => {
  const { t } = useTranslation();
  const { profile } = useAuth();
  const [ticks, setTicks] = useState<Record<string, ChecklistTicks>>({});

  useEffect(() => {
    let cancelled = false;
    Promise.all(
      schemes.map((s) => checklistService.get(s.id).then((x) => [s.id, x] as const, () => [s.id, { checked: [], unchecked: [] }] as const)),
    ).then((pairs) => { if (!cancelled) setTicks(Object.fromEntries(pairs)); });
    return () => { cancelled = true; };
  }, [schemes]);

  const items = buildCarryList(schemes, profile?.documentsHeld ?? [], ticks);
  const needed = items.filter((i) => !i.ready).length;
  const label = (kind: string) => t((DOCUMENT_KINDS.find((k) => k.key === kind)?.label ?? kind) as Key);

  return (
    <section aria-labelledby="carry-title" className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4 print:border-0 print:shadow-none print:p-0">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="carry-title" className="font-heading text-lg font-extrabold text-primary dark:text-white">{t('carryTitle')}</h2>
          <p className="text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
            {t('carrySummary').replace('{needed}', String(needed)).replace('{schemes}', String(schemes.length))}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button type="button" onClick={onClose} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-outline-variant dark:border-zinc-700 text-xs font-bold text-on-surface dark:text-zinc-300">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> {t('carryBack')}
          </button>
          <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 text-xs font-bold">
            <Printer className="w-4 h-4" aria-hidden="true" /> {t('carryPrint')}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-on-surface-variant dark:text-zinc-400 italic">{t('carryNone')}</p>
      ) : (
        <ul className="divide-y divide-outline-variant dark:divide-zinc-800">
          {items.map((item, i) => (
            <li key={i} className="py-2.5 flex items-start gap-3">
              {item.ready ? (
                <CheckSquare className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" aria-hidden="true" />
              ) : (
                <Square className="w-5 h-5 text-on-surface-variant dark:text-zinc-500 shrink-0 mt-0.5" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-on-surface dark:text-zinc-200 break-words">
                  {item.kind ? label(item.kind) : item.line}
                  <span className="sr-only">{item.ready ? ` (${t('carryReady')})` : ` (${t('carryNeeded')})`}</span>
                  {item.ready && <span aria-hidden="true" className="ml-2 text-xs font-bold text-green-700 dark:text-green-400">{t('carryReady')}</span>}
                </p>
                <p className="text-xs text-on-surface-variant dark:text-zinc-500 break-words">
                  {t('carryFor')} {item.schemes.map((s) => s.name).join('; ')}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-on-surface-variant dark:text-zinc-500">{t('carryNote')}</p>
    </section>
  );
};

export default WhatToCarry;
