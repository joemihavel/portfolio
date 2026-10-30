# One more song

Desktop-only portfolio piano. Opening the overlay goes straight to free play.
Choose a melody above the keyboard and press Play for a guided song. The same
controls move into the header during a song. Clearing the song dropdown returns
them to the free-play area. In the default view, the controls and keyboard form
a compact centered group, with no empty note grid. The piano stays visible throughout.

## Components

- `PianoGame.astro`: inert dialog template and desktop-only lazy launcher.
- `game.ts`: free / ready / preparing / playing / paused / complete / saving
  states, keyboard and pointer input, focus, audio clock and lifecycle.
- `keys.ts`: physical keys A S D F G H J K L (white) and W E T Y U O (black).
  Every playable pitch C4 through D5 is labelled on the instrument itself.
- `songs.ts`: five finite, original monophonic melody arrangements, including
  pitch, beat, duration and key. Mary Had a Little Lamb and Hot Cross Buns use
  slower, white-key-only beginner arrangements. Provenance is in `licenses/piano-game.md`.
- `engine.ts`: deterministic input-paced scoring, also used for API replay.
  An unplayed note waits at the keyboard until its key is pressed. Early input
  is always accepted: 100 points within 450ms, gradually decreasing to a
  minimum of 40 points for very early input. Late input remains accepted.
  Wrong keys sound but do not advance the chart, remove points or end a song.
  No lives, time limit, tempo escalation, combo multiplier or skipped notes.
- `renderer.ts`: DPR-aware canvas bars aligned to the CSS keyboard. A subtle
  key tint identifies the next note. Three upcoming key labels update on every
  correct input, including when playing ahead. Free play has no chart or fake bars.
- `styles.ts`: on-demand stylesheet, retained across Astro page navigation.
- `audio.ts`: original Web Audio piano synthesis. Every played key sounds its
  actual pitch. Song completion leaves the final note ringing. Audio is
  stopped on pause / close, initialized only after an interaction, and gated
  by the dialog's open/connected/visible state.
- `storage.ts`: D1 API, browser bests, and explicit browser-storage fallback.
- `records.ts`: top-three ranking and clearly labelled fictional examples.
- `validation.ts`: server replay of the complete melody, deriving every total.

## Scores and migrations

The existing Cloudflare D1 `DB` binding is reused. Use the normal migration
workflow for `migrations/0002_piano.sql` and `0003_piano_guided.sql`. Both are
applied to the local preview. Remote migration / deployment is not performed.

Guided runs and scores use `guided-v2`; legacy survival scores are retained
but excluded from these rankings. Browser scores and bests likewise use v2
storage keys, preserving the old data without mixing incompatible scoring.

POST `/api/piano` with `action: start` creates a visitor-bound run. Saving
submits its id, name, input timestamps and active duration. The API validates
complete-melody input, elapsed wall time, origin, payload size, names, duplicate
submissions and write rate limits. GET with `song=all` or a song id returns at
most three scores. No submitted score totals are trusted.

The inline list says Preview scores, Shared scores, or On this browser. A single
"Includes sample scores" note identifies fictional examples without per-player
badges. Browser-only entries retain a Browser label.
The name/save form appears inline only after completing the song; replay and
free play remain available without saving. There are no separate results or
leaderboard screens. Best scores include unsaved runs on the current browser.

This is basic abuse protection, not competitive anti-cheat: timestamped input
can be fabricated. Name filtering is intentionally basic. Saving is limited
to one hour / 20,000 inputs; unavailable server storage falls back explicitly
to the browser. Touch-only devices and viewports at or below 700px never load
or initialize the game. Closing restores scroll/focus and leaves the page
silent. Portfolio background audio requires an explicit speaker click each
visit and never automatically resumes after the piano closes.

## Verification and styling

`node --experimental-strip-types --test tests/piano-engine.test.mjs` covers
all mappings/charts, generous and early scoring, indefinite waits, wrong-key
handling, all five complete melodies, frame independence, API replay,
name validation, top-three ranking and versioned browser persistence.

`npm run build` runs Astro checks and the production build.

`src/styles/piano-game.css` reuses portfolio fonts, color variables and pill
buttons. The keyboard uses ivory white keys, raised ebony black keys, a slim
neutral casing and narrow separations. The roll and key bed share the same
horizontal inset, and pausing dims only the roll, preserving keyboard contrast.
Reduced motion removes decorative transitions; guided bars remain functional.
