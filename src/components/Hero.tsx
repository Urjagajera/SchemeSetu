import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { SearchBar } from './SearchBar';

export const Hero: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleSearch = (query: string) => {
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    } else {
      navigate('/search');
    }
  };

  const popularTags = [
    { label: t('scholarships'), path: '/search?category=Education' },
    { label: t('pensions'), path: '/search?category=Senior Citizens' },
    { label: t('farmerLoans'), path: '/search?category=Agriculture' },
    { label: t('healthInsurance'), path: '/search?category=Healthcare' }
  ];

  return (
    <section className="relative overflow-hidden pt-20 pb-32 bg-primary dark:bg-zinc-950 transition-colors">
      {/* Decorative Background Patterns */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-sky-400 rounded-full -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-green-400 rounded-full translate-y-1/2 -translate-x-1/4 blur-2xl"></div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        {/* Info Badge */}
        <div className="inline-flex items-center gap-2 bg-white/10 dark:bg-zinc-800/50 text-white/95 px-4 py-2 rounded-full mb-6 font-small text-xs md:text-sm border border-white/20">
          <img src="/logo.png" alt="SchemeSetu" className="h-5 w-auto" />
          {t('heroBadge')}
        </div>

        {/* Headline */}
        <h1 className="font-display text-3xl md:text-5xl lg:text-6xl text-white font-extrabold tracking-tight mb-6 max-w-4xl mx-auto leading-tight">
          {t('heroTitle')}
        </h1>

        {/* Subtitle */}
        <p className="font-body text-sm md:text-lg text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
          {t('heroSubtitle')}
        </p>

        {/* Centered Search Bar */}
        <div className="max-w-2xl mx-auto mb-6">
          <SearchBar onSearch={handleSearch} />
        </div>

        {/* Popular Tags */}
        <div className="flex flex-wrap justify-center items-center gap-2 text-white/95 text-xs md:text-sm">
          <span className="font-medium text-white/60">{t('popularTags')}</span>
          {popularTags.map((tag, idx) => (
            <React.Fragment key={tag.label}>
              <button
                onClick={() => navigate(tag.path)}
                className="underline hover:text-white transition-colors focus:outline-none"
              >
                {tag.label}
              </button>
              {idx < popularTags.length - 1 && <span className="text-white/40">•</span>}
            </React.Fragment>
          ))}
        </div>

      </div>
    </section>
  );
};

export default Hero;
