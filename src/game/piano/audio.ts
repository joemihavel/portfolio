import { pianoKeys } from "./keys.ts";

/** Original synthesized piano: decaying, slightly inharmonic strings, a short
 * hammer transient, and a quiet stereo room. No recordings or audio library. */
export class PianoAudio {
  context: AudioContext | null = null;
  private master: GainNode | null = null;
  private room: ConvolverNode | null = null;
  private buffers = new Map<number, AudioBuffer>();
  private voices = new Set<{ source: AudioBufferSourceNode; gain: GainNode }>();
  private closed = false;
  private canPlay: () => boolean;
  muted = false;

  constructor(canPlay: () => boolean) { this.canPlay = canPlay; }

  get time() { return this.context?.currentTime || 0; }

  async prepare(midi?: number) {
    if (this.closed || !this.canPlay()) throw new Error("Piano closed.");
    if (!this.context) {
      this.context = new AudioContext({ latencyHint: "interactive" });
      const context = this.context;
      this.master = context.createGain();
      this.master.gain.value = this.muted ? 0 : .55;
      const compressor = context.createDynamicsCompressor();
      compressor.threshold.value = -15;
      compressor.knee.value = 12;
      compressor.ratio.value = 4;
      compressor.attack.value = .003;
      compressor.release.value = .15;
      this.master.connect(compressor).connect(context.destination);
      const room = context.createConvolver();
      this.room = room;
      const impulse = context.createBuffer(2, Math.floor(context.sampleRate * .5), context.sampleRate);
      for (let channel = 0; channel < 2; channel++) {
        const data = impulse.getChannelData(channel);
        let seed = 31415 + channel;
        for (let index = 0; index < data.length; index++) {
          seed = (seed * 1664525 + 1013904223) >>> 0;
          data[index] = (seed / 2147483648 - 1) * Math.pow(1 - index / data.length, 4) * .13;
        }
      }
      room.buffer = impulse;
      const wet = context.createGain(); wet.gain.value = .13;
      this.master.connect(room).connect(wet).connect(compressor);
    }
    await this.context.resume();
    if (this.closed || !this.canPlay()) { this.stop(); throw new Error("Piano closed."); }
    for (const key of pianoKeys.filter(key => midi === undefined || key.midi === midi)) {
      if (this.closed || !this.canPlay()) throw new Error("Piano closed.");
      if (this.buffers.has(key.midi)) continue;
      this.buffers.set(key.midi, this.makeTone(this.context, key.midi));
      // Yield while preparing all pitches so the header can paint.
      await new Promise<void>(resolve => setTimeout(resolve, 0));
    }
  }

  private makeTone(context: AudioContext, midi: number) {
    const sampleRate = 32000;
    const buffer = context.createBuffer(1, Math.ceil(sampleRate * 2.8), sampleRate);
    const data = buffer.getChannelData(0);
    const frequency = 440 * 2 ** ((midi - 69) / 12);
    const amplitudes = [1, .48, .23, .13, .085, .05, .028, .015];
    for (let harmonic = 1; harmonic <= amplitudes.length; harmonic++) {
      const partial = frequency * harmonic * Math.sqrt(1 + .00011 * harmonic * harmonic);
      if (partial > sampleRate * .45) continue;
      const step = 2 * Math.PI * partial / sampleRate;
      const decay = Math.exp(-(1.15 + harmonic * .48 + (midi - 60) * .018) / sampleRate);
      let amplitude = amplitudes[harmonic - 1] * .38;
      for (let index = 0; index < data.length; index++) {
        const attack = Math.min(1, index / (sampleRate * .003));
        data[index] += Math.sin(index * step) * amplitude * attack;
        amplitude *= decay;
      }
    }
    let seed = midi * 701;
    for (let index = 0; index < data.length; index++) {
      const time = index / sampleRate;
      const chorus = Math.sin(time * frequency * 2 * Math.PI * 1.0009) * .035 * Math.exp(-time * 2.5) * Math.min(1, time / .004);
      seed = (seed * 1664525 + 1013904223) >>> 0;
      const hammer = (seed / 2147483648 - 1) * .025 * Math.exp(-time * 310);
      data[index] += chorus + hammer;
      data[index] *= Math.min(1, (data.length - index) / 1200);
    }
    return buffer;
  }

  play(midi: number, duration = .6) {
    const context = this.context;
    const buffer = this.buffers.get(midi);
    if (!context || context.state !== "running" || !this.master || !buffer || this.closed || !this.canPlay()) return;
    if (this.voices.size > 24) { const oldest = this.voices.values().next().value; if (oldest) oldest.source.stop(); }
    const source = context.createBufferSource(); source.buffer = buffer;
    const gain = context.createGain();
    const now = context.currentTime;
    const sustain = Math.min(2.4, Math.max(.08, duration));
    gain.gain.setValueAtTime(.8, now);
    gain.gain.setTargetAtTime(.0001, now + sustain, .085);
    source.connect(gain).connect(this.master);
    const voice = { source, gain }; this.voices.add(voice);
    source.onended = () => { source.disconnect(); gain.disconnect(); this.voices.delete(voice); };
    source.start(now); source.stop(now + sustain + .5);
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    if (this.context && this.master) this.master.gain.setTargetAtTime(muted ? 0 : .55, this.context.currentTime, .015);
  }
  stop() {
    for (const voice of this.voices) { try { voice.source.stop(); } catch {} voice.source.disconnect(); voice.gain.disconnect(); }
    this.voices.clear();
    // Flush the room tail so it cannot reappear when the piano resumes.
    if (this.room?.buffer) { const impulse = this.room.buffer; this.room.buffer = null; this.room.buffer = impulse; }
  }
  pause() { this.stop(); void this.context?.suspend(); }
  async resume() { if (!this.closed && this.canPlay() && this.context?.state !== "running") await this.context?.resume(); }
  close() { this.closed = true; this.stop(); void this.context?.close().catch(() => {}); this.buffers.clear(); }
}
