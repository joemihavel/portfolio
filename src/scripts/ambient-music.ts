export type AmbientState = "idle" | "loading" | "playing" | "muted" | "error";

/** A locally hosted, original 48-second ambient loop, played through the click-sound context. */
export function createAmbientMusic(context: BaseAudioContext, onState: (state: AmbientState) => void = () => {}) {
  const master = context.createGain();
  master.gain.value = 0;
  master.connect(context.destination);
  let bufferPromise: Promise<AudioBuffer> | null = null;
  let source: AudioBufferSourceNode | null = null;
  let requested = false;
  let generation = 0;
  let startedAt = 0;
  let startOffset = 0;
  let position = 0;
  try {
    const saved = Number(sessionStorage.getItem("folio-ambient-position"));
    if (Number.isFinite(saved) && saved >= 0) position = saved;
  } catch (_) {}

  const load = () => bufferPromise ??= fetch("/audio/portfolio-ambient.mp3")
    .then(response => {
      if (!response.ok) throw new Error(`Ambient track: ${response.status}`);
      return response.arrayBuffer();
    })
    .then(bytes => context.decodeAudioData(bytes))
    .catch(error => { bufferPromise = null; throw error; });

  const start = () => {
    if (requested || context.state === "closed") return;
    requested = true;
    const request = ++generation;
    onState("loading");
    void load().then(buffer => {
      if (!requested || request !== generation || context.state === "closed") return;
      const loop = context.createBufferSource();
      loop.buffer = buffer;
      loop.loop = true;
      loop.connect(master);
      source = loop;
      startOffset = position % buffer.duration;
      startedAt = context.currentTime;
      master.gain.cancelScheduledValues(startedAt);
      master.gain.setTargetAtTime(.3, startedAt, .12);
      loop.onended = () => loop.disconnect();
      loop.start(startedAt, startOffset);
      onState("playing");
    }).catch(error => {
      if (request !== generation) return;
      requested = false;
      onState("error");
      console.warn("Ambient music could not load.", error);
    });
  };
  const stop = () => {
    requested = false;
    generation++;
    if (source?.buffer) {
      position = (startOffset + Math.max(0, context.currentTime - startedAt)) % source.buffer.duration;
      try { sessionStorage.setItem("folio-ambient-position", String(position)); } catch (_) {}
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(0, context.currentTime, .04);
      try { source.stop(context.currentTime + .18); } catch (_) {}
      source = null;
    }
    onState("muted");
  };
  return { start, stop };
}
