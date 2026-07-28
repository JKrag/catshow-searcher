import { orgMarkerColor } from "./OrgBadge";
import type { Candidate, WeekendAssessment } from "@/lib/organizer";

const CAP_KM = 1500;
const CHART_WIDTH = 800;
const CHART_HEIGHT = 360;
const MARGIN = { top: 24, right: 16, bottom: 40, left: 48 };
const PLOT_WIDTH = CHART_WIDTH - MARGIN.left - MARGIN.right;
const PLOT_HEIGHT = CHART_HEIGHT - MARGIN.top - MARGIN.bottom;

const STATUS_COLOR: Record<WeekendAssessment["status"], string> = {
  blocked: "var(--color-danger, #dc2626)",
  check: "var(--color-warning, #d97706)",
  clear: "var(--color-success, #16a34a)",
};

function weekendLabel(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  const month = d.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" });
  const day = d.getUTCDate();
  return `${month} ${day}`;
}

function yForKm(km: number): number {
  const clamped = Math.min(km, CAP_KM);
  return MARGIN.top + (clamped / CAP_KM) * PLOT_HEIGHT;
}

export interface OrganizerScatterProps {
  assessments: WeekendAssessment[];
  candidate: Candidate;
  selectedWeekend: string | null;
  onSelectWeekend: (weekend: string | null) => void;
}

export function OrganizerScatter({
  assessments,
  candidate,
  selectedWeekend,
  onSelectWeekend,
}: OrganizerScatterProps) {
  // assessCandidate returns one assessment per weekend in the window (empty
  // weekends included), so this only fires for an empty/invalid date window.
  if (assessments.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-gray-300 p-6 text-center text-sm text-gray-500">
        Pick a date window to see conflicts.
      </div>
    );
  }

  const columnWidth = PLOT_WIDTH / assessments.length;

  function toggleWeekend(weekend: string) {
    onSelectWeekend(selectedWeekend === weekend ? null : weekend);
  }

  return (
    <svg
      viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
      role="group"
      aria-label="Distance from candidate pin by weekend"
      className="w-full h-auto"
    >
      {/* Candidate window shading */}
      <rect
        x={MARGIN.left}
        y={MARGIN.top}
        width={PLOT_WIDTH}
        height={PLOT_HEIGHT}
        fill="var(--color-accent-soft, #f3f4f6)"
        opacity={0.4}
      />

      {/* Y axis gridlines + labels */}
      {[0, 400, 805, 1500].map((km) => (
        <g key={km}>
          <line
            x1={MARGIN.left}
            x2={MARGIN.left + PLOT_WIDTH}
            y1={yForKm(km)}
            y2={yForKm(km)}
            stroke="#e5e7eb"
            strokeWidth={1}
          />
          <text x={MARGIN.left - 8} y={yForKm(km) + 3} textAnchor="end" fontSize={10} fill="#6b7280">
            {km}
          </text>
        </g>
      ))}

      {/* Rule lines: 400 km for FIFe, 805 km for TICA — only for the candidate's own org */}
      {candidate.org === "FIFe" && (
        <line
          x1={MARGIN.left}
          x2={MARGIN.left + PLOT_WIDTH}
          y1={yForKm(400)}
          y2={yForKm(400)}
          stroke="var(--fife, #7c3aed)"
          strokeWidth={2}
          strokeDasharray="4 3"
          data-testid="rule-line-fife"
        />
      )}
      {candidate.org === "TICA" && (
        <line
          x1={MARGIN.left}
          x2={MARGIN.left + PLOT_WIDTH}
          y1={yForKm(805)}
          y2={yForKm(805)}
          stroke="var(--tica, #ea580c)"
          strokeWidth={2}
          strokeDasharray="4 3"
          data-testid="rule-line-tica"
        />
      )}

      {/* Weekend columns */}
      {assessments.map((wk, i) => {
        const x = MARGIN.left + i * columnWidth;
        const selected = wk.weekend === selectedWeekend;
        return (
          <g key={wk.weekend}>
            <rect
              x={x}
              y={MARGIN.top}
              width={columnWidth}
              height={PLOT_HEIGHT}
              fill={selected ? "rgba(37, 99, 235, 0.12)" : "transparent"}
              stroke={selected ? "#2563eb" : "transparent"}
              strokeWidth={selected ? 2 : 0}
              role="button"
              tabIndex={0}
              aria-pressed={selected}
              aria-label={`Weekend of ${weekendLabel(wk.weekend)}, status ${wk.status}`}
              onClick={() => toggleWeekend(wk.weekend)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  toggleWeekend(wk.weekend);
                }
              }}
              style={{ cursor: "pointer" }}
            />

            {/* Status indicator strip */}
            <rect
              x={x}
              y={MARGIN.top + PLOT_HEIGHT + 2}
              width={columnWidth - 2}
              height={4}
              fill={STATUS_COLOR[wk.status]}
            />

            {/* Weekend label */}
            <text
              x={x + columnWidth / 2}
              y={MARGIN.top + PLOT_HEIGHT + 20}
              textAnchor="middle"
              fontSize={10}
              fill="#374151"
            >
              {weekendLabel(wk.weekend)}
            </text>

            {/* Overflow label */}
            {wk.beyondCapCount > 0 && (
              <text
                x={x + columnWidth / 2}
                y={MARGIN.top - 8}
                textAnchor="middle"
                fontSize={10}
                fontWeight={600}
                fill="#6b7280"
              >
                +{wk.beyondCapCount} further away
              </text>
            )}

            {/* Dots — spread horizontally within the column to reduce overlap */}
            {wk.shows.map((a, dotIndex) => {
              const km = a.distance_km ?? CAP_KM;
              const hollow = a.show.geo_precision !== "venue";
              const color = orgMarkerColor(a.show.source);
              const inset = Math.min(columnWidth / 4, 14);
              const usableWidth = columnWidth - inset * 2;
              const cx =
                wk.shows.length > 1
                  ? x + inset + (dotIndex / (wk.shows.length - 1)) * usableWidth
                  : x + columnWidth / 2;
              const cy = yForKm(km);
              return (
                <circle
                  key={a.show.id}
                  cx={cx}
                  cy={cy}
                  r={5}
                  fill={hollow ? "white" : color}
                  stroke={color}
                  strokeWidth={hollow ? 2 : 1}
                  pointerEvents="none"
                >
                  <title>
                    {a.show.title} — {a.distance_km != null ? `${Math.round(a.distance_km)} km` : "distance unknown"} — {a.status}
                  </title>
                </circle>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
