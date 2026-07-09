import type { Metadata } from "next";
import Link from "next/link";
import { Mail } from "lucide-react";

export const metadata: Metadata = {
  title: "Contact — Polykit",
  description: "Get in touch with the Polykit team.",
};

export default function ContactPage() {
  return (
    <section className="relative overflow-hidden">
      <div
        className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-20 text-white"
        style={{
          background:
            "linear-gradient(180deg, #1d4ed8 0%, #1e4fd6 35%, #3b74ef 70%, #93b6ff 90%, #ffffff 100%)",
        }}
      >
        <div className="card-premium relative w-full max-w-md border-slate-200 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border-2 border-blue-100 bg-blue-50">
            <Mail className="text-[#2463eb]" size={28} strokeWidth={2.2} />
          </div>

          <h1 className="font-extrabold tracking-tight text-slate-900 text-3xl md:text-4xl">
            Get in touch
          </h1>

          <p className="mx-auto mt-4 max-w-sm text-base text-slate-600">
            Questions, feedback, or just want to say hi? We read everything.
          </p>

          <a href="mailto:hello@hilo.media" className="btn-primary btn-primary-lg mt-8">
            hello@hilo.media
          </a>

          <p className="mt-8 text-sm text-slate-500">
            Polykit is a product of Hilo LLC.
          </p>

          <nav className="mt-6 flex items-center justify-center gap-4 text-sm font-medium text-[#2463eb]">
            <Link href="/" className="transition hover:underline">
              Home
            </Link>
            <span className="text-slate-300">|</span>
            <Link href="/privacy" className="transition hover:underline">
              Privacy
            </Link>
            <span className="text-slate-300">|</span>
            <Link href="/terms" className="transition hover:underline">
              Terms
            </Link>
          </nav>
        </div>
      </div>
    </section>
  );
}
