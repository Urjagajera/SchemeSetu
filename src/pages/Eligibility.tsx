import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { schemeService } from '../services/schemeService';
import { eligibilityService, EligibilityReport } from '../services/eligibilityService';
import { Scheme, UserProfile } from '../types';
import { SchemeCard } from '../components/SchemeCard';
import { EligibilityCard } from '../components/EligibilityCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import Sidebar from '../components/Sidebar';
import { 
  User, 
  MapPin, 
  Wallet, 
  HelpCircle, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Lock, 
  ArrowRight,
  Info
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

export const Eligibility: React.FC = () => {
  const { t } = useTranslation();
  const { isAuthenticated, profile: loggedInProfile } = useAuth();
  const { bookmarks, toggleBookmark } = useBookmarks();

  const [loading, setLoading] = useState(false);
  const [schemes, setSchemes] = useState<Scheme[]>([]);
  const [reports, setReports] = useState<Record<string, EligibilityReport>>({});

  // Guest Wizard State
  const [step, setStep] = useState(1);
  const [guestProfile, setGuestProfile] = useState<UserProfile>({
    age: '25',
    gender: 'female',
    state: 'Uttar Pradesh',
    category: 'general',
    occupation: 'student',
    income: '200000',
    residence: 'urban',
    land: 'no',
    education: 'graduate'
  });

  const [wizardSubmitted, setWizardSubmitted] = useState(false);

  // States list for Wizard
  const states = ['Uttar Pradesh', 'Maharashtra', 'Bihar', 'Karnataka', 'Rajasthan', 'Delhi', 'Gujarat'];
  const occupations = ['student', 'farmer', 'entrepreneur', 'senior citizen', 'unemployed', 'employee', 'other'];

  // Run matching
  const evaluateEligibility = async (userProfile: UserProfile) => {
    try {
      setLoading(true);
      const matches = await schemeService.getEligibleSchemes(userProfile);
      setSchemes(matches);

      // Generate report cards for each matching scheme
      const reportMap: Record<string, EligibilityReport> = {};
      for (const scheme of matches) {
        const report = await eligibilityService.getEligibilityReport(userProfile, scheme);
        reportMap[scheme.id] = report;
      }
      setReports(reportMap);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Evaluate automatically if logged in
  useEffect(() => {
    if (isAuthenticated) {
      evaluateEligibility(loggedInProfile);
    }
  }, [isAuthenticated, loggedInProfile]);

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setWizardSubmitted(true);
    evaluateEligibility(guestProfile);
  };

  const handleInputChange = (field: keyof UserProfile, value: string) => {
    setGuestProfile(prev => ({ ...prev, [field]: value }));
  };

  if (isAuthenticated) {
    const getStateLabel = (s: string) => {
      const key = `state_${s.replace(/\s+/g, '_').toLowerCase()}`;
      return t(key as any) || s;
    };

    const getOccupationLabel = (o: string) => {
      const key = `occ_${o.replace(/\s+/g, '_').toLowerCase()}`;
      return t(key as any) || o;
    };

    return (
      <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-background dark:bg-zinc-950 transition-colors w-full">
        <Sidebar activePage="eligibility" />
        <main className="flex-1 overflow-y-auto custom-scrollbar">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto w-full space-y-6"
          >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-extrabold text-primary dark:text-white">
              {t('eligibilityResults') || `${t('eligibility')} Results`}
            </h1>
            <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-450 mt-1">
              {t('basedOnSavedProfile')}{' '}
              <Link to="/profile" className="text-secondary dark:text-sky-400 font-bold hover:underline">
                {t('profile')}
              </Link>.
            </p>
          </div>
          <Link
            to="/profile"
            className="flex items-center gap-1.5 px-4 py-2 border border-secondary text-secondary dark:border-sky-500 dark:text-sky-400 rounded-lg text-xs font-bold hover:bg-secondary/10 hover:text-secondary transition-all w-fit"
          >
            {t('updateProfileBtn')}
          </Link>
        </div>

        {/* Profile overview cards (read only) */}
        <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-5 shadow-sm transition-colors space-y-4">
          <h2 className="font-heading text-sm md:text-base font-bold text-primary dark:text-white flex items-center justify-between">
            <span>{t('profileSummary')}</span>
            <span className="bg-[#d1fadf] text-[#027a48] px-3 py-0.5 rounded-full text-[10px] font-bold">
              {t('profileComplete')}
            </span>
          </h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: t('ageLabel'), value: `${loggedInProfile.age} ${t('years') || 'yrs'}` },
              { label: t('genderLabel'), value: t(loggedInProfile.gender.toLowerCase() as any) || loggedInProfile.gender.toUpperCase() },
              { label: t('occupationLabel'), value: getOccupationLabel(loggedInProfile.occupation) },
              { label: t('incomeLabel'), value: `₹${parseInt(loggedInProfile.income).toLocaleString()}` },
              { label: t('residence') || 'Residence', value: t(loggedInProfile.residence.toLowerCase() as any) || loggedInProfile.residence },
              { label: t('stateLabel'), value: getStateLabel(loggedInProfile.state) },
              { label: t('socialCategory') || 'Social Category', value: loggedInProfile.category.toUpperCase() },
              { label: t('education') || 'Education', value: loggedInProfile.education }
            ].map((item, idx) => (
              <div key={idx} className="bg-surface-container-low dark:bg-zinc-950 p-2.5 rounded-lg text-xs">
                <p className="text-[10px] text-on-surface-variant dark:text-zinc-550 font-semibold">{item.label}</p>
                <p className="font-bold text-primary dark:text-white mt-0.5 truncate">{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Eligible schemes reports */}
        <div className="space-y-6">
          <h3 className="font-heading text-base md:text-lg font-bold text-primary dark:text-white pt-4">
            {t('availableMatches')} ({schemes.length})
          </h3>

          {loading ? (
            <LoadingSkeleton type="list" count={2} />
          ) : schemes.length > 0 ? (
            <div className="space-y-6">
              {schemes.map(s => {
                const report = reports[s.id];
                if (!report) return null;
                return (
                  <EligibilityCard
                    key={s.id}
                    report={report}
                    applyUrl={s.applyUrl}
                  />
                );
              })}
            </div>
          ) : (
            <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl max-w-md mx-auto shadow-sm">
              <p className="text-sm text-on-surface-variant dark:text-zinc-550 italic mb-4">
                {t('noMatchingSchemesFoundDetails')}
              </p>
              <Link to="/profile" className="px-5 py-2 bg-secondary text-white rounded-lg text-xs font-bold shadow-sm">
                {t('updateProfileBtn')}
              </Link>
            </div>
          )}
        </div>
      </motion.div>
    </main>
  </div>
);
}

  // ── 2. Guest Form Submitted Result View ────────────────────────────────────
  if (wizardSubmitted) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="px-4 sm:px-6 lg:px-8 py-8 max-w-4xl mx-auto w-full space-y-6"
      >
        {/* Banner prompt to sign up */}
        <div className="bg-gradient-to-r from-secondary-container/20 to-tertiary-container/20 border border-secondary/20 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-start gap-3 text-center sm:text-left">
            <Lock className="w-6 h-6 text-secondary shrink-0 mt-0.5" />
            <div>
              <h3 className="font-heading text-sm font-bold text-primary dark:text-white">Save eligibility profile?</h3>
              <p className="text-[11px] md:text-xs text-on-surface-variant dark:text-zinc-450 mt-0.5 leading-relaxed">
                Register a free account using Google OAuth to lock in your demographic profile and get auto-updates.
              </p>
            </div>
          </div>
          <Link
            to="/register"
            className="flex items-center gap-1 px-4 py-2 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded-lg text-xs font-bold shadow-sm hover:opacity-95 whitespace-nowrap active:scale-95 transition-all"
          >
            Create Account
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="flex items-center justify-between">
          <h1 className="font-display text-2xl font-extrabold text-primary dark:text-white">
            Guest Eligibility Matches
          </h1>
          <button
            onClick={() => {
              setWizardSubmitted(false);
              setStep(1);
            }}
            className="text-secondary dark:text-sky-400 font-bold hover:underline text-xs flex items-center gap-1"
          >
            <ChevronLeft className="w-4 h-4" /> Start Over
          </button>
        </div>

        {loading ? (
          <LoadingSkeleton type="list" count={2} />
        ) : schemes.length > 0 ? (
          <div className="space-y-6">
            {schemes.map(s => {
              const report = reports[s.id];
              if (!report) return null;
              return (
                <EligibilityCard
                  key={s.id}
                  report={report}
                  applyUrl={s.applyUrl}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16 bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl max-w-md mx-auto shadow-sm">
            <p className="text-sm text-on-surface-variant dark:text-zinc-550 italic mb-4">
              No matching welfare schemes found. Let's adjust criteria.
            </p>
            <button
              onClick={() => {
                setWizardSubmitted(false);
                setStep(1);
              }}
              className="px-5 py-2 bg-secondary text-white rounded-lg text-xs font-bold"
            >
              Modify Details
            </button>
          </div>
        )}
      </motion.div>
    );
  }

  // ── 3. Guest Form Multi-step Wizard View ──────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-[500px] mx-auto px-4 py-16 w-full"
    >
      <div className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-2xl p-6 md:p-8 shadow-xl space-y-6 transition-colors">
        
        {/* Wizard Title */}
        <div className="text-center space-y-1">
          <div className="w-12 h-12 bg-secondary-container/20 text-secondary dark:text-sky-400 rounded-full flex items-center justify-center mx-auto mb-2">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h1 className="font-heading text-lg md:text-xl font-bold text-primary dark:text-white">
            Find Matching Schemes
          </h1>
          <p className="text-xs text-on-surface-variant dark:text-zinc-400 max-w-xs mx-auto leading-relaxed">
            Answer a few quick questions to identify government welfare schemes tailored for you.
          </p>
        </div>

        {/* Steps Indicators */}
        <div className="flex justify-around items-center py-1 relative select-none">
          <div className="absolute top-[16px] left-[15%] right-[15%] h-[2px] bg-outline-variant dark:bg-zinc-800 -z-0" />
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs border-2 z-10 transition-all",
                step >= s
                  ? "bg-secondary text-white border-secondary dark:bg-sky-500 dark:text-zinc-950 dark:border-sky-500"
                  : "bg-white text-on-surface-variant border-outline-variant dark:bg-zinc-850 dark:border-zinc-700"
              )}
            >
              {s}
            </div>
          ))}
        </div>

        {/* Wizard Form Content */}
        <form onSubmit={handleGuestSubmit} className="space-y-6 pt-2">
          
          {/* Step 1: Personal Demographic */}
          {step === 1 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                  Enter Your Age
                </label>
                <input
                  type="number"
                  min="1"
                  max="110"
                  value={guestProfile.age}
                  onChange={(e) => handleInputChange('age', e.target.value)}
                  className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-850 dark:text-white text-sm focus:ring-secondary focus:border-secondary py-2.5 px-3"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                  Gender
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['male', 'female', 'other'].map(g => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => handleInputChange('gender', g)}
                      className={cn(
                        "py-2.5 rounded-lg border text-xs font-semibold uppercase tracking-wide focus:outline-none transition-all",
                        guestProfile.gender === g
                          ? "bg-secondary text-white border-secondary dark:bg-sky-500 dark:text-zinc-950 dark:border-sky-500 shadow-sm"
                          : "border-outline-variant text-on-surface dark:text-zinc-350 dark:border-zinc-700 dark:bg-zinc-900"
                      )}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Step 2: Financial Geography */}
          {step === 2 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                  Select Your State
                </label>
                <select
                  value={guestProfile.state}
                  onChange={(e) => handleInputChange('state', e.target.value)}
                  className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-850 dark:text-white text-sm focus:ring-secondary focus:border-secondary py-2.5 px-3"
                >
                  {states.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                  Select Your Occupation
                </label>
                <select
                  value={guestProfile.occupation}
                  onChange={(e) => handleInputChange('occupation', e.target.value)}
                  className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-850 dark:text-white text-sm focus:ring-secondary focus:border-secondary py-2.5 px-3"
                >
                  {occupations.map(o => (
                    <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                  Declared Annual Income (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10000000"
                  step="10000"
                  value={guestProfile.income}
                  onChange={(e) => handleInputChange('income', e.target.value)}
                  className="w-full rounded-lg border-outline-variant dark:border-zinc-750 dark:bg-zinc-850 dark:text-white text-sm focus:ring-secondary focus:border-secondary py-2.5 px-3"
                  required
                />
              </div>
            </motion.div>
          )}

          {/* Step 3: Specific parameters */}
          {step === 3 && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="space-y-4"
            >
              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                  Social Category
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {['general', 'sc', 'st', 'obc'].map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleInputChange('category', cat)}
                      className={cn(
                        "py-2 rounded border text-[10px] font-bold uppercase tracking-wider focus:outline-none transition-all",
                        guestProfile.category === cat
                          ? "bg-secondary text-white border-secondary dark:bg-sky-500 dark:text-zinc-950 dark:border-sky-500"
                          : "border-outline-variant text-on-surface dark:text-zinc-300 dark:border-zinc-700"
                      )}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                  Residence Area
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['rural', 'urban'].map(res => (
                    <button
                      key={res}
                      type="button"
                      onClick={() => handleInputChange('residence', res)}
                      className={cn(
                        "py-2 rounded border text-xs font-bold uppercase tracking-wide focus:outline-none transition-all",
                        guestProfile.residence === res
                          ? "bg-secondary text-white border-secondary dark:bg-sky-500 dark:text-zinc-950 dark:border-sky-500"
                          : "border-outline-variant text-on-surface dark:text-zinc-300 dark:border-zinc-700"
                      )}
                    >
                      {res}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold uppercase tracking-wider text-on-surface-variant dark:text-zinc-500">
                  Own Cultivable Land?
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {['yes', 'no'].map(l => (
                    <button
                      key={l}
                      type="button"
                      onClick={() => handleInputChange('land', l)}
                      className={cn(
                        "py-2 rounded border text-xs font-bold uppercase tracking-wide focus:outline-none transition-all",
                        guestProfile.land === l
                          ? "bg-secondary text-white border-secondary dark:bg-sky-500 dark:text-zinc-950 dark:border-sky-500"
                          : "border-outline-variant text-on-surface dark:text-zinc-300 dark:border-zinc-700"
                      )}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-outline-variant dark:border-zinc-800">
            {step > 1 ? (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="flex items-center gap-1 text-on-surface-variant hover:text-on-surface font-semibold text-xs md:text-sm focus:outline-none"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
            ) : (
              <div />
            )}

            {step < 3 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                className="flex items-center gap-1 px-5 py-2 bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded-lg text-xs md:text-sm font-bold shadow-sm hover:opacity-90 active:scale-95 transition-all focus:outline-none"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="submit"
                className="px-6 py-2 bg-primary hover:bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 rounded-lg text-xs md:text-sm font-bold shadow-md active:scale-95 transition-all focus:outline-none"
              >
                Find Schemes
              </button>
            )}
          </div>

        </form>

      </div>
    </motion.div>
  );
};

export default Eligibility;
