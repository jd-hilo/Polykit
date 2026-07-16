import type { Metadata } from "next";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { PricingCard } from "@/components/home/PricingCard";
import { FAQ } from "@/components/home/FAQ";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";

export const metadata: Metadata = {
  title: "Pricing — Polykit MCP",
  description: "One plan for full MCP access. $1 first month, then $39/mo.",
  alternates: { canonical: `${SITE_URL}/pricing` },
};

export default function Pricing() {
  return (
    <>
      <Nav />
      <main className="pt-14">
        <PricingCard />
        <FAQ />
      </main>
      <Footer />
    </>
  );
}
