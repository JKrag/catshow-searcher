# Show-weekend bucketing: which Saturday a weekday belongs to

The organizer view groups shows into "weekends" so TICA's same-weekend
separation rule and the scatter's weekend columns have a single, unambiguous
key. Each weekend is identified by its **Saturday** (ISO date). The open
question is which Saturday a show that does *not* start on Sat/Sun belongs to.

## Decision

Each Saturday owns a 7-day span running **Wednesday → the following Tuesday**:

| Show start day | Belongs to        | Offset to its Saturday |
|----------------|-------------------|------------------------|
| Wed            | upcoming weekend  | +3                     |
| Thu            | upcoming weekend  | +2                     |
| Fri            | upcoming weekend  | +1                     |
| **Sat**        | that weekend      | 0                      |
| Sun            | that weekend      | −1                     |
| Mon            | previous weekend  | −2                     |
| Tue            | previous weekend  | −3                     |

Equivalently: **Thursday & Friday attach to the upcoming weekend; Monday &
Tuesday attach to the previous weekend; Wednesday is grouped with Thu/Fri.**

## Why

Almost every cat show is a pure Saturday/Sunday event, but two real patterns
break that:

- **3-day shows starting Friday** (often Friday afternoon/evening). These belong
  to the weekend they run *into*, so Fri → upcoming Saturday. Thursday is
  included with Friday for the occasional Thu–Sun show.
- **Sunday/Monday shows over a holiday** — e.g. Easter Monday or a New-Year
  holiday, which are public holidays in many countries. These belong to the
  weekend they run *out of*, so Mon (and, defensively, Tue) → previous Saturday.

Wednesday has never been observed as a show start day. It is grouped with
Thu/Fri (upcoming weekend) purely so the partition is total and unambiguous —
every day maps to exactly one Saturday, with no gaps or overlaps.

This is deliberately generous at both edges ("split to be on the safe side"):
a Friday-start show is compared against the weekend it shares with Sat/Sun
shows, and a Monday-tail show against the weekend it actually overlapped, rather
than being pushed a full week away where it would collide with nothing.

## Consequences

- `weekendKey` in `src/lib/organizer.ts` implements the offset table above; it
  is the single source of truth used by `weekendsInWindow`,
  `findCandidateWeekendForDay`, and TICA weekend classification.
- The previous implementation mapped Mon–Thu forward to the *next* Saturday.
  The only behavioural change here is **Mon/Tue now map backward** to the
  previous Saturday; Wed/Thu/Fri/Sat/Sun are unchanged.
