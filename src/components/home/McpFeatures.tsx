"use client";
import { EdgeCalculator } from "@/components/home/EdgeCalculator";

const PROOF = [
  { value: "<10s", label: "To a clear verdict" },
  { value: "Any market", label: "Link or screenshot" },
  { value: "2 apps", label: "Claude & ChatGPT" },
  { value: "2 min", label: "To connect" },
];

export function McpFeatures() {
  return (
    <section id="features" className="bg-white py-20 md:py-28">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="grid grid-cols-2 gap-4 overflow-hidden rounded-2xl border border-[#e3e3e3] bg-[#f7f7f7] px-4 py-6 sm:grid-cols-4 sm:px-8">
          {PROOF.map((p) => (
            <div key={p.label} className="text-center">
              <p className="font-display text-2xl font-semibold tracking-[-0.02em] text-[#0d0d0d] md:text-3xl">
                {p.value}
              </p>
              <p className="mt-1 text-[12px] font-medium uppercase tracking-wide text-[#a3a3a3]">
                {p.label}
              </p>
            </div>
          ))}
        </div>

        <div className="mt-16">
          <EdgeCalculator />
        </div>
      </div>
    </section>
  );
}
