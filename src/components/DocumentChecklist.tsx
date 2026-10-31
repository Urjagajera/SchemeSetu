import React, { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { checklistService, ChecklistTicks } from '../services/checklistService';
import { kindsInLine, isHeadingLine, isFillerLine } from '../utils/documentKinds';
import { loginPath } from '../utils/loginPath';
import { cn } from '../utils/cn';

interface DocumentChecklistProps {
  schemeId: string;
  /** The scheme's own (English) document lines: ticks are saved against these. */
  lines: string[];
  /** The lines as the page shows them (translated, or English). Used only when they line up one to one. */
  shown: string[];
}

const EMPTY: ChecklistTicks = { checked: [], unchecked: [] };

/**
 * A scheme's document list with a tick box per document. Lines that mention a document the person keeps under
 * "My documents" come up ticked (and say so) until they untick them. Headings and catch-all lines ("Any other
 * documents as required") are shown but not counted. Signed-in ticks are saved; a guest's last until they leave.
 */
export const DocumentChecklist: React.FC<DocumentChecklistProps> = ({ schemeId, lines, shown }) => {
  const { t } = useTranslation();
  const { isAuthenticated, profile } = useAuth();
  const location = useLocation();
  const [ticks, setTicks] = useState<ChecklistTicks>(EMPTY);
  const [saveFailed, setSaveFailed] = useState(false);

  useEffect(() => {
    setTicks(EMPTY);
    setSaveFailed(false);
    if (!isAuthenticated) return;
    let cancelled = false;
    checklistService.get(schemeId).then(
      (saved) => { if (!cancelled) setTicks(saved); },
      () => { /* nothing saved yet, or the server is away: start empty */ },
    );
    return () => { cancelled = true; };
  }, [schemeId, isAuthenticated]);

  const held = profile?.documentsHeld ?? [];
  const label = (i: number) => (shown.length === lines.length ? shown[i] : lines[i]);
  const matched = (line: string) => kindsInLine(line).some((k) => held.includes(k));
  const isTicked = (line: string) => ticks.checked.includes(line) || (matched(line) && !ticks.unchecked.includes(line));
  const isDocument = (line: string) => !isHeadingLine(line) && !isFillerLine(line);

  const documents = [...new Set(lines.filter(isDocument))];
  const done = documents.filter(isTicked).length;

  const toggle = (line: string) => {
    const without = (list: string[]) => list.filter((l) => l !== line);
    let next: ChecklistTicks;
    if (isTicked(line)) {
      next = { checked: without(ticks.checked), unchecked: matched(line) ? [...without(ticks.unchecked), line] : without(ticks.unchecked) };
    } else {
      next = { checked: matched(line) ? without(ticks.checked) : [...without(ticks.checked), line], unchecked: without(ticks.unchecked) };
    }
    const before = ticks;
    setTicks(next);
    setSaveFailed(false);
    if (isAuthenticated) {
      checklistService.save(schemeId, next).catch(() => {
        setTicks(before);
        setSaveFailed(true);
      });
    }
  };

  return (
    <div className="space-y-3">
      <p data-testid="docs-ready" className="text-xs md:text-sm font-bold text-primary dark:text-white" aria-live="polite">
        {t('docsReady').replace('{done}', String(done)).replace('{total}', String(documents.length))}
      </p>

      <ul className="space-y-2">
        {lines.map((line, i) => {
          const text = label(i);
          if (!isDocument(line)) {
            return (
              <li key={i} className={cn('font-body text-xs md:text-sm leading-relaxed whitespace-pre-line break-words', isHeadingLine(line) ? 'font-bold text-on-surface dark:text-zinc-200 pt-1' : 'text-on-surface-variant dark:text-zinc-400 pl-7')}>
                {text}
              </li>
            );
          }
          const ticked = isTicked(line);
          const auto = ticked && !ticks.checked.includes(line);
          const id = `doc-${schemeId}-${i}`;
          return (
            <li key={i} className="flex items-start gap-2.5">
              <input
                id={id}
                type="checkbox"
                checked={ticked}
                onChange={() => toggle(line)}
                aria-describedby={auto ? `${id}-auto` : undefined}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-outline-variant text-secondary focus:ring-secondary dark:border-zinc-600 dark:bg-zinc-800"
              />
              <label htmlFor={id} className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 leading-relaxed whitespace-pre-line break-words cursor-pointer">
                {text}
                {auto && (
                  <span id={`${id}-auto`} className="block text-xs font-semibold text-green-700 dark:text-green-400">
                    {t('docsYouHaveThis')}
                  </span>
                )}
              </label>
            </li>
          );
        })}
      </ul>

      {saveFailed && (
        <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">{t('docsSaveFailed')}</p>
      )}
      {!isAuthenticated && (
        <p className="print:hidden text-xs text-on-surface-variant dark:text-zinc-500">
          <Link to={loginPath(location.pathname, location.search)} className="font-bold text-secondary dark:text-sky-400 hover:underline">
            {t('docsLoginToSave')}
          </Link>
        </p>
      )}
      {isAuthenticated && held.length === 0 && (
        <p className="print:hidden text-xs text-on-surface-variant dark:text-zinc-500">
          <Link to="/profile?section=documents" className="font-bold text-secondary dark:text-sky-400 hover:underline">
            {t('docsSetUp')}
          </Link>
        </p>
      )}

      {/* On paper: what is still to gather, after the list itself */}
      {done < documents.length && (
        <div data-testid="docs-missing-print" className="hidden print:block pt-2">
          <p className="font-bold text-sm">{t('docsMissingPrint')}</p>
          <ul className="list-disc pl-5 text-sm">
            {lines.map((line, i) => (isDocument(line) && !isTicked(line) ? <li key={i}>{label(i)}</li> : null))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DocumentChecklist;
