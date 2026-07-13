import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Sidebar } from '../components/Sidebar';
import { useAuth } from '../contexts/AuthContext';

export const DashboardLayout: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(location.pathname + location.search), { replace: true });
    }
  }, [isAuthenticated, navigate, location]);

  if (!isAuthenticated) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[60vh]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-secondary" />
      </div>
    );
  }

  // Determine active page identifier for the sidebar selection highlight
  const getActivePageId = () => {
    const path = location.pathname;
    if (path.startsWith('/dashboard')) return 'dashboard';
    if (path.startsWith('/bookmarks')) return 'saved';
    if (path.startsWith('/compare')) return 'compare';
    if (path.startsWith('/eligibility')) return 'eligibility';
    if (path.startsWith('/ai')) return 'assistant';
    if (path.startsWith('/profile')) return 'profile';
    if (path.startsWith('/settings')) return 'settings';
    return '';
  };

  // Profile settings page disables sidebar collapse control as per Stitch design
  const isProfilePage = location.pathname === '/profile';

  return (
    <div className="flex-1 flex h-[calc(100vh-4rem)] overflow-hidden bg-background dark:bg-zinc-950 transition-colors">
      <Sidebar activePage={getActivePageId()} hideToggle={isProfilePage} />
      
      <main className="flex-1 overflow-y-auto custom-scrollbar flex flex-col justify-between">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;
