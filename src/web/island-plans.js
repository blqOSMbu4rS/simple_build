/* Scene revision data: shared-edge structure, reference furnishings and pixel workers. */
(function(root){
 'use strict';
 const previous=typeof module!=='undefined'&&module.exports?require('./island-v3-plans.js'):root.TownBlueprints.find(p=>p.id==='island-stonewood-v3');
 const plan=JSON.parse(JSON.stringify(previous)),v=plan.construction.view;
 plan.id=plan.signature=plan.silhouette='island-stonewood-v4';plan.replaces=[previous.id,...[].concat(previous.replaces||[]).flat()];
 plan.description='45° RPG 小岛 · 石木花窗 · 像素小伙伴';
 v.origin=[235,84];v.tile=[36,18];v.petSize=[24,36];v.petStyle={smoothing:false,pixelSnap:true};
 for(const key of ['bunny','fox','workbench','picture','fence-left','fence-right'])v.textures[key]='assets/island/v4/'+key+'.webp';
 v.textures['surface-stone']='assets/island/v4/stone.webp';
 for(const a of v.path){if(a[0]===240){a[1]=113;a[2]=158;}else if(a[0]===260){a[1]=385;a[2]=164;}}
 function box(u0,v0,u1,v1,z0,z1,texture){return [
  {points:[[u0,v0,z1],[u1,v0,z1],[u1,v1,z1],[u0,v1,z1]],texture,uv:[u0,v0,u1-u0,v1-v0],shade:.02},
  {points:[[u0,v1,z1],[u1,v1,z1],[u1,v1,z0],[u0,v1,z0]],texture,uv:[u0,-z1/20,u1-u0,(z1-z0)/20],shade:.12},
  {points:[[u1,v1,z1],[u1,v0,z1],[u1,v0,z0],[u1,v1,z0]],texture,uv:[-v1,-z1/20,v1-v0,(z1-z0)/20],shade:.23}
 ];}
 const wood='surface-timber',stone='surface-stone';
 for(const p of plan.parts){const a=p.view,u=p.x,w=p.y;
  if(p.kind==='wall'&&p.material==='W'){
   const alongU=a.texture==='wall-right',next=a.faces[6].hiddenBy;
   const post=alongU?box(u,w,u+.15,w+.18,10,54,wood):box(u,w,u+.18,w+.15,10,54,wood);
   const end=alongU?box(u+.85,w,u+1,w+.18,10,54,wood):box(u,w+.85,u+.18,w+1,10,54,wood);
   for(const f of end)f.hiddenBy=next;a.faces.splice(3,6,...post,...end);
  }else if(p.kind==='roof'){
   const alongU=a.texture==='beam-right';a.faces=box(u,w,alongU?u+1:u+.3,alongU?w+.3:w+1,54,60,wood);
  }
 }
 const changes={
  bed:{anchor:[1.8,3.95,10],width:58,height:43},bookshelf:{anchor:[1.05,2.15,10],width:28,height:38},
  hearth:{anchor:[4.8,.95,10],width:38,height:52},rug:{anchor:[3.7,3.55,10],width:56,height:31},
  table:{anchor:[4.5,3.2,10],width:47,height:40.5},chest:{anchor:[5.6,1.1,10],width:34,height:30},
  plant:{anchor:[5.5,3.5,10],width:19,height:25},'bedside-plant':{anchor:[3.3,1.6,10],width:22,height:31},
  '小窗':{anchor:[.17,2.7,22],width:20,height:22},'工具架':{anchor:[2.1,.15,27],width:24,height:20},
  '门外木桶':{anchor:[6.65,2.1,0],width:22,height:27}
 };
 for(const [id,data]of Object.entries(changes)){const a=plan.parts.find(p=>p.id===id).view;Object.assign(a,data);if(a.shadow)a.shadow.rx=a.width*.3;}
 function add(id,kind,u,w,material,deps,view,layer=2){
  plan.parts.push({id,kind,x:u,y:w,w:1,h:1,material,cost:{[material]:1},deps,seconds:1.2,workers:1,required:true,buildAction:'install',layer,
   label:'安装'+id,workPoint:{x:240+(u-w)*16,y:272-(u+w+1)*8},view:{u,v:w,z:10,standAnchor:[u+.5,w+.5,10],...view}});plan.costs[material]++;
 }
 add('入口石柱','column',0,4,'S',['base-0-4','side-4'],{anchor:[.175,4.825,10],faces:box(0,4.65,.35,5,10,54,stone)});
 add('后角石柱','column',0,0,'S',['base-0-0','远侧墙角','back-0'],{anchor:[.35,.35,10],faces:box(0,0,.35,.35,10,54,stone)});
 add('右侧石柱','column',5,0,'S',['base-5-0','back-5'],{anchor:[5.825,.175,10],faces:box(5.65,0,6,.35,10,54,stone)});
 add('面包工作台','workbench',2,1,'W',['floor-2-1','back-2'],{anchor:[2.05,1.3,10],texture:'workbench',width:29,height:24});
 add('墙面小画','decoration',3,0,'W',['back-3'],{anchor:[3.4,.14,31],texture:'picture',width:16,height:19});
 add('炉边小盆栽','plant',4,0,'B',['hearth'],{anchor:[4.25,1.1,28],texture:'plant',width:9,height:12,depthOffset:8});
 add('入口左花箱','planter',0,4,'B',['front-0'],{anchor:[.8,5.45,0],standAnchor:[.8,5.45,0],texture:'fence-left',width:44,height:29});
 add('入口右花箱','planter',4,4,'B',['front-4'],{anchor:[4.5,5.4,0],standAnchor:[4.5,5.4,0],texture:'fence-right',width:48,height:30});
 add('床边小地毯','rug',3,2,'B',['floor-3-2'],{anchor:[3,2,10],texture:'rug',width:44,height:23},1.5);
 // Larger masonry stones use the same global UV phase across every adjoining face.
 for(const p of plan.parts)for(const f of p.view.faces||[])if(f.texture===stone)f.uv=f.uv.map(n=>n/2);
 if(typeof module!=='undefined'&&module.exports)module.exports=plan;else root.TownBlueprints.push(plan);
})(globalThis);
