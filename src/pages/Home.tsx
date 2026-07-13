import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { schemeService } from '../services/schemeService';
import { Scheme } from '../types';
import { Hero } from '../components/Hero';
import { StatCard } from '../components/StatCard';
import { CategoryCard } from '../components/CategoryCard';
import { SchemeCard } from '../components/SchemeCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Compass, FileCheck2, Send, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const [featuredSchemes, setFeaturedSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const schemes = await schemeService.getFeaturedSchemes();
        setFeaturedSchemes(schemes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadFeatured();
  }, []);

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      alert('Thank you! You have been subscribed.');
      setEmail('');
    }
  };

  const categories = [
    { icon: 'school', label: t('scholarships'), value: 'Education' },
    { icon: 'medical_services', label: t('healthInsurance'), value: 'Healthcare' },
    { icon: 'agriculture', label: t('farmerLoans'), value: 'Agriculture' },
    { icon: 'home', label: t('housing'), value: 'Housing' },
    { icon: 'work', label: t('employment'), value: 'Employment' },
    { icon: 'family_restroom', label: t('womenAndChild'), value: 'Women & Child' },
    { icon: 'elderly', label: t('seniorCitizens'), value: 'Senior Citizens' }
  ];

  const steps = [
    { icon: Compass, title: t('step1Title'), desc: t('step1Desc') },
    { icon: FileCheck2, title: t('step2Title'), desc: t('step2Desc') },
    { icon: Send, title: t('step3Title'), desc: t('step3Desc') }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-grow flex flex-col"
    >
      <Hero />

      {/* Stats Bar */}
      <section className="bg-surface-container-lowest dark:bg-zinc-900 border-b border-outline-variant dark:border-zinc-800 py-8 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard value="500+" label={t('activeSchemes')} />
            <StatCard value="28" label={t('statesCovered')} />
            <StatCard value="9.8 Cr+" label={t('beneficiaries')} />
            <StatCard value="₹2.4L Cr" label={t('disbursed')} />
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <h2 className="font-heading text-xl md:text-2xl font-extrabold text-primary dark:text-white">
              {t('exploreCategory')}
            </h2>
            <p className="font-body text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
              {t('exploreSub')}
            </p>
          </div>
          <button
            onClick={() => navigate('/search')}
            className="text-secondary dark:text-sky-400 font-bold flex items-center gap-1 hover:underline text-sm focus:outline-none"
          >
            {t('viewAllSchemes')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-4">
          {categories.map((cat) => (
            <CategoryCard
              key={cat.value}
              iconName={cat.icon}
              label={cat.label}
              categoryValue={cat.value}
            />
          ))}
        </div>
      </section>

      {/* Featured Schemes */}
      <section className="py-20 bg-surface-container-lowest dark:bg-zinc-900/40 border-y border-outline-variant dark:border-zinc-850/50 w-full transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
            <div>
              <h2 className="font-heading text-xl md:text-2xl font-extrabold text-primary dark:text-white">
                {t('featuredSchemes')}
              </h2>
              <p className="font-body text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
                {t('featuredSub')}
              </p>
            </div>
            <button
              onClick={() => navigate('/search')}
              className="text-secondary dark:text-sky-400 font-bold flex items-center gap-1 hover:underline text-sm focus:outline-none"
            >
              {t('browseCatalog')}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {loading ? (
            <LoadingSkeleton count={3} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {featuredSchemes.map((scheme) => (
                <SchemeCard
                  key={scheme.id}
                  scheme={scheme}
                  isBookmarked={bookmarks.includes(scheme.id)}
                  onToggleBookmark={() => toggleBookmark(scheme.id)}
                />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* How it Works */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
        <h2 className="font-heading text-xl md:text-3xl font-extrabold text-primary dark:text-white mb-3">
          {t('howItWorks')}
        </h2>
        <p className="font-body text-sm md:text-base text-on-surface-variant dark:text-zinc-400 mb-16 max-w-xl mx-auto">
          {t('howItWorksSub')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative max-w-5xl mx-auto">
          {/* Connector Line */}
          <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-outline-variant dark:bg-zinc-800 -z-10" />

          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 flex items-center justify-center mb-6 shadow-md border-4 border-white dark:border-zinc-950">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-base md:text-lg font-bold text-primary dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-450 leading-relaxed max-w-[250px]">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate('/eligibility')}
          className="mt-16 bg-primary hover:bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 dark:hover:opacity-90 px-8 py-3.5 rounded-lg font-heading text-sm md:text-base font-bold shadow-md active:scale-95 transition-all focus:outline-none"
        >
          {t('findForMeBtn')}
        </button>
      </section>

      {/* Newsletter */}
      <section className="bg-primary-container dark:bg-zinc-900 border-t border-outline-variant dark:border-zinc-800 py-16 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="max-w-lg text-center md:text-left">
            <h2 className="font-heading text-lg md:text-xl font-bold text-white mb-1.5">
              {t('newsletterTitle')}
            </h2>
            <p className="font-body text-xs md:text-sm text-sky-200 dark:text-zinc-400">
              {t('newsletterSub')}
            </p>
          </div>
          <form onSubmit={handleSubscribe} className="flex w-full md:w-auto gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="bg-white/10 border-white/20 text-white placeholder:text-white/50 rounded-lg px-4 py-2.5 w-full md:w-72 focus:bg-white focus:text-primary focus:outline-none transition-all border outline-none text-sm"
              placeholder={t('newsletterEmail')}
            />
            <button
              type="submit"
              className="bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 px-6 py-2.5 rounded-lg text-sm font-bold hover:opacity-90 transition-colors whitespace-nowrap focus:outline-none"
            >
              {t('joinNowBtn')}
            </button>
          </form>
        </div>
      </section>
    </motion.div>
  );
};

export default Home;
