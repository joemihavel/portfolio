import assets from "./secured-design-assets.json";

type AssetName = keyof typeof assets;
export interface MediaLayer {
  asset: AssetName;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  fit?: "cover" | "contain" | "fill";
  filter?: string;
  background?: string;
  radius?: number;
  motion?: boolean;
}
export interface CaseMediaDesign {
  label: string;
  node: string;
  width: number;
  height: number;
  layers: MediaLayer[];
  background?: string;
  border?: boolean;
}
const slide = { width: 641, height: 360.5625, background: "#f8f8f8" };

// These are the source figure coordinates, not a second page layout.
// Motion comes from the original GIFs. Opaque clips also have smaller MP4 copies;
// originals remain available as fallbacks, while transparent GIFs stay native.
export const securedMedia = {
  hero: { ...slide, node: "35:29291", label: "Secured app: welcome, rent payments, and cashback", layers: [
    // Figma exports these at the board's visible crop. Motion moves each
    // screen towards its cropped edge, so no missing content is exposed.
    { asset: "cover-welcome", x: 56, y: 33, width: 170.92, height: 327.5625, motion: true },
    { asset: "cover-payments", x: 234.9219, y: 0, width: 170.92, height: 320.273, motion: true },
    { asset: "cover-score", x: 413.8438, y: 43, width: 170.92, height: 317.5625, motion: true },
  ] },
  announcement: { width: 641, height: 181, node: "35:30387", label: "Flent's pre-Series A funding announcement", border: true, layers: [{ asset: "35-30382-image14", x: -113.1365, y: -25.5391, width: 859.9015, height: 441.8934, fit: "fill" }] },
  launch: { ...slide, node: "35:30389", label: "The original Secured onboarding flow", layers: [{ asset: "launch" }, { asset: "35-30382-building1", x: 483.9043, y: 36.5815, width: 27.8343, height: 27.8343, filter: "grayscale(1)" }] },
  interest: { ...slide, node: "35:30472", label: "People were interested — animated reaction", layers: [{ asset: "35-30470-rectangle2533", x: 162, y: 20.875, width: 318, height: 318 }] },
  agreementV1: { ...slide, node: "35:30555", label: "V1: uploading and manually verifying a rental agreement", layers: [{ asset: "agreement-v1" }, { asset: "35-30551-success1", x: 306.4658, y: 84.8949, width: 27.8343, height: 27.8343, background: "#fff" }] },
  agreementV2: { ...slide, node: "35:30646", label: "V2: agreement context, upload guidance, and verification status", layers: [{ asset: "agreement-v2" }] },
  map: { ...slide, node: "35:30881", label: "The Secured eligibility map in Bangalore", layers: [{ asset: "35-30878-rectangle2530" }] },
  landlord: { ...slide, node: "35:30901", label: "Landlord onboarding — animated product walkthrough", layers: [{ asset: "35-30895-rectangle2535", x: 226, y: 19.625, width: 188, height: 354 }] },
  waitlist: { ...slide, node: "35:30912", label: "The redesigned waitlist, benefits, and next steps", layers: [{ asset: "waitlist" }] },
  referrals: { ...slide, node: "35:31845", label: "Invite codes, referrals, and referral progress", layers: [{ asset: "referrals" }] },
  language: { ...slide, node: "35:42375", label: "Secured's updated design language and components", layers: [{ asset: "35-42367-rectangle2530" }] },
  tokens: { ...slide, node: "35:42384", label: "The Secured design token library", layers: [{ asset: "35-42367-rectangle2531", x: .1282, width: 714.7791, fit: "fill" }] },
  website: { ...slide, node: "35:42393", label: "Secured website — animated loading and visual treatment", layers: [{ asset: "35-42367-rectangle2532" }, { asset: "35-42367-slide16917" }] },
  reflection: { ...slide, node: "35:42400", label: "Feedback from the team after launch", layers: [{ asset: "35-42398-img68701", x: 143, y: 45.25, width: 356, height: 107.9067, radius: 9.376 }, { asset: "35-42398-image151", x: 96.58, y: 171.5375, width: 448.42, height: 148.725 }] },
} satisfies Record<string, CaseMediaDesign>;

export type SecuredMediaKey = keyof typeof securedMedia;
export const securedAssets: Record<AssetName, { src: string; width?: number; height?: number; format: string; pages: number; node: string; video?: string; poster?: string }> = assets;
