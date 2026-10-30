export interface PianoKey {
  code: string;
  label: string;
  midi: number;
  pitch: string;
  black: boolean;
  left: number;
  width: number;
  color: string;
}

const colors = ["#cd7e76", "#c8a34f", "#83a16d", "#62a4ae", "#a58bad"];
const whites = [60, 62, 64, 65, 67, 69, 71, 72, 74];
const labels = ["A", "S", "D", "F", "G", "H", "J", "K", "L"];
const blackNotes = [61, 63, 66, 68, 70, 73];
const blackLabels = ["W", "E", "T", "Y", "U", "O"];
const boundaries = [1, 2, 4, 5, 6, 8];
const pitches = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];

export const pianoKeys: PianoKey[] = [
  ...whites.map((midi, index) => ({
    code: `Key${labels[index]}`, label: labels[index], midi,
    pitch: `${pitches[midi % 12]}${Math.floor(midi / 12) - 1}`, black: false,
    left: index / 9, width: 1 / 9, color: colors[index % colors.length],
  })),
  ...blackNotes.map((midi, index) => ({
    code: `Key${blackLabels[index]}`, label: blackLabels[index], midi,
    pitch: `${pitches[midi % 12]}${Math.floor(midi / 12) - 1}`, black: true,
    left: (boundaries[index] - .31) / 9, width: .62 / 9, color: colors[(index + 2) % colors.length],
  })),
];
export const keyByCode = new Map(pianoKeys.map(key => [key.code, key]));
export const keyByMidi = new Map(pianoKeys.map(key => [key.midi, key]));
