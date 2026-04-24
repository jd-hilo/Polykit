// Standalone smoke-test for `resolveBestMarket`.
//
// Runs hand-crafted vision signals through the multi-strategy resolver and
// prints the top candidates + scores + final pick. No OpenAI / Next.js.
//
// Usage:
//   npx tsx scripts/test-resolve.ts
//   npx tsx scripts/test-resolve.ts "custom question"
//
// Notes:
//   - LLM-picker is SKIPPED here (no client passed) so we see the raw
//     scoring behaviour. The resolver falls back to the top-scoring
//     candidate above MIN_ACCEPT when there's no LLM.

import { resolveBestMarket, type VisionSignals } from "../src/lib/polymarket";

type Case = {
  name: string;
  vis: VisionSignals;
  expectNull?: boolean;
};

const CASES: Case[] = [
  {
    name: "Iran peace deal (the user's failing case)",
    vis: {
      question: "Will US and Iran sign a permanent peace deal?",
      slug_guess: "us-iran-permanent-peace-deal",
      keywords: ["Iran", "US", "peace", "deal", "2026"],
      visible_outcomes: [],
    },
  },
  {
    name: "2028 US presidential election (multi-market event)",
    vis: {
      question: "Who will win the 2028 US presidential election",
      slug_guess: "who-will-win-the-2028-us-presidential-election",
      keywords: ["2028", "presidential", "election", "US"],
      visible_outcomes: ["Trump", "Vance", "Newsom", "Ocasio-Cortez"],
    },
  },
  {
    name: "Bitcoin $150k by end of 2026",
    vis: {
      question: "Will Bitcoin hit $150k by end of 2026",
      slug_guess: "bitcoin-150k-2026",
      keywords: ["Bitcoin", "150k", "2026"],
      visible_outcomes: [],
    },
  },
  {
    name: "Garbage input",
    vis: {
      question: "asdf asdf asdf",
      slug_guess: "asdf-asdf-asdf",
      keywords: ["asdf", "asdfff", "zzzzxy"],
      visible_outcomes: [],
    },
    expectNull: true,
  },
];

function fmt(s: string, n: number) {
  return s.length > n ? s.slice(0, n - 1) + "…" : s.padEnd(n, " ");
}

async function run() {
  const argq = process.argv[2];
  const cases = argq
    ? [{ name: "CLI arg", vis: { question: argq, keywords: argq.split(/\s+/).filter(Boolean) } }]
    : CASES;

  for (const c of cases) {
    console.log("\n════════════════════════════════════════════════════════════");
    console.log(`CASE: ${c.name}`);
    console.log(`  question: ${c.vis.question ?? "(none)"}`);
    console.log(`  slug_guess: ${c.vis.slug_guess ?? "(none)"}`);
    console.log(`  keywords: ${JSON.stringify(c.vis.keywords ?? [])}`);
    console.log("────────────────────────────────────────────────────────────");

    const t0 = Date.now();
    const { snapshot, debug } = await resolveBestMarket(c.vis, { openaiClient: null });
    const dt = Date.now() - t0;

    console.log(`Top ${Math.min(5, debug.candidates.length)} candidates (of ${debug.candidates.length}):`);
    for (const cand of debug.candidates.slice(0, 5)) {
      console.log(
        `  [${fmt(cand.strategy, 10)}] score=${String(cand.score).padStart(3, " ")} ` +
          `[q=${cand.breakdown.questionSim} k=${cand.breakdown.keywordCov} ` +
          `p=${cand.breakdown.priceMatch} d=${cand.breakdown.dateMatch}] ` +
          `${fmt(cand.question, 80)}  slug=${cand.slug}`,
      );
    }

    console.log("");
    if (snapshot) {
      console.log(
        `FINAL: slug=${snapshot.slug} score=${debug.score} strategy=${debug.strategy} ` +
          `event=${snapshot.eventSlug ?? "(none)"} siblings=${snapshot.siblings.length}`,
      );
      console.log(`       question="${snapshot.question}"`);
    } else {
      console.log("FINAL: null (no match)");
    }
    if (c.expectNull) {
      console.log(`EXPECTED null? ${snapshot === null ? "PASS" : "FAIL"}`);
    }
    console.log(`(took ${dt}ms)`);
  }
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
