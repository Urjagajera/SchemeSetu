'use client';
import React, { useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform } from 'framer-motion';

/**
 * LandingNav — transparent on load, frosts to solid on scroll.
 * Completely separate from the app Navbar so it doesn't interfere with the
 * existing Navbar logic (which already detects isLandingPage).
 *
 * The existing MainLayout renders <Navbar /> for ALL routes including /
 * so we hide it on the landing page via the Navbar's own isLandingPage check
 * and render this nav ourselves inside Landing.tsx (outside MainLayout scroll area).
 */
export const LandingNav: React.FC = () => {
  const navigate = useNavigate();
  const { scrollY } = useScroll();

  // Fade nav bg in from 0–80px scroll
  const navBg = useTransform(scrollY, [0, 80], ['rgba(255,255,255,0)', 'rgba(255,255,255,0.95)']);
  const navBorder = useTransform(scrollY, [0, 80], ['rgba(0,0,0,0)', 'rgba(196,198,207,0.6)']);
  const textColor = useTransform(scrollY, [0, 60], ['rgb(255,255,255)', 'rgb(0,32,69)']);

  return (
    <motion.header
      style={{ backgroundColor: navBg, borderBottomColor: navBorder }}
      className="fixed top-0 left-0 right-0 z-50 border-b backdrop-blur-sm transition-shadow"
      aria-label="SchemeSetu navigation"
    >
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <img src="/logo.png" alt="SchemeSetu" className="h-9 w-auto" />
          <motion.span
            style={{ color: textColor }}
            className="font-heading text-lg font-extrabold tracking-tight"
          >
            SchemeSetu
          </motion.span>
        </Link>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-3">
          <motion.button
            style={{ color: textColor }}
            onClick={() => navigate('/login')}
            className="text-sm font-semibold px-4 py-2 rounded-lg hover:bg-white/10 transition-colors focus:outline-none focus:ring-2 focus:ring-saffron"
          >
            Sign in
          </motion.button>
          <button
            onClick={() => navigate('/login')}
            className="text-sm font-bold px-5 py-2.5 rounded-lg bg-saffron text-white hover:bg-saffron/90 transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-saffron/50 shadow-sm"
          >
            Find My Schemes
          </button>
        </div>

        {/* Mobile: single CTA */}
        <button
          onClick={() => navigate('/login')}
          className="md:hidden text-sm font-bold px-4 py-2 rounded-lg bg-saffron text-white hover:bg-saffron/90 transition-all active:scale-95 focus:outline-none"
        >
          Get Started
        </button>
      </div>
    </motion.header>
  );
};

export default LandingNav;
