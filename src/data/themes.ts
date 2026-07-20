// Theme ids must match the [data-theme="…"] blocks in global.css.
export const LIGHT = "light";
export const DARK = "dark";

// What the ッ button rotates through.
export const SURPRISE_THEMES = [
  "tomato",
  "sky",
  "cream",
  "lavender",
  "electric",
  "olive",
  "burgundy",
  "matrix",
] as const;

export const ALL_THEMES = [LIGHT, DARK, ...SURPRISE_THEMES];

// Drives <meta name="theme-color"> so mobile browser chrome matches the page.
export const THEME_BACKGROUNDS: Record<string, string> = {
  light: "#ffffff",
  dark: "#111111",
  tomato: "#ff4b3e",
  sky: "#79c8f5",
  cream: "#f5efd8",
  lavender: "#d8c3ff",
  electric: "#1838ff",
  olive: "#50551c",
  burgundy: "#51001a",
  matrix: "#081a11",
};
