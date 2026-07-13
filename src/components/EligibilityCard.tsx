import React from 'react';
import { EligibilityReport } from '../services/eligibilityService';
import { CheckCircle2, AlertTriangle, HelpCircle, ExternalLink } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { cn } from '../utils/cn';

interface EligibilityCardProps {
  report: EligibilityReport;
  applyUrl: string;
  className?: string;
}

export const EligibilityCard: React.FC<EligibilityCardProps> = ({ report, applyUrl, className }) => {
  const { t } = useTranslation();

  const getPercentageColor = (pct: number) => {
    if (pct === 100) return 'text-green-600 border-green-200 bg-green-50 dark:bg-green-950/20 dark:text-green-400';
    if (pct >= 50) return 'text-amber-600 border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:text-amber-400';
    return 'text-red-600 border-red-200 bg-red-50 dark:bg-red-950/20 dark:text-red-400';
  };

  return (
    <div className={cn(
      "bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-6 transition-colors",
      className
    )}>
      {/* Header with Match Percentage */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-4 border-b border-outline-variant dark:border-zinc-800">
        <div>
          <h3 className="font-heading text-lg font-bold text-primary dark:text-white">
            {report.schemeTitle}
          </h3>
          <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
            Detailed criteria analysis based on your demographic profile.
          </p>
        </div>
        
        {/* Match Percentage Dial */}
        <div className={cn(
          "px-4 py-2 border rounded-full font-display text-base font-extrabold flex items-center gap-1.5 whitespace-nowrap",
          getPercentageColor(report.overallMatch)
        )}>
          <span>{t('overallMatch')}:</span>
          <span>{report.overallMatch}%</span>
        </div>
      </div>

      {/* Passed and Failed Requirements Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* Passed Criteria */}
        <div className="space-y-3">
          <h4 className="font-heading text-sm font-bold text-green-700 dark:text-green-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4" />
            Verified Criteria ({report.passedCriteria.length})
          </h4>
          {report.passedCriteria.length > 0 ? (
            <ul className="space-y-2">
              {report.passedCriteria.map((c, i) => (
                <li key={i} className="text-xs md:text-sm text-on-surface dark:text-zinc-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs md:text-sm text-on-surface-variant dark:text-zinc-550 italic">None of the criteria matched.</p>
          )}
        </div>

        {/* Failed / Unmet Criteria */}
        <div className="space-y-3">
          <h4 className="font-heading text-sm font-bold text-red-700 dark:text-red-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4" />
            {t('missingRequirements')} ({report.failedCriteria.length})
          </h4>
          {report.failedCriteria.length > 0 ? (
            <ul className="space-y-2">
              {report.failedCriteria.map((c, i) => (
                <li key={i} className="text-xs md:text-sm text-on-surface dark:text-zinc-300 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0" />
                  {c}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs md:text-sm text-green-700 dark:text-green-400 italic">No missing requirements. You are fully eligible!</p>
          )}
        </div>

      </div>

      {/* Explanations & Suggestions */}
      {(report.reasons.length > 0 || report.suggestions.length > 0) && (
        <div className="pt-4 border-t border-outline-variant dark:border-zinc-800 space-y-4">
          
          {/* Reasons */}
          {report.reasons.length > 0 && (
            <div className="space-y-1.5">
              <h5 className="font-heading text-xs font-bold uppercase text-on-surface-variant dark:text-zinc-500 tracking-wider">
                {t('reasons')}
              </h5>
              <ul className="list-disc list-inside space-y-1 pl-1">
                {report.reasons.map((r, i) => (
                  <li key={i} className="text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 leading-relaxed">
                    {r}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {report.suggestions.length > 0 && (
            <div className="space-y-1.5">
              <h5 className="font-heading text-xs font-bold uppercase text-on-surface-variant dark:text-zinc-500 tracking-wider">
                {t('suggestions')}
              </h5>
              <ul className="list-disc list-inside space-y-1 pl-1">
                {report.suggestions.map((s, i) => (
                  <li key={i} className="text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 leading-relaxed">
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>
      )}

      {/* CTA Button */}
      <div className="pt-4 flex justify-end">
        <a
          href={applyUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1.5 px-6 py-2.5 bg-secondary text-white dark:bg-sky-500 rounded-lg text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all"
        >
          <ExternalLink className="w-4 h-4" />
          {t('applyBtn')}
        </a>
      </div>

    </div>
  );
};

export default EligibilityCard;
