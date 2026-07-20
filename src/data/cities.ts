// Cities the header offers. `tz` drives the clock (via Intl, no network);
// lat/lon drive the temperature lookup.
//
// Filtered to places whose working day meaningfully overlaps IST (UTC+5:30) —
// i.e. somewhere Joel could realistically work remotely from India without
// living on a night shift. Offsets below are the overlap against a 10:00–19:00
// IST day. US West Coast is deliberately absent: 19:00 IST is 06:30 PT, so
// there is effectively no shared working window.
export interface City {
  name: string;
  tz: string;
  lat: number;
  lon: number;
}

export const CITIES: City[] = [
  // Home.
  { name: "Bangalore", tz: "Asia/Kolkata", lat: 12.9716, lon: 77.5946 },

  // Near-total overlap.
  { name: "Dubai", tz: "Asia/Dubai", lat: 25.2048, lon: 55.2708 }, // −1.5h
  { name: "Singapore", tz: "Asia/Singapore", lat: 1.3521, lon: 103.8198 }, // +2.5h
  { name: "Tokyo", tz: "Asia/Tokyo", lat: 35.6762, lon: 139.6503 }, // +3.5h

  // Strong afternoon-IST overlap.
  { name: "Berlin", tz: "Europe/Berlin", lat: 52.52, lon: 13.405 }, // −3.5h
  { name: "Amsterdam", tz: "Europe/Amsterdam", lat: 52.3676, lon: 4.9041 }, // −3.5h
  { name: "London", tz: "Europe/London", lat: 51.5072, lon: -0.1276 }, // −4.5h
  { name: "Lisbon", tz: "Europe/Lisbon", lat: 38.7223, lon: -9.1393 }, // −4.5h

  // Morning-IST overlap.
  { name: "Sydney", tz: "Australia/Sydney", lat: -33.8688, lon: 151.2093 }, // +4.5h
];
