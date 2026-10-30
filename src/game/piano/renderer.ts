import { keyByMidi } from "./keys.ts";
import type { PianoEngine, Judgement } from "./engine.ts";

export class PianoRenderer {
  private canvas: HTMLCanvasElement;
  private context: CanvasRenderingContext2D;
  private observer: ResizeObserver;
  private width = 0;
  private height = 0;
  private flashes: { midi: number; color: string; at: number }[] = [];
  private grid = "rgba(100,100,100,.06)";
  private line = "rgba(100,100,100,.18)";
  private last: { engine: PianoEngine | null; position: number } = { engine: null, position: 0 };

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Your browser cannot draw the piano.");
    this.context = context;
    this.observer = new ResizeObserver(() => this.resize());
    this.observer.observe(canvas);
    this.resize();
  }
  private resize() {
    const bounds = this.canvas.getBoundingClientRect();
    this.width = bounds.width; this.height = bounds.height;
    const ratio = Math.min(2, devicePixelRatio || 1);
    this.canvas.width = Math.round(this.width * ratio); this.canvas.height = Math.round(this.height * ratio);
    this.context.setTransform(ratio, 0, 0, ratio, 0, 0);
    const style = getComputedStyle(this.canvas);
    this.grid = style.getPropertyValue("--piano-grid").trim() || this.grid;
    this.line = style.getPropertyValue("--piano-line").trim() || this.line;
    this.draw(this.last.engine, this.last.position);
  }
  hit(judgement: Judgement) {
    if (judgement.note) this.flashes.push({ midi: judgement.note.midi, color: keyByMidi.get(judgement.note.midi)!.color, at: performance.now() });
  }
  draw(engine: PianoEngine | null, position = 0) {
    this.last = { engine, position };
    const { context, width, height } = this;
    if (!width || !height) return;
    context.clearRect(0, 0, width, height);
    context.lineWidth = 1;
    context.strokeStyle = this.grid;
    for (let index = 1; index < 9; index++) {
      context.beginPath(); context.moveTo(width * index / 9, 0); context.lineTo(width * index / 9, height); context.stroke();
    }
    const ahead = 2800;
    for (const note of engine?.visible(ahead) || []) {
      const key = keyByMidi.get(note.midi)!;
      const y = height - (note.at - position) / ahead * height;
      const barHeight = Math.max(14, Math.min(height * .48, (note.end - note.at) / ahead * height));
      const inset = key.black ? .16 : .24;
      const x = (key.left + key.width * inset) * width;
      const barWidth = key.width * (1 - inset * 2) * width;
      if (y < -2 || y - barHeight > height + 8) continue;
      context.fillStyle = key.color;
      context.globalAlpha = note.index === engine?.next ? 1 : .72;
      context.beginPath(); context.roundRect(x, y - barHeight, barWidth, barHeight, Math.min(6, barWidth / 3)); context.fill();
      context.globalAlpha = .25; context.fillStyle = "#fff";
      context.beginPath(); context.roundRect(x + 2, y - barHeight + 2, Math.max(1, barWidth - 4), 2, 1); context.fill();
    }
    context.globalAlpha = 1; context.strokeStyle = this.line;
    context.beginPath(); context.moveTo(0, height - 1); context.lineTo(width, height - 1); context.stroke();
    const time = performance.now();
    this.flashes = this.flashes.filter(flash => time - flash.at < 240);
    for (const flash of this.flashes) {
      const key = keyByMidi.get(flash.midi)!;
      context.globalAlpha = Math.max(0, 1 - (time - flash.at) / 240) * .3;
      context.fillStyle = flash.color;
      context.fillRect(key.left * width, height - 4, key.width * width, 4);
    }
    context.globalAlpha = 1;
  }
  clear() { this.flashes = []; this.context.clearRect(0, 0, this.width, this.height); }
  destroy() { this.observer.disconnect(); this.clear(); }
}
