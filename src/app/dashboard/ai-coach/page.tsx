"use client";
import { Send, Trash2, ExternalLink, Loader2, ChevronDown, History } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type Prompt = { label: string; prompt: string };

const PROMPTS_NO_POSITIONS: Prompt[] = [
  {
    label: "What are the best bets right now?",
    prompt:
      "What are the 3 best prediction market bets right now? For each give me: the market, your probability estimate vs market price, exact entry price, position size as % of bankroll, take profit, stop loss, and the key risk.",
  },
  {
    label: "Find me a bet where I risk little but win big",
    prompt:
      "Find me a prediction market where I can risk $1 to make $5+. I want an asymmetric payoff where the downside is capped but the upside is significant if a specific catalyst hits. Be specific.",
  },
  {
    label: "How much should I bet on each trade?",
    prompt:
      "Teach me how to use Kelly criterion for prediction market sizing. Use a real example with actual numbers. Show me how to calculate it and why most people should use half-Kelly.",
  },
  {
    label: "Where is the market getting it wrong?",
    prompt:
      "Find me a prediction market where the odds are significantly wrong. Walk me through your reasoning: what's the market pricing, what should the true probability be, and why is the market wrong?",
  },
  {
    label: "What bets can make me $500 this week?",
    prompt:
      "What are the best prediction market bets right now that could turn $100 into $500+? Give me your top 3 plays with entry prices, position sizes, and why each one is a winner.",
  },
  {
    label: "Build me a winning portfolio",
    prompt:
      "I have $500 to start trading prediction markets. Build me a portfolio that maximizes my profits. Include position sizes, entry prices, and why each bet has edge. I want to win big.",
  },
  {
    label: "Where is smart money going right now?",
    prompt:
      "Where are the biggest whales and smartest traders putting their money right now? Find me the trades where insiders know something the market doesn't.",
  },
  {
    label: "Find me a 5x bet",
    prompt:
      "Find me a prediction market where I can turn $50 into $250+. I want a high-conviction asymmetric bet where the upside is massive if it hits. Be specific with the play.",
  },
];

const PROMPTS_WITH_POSITIONS: Prompt[] = [
  {
    label: "Should I hold or sell my bets?",
    prompt:
      "Review all my open positions one by one. For each: give me the current edge estimate, whether the thesis still holds, a specific take-profit and stop-loss level, and your final verdict (hold/add/exit). Be brutally honest.",
  },
  {
    label: "What should I do with my $X?",
    prompt:
      "I have $X available. Give me a portfolio allocation plan across my best opportunities right now. Use half-Kelly sizing, account for correlation between bets, and tell me the expected value of the whole portfolio.",
  },
  {
    label: "Do any of my bets cancel each other out?",
    prompt:
      "Look at my current positions and tell me if I have any concentration risk or correlation risk. Are any of my bets effectively the same bet? Should I hedge anything?",
  },
  {
    label: "Find me a cheap bet with big upside",
    prompt:
      "Find me a prediction market bet I can make for under $50 with at least 3x upside. Give me entry price, sizing, and the key reason it wins.",
  },
  {
    label: "At what price should I sell each bet?",
    prompt:
      "For each of my open positions, give me exact exit prices — both take-profit and stop-loss. Factor in current momentum, time decay, and upcoming catalysts. I want specific numbers, not ranges.",
  },
];

type Citation = { title: string; url: string };

type Msg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  display?: string;
  created_at?: string;
  citations?: Citation[];
};

type Conversation = {
  id: string;
  firstUserMsg: Msg;
  lastMsgAt: number;
  messages: Msg[];
};

const CONVO_GAP_MS = 30 * 60 * 1000; // 30 min silence = new conversation

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

// Group the flat message history into conversations separated by 30-min gaps.
// The MOST RECENT conversation is returned first.
function groupIntoConversations(msgs: Msg[]): Conversation[] {
  if (msgs.length === 0) return [];
  const groups: Msg[][] = [];
  let current: Msg[] = [];
  let lastTs: number | null = null;
  for (const m of msgs) {
    const ts = m.created_at ? new Date(m.created_at).getTime() : 0;
    if (lastTs !== null && ts - lastTs > CONVO_GAP_MS && current.length > 0) {
      groups.push(current);
      current = [];
    }
    current.push(m);
    lastTs = ts;
  }
  if (current.length > 0) groups.push(current);

  return groups
    .map((g) => {
      const firstUser = g.find((m) => m.role === "user") ?? g[0];
      const lastTs = g[g.length - 1]?.created_at
        ? new Date(g[g.length - 1].created_at as string).getTime()
        : 0;
      return {
        id: g[0].id,
        firstUserMsg: firstUser,
        lastMsgAt: lastTs,
        messages: g,
      };
    })
    .sort((a, b) => b.lastMsgAt - a.lastMsgAt);
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return "just now";
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return new Date(ts).toLocaleDateString();
}

