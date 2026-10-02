/* Authored scene data; the simulation and diagonal renderer know no scene IDs. */
(function(root){
 'use strict';
 const parts=[],costs={W:0,S:0,C:0,B:0,D:0};
 const textures=Object.fromEntries(['floor','stone','wall-right','wall-left','bed','table','bookshelf','hearth','chest','rug','plant','eave','tree','stump','rock','bunny','fox'].map(key=>[key,'assets/island/'+key+'.webp']));
 function add(id,kind,u,v,material,deps,texture,width,height,layer=2,z=0){
  parts.push({id,kind,x:u,y:v,w:1,h:1,material,cost:{[material]:1},deps,seconds:1.2,workers:1,required:true,
   buildAction:'install',layer,label:'安装'+({foundation:'石基',floor:'木地板',wall:'石木墙',roof:'屋檐'}[kind]||'室内'+id),
   workPoint:{x:240+(u-v)*16,y:272-(u+v+1)*8},view:{u,v,z,texture,width,height}});costs[material]++;
 }
 for(let v=0;v<5;v++)for(let u=0;u<6;u++)add('base-'+u+'-'+v,'foundation',u,v,'S',[], 'stone',40,22,0);
 for(let v=0;v<5;v++)for(let u=0;u<6;u++)add('floor-'+u+'-'+v,'floor',u,v,'W',['base-'+u+'-'+v],'floor',40,22,1,3);
 for(let u=0;u<6;u++)add('back-'+u,'wall',u,0,'W',['floor-'+u+'-0'],'wall-right',40,65,2,3);
 for(let v=1;v<5;v++)add('side-'+v,'wall',0,v,'W',['floor-0-'+v],'wall-left',40,65,2,3);
 // Only far eaves are exposed in this roof cutaway, leaving the furnished room visible.
 for(const p of parts.filter(p=>p.kind==='wall')){
  add('eave-'+p.id,'roof',p.view.u,p.view.v,'B',[p.id],'eave',40,26,3,39);
  parts.at(-1).view.flipX=p.view.texture==='wall-left';
 }
 const floor=(u,v)=>['floor-'+u+'-'+v];
 add('rug','rug',3,2,'B',floor(3,2),'rug',70,40,1.5,4);
 add('bed','bed',1,2,'W',floor(1,2),'bed',54,50,2,4);
 add('bookshelf','bookshelf',1,0,'W',['back-1'],'bookshelf',34,52,2,4);
 add('hearth','hearth',4,0,'S',['base-4-0','back-4'],'hearth',44,55,2,4);
 add('table','table',3,3,'W',floor(3,3),'table',50,43,2,4);
 add('chest','chest',5,1,'W',floor(5,1),'chest',30,28,2,4);
 add('plant','plant',5,3,'B',floor(5,3),'plant',22,29,2,4);
 add('bedside-plant','plant',0,3,'B',floor(0,3),'plant',19,25,2,4);
 const id='island-stonewood-v1';
 const plan={id,signature:id,silhouette:id,name:'小岛石木小屋',description:'45° RPG 小岛 · 砍树找石 · 丰富室内',
  residential:true,template:true,cutaway:true,gridBuild:true,pixelsPerMeter:16,petHeightMeters:1,spaces:1,layout:'wood',parts,costs,
  environment:{weather:'clear',ground:[55,130,370,110]},
  construction:{rest:[{x:240,y:272},{x:260,y:272}],gathering:{worker:1,multiplier:2,sources:{W:35,S:418,B:90,D:110},water:430,mix:185,trees:[25,45,85]},
   view:{projection:'diagonal',origin:[235,115],tile:[40,20],weatherGround:225,background:'assets/island/environment.webp',textures,
    path:[[0,58,167],[25,75,170],[35,80,174],[45,100,195],[68,158,235],[85,97,232],[90,100,235],[107,319,236],[110,337,232],[146,337,238],[185,356,231],[200,185,218],[240,235,225],[260,263,216],[290,302,206],[418,398,181],[430,383,101],[480,421,167]],
    scenery:[{texture:'tree',x:75,y:170,width:61,height:85,source:25},{texture:'tree',x:100,y:195,width:56,height:76,source:45},
     {texture:'tree',x:97,y:232,width:52,height:70,source:85},{texture:'tree',x:325,y:91,width:48,height:66},
     {texture:'tree',x:379,y:233,width:52,height:73},{texture:'rock',x:399,y:181,width:38,height:31,resource:'S'},
     {texture:'rock',x:413,y:192,width:26,height:22,resource:'S'},{texture:'stump',x:101,y:236,width:22,height:16}]}}};
 if(typeof module!=='undefined'&&module.exports)module.exports=plan;else root.TownBlueprints.push(plan);
})(globalThis);
