import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import Features from "@/components/Features";
import Pricing from "@/components/Pricing";
import PortalHub from "@/components/PortalHub";
import Docs from "@/components/Docs";
import Footer from "@/components/Footer";

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <Navbar />
      <main>
        <Hero />
        <Features />
        <Pricing />
        <PortalHub />
        <Docs />
      </main>
      <Footer />
    </div>
  );
}
