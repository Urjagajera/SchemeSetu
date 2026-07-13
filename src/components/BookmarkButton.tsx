import React from 'react';
import { Bookmark } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { cn } from '../utils/cn';

interface BookmarkButtonProps {
  schemeId: string;
  isBookmarked: boolean;
  onToggle: () => void;
  className?: string;
}

export const BookmarkButton: React.FC<BookmarkButtonProps> = ({
  schemeId,
  isBookmarked,
  onToggle,
  className
}) => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAuthenticated) {
      navigate('/login?redirect=' + encodeURIComponent(window.location.pathname + window.location.search));
      return;
    }
    onToggle();
  };

  return (
    <button
      onClick={handleClick}
      className={cn(
        "p-2 rounded-full border border-outline-variant hover:bg-surface-container-low transition-colors shadow-sm focus:outline-none",
        isBookmarked ? "text-secondary bg-secondary-container/20 border-secondary" : "text-on-surface-variant bg-white",
        className
      )}
      title={isBookmarked ? "Remove Bookmark" : "Save Scheme"}
    >
      <Bookmark className={cn("w-5 h-5", isBookmarked && "fill-current")} />
    </button>
  );
};
export default BookmarkButton;
