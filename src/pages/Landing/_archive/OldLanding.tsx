import React, { useEffect } from 'react';
import { LandingNav } from '../../../components/landing/LandingNav';
import { HeroStage } from '../../../components/landing/HeroStage';
import { ProblemStatement } from '../../../components/landing/ProblemStatement';
import { CategoriesScene } from '../../../components/landing/CategoriesScene';
import { SchemesCarousel } from '../../../components/landing/SchemesCarousel';
import { AISection } from '../../../components/landing/AISection';
import { HowItWorks } from '../../../components/landing/HowItWorks';
import { FinalCTA } from '../../../components/landing/FinalCTA';

/**
 * OldLanding — Archived public landing page.
 * Saved for easy reversal.
 */
export const OldLanding: React.FC = () => {
  useEffect(() => {
    document.body.setAttribute('data-landing', 'true');
    return () => {
      document.body.removeAttribute('data-landing');
    };
  }, []);

  return (
    <div className="landing-page relative w-full overflow-x-hidden">
      <LandingNav />
      <HeroStage />
      <ProblemStatement />
      <CategoriesScene />
      <SchemesCarousel />
      <AISection />
      <HowItWorks />
      <FinalCTA />
    </div>
  );
};

export default OldLanding;
