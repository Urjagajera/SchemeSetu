import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { LanguageSwitcher } from './LanguageSwitcher';
import { ThemeToggle } from './ThemeProvider';
import { LogOut, User, Menu, X, BookOpen, Compass, HelpCircle, Bot, LayoutDashboard } from 'lucide-react';
import { useState } from 'react';

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const isActive = (path: string) => {
    if (path === '/' && location.pathname !== '/') return false;
    return location.pathname.startsWith(path);
  };

  const isLandingPage = location.pathname === '/';

  const navLinks = isLandingPage ? [] : [
    { name: t('searchBtn'), path: '/search', icon: BookOpen },
    { name: t('aiAssistant'), path: '/ai', icon: Bot },
    { name: t('helpDesk'), path: '/help', icon: HelpCircle }
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-outline-variant bg-white/80 backdrop-blur-md dark:bg-zinc-900/80 dark:border-zinc-800 transition-colors">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <img src="/logo.png" alt="SchemeSetu" className="h-9 w-auto" />
          <span className="font-heading text-lg font-extrabold tracking-tight text-primary dark:text-white">
            {t('appName')}
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const active = isActive(link.path);
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-1.5 text-sm font-semibold transition-colors py-1 border-b-2 ${
                  active
                    ? 'border-secondary text-secondary dark:text-sky-400 dark:border-sky-400'
                    : 'border-transparent text-on-surface-variant hover:text-secondary dark:text-zinc-400 dark:hover:text-white'
                }`}
              >
                <Icon className="w-4 h-4" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Right Action Menu */}
        <div className="hidden md:flex items-center gap-3">
          <LanguageSwitcher />
          <ThemeToggle />

          {isAuthenticated ? (
            <div className="flex items-center gap-3 pl-2 border-l border-outline-variant dark:border-zinc-800">
              <Link
                to="/dashboard"
                className="flex items-center gap-2 hover:opacity-90 transition-opacity"
              >
                {user?.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="h-8 w-8 rounded-full border border-secondary"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-white font-bold text-sm">
                    {user?.name?.charAt(0).toUpperCase()}
                  </div>
                )}
                <span className="text-sm font-bold text-primary dark:text-white max-w-[120px] truncate">
                  {user?.name.split(' ')[0]}
                </span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-on-surface-variant hover:text-error dark:text-zinc-400 dark:hover:text-red-400 transition-colors"
                title={t('logout')}
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          ) : (
            <Link
              to="/login"
              className="ml-2 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-white hover:bg-secondary transition-all shadow-sm active:scale-95"
            >
              {t('login')}
            </Link>
          )}
        </div>

        {/* Mobile Hamburger Control (for non-nav links like Lang & Theme toggles) */}
        <div className="flex md:hidden items-center gap-2">
          <ThemeToggle />
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-on-surface-variant dark:text-zinc-400 focus:outline-none"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

      </div>

      {/* Mobile Drawer (Only shown when open) */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-outline-variant bg-white dark:bg-zinc-900 dark:border-zinc-800 p-4 space-y-4 transition-all">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-bold ${
                  isActive(link.path)
                    ? 'bg-secondary-container/20 text-secondary dark:bg-zinc-800'
                    : 'text-on-surface-variant hover:bg-surface-container-low dark:text-zinc-400 dark:hover:bg-zinc-800'
                }`}
              >
                <link.icon className="w-5 h-5" />
                {link.name}
              </Link>
            ))}
          </div>

          <div className="pt-4 border-t border-outline-variant dark:border-zinc-800 flex flex-col gap-3">
            <div className="flex justify-between items-center px-3">
              <span className="text-sm font-medium text-on-surface-variant dark:text-zinc-400">Language</span>
              <LanguageSwitcher />
            </div>

            {isAuthenticated ? (
              <div className="space-y-2">
                <Link
                  to="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-2 text-sm font-bold text-on-surface dark:text-white"
                >
                  <User className="w-5 h-5 text-secondary" />
                  {t('dashboard')} ({user?.name})
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm font-bold text-error text-left"
                >
                  <LogOut className="w-5 h-5" />
                  {t('logout')}
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-center block rounded-lg bg-primary py-2.5 text-sm font-bold text-white hover:bg-secondary"
              >
                {t('login')}
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Navbar;
