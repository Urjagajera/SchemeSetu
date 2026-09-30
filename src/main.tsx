import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { LanguageProvider } from './contexts/LanguageProvider';
import { AuthProvider } from './contexts/AuthProvider';
import { CompareProvider } from './contexts/CompareProvider';
import { ThemeProvider } from './contexts/ThemeProvider';
import AppRoutes from './routes/AppRoutes';
import './styles/global.css';

ReactDOM.createRoot(document.getElementById('app')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <CompareProvider>
              <AppRoutes />
            </CompareProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </React.StrictMode>
);
