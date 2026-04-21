import { Hero } from "./components/Hero";
import Features from "@/app/components/Features";
import { CTA } from "@/app/components/CTA";
import { Navigation } from "@/app/components/Navigation";
import { Footer } from "@/app/components/Footer";

export default function Page() {
  return (
    <>
      <Navigation />
      <Hero />
      <Features />
      <CTA />
      <Footer />
    </>
  );
}
