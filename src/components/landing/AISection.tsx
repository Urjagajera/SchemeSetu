'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

/**
 * Scene 5 — AI matching section.
 * "Not sure where to start?"
 * Three-stage flow: USER INFO → AI MATCHING → RELEVANT SCHEMES.
 * Restrained iconography. No glow/particle/robot visuals.
 *
 * The Setu AI route is /ai (auth-gated). Since a user hitting the landing page
 * is unauthenticated, the CTA points to /login, which redirects to /ai after auth.
 * Documented in walkthrough.
 */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.65, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] },
  }),
};

const STEPS = [
  {
    stage: '01',
    label: 'Your Information',
    desc: 'Share your age, occupation, income, and location.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6" aria-hidden="true">
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" strokeLinejoin="round" />
        <circle cx="12" cy="7" r="4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    stage: '02',
    label: 'AI Matching',
    desc: 'SetuAI cross-references your profile against thousands of active schemes.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6" aria-hidden="true">
        <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m0 0h18" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    stage: '03',
    label: 'Relevant Schemes',
    desc: 'Receive a personalised list of schemes you are likely eligible for.',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="w-6 h-6" aria-hidden="true">
        <path d="M9 12l2 2 4-4m6 2a9 9 0 1 1-18 0 9 9 0 0 1 18 0z" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

export const AISection: React.FC = () => {
  const navigate = useNavigate();

  return (
    <section
      className="bg-navy py-24 md:py-36 overflow-hidden"
      aria-label="AI scheme matching"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
          {/* Left: Copy */}
          <div>
            <motion.h2
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
              className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-white leading-tight tracking-tight"
            >
              Not sure where
              <span className="block text-saffron italic"> to start?</span>
            </motion.h2>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
              className="font-body text-base text-white/65 mt-5 max-w-md leading-relaxed"
            >
              Let SetuAI help you find relevant schemes. Tell us about yourself
              and we will surface the programmes that match your profile.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
              className="mt-8"
            >
              <button
                onClick={() => navigate('/login')}
                className="group inline-flex items-center gap-2 bg-saffron text-white font-bold text-sm px-6 py-3.5 rounded-full hover:bg-saffron/90 transition-all active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-saffron/50 shadow-lg"
              >
                Try SetuAI
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
            </motion.div>
          </div>

          {/* Right: Three-stage flow diagram */}
          <div className="flex flex-col gap-4">
            {STEPS.map((step, i) => (
              <motion.div
                key={step.stage}
                custom={i}
                variants={fadeUp}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                className="flex items-start gap-5 p-5 rounded-2xl bg-white/5 border border-white/10"
              >
                {/* Stage number */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                  <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-saffron">
                    {step.stage}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white">
                    {step.icon}
                  </div>
                </div>

                {/* Connector arrow */}
                {i < STEPS.length - 1 && (
                  <div className="hidden" aria-hidden="true" />
                )}

                <div>
                  <p className="font-display text-sm font-bold text-white">{step.label}</p>
                  <p className="font-body text-xs text-white/55 mt-1 leading-relaxed">{step.desc}</p>
                </div>
              </motion.div>
            ))}

            {/* Flow arrow between cards on desktop */}
            <p className="text-white/30 text-xs text-center mt-1">
              Secure · Private · Free to use
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default AISection;
