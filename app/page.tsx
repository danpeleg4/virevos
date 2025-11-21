import { Hero } from "./components/Hero";
import Features from "@/app/components/Features";
import { Pricing } from "./components/Pricing";
import { Testimonials } from "./components/Testimonials";
import { CTA } from "./components/CTA";
import {Navigation} from "@/app/components/Navigation";
import {Footer} from "@/app/components/Footer";

export default function Page() {
  return (
    <>
        <Navigation />
      <Hero />
      <Features />
      <Pricing />
      <Testimonials />
      <CTA />
        <Footer />
    </>
  );
}
//