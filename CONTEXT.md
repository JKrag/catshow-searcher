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

### Organizer planning

**Blast radius**:
The separation zone around a show inside which another show on the colliding
date unit is restricted: FIFe = 400 km by road on the same day (hard rule,
Show Rules §1.4); TICA = 500 miles / 805 km or same region on the same weekend
(softer, Regional-Director-gated, TICA 22.1.2).
_Avoid_: exclusion zone, conflict circle

**Show weekend**:
The date unit shows compete on. Most shows land on Sat/Sun; TICA's separation
rule counts collisions per weekend, FIFe's per exact day.

**Candidate**:
The show being planned: a location pin plus a from–to date window, evaluated
against all existing Shows. The organizer's federation (FIFe / TICA / other)
determines which Blast radius applies — "other" means none.
_Avoid_: draft show, proposal

## Example dialogue

> **Dev:** A user says the judge filter shows nothing.
> **Domain expert:** Which shows were they filtering? Judges are only known for
> TICA shows, and only after the Show detail has been fetched — a Show fresh
> from the calendar scrape has no Judges yet. And remember TICA publishes by
> Season, so a show "next year" may be in the current Season.
