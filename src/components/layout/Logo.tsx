import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  size = 32,
  showText = true,
  light = false,
}: {
  className?: string;
  size?: number;
  showText?: boolean;
  light?: boolean;
}) {
  const inner = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Polykit"
        width={size}
        height={size}
        className={cn(
          "rounded-xl",
          light ? "ring-1 ring-white/20" : "shadow-sm ring-1 ring-black/5",
        )}
      />
      {showText && (
        <span
          className={cn(
            "font-display text-lg font-semibold tracking-[-0.02em]",
            light ? "text-white" : "text-[#0d0d0d]",
          )}
        >
          Polykit
        </span>
      )}
    </>
  );

  if (className?.includes("pointer-events-none")) {
    return <div className={cn("flex items-center gap-2.5", className)}>{inner}</div>;
  }

  return (
    <Link href="/" className={cn("flex items-center gap-2.5 transition-opacity hover:opacity-90", className)}>
      {inner}
    </Link>
  );
}
