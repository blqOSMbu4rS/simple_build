/* Immutable scene data. The simulation never interprets these identities. */
(function(root){
 'use strict';
 function create(){
  const parts=[],groups=[],plans=[],id=n=>'grove-'+n;
  function tile(n,room,x,y,kind='wall',material='W',supports=[],extra={}){
   const p={id:id(n),room:id(room),x,y,kind,cost:{[material]:1},supports,seconds:1.4,grounded:false,style:{wood:'#986743',light:'#bb8758',wall:'#544d42',roof:'#496b69'},...extra};parts.push(p);return p.id;
  }
  function row(n,room,x,y,count,kind,material,supports,extra){return Array.from({length:count},(_,i)=>tile(n+i,room,x+i*16,y,kind,material,supports,extra));}
  function furniture(n,room,x,y,kind,cols,supports,capability=null){
   const g={id:id(n),kind,label:{bed:'木床',table:'生活桌',saw:'锯木台',loom:'织机',planter:'棉花种植台',shelf:'置物架'}[kind],room:id(room),parts:[],capability};
   g.parts=Array.from({length:cols},(_,i)=>tile(n+i,room,x+i*16,y,'furniture','W',supports,{group:g.id,art:{type:kind,index:i,cols},layer:4}));groups.push(g);return g;
  }
  function shell(n,room,x,floorY,width,supports,stone=false){
   const floor=row(n+'-floor',room,x,floorY,width,'floor',stone?'S':'W',supports,{grounded:stone});
   const posts=[];for(let j=0;j<3;j++)for(const k of [0,width-1])posts.push(tile(n+'-post'+j+'-'+k,room,x+k*16,floorY-16*(j+1),'post','W',j?posts.slice(-2):floor));
   const beam=row(n+'-beam',room,x,floorY-64,width,'beam','W',posts.slice(-2));
   const walls=[];for(let j=0;j<3;j++)for(let k=1;k<width-1;k++)walls.push(tile(n+'-back'+j+'-'+k,room,x+k*16,floorY-16*(j+1),j===1&&(k===2||k===3)?'window':'wall','W',floor,{layer:0}));
   const door=tile(n+'-door',room,x+8,floorY-32,'door','W',floor,{layer:3});
   return {floor,posts,beam,walls,door,all:[...floor,...posts,...beam,...walls,door]};
  }
  const low=shell('low','work',176,256,6,[],true);
  const roof=row('low-roof','work',176,192,6,'roof','W',low.beam);
  const bed=furniture('old-bed','work',192,240,'bed',2,low.floor);
  const table=furniture('old-table','work',224,224,'table',2,low.floor);
  const basic=furniture('basic-saw','work',224,240,'saw',2,low.floor,'wood-basic');
  const partition=[tile('partition0','work',216,208,'partition','W',low.floor),tile('partition1','work',216,224,'partition','W',low.floor)];
  const p1=[...low.all,...roof,...bed.parts,...table.parts,...basic.parts,...partition];
  const up=shell('up','home',176,192,6,low.beam);
  parts.find(p=>p.id===up.door).x=256;
const upRoof=row('up-roof','home',176,128,6,'roof','W',up.beam);
  const stairs=Array.from({length:6},(_,i)=>tile('stair'+i,'stairs',272+i*8,256-i*16,'stairs','W',i?[id('stair'+(i-1))]:[],{grounded:i===0,layer:3}));
  const landing=row('landing','stairs',272,192,3,'floor','W',[stairs.at(-1),...low.beam]);
  const bedA=furniture('bed-a','home',192,176,'bed',2,up.floor);
  const bedB=furniture('bed-b','home',224,176,'bed',2,up.floor);
  const shelf=furniture('home-shelf','home',240,160,'shelf',1,up.floor);
  const saw=furniture('work-saw','work',208,240,'saw',3,low.floor,'wood-full');
  const sign=tile('work-sign','work',192,192,'sign','W',low.beam,{label:'木作所',layer:5});
  const side=shell('side','textile',320,256,5,[],true);
  const sideRoof=row('side-roof','textile',320,192,5,'roof','W',side.beam);
  const bridge=row('path','textile',288,256,2,'floor','S',[],{grounded:true});
  const loom=furniture('loom','textile',336,240,'loom',2,side.floor,'weave');
  const planter=furniture('cotton','textile',400,256,'planter',2,[], 'harvest');
  parts.filter(p=>planter.parts.includes(p.id)).forEach(p=>p.grounded=true);
  const line=row('drying','textile',352,192,3,'drying','W',side.beam,{layer:5});
  const covers=[tile('quilt-a','home',192,176,'quilt','C',bedA.parts,{layer:6}),tile('quilt-b','home',224,176,'quilt','C',bedB.parts,{layer:6})];
  const curtains=[tile('curtain-a','home',208,144,'curtain','C',up.walls,{layer:6}),tile('curtain-b','home',224,144,'curtain','C',up.walls,{layer:6})];
  const lamp=tile('home-lamp','home',232,160,'lamp','W',up.floor,{layer:6});
  const mk=(type,target,extra={})=>({type,target,...extra});
  const install=ids=>ids.map(p=>mk('install',p));
  const addPlan=(n,name,description,disable,steps,settle,unlock=[])=>{
   const tasks=steps.map((s,i)=>({...s,id:id('task'+n+'-'+i),deps:i?[id('task'+n+'-'+(i-1))]:[]}));
   plans.push({id:id('plan'+n),name,description,disable:disable.map(id),tasks,settle,unlock});
  };
  addPlan(1,'① 林边安家','木石搭起一间小屋，迎接第一位居民。',[],install(p1),[{pet:id('logger'),bed:id('bed-low')}],[id('weaver')]);
  addPlan(2,'② 屋上添一层','先拆旧屋顶，再接楼板与外楼梯。施工时一层临时停用。',['work'],[...roof.map(p=>mk('dismantle',p,{recover:1})),...install([...stairs,...landing,...up.all,...upRoof,...bedA.parts,...bedB.parts,...shelf.parts])],[{pet:id('logger'),bed:id('bed-a-place')},{pet:id('weaver'),bed:id('bed-b-place')}]);
  addPlan(3,'③ 一层木作所','保留地基、梁柱、墙窗；完整搬出床与桌，拆隔断、换锯台。',['work'],[mk('move',bed.id),mk('move',table.id),...partition.map((p,i)=>mk('dismantle',p,{recover:i?0:1})),...basic.parts.map(p=>mk('dismantle',p,{recover:1})),...install([...saw.parts,sign])],[]);
  addPlan(4,'④ 织间与棉台','侧接纺织间，复用旧生活桌。种植台与织机只用木石。',[],[...install([...side.all,...bridge,...sideRoof,...loom.parts,...planter.parts,...line]),mk('reuse',table.id,{room:id('textile'),positions:[{x:368,y:240},{x:384,y:240}],supports:side.floor})],[]);
  addPlan(5,'⑤ 窗灯里的家','保留床架和住宅外壳；搬到营地过渡，添上自产布料。',['home'],install([...covers,...curtains,lamp]),[{pet:id('logger'),bed:id('bed-a-place')},{pet:id('weaver'),bed:id('bed-b-place')}]);
  return {
   id:'forest-neighbourhood-v1',version:1,name:'林边生长记',materials:{W:'木材',S:'石材',Q:'棉花',C:'布料'},parts,groups,plans,
   initial:{W:6,S:3,Q:0,C:0},capacity:{W:40,S:20,Q:8,C:12},furnitureCapacity:3,yardCapacity:12,salvageCapacity:9,
   rooms:[{id:id('camp'),name:'初始营地',initial:true,requirements:[],access:[],point:{x:64,y:272}},
    {id:id('work'),name:'一层 · 木作所',requirements:low.all,access:[low.door],point:{x:240,y:256}},
    {id:id('home'),name:'二层 · 双人住宅',route:[{x:280,y:272},{x:312,y:192},{x:264,y:192}],requirements:[...up.all,...upRoof],access:[...stairs,...landing,up.door],point:{x:224,y:192}},
    {id:id('textile'),name:'侧间 · 棉与织',requirements:[...side.all,...sideRoof],access:[...bridge,side.door],point:{x:352,y:256}},
    {id:id('stairs'),name:'外楼梯',requirements:stairs,access:[],point:{x:296,y:224}}],
   beds:[{id:id('camp-builder'),room:id('camp'),point:{x:56,y:272},permanent:true},
    {id:id('camp-a'),room:id('camp'),point:{x:72,y:272},temporary:true},{id:id('camp-b'),room:id('camp'),point:{x:88,y:272},temporary:true},
    {id:id('bed-low'),room:id('work'),group:bed.id,point:{x:208,y:256}},
    {id:id('bed-a-place'),room:id('home'),group:bedA.id,point:{x:208,y:192}},{id:id('bed-b-place'),room:id('home'),group:bedB.id,point:{x:240,y:192}}],
   pets:[{id:id('builder'),name:'栗栗',species:'bunny',color:'#d6b190',capabilities:['build','wood-gather','stone-gather'],arrival:0,home:id('camp-builder')},
    {id:id('logger'),name:'松松',species:'fox',color:'#d69362',capabilities:['woodwork'],arrival:0},
    {id:id('weaver'),name:'绒绒',species:'cat',color:'#b6bdcd',capabilities:['textile'],arrival:1}],
   recipes:[{id:id('gather-w'),name:'采木',capability:'wood-gather',input:{},output:{W:1},seconds:4,point:{x:120,y:272},buffer:8},
    {id:id('gather-s'),name:'采石',capability:'stone-gather',input:{},output:{S:1},seconds:5,point:{x:448,y:272},buffer:6},
    {id:id('wood-basic-recipe'),name:'锯木',capability:'woodwork',facility:'wood-basic',input:{},output:{W:2},seconds:9,priority:10},
    {id:id('wood-full-recipe'),name:'精加工木材',capability:'woodwork',facility:'wood-full',input:{},output:{W:3},seconds:7,priority:20},
    {id:id('harvest-recipe'),name:'采棉',capability:'textile',facility:'harvest',input:{},output:{Q:2},seconds:6,regrow:12,buffer:4,priority:5},
    {id:id('weave-recipe'),name:'织布',capability:'textile',facility:'weave',input:{Q:2},output:{C:1},seconds:7,priority:10}],
   bonus:{required:[...covers,...curtains,lamp],room:id('home'),multiplier:1.15},
   view:{size:[480,304],palette:{sky:'#243b44',haze:'#466269',ground:'#344b43',accent:'#efbc79'},levels:[{id:'all',overview:true,name:'建筑群总览',rect:[0,40,480,264]},
    {id:'lower',yRange:[190,304],name:'一层与侧间',rect:[144,168,304,120],rooms:[id('work'),id('textile'),id('stairs')]},
    {id:'upper',yRange:[0,208],name:'二层住宅',rect:[160,112,176,112],rooms:[id('home'),id('stairs')]}]}
  };
 }
 const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownGrowthConfig=api;
})(globalThis);
