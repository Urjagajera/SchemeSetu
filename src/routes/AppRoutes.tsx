import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import MainLayout from '../layouts/MainLayout';
import DashboardLayout from '../layouts/DashboardLayout';
import { useAuth } from '../contexts/AuthContext';

// Lazy load pages for premium performance
const Home = lazy(() => import('../pages/Home'));
const Login = lazy(() => import('../pages/Login'));
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Search = lazy(() => import('../pages/Search'));
const SchemeDetail = lazy(() => import('../pages/SchemeDetail'));
const Bookmarks = lazy(() => import('../pages/Bookmarks'));
const Compare = lazy(() => import('../pages/Compare'));
const Eligibility = lazy(() => import('../pages/Eligibility'));
const AIAssistant = lazy(() => import('../pages/AIAssistant'));
const Profile = lazy(() => import('../pages/Profile'));
const Settings = lazy(() => import('../pages/Settings'));
const Help = lazy(() => import('../pages/Help'));
const NotFound = lazy(() => import('../pages/NotFound'));

export const AppRoutes: React.FC = () => {
  const { isAuthenticated } = useAuth();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-background dark:bg-zinc-950">
          <div className="flex flex-col items-center gap-4">
            <img src="/logo.png" alt="SchemeSetu" className="h-12 w-auto animate-bounce" />
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-secondary" />
          </div>
        </div>
      }
    >
      <Routes>
        
        {/* Main Public Layout Shell */}
        <Route element={<MainLayout />}>
          
          {/* Always Public Views */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Login />} />

          {/* Conditional Protected Views */}
          {isAuthenticated ? (
            <>
              <Route path="/search" element={<Search />} />
              <Route path="/schemes/:id" element={<SchemeDetail />} />
              <Route path="/help" element={<Help />} />
              <Route path="/ai" element={<AIAssistant />} />
              <Route path="/eligibility" element={<Eligibility />} />

              {/* Secure Citizen Dashboard Layout Shell */}
              <Route element={<DashboardLayout />}>
                <Route path="/dashboard" element={<Dashboard />} />
                <Route path="/bookmarks" element={<Bookmarks />} />
                <Route path="/compare" element={<Compare />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/settings" element={<Settings />} />
              </Route>
            </>
          ) : (
            <>
              <Route path="/search" element={<Navigate to="/login?redirect=/search" replace />} />
              <Route path="/schemes/:id" element={<Navigate to="/login?redirect=/search" replace />} />
              <Route path="/help" element={<Navigate to="/login?redirect=/help" replace />} />
              <Route path="/ai" element={<Navigate to="/login?redirect=/ai" replace />} />
              <Route path="/eligibility" element={<Navigate to="/login?redirect=/eligibility" replace />} />
              <Route path="/dashboard" element={<Navigate to="/login?redirect=/dashboard" replace />} />
              <Route path="/bookmarks" element={<Navigate to="/login?redirect=/bookmarks" replace />} />
              <Route path="/compare" element={<Navigate to="/login?redirect=/compare" replace />} />
              <Route path="/profile" element={<Navigate to="/login?redirect=/profile" replace />} />
              <Route path="/settings" element={<Navigate to="/login?redirect=/settings" replace />} />
            </>
          )}

          {/* Catch-all 404 fallback */}
          <Route path="*" element={<NotFound />} />
        </Route>

      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
