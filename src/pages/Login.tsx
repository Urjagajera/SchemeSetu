import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { Shield, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const Login: React.FC = () => {
  const { loginWithGoogle, isAuthenticated, user } = useAuth();
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
  // True once client.renderButton() has actually been called. Guards against
  // React StrictMode's dev-only double-invoke of the effect below re-issuing a
  // second renderButton() call before the first one's iframe finishes its own
  // async insertion — confirmed live that without this, two stacked "Continue
  // with Google" buttons could end up in the same container.
  const hasRenderedButtonRef = useRef(false);

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

  // Initialize and render the real Google Identity Services button exactly
  // once. The container div below is intentionally rendered in ONE fixed
  // location shared by both the login and signup tab views (not inside the
  // per-tab ternary) so it never unmounts when switching tabs — Google's
  // renderButton() doesn't necessarily nest its iframe as a plain child of the
  // given container (it appears to position it independently), so clearing
  // and re-rendering into a freshly-mounted container on every tab switch left
  // the previous tab's iframe stranded in the live DOM with no way to remove
  // it from here, producing two visible buttons after one tab switch —
  // confirmed live via screenshot. Rendering once into a container that's
  // always mounted avoids the problem entirely instead of trying to clean up
  // after it.
  useEffect(() => {
    let cancelled = false;
    const initializeGoogleOAuth = () => {
      if (cancelled || hasRenderedButtonRef.current) return;
      if (typeof window !== 'undefined' && (window as any).google?.accounts?.id) {
        const client = (window as any).google.accounts.id;
        client.initialize({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          callback: async (response: any) => {
            const res = await loginWithGoogle(response.credential);
            if (res.success) {
              if (res.isNewUser) {
                navigate('/profile');
              } else {
                navigate(redirect);
              }
            }
          },
          auto_select: false,
          cancel_on_tap_outside: true,
        });

        if (googleButtonRef.current && !hasRenderedButtonRef.current) {
          hasRenderedButtonRef.current = true;
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
    return () => {
      cancelled = true;
    };
  }, [loginWithGoogle, navigate, redirect]);

  const signupBenefits = [
    t('check1'),
    t('check2'),
    t('check3'),
    t('check4')
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

          <div className="relative flex items-center gap-3">
            <div className="flex-grow border-t border-outline-variant dark:border-zinc-800" />
            <span className="text-[10px] font-bold text-on-surface-variant/70 dark:text-zinc-500 bg-white dark:bg-zinc-900 px-2 uppercase">
              secure oauth 2.0
            </span>
            <div className="flex-grow border-t border-outline-variant dark:border-zinc-800" />
          </div>

          {/* Google Identity Services renders its button here once, shared by both
              tabs below so it never unmounts on tab switch (see the effect above). */}
          <div ref={googleButtonRef} className="flex justify-center my-6" />

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

              {/* Benefits list */}
              <div className="bg-secondary-container/10 dark:bg-zinc-950 rounded-xl p-4 space-y-2.5">
                {signupBenefits.map((benefit, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-on-surface dark:text-zinc-300">
                    <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                    <span className="font-medium">{benefit}</span>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>
      </div>

      {/* Footer Links */}
      <footer className="relative z-10 w-full mt-12 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-semibold text-on-surface-variant dark:text-zinc-500 px-4">
        <LanguageSwitcher />

        <div className="flex items-center gap-4">
          <Link to="/help" className="hover:text-secondary dark:hover:text-sky-400 transition-colors">
            {t('helpDesk')}
          </Link>
        </div>
        
        <p className="opacity-75">{t('footerCopy')}</p>
      </footer>
    </motion.div>
  );
};

export default Login;
