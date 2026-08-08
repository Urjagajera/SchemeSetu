import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../contexts/LanguageContext';
import { useBookmarks } from '../hooks/useBookmarks';
import { schemeService } from '../services/schemeService';
import { Scheme } from '../types';
import { Hero } from '../components/Hero';
import { StatCard } from '../components/StatCard';
import { CategoryCard } from '../components/CategoryCard';
import { SchemeCard } from '../components/SchemeCard';
import { LoadingSkeleton } from '../components/LoadingSkeleton';
import { Compass, FileCheck2, Send, CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export const Home: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { bookmarks, toggleBookmark } = useBookmarks();
  const [featuredSchemes, setFeaturedSchemes] = useState<Scheme[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);
  const marqueeRef = useRef<HTMLDivElement>(null);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const dragStartXRef = useRef(0);
  const hasDraggedRef = useRef(false);
  const resumeTimeoutRef = useRef<any>(null);

  useEffect(() => {
    const loadFeatured = async () => {
      try {
        const schemes = await schemeService.getFeaturedSchemes();
        setFeaturedSchemes(schemes);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadFeatured();
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
    };
  }, []);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    
    const marquee = marqueeRef.current;
    if (!marquee) return;

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }

    isDraggingRef.current = true;
    startXRef.current = e.clientX;
    startYRef.current = e.clientY;
    hasDraggedRef.current = false;

    e.currentTarget.setPointerCapture(e.pointerId);

    const style = window.getComputedStyle(marquee);
    const matrixString = style.transform || style.webkitTransform;
    let currentX = 0;
    
    if (matrixString && matrixString !== 'none') {
      try {
        const matrix = new DOMMatrixReadOnly(matrixString);
        currentX = matrix.m41;
      } catch (err) {
        const parts = matrixString.split('(')[1]?.split(')')[0]?.split(',');
        if (parts && parts.length >= 6) {
          currentX = parseFloat(parts[4]);
        }
      }
    }
    
    dragStartXRef.current = currentX;

    marquee.style.animation = 'none';
    marquee.style.transform = `translateX(${currentX}px)`;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;

    const marquee = marqueeRef.current;
    if (!marquee) return;

    const dx = e.clientX - startXRef.current;
    const dy = e.clientY - startYRef.current;

    if (!hasDraggedRef.current && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      hasDraggedRef.current = true;
    }

    if (hasDraggedRef.current) {
      e.preventDefault();

      const newX = dragStartXRef.current + dx;
      const halfWidth = marquee.scrollWidth / 2;

      let wrappedX = newX;
      if (halfWidth > 0) {
        while (wrappedX > 0) {
          wrappedX -= halfWidth;
        }
        while (wrappedX < -halfWidth) {
          wrappedX += halfWidth;
        }
      }

      marquee.style.transform = `translateX(${wrappedX}px)`;
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (!hasDraggedRef.current) {
      return;
    }

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = setTimeout(resumeAnimation, 3000);
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDraggingRef.current) return;
    isDraggingRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);

    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
    }
    resumeTimeoutRef.current = setTimeout(resumeAnimation, 3000);
  };

  const resumeAnimation = () => {
    const marquee = marqueeRef.current;
    if (!marquee) return;

    const halfWidth = marquee.scrollWidth / 2;
    if (halfWidth <= 0) return;

    const transformStr = marquee.style.transform;
    let currentX = 0;
    if (transformStr) {
      const match = transformStr.match(/translateX\(([-\d.]+)px\)/);
      if (match) {
        currentX = parseFloat(match[1]);
      }
    }

    let wrappedX = currentX;
    while (wrappedX > 0) {
      wrappedX -= halfWidth;
    }
    while (wrappedX < -halfWidth) {
      wrappedX += halfWidth;
    }

    const progress = -wrappedX / halfWidth;
    const duration = 25;
    const delay = -progress * duration;

    marquee.style.transform = '';
    marquee.style.animation = `marquee ${duration}s linear infinite`;
    marquee.style.animationDelay = `${delay}s`;
  };

  const handleClickCapture = (e: React.MouseEvent) => {
    if (hasDraggedRef.current) {
      e.stopPropagation();
      e.preventDefault();
    }
  };

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim()) {
      alert('Thank you! You have been subscribed.');
      setEmail('');
    }
  };

  const categories = [
    { icon: 'school', label: t('scholarships'), value: 'Education' },
    { icon: 'medical_services', label: t('healthInsurance'), value: 'Healthcare' },
    { icon: 'agriculture', label: t('farmerLoans'), value: 'Agriculture' },
    { icon: 'home', label: t('housing'), value: 'Housing' },
    { icon: 'work', label: t('employment'), value: 'Employment' },
    { icon: 'family_restroom', label: t('womenAndChild'), value: 'Women & Child' },
    { icon: 'elderly', label: t('seniorCitizens'), value: 'Senior Citizens' }
  ];

  const steps = [
    { icon: Compass, title: t('step1Title'), desc: t('step1Desc') },
    { icon: FileCheck2, title: t('step2Title'), desc: t('step2Desc') },
    { icon: Send, title: t('step3Title'), desc: t('step3Desc') }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex-grow flex flex-col"
    >
      <Hero />

      {/* Stats Bar */}
      <section className="bg-surface-container-lowest dark:bg-zinc-900 border-b border-outline-variant dark:border-zinc-800 py-8 transition-colors">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard value="4500+" label={t('activeSchemes')} />
            <StatCard value="28" label={t('statesCovered')} />
            <StatCard value="9.8 Cr+" label={t('beneficiaries')} />
            <StatCard value="₹2.4L Cr" label={t('disbursed')} />
          </div>
        </div>
      </section>

      {/* Categories Grid */}
      <section className="py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-10 gap-4">
          <div>
            <h2 className="font-heading text-xl md:text-2xl font-extrabold text-primary dark:text-white">
              {t('exploreCategory')}
            </h2>
            <p className="font-body text-sm text-on-surface-variant dark:text-zinc-400 mt-1">
              {t('exploreSub')}
            </p>
          </div>
          <button
            onClick={() => navigate('/login')}
            className="text-secondary dark:text-sky-400 font-bold flex items-center gap-1 hover:underline text-sm focus:outline-none"
          >
            {t('viewAllSchemes')}
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div
          ref={containerRef}
          onClickCapture={handleClickCapture}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerCancel}
          className="w-full overflow-hidden cursor-grab active:cursor-grabbing select-none py-4"
        >
          <div
            ref={marqueeRef}
            className="animate-marquee flex gap-6"
          >
            {/* Duplicated 2x for seamless marquee looping */}
            {[...categories, ...categories].map((cat, idx) => (
              <div
                key={`${cat.value}-${idx}`}
                className="flex-shrink-0 w-44"
              >
                <CategoryCard
                  iconName={cat.icon}
                  label={cat.label}
                  categoryValue={cat.value}
                  onClick={() => navigate('/login')}
                />
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* How it Works */}
      <section className="py-24 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full text-center">
        <h2 className="font-heading text-xl md:text-3xl font-extrabold text-primary dark:text-white mb-3">
          {t('howItWorks')}
        </h2>
        <p className="font-body text-sm md:text-base text-on-surface-variant dark:text-zinc-400 mb-16 max-w-xl mx-auto">
          {t('howItWorksSub')}
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative max-w-5xl mx-auto">
          {/* Connector Line */}
          <div className="hidden md:block absolute top-8 left-[16%] right-[16%] h-0.5 bg-outline-variant dark:bg-zinc-800 -z-10" />

          {steps.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 flex items-center justify-center mb-6 shadow-md border-4 border-white dark:border-zinc-950">
                  <Icon className="w-6 h-6" />
                </div>
                <h3 className="font-heading text-base md:text-lg font-bold text-primary dark:text-white mb-2">
                  {step.title}
                </h3>
                <p className="font-body text-xs md:text-sm text-on-surface-variant dark:text-zinc-450 leading-relaxed max-w-[250px]">
                  {step.desc}
                </p>
              </div>
            );
          })}
        </div>

        <button
          onClick={() => navigate('/login')}
          className="mt-16 bg-primary hover:bg-secondary text-white dark:bg-sky-500 dark:text-zinc-950 dark:hover:opacity-90 px-8 py-3.5 rounded-lg font-heading text-sm md:text-base font-bold shadow-md active:scale-95 transition-all focus:outline-none"
        >
          {t('findForMeBtn')}
        </button>
      </section>
    </motion.div>
  );
};

export default Home;
