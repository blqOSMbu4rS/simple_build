/* Local building templates; identities and limits are scene data. */
(function(root){
 'use strict';
 function create(){
  const style={wood:'#986743',light:'#bb8758',wall:'#544d42',roof:'#496b69'};
  function unit(id,name,width,contents,extra={}){
   const parts=[],groups=[],beds=[],add=(id,x,y,kind,supports=[],more={})=>{parts.push({id,x,y,kind,supports,cost:{W:1},seconds:1.4,style:{...style},pixelRatio:30/16,...more});return id;};
   const floor=Array.from({length:width},(_,i)=>add('floor-'+i,i*16,0,'floor',[],{cost:{S:1},grounded:true}));
   const posts=[];for(let j=0;j<3;j++)for(const i of [0,width-1])posts.push(add('post-'+j+'-'+i,i*16,-16*(j+1),'post',j?posts.slice(-2):floor));
   const beam=Array.from({length:width},(_,i)=>add('beam-'+i,i*16,-64,'beam',posts.slice(-2)));
   const walls=[];for(let j=0;j<3;j++)for(let i=1;i<width-1;i++)walls.push(add('back-'+j+'-'+i,i*16,-16*(j+1),j===1&&(i===2||i===3)?'window':'wall',floor,{layer:0}));
   const roof=Array.from({length:width},(_,i)=>add('roof-'+i,i*16,-64,'roof',beam,{layer:3}));
   const caps={};for(const [side,x]of [['left',0],['right',(width-1)*16]])caps[side]=[add('cap-'+side+'-0',x,-32,'partition',floor,{layer:5}),add('cap-'+side+'-1',x,-16,'partition',floor,{layer:5})];
   for(const item of contents){const [key,type,x,y,cols,capability]=item,g={id:key,kind:type,label:{bed:'木床',table:'生活桌',saw:'锯木台',loom:'织机',planter:'棉花种植台',shelf:'置物架'}[type],parts:[],capability};
    for(let i=0;i<cols;i++)g.parts.push(add(key+'-'+i,x+i*16,y,'furniture',floor,{group:key,art:{type,index:i,cols},layer:4}));groups.push(g);
    if(type==='bed')beds.push({id:key+'-place',group:key,point:{x:x+16,y:0}});
   }
   const ports=[{id:'west',side:'left',x:0,y:0,types:['side','step','upper'],caps:caps.left},{id:'east',side:'right',x:width*16,y:0,types:['side','step','upper'],caps:caps.right}];
   return {id,name,width:width*16,height:64,parts,groups,beds,ports,roof,structural:[...floor,...posts,...beam,...walls],floor,beam,
    footprint:[0,-64,width*16,64],imageBounds:[-2,-68,width*16+4,76],clearance:[0,-36,width*16,36],bearing:[0,width*16],allowsUpper:true,...extra};
  }
  const starter=unit('cabin','起居作业小屋',8,[['old-bed','bed',16,-16,2],['old-table','table',48,-16,2],['basic-saw','saw',80,-16,2,'wood-basic']]);
  starter.parts.push({id:'inner-divider',x:56,y:-32,kind:'partition',cost:{W:1},seconds:1.4,supports:starter.floor,style,pixelRatio:30/16});
  const homeSmall=unit('compact','紧凑住宅 · 6米',6,[['bed-a','bed',16,-16,2],['bed-b','bed',48,-16,2],['home-shelf','shelf',64,-32,1]]);
  const homeLarge=unit('wide','宽敞住宅 · 8米',8,[['bed-a','bed',16,-16,2],['bed-b','bed',64,-16,2],['shelf','shelf',96,-32,1]]);
  const textile=unit('textile-room','纺织间与棉台',8,[['loom-device','loom',16,-16,2,'weave'],['cotton-device','planter',80,-16,2,'harvest']]);
  const workshop=unit('wood-room','木作扩展间',5,[['decor','saw',16,-16,2]]);
  const store=unit('store-room','储藏屋',6,[['decor','shelf',16,-16,2]]);
  const garden=unit('garden-room','小花园',4,[['decor','planter',16,-16,2]],{allowsUpper:false});
  garden.parts.forEach(p=>{if(p.kind==='wall'||p.kind==='window')p.kind='trellis';if(p.kind==='roof')p.kind='pergola';});
  const templates=[{id:'living',name:'起居作业小屋',limit:1,variants:[starter]},
   {id:'housing',name:'住宅',limit:2,variants:[homeSmall,homeLarge]},
   {id:'textile',name:'纺织间',limit:1,variants:[textile]},
   {id:'workshop',name:'木作扩展间',limit:1,variants:[workshop],effect:{capability:'woodwork',efficiency:.2}},
   {id:'store',name:'储藏屋',limit:1,variants:[store],effect:{capacity:4}},
   {id:'garden',name:'小花园',limit:1,variants:[garden],effect:{residents:true,efficiency:.05,decorations:['garden-flowers','garden-lanterns']}}];
  const slots=[{id:'cabin-1',template:'living'},{id:'home-1',template:'housing'},{id:'textile-1',template:'textile'},{id:'home-2',template:'housing'},{id:'workshop-1',template:'workshop'},{id:'store-1',template:'store'},{id:'garden-1',template:'garden'}];
  const plans=[{id:'settle',name:'① 林边安家',description:'建造完整起居小屋，迎接第一位居民。',slot:slots[0].id,base:true,requires:[],mode:'build'},
   {id:'housing',name:'② 增加住宅',description:'选择实际尺寸与合法相邻位置；连接验收后入住。',slot:slots[1].id,base:true,requires:['settle'],mode:'build'},
   {id:'growth-refit',name:'③ 改建木作所',description:'原小屋保留主体，搬出床桌、拆隔断并升级锯台。',slot:slots[0].id,base:true,requires:['housing'],mode:'refit'},
   {id:'textile',name:'④ 增加纺织间',description:'独立织间与棉台，复用原生活桌。',slot:slots[2].id,base:true,requires:['growth-refit'],mode:'build',reuseTable:true},
   {id:'growth-comfort',name:'⑤ 改善住宅',description:'为选定住宅添床品、窗帘和灯具；保留床架。',base:true,requires:['textile'],mode:'comfort',targetTemplate:'housing'},
   ...slots.slice(3).map(slot=>({id:'build-'+slot.id,name:templates.find(t=>t.id===slot.template).name+(slot.template==='housing'?' · 第二栋':''),description:slot.template==='housing'?'新增空置床位，不增加居民。':({workshop:'现有木作岗位作业效率 +20%，配方和运输不变。',store:'四种仓库基础容量 ×4。',garden:'已入住居民作业效率 +5%，两种摆设。'})[slot.template],slot:slot.id,base:false,requires:['growth-comfort'],mode:'build'}))];
  return {id:'forest-modular-v1',version:1,name:'林边相邻小镇',templates,slots,plans,root:{slot:slots[0].id,x:256,y:256},connections:{side:{gaps:[48,64],rise:0},step:{gaps:[64],rise:16},upper:{gaps:[64],rise:64}},
   materials:{W:'木材',S:'石材',Q:'棉花',C:'布料'},initial:{W:36,S:6,Q:0,C:0},capacity:{W:2100,S:600,Q:30,C:340},furnitureCapacity:3,yardCapacity:12,salvageCapacity:9,
   interactions:{interval:75,slots:3,pickup:3,pickupKinds:['W','S','Q'],commission:{W:4,S:3},reward:{S:3,W:5},assistBatches:3,assistEfficiency:.1},
   camp:{id:'camp',name:'初始营地',initial:true,requirements:[],access:[],point:{x:64,y:272}},
   campBeds:[{id:'camp-builder',room:'camp',point:{x:56,y:272},permanent:true},{id:'camp-a',room:'camp',point:{x:72,y:272},temporary:true},{id:'camp-b',room:'camp',point:{x:88,y:272},temporary:true}],
   pets:[{id:'builder',name:'栗栗',species:'bunny',color:'#d6b190',capabilities:['build','wood-gather','stone-gather'],arrival:0,home:'camp-builder'},
    {id:'logger',name:'松松',species:'fox',color:'#d69362',capabilities:['woodwork'],arrival:0},{id:'weaver',name:'绒绒',species:'cat',color:'#b6bdcd',capabilities:['textile'],arrival:1}],
   recipes:[{id:'gather-w',name:'采木',capability:'wood-gather',input:{},output:{W:1},seconds:4,point:{x:120,y:272},buffer:8},{id:'gather-s',name:'采石',capability:'stone-gather',input:{},output:{S:1},seconds:5,point:{x:112,y:272},buffer:600},
    {id:'wood-basic-recipe',name:'锯木',capability:'woodwork',facility:'wood-basic',input:{},output:{W:2},seconds:9,priority:10},{id:'wood-full-recipe',name:'精加工木材',capability:'woodwork',facility:'wood-full',input:{},output:{W:3},seconds:7,priority:20},
    {id:'harvest-recipe',name:'采棉',capability:'textile',facility:'harvest',input:{},output:{Q:2},seconds:6,regrow:12,buffer:30,priority:5},{id:'weave-recipe',name:'织布',capability:'textile',facility:'weave',input:{Q:2},output:{C:1},seconds:7,priority:10}],
   view:{size:[480,304],palette:{sky:'#243b44',haze:'#466269',ground:'#344b43',accent:'#efbc79'},levels:[{id:'all',overview:true,name:'营地与小镇',rect:[0,80,600,224]},{id:'lower',name:'地面层',yRange:[224,304],rect:[128,168,352,136]},{id:'upper',name:'上层',yRange:[0,224],rect:[128,64,352,176]}]}};
 }
 const api={create};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownGrowthConfig=api;
})(globalThis);
