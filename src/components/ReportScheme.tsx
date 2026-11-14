import React, { useState } from 'react';
import { Flag, Check } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { REPORT_REASONS, MAX_REPORT_MESSAGE, ReportReason, reportService } from '../services/reportService';

/** "Report a problem with this scheme": a short form under the scheme's actions. Sent anonymously. */
export const ReportScheme: React.FC<{ schemeId: string }> = ({ schemeId }) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<ReportReason | null>(null);
  const [message, setMessage] = useState('');
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'failed'>('idle');

  const reasonLabel = (r: ReportReason) => t(`rpReason_${r}` as Parameters<typeof t>[0]);

  if (state === 'sent') {
    return (
      <p role="status" className="flex items-start gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
        <Check className="w-4 h-4 shrink-0" />
        {t('rpThanks')}
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-on-surface-variant dark:text-zinc-400 hover:text-secondary dark:hover:text-sky-400 focus:outline-none"
      >
        <Flag className="w-3.5 h-3.5" />
        {t('rpButton')}
      </button>
    );
  }

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason) return;
    setState('sending');
    try {
      await reportService.send(schemeId, reason, message);
      setState('sent');
    } catch {
      setState('failed');
    }
  };

  return (
    <form onSubmit={send} className="space-y-3 border-t border-outline-variant dark:border-zinc-800 pt-4" aria-labelledby="report-title">
      <h3 id="report-title" className="text-sm font-bold text-primary dark:text-white">
        {t('rpButton')}
      </h3>
      <fieldset className="space-y-1.5">
        <legend className="text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mb-1">{t('rpReasonHeading')}</legend>
        {REPORT_REASONS.map((r) => (
          <label key={r} className="flex items-center gap-2 text-xs text-on-surface dark:text-zinc-200 cursor-pointer">
            <input type="radio" name="report-reason" value={r} checked={reason === r} onChange={() => setReason(r)} className="accent-secondary" />
            {reasonLabel(r)}
          </label>
        ))}
      </fieldset>
      <label className="block space-y-1">
        <span className="text-xs font-semibold text-on-surface-variant dark:text-zinc-400">{t('rpNote')}</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value.slice(0, MAX_REPORT_MESSAGE))}
          rows={3}
          maxLength={MAX_REPORT_MESSAGE}
          className="w-full rounded-lg border border-outline-variant dark:border-zinc-700 bg-white dark:bg-zinc-950 p-2 text-xs text-on-surface dark:text-zinc-100"
        />
        <span className="block text-xs text-on-surface-variant dark:text-zinc-500">{t('rpNoteHint')}</span>
      </label>
      {state === 'failed' && (
        <p role="alert" className="text-xs text-red-600 dark:text-red-400">
          {t('rpFailed')}
        </p>
      )}
      <div className="flex gap-2 justify-end">
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setState('idle');
          }}
          className="px-3 py-1.5 rounded-lg border border-outline-variant dark:border-zinc-700 text-xs font-bold text-on-surface-variant dark:text-zinc-300"
        >
          {t('rpCancel')}
        </button>
        <button
          type="submit"
          disabled={!reason || state === 'sending'}
          className="px-3 py-1.5 rounded-lg bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 text-xs font-bold disabled:opacity-40"
        >
          {t('rpSend')}
        </button>
      </div>
    </form>
  );
};

export default ReportScheme;
