import { archiveScreens } from './archive';

export const resumeHref = 'https://drive.google.com/file/d/1aG208AVmbddAnotep7oDlV5xiJj-tm5d/view?usp=sharing';

export const showcaseTitleLead = "Designed and developed an interactive Indian experience";
export const showcaseTitleTail = " to over 300 studios";
export const showcaseTitle = showcaseTitleLead + showcaseTitleTail;
export const showcaseImage = "/images/redesign/case-huemn.png";
export const writingImage = "/images/redesign/writing-thumb.png";

export const caseStudies = Array.from({ length: 2 }, (_, index) => index);
export const archiveImages = Array.from({ length: 7 }, (_, index) =>
  `/images/redesign/archive-${String(index + 1).padStart(2, "0")}.png`,
);
export type Experiment = { id: string; title: string; thumbnail: string; description?: string; demoHref?: string; githubHref?: string };
export const experiments: Experiment[] = [
  {
    id: 'minutes',
    title: 'Minutes',
    thumbnail: '/images/projects/minutes-app-preview.png',
    description: 'Transcribe your meeting audio and ask questions about what was discussed.',
    demoHref: 'https://tryminutes.vercel.app/',
    githubHref: 'https://github.com/joemihavel/minutes',
  },
  {
    id: 'magic-wand',
    title: 'Magic Wand',
    thumbnail: '/images/projects/magic-wand-app-preview.png',
    description: 'Remove backgrounds, convert image formats, and compress images privately in your browser.',
    demoHref: 'https://magic-wand-web-jet.vercel.app/',
    githubHref: 'https://github.com/joemihavel/magic-wand',
  },
  {
    id: 'dither',
    title: 'Dither',
    thumbnail: '/images/projects/dither-app-preview.png',
    description: 'Apply ASCII, dithering, and other effects to photos and videos in your browser.',
    demoHref: 'https://ascii-dither-video-tool-green.vercel.app/',
    githubHref: 'https://github.com/joemihavel/ascii-dither-video-tool',
  },
];
export const writingItems = Array.from({ length: 4 }, (_, index) => index);
export const showWriting = false;

export const categories = [
  { key: "case-studies", label: "Case Studies", count: caseStudies.length },
  { key: "archive", label: "Archive", count: archiveScreens.length },
  { key: "experiments", label: "Experiments", count: experiments.length },
  ...(showWriting ? [{ key: "writing", label: "Writing", count: writingItems.length } as const] : []),
] as const;
