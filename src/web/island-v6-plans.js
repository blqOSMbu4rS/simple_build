(function(root){
'use strict';
const previous=typeof module!=='undefined'&&module.exports?require('./island-v5-plans.js'):root.TownBlueprints.find(p=>p.id==='island-stonewood-v5');
const plan=JSON.parse(JSON.stringify(previous)),v=plan.construction.view;
plan.id=plan.signature=plan.silhouette='island-stonewood-v6';plan.replaces=[previous.id,...previous.replaces];
plan.description='45° RPG 小岛 v6 · 水平石木柱架 · 像素小伙伴';
v.origin=[232,86];v.tile=[36,18];v.basis=[[18,9],[-18,9]];v.roofProfile={height:60,slope:[0,0],thickness:6};
const wood='surface-timber',stone='surface-stone',plaster='surface-plaster',outline={color:'#674226',width:.4};
function box(u0,w0,u1,w1,z0,z1,texture,upright=false){
const faces=[
{points:[[u0,w0,z1],[u1,w0,z1],[u1,w1,z1],[u0,w1,z1]],texture,uv:[u0,w0,u1-u0,w1-w0],shade:0},
{points:[[u0,w1,z1],[u1,w1,z1],[u1,w1,z0],[u0,w1,z0]],texture,uv:[u0,-z1/24,u1-u0,(z1-z0)/24],shade:.12},
{points:[[u1,w1,z1],[u1,w0,z1],[u1,w0,z0],[u1,w1,z0]],texture,uv:[-w1,-z1/24,w1-w0,(z1-z0)/24],shade:.24}
];
for(const [i,f]of faces.entries()){
if(texture===stone)f.uv=i===0?[u0/1.2,w0/1.2,(u1-u0)/1.2,(w1-w0)/1.2]:[f.uv[0]/1.2,-z1/14,f.uv[2]/1.2,(z1-z0)/14];
if(texture===wood)f.outline=outline;
if(upright&&i>0){const [u,w,du,dw]=f.uv;f.uv=[w,-u-du,dw,du];f.points=[...f.points.slice(1),f.points[0]];}
}return faces;
}
function add(id,kind,u,w,material,deps,faces,anchor){
const p={id,kind,x:u,y:w,w:1,h:1,material,cost:{[material]:1},deps,seconds:1.2,workers:1,required:true,buildAction:'install',layer:2,label:'安装'+id,
workPoint:{x:240+(u-w)*16,y:272-(u+w+1)*8},view:{u,v:w,z:10,anchor,standAnchor:[u+.5,w+.5,10],faces}};
plan.parts.push(p);return p;
}
const corner=plan.parts.find(p=>p.id==='远侧墙角');corner.kind='column';corner.label='安装远侧木柱';corner.deps=['floor-0-0'];
corner.view={u:0,v:0,z:10,anchor:[.175,.175,10],standAnchor:[.5,.5,10],faces:box(0,0,.35,.35,10,54,wood,true)};
for(const [id,u,w,bounds]of [
['入口石柱',0,4,[0,4.65,.35,5]],['后角石柱',4,0,[4,0,4.4,.35]],['右侧石柱',5,0,[5.65,0,6,.35]]
]){const p=plan.parts.find(p=>p.id===id),[u0,w0,u1,w1]=bounds,wooden=id==='右侧石柱';
if(wooden){p.material='W';p.cost={W:1};p.label='安装右侧木柱';}
p.deps=[(wooden?'floor-':'base-')+u+'-'+w];p.view.faces=box(u0,w0,u1,w1,wooden?10:8,54,wooden?wood:stone,wooden);p.view.anchor=[(u0+u1)/2,(w0+w1)/2,10];p.view.standAnchor=[u+.5,w+.5,10];delete p.view.shadow;}
add('后墙木柱','column',3,0,'W',['floor-3-0'],box(2.85,0,3.15,.35,10,54,wood,true),[3,.175,10]);
add('侧墙木柱','column',0,2,'W',['floor-0-2'],box(0,2.25,.35,2.55,10,54,wood,true),[.175,2.4,10]);
const side=add('side-0','wall',0,0,'W',[],[],[.075,.5,10]);side.view.texture='wall-left';side.view.joint=[0,0,10,'back-v'];
const columns=plan.parts.filter(p=>p.kind==='column'),roofs=plan.parts.filter(p=>p.kind==='roof');
const columnIds=columns.map(p=>p.id),roofIds=roofs.map(p=>p.id);
for(const p of roofs){const a=p.view,u=p.x,w=p.y,alongU=a.texture==='beam-right';p.deps=[...columnIds];
a.faces=box(u,w,alongU?u+1:u+.35,alongU?w+.35:w+1,54,60,wood);a.anchor=[alongU?u+.5:.175,alongU?.175:w+.5,54];
a.joint=[u,w,54,alongU?'roof-u':'roof-v'];a.faces[alongU?2:1].hiddenBy=[alongU?u+1:u,alongU?w:w+1,54,alongU?'roof-u':'roof-v'];
}
for(const points of [
[[.3,.24,54],[1.2,.24,44],[1.2,.24,41],[.3,.24,51]],
[[.24,.3,54],[.24,1.2,44],[.24,1.2,41],[.24,.3,51]]
])plan.parts.find(p=>p.id==='墙角屋檐').view.faces.push({points,texture:wood,uv:[0,0,.8,.15],shade:.2,outline});
const subtract=(a,b,posts)=>posts.reduce((spans,[l,r])=>spans.flatMap(([x,y])=>r<=x||l>=y?[[x,y]]:[[x,Math.min(y,l)],[Math.max(x,r),y]].filter(([s,t])=>t-s>1e-6)),[[a,b]]);
for(const p of plan.parts.filter(p=>p.kind==='wall')){
const a=p.view,u=p.x,w=p.y;p.deps=[...p.deps.filter(id=>!columnIds.includes(id)),...roofIds];
if(p.material==='W'){
const alongU=a.texture==='wall-right',spans=subtract(alongU?u:w,(alongU?u:w)+1,alongU?[[0,.35],[2.85,3.15],[4,4.4],[5.65,6]]:[[0,.35],[2.25,2.55],[4.65,5]]);
a.faces=spans.flatMap(([l,r])=>alongU?box(l,0,r,.15,10,54,plaster):box(0,l,.15,r,10,54,plaster));
a.anchor=alongU?[u+.5,.075,10]:[.075,w+.5,10];
}
}
const wallIds=plan.parts.filter(p=>p.kind==='wall').map(p=>p.id);
for(const p of plan.parts)if(!['foundation','floor','column','roof','wall'].includes(p.kind))p.deps=[...new Set([...p.deps,...wallIds])];
const changes={
bed:{anchor:[1.55,3.65,10],width:59,height:47},bookshelf:{anchor:[.6,1.62,10],width:29,height:40},
hearth:{anchor:[4.55,.86,10],width:38,height:55},table:{anchor:[4.1,3.12,10],width:49,height:43},
chest:{anchor:[5.43,1.12,10],width:32,height:29},rug:{anchor:[4.06,3.2,10],width:57,height:32},
'床边小地毯':{anchor:[2.65,1.7,10],width:42,height:23},'bedside-plant':{anchor:[3.35,.85,10],width:21,height:30},
'面包工作台':{anchor:[1.8,.7,10],width:29,height:24},'小窗':{anchor:[.16,3.15,29],width:22,height:25,depthOffset:14},
'工具架':{anchor:[2.35,.16,31],width:29,height:18,depthOffset:32},'墙面小画':{anchor:[3.7,.16,32],width:11,height:14,depthOffset:18}
};
for(const [id,data]of Object.entries(changes)){const a=plan.parts.find(p=>p.id===id).view;Object.assign(a,data);a.standAnchor=[a.anchor[0],a.anchor[1],10];}
plan.parts.find(p=>p.kind==='hearth').view.light.anchor=[4.35,1.25,10];
const rank={foundation:0,floor:1,column:2,roof:3,wall:4};plan.parts.sort((a,b)=>(rank[a.kind]??5)-(rank[b.kind]??5));
plan.costs={W:0,S:0,C:0,B:0,D:0};for(const p of plan.parts)for(const [key,n]of Object.entries(p.cost))plan.costs[key]+=n;
if(typeof module!=='undefined'&&module.exports)module.exports=plan;else root.TownBlueprints.push(plan);
})(globalThis);
