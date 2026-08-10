import Link from "next/link";
import { Logo } from "@/components/layout/Logo";

export function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#0d0d0d] py-16 text-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-10 px-6 md:flex-row md:justify-between md:px-10">
        <div>
          <Logo size={36} light />
          <p className="mt-4 max-w-xs text-sm leading-relaxed text-white/55">
            MCP server for Polymarket analysis. Not affiliated with Polymarket.
          </p>
        </div>
        <div className="flex gap-16 text-sm">
          <ul className="space-y-2.5">
            <li>
              <Link href="/mcp" className="footer-link">
                MCP setup
              </Link>
            </li>
            <li>
              <Link href="/pricing" className="footer-link">
                Pricing
              </Link>
            </li>
            <li>
              <Link href="/dashboard" className="footer-link">
                Dashboard
              </Link>
            </li>
            <li>
              <Link href="/terms" className="footer-link">
                Terms
              </Link>
            </li>
            <li>
              <Link href="/privacy" className="footer-link">
                Privacy
              </Link>
            </li>
          </ul>
          <ul className="space-y-2.5">
            <li>
              <a href="mailto:jd@hilo.media" className="footer-link">
                Support
              </a>
            </li>
            <li>
              <Link href="/blog" className="footer-link">
                Blog
              </Link>
            </li>
            <li>
              <a href="/llms.txt" className="footer-link">
                llms.txt
              </a>
            </li>
          </ul>
        </div>
      </div>
      <div className="mx-auto mt-12 max-w-6xl px-6 text-center text-xs text-white/35 md:px-10 md:text-left">
        © {new Date().getFullYear()} Hilo LLC
      </div>
    </footer>
  );
}
