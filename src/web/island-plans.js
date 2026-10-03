/* The painterly cottage is authored per surface and per object; construction stays shared. */
(function(root){
 'use strict';
 const previous=typeof module!=='undefined'&&module.exports?require('./island-v4-plans.js'):root.TownBlueprints.find(p=>p.id==='island-stonewood-v4');
 const plan=JSON.parse(JSON.stringify(previous)),v=plan.construction.view;
 plan.id=plan.signature=plan.silhouette='island-stonewood-v5';plan.replaces=[previous.id,...previous.replaces];
 plan.description='45° RPG 小岛 v5 · 原图石木质感 · 像素小伙伴';v.origin=[232,105];v.basis=[[17,6.3],[-18,8.4]];
 v.roofProfile={height:74,slope:[-8/3,-2],thickness:8};
 v.background='assets/island/v5/environment.webp';
 for(const a of v.path){if(a[0]===240){a[1]=100;a[2]=136;}else if(a[0]===260){a[1]=374;a[2]=140;}}
 for(const key of ['floor','timber','plaster','stone'])v.textures['surface-'+key]='assets/island/v5/'+key+'.webp';
 for(const key of ['bed','bookshelf','hearth','table','tools','window','door','logs'])v.textures[key]='assets/island/v5/'+key+'.webp';
 v.harvestRemnant={texture:'logs',offset:[20,2],size:[26,17]};
 const wood='surface-timber',stone='surface-stone',plaster='surface-plaster';
 const outline={color:'#674226',width:.45};
 const ceiling=(u,w)=>v.roofProfile.height+u*v.roofProfile.slope[0]+w*v.roofProfile.slope[1];
 function box(u0,w0,u1,w1,z0,z1,texture,edges=false,upright=false){
  const uvScale=texture===stone?.5:1;
  const faces=[
   {points:[[u0,w0,z1],[u1,w0,z1],[u1,w1,z1],[u0,w1,z1]],texture,uv:[u0,w0,u1-u0,w1-w0],shade:0},
   {points:[[u0,w1,z1],[u1,w1,z1],[u1,w1,z0],[u0,w1,z0]],texture,uv:[u0,-z1/24,u1-u0,(z1-z0)/24],shade:.16},
   {points:[[u1,w1,z1],[u1,w0,z1],[u1,w0,z0],[u1,w1,z0]],texture,uv:[-w1,-z1/24,w1-w0,(z1-z0)/24],shade:.32}
  ];for(const [i,f]of faces.entries()){
   f.uv=f.uv.map(n=>n*uvScale);if(edges)f.outline=outline;
   if(upright&&i>0){const [u,w,du,dw]=f.uv;f.uv=[w,-u-du,dw,du];f.points=[...f.points.slice(1),f.points[0]];}
  }return faces;
 }
 function underRoof(faces,top){
  for(const f of faces){const q=f.points.map(p=>[p[0],p[1],p[2]===top?ceiling(p[0],p[1])-8:p[2]]);
   if(f.points.every(p=>p[2]===top))f.points=q;else{f.clipPoints=q;f.clipPadding=.25;}
  }return faces;
 }
 function brace(u0,w0,z0,u1,w1,z1){
  const points=[[u0,w0,z0],[u1,w1,z1],[u1,w1,z1-3],[u0,w0,z0-3]];
  return {points,texture:wood,uv:[0,0,.8,.15],shade:.25,outline};
 }
 function footing(u,w,alongU){
  return {color:'#593922',opacity:.19,clipReceivers:true,points:alongU?[[u,w+.15,10],[u+1,w+.15,10],[u+1,w+.55,10],[u,w+.55,10]]:[[u+.15,w,10],[u+.55,w,10],[u+.55,w+1,10],[u+.15,w+1,10]]};
 }
 for(const p of plan.parts){const a=p.view,u=p.x,w=p.y;
  if(p.kind==='floor'){
   a.receivesLight=true;a.faces[0].uv=[u/3,w/3,(u+1)/3-u/3,(w+1)/3-w/3];
  }else if(p.kind==='wall'&&p.material==='W'){
   const alongU=a.texture==='wall-right',next=a.faces[6]?.hiddenBy||a.faces[alongU?2:1].hiddenBy;
   a.faces=underRoof(box(u,w,alongU?u+1:u+.15,alongU?w+.15:w+1,10,66,plaster),66);a.faces[alongU?2:1].hiddenBy=next;a.shadow=footing(u,w,alongU);
   // Only real frame posts remain; adjacent plaster panels share their continuous material.
   const at=alongU?u:w,last=alongU?5:4;
   if(at===0||at===3||!alongU&&at===2)a.faces.push(...underRoof(alongU?box(u,w,u+.23,w+.22,10,66,wood,true,true):box(u,w,u+.22,w+.23,10,66,wood,true,true),66));
   if(at===last){const end=underRoof(alongU?box(u+.77,w,u+1,w+.22,10,66,wood,true,true):box(u,w+.77,u+.22,w+1,10,66,wood,true,true),66);for(const f of end)f.hiddenBy=next;a.faces.push(...end);}
   // Narrow shaded panels beneath the roof and timber create contact rather than flat stripes.
   const band=alongU?box(u,w+.15,u+1,w+.16,62,66,plaster):box(u+.15,w,u+.16,w+1,62,66,plaster);
   for(const f of band){for(const q of f.points)q[2]+=ceiling(q[0],q[1])-74;f.shade=.23;}a.faces.push(...band);
  }else if(p.kind==='roof'){
   const alongU=a.texture==='beam-right';a.faces=box(u,w,alongU?u+1:u+.4,alongU?w+.4:w+1,66,74,wood,true);
   const connector=alongU?box(u+.04,w-.02,u+.14,w+.43,74,74.8,wood,true):box(u-.02,w+.04,u+.43,w+.14,74,74.8,wood,true);a.faces.push(...connector);
   for(const f of a.faces)for(const q of f.points)q[2]+=ceiling(q[0],q[1])-74;
  }else if(p.kind==='column'){
   if(p.id==='后角石柱'){
    p.x=4;p.y=0;p.deps=['base-4-0','back-4'];p.workPoint={x:304,y:232};a.anchor=[4.2,.175,10];a.standAnchor=[4.5,.5,10];a.faces=box(4,0,4.4,.35,10,45,stone,true);
   }else{
    const left=p.x===0,u0=left?0:5.65,w0=left?4.65:0;
    a.faces=underRoof(box(u0,w0,u0+.35,w0+.35,10,66,stone,true),66);
    const cap=box(u0,w0,u0+.35,w0+.35,63,67,wood,true);for(const f of cap)for(const q of f.points)q[2]+=ceiling(q[0],q[1])-74;a.faces.push(...cap);
    if(!left)a.faces.push(...underRoof(box(5.98,0,6.12,.35,10,66,wood,true,true),66));
   }
  }else if(p.kind==='wall'&&p.material==='S'){
   // The continuous wooden cap has bevelled contrasting sides, without outlining floor grid cells.
   for(const [i,f]of a.faces.entries())if(i>=3){f.shade=i===3?0:i===4?.14:.34;f.outline={...outline,edges:[[0,1],[2,3]]};}
  }
 }
 // The corner's two diagonal braces are owned by that single installed timber corner.
 const corner=plan.parts.find(p=>p.id==='远侧墙角');
 corner.view.faces.push(...underRoof(box(0,0,.38,.38,10,66,wood,true,true),66),brace(.3,.23,63,1.2,.23,53),brace(.23,.3,63,.23,1.2,53));
 const changes={
  bed:{anchor:[1.67,2.92,10],width:55,height:42},bookshelf:{anchor:[.5,1.42,10],width:28,height:39},
  hearth:{anchor:[4.66,.79,10],width:38,height:55,light:{anchor:[4.4,1.2,10],radius:38,pulse:.04,stops:[[0,'#ffd38c66'],[.5,'#ffb54426'],[1,'#ffb54400']]}},
  table:{anchor:[4.2,2.8,10],width:48,height:42},chest:{anchor:[5.9,.8,10],width:32,height:29},
  rug:{anchor:[4.21,2.92,10]},'床边小地毯':{anchor:[2.02,2.3,10]},'bedside-plant':{anchor:[3.22,1.15,10]},
  '面包工作台':{anchor:[1.25,.85,10]},'小窗':{anchor:[.2,3.02,28],width:22,height:25,flipX:false},
  '工具架':{anchor:[1.51,.15,28],width:34,height:19},
  '墙面小画':{anchor:[2.9,.18,31],width:11,height:14},
  '门':{anchor:[3.5,5,10],standAnchor:[3.5,4.5,10],width:22,height:31},
  '门外木桶':{anchor:[6.8,1.1,0],width:22,height:27},
  '入口左花箱':{anchor:[1.5,5.45,0],standAnchor:[1.5,5.45,0]},'入口右花箱':{anchor:[5.6,5.25,0],standAnchor:[5.6,5.25,0]},
  '炉边小盆栽':{anchor:[.55,4.55,10],standAnchor:[.55,4.55,10],width:10,height:13,depthOffset:0}
 };
 for(const [id,data]of Object.entries(changes))Object.assign(plan.parts.find(p=>p.id===id).view,data);
 for(const p of plan.parts)if(!p.view.faces){
  p.view.fit=true;p.view.standAnchor=[p.view.anchor[0],p.view.anchor[1],Math.min(p.view.anchor[2]||0,10)];
  if(!['door','window','decoration'].includes(p.kind))p.view.shadow={color:'#593922',opacity:.18,rx:p.view.width*.34,ry:2.5};
 }
 plan.parts.push({id:'入口短木堆',kind:'timberStack',x:0,y:4,w:1,h:1,material:'W',cost:{W:1},deps:['front-0'],seconds:1.2,workers:1,required:true,buildAction:'install',layer:2,label:'整理入口短木堆',workPoint:{x:176,y:232},
  view:{u:0,v:4,z:0,anchor:[-.8,5,0],standAnchor:[-.8,5,0],texture:'logs',width:30,height:19,fit:true,shadow:{color:'#593922',opacity:.2,rx:12,ry:2.5}}});plan.costs.W++;
 // Move the doorway one cell along the same front edge, preserving one task per tile.
 const panel=plan.parts.find(p=>p.id==='front-3');panel.x=2;panel.deps=['floor-2-4'];panel.workPoint={x:208,y:216};panel.view.anchor[0]--;panel.view.standAnchor[0]--;panel.view.joint[0]--;
 for(const f of panel.view.faces){for(const q of f.points)q[0]--;if(f.hiddenBy)f.hiddenBy[0]--;}
 const door=plan.parts.find(p=>p.id==='门');door.x=3;door.deps=['floor-3-4','front-3','front-4'];door.workPoint={x:224,y:208};
 const steps=plan.parts.find(p=>p.kind==='steps');steps.x=3;steps.view.anchor[0]++;steps.view.standAnchor[0]++;steps.workPoint.x+=16;steps.workPoint.y-=8;for(const f of steps.view.faces)for(const q of f.points)q[0]++;
 for(const p of plan.parts)for(const f of p.view.faces||[])if(f.texture===stone){
  const [a,b,,d]=f.points;if(a[2]===b[2]&&a[2]===d[2])f.uv=[a[0]/1.2,a[1]/1.2,(b[0]-a[0])/1.2,(d[1]-a[1])/1.2];
  else if(a[1]===b[1])f.uv=[a[0]/1.2,-a[2]/14,(b[0]-a[0])/1.2,(a[2]-d[2])/14];
  else f.uv=[-a[1]/1.2,-a[2]/14,(a[1]-b[1])/1.2,(a[2]-d[2])/14];
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=plan;else root.TownBlueprints.push(plan);
})(globalThis);