export default function AICoach() {
  const [input, setInput] = useState("");
  // Messages persisted from past sessions (loaded from API once on mount).
  const [history, setHistory] = useState<Msg[]>([]);
  // Messages for the active session (started when user sends).
  const [active, setActive] = useState<Msg[]>([]);
  const [busy, setBusy] = useState(false);
  const [hasPositions, setHasPositions] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [expandedConvo, setExpandedConvo] = useState<string | null>(null);
  const activeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/coach")
      .then((r) => r.json())
      .then((d) => setHistory(Array.isArray(d.messages) ? d.messages : []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/positions")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        const positions: Array<{ status?: string }> = d?.positions ?? [];
        setHasPositions(positions.some((p) => p.status === "open"));
      })
      .catch(() => setHasPositions(false));
  }, []);

  useEffect(() => {
    activeRef.current?.scrollTo({ top: activeRef.current.scrollHeight });
  }, [active]);

  const prompts = useMemo(
    () => (hasPositions ? PROMPTS_WITH_POSITIONS : PROMPTS_NO_POSITIONS),
    [hasPositions],
  );

  const conversations = useMemo(() => groupIntoConversations(history), [history]);

  async function send(text: string, displayOverride?: string) {
    const trimmed = text.trim();
    if (!trimmed || busy) return;
    setBusy(true);

    const tempId = `tmp-${Date.now()}`;
    setActive((m) => [
      ...m,
      { id: tempId, role: "user", content: trimmed, display: displayOverride },
    ]);
    setInput("");

    try {
      const res = await fetch("/api/coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.message) {
        setActive((m) => [...m, data.message as Msg]);
      } else {
        setActive((m) => [
          ...m,
          {
            id: `err-${Date.now()}`,
            role: "assistant",
            content: data?.error ?? "Something went wrong.",
          },
        ]);
      }
    } finally {
      setBusy(false);
    }
  }

  async function clearAllChats() {
    if (clearing) return;
    if (!confirm("Clear all past conversations? This cannot be undone.")) return;
    setClearing(true);
    try {
      await fetch("/api/coach", { method: "DELETE" });
      setHistory([]);
      setExpandedConvo(null);
    } finally {
      setClearing(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col items-center pb-12">
      {/* Starter — always shown on page load */}
      <h2 className="mt-16 text-4xl font-extrabold tracking-tight md:text-5xl">
        What&apos;s the play?
      </h2>
      <p className="mt-3 text-sm text-muted-foreground">
        Live Polymarket data + your positions feed every answer.
      </p>
      <div className="mt-10 grid w-full gap-3 sm:grid-cols-2">
        {prompts.map((p) => (
          <button
            key={p.label}
            onClick={() => send(p.prompt, p.label)}
            disabled={busy}
            className="rounded-2xl border border-border bg-white p-4 text-left text-sm transition hover:border-primary hover:bg-primary/5 disabled:opacity-60"
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div className="mt-8 w-full">
        <div className="flex items-center gap-2 rounded-2xl border border-border bg-white p-2">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
            placeholder={busy ? "Coach is thinking…" : "Ask anything — live data included…"}
            disabled={busy}
            className="flex-1 bg-transparent px-3 py-2 text-sm outline-none disabled:opacity-60"
          />
          <button
            onClick={() => send(input)}
            disabled={busy || !input.trim()}
            className="grid h-9 w-9 place-items-center rounded-full bg-primary text-white hover:brightness-110 disabled:opacity-50"
            title="Send"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
          </button>
        </div>
      </div>

      {/* Active session — appears once user sends */}
      {active.length > 0 && (
        <div className="mt-8 w-full">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            This conversation
          </div>
          <div
            ref={activeRef}
            className="flex w-full flex-col gap-3 overflow-y-auto rounded-2xl border border-border bg-muted/30 p-3"
            style={{ maxHeight: "55vh" }}
          >
            {active.map((m) => (
              <MessageBubble key={m.id} msg={m} />
            ))}
            {busy && (
              <div className="mr-auto inline-flex max-w-[85%] items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
                <Loader2 size={14} className="animate-spin" /> Pulling live data…
              </div>
            )}
          </div>
        </div>
      )}

      {/* Past conversations */}
      {conversations.length > 0 && (
        <div className="mt-10 w-full">
          <div className="mb-3 flex items-center justify-between">
            <div className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              <History size={14} /> Past chats ({conversations.length})
            </div>
            <button
              onClick={clearAllChats}
              disabled={clearing}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-white px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              {clearing ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
              Clear all
            </button>
          </div>

          <div className="flex flex-col gap-2">
            {conversations.map((c) => {
              const expanded = expandedConvo === c.id;
              const preview =
                c.firstUserMsg.display ??
                c.firstUserMsg.content.slice(0, 120) +
                  (c.firstUserMsg.content.length > 120 ? "…" : "");
              return (
                <div
                  key={c.id}
                  className="rounded-2xl border border-border bg-white transition"
                >
                  <button
                    onClick={() => setExpandedConvo(expanded ? null : c.id)}
                    className="flex w-full items-start justify-between gap-3 p-4 text-left hover:bg-muted/40"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-semibold">{preview}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        {c.messages.length} {c.messages.length === 1 ? "message" : "messages"} ·{" "}
                        {timeAgo(c.lastMsgAt)}
                      </div>
                    </div>
                    <ChevronDown
                      size={16}
                      className={`mt-1 flex-none text-muted-foreground transition ${expanded ? "rotate-180" : ""}`}
                    />
                  </button>
                  {expanded && (
                    <div className="flex flex-col gap-3 border-t border-border bg-muted/20 p-3">
                      {c.messages.map((m) => (
                        <MessageBubble key={m.id} msg={m} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Scoped markdown styles */}
      <style jsx global>{`
        .coach-markdown {
          line-height: 1.55;
          color: rgb(20, 24, 31);
        }
        .coach-markdown > *:first-child {
          margin-top: 0;
        }
        .coach-markdown > *:last-child {
          margin-bottom: 0;
        }
        .coach-markdown p {
          margin: 0 0 0.6rem 0;
        }
        .coach-markdown h1,
        .coach-markdown h2,
        .coach-markdown h3,
        .coach-markdown h4 {
          font-weight: 700;
          margin: 0.9rem 0 0.4rem 0;
          font-size: 0.95rem;
          line-height: 1.3;
        }
        .coach-markdown h1 {
          font-size: 1.05rem;
        }
        .coach-markdown ul {
          list-style: disc;
          margin: 0.3rem 0 0.6rem 1.25rem;
          padding: 0;
        }
        .coach-markdown ol {
          list-style: decimal;
          margin: 0.3rem 0 0.6rem 1.4rem;
          padding: 0;
        }
        .coach-markdown li {
          margin: 0.15rem 0;
        }
        .coach-markdown li > p {
          margin: 0;
        }
        .coach-markdown strong {
          font-weight: 700;
          color: rgb(20, 24, 31);
        }
        .coach-markdown em {
          font-style: italic;
        }
        .coach-markdown code {
          background: rgba(243, 244, 246, 0.9);
          padding: 0.05rem 0.35rem;
          border-radius: 4px;
          font-size: 0.85em;
          font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        }
        .coach-markdown pre {
          background: rgba(243, 244, 246, 0.9);
          padding: 0.6rem 0.8rem;
          border-radius: 8px;
          overflow-x: auto;
          margin: 0.5rem 0;
        }
        .coach-markdown pre code {
          background: transparent;
          padding: 0;
        }
        .coach-markdown a {
          color: rgb(36, 99, 235);
          text-decoration: underline;
        }
        .coach-markdown table {
          border-collapse: collapse;
          margin: 0.5rem 0;
          font-size: 0.85rem;
          width: 100%;
        }
        .coach-markdown th,
        .coach-markdown td {
          border: 1px solid rgba(229, 231, 235, 0.9);
          padding: 0.35rem 0.6rem;
          text-align: left;
        }
        .coach-markdown th {
          background: rgba(243, 244, 246, 0.6);
          font-weight: 600;
        }
        .coach-markdown blockquote {
          border-left: 3px solid rgba(36, 99, 235, 0.35);
          padding-left: 0.75rem;
          color: rgb(75, 85, 99);
          margin: 0.5rem 0;
        }
        .coach-markdown hr {
          border: 0;
          border-top: 1px solid rgba(229, 231, 235, 0.8);
          margin: 0.8rem 0;
        }
      `}</style>
    </div>
  );
}

function MessageBubble({ msg }: { msg: Msg }) {
  if (msg.role === "user") {
    return (
      <div className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl bg-primary px-4 py-3 text-sm text-white">
        {msg.display ?? msg.content}
      </div>
    );
  }
  return (
    <div className="mr-auto max-w-[90%] rounded-2xl border border-border bg-white px-4 py-3 text-sm">
      <div className="coach-markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
      </div>
      {msg.citations && msg.citations.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-2">
          {msg.citations.map((c, i) => (
            <a
              key={i}
              href={c.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-primary/10 hover:text-primary"
              title={c.title}
            >
              <span className="tabular-nums">[{i + 1}]</span>
              <span className="max-w-[160px] truncate">{hostnameOf(c.url)}</span>
              <ExternalLink size={10} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
