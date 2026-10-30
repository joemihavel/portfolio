# Archive motion direction

Status: on hold. Archive screens are display-only; interaction controllers and
animations are not loaded. The research and implementation below are retained
for future discussion.

The existing Flent Charter frames remain the visual target: original typography,
palette, density, layout, artwork, and blue/green status roles. Refero research
informs interaction behaviour; it does not replace the visual system.

## Research lock

- Linear [style](https://refero.design/styles/11d3e58a-87d7-4a9a-bbf5-720f4fd3ffc6)
  and [status flow](https://refero.design/flows/6644): compact state controls,
  moving an item to its new group, and updating the corresponding counts.
- [Steel wallet](https://refero.design/pages/7aa415a9-4dc3-47df-9657-0f6cf04ea241):
  a stable financial shell, with balances and activity as the visual priority.
- [Cal scheduling](https://refero.design/pages/aefa80ac-26d6-4fb2-be71-543ebfa553a6):
  a persistent calendar grid, clear date selection, and related event details.
- [Editor X](https://refero.design/pages/14de8ffb-7140-4d73-ad7f-94e8befaff75):
  selection stays connected to on-canvas geometry and the property inspector.
- Framer and Stripe styles were also reviewed for restrained elevation, functional
  accents, and keeping the product preview central. Their branding is not imported.

Screens establish structure and state changes, not observed animation timing.
Durations and easing come from Refero's bundled Motion & Micro-interactions Guide.

## Screen decisions

| Screen | Entry | Interaction | Reason |
| --- | --- | --- | --- |
| Client payments | Balances count up; transactions follow | Totals interpolate and status confirms payment | Hierarchy and financial feedback |
| Task board | Columns and cards arrive in reading order | Cards travel between columns; lists reflow | Preserve item identity and destination |
| Calendar | Events populate the stationary grid | Date outline travels; month changes are directional | Preserve temporal and spatial context |
| Project dashboard | Original heatmap builds across months | Activity colours transition; result rows reflow | Connect selected activity to its records |
| Template editor | Selected outline draws; properties follow | Selection travels, blocks enter/leave, viewport resizes | Keep manipulation connected to the canvas |
| Team productivity | Original SVG data path traces | Chart cursor follows input; filtered tasks reflow | Reveal the trend and preserve row identity |
| Attendance | Summary counts precede employee records | Filtering reflows rows; date navigation is directional | Preserve information hierarchy and scan position |

## Timing and safeguards

120ms feedback, 220ms state changes, 300ms layout continuity, 320ms panels, and a
480ms chart trace. Entry sequences finish within 500ms. There are no idle loops.

`motion.ts` owns timings, animation cancellation, number interpolation, geometry
measurement, and reduced-motion handling. `scene-motion.ts` owns the seven entry
profiles. Entry plays once when the frame is visible and can replay on explicit
expansion. Pointer and keyboard input finish the introduction before data changes.

The shared page reveal no longer fades the complete archive frame. Default CSS
never hides a scene for these animations. Ending or cancelling an
animation restores the original style. Filtering changes actual state immediately;
short-lived inert copies only animate departing rows. They cannot receive input.

All geometry is measured in the frame's 1024px coordinate space, including inside
the zoomed experimental canvas. Reduced motion applies final values immediately.
Route changes cancel animation frames and remove temporary overlays.
