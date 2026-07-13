import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { Shield, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const Login: React.FC = () => {
  const { loginWithGoogle, devLogin, isAuthenticated, user } = useAuth();
  const { t, language, setLanguage } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Redirect target
  const redirect = searchParams.get('redirect') || '/dashboard';

  // Toggle state
  const isRegisterPath = location.pathname === '/register';
  const [activeTab, setActiveTab] = useState<'login' | 'signup'>(isRegisterPath ? 'signup' : 'login');

  const googleButtonRef = useRef<HTMLDivElement>(null);

  // Sync tab with route path
  useEffect(() => {
    setActiveTab(isRegisterPath ? 'signup' : 'login');
  }, [location.pathname, isRegisterPath]);

  // If already authenticated, redirect immediately
  useEffect(() => {
    if (isAuthenticated) {
      navigate(redirect, { replace: true });
    }
  }, [isAuthenticated, navigate, redirect]);

  // Initialize and Render Google Sign-In Button (Simulated Google Auth client bindings)
  useEffect(() => {
    const initializeGoogleOAuth = () => {
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        const client = (window as any).google.accounts.id;
        client.initialize({
          client_id: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
          callback: async (response: any) => {
            const success = await loginWithGoogle(response.credential);
            if (success) {
              navigate(redirect);
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleButtonRef.current) {
          client.renderButton(googleButtonRef.current, {
            type: 'standard',
            shape: 'rectangular',
            theme: 'outline',
            text: 'continue_with',
            size: 'large',
            width: 320
          });
        }
      } else {
        // Retry shortly
        setTimeout(initializeGoogleOAuth, 500);
      }
    };
    initializeGoogleOAuth();
  }, [loginWithGoogle, navigate, redirect]);

  const handleDevLogin = () => {
    devLogin();
    navigate(redirect);
  };



  const signupBenefits = [
    t('check1') || 'Access 500+ central & state schemes',
    t('check2') || 'Check your scheme eligibility instantly',
    t('check3') || 'Get personalized scheme recommendations',
    t('check4') || 'Download eligibility reports'
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="flex-1 flex flex-col justify-between py-12 px-4 relative overflow-hidden"
    >
      {/* Decorative Blur Backgrounds */}
      <div className="absolute inset-0 z-0 pointer-events-none">
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary-fixed rounded-full opacity-10 -translate-y-1/2 translate-x-1/3 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary-container rounded-full opacity-10 translate-y-1/2 -translate-x-1/4 blur-2xl"></div>
      </div>

      {/* Main card box */}
      <div className="relative z-10 flex-grow flex items-center justify-center">
        <div className="w-full max-w-[420px] bg-white dark:bg-zinc-900 shadow-xl rounded-2xl border border-outline-variant dark:border-zinc-800 p-6 md:p-8 transition-colors">
          
          {/* Logo Branding */}
          <div className="flex flex-col items-center mb-8">
            <Link to="/" className="flex flex-col items-center gap-2">
              <img src="/logo.png" alt="SchemeSetu" className="h-14 w-auto mb-2" />
              <h1 className="font-heading text-xl font-extrabold tracking-tight text-primary dark:text-white">
                {t('appName')}
              </h1>
            </Link>
            <p className="font-heading text-xs font-semibold text-on-surface-variant dark:text-zinc-400 mt-1">
              {t('slogan')}
            </p>
          </div>

          {/* Login / Register Tab Toggles */}
          <div className="bg-surface-container-low dark:bg-zinc-950 p-1 rounded-xl flex mb-6 relative select-none">
            <button
              onClick={() => {
                setActiveTab('login');
                navigate('/login' + location.search);
              }}
              className={`flex-grow py-2 text-xs md:text-sm font-bold rounded-lg transition-all focus:outline-none ${
                activeTab === 'login'
                  ? 'bg-white dark:bg-zinc-800 text-secondary dark:text-sky-400 shadow-sm'
                  : 'text-on-surface-variant dark:text-zinc-500 hover:text-on-surface'
              }`}
            >
              {t('login')}
            </button>
            <button
              onClick={() => {
                setActiveTab('signup');
                navigate('/register' + location.search);
              }}
              className={`flex-grow py-2 text-xs md:text-sm font-bold rounded-lg transition-all focus:outline-none ${
                activeTab === 'signup'
                  ? 'bg-white dark:bg-zinc-800 text-secondary dark:text-sky-400 shadow-sm'
                  : 'text-on-surface-variant dark:text-zinc-500 hover:text-on-surface'
              }`}
            >
              {t('signup')}
            </button>
          </div>

          {/* Tab Views */}
          {activeTab === 'login' ? (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-heading text-lg font-bold text-primary dark:text-white">
                  {t('welcomeBack')}
                </h2>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                  {t('welcomeSub')}
                </p>
              </div>

              {/* Google Button */}
              <div className="flex justify-center min-h-[44px]">
                <div ref={googleButtonRef} id="google-signin-btn" className="w-full flex justify-center"></div>
              </div>

              <div className="relative flex items-center gap-3">
                <div className="flex-grow border-t border-outline-variant dark:border-zinc-800" />
                <span className="text-[10px] font-bold text-on-surface-variant/70 dark:text-zinc-500 bg-white dark:bg-zinc-900 px-2 uppercase">
                  secure oauth 2.0
                </span>
                <div className="flex-grow border-t border-outline-variant dark:border-zinc-800" />
              </div>

              {/* Trust Badge */}
              <div className="bg-surface-container-low dark:bg-zinc-950 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-secondary dark:text-sky-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-heading text-xs font-bold text-on-surface dark:text-white">
                    {t('secureSignIn')}
                  </p>
                  <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-450 leading-relaxed mt-0.5">
                    {t('secureSignInDesc')}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="text-center">
                <h2 className="font-heading text-lg font-bold text-primary dark:text-white">
                  {t('createAccount')}
                </h2>
                <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-1">
                  {t('joinOver')}
                </p>
              </div>

              {/* Google Button */}
              <div className="flex justify-center min-h-[44px]">
                {/* Re-use ref or placeholder. Render handles automatically */}
                <div ref={googleButtonRef} className="w-full flex justify-center"></div>
              </div>

              {/* Benefits list */}
              <div className="bg-secondary-container/10 dark:bg-zinc-950 rounded-xl p-4 space-y-2.5">
                {signupBenefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-on-surface dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="font-medium">{benefit}</span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] md:text-xs text-on-surface-variant dark:text-zinc-500 text-center leading-relaxed">
                {t('agreeTo')}{' '}
                <a href="#" className="text-secondary dark:text-sky-400 hover:underline">
                  {t('termsOfService')}
                </a>{' '}
                {t('and')}{' '}
                <a href="#" className="text-secondary dark:text-sky-400 hover:underline">
                  {t('privacyPolicy')}
                </a>.
              </p>
            </div>
          )}

          {/* Dev Bypass Section */}
          <div className="mt-8 pt-5 border-t border-outline-variant dark:border-zinc-800 text-center">
            <p className="text-[10px] font-bold font-mono text-on-surface-variant dark:text-zinc-500 mb-3 uppercase tracking-wider">
              {t('devLoginTitle')}
            </p>
            <div className="flex justify-center">
              <button
                onClick={handleDevLogin}
                className="w-full py-2.5 text-xs border border-secondary text-secondary hover:bg-secondary hover:text-white dark:border-sky-500 dark:text-sky-400 dark:hover:bg-sky-500 dark:hover:text-zinc-950 rounded-lg transition-all font-bold focus:outline-none cursor-pointer"
              >
                {t('demoUser')}
              </button>
            </div>
            <p className="text-[10px] text-on-surface-variant dark:text-zinc-500 mt-2">
              {t('removeDevMsg')}
            </p>
          </div>

        </div>
      </div>

      {/* Footer Links */}
      <footer className="relative z-10 w-full mt-12 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-on-surface-variant dark:text-zinc-500 px-4">
        <LanguageSwitcher />

        <div className="flex items-center gap-4">
          <Link to="/help" className="hover:text-secondary dark:hover:text-sky-400 transition-colors">
            {t('helpDesk')}
          </Link>
          <span className="w-1 h-1 bg-outline-variant dark:bg-zinc-800 rounded-full" />
          <a href="#" className="hover:text-secondary dark:hover:text-sky-400 transition-colors">
            {t('privacyPolicy')}
          </a>
        </div>
        
        <p className="opacity-75">{t('footerCopy')}</p>
      </footer>
    </motion.div>
  );
};

export default Login;
