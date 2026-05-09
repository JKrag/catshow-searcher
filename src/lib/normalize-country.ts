const ALIASES: Record<string, string> = {
  // Danish
  "danmark": "Denmark",
  // Norwegian
  "norge": "Norway",
  // Swedish
  "sverige": "Sweden",
  // Finnish
  "suomi": "Finland",
  // German
  "deutschland": "Germany",
  "österreich": "Austria",
  // Dutch
  "nederland": "Netherlands",
  // French / Belgian
  "belgique": "Belgium",
  "belgie": "Belgium",
  // Italian
  "italia": "Italy",
  // Spanish
  "españa": "Spain",
  "espana": "Spain",
  // Portuguese (Brazil)
  "brasil": "Brazil",
  // Spanish-speaking Americas
  "méxico": "Mexico",
  "mexico": "Mexico",
  "panamá": "Panama",
  "panama": "Panama",
  // Swiss (French / German / Italian names)
  "suisse": "Switzerland",
  "schweiz": "Switzerland",
  "svizzera": "Switzerland",
  // Japanese
  "日本": "Japan",
  // Slovenian
  "slovenija": "Slovenia",
  // Croatian
  "hrvatska": "Croatia",
  // Czech
  "česká republika": "Czech Republic",
  "ceska republika": "Czech Republic",
  // Slovak
  "slovensko": "Slovakia",
  // Hungarian
  "magyarország": "Hungary",
  "magyarorszag": "Hungary",
  // Polish
  "polska": "Poland",
  // Russian
  "россия": "Russia",
  "rossiya": "Russia",
  // Turkish
  "türkiye": "Turkey",
  "turkiye": "Turkey",
  // Ukrainian
  "україна": "Ukraine",
  // Icelandic
  "ísland": "Iceland",
  "island": "Iceland",
  // Irish
  "éire": "Ireland",
  // UK variants
  "great britain": "United Kingdom",
  "england": "United Kingdom",
  "scotland": "United Kingdom",
  "wales": "United Kingdom",
};

// TICA appends these suffixes to encode regional/annual club designations
const STRIP_SUFFIXES = ["regional", "region", "annual"];

export function normalizeCountry(raw: string | null | undefined): string | null {
  if (!raw) return null;

  let s = raw.trim();
  if (!s) return null;

  for (const suffix of STRIP_SUFFIXES) {
    if (s.toLowerCase().endsWith(suffix)) {
      s = s.slice(0, s.length - suffix.length).trim();
      break;
    }
  }

  return ALIASES[s.toLowerCase()] ?? s;
}
