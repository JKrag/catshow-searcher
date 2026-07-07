# Past shows are kept in the store, hidden by default

The UI and API default to shows starting today or later, with an explicit
"include past shows" option. Past shows are never purged from the store: FIFe
and TICA drop past events from their calendars, so purged history could never
be re-scraped. Retained history is cheap (one JSON blob) and enables future
features — judge history, exhibitor attendance, and calendar-density statistics
for the Organizer persona.
