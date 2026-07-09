import type { MetadataRoute } from "next";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.co";

// AI crawlers and answer-engine user-agents we explicitly welcome.
// Keep this list current — new ones appear every few months.
const AI_AGENTS = [
  // OpenAI
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  // Anthropic
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "anthropic-ai",
  // Perplexity
  "PerplexityBot",
  "Perplexity-User",
  // Google AI (separate from classic Googlebot)
  "Google-Extended",
  "GoogleOther",
  // Apple Intelligence / Siri
  "Applebot",
  "Applebot-Extended",
  // Common Crawl (trains most foundation models)
  "CCBot",
  // Amazon / Alexa / Rufus
  "Amazonbot",
  // Meta AI
  "Meta-ExternalAgent",
  "Meta-ExternalFetcher",
  "FacebookBot",
  // Microsoft Copilot (on top of Bingbot, which is allowed by default)
  "Bingbot",
  // DuckDuckGo Assist
  "DuckAssistBot",
  // You.com
  "YouBot",
  // Mistral
  "MistralAI-User",
  // Cohere
  "cohere-ai",
  "cohere-training-data-crawler",
  // ByteDance / Doubao
  "Bytespider",
  // xAI / Grok
  "xAI",
  // Diffbot (feeds many LLMs)
  "Diffbot",
  // Timpi / Kagi / Brave Search
  "Timpibot",
  "PetalBot",
];

const COMING_SOON = process.env.COMING_SOON === "1";

const DISALLOWED_PATHS = COMING_SOON
  ? [
      // Coming-soon mode: only /, /contact, /privacy, /terms are crawlable.
      // /coming-soon is disallowed so / stays the one canonical teaser URL.
      "/api/",
      "/dashboard/",
      "/sign-in",
      "/sign-up",
      "/about",
      "/pricing",
      "/blog",
      "/coming-soon",
    ]
  : [
      "/api/",
      "/dashboard/",
      "/sign-in",
      "/sign-up",
    ];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      // Every AI agent we know of gets an explicit, permissive rule.
      ...AI_AGENTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOWED_PATHS,
      })),
      // Everyone else — classic search crawlers, misc bots — same deal.
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOWED_PATHS,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
