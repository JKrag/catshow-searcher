# catz

A unified finder for FIFe and TICA cat shows, so exhibitors (and curious
visitors) can discover shows in one place instead of two federation calendars.

## Language

### Personas

**Exhibitor**:
A person who enters cats in shows. The primary user of the product.
_Avoid_: breeder (not all exhibitors breed), user

**Visitor**:
A member of the public attending a show as a spectator. Secondary persona.
_Avoid_: guest, spectator

**Organizer**:
A club member planning a future show who needs to see how crowded the calendar
is around a candidate date. Not yet served.

### Organisations

**FIFe**:
Fédération Internationale Féline — European-centric federation whose show
calendar is the app's first data source.

**TICA**:
The International Cat Association — federation whose calendar is organised by
Season, the app's second data source.

**Season**:
TICA's show year, running 1 May of year N to 30 April of year N+1. TICA
calendars are navigated by Season, not calendar year.

### Core concepts

**Show**:
A single cat show event belonging to exactly one organisation (FIFe or TICA).
_Avoid_: event, exhibition

**Judge**:
A person officiating at a Show. Currently only known for TICA shows, and only
once that show's Show detail has been fetched.

**Show detail**:
Per-show enrichment beyond the calendar listing: show type/format, Judges,
flyer or website link. Acquired separately (and later) than the calendar entry
itself.

**Home**:
The user's own address, used to compute travel distance to Shows. Lives only in
the user's browser.
_Avoid_: location, origin

## Example dialogue

> **Dev:** A user says the judge filter shows nothing.
> **Domain expert:** Which shows were they filtering? Judges are only known for
> TICA shows, and only after the Show detail has been fetched — a Show fresh
> from the calendar scrape has no Judges yet. And remember TICA publishes by
> Season, so a show "next year" may be in the current Season.
