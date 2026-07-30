import { Hero } from "../components/marketing/Hero";
import { MissionVision } from "../components/marketing/MissionVision";
import { ValueProposition } from "../components/marketing/ValueProposition";
import { HowItWorks } from "../components/marketing/HowItWorks";
import { Features } from "../components/marketing/Features";
import { DashboardPreview } from "../components/marketing/DashboardPreview";
import { Templates } from "../components/marketing/Templates";
import { Pricing } from "../components/marketing/Pricing";
import { CareerCenter } from "../components/marketing/CareerCenter";
import { SuccessStories } from "../components/marketing/SuccessStories";
import { FuturePremium } from "../components/marketing/FuturePremium";
import { CTA } from "../components/marketing/CTA";

export function LandingPage() {
  return (
    <main>
      <Hero />
      <MissionVision />
      <ValueProposition />
      <HowItWorks />
      <Features />
      <DashboardPreview />
      <Templates />
      <Pricing />
      <CareerCenter />
      <SuccessStories />
      <FuturePremium />
      <CTA />
    </main>
  );
}
