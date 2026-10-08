// Stable hooks on the six original books; no new desk or NPC is created.
export const personnelBookName = actorId => `personnel-source-book:${actorId}`;
export function markPersonnelBook(group, actorId, target) {
 group.name=personnelBookName(actorId);group.userData.personnelActorId=actorId;
 group.userData.personnelReadTarget=target.slice();return group;
}
export function buildPersonnelDocument(G, root) {
 const paper=new G.THREE.Group();paper.name='personnel-roster-document';
 paper.position.set(21.03,1.235,31.47);paper.visible=false;root.add(paper);
 G.box(paper,0,0,0,.30,.025,.22,0xe8d9ba);
 G.box(paper,-.132,.016,0,.022,.009,.205,0x506d70);
 for(let row=0;row<6;row++)G.box(paper,.012,.017,-.075+row*.028,.205,.004,.004,0x6a6155);
 return paper;
}
