import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';

type Key = Parameters<ReturnType<typeof useTranslation>['t']>[0];

interface Section {
  heading: Key;
  paragraphs: Key[];
}

/**
 * The Privacy Policy and Terms of Service. The text is in the locale files (pv* and tm* keys) and describes only what
 * the code does. The English is a draft for the owner to read and approve; it is not legal advice.
 */
const LegalDocument: React.FC<{ title: Key; sections: Section[]; other: { to: string; label: Key } }> = ({ title, sections, other }) => {
  const { t } = useTranslation();
  return (
    <div className="flex-grow px-4 sm:px-6 lg:px-8 py-10 max-w-3xl mx-auto w-full">
      <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary dark:text-white">{t(title)}</h1>
      <p className="text-xs text-on-surface-variant dark:text-zinc-500 mt-1">{t('lgUpdated')}</p>
      <div className="mt-8 space-y-7">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="font-heading text-base font-extrabold text-primary dark:text-white mb-2">{t(s.heading)}</h2>
            {s.paragraphs.map((p) => (
              <p key={p} className="font-body text-sm text-on-surface-variant dark:text-zinc-400 leading-relaxed mb-2">
                {t(p)}
              </p>
            ))}
          </section>
        ))}
      </div>
      <p className="mt-10 text-sm">
        <Link to={other.to} className="text-secondary dark:text-sky-400 font-bold hover:underline">
          {t(other.label)}
        </Link>
      </p>
    </div>
  );
};

const PRIVACY: Section[] = [
  { heading: 'pvWhoH', paragraphs: ['pvWho'] },
  { heading: 'pvSignInH', paragraphs: ['pvSignIn'] },
  { heading: 'pvProfileH', paragraphs: ['pvProfile1', 'pvProfile2'] },
  { heading: 'pvWhyH', paragraphs: ['pvWhy'] },
  { heading: 'pvGuestH', paragraphs: ['pvGuest'] },
  { heading: 'pvCookieH', paragraphs: ['pvCookie'] },
  { heading: 'pvStoredH', paragraphs: ['pvStored'] },
  { heading: 'pvLogsH', paragraphs: ['pvLogs'] },
  { heading: 'pvThirdH', paragraphs: ['pvThird'] },
  { heading: 'pvDeleteH', paragraphs: ['pvDelete'] },
  { heading: 'pvChangeH', paragraphs: ['pvChange'] },
];

const TERMS: Section[] = [
  { heading: 'tmWhatH', paragraphs: ['tmWhat'] },
  { heading: 'tmInfoH', paragraphs: ['tmInfo'] },
  { heading: 'tmTransH', paragraphs: ['tmTrans'] },
  { heading: 'tmAiH', paragraphs: ['tmAi'] },
  { heading: 'tmAcctH', paragraphs: ['tmAcct'] },
  { heading: 'tmUseH', paragraphs: ['tmUse'] },
  { heading: 'tmChangeH', paragraphs: ['tmChange'] },
  { heading: 'tmLiabH', paragraphs: ['tmLiab'] },
  { heading: 'tmPrivH', paragraphs: ['tmPriv'] },
];

export const Privacy: React.FC = () => <LegalDocument title="lgPrivacy" sections={PRIVACY} other={{ to: '/terms', label: 'lgTerms' }} />;
export const Terms: React.FC = () => <LegalDocument title="lgTerms" sections={TERMS} other={{ to: '/privacy', label: 'lgPrivacy' }} />;

export default Privacy;
