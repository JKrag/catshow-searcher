import type { Org } from "@/lib/types";

export function OrgBadge({ org, className = "" }: { org: Org; className?: string }) {
  const styles =
    org === "FIFe"
      ? "bg-[var(--fife-soft)] text-[var(--fife-fg)] ring-[var(--fife)]/30"
      : "bg-[var(--tica-soft)] text-[var(--tica-fg)] ring-[var(--tica)]/30";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles} ${className}`}
    >
      {org}
    </span>
  );
}

export function orgMarkerColor(org: Org): string {
  // Purple for FIFe, warm orange for TICA — consistent with the palette.
  return org === "FIFe" ? "#7c3aed" : "#ea580c";
}
