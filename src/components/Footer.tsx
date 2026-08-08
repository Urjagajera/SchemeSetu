import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const isLandingPage = location.pathname === '/';

  const getLinkPath = (originalPath: string) => {
    return isLandingPage ? '/login' : originalPath;
  };

  return (
    <footer className="w-full border-t border-outline-variant bg-white dark:bg-zinc-950 dark:border-zinc-800 py-16 px-4 sm:px-6 lg:px-8 mt-auto transition-colors">
      <div className="mx-auto max-w-7xl">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Column 1: Branding & Description */}
          <div className="flex flex-col gap-4">
            <Link to={getLinkPath('/')} className="flex items-center gap-2">
              <img src="/logo.png" alt="SchemeSetu" className="h-8 w-auto" />
              <span className="font-heading text-base font-extrabold tracking-tight text-primary dark:text-white">
                {t('appName')}
              </span>
            </Link>
            <p className="text-xs text-on-surface-variant dark:text-zinc-400 leading-relaxed">
              Empowering citizens through instant discovery, eligibility check, and seamless application for central and state government schemes.
            </p>
          </div>

          {/* Column 2: Explore */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary dark:text-white">
              Explore
            </h4>
            <div className="flex flex-col gap-2">
              <Link to={getLinkPath('/search')} className="text-xs text-on-surface-variant hover:text-secondary dark:text-zinc-400 dark:hover:text-sky-400 transition-colors">
                All Government Schemes
              </Link>
              <Link to={getLinkPath('/ai')} className="text-xs text-on-surface-variant hover:text-secondary dark:text-zinc-400 dark:hover:text-sky-400 transition-colors">
                AI Assistant (SetuAI)
              </Link>
              <Link to={getLinkPath('/eligibility')} className="text-xs text-on-surface-variant hover:text-secondary dark:text-zinc-400 dark:hover:text-sky-400 transition-colors">
                Eligibility Checker
              </Link>
            </div>
          </div>

          {/* Column 3: Support & Legal */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary dark:text-white">
              Support & Legal
            </h4>
            <div className="flex flex-col gap-2">
              <Link to={getLinkPath('/help')} className="text-xs text-on-surface-variant hover:text-secondary dark:text-zinc-400 dark:hover:text-sky-400 transition-colors">
                {t('helpDesk')}
              </Link>
              <Link to={getLinkPath('/privacy')} className="text-xs text-on-surface-variant hover:text-secondary dark:text-zinc-400 dark:hover:text-sky-400 transition-colors">
                {t('privacyPolicy')}
              </Link>
              <Link to={getLinkPath('/terms')} className="text-xs text-on-surface-variant hover:text-secondary dark:text-zinc-400 dark:hover:text-sky-400 transition-colors">
                {t('termsOfService')}
              </Link>
            </div>
          </div>

          {/* Column 4: Contact */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-primary dark:text-white">
              Contact Us
            </h4>
            <div className="flex flex-col gap-2 text-xs text-on-surface-variant dark:text-zinc-400 leading-relaxed">
              <p>Email: <a href="mailto:support@schemesetu.gov.in" className="hover:underline text-secondary dark:text-sky-400">support@schemesetu.gov.in</a></p>
              <p>Toll-Free Support: 1800-123-4567</p>
              <p>National Portal Division, New Delhi</p>
            </div>
          </div>

        </div>

        {/* Bottom copyright */}
        <div className="pt-8 border-t border-outline-variant dark:border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-xs text-on-surface-variant dark:text-zinc-500 text-center md:text-left">
            {t('footerCopy')}
          </div>
          <div className="text-[10px] text-on-surface-variant/70 dark:text-zinc-550 text-center">
            Disclaimer: SchemeSetu is an independent portal for mock discovery and eligibility check.
          </div>
        </div>

      </div>
    </footer>
  );
};

export default Footer;
