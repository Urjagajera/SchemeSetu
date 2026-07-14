import React, { useState } from 'react';
import { useTranslation } from '../contexts/LanguageContext';
import { HelpCircle, ChevronDown, ChevronUp, Search } from 'lucide-react';
import { cn } from '../utils/cn';
import { motion } from 'framer-motion';

interface FAQ {
  q: string;
  a: string;
}

export const Help: React.FC = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(null);

  const faqs: FAQ[] = [
    {
      q: t('faqQ1') || 'How do I know which schemes I am eligible for?',
      a: t('faqA1') || "Use our Eligibility Checker tool. Just answer a few simple questions about your age, income, occupation, and state, and we'll show you a personalized list of matching schemes instantly."
    },
    {
      q: t('faqQ2') || 'Is SchemeSetu an official government website?',
      a: t('faqA2') || 'SchemeSetu is a citizen-assistance platform that aggregates publicly available information from official government portals like MyScheme.gov.in, Scholarships.gov.in, and others. We are not directly affiliated with the Government of India, but all scheme data is sourced from official sources.'
    },
    {
      q: t('faqQ3') || 'Can I apply for a scheme directly through SchemeSetu?',
      a: t('faqA3') || 'No. SchemeSetu helps you discover and understand schemes, check your eligibility, and prepare your documents. For the actual application, we redirect you to the official government portal for that specific scheme. This ensures your application is processed through official channels.'
    },
    {
      q: t('faqQ4') || 'How often is the scheme data updated?',
      a: t('faqA4') || 'Our team updates scheme information daily. New schemes, deadline changes, and eligibility updates are reflected within 24-48 hours of official announcement. You can subscribe to notifications to get instant alerts.'
    },
    {
      q: t('faqQ5') || 'Is my personal data safe on SchemeSetu?',
      a: t('faqA5') || 'Yes. We use Google OAuth 2.0 for authentication, which means we never store your password. The eligibility check information you enter is used only to match you with schemes and is not stored permanently on our servers. Please refer to our Privacy Policy for full details.'
    },
    {
      q: t('faqQ6') || 'What documents are generally required for most schemes?',
      a: t('faqA6') || 'Most central government schemes require: Aadhaar Card, Bank Account (linked to Aadhaar), Income Certificate (from Tehsildar/SDM), Caste Certificate (if applicable), Age Proof (Birth Certificate or Class 10 Marksheet), Address Proof, Passport-sized photographs. Always check the specific scheme\'s document list for exact requirements.'
    }
  ];

  const filteredFaqs = faqs.filter(faq => 
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) || 
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-grow flex flex-col w-full"
    >
      {/* Hero Header */}
      <section className="bg-primary dark:bg-zinc-950 py-16 transition-colors">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-white/10 rounded-xl">
            <HelpCircle className="w-6 h-6 text-white" />
          </div>
          <h1 className="font-display text-2xl md:text-4xl font-extrabold text-white">
            {t('howCanWeHelp')}
          </h1>
          <p className="font-body text-xs md:text-sm text-sky-100/80 max-w-lg mx-auto leading-relaxed">
            {t('helpDesc')}
          </p>

          {/* Search bar */}
          <div className="max-w-md mx-auto relative pt-4">
            <div className="flex items-center bg-white dark:bg-zinc-900 border dark:border-zinc-800 rounded-full shadow-lg p-1.5 focus-within:border-secondary transition-all">
              <Search className="w-5 h-5 ml-3 text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('searchHelpArticles')}
                className="w-full border-none focus:outline-none focus:ring-0 bg-transparent px-3 py-2 text-xs md:text-sm text-on-surface dark:text-white outline-none placeholder:text-zinc-550"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Main FAQ list */}
      <section className="py-16 max-w-3xl mx-auto px-4 w-full flex-grow space-y-8">
        <h2 className="font-heading text-lg md:text-xl font-extrabold text-primary dark:text-white text-center">
          {t('faqsTitle')}
        </h2>

        {filteredFaqs.length > 0 ? (
          <div className="space-y-3.5">
            {filteredFaqs.map((faq, idx) => {
              const isOpen = openFaqIndex === idx;
              return (
                <div
                  key={idx}
                  className="bg-white dark:bg-zinc-900 border border-outline-variant dark:border-zinc-800 rounded-xl overflow-hidden shadow-sm transition-colors cursor-pointer"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                >
                  <button className="w-full p-4 flex items-center justify-between text-left focus:outline-none font-semibold text-xs md:text-sm text-primary dark:text-white select-none">
                    <span>{faq.q}</span>
                    {isOpen ? <ChevronUp className="w-4 h-4 text-secondary dark:text-sky-400" /> : <ChevronDown className="w-4 h-4 text-zinc-400" />}
                  </button>

                  {isOpen && (
                    <div className="px-4 pb-4 text-xs md:text-sm text-on-surface-variant dark:text-zinc-400 leading-relaxed border-t border-outline-variant/35 dark:border-zinc-850 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-center text-xs text-on-surface-variant dark:text-zinc-500 italic py-8">
            {t('noArticlesFound')} "{searchQuery}".
          </p>
        )}

      </section>

    </motion.div>
  );
};

export default Help;
