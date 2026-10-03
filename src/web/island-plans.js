/* New scene revision is data only; the legacy plan and its saves remain intact. */
(function(root){
 'use strict';
 const old=typeof module!=='undefined'&&module.exports?require('./island-legacy-plans.js'):root.TownBlueprints.find(p=>p.id==='island-stonewood-v1');
 const plan=JSON.parse(JSON.stringify(old)),v=plan.construction.view;
 plan.id=plan.signature=plan.silhouette='island-stonewood-v2';plan.replaces=old.id;
 plan.description='45° RPG 小岛 · 石墙门窗 · 温暖室内';
 for(const key of ['floor','stone','wall-right','wall-left','front-right','front-left','door','window','beam-right','beam-left','steps','tools','bed','table','bookshelf','hearth','chest','rug','plant','barrel'])v.textures[key]='assets/island/v2/'+key+'.webp';
 delete v.textures.eave;
 v.background='assets/island/v2/environment.webp';v.origin=[235,90];v.tile=[40,20];v.weatherGround=205;v.petSize=[22,34];
 v.ripples=[{x:391,y:72,rx:8,ry:2},{x:62,y:288,rx:12,ry:2},{x:295,y:287,rx:10,ry:2}];
 v.path=[[0,78,160],[25,122,149],[35,122,156],[45,86,183],[68,142,198],[85,129,217],[90,133,209],[107,340,205],[110,351,208],[146,354,213],[185,368,208],[200,194,206],[240,220,212],[260,284,211],[290,325,198],[418,409,158],[430,390,97],[480,435,172]];
 v.scenery=[{texture:'tree',x:122,y:149,width:55,height:76,source:25},{texture:'tree',x:86,y:183,width:50,height:69,source:45},
  {texture:'tree',x:129,y:217,width:47,height:65,source:85},{texture:'rock',x:407,y:159,width:29,height:24,resource:'S'},
  {texture:'rock',x:422,y:170,width:21,height:18,resource:'S'}];
 for(const p of plan.parts){const a=p.view;
  if(p.kind==='foundation'){a.height=30;a.shadow={rx:18,ry:5,opacity:.12};}
  else if(p.kind==='floor'){a.z=10;a.height=22;}
  else if(p.kind==='wall'){a.z=26;a.width=20;a.height=72;if(a.texture==='wall-left'){a.v+=.5;a.skewY=1;}else{a.u+=.5;a.skewY=-1;}}
  else if(p.kind==='roof'){const left=a.flipX;a.texture=left?'beam-left':'beam-right';delete a.flipX;a.width=20;a.height=14;a.z=64;if(left)a.v+=.5;else a.u+=.5;}
  else{a.z=11;if(p.kind!=='rug')a.shadow={rx:a.width*.3,ry:3,opacity:.16};}
 }
 const changes={bed:{u:.8,v:2.3,width:62,height:55},bookshelf:{u:1,v:.1,width:32,height:49},hearth:{u:4,v:.1,width:42,height:61},
  rug:{u:3,v:2,width:66,height:37},table:{u:3.3,v:3,width:52,height:45},chest:{u:4.8,v:1,width:36,height:34},plant:{u:5,v:3,width:21,height:28},'bedside-plant':{u:.4,v:3,width:17,height:24}};
 for(const [id,data]of Object.entries(changes))Object.assign(plan.parts.find(p=>p.id===id).view,data);
 function add(id,kind,u,w,material,deps,texture,width,height,z=10,extra={}){
  plan.parts.push({id,kind,x:u,y:w,w:1,h:1,material,cost:{[material]:1},deps,seconds:1.2,workers:1,required:true,buildAction:'install',layer:2,
   label:'安装'+id,workPoint:{x:240+(u-w)*16,y:272-(u+w+1)*8},view:{u,v:w,z,texture,width,height,...extra}});
  plan.costs[material]++;
 }
 // Edge sprites occupy one projected edge, not a full diamond: no overlaps across the doorway.
 for(let u=0;u<6;u++)if(u!==2)add('front-'+u,'wall',u,4,'S',['floor-'+u+'-4'],'front-right',20,30,5,{u:u-.5,skewY:-.15});
 for(let w=0;w<5;w++)add('edge-'+w,'wall',5,w,'S',['floor-5-'+w],'front-left',20,30,5,{v:w-.5,skewY:.15});
 add('远侧墙角','wall',0,0,'W',['floor-0-0'],'wall-left',20,72,26,{v:.5,skewY:1});
 add('墙角屋檐','roof',0,0,'B',['远侧墙角'],'beam-left',20,14,64,{v:.5});
 add('门','door',2,4,'W',['floor-2-4','front-1','front-3'],'door',22,43,5,{u:1.5});
 add('石台阶','steps',2,5,'S',['门'],'steps',29,23,-6,{u:2,v:4.7});
 add('小窗','window',0,1,'W',['side-1'],'window',24,28,32,{flipX:true,depthOffset:.2});
 add('工具架','decoration',2,0,'W',['back-2'],'tools',25,22,30,{depthOffset:.2});
 add('门外木桶','barrel',5,3,'W',['edge-3'],'barrel',23,29,0,{u:6.1,v:3.4,shadow:{rx:10,ry:3,opacity:.2}});
 if(typeof module!=='undefined'&&module.exports)module.exports=plan;else root.TownBlueprints.push(plan);
})(globalThis);
