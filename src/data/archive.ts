import sequences from './archive-motion.json';
export type ArchiveScreen = { label: string; nodeId: string; frame?: number; sequence?: number; width?: number; height?: number };
/** Source frames in Flent Charter, page 12:2. Order matches both archive views. */
const staticScreens = [
  {label:'Client payments',nodeId:'12:2944'},
  {label:'Task board',nodeId:'12:3110'},
  {label:'Calendar & scheduler',nodeId:'12:3644'},
  {label:'Project dashboard',nodeId:'12:3876'},
  {label:'Template editor',nodeId:'12:5265'},
  {label:'Team productivity',nodeId:'12:5462'},
  {label:'Attendance record',nodeId:'12:5915'},
  {label:'DITA builder',nodeId:'47:20359'},
  {label:'Video editor',nodeId:'47:29627'},
  {label:'DAO dashboard',nodeId:'47:46731'},
  {label:'Document library',nodeId:'47:48096'},
  {label:'Data & Apps insights',nodeId:'47:65237'},
];
const stills: ArchiveScreen[] = staticScreens.map((screen, frame) => ({...screen,frame}));
const animated: ArchiveScreen[] = sequences.map((screen, sequence) => ({label:screen.label,nodeId:screen.sourceId,sequence,width:screen.width,height:screen.height}));
// A curated mixture of app layouts, wide demos, and portrait interaction studies.
export const archiveScreens: ArchiveScreen[] = [
  stills[0], animated[0], animated[6], animated[1],
  stills[7], stills[1], animated[2], animated[7], animated[3],
  stills[8], stills[2], animated[4], animated[8], animated[5],
  stills[3], stills[9], animated[9], animated[10],
  stills[4], stills[10], animated[11], animated[12],
  stills[5], stills[11], animated[13], animated[14], stills[6],
];
