/* An independent playable 3D plan; simulation stays in the shared engine. */
(function(root){
 'use strict';
 const source=typeof module!=='undefined'&&module.exports?require('./mini-mountain-v3-plans.js'):root.TownBlueprints.find(p=>p.id==='mini-mountain-anime-v3');
 const p=JSON.parse(JSON.stringify(source)),v=p.construction.view,h=v.tile[0]/2;
 p.id=p.signature=p.silhouette='mini-mountain-anime-3d-v1';delete p.replaces;
 p.name='迷你悬浮山 · 二次元 3D';p.description='45° 立体小屋 · 水彩线稿 · 三层开挖与逐格施工';
 v.previewImage='assets/mini-mountain/3d/preview-watercolor-v1.webp';
 v.renderer='three';v.model='assets/mini-mountain/3d/model.json';v.heightUnit=h;
 v.camera3d={azimuth:45,elevation:45,target:[0,2,0],frameHeight:10.8};
 v.background='assets/mini-mountain/3d/sky-watercolor-v1.webp';
 v.surfaces=Object.fromEntries(Object.entries({floor:[0,0,1/3,.5],plaster:[1/3,0,1/3,.5],stone:[2/3,0,1/3,.5],wood:[0,.5,1/3,.5],roof:[1/3,.5,1/3,.5]}).map(([key,rect])=>[key,{url:'assets/mini-mountain/3d/materials-watercolor-v1.webp',rect}]));
 // Natural shells and furnishings retain the original geometry, with watercolor surfaces.
 v.geometry=[{view:{level:v.levels[3].id,meshKey:'base'}},...v.levels.slice(0,3).map((l,i)=>({view:{level:l.id,meshKey:'shell-'+(2-i)}}))];
 // Preserve a lightweight Canvas display when WebGL is unavailable.
 v.fallbackGeometry=source.construction.view.geometry;
 const placements={bed:[-2,-2,1,2],table:[0,0,1,1],cabinet:[0,-2,2,1],shelf:[-2,-2,2,1],'crate-a':[-2,0,1,1],'crate-b':[0,-1,1,1],bench:[-2,-2,2,1],'tool-cabinet':[1,-2,1,1]};
 for(const a of p.parts){
  if(a.kind==='furniture'){
   const [u,w,width,depth]=placements[a.view.texture];
   a.view.meshKey='item-'+a.view.texture;
   a.view.meshClip=[a.x===u?u-.15:a.x,a.x===u+width-1?a.x+1.15:a.x+1,a.y===w?w-.15:a.y,a.y===w+depth-1?a.y+1.15:a.y+1];
  }
  // The near gable also needs its real surface; its 2D copy was sprite masked.
  if(a.kind==='gable'&&!a.view.faces.length)a.view.faces=a.view.fallbackFaces;
  for(const f of new Set([...(a.view.faces||[]),...(a.view.fallbackFaces||[])])){
   f.surface=f.color==='#e9b972'?'floor':f.color==='#e7dac0'?'plaster':f.color==='#aea4ad'?'stone':['#94633e','#ad794d'].includes(f.color)?'wood':f.color==='#acc8b6'?'roof':null;
   f.color=({'#e9b972':'#d4bda0','#94633e':'#796857','#aea4ad':'#b7b1ad','#ad794d':'#ad9278','#e7dac0':'#f2e9d9','#acc8b6':'#93a4a9'})[f.color]||f.color;
  }
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=p;else root.TownBlueprints.push(p);
})(globalThis);
