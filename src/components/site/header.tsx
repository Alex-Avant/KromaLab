"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SearchIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { nav } from "@/lib/site";
import { useUiStore } from "@/store/ui-store";
import { BrandMark } from "@/components/site/brand-mark";

export function Header() {
  const pathname = usePathname();
  const setCommandOpen = useUiStore((s) => s.setCommandOpen);

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/85 backdrop-blur-sm">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="shrink-0 rounded-xs focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="KromaLab — inicio"
        >
          <BrandMark />
        </Link>

        <nav aria-label="Principal" className="hidden items-center gap-1 sm:flex">
          {nav.map((item) => {
            const active =
              item.href !== "/#instrumentos" &&
              item.href !== "/#guias" &&
              pathname.startsWith(item.href.split("#")[0]);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "whitespace-nowrap rounded-xs px-2 py-1.5 text-xs transition-colors duration-150 sm:px-3 sm:text-sm",
                  active
                    ? "text-foreground bg-surface"
                    : "text-muted-foreground hover:text-foreground hover:bg-surface"
                )}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <span className="hidden items-center gap-2 lg:flex" aria-hidden="true">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-primary" />
            </span>
            <span className="tech-value text-[10px] tracking-[0.18em] text-muted-foreground">
              OPERATIVO
            </span>
          </span>
          <button
            type="button"
            onClick={() => setCommandOpen(true)}
            className="inline-flex h-8 items-center gap-2 rounded-xs border border-border bg-surface px-2.5 text-muted-foreground transition-colors duration-150 hover:bg-surface-raised hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
            aria-label="Abrir paleta de comandos"
          >
            <SearchIcon className="size-3.5" aria-hidden="true" />
            <span className="tech-value text-xs sm:hidden">MENÚ</span>
            <span className="tech-value hidden text-xs sm:inline">⌘K</span>
          </button>
        </div>
      </div>
    </header>
  );
}
