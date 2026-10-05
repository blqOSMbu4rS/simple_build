/* Eight-storey authored data. Behavior belongs to shared capabilities. */
(function(root){
 'use strict';
 const parts=[],terrain=[],geometry=[],costs={W:0,S:0,C:0,B:0,D:0};
 const levels=[['attic','3F','主卧室',160],['dining','2F','餐厅与阳台',80],['kitchen','1F','厨房与入口',0],['living','B1','双沙发客厅',-80],['bedroom','B2','卧室与吧台',-160],['hall','B3','山腹餐厨',-240],['study','B4','藏书与书房',-320],['retreat','B5','山底休憩室',-400]].map(([id,label,name,elevation])=>({id,label,name,elevation,underground:elevation<0,camera:[110,Math.max(0,195-elevation),430,215]}));
 const level=id=>levels.find(a=>a.id===id),order=(id,n)=>((level(id).elevation+400)/80)*1000+n;
 const colors={timber:'#755035',plaster:'#c6b9a0',rock:'#686964',slate:'#58616b',stone:'#96917e'};
 const textures=Object.fromEntries(['bed','sofa','table','counter','shelf','hearth','window','door','ivy','plant','desk','barrels','tree','lamp','rug','timber','plaster','rock','slate'].map(k=>[k,'assets/floating/'+k+'.webp']));
 textures.bunny='assets/island/v4/bunny.webp';textures.fox='assets/island/v4/fox.webp';
 textures.stone='assets/floating/stone.webp';textures.shell='assets/floating/shell.webp';textures.stoneWindow='assets/floating/stoneWindow.webp';
 function surface(points,texture,shade=0,uv=[0,0,1,1]){return {points,texture,color:colors[texture]||'#8b8069',shade,uv};}
 function box(u,v,w,d,z,h,texture){return [
  surface([[u,v,z+h],[u+w,v,z+h],[u+w,v+d,z+h],[u,v+d,z+h]],texture,0,[u*.17,v*.17,w*.17,d*.17]),
  surface([[u,v+d,z+h],[u+w,v+d,z+h],[u+w,v+d,z],[u,v+d,z]],texture,.1,[u*.17,-(z+h)/96,w*.17,h/96]),
  surface([[u+w,v+d,z+h],[u+w,v,z+h],[u+w,v,z],[u+w,v+d,z]],texture,.22,[v*.17,-(z+h)/96,d*.17,h/96])];}
 function add(id,kind,u,v,l,material,deps,faces,n,label){
  const z=level(l).elevation,p={id,kind,x:u,y:v,w:1,h:1,material:material||'S',cost:material?{[material]:1}:{},deps:[...new Set(deps.filter(Boolean))],seconds:material?1.2:2.4,workers:1,required:true,buildAction:material?'install':'excavate',layer:2,label,
   workPoint:{x:240+(u-v)*12,y:224},view:{u,v,z,level:l,anchor:[u+.5,v+.5,z+4],standAnchor:[u+.5,v+.65,z+4],faces,order:order(l,n)}};
  parts.push(p);if(material)costs[material]++;return p;
 }
 const floors=new Map(),frames=new Map(),stairs=new Map(),retainedFaces=[];
 function floor(l,entry){const z=level(l).elevation,underground=z<0,ids=[];let previous=entry;
  // Connected snake starts at the right-front stair landing.
  for(let row=0;row<4;row++)for(let col=0;col<14;col++){
   const u=row%2===0?6-col:-7+col,v=1-row,key=l+'-'+u+'-'+v;let deps=entry;
   if(underground){
    const p=add('dig-'+key,'excavation',u,v,l,null,previous,[],10,'从可达入口开挖一格岩体');
    p.view.actionOrder=order(l,160);
    terrain.push({clearBy:p.id,view:{...p.view,faces:box(u,v,1,1,z,76,'rock'),order:order(l,120+(u+v)*2)}});previous=[p.id];deps=[p.id];
   }
   if(l!=='retreat'&&u===6&&v===1)continue;
   const p=add('floor-'+key,'floor',u,v,l,'W',deps,box(u,v,1,1,z,4,'timber'),20+(u+v)*.1,'铺设一格木楼板');p.view.receivesLight=true;
   ids.push(p.id);floors.set(l+':'+u+':'+v,p.id);
  }return ids;
 }
 const cellFloor=(l,u,v)=>floors.get(l+':'+u+':'+v);
 function shell(l){const z=level(l).elevation;
  geometry.push({view:{level:l,faces:box(-8.9,-2.8,17.8,.8,z-4,80,'rock'),order:order(l,0)}});
  for(const [u,w]of [[-8.8,1.8],[7,1.8]])geometry.push({view:{level:l,faces:box(u,-2.2,w,4.6,z-4,80,'rock'),order:order(l,5),overviewOnly:true}});
  const i=levels.findIndex(a=>a.id===l),outerLeft=-9.2+[.1,-.4,.3,-.2,.2][i-3],outerRight=9+[.1,.4,.6,.2,1][i-3];
  for(const [u,w]of [[outerLeft,-7-outerLeft],[7,outerRight-7]])retainedFaces.push(...box(u,-2.2,w,4.6,z-4,80,'rock'));
 }
 function frame(l,floorIds){const z=level(l).elevation,ids=[],underground=z<0;
  for(const u of [-7,-3,2,6])for(let j=0;j<4;j++){
   ids.push(add(l+'-post-'+u+'-'+j,underground?'pier':'column',u,-2,l,underground?'S':'W',j?[l+'-post-'+u+'-'+(j-1)]:[cellFloor(l,u,-2)],box(u,-2,.24,.3,z+4+j*16,16,underground?'stone':'timber'),45,'安装一格'+(underground?'石拱支柱':'承重木柱')).id);
  }
  for(const u of [-7,5])for(let j=0;j<4;j++)ids.push(add(l+'-front-post-'+u+'-'+j,underground?'pier':'column',u,1,l,underground?'S':'W',j?[l+'-front-post-'+u+'-'+(j-1)]:[cellFloor(l,u,1)],box(u,1.7,.24,.3,z+4+j*16,16,underground?'stone':'timber'),235,'安装剖切边缘支柱一格').id);
  for(let u=-7;u<7;u++)ids.push(add(l+'-beam-'+u,'beam',u,-2,l,underground?'S':'W',ids.filter(id=>id.includes('-post-')&&id.endsWith('-3')),box(u,-2,1,.28,z+68,8,underground?'stone':'timber'),50,'安装承重横梁').id);
  frames.set(l,ids);
  for(let u=-7;u<7;u++)for(let j=0;j<4;j++){
   const p=add(l+'-wall-'+u+'-'+j,'wall',u,-2,l,underground?'S':'W',[...ids,j?l+'-wall-'+u+'-'+(j-1):cellFloor(l,u,-2)],box(u,-2,1,.12,z+4+j*16,16,underground?'stone':'plaster'),30,'安装后墙一格');p.view.receivesLight=true;
  }
  if(!underground){
   for(let v=-2;v<2;v++)for(let j=0;j<4;j++)add(l+'-side-'+v+'-'+j,'wall',6,v,l,'W',[...ids,cellFloor(l,6,v)],box(6.82,v,.18,1,z+4+j*16,16,'plaster'),260,'保留右侧外墙体积').view.overviewOnly=true;
   for(let u=-7;u<7;u++)add(l+'-front-beam-'+u,'beam',u,1,l,'W',ids,box(u,1.92,1,.2,z+68,7,'timber'),240,'安装前缘横梁').view.overviewOnly=true;
   for(const v of [-2,1])for(let j=0;j<4;j++)add(l+'-facade-post-'+v+'-'+j,'column',6,v,l,'W',j?[l+'-facade-post-'+v+'-'+(j-1)]:ids,box(6.98,v,.18,.18,z+4+j*16,16,'timber'),265,'安装外墙木骨架一格').view.overviewOnly=true;
   for(let v=-2;v<2;v++)add(l+'-facade-beam-'+v,'beam',6,v,l,'W',ids,box(6.98,v,.18,1,z+68,7,'timber'),266,'安装外墙横梁一格').view.overviewOnly=true;
  }else for(let u=-7;u<7;u++){
   const inner=x=>z+51+20*Math.sqrt(Math.max(0,1-(x/7)**2)),q=[[u,2.15,z+76],[u+1,2.15,z+76],[u+1,2.15,inner(u+1)],[u,2.15,inner(u)]];
   const faces=box(u,1.85,1,.3,z+51,25,'stone');faces[1].clipPoints=q;
   faces[2]=surface([[u+1,2.15,z+76],[u+1,1.85,z+76],[u+1,1.85,inner(u+1)],[u+1,2.15,inner(u+1)]],'stone',.22);
   add(l+'-arch-'+u,'arch',u,1,l,'S',[...ids,...floorIds],faces,245,'砌筑山腹石拱一格').view.overviewOnly=true;
  }return ids;
 }
 function stair(l,to,deps){const z=level(l).elevation;let last;
  for(let chunk=0;chunk<5;chunk++){const faces=[],bottom=z+4+chunk*16;
   for(let i=0;i<16;i++){const height=Math.min(16,z+4+(16-i)*5-bottom);if(height>0)faces.push(...box(6,1+i/16,.75,1/16,bottom,height,'timber'));}
   const p=add(l+'-stair-'+chunk,chunk===4?'stair':'stair-section',6,1,l,'W',last?[last]:deps,faces,200+chunk,'安装 '+level(l).label+' 至 '+level(to).label+' 楼梯一格');
   p.view.standAnchor=[6.5,1.65,bottom];if(chunk===4)p.view.connectsTo=to;last=p.id;
  }stairs.set(l,last);return last;
 }
 const kitchen=floor('kitchen',[]);frame('kitchen',kitchen);
 const up1=stair('kitchen','dining',[...kitchen,...frames.get('kitchen')]);
 const dining=floor('dining',[...frames.get('kitchen'),up1]);frame('dining',dining);
 const up2=stair('dining','attic',[...dining,...frames.get('dining')]);
 const attic=floor('attic',[...frames.get('dining'),up2]);frame('attic',attic);
 let entrance=[...kitchen];
 for(const l of ['living','bedroom','hall','study','retreat']){
  shell(l);const f=floor(l,entrance);frame(l,f);
  const to=levels[levels.findIndex(a=>a.id===l)-1].id;entrance=[stair(l,to,[...f,...frames.get(l)])];
 }
 function furnishing(l,key,u,v,w,d,width,height,material='W',extra={}){
  const z=level(l).elevation+4,ids=[];
  for(let row=0;row<d;row++)for(let col=0;col<w;col++){
   const id=l+'-'+key+'-'+u+'-'+v+'-'+col+'-'+row,deps=[...frames.get(l),cellFloor(l,u+col,v+row)];
   if(col)deps.push(l+'-'+key+'-'+u+'-'+v+'-'+(col-1)+'-'+row);if(row)deps.push(l+'-'+key+'-'+u+'-'+v+'-'+col+'-'+(row-1));
   const p=add(id,'furniture',u+col,v+row,l,material,deps,undefined,100+(u+v)*2+row,'安装'+({bed:'床',sofa:'沙发',table:'餐桌',counter:'厨房柜台',shelf:'书架',hearth:'壁炉',window:'窗',door:'门',ivy:'藤蔓',plant:'盆栽',desk:'书桌',barrels:'储物桶',lamp:'灯',rug:'地毯'})[key]+'一格');
   p.view={...p.view,anchor:[u+w/2,v+d/2,z],texture:key,width,height,crop:[col,row,w,d],fallbackFaces:box(u+col,v+row,1,1,z,Math.min(16,height),'timber'),...extra};ids.push(id);
  }if(key==='hearth')parts.find(p=>p.id===ids[0]).view.light={anchor:[u+w/2,v+.5,z+19],radius:75,stops:[[0,'#ffc16e88'],[.55,'#ffc16e30'],[1,'#ffc16e00']]};return ids;
 }
 for(const l of levels){
  furnishing(l.id,'shelf',-6,-2,2,1,40,43);furnishing(l.id,'window',-2,-2,2,1,34,39);furnishing(l.id,'plant',4,-1,1,1,14,19);
  for(const u of [-4,3]){const lamps=furnishing(l.id,'lamp',u,-2,1,1,10,21,'B');parts.find(p=>p.id===lamps[0]).view.light={anchor:[u+.5,-1.5,l.elevation+28],radius:80,stops:[[0,'#ffc87388'],[.6,'#ffc87328'],[1,'#ffc87300']]};}
 }
 furnishing('attic','bed',-1,-1,3,2,58,40);furnishing('attic','desk',-4,0,2,1,36,27);furnishing('attic','rug',-2,0,4,1,77,28,'B',{order:order('attic',65)});
 furnishing('dining','table',-3,-1,4,2,80,42);furnishing('dining','hearth',2,-2,2,1,37,42,'S');
 furnishing('kitchen','counter',-1,-2,3,1,66,34);furnishing('kitchen','table',-3,0,4,1,66,34);furnishing('kitchen','barrels',3,0,2,1,27,26);
 furnishing('living','sofa',-4,0,3,1,55,28);furnishing('living','sofa',0,0,3,1,55,28);furnishing('living','hearth',2,-2,2,1,35,41,'S');furnishing('living','rug',-3,1,5,1,84,25,'B',{order:order('living',65)});
 furnishing('living','table',3,0,2,1,33,27);
 furnishing('bedroom','bed',-2,-1,3,2,58,39);furnishing('bedroom','counter',2,-2,3,1,51,28);furnishing('bedroom','rug',-3,1,5,1,78,24,'B',{order:order('bedroom',65)});
 furnishing('hall','table',-3,-1,4,2,73,39);furnishing('hall','counter',2,-2,3,1,51,28);
 furnishing('study','desk',-1,-1,3,2,52,31);furnishing('study','shelf',2,-2,2,1,36,43);furnishing('study','rug',-2,1,4,1,70,22,'B',{order:order('study',65)});
 furnishing('retreat','sofa',-2,0,3,1,55,30);furnishing('retreat','desk',-4,-1,2,1,32,25);furnishing('retreat','rug',-3,1,5,1,78,24,'B',{order:order('retreat',65)});
 furnishing('retreat','hearth',2,-2,2,1,35,41,'S');
 for(const l of levels.filter(a=>a.underground))for(const [u,v]of [[-9,1],[9,-1]])for(let row=0;row<3;row++){
  const p=add(l.id+'-rock-window-'+u+'-'+row,'window',u,v,l.id,'S',[...frames.get(l.id),...parts.filter(a=>a.view.level===l.id&&a.buildAction==='excavate').map(a=>a.id)],undefined,280,'安装岩壳拱窗一格');
  p.view={...p.view,anchor:[u,v,l.elevation+2],texture:'stoneWindow',width:23,height:45,crop:[0,row,1,3],order:8010,overviewOnly:true,flipX:u>0,fallbackFaces:box(u,v,.4,.2,l.elevation+4+row*15,15,'stone')};
 }
 for(const l of ['kitchen','dining','attic']){const z=level(l).elevation;
  for(let v=-2;v<2;v++){
   const f=add(l+'-balcony-'+v,'floor',-8,v,l,'W',frames.get(l),box(-8,v,1,1,z,4,'timber'),70,'安装阳台楼板');
   add(l+'-rail-'+v,'railing',-8,v,l,'W',[f.id],box(-8,v,.08,1,z+4,1,'timber').concat(box(-8,v,.08,.08,z+4,13,'timber'),box(-8,v,.08,1,z+17,1.5,'timber')),220,'安装阳台栏杆');
  }furnishing(l,'door',-7,-1,1,1,22,38);
  furnishing(l,'window',6,-1,1,1,21,31,'W',{anchor:[7,-.5,z+20],order:order(l,280),overviewOnly:true});
  furnishing(l,'ivy',-7,1,1,1,18,27,'B',{order:order(l,281)});
 }
 const roof=[];
 for(let u=-8;u<8;u++)for(let v=-3;v<3;v++){
  const top=t=>236+(3-Math.abs(t))*13,points=[[u,v,top(v)],[u+1,v,top(v)],[u+1,v+1,top(v+1)],[u,v+1,top(v+1)]];
  const p=add('slate-'+u+'-'+v,'roof',u,v,'attic','S',frames.get('attic'),[surface(points,'slate',v<0?.04:.18,[(u+8)/8,(v+3)/4,1/8,1/4])],300+v+3,'安装一格石板坡屋顶');p.view.overviewOnly=true;roof.push(p.id);
 }
 for(const u of [-4,3])for(let j=0;j<4;j++)add('chimney-'+u+'-'+j,'chimney',u,-1,'attic','S',j?['chimney-'+u+'-'+(j-1)]:roof,box(u,-1,.6,.6,256+j*8,8,'stone'),330,'砌筑烟囱一格').view.overviewOnly=true;
 // Gabled end planes and warm dormers remain independent installed elements.
 for(const u of [-7,7])for(let v=-3;v<3;v++){
  const high=236+(3-Math.min(Math.abs(v),Math.abs(v+1)))*13;
  for(let j=0;j<Math.ceil((high-236)/16);j++){
   const z=236+j*16,f=surface([[u,v,z+16],[u,v+1,z+16],[u,v+1,z],[u,v,z]],'plaster');f.clipPoints=[[u,-3,236],[u,0,275],[u,3,236]];
   add('gable-'+u+'-'+v+'-'+j,'gable',u,v,'attic','W',roof,[f],320,'安装山墙填墙一格').view.overviewOnly=true;
  }
 }
 for(let u=-8;u<8;u++)for(const v of [-3,3])add('eave-'+u+'-'+v,'beam',u,v,'attic','W',roof,box(u,v,1,.12,232,5,'timber'),345,'安装屋檐木梁一格').view.overviewOnly=true;
 for(const u of [-7,7])for(let v=-3;v<3;v++){
  const z=t=>236+(3-Math.abs(t))*13;
  add('gable-trim-'+u+'-'+v,'beam',u,v,'attic','W',roof,[surface([[u,v,z(v)+1],[u,v+1,z(v+1)+1],[u,v+1,z(v+1)-3],[u,v,z(v)-3]],'timber')],346,'安装山墙斜撑一格').view.overviewOnly=true;
 }
 for(const u of [-1,4]){
  const housing=[];for(let j=0;j<2;j++)housing.push(add('dormer-body-'+u+'-'+j,'wall',u,2,'attic','W',j?['dormer-body-'+u+'-'+(j-1)]:roof,box(u-.1,1.6,1.2,1.1,250+j*16,j?12:16,'plaster'),350,'安装老虎窗墙格').id);
  const ids=furnishing('attic','window',u,-2,1,1,19,26,'W',{anchor:[u+.5,2.75,254],order:order('attic',355),overviewOnly:true});
  for(const id of ids)parts.find(p=>p.id===id).deps.push(...housing);
  const ridge=u+.5,z=294;
  for(const side of [-1,1]){const edge=ridge+side*.85;add('dormer-cap-'+u+'-'+side,'roof',u,2,'attic','S',ids,[surface([[edge,1.4,280],[ridge,1.4,z],[ridge,2.9,z],[edge,2.9,280]],'slate')],360,'安装老虎窗屋顶格').view.overviewOnly=true;}
 }
 // Natural foundation / retained shell never shares clearBy with excavations.
 geometry.unshift({view:{overviewOnly:true,anchor:[0,0,-420],order:-100,faces:box(-9.3,-2.8,18.6,5.6,-424,24,'rock')}});
 geometry.push({view:{overviewOnly:true,anchor:[0,0,-560],texture:'shell',width:448,height:600,order:8000,fallbackFaces:retainedFaces.concat(box(-9.3,-2.8,18.6,5.6,-465,41,'rock'))}});
 geometry.push({view:{overviewOnly:true,faces:box(-8.4,-2.6,16.8,.55,-4,5,'stone'),order:8000}});
 for(const [u,v,w,h]of [[-9,-1,61,78],[8,-2,83,108]])geometry.push({view:{level:'kitchen',anchor:[u,v,0],texture:'tree',width:w,height:h,order:8100,overviewOnly:true}});
 const plan={id:'floating-mountain-v2',signature:'floating-mountain-v2',silhouette:'floating-mountain-v2',replaces:['floating-mountain-v1'],name:'云芽悬浮山',description:'45° 木石空中住宅 · 地上三层 / 山腹五层 · 逐格开挖与搭建',template:true,cutaway:true,residential:true,gridBuild:true,parts,costs,
  construction:{gathering:{worker:1,multiplier:1,sources:{W:65,S:365,B:90,D:140},water:150,mix:132,supply:{version:1,kinds:Object.fromEntries(['W','S','B','D'].map(k=>[k,{buffer:8,cap:24,batch:2,periods:[5]}])),manual:{W:{units:3,seconds:2.5},S:{units:3,seconds:2.5}}}},experience:{version:1,stages:['kitchen','dining','attic','living','bedroom','hall','study','retreat'].map(id=>({label:level(id).name+'准备好了',parts:parts.filter(p=>p.view.level===id).map(p=>p.id)}))},view:{projection:'diagonal',worldSize:[640,960],fitViewport:true,renderOnChange:true,origin:[340,340],tile:[32,12],background:'assets/floating/clouds.webp',sky:'#cbd9e4',textures,levels,terrain,geometry,surfaceLevel:'kitchen',ripples:[],petSize:[11,16],path:[[0,141,324],[140,175,326],[240,293,368],[380,478,356],[480,507,341]],resources:[{kind:'W',point:[179,299],radius:24},{kind:'S',point:[484,362],radius:18}],scenery:[],weatherGround:394}},environment:{weather:'clear',ground:[146,351,368,5]}};
 if(typeof module!=='undefined'&&module.exports)module.exports=plan;else root.TownBlueprints.push(plan);
})(globalThis);
