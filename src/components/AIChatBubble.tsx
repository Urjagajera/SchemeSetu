import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Bot, MessageCircle } from 'lucide-react';
import { useTranslation } from '../contexts/LanguageContext';
import { motion, AnimatePresence } from 'framer-motion';

export const AIChatBubble: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  // Hide the floating bubble on the chat assistant page itself
  if (location.pathname === '/ai') return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <motion.button
        onClick={() => navigate('/ai')}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className="flex items-center gap-2 bg-secondary text-white dark:bg-sky-500 rounded-full px-4 py-3 shadow-xl hover:opacity-90 transition-all font-bold text-sm border-2 border-white dark:border-zinc-800"
      >
        <Bot className="w-5 h-5 animate-pulse" />
        <span className="max-w-0 overflow-hidden md:group-hover:max-w-xs transition-all whitespace-nowrap hidden md:inline">
          {t('aiShortcut')}
        </span>
        <span className="md:hidden">AI</span>
      </motion.button>
    </div>
  );
};

export default AIChatBubble;
