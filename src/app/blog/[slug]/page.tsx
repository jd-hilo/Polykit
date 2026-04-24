import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { Nav } from "@/components/layout/Nav";
import { Footer } from "@/components/layout/Footer";
import { POSTS } from "@/lib/blog";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://polykit.io";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) {
    return {
      title: "Post Not Found — Polykit",
      description: "The requested blog post could not be found.",
    };
  }

  const url = `${SITE_URL}/blog/${post.slug}`;
  const title = `${post.title} — Polykit`;

  return {
    title,
    description: post.desc,
    keywords: post.keywords,
    openGraph: {
      type: "article",
      url,
      siteName: "Polykit",
      title,
      description: post.desc,
      publishedTime: new Date(post.date).toISOString(),
      authors: ["Polykit"],
      tags: post.keywords,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: post.desc,
    },
    alternates: { canonical: url },
  };
}

export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = POSTS.find((p) => p.slug === slug);
  if (!post) notFound();
  const related = POSTS.filter((p) => p.slug !== slug).slice(0, 3);

  const url = `${SITE_URL}/blog/${post.slug}`;
  const publishedISO = new Date(post.date).toISOString();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.desc,
    datePublished: publishedISO,
    dateModified: publishedISO,
    author: {
      "@type": "Organization",
      name: "Polykit",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: "Polykit",
      url: SITE_URL,
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": url,
    },
    keywords: post.keywords.join(", "),
    url,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <AnnouncementBar />
      <Nav />
      <article className="mx-auto max-w-2xl px-4 py-16">
        <div className="text-xs text-muted-foreground">
          {post.date} · {post.read}
        </div>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight md:text-5xl">
          {post.title}
        </h1>
        <div className="mt-8 h-64 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-transparent" />
        <div className="prose prose-slate mt-10 max-w-none text-foreground/90">
          <p className="text-lg leading-relaxed">{post.desc}</p>

          {post.body.map((section, idx) => (
            <section key={idx}>
              <h2 className="mt-8 text-2xl font-bold">{section.h2}</h2>
              {section.paras.map((para, pIdx) => (
                <p key={pIdx} className="mt-4 leading-relaxed">
                  {para}
                </p>
              ))}

              {idx === Math.floor(post.body.length / 2) - 1 && (
                <div className="my-10 rounded-2xl border-2 border-primary/30 bg-primary/5 p-6 not-prose">
                  <div className="flex items-start gap-3">
                    <Sparkles className="mt-0.5 text-primary" />
                    <div>
                      <div className="font-bold">
                        See how Polykit analyzes this in seconds
                      </div>
                      <Link
                        href="/dashboard"
                        className="mt-3 inline-flex btn-primary"
                      >
                        Try the Analyzer <ArrowRight size={14} />
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </section>
          ))}
        </div>

        <div className="mt-14 rounded-3xl bg-primary p-8 text-center text-white">
          <div className="text-2xl font-extrabold">Ready to try it?</div>
          <Link href="/dashboard" className="btn-white mt-5">
            Try it for $39 <ArrowRight size={14} />
          </Link>
          <p className="mt-4 text-xs opacity-80">
            Trusted by traders analyzing 1000+ markets weekly
          </p>
        </div>

        <div className="mt-14">
          <div className="text-xs font-bold uppercase tracking-widest text-muted-foreground">
            Continue Reading
          </div>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.slug}
                href={`/blog/${r.slug}`}
                className="rounded-2xl border border-border bg-white p-4 text-sm transition hover:border-primary"
              >
                <div className="font-bold">{r.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{r.desc}</div>
              </Link>
            ))}
          </div>
        </div>
      </article>
      <Footer />
    </>
  );
}
