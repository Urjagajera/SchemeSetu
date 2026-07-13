import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useAuth } from '../contexts/AuthContext';
import { cn } from '../utils/cn';
import { 
  LayoutDashboard, 
  Bookmark, 
  ArrowLeftRight, 
  ClipboardCheck, 
  Bot, 
  User, 
  Settings, 
  ChevronLeft, 
  ChevronRight,
  LogOut
} from 'lucide-react';

interface SidebarProps {
  activePage?: string;
  hideToggle?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({ activePage, hideToggle = false }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    return localStorage.getItem('schemesetu_sidebar_collapsed') === 'true';
  });

  const toggleCollapse = () => {
    const newState = !collapsed;
    setCollapsed(newState);
    localStorage.setItem('schemesetu_sidebar_collapsed', String(newState));
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const menuItems = [
    { id: 'dashboard', label: t('dashboard'), path: '/dashboard', icon: LayoutDashboard },
    { id: 'saved', label: t('bookmarks'), path: '/bookmarks', icon: Bookmark },
    { id: 'compare', label: t('compare'), path: '/compare', icon: ArrowLeftRight },
    { id: 'eligibility', label: t('eligibility'), path: '/eligibility', icon: ClipboardCheck },
    { id: 'assistant', label: t('aiAssistant'), path: '/ai', icon: Bot },
    { id: 'profile', label: t('profile'), path: '/profile', icon: User },
    { id: 'settings', label: t('settings'), path: '/settings', icon: Settings }
  ];

  const isActive = (path: string, itemId: string) => {
    if (activePage) return activePage === itemId;
    return location.pathname === path;
  };

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-outline-variant bg-surface-container-low dark:bg-zinc-900 dark:border-zinc-800 transition-all duration-300 relative shrink-0",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Menu list */}
      <nav className="flex-grow py-6 px-3 space-y-1">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path, item.id);
          return (
            <Link
              key={item.id}
              to={item.path}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-bold transition-all group",
                active
                  ? "bg-secondary text-white dark:bg-sky-500 shadow-sm"
                  : "text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
              )}
            >
              <Icon className={cn("w-5 h-5 shrink-0", active ? "text-white" : "text-secondary dark:text-zinc-400")} />
              <span
                className={cn(
                  "transition-all duration-300 whitespace-nowrap overflow-hidden",
                  collapsed ? "opacity-0 w-0" : "opacity-100"
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Collapse toggle button at the bottom */}
      {!hideToggle && (
        <button
          onClick={toggleCollapse}
          className="absolute bottom-4 -right-3.5 bg-white border border-outline-variant dark:bg-zinc-850 dark:border-zinc-700 w-7 h-7 rounded-full flex items-center justify-center shadow-md text-on-surface hover:text-secondary focus:outline-none z-10"
        >
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      )}
    </aside>
  );
};

export default Sidebar;
