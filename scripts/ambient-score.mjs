// Original ambient score. Render at 44.1 kHz for 64 seconds, then crop 12–60s
// to obtain a seamless 48-second loop (one complete harmonic cycle).
export function scheduleAmbientScore(context) {
  const chords = [[48, 55, 59, 62, 64], [45, 52, 55, 59, 62], [41, 48, 55, 57, 64], [43, 50, 55, 57, 64]];
  const melodies = [[76, 74, 71], [72, 71, 67], [69, 72, 76], [74, 71, 67]];
  const hz = note => 440 * 2 ** ((note - 69) / 12);
  const master = context.createGain();
  master.gain.value = .6;
  master.connect(context.destination);
  const room = context.createConvolver();
  const impulse = context.createBuffer(2, Math.ceil(context.sampleRate * 2.8), context.sampleRate);
  let seed = 20261028;
  for (let channel = 0; channel < 2; channel++) {
    const samples = impulse.getChannelData(channel);
    let filtered = 0;
    for (let index = 0; index < samples.length; index++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      filtered = filtered * .72 + (seed / 2147483648 - 1) * .28;
      samples[index] = filtered * Math.exp(-index / (context.sampleRate * .65));
    }
  }
  room.buffer = impulse;
  const wet = context.createGain();
  wet.gain.value = .3;
  room.connect(wet).connect(master);
  const padFilter = context.createBiquadFilter();
  padFilter.type = "lowpass";
  padFilter.frequency.value = 1550;
  padFilter.Q.value = .5;
  padFilter.connect(master);
  padFilter.connect(room);

  const pad = (midi, at) => {
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(.075, at + 2.5);
    gain.gain.setValueAtTime(.075, at + 10);
    gain.gain.linearRampToValueAtTime(0, at + 16);
    gain.connect(padFilter);
    for (const detune of [-2.5, 2.5]) {
      const oscillator = context.createOscillator();
      oscillator.type = "triangle";
      oscillator.frequency.value = hz(midi);
      oscillator.detune.value = detune;
      oscillator.connect(gain);
      oscillator.start(at);
      oscillator.stop(at + 16.05);
    }
  };
  const piano = (midi, at, velocity) => {
    const envelope = context.createGain();
    envelope.gain.setValueAtTime(0, at);
    envelope.gain.linearRampToValueAtTime(velocity, at + .012);
    envelope.gain.exponentialRampToValueAtTime(.00001, at + 3.8);
    envelope.connect(master);
    envelope.connect(room);
    for (const [multiple, level] of [[1, 1], [2, .22], [3, .075], [4, .025]]) {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = hz(midi) * multiple;
      const partial = context.createGain();
      partial.gain.value = level;
      oscillator.connect(partial).connect(envelope);
      oscillator.start(at);
      oscillator.stop(at + 3.85);
    }
  };
  for (let step = 0; step < 6; step++) {
    const chord = (step + 3) % 4;
    const at = step * 12;
    chords[chord].forEach(note => pad(note, at));
    melodies[chord].forEach((note, index) => piano(note, at + [1.5, 5, 8.7][index], [.11, .08, .095][index]));
  }
}
