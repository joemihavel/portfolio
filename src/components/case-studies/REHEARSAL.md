# Local case-study illustrations

References: Charter `70:2094`, the supplied Flent component guide and live
Storybook, and the two supplied CX screenshots. The CX records are fictional.

Stageshow: https://github.com/benjitaylor/skills/tree/main/stageshow
Gold filmed: `overlap`. Its cropped background surface, foreground hierarchy,
and compact composition were ported to native Astro/CSS. The `form-error`
example informed the retained field, reserved feedback, and button states.
No React runtime or animation dependency was added. License: `licenses/stageshow-LICENSE.txt`.

## Stories

- Flent cover: type email, select a chip/date, book, confirm, hold, close and
  explicitly reset. A 14.5 second loop. The controls stay mounted.
- Foundations: select coral, green, then text ink; the heading sample follows
  the selected token after the cursor arrives. A 12 second loop. Native HTML,
  Plus Jakarta Sans, and the existing Zin font replace the low-resolution image.
- CX cover: open a ticket, hold its Overview, close, hide the cursor, reset its
  coordinates while hidden. An 8.5 second loop. No Tasks view or data changes.
  Cursor scale keyframes were removed; position has one CSS transition.

## Checks

Desktop at 1440px and touch emulation at 390px; separate compact compositions;
pause/resume; offscreen suspension; navigation between both portfolio modes;
case-study ordering and disabled third CTA; GIF playback and poster switching;
no image enlargement; no emoji arrows in the site controls.

Contact sheets were captured across full loops. The Stageshow automated scan
reported sampling gaps on this machine, so its motion coverage is inconclusive,
not a frame-perfect pass. It also treats nested form cards as complete windows
when measuring their bottom gutters; these are intentional form sections.
The sheets exposed a clipped mobile CTA and duplicate action under the drawer;
both were fixed. Source/native UI checks and manual frame inspection remain
separate from the automated report.

Reduced motion uses complete static compositions and the onboarding GIF poster.
All illustration clocks stop while offscreen, paused, or in a hidden tab, and
are disposed during Astro navigation. Animation controls are siblings of links,
not nested interactive controls. Case-study figures have no enlargement action.

Not checked: physical iPhone/Safari, every laptop/GPU, or production hosting.
Production is verified separately after the GitHub deployment finishes.

Final CX cursor check: sampled two full open/close loops (17.5 seconds), with
no Tasks state and no console errors. The position reset occurs after the cursor
has faded out. The 390px check uses the 358px composition with no page overflow.
The final reduced-motion check confirmed a static Flent poster and GIF poster;
there are zero enlargement controls or images nested in case-study buttons.
