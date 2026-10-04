import React from 'react';
import { ArrowLeftRight } from 'lucide-react';
import { useCompare } from '../contexts/CompareContext';
import { useTranslation } from '../contexts/LanguageContext';
import { Scheme } from '../types';
import { cn } from '../utils/cn';

interface CompareButtonProps {
  scheme: Scheme;
  className?: string;
}

export const CompareButton: React.FC<CompareButtonProps> = ({ scheme, className }) => {
  const { t } = useTranslation();
  const { isInCompare, addToCompare, removeFromCompare } = useCompare();
  const checked = isInCompare(scheme.id);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (checked) {
      removeFromCompare(scheme.id);
    } else {
      const res = addToCompare(scheme);
      if (!res.success) {
        alert(t(res.message));
      }
    }
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-2 rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors shadow-sm focus:outline-none",
        checked ? "text-secondary bg-secondary-container/20 border-secondary" : "text-on-surface-variant bg-white",
        className
      )}
      title={checked ? t('shCmpRemove') : t('shCmpAdd')}
    >
      <ArrowLeftRight className="w-5 h-5" />
    </button>
  );
};

export default CompareButton;
