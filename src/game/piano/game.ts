export { preparePianoGameStyles } from "./styles.ts";
import { PianoAudio } from "./audio.ts";
import { PianoEngine, type Judgement, type RunResult } from "./engine.ts";
import { pianoKeys, keyByCode } from "./keys.ts";
import { songs, songById, type Song } from "./songs.ts";
import { PianoRenderer } from "./renderer.ts";
import { PianoStorage, type RunIdentity } from "./storage.ts";
import { validName } from "./records.ts";

type GameState = "free" | "ready" | "preparing" | "playing" | "paused" | "complete" | "saving";
const formatNumber = (number: number) => new Intl.NumberFormat("en").format(number);
const element = <K extends keyof HTMLElementTagNameMap>(tag: K, className = "", text = "") => {
  const node = document.createElement(tag); node.className = className; node.textContent = text; return node;
};

class PianoGame {
  private dialog: HTMLDialogElement;
  private trigger: HTMLElement;
  private onClose: () => void;
  private lifecycle = new AbortController();
  private audio: PianoAudio;
  private storage = new PianoStorage(this.lifecycle.signal);
  private renderer: PianoRenderer;
  private dialogObserver: MutationObserver;
  private instrument: HTMLElement;
  private state: GameState = "free";
  private song: Song | null = null;
  private engine: PianoEngine | null = null;
  private run: RunIdentity | null = null;
  private result: RunResult | null = null;
  private pressed = new Set<string>();
  private buttons = new Map<string, HTMLButtonElement>();
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private frame = 0;
  private epoch = 0;
  private offset = 0;
  private submitted = false;
  private closed = false;
  private generation = 0;
  private leaderboardGeneration = 0;
  private savedPosition = { x: scrollX, y: scrollY };

