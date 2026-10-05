import {careerPlaque} from './china-court-career-lettering.js';

// The player's seventh place is behind the six existing ranks, outside the
// central imperial aisle. No existing official, desk or bed changes owner.
export const COURT_CAREER_PLACE = Object.freeze({
  registration: [20.55, .215, 32.25], archive: [21.50, .215, 32.25],
  archiveTarget: [21.44, 1.235, 31.55], court: [-3.8, 1.415, 2.8],
});

export function buildCourtCareerDesk(G, {root, H, solid3}) {
  const desk = new G.THREE.Group(); desk.name = '铨录登记 · 礼务录事独立登记与归档案'; root.add(desk);
  desk.position.y = .2; G.table(desk, 21, 31.32, 1.5, .82, 0x775744, .92);
  solid3(root, 21, 1.13, 31.32, 1.5, .15, .82, 0x775744);
  H.boundBook(root, 20.63, 1.235, 31.47, .40, .44, 0x506d70);
  const document=new G.THREE.Group();document.name='career-appointment-document';document.position.set(21.44,1.235,31.55);root.add(document);
  G.box(document,0,0,0,.38,.025,.29,0xe8d9ba);
  for(let n=0;n<4;n++)G.box(document,-.13+n*.075,.016,0,.01,.004,.20,0x555346);
  G.box(document,.11,.019,.075,.065,.008,.055,0x963f32);
  careerPlaque(G, root, '铨录登记', 21, 2.20, 30.69, 1.70, .34);
  for(const x of [20.48,21.52])G.box(root,x,1.28,31.75,.035,.16,.035,0x775744);
  careerPlaque(G, root, '礼务录事', 21, 1.38, 31.75, 1.24, .22);
}
