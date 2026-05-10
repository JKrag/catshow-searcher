"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const PERSONAS = [
  { href: "/", label: "Visitor" },
  { href: "/exhibitor", label: "Exhibitor" },
  { href: "/organizer", label: "Organizer" },
] as const;

export function PersonaNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-border bg-[var(--surface)] text-xs">
      <div className="max-w-[1400px] mx-auto px-4 flex">
        {PERSONAS.map(({ href, label }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 border-b-2 transition-colors ${
                active
                  ? "border-[var(--primary)] text-foreground font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