  constructor(template: HTMLTemplateElement, trigger: HTMLElement, onClose: () => void) {
    this.dialog = template.content.firstElementChild!.cloneNode(true) as HTMLDialogElement;
    this.trigger = trigger; this.onClose = onClose;
    this.audio = new PianoAudio(() => !this.closed && this.dialog.open && this.dialog.isConnected && !document.hidden);
    document.body.append(this.dialog);
    this.instrument = this.find(".piano-instrument");
    this.buildKeyboard();
    const picker = this.find<HTMLSelectElement>(".piano-song-picker");
    for (const song of songs) {
      const option = element("option", "", song.title); option.value = song.id; picker.append(option);
    }
    this.renderer = new PianoRenderer(this.find<HTMLCanvasElement>("canvas"));
    this.listen();
    document.documentElement.classList.add("folio-game-open");
    document.dispatchEvent(new CustomEvent("folio:game", { detail: { active: true } }));
    this.dialog.showModal();
    this.dialogObserver = new MutationObserver(() => { if (!this.dialog.open) this.close(); });
    this.dialogObserver.observe(this.dialog, { attributes: true, attributeFilter: ["open"] });
    this.setState("free");
    this.instrument.focus({ preventScroll: true });
  }
  private find<T extends HTMLElement = HTMLElement>(selector: string): T {
    const node = this.dialog.querySelector<T>(selector);
    if (!node) throw new Error(`Missing piano control: ${selector}`);
    return node;
  }
  private later(callback: () => void, delay: number) {
    const timer = setTimeout(() => { this.timers.delete(timer); if (!this.closed) callback(); }, delay);
    this.timers.add(timer);
  }
  private announce(text: string) { this.find(".piano-announcement").textContent = text; }
  private status(text = "") { this.find(".piano-status").textContent = text; }
  private buildKeyboard() {
    const bed = this.find(".piano-key-bed");
    for (const key of pianoKeys) {
      const button = element("button", `piano-key${key.black ? " is-black" : ""}`);
      button.type = "button"; button.dataset.key = key.code;
      button.setAttribute("aria-label", `${key.pitch}, press ${key.label}`);
      button.setAttribute("aria-pressed", "false");
      button.style.setProperty("--key-left", String(key.left));
      button.style.setProperty("--key-width", String(key.width));
      button.style.setProperty("--key-color", key.color);
      button.append(element("kbd", "", key.label));
      bed.append(button); this.buttons.set(key.code, button);
    }
  }
  private listen() {
    const signal = this.lifecycle.signal;
    this.dialog.addEventListener("cancel", event => { event.preventDefault(); this.close(); }, { signal });
    this.dialog.addEventListener("close", () => this.close(), { signal });
    this.dialog.addEventListener("click", event => {
      if (!(event.target instanceof Element)) return;
      if (event.target === this.dialog) {
        const bounds = this.dialog.getBoundingClientRect();
        if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) this.close();
      }
      const key = event.target.closest<HTMLElement>("[data-key]")?.dataset.key;
      if (key && event.detail === 0 && !this.pressed.has(key)) {
        this.press(key); this.later(() => this.release(key), 120);
      }
      const action = event.target.closest<HTMLElement>("[data-piano-action]")?.dataset.pianoAction;
      if (action === "close") this.close();
      else if (action === "mute") this.mute();
      else if (action === "play") {
        if (this.state === "playing") this.pause();
        else if (this.state === "paused") void this.resume();
        else void this.start();
      }
    }, { signal });
    this.find<HTMLSelectElement>(".piano-song-picker").addEventListener("change", event => {
      this.selectSong(songById.get((event.target as HTMLSelectElement).value) || null);
    }, { signal });
    this.dialog.addEventListener("keydown", event => {
      if (event.metaKey || event.ctrlKey || event.altKey || !(event.target instanceof Element) || event.target.closest("input, textarea, select, [contenteditable='true']")) return;
      if (event.code === "Space" && !event.target.closest("button")) {
        if (event.repeat) { event.preventDefault(); return; }
        if (this.state === "playing") { event.preventDefault(); this.pause(); }
        else if (this.state === "paused") { event.preventDefault(); void this.resume(); }
        return;
      }
      if (!keyByCode.has(event.code)) return;
      event.preventDefault(); event.stopPropagation();
      if (!event.repeat && !this.pressed.has(event.code)) this.press(event.code);
    }, { signal });
    document.addEventListener("keyup", event => this.release(event.code), { signal });
    this.dialog.addEventListener("pointerdown", event => {
      const key = event.target instanceof Element ? event.target.closest<HTMLElement>("[data-key]")?.dataset.key : undefined;
      if (key && !this.pressed.has(key)) {
        event.preventDefault(); this.instrument.focus({ preventScroll: true }); this.press(key);
      }
    }, { signal });
    document.addEventListener("pointerup", () => this.releaseAll(), { signal });
    document.addEventListener("pointercancel", () => this.releaseAll(), { signal });
    this.find<HTMLFormElement>(".piano-score-form").addEventListener("submit", event => { event.preventDefault(); void this.save(); }, { signal });
    const suspend = () => {
      if (this.state === "playing") this.pause();
      else { this.releaseAll(); this.audio.pause(); }
    };
    document.addEventListener("visibilitychange", () => { if (document.hidden) suspend(); }, { signal });
    addEventListener("blur", suspend, { signal });
    addEventListener("pagehide", this.close, { signal });
  }
  private setState(state: GameState) {
    this.state = state; this.dialog.dataset.state = state;
    const controls = this.find(".piano-song-controls");
    const freeSlot = this.find(".piano-free-song");
    const idle = ["free", "ready", "preparing"].includes(state);
    const host = idle ? freeSlot : this.find(".piano-dialog-header");
    const focused = controls.contains(document.activeElement) ? document.activeElement as HTMLElement : null;
    freeSlot.hidden = !idle;
    if (controls.parentElement !== host) {
      if (idle) host.append(controls);
      else host.insertBefore(controls, this.find(".piano-header-actions"));
      focused?.focus({ preventScroll: true });
    }
    const busy = state === "preparing" || state === "saving";
    const play = this.find<HTMLButtonElement>('[data-piano-action="play"]');
    play.disabled = !this.song || busy;
    play.setAttribute("aria-busy", String(state === "preparing"));
    this.find("[data-piano-play-label]").textContent = state === "playing" ? "Pause" : state === "paused" ? "Resume" : state === "complete" || state === "saving" ? "Play again" : state === "preparing" ? "Preparing" : "Play";
    this.find<HTMLSelectElement>(".piano-song-picker").disabled = busy;
    this.find(".piano-stage-overlay").hidden = state !== "paused";
    const session = !!this.engine && !["free", "ready", "preparing"].includes(state);
    this.find(".piano-session").hidden = !session;
    this.find(".piano-scores").hidden = !session;
    this.find<HTMLFormElement>(".piano-score-form").hidden = !["complete", "saving"].includes(state) || this.submitted;
    this.find<HTMLButtonElement>('button[type="submit"]').disabled = state === "saving";
  }
  private selectSong(song: Song | null) {
    this.generation++; this.leaderboardGeneration++;
    cancelAnimationFrame(this.frame); this.releaseAll(); this.clearTarget(); this.audio.stop();
    this.song = song; this.engine = null; this.run = null; this.result = null; this.offset = 0;
    this.find(".piano-top-three").replaceChildren();
    this.submitted = false; this.status(); this.setState(song ? "ready" : "free");
    this.renderer.clear(); this.renderer.draw(null);
  }
  private async start() {
    const song = this.song;
    if (this.closed || !song || this.state === "preparing" || this.state === "saving") return;
    const version = ++this.generation;
    cancelAnimationFrame(this.frame); this.releaseAll(); this.clearTarget(); this.audio.stop();
    this.result = null; this.submitted = false; this.offset = 0;
    this.engine = null; this.run = null; this.setState("preparing"); this.status();
    this.renderer.clear(); this.renderer.draw(null);
    try {
      const [run] = await Promise.all([this.storage.start(song.id), this.audio.prepare()]);
      if (this.closed || version !== this.generation) return;
      this.run = run; this.engine = new PianoEngine(song);
      this.engine.onJudge = judgement => this.judge(judgement);
      this.epoch = this.audio.time;
      this.setState("playing"); this.updateStats();
      void this.showTopThree(song.id);
      if (document.hidden || !document.hasFocus()) this.pause();
      else { this.instrument.focus({ preventScroll: true }); this.tick(); }
      this.announce(`${song.title}. Play the lit key. Notes wait for you.`);
    } catch (error) {
      if (this.closed || version !== this.generation) return;
      this.engine = null; this.run = null; this.setState("ready");
      this.status((error as Error).message || "The piano could not start. Try again.");
    }
  }
  private clock() { return this.offset + (this.audio.time - this.epoch) * 1000; }
  private tick = () => {
    if (this.closed || this.state !== "playing" || !this.engine) return;
    this.engine.advance(this.clock());
    this.renderer.draw(this.engine, this.engine.position);
    this.updateTarget();
    this.frame = requestAnimationFrame(this.tick);
  };
  private press(code: string) {
    if (this.closed || !this.dialog.open || !this.dialog.isConnected || document.hidden || !document.hasFocus()) return;
    if (["preparing", "paused"].includes(this.state)) return;
    const key = keyByCode.get(code); if (!key) return;
    this.pressed.add(code);
    const button = this.buttons.get(code)!;
    button.classList.add("is-held"); button.setAttribute("aria-pressed", "true");
    if (this.state === "playing" && this.engine) {
      const note = this.engine.current();
      const duration = note?.lane === code ? (note.end - note.at) / 1000 : .6;
      // Every pressed key sounds its own pitch, including keys outside the chart.
      this.audio.play(key.midi, duration);
      this.engine.press(code, this.clock());
      if (this.engine.ended) this.finish();
    } else {
      const version = this.generation;
      void this.audio.prepare(key.midi).then(() => {
        if (!this.closed && version === this.generation && !document.hidden && document.hasFocus() && !["playing", "paused", "preparing"].includes(this.state)) this.audio.play(key.midi);
      }).catch(() => { if (!this.closed && this.dialog.open) this.status("Press a key again to enable the piano."); });
    }
  }
  private release(code: string) {
    this.pressed.delete(code);
    const button = this.buttons.get(code); button?.classList.remove("is-held"); button?.setAttribute("aria-pressed", "false");
  }
  private releaseAll() { for (const code of this.pressed) this.release(code); }
  private clearTarget() { this.buttons.forEach(button => button.classList.remove("is-next")); }
  private updateTarget() {
    const next = this.state === "playing" ? this.engine?.current()?.lane : null;
    this.buttons.forEach((button, code) => button.classList.toggle("is-next", code === next));
  }
  private judge(judgement: Judgement) {
    if (judgement.note) {
      const button = this.buttons.get(judgement.note.lane)!; button.classList.add("is-hit");
      this.later(() => button.classList.remove("is-hit"), 160);
      this.renderer.hit(judgement);
    }
    this.updateStats(); this.updateTarget();
  }
  private updateStats() {
    if (!this.engine) return;
    this.find('[data-piano-stat="score"]').textContent = formatNumber(this.engine.score);
    this.find('[data-piano-stat="progress"]').textContent = this.engine.ended ? "Complete" : `${this.engine.next} / ${this.engine.song.notes.length}`;
    const preview = this.find(".piano-next-notes");
    preview.hidden = this.engine.ended;
    const list = preview.querySelector("ol")!;
    list.replaceChildren();
    for (let index = this.engine.next; index < Math.min(this.engine.next + 3, this.engine.song.notes.length); index++) {
      const note = this.engine.note(index)!;
      const item = element("li");
      item.setAttribute("aria-label", `${note.pitch}, press ${keyByCode.get(note.lane)!.label}`);
      item.title = note.pitch;
      item.append(element("kbd", "", keyByCode.get(note.lane)!.label)); list.append(item);
    }
  }
  private pause() {
    if (this.state !== "playing" || !this.engine) return;
    this.offset = this.clock(); this.engine.advance(this.offset);
    cancelAnimationFrame(this.frame); this.releaseAll(); this.clearTarget(); this.audio.pause();
    this.setState("paused"); this.announce("Paused.");
  }
  private async resume() {
    if (this.state !== "paused" || !this.run) return;
    const version = this.generation;
    try {
      await this.audio.resume();
      if (this.closed || version !== this.generation || this.state !== "paused") return;
      if (document.hidden || !document.hasFocus()) { this.audio.pause(); return; }
      this.epoch = this.audio.time; this.setState("playing");
      this.instrument.focus({ preventScroll: true }); this.tick();
    } catch { this.status("Press Resume again to enable the piano."); }
  }
  private finish() {
    if (!this.engine || !this.song) return;
    cancelAnimationFrame(this.frame); this.releaseAll(); this.clearTarget();
    // Let the final piano note ring; finishing never suspends the audio context.
    this.result = this.engine.result(); this.offset = this.result.duration;
    this.storage.remember(this.song.id, this.result.score);
    this.setState("complete"); this.updateStats();
    this.renderer.draw(this.engine, this.engine.position);
    this.find<HTMLFormElement>(".piano-score-form").reset();
    this.announce(`${this.song.title} complete. ${this.result.score} points.`);
  }
  private async save() {
    if (!this.result || !this.run || !this.engine || this.submitted || this.state !== "complete") return;
    const name = validName(this.find<HTMLInputElement>("#piano-player-name").value);
    if (!name) { this.status("Use a name of 2–20 letters or numbers."); return; }
    const version = this.generation;
    this.setState("saving"); this.status("Saving…");
    try {
      const saved = await this.storage.save(this.run, name, this.result, this.engine.attempts);
      if (this.closed || version !== this.generation) return;
      this.submitted = true; this.setState("complete");
      this.status(saved.mode === "local" ? "Saved on this browser." : "Score saved.");
      void this.showTopThree(this.song!.id);
    } catch (error) {
      if (this.closed || version !== this.generation) return;
      this.setState("complete"); this.status((error as Error).message);
    }
  }
  private async showTopThree(songId: string) {
    const version = ++this.leaderboardGeneration;
    const list = this.find<HTMLOListElement>(".piano-top-three");
    if (!list.childElementCount) this.find(".piano-storage-notice").textContent = "Loading…";
    try {
      const data = await this.storage.leaderboard(songId);
      if (this.closed || version !== this.leaderboardGeneration || this.song?.id !== songId) return;
      list.replaceChildren();
      for (const [index, score] of data.scores.entries()) {
        const row = element("li");
        const name = element("span", "piano-score-name", score.name);
        if (score.local) name.append(element("small", "", "Browser"));
        row.append(element("span", "piano-rank", String(index + 1).padStart(2, "0")), name, element("span", "piano-score-value", formatNumber(score.score)));
        list.append(row);
      }
      const scope = data.mode === "local" ? "On this browser" : data.mode === "preview" ? "Preview scores" : "Shared scores";
      this.find(".piano-storage-notice").textContent = data.scores.some(score => score.demo) ? `${scope} · Includes sample scores` : scope;
    } catch { if (!this.closed && version === this.leaderboardGeneration) this.find(".piano-storage-notice").textContent = "Scores unavailable"; }
  }
  private mute() {
    this.audio.setMuted(!this.audio.muted);
    const button = this.find<HTMLButtonElement>('[data-piano-action="mute"]');
    button.setAttribute("aria-pressed", String(this.audio.muted));
    button.setAttribute("aria-label", this.audio.muted ? "Unmute piano" : "Mute piano");
  }
  close = () => {
    if (this.closed) return;
    this.closed = true; this.generation++; this.lifecycle.abort();
    this.dialogObserver.disconnect();
    cancelAnimationFrame(this.frame); this.timers.forEach(clearTimeout); this.timers.clear(); this.releaseAll();
    this.renderer.destroy(); this.audio.close();
    if (this.dialog.open) this.dialog.close();
    this.dialog.remove(); document.documentElement.classList.remove("folio-game-open");
    document.dispatchEvent(new CustomEvent("folio:game", { detail: { active: false } }));
    window.scrollTo({ left: this.savedPosition.x, top: this.savedPosition.y, behavior: "instant" });
    if (this.trigger.isConnected) this.trigger.focus({ preventScroll: true });
    this.onClose();
  };
}

export function openPianoGame(template: HTMLTemplateElement, trigger: HTMLElement, onClose: () => void) {
  const game = new PianoGame(template, trigger, onClose);
  return { close: game.close };
}
