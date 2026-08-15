'use client';
import React from 'react';
import { motion } from 'framer-motion';

const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.72, ease: [0.16, 1, 0.3, 1] } },
};

/**
 * Scene 2 — Problem Statement.
 * Full-bleed navy section, left-aligned editorial headline.
 * No invented statistics.
 */
export const ProblemStatement: React.FC = () => {
  return (
    <section
      className="relative bg-navy py-28 md:py-40 overflow-hidden"
      aria-label="Problem statement"
    >
      {/* Decorative accent line */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1 bg-saffron"
        aria-hidden="true"
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 lg:px-12">
        <div className="max-w-3xl">
          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.4 }}
            className="font-display text-xs uppercase tracking-[0.22em] text-saffron mb-8"
          >
            The Problem
          </motion.p>

          <motion.h2
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="font-display text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-[1.1] tracking-tight"
          >
            Thousands of schemes.
            <span className="block text-white/50 mt-2">
              Finding the right one&nbsp;
              <em className="text-saffron not-italic">shouldn't be difficult.</em>
            </span>
          </motion.h2>

          <motion.p
            variants={fadeUp}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            className="font-body text-base sm:text-lg text-white/60 mt-8 max-w-xl leading-relaxed"
          >
            Central and state governments together offer a vast network of welfare
            schemes covering education, health, agriculture, housing, and more.
            Most eligible citizens never find out they qualify.
          </motion.p>
        </div>
      </div>
    </section>
  );
};

export default ProblemStatement;
