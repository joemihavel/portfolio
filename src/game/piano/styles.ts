import stylesheet from "../../styles/piano-game.css?url";

const id = "folio-piano-styles";
let loading: Promise<void> | null = null;

/** Load once on a desktop click, and retain the link across Astro page swaps. */
export function preparePianoGameStyles(): Promise<void> {
  if (document.getElementById(id)) return loading || Promise.resolve();
  loading = new Promise<void>((resolve, reject) => {
    const link = document.createElement("link");
    link.id = id; link.rel = "stylesheet"; link.href = stylesheet;
    link.setAttribute("data-astro-transition-persist", id);
    link.onload = () => resolve();
    link.onerror = () => { link.remove(); loading = null; reject(new Error("Piano styles could not load.")); };
    document.head.append(link);
  });
  return loading;
}

document.addEventListener("astro:before-swap", event => {
  const link = document.getElementById(id);
  if (link && !event.newDocument.getElementById(id)) event.newDocument.head.append(link.cloneNode(true));
});
