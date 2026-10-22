import React from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { EmptyState } from './EmptyState';

/**
 * Shown in place of schemes that could not be loaded (no connection, or the server failed).
 * The scheme pages show this instead of sample schemes, so nothing on screen can pass for real data.
 */
export const LoadError: React.FC<{ onRetry: () => void; className?: string }> = ({ onRetry, className }) => {
  const { t } = useTranslation();
  return (
    <div role="alert" className={className}>
      <EmptyState iconName="WifiOff" title={t('loadErrorTitle')} description={t('loadErrorDesc')} actionText={t('retry')} onAction={onRetry} />
    </div>
  );
};

export default LoadError;
