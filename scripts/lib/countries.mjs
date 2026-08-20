// Country lookup for the Meanwhile ingest and the note composer.
//
// Flags are derived from the ISO 3166-1 alpha-2 code rather than stored, since
// a flag emoji is just the two letters shifted into the regional-indicator
// block. That keeps this table to names and codes and makes it impossible for
// a flag to drift out of sync with its country.

export const flagOf = (code) =>
  String.fromCodePoint(
    ...[...code.toUpperCase()].map((c) => 0x1f1e6 + c.charCodeAt(0) - 65)
  );

// `aliases` carries demonyms and common variants, because feed copy says
// "Kenyan researchers" and "the Netherlands" far more often than it says the
// bare canonical name. Longest alias wins at match time, so "South Africa"
// is never swallowed by "Africa"-adjacent noise or by "Sudan" inside "South
// Sudan".
export const COUNTRIES = [
  { code: "AR", name: "Argentina", aliases: ["Argentinian", "Argentine"] },
  { code: "AU", name: "Australia", aliases: ["Australian"] },
  { code: "AT", name: "Austria", aliases: ["Austrian"] },
  { code: "BD", name: "Bangladesh", aliases: ["Bangladeshi"] },
  { code: "BE", name: "Belgium", aliases: ["Belgian"] },
  { code: "BT", name: "Bhutan", aliases: ["Bhutanese"] },
  { code: "BO", name: "Bolivia", aliases: ["Bolivian"] },
  { code: "BW", name: "Botswana", aliases: ["Botswanan"] },
  { code: "BR", name: "Brazil", aliases: ["Brazilian"] },
  { code: "BG", name: "Bulgaria", aliases: ["Bulgarian"] },
  { code: "KH", name: "Cambodia", aliases: ["Cambodian"] },
  { code: "CM", name: "Cameroon", aliases: ["Cameroonian"] },
  { code: "CA", name: "Canada", aliases: ["Canadian"] },
  { code: "CL", name: "Chile", aliases: ["Chilean"] },
  { code: "CN", name: "China", aliases: ["Chinese"] },
  { code: "CO", name: "Colombia", aliases: ["Colombian"] },
  { code: "CR", name: "Costa Rica", aliases: ["Costa Rican"] },
  { code: "HR", name: "Croatia", aliases: ["Croatian"] },
  { code: "CU", name: "Cuba", aliases: ["Cuban"] },
  { code: "CZ", name: "Czechia", aliases: ["Czech Republic", "Czech"] },
  { code: "DK", name: "Denmark", aliases: ["Danish", "Copenhagen"] },
  { code: "EC", name: "Ecuador", aliases: ["Ecuadorian", "Galapagos", "Galápagos"] },
  { code: "EG", name: "Egypt", aliases: ["Egyptian"] },
  { code: "SV", name: "El Salvador", aliases: ["Salvadoran"] },
  { code: "EE", name: "Estonia", aliases: ["Estonian"] },
  { code: "ET", name: "Ethiopia", aliases: ["Ethiopian"] },
  { code: "FJ", name: "Fiji", aliases: ["Fijian"] },
  { code: "FI", name: "Finland", aliases: ["Finnish", "Helsinki"] },
  { code: "FR", name: "France", aliases: ["French", "Paris"] },
  { code: "DE", name: "Germany", aliases: ["German", "Berlin"] },
  { code: "GH", name: "Ghana", aliases: ["Ghanaian"] },
  { code: "GR", name: "Greece", aliases: ["Greek", "Athens"] },
  { code: "GT", name: "Guatemala", aliases: ["Guatemalan"] },
  { code: "HN", name: "Honduras", aliases: ["Honduran"] },
  { code: "HU", name: "Hungary", aliases: ["Hungarian"] },
  { code: "IS", name: "Iceland", aliases: ["Icelandic", "Reykjavik"] },
  { code: "IN", name: "India", aliases: ["Indian", "Mumbai", "Delhi", "Bengaluru", "Chennai", "Kerala"] },
  { code: "ID", name: "Indonesia", aliases: ["Indonesian", "Borneo", "Sumatra"] },
  { code: "IE", name: "Ireland", aliases: ["Irish", "Dublin"] },
  { code: "IL", name: "Israel", aliases: ["Israeli"] },
  { code: "IT", name: "Italy", aliases: ["Italian", "Rome", "Milan"] },
  { code: "JM", name: "Jamaica", aliases: ["Jamaican"] },
  { code: "JP", name: "Japan", aliases: ["Japanese", "Tokyo"] },
  { code: "JO", name: "Jordan", aliases: ["Jordanian"] },
  { code: "KZ", name: "Kazakhstan", aliases: ["Kazakh"] },
  { code: "KE", name: "Kenya", aliases: ["Kenyan", "Nairobi"] },
  { code: "LA", name: "Laos", aliases: ["Laotian"] },
  { code: "LV", name: "Latvia", aliases: ["Latvian"] },
  { code: "LB", name: "Lebanon", aliases: ["Lebanese"] },
  { code: "LT", name: "Lithuania", aliases: ["Lithuanian"] },
  { code: "MG", name: "Madagascar", aliases: ["Malagasy"] },
  { code: "MW", name: "Malawi", aliases: ["Malawian"] },
  { code: "MY", name: "Malaysia", aliases: ["Malaysian"] },
  { code: "MV", name: "Maldives", aliases: ["Maldivian"] },
  { code: "MX", name: "Mexico", aliases: ["Mexican"] },
  { code: "MN", name: "Mongolia", aliases: ["Mongolian"] },
  { code: "MA", name: "Morocco", aliases: ["Moroccan"] },
  { code: "MZ", name: "Mozambique", aliases: ["Mozambican"] },
  { code: "NA", name: "Namibia", aliases: ["Namibian"] },
  { code: "NP", name: "Nepal", aliases: ["Nepali", "Nepalese", "Everest"] },
  { code: "NL", name: "Netherlands", aliases: ["Dutch", "Amsterdam", "Holland"] },
  { code: "NZ", name: "New Zealand", aliases: ["Kiwi", "Aotearoa", "Auckland"] },
  { code: "NG", name: "Nigeria", aliases: ["Nigerian", "Lagos"] },
  { code: "NO", name: "Norway", aliases: ["Norwegian", "Oslo"] },
  { code: "PK", name: "Pakistan", aliases: ["Pakistani"] },
  { code: "PA", name: "Panama", aliases: ["Panamanian"] },
  { code: "PY", name: "Paraguay", aliases: ["Paraguayan"] },
  { code: "PE", name: "Peru", aliases: ["Peruvian", "Amazonian"] },
  { code: "PH", name: "Philippines", aliases: ["Filipino", "Manila"] },
  { code: "PL", name: "Poland", aliases: ["Polish", "Warsaw"] },
  { code: "PT", name: "Portugal", aliases: ["Portuguese", "Lisbon"] },
  { code: "QA", name: "Qatar", aliases: ["Qatari"] },
  { code: "RO", name: "Romania", aliases: ["Romanian"] },
  { code: "RW", name: "Rwanda", aliases: ["Rwandan"] },
  { code: "SA", name: "Saudi Arabia", aliases: ["Saudi"] },
  { code: "SN", name: "Senegal", aliases: ["Senegalese"] },
  { code: "RS", name: "Serbia", aliases: ["Serbian"] },
  { code: "SG", name: "Singapore", aliases: ["Singaporean"] },
  { code: "SK", name: "Slovakia", aliases: ["Slovak"] },
  { code: "SI", name: "Slovenia", aliases: ["Slovenian"] },
  { code: "ZA", name: "South Africa", aliases: ["South African", "Cape Town"] },
  { code: "KR", name: "South Korea", aliases: ["Korean", "Seoul", "Korea"] },
  { code: "ES", name: "Spain", aliases: ["Spanish", "Barcelona", "Madrid"] },
  { code: "LK", name: "Sri Lanka", aliases: ["Sri Lankan"] },
  { code: "SE", name: "Sweden", aliases: ["Swedish", "Stockholm"] },
  { code: "CH", name: "Switzerland", aliases: ["Swiss", "Zurich", "Geneva"] },
  { code: "TZ", name: "Tanzania", aliases: ["Tanzanian", "Zanzibar"] },
  { code: "TH", name: "Thailand", aliases: ["Thai", "Bangkok"] },
  { code: "TN", name: "Tunisia", aliases: ["Tunisian"] },
  { code: "TR", name: "Türkiye", aliases: ["Turkey", "Turkish", "Istanbul"] },
  { code: "UG", name: "Uganda", aliases: ["Ugandan"] },
  { code: "UA", name: "Ukraine", aliases: ["Ukrainian", "Kyiv"] },
  { code: "AE", name: "United Arab Emirates", aliases: ["UAE", "Dubai", "Emirati"] },
  { code: "GB", name: "United Kingdom", aliases: ["UK", "Britain", "British", "England", "Scotland", "Wales", "London", "Scottish", "Welsh"] },
  { code: "US", name: "United States", aliases: ["USA", "US", "American", "California", "New York", "Texas", "Florida"] },
  { code: "UY", name: "Uruguay", aliases: ["Uruguayan"] },
  { code: "VN", name: "Vietnam", aliases: ["Vietnamese", "Hanoi"] },
  { code: "ZM", name: "Zambia", aliases: ["Zambian"] },
  { code: "ZW", name: "Zimbabwe", aliases: ["Zimbabwean"] },
];

// Longest needle first, so "South Africa" is tested before "Africa"-like
// substrings and "New Zealand" before "Zealand".
const NEEDLES = COUNTRIES.flatMap((c) =>
  [c.name, ...c.aliases].map((term) => ({ term, country: c }))
).sort((a, b) => b.term.length - a.term.length);

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Word-bounded so "US" doesn't fire inside "thus" and "Chad" inside "Chadwick".
const MATCHERS = NEEDLES.map(({ term, country }) => ({
  re: new RegExp(`(?<![\\p{L}])${escape(term)}(?![\\p{L}])`, "iu"),
  country,
}));

/**
 * Best-effort country for a story. Title is weighted over summary: a headline
 * naming a place is usually about that place, whereas body text often mentions
 * other countries in passing ("unlike Norway, which…").
 *
 * Returns null rather than guessing when nothing matches — the caller shows
 * "Somewhere", which is on-brand and honest.
 */
export function detectCountry(title = "", summary = "") {
  for (const { re, country } of MATCHERS) if (re.test(title)) return country;
  for (const { re, country } of MATCHERS) if (re.test(summary)) return country;
  return null;
}

export const byCode = new Map(COUNTRIES.map((c) => [c.code, c]));
