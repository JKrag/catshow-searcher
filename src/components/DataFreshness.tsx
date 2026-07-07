"use client";

import { formatDistanceToNow } from "date-fns";

interface Props {
  updatedAt?: string;
  stale?: boolean;
}

export function DataFreshness({ updatedAt, stale }: Props) {
  if (!updatedAt) return null;

  const absolute = new Date(updatedAt);
  // Guard against invalid or epoch-zero timestamps (store default when never scraped)
  if (isNaN(absolute.getTime()) || absolute.getTime() === 0) return null;

  const relative = formatDistanceToNow(absolute, { addSuffix: true });
  const absoluteLabel = absolute.toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <span
      title={`Data last updated: ${absoluteLabel}`}
      className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full ring-1 ${
        stale
          ? "bg-amber-100 dark:bg-amber-950/40 ring-amber-300/70 dark:ring-amber-700/50 text-amber-700 dark:text-amber-300"
          : "bg-[var(--muted-soft)] ring-border text-muted-foreground"
      }`}
    >
      <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-current opacity-60" />
      Updated {relative}
    </span>
  );
}
