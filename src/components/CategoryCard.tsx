import React from 'react';
import { useNavigate } from 'react-router-dom';
import * as Icons from 'lucide-react';
import { cn } from '../utils/cn';

interface CategoryCardProps {
  iconName: string; // e.g. 'GraduationCap', 'HeartPulse', etc.
  label: string;
  categoryValue: string;
  className?: string;
}

const iconMap: Record<string, keyof typeof Icons> = {
  school: 'GraduationCap',
  medical_services: 'HeartPulse',
  agriculture: 'Wheat',
  home: 'Home',
  work: 'Briefcase',
  family_restroom: 'Baby',
  elderly: 'Users'
};

export const CategoryCard: React.FC<CategoryCardProps> = ({
  iconName,
  label,
  categoryValue,
  className
}) => {
  const navigate = useNavigate();
  
  // Resolve icon using map or fallback to direct name
  const lucideKey = iconMap[iconName] || iconName;
  const LucideIcon = (Icons as any)[lucideKey] || Icons.HelpCircle;

  const handleClick = () => {
    navigate(`/search?category=${encodeURIComponent(categoryValue)}`);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "group flex flex-col items-center p-5 bg-surface-container-low dark:bg-zinc-900 border border-transparent hover:border-secondary dark:hover:border-sky-500 rounded-xl shadow-sm hover:shadow-md transition-all cursor-pointer select-none active:scale-95 duration-200",
        className
      )}
    >
      <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-800 flex items-center justify-center mb-3 text-secondary dark:text-sky-400 group-hover:bg-primary group-hover:text-white dark:group-hover:bg-sky-500 dark:group-hover:text-zinc-900 transition-colors">
        <LucideIcon className="w-6 h-6 transition-transform group-hover:scale-110" />
      </div>
      <span className="font-heading text-xs md:text-sm text-center font-bold text-on-surface dark:text-zinc-300 group-hover:text-secondary dark:group-hover:text-sky-400 transition-colors">
        {label}
      </span>
    </div>
  );
};

export default CategoryCard;
