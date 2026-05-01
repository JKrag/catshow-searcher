import type { Org } from "@/lib/types";

export function OrgBadge({ org, className = "" }: { org: Org; className?: string }) {
  const styles =
    org === "FIFe"
      ? "bg-blue-100 text-blue-900 ring-blue-300 dark:bg-blue-950 dark:text-blue-200 dark:ring-blue-800"
      : "bg-rose-100 text-rose-900 ring-rose-300 dark:bg-rose-950 dark:text-rose-200 dark:ring-rose-800";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold ring-1 ring-inset ${styles} ${className}`}
    >
      {org}
    </span>
  );
}

export function orgMarkerColor(org: Org): string {
  return org === "FIFe" ? "#1d4ed8" : "#be123c";
}
