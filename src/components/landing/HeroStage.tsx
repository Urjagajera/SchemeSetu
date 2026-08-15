'use client';
import React, { useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, useScroll, useTransform, useMotionValue, useReducedMotion } from 'framer-motion';

/**
 * HeroStage — Full-viewport sticky cinematic hero.
 *
 * Video behavior:
 * - Autoplays muted once, holds last frame (no loop).
 * - Falls back to poster if video fails.
 * - playsInline + muted required for mobile autoplay.
 *
 * Scroll phases (0→100vh scroll travel):
 * - 0–15%:  Text fully visible, subtle text parallax only.
 * - 15–30%: Video scale + blur ramp (camera push-in). Text fades up+out.
 * - 30–45%: Navy overlay ramps in → cross-fade into next section.
 *
 * prefers-reduced-motion: all transforms disabled, pure fade only.
 */

interface HeroStageProps {
  scrollContainerRef?: React.RefObject<HTMLElement>;
}

export const HeroStage: React.FC<HeroStageProps> = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const sectionRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const prefersReducedMotion = useReducedMotion();
  const [started, setStarted] = React.useState(false);

  // Scroll progress over the hero section (0 → 1 as it scrolls through its height)
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start start', 'end start'],
  });

  // --- Video transforms (phases 1–2) ---
  // 15–35% scroll → scale 1.0 → 1.12
  const videoScale = useTransform(
    scrollYProgress,
    [0.15, 0.35],
    prefersReducedMotion ? [1, 1] : [1, 1.12]
  );
  // 15–35% scroll → blur 0 → 6px
  const videoBlurRaw = useTransform(
    scrollYProgress,
    [0.15, 0.35],
    prefersReducedMotion ? [0, 0] : [0, 6]
  );
  // 20–40% scroll → brightness 1 → 0.6
  const videoBrightness = useTransform(
    scrollYProgress,
    [0.20, 0.40],
    prefersReducedMotion ? [1, 1] : [1, 0.6]
  );

  // --- Cross-fade overlay (phase 3: 30–45%) ---
  const overlayOpacity = useTransform(
    scrollYProgress,
    [0.30, 0.50],
    prefersReducedMotion ? [0, 0] : [0, 1]
  );

  // --- Hero text transforms ---
  // Subtle downward parallax during 0–15% (text moves up slightly)
  const textY = useTransform(
    scrollYProgress,
    [0, 0.15, 0.30],
    prefersReducedMotion ? [0, 0, 0] : [0, -16, -48]
  );
  const textOpacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.28],
    prefersReducedMotion ? [1, 1, 1] : [1, 1, 0]
  );

  // Video filter string composed from motion values
  const videoFilter = useMotionValue('blur(0px) brightness(1)');
  useEffect(() => {
    const unsubBlur = videoBlurRaw.on('change', (b) => {
      const br = videoBrightness.get();
      videoFilter.set(`blur(${b}px) brightness(${br})`);
    });
    const unsubBr = videoBrightness.on('change', (br) => {
      const b = videoBlurRaw.get();
      videoFilter.set(`blur(${b}px) brightness(${br})`);
    });
    return () => { unsubBlur(); unsubBr(); };
  }, [videoBlurRaw, videoBrightness, videoFilter]);

  // Start video on first user interaction (click/tap anywhere in hero)
  const handleHeroClick = React.useCallback((e: React.MouseEvent) => {
    // Don't steal clicks that are on the CTA buttons
    const target = e.target as HTMLElement;
    if (target.closest('button')) return;

    const video = videoRef.current;
    if (!video || started) return;

    setStarted(true);
    video.play().catch(() => {
      // Blocked — poster stays visible
    });
  }, [started]);

  // Pause on ended (holds last frame)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleEnded = () => video.pause();
    video.addEventListener('ended', handleEnded);
    return () => video.removeEventListener('ended', handleEnded);
  }, []);

  return (
    // Outer section provides the scroll travel distance for scrubbing
    // 300vh total: 100vh is the sticky view, remaining 200vh is scroll travel
    <section
      ref={sectionRef}
      className="relative"
      style={{ height: '300vh' }}
      aria-label="Hero"
    >
      {/* Sticky viewport frame — click anywhere (except CTAs) to start video */}
      <div
        className={`sticky top-0 h-screen min-h-[100dvh] overflow-hidden ${!started ? 'cursor-pointer' : ''}`}
        onClick={handleHeroClick}
      >

        {/* Background video — position: absolute fills the sticky frame */}
        <motion.div
          className="absolute inset-0"
          style={{ scale: videoScale, filter: videoFilter as any }}
        >
          <video
            ref={videoRef}
            src="/hero/hero-bg-trimmed.mp4"
            poster="/hero/hero-poster.jpg"
            muted
            playsInline
            preload="auto"
            className="w-full h-full object-cover object-center"
            aria-hidden="true"
          />
          {/* Static dark scrim so text is always readable over the video */}
          <div className="absolute inset-0 bg-gradient-to-b from-navy/60 via-navy/30 to-navy/50" />
        </motion.div>

        {/* Cross-fade overlay (navy ramp on scroll phase 3) */}
        <motion.div
          className="absolute inset-0 bg-navy pointer-events-none"
          style={{ opacity: overlayOpacity }}
          aria-hidden="true"
        />

        {/* Click-to-play indicator — visible before the video starts */}
        <motion.div
          className="absolute inset-0 z-20 flex items-end justify-center pb-12 pointer-events-none"
          animate={{ opacity: started ? 0 : 1 }}
          transition={{ duration: 0.6 }}
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-2">
            {/* Pulsing ring */}
            <div className="relative w-14 h-14 flex items-center justify-center">
              <span className="absolute inset-0 rounded-full border-2 border-white/40 animate-ping" />
              <span className="w-14 h-14 rounded-full border-2 border-white/70 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                <svg viewBox="0 0 24 24" fill="white" className="w-6 h-6 ml-1" aria-hidden="true">
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </div>
            <span className="text-white/60 text-xs font-medium tracking-widest uppercase">Click to play</span>
          </div>
        </motion.div>

        {/* Hero copy */}
        <motion.div
          style={{ y: textY, opacity: textOpacity }}
          className="relative z-10 flex flex-col items-center justify-center h-full px-4 text-center"
        >
          {/* Wordmark */}
          <p
            className="font-display text-[10px] sm:text-xs uppercase tracking-[0.28em] text-white/60 mb-6"
            aria-hidden="true"
          >
            SCHEMESETU
          </p>

          {/* h1 Headline */}
          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold text-white leading-[1.08] tracking-tight max-w-4xl">
            Discover the government
            <span className="block text-saffron italic"> schemes made for you.</span>
          </h1>

          {/* Sub-copy */}
          <p className="font-body text-base sm:text-lg text-white/75 mt-6 max-w-xl leading-relaxed">
            One platform. Thousands of central and state schemes. Find what you are eligible for in minutes.
          </p>

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-3 mt-10">
            <button
              onClick={() => navigate('/login')}
              className="group inline-flex items-center gap-2 bg-saffron text-white font-bold text-base px-7 py-3.5 rounded-full hover:bg-saffron/90 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-saffron/50 shadow-lg"
            >
              Find My Schemes
              <svg
                className="w-4 h-4 transition-transform group-hover:translate-x-1"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                aria-hidden="true"
              >
                <path d="M3 8h10M9 4l4 4-4 4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="inline-flex items-center gap-2 border border-white/40 text-white font-semibold text-base px-7 py-3.5 rounded-full hover:bg-white/10 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-white/30 backdrop-blur-sm"
            >
              Explore Schemes
            </button>
          </div>
        </motion.div>

        {/* Reduced-motion: simple static layout, no transforms  */}
        {prefersReducedMotion && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center px-4 text-center pointer-events-none">
            {/* Content is already rendered above — this div is a no-op for static positioning */}
          </div>
        )}
      </div>
    </section>
  );
};

export default HeroStage;
