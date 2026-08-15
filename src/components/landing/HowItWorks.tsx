'use client';
import React from 'react';
import { motion } from 'framer-motion';

/**
 * Scene 6 — How SchemeSetu Works.
 * Three-step reveal on scroll using framer-motion whileInView.
 * Layout family: vertical-stack with a connector line (distinct from categories grid and carousel).
 */

const STEPS = [
  {
    number: '1',
    title: 'Tell us about yourself',
    desc: 'Enter your age, occupation, income level, state, and what kind of support you are looking for.',
    accent: '#E8820C', // saffron
  },
  {
    number: '2',
    title: 'Discover relevant schemes',
    desc: 'SchemeSetu matches your profile against central and state government schemes and surfaces the ones you are most likely eligible for.',
    accent: '#5A7A6A', // sage
  },
  {
    number: '3',
    title: 'Understand and apply',
    desc: 'Read plain-language summaries, check eligibility criteria, gather required documents, and apply directly through the official portal.',
    accent: '#1960a3', // secondary blue
  },
];

export const HowItWorks: React.FC = () => {
  return (
    <section
      className="bg-ivory py-24 md:py-36"
      aria-label="How SchemeSetu works"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="max-w-xl mb-16">
          <h2 className="font-display text-3xl sm:text-4xl md:text-5xl font-bold text-navy tracking-tight leading-tight">
            How SchemeSetu
            <span className="text-saffron italic"> works.</span>
          </h2>
        </div>

        {/* Steps */}
        <div className="relative flex flex-col gap-0">
          {/* Vertical connector line (decorative) */}
          <div
            className="absolute left-6 top-10 bottom-10 w-px bg-outline-variant hidden md:block"
            aria-hidden="true"
          />

          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, amount: 0.4 }}
              transition={{ duration: 0.65, delay: i * 0.14, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-8 py-10 border-b border-outline-variant last:border-0"
            >
              {/* Step circle */}
              <div
                className="flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center font-display font-bold text-lg text-white shadow-sm relative z-10"
                style={{ backgroundColor: step.accent }}
              >
                {step.number}
              </div>

              {/* Content */}
              <div className="flex-grow pt-1">
                <h3 className="font-display text-xl md:text-2xl font-bold text-navy mb-3">
                  {step.title}
                </h3>
                <p className="font-body text-sm md:text-base text-on-surface-variant leading-relaxed max-w-2xl">
                  {step.desc}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
