import React from 'react';
import { Outlet, NavLink, useLocation } from 'react-router-dom';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';
import { AIChatBubble } from '../components/AIChatBubble';
import { Home, Search, Bot, User } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from '../contexts/LanguageContext';
import { cn } from '../utils/cn';

export const MainLayout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();

  const mobileNavItems = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Search', path: '/search', icon: Search },
    { label: 'SetuAI', path: '/ai', icon: Bot },
    { label: 'Account', path: isAuthenticated ? '/dashboard' : '/login', icon: User }
  ];

  // Some pages like full-page AI chat don't need a double footer or large margins
  const isChatPage = location.pathname === '/ai';

  return (
    <div className="min-h-screen bg-background dark:bg-zinc-950 flex flex-col transition-colors pb-16 md:pb-0">
      <Navbar />
      
      <main className="flex-grow flex flex-col relative">
        <Outlet />
      </main>

      {!isChatPage && <Footer />}
      
      {/* Floating AI Chat Bubble (hidden on /ai) */}
      <AIChatBubble />

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border-t border-outline-variant dark:border-zinc-800 flex items-center justify-around z-50 px-2 transition-colors">
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const active = item.path === '/' 
            ? location.pathname === '/' 
            : location.pathname.startsWith(item.path);

          return (
            <NavLink
              key={item.label}
              to={item.path}
              className={({ isActive }) => cn(
                "flex flex-col items-center justify-center py-1 px-3 rounded-lg text-[10px] font-bold transition-all focus:outline-none",
                active 
                  ? "text-secondary dark:text-sky-400 scale-105" 
                  : "text-on-surface-variant dark:text-zinc-550 hover:text-secondary"
              )}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>
    </div>
  );
};

export default MainLayout;
