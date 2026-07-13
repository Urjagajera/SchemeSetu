import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { User, CheckCircle } from 'lucide-react';
import { cn } from '../utils/cn';

interface ProfileCompletionProps {
  percentage: number;
  missingFields: string[];
  className?: string;
}

export const ProfileCompletion: React.FC<ProfileCompletionProps> = ({
  percentage,
  missingFields,
  className
}) => {
  const { t } = useTranslation();

  return (
    <div className={cn(
      "bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl p-6 shadow-sm space-y-4 transition-colors",
      className
    )}>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary-container/20 text-secondary dark:text-sky-400 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5" />
        </div>
        <div className="flex-grow min-w-0">
          <h3 className="font-heading text-sm md:text-base font-bold text-primary dark:text-white truncate">
            {t('completeProfileCard')}
          </h3>
          <p className="text-xs text-on-surface-variant dark:text-zinc-400 mt-0.5 leading-relaxed">
            {t('completeProfileCardDesc')}
          </p>
        </div>
        <span className="flex items-center gap-1 text-[11px] font-bold text-secondary bg-secondary-container/20 px-2.5 py-0.5 rounded-full whitespace-nowrap">
          {percentage}% Complete
        </span>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="w-full h-2 bg-surface-container-highest dark:bg-zinc-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-secondary dark:bg-sky-500 rounded-full transition-all duration-500"
            style={{ width: `${percentage}%` }}
          />
        </div>
        {missingFields.length > 0 && (
          <p className="text-[11px] text-on-surface-variant dark:text-zinc-400">
            Missing: <span className="font-bold">{missingFields.join(', ')}</span>
          </p>
        )}
      </div>

      {/* CTA Button */}
      <div className="flex justify-end">
        <Link
          to="/profile"
          className="bg-primary text-white dark:bg-sky-500 dark:text-zinc-950 px-5 py-2 rounded-lg font-heading text-xs font-bold hover:bg-secondary dark:hover:opacity-90 transition-all active:scale-95 shadow-sm"
        >
          {t('completeProfileBtn')}
        </Link>
      </div>
    </div>
  );
};

export default ProfileCompletion;
