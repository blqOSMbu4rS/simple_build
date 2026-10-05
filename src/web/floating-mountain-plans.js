/* Authored geometry and dependencies; all behavior uses shared capabilities. */
(function(root){
 'use strict';
 const parts=[],terrain=[],costs={W:0,S:0,C:0,B:0,D:0};
 const levels=[
  {id:'lookout',label:'2F',name:'云端观景阁',elevation:38,camera:[80,0,320,202.67]},
  {id:'garden',label:'1F',name:'草地小屋',elevation:0,camera:[80,28,320,202.67]},
  {id:'workshop',label:'B1',name:'山腹工坊',elevation:-48,underground:true,camera:[80,75,320,202.67]},
  {id:'grotto',label:'B2',name:'晶石小洞',elevation:-92,underground:true,camera:[80,101.33,320,202.67]}
 ];
 const palette={wood:'#dbaa77',stone:'#b9adc6',wall:'#ffe1b3',roof:'#e9a8a6',floor:'#ecc89a',dark:'#746581'};
 function box(u,v,w,d,z,h,color){return [
  {points:[[u,v,z+h],[u+w,v,z+h],[u+w,v+d,z+h],[u,v+d,z+h]],color},
  {points:[[u,v+d,z+h],[u+w,v+d,z+h],[u+w,v+d,z],[u,v+d,z]],color,shade:.12,shadeColor:'#514365'},
  {points:[[u+w,v+d,z+h],[u+w,v,z+h],[u+w,v,z],[u+w,v+d,z]],color,shade:.23,shadeColor:'#514365'}
 ];}
 function add(id,kind,u,v,level,material,deps,faces,label){
  const z=levels.find(a=>a.id===level).elevation;
  const p={id,kind,x:u,y:v,w:1,h:1,material:material||'S',cost:material?{[material]:1}:{},deps,
   seconds:material?1.2:2.4,workers:1,required:true,buildAction:material?'install':'excavate',layer:kind==='floor'||kind==='excavation'?1:2,label,
   workPoint:{x:240+(u-v)*16,y:224},view:{u,v,z,level,anchor:[u+.5,v+.5,z],standAnchor:[u+.5,v+.8,z+2],faces}};
  parts.push(p);if(material)costs[material]++;return p;
 }
 const floors=new Map();
 function room(level,width,depth,entry=[],opening=null){
  const z=levels.find(a=>a.id===level).elevation,underground=z<0,ids=[];let previous=entry;
  // Serpentine excavation keeps each new cell connected to an already opened cell.
  for(let row=0;row<depth;row++)for(let col=0;col<width;col++){
   const u=(row%2===(underground?0:1)?width-1-col:col)-2,v=(underground?depth-1-row:row)-1,id=level+'-'+u+'-'+v;
   let deps=entry;
   if(underground){
    const faces=box(u,v,1,1,z-2,2,palette.dark);
    if(v===-1)faces.push(...box(u,v,1,.1,z,25,'#9e8da9'));
    if(u===-2)faces.push(...box(u,v,.1,1,z,25,'#b6a3b9'));
    const dig=add('dig-'+id,'excavation',u,v,level,null,previous,faces,'挖开一格山体');
    terrain.push({clearBy:dig.id,view:{...dig.view,faces:box(u,v,1,1,z,25,palette.stone)}});
    deps=[dig.id];previous=deps;
   }
   if(opening&&u===opening[0]&&v===opening[1])continue;
   const f=add('floor-'+id,'floor',u,v,level,underground?'S':'W',deps,box(u,v,1,1,z,2,underground?'#cdbdce':palette.floor),'铺设'+(underground?'洞室石地板':'木地板'));
   ids.push(f.id);floors.set(level+':'+u+':'+v,f.id);
  }
  return ids;
 }
 const ground=room('garden',5,3,[],[2,1]);
 const columns=[];
 for(const [u,v]of [[-2,-1],[1,-1],[-2,0],[1,0]])columns.push(add('post-'+u+'-'+v,'column',u,v,'garden','W',[floors.get('garden:'+u+':'+v)],box(u,v,.2,.2,2,36,palette.wood),'竖起承重木柱').id);
 function walls(level,width){const z=levels.find(a=>a.id===level).elevation,ids=[];
  for(let i=0;i<width;i++)for(let j=0;j<2;j++){
   const u=i-2,v=-1,faces=box(u,v,1,.15,z+2+j*12,12,palette.wall);
   if(j===1){faces.push(...box(u+.22,v+.16,.56,.03,z+17,6,'#9ac9ce'));faces.push(...box(u+.46,v+.2,.07,.04,z+17,6,palette.wood));}
   const dep=j?[level+'-wall-'+i+'-0']:[floors.get(level+':'+u+':'+v)];
   ids.push(add(level+'-wall-'+i+'-'+j,'wall',u,v,level,'W',dep,faces,'安装暖色木墙与小窗').id);
  }return ids;
 }
 const groundWalls=walls('garden',5);
 function stair(id,level,u,v,deps){const z=levels.find(a=>a.id===level).elevation,faces=[],rise=(level==='garden'?38:level==='workshop'?48:44);
  for(let i=0;i<8;i++)faces.push(...box(u,v+i/8,.75,.125,z+2,(8-i)*rise/8,palette.wood));
  const p=add(id,'stair',u,v,level,'W',deps,faces,'连接上下层楼梯');
  p.view.connectsTo=levels.find(a=>a.elevation===z+rise).id;return p.id;
 }
 const up=stair('up-stair','garden',1,0,[...ground,...columns]);
 const upper=room('lookout',4,2,[...columns,up],[1,0]);walls('lookout',4);
 for(let i=0;i<4;i++){
  const u=i-2,faces=box(u,-1.12,1,1.05,64,3,palette.roof);
  add('roof-'+i,'roof',u,-1,'lookout','B',['lookout-wall-'+i+'-1'],faces,'铺上粉桃色屋檐');
 }
 for(let i=0;i<4;i++)add('rail-'+i,'railing',i-2,0,'lookout','W',[...upper],box(i-2,.92,1,.08,41,1.5,palette.wood).concat(box(i-2,.92,.08,.08,41,9,palette.wood),box(i-2,.92,1,.08,49,1.5,palette.wood)),'安装观景栏杆');
 const first=room('workshop',5,3,[...ground,up],[1,1]);
 const down=stair('down-stair','workshop',2,1,first);
 const second=room('grotto',4,3,[down]);
 stair('deep-stair','grotto',1,1,second);
 function furniture(level,u,v,kind){const z=levels.find(a=>a.id===level).elevation+2;let faces;
  if(kind==='bed')faces=box(u,v,.9,1,z,4,palette.wood).concat(box(u+.05,v+.04,.8,.85,z+4,3,'#a8cfc1'),box(u+.1,v+.05,.7,.25,z+7,2,'#fff0d8'));
  if(kind==='table')faces=box(u+.1,v+.15,.12,.12,z,8,palette.wood).concat(box(u+.7,v+.6,.12,.12,z,8,palette.wood),box(u,v,.95,.85,z+8,2,palette.wood),box(u+.2,v+.15,.35,.3,z+10,1,'#e8a9a0'));
  if(kind==='shelf'){faces=box(u,v,.85,.28,z,19,palette.wood);for(let i=0;i<4;i++)faces.push(...box(u+.08+i*.18,v+.3,.12,.12,z+3,9,['#8ebbb3','#d6a1ab','#eac986','#9c9abc'][i]));}
  if(kind==='crystal'){faces=[];for(let i=0;i<3;i++){const a=u+.08+i*.25,b=v+.4,h=[9,16,11][i];faces.push({points:[[a,b,z],[a+.24,b,z],[a+.24,b,z+h],[a,b,z+h]],clipPoints:[[a,b,z],[a+.24,b,z],[a+.24,b,z+h-3],[a+.12,b,z+h],[a,b,z+h-3]],color:['#a3dcd3','#b6b0e2','#e6b7dc'][i]});}}
  if(kind==='lamp')faces=box(u+.3,v+.3,.3,.3,z,3,palette.wood).concat(box(u+.33,v+.33,.24,.24,z+3,8,'#ffdd9c'),box(u+.26,v+.26,.38,.38,z+11,2,palette.wood));
  const p=add(level+'-'+kind,'furniture',u,v,level,kind==='crystal'?'S':'W',[floors.get(level+':'+u+':'+v),...(level==='garden'?groundWalls:[])],faces,({bed:'摆好软软的小床',table:'摆好木桌',shelf:'装好工具书架',crystal:'整理洞中的晶石',lamp:'点亮洞室小灯'})[kind]);
  if(kind==='lamp')p.view.light={anchor:[u+.45,v+.45,z+7],radius:24,stops:[[0,'#ffe1a055'],[1,'#ffe1a000']]};
 }
 furniture('garden',-2,0,'bed');furniture('garden',0,0,'table');furniture('garden',1,-1,'shelf');
 furniture('lookout',0,0,'table');furniture('workshop',-2,-1,'shelf');furniture('workshop',0,0,'table');furniture('grotto',-1,-1,'crystal');
 furniture('workshop',1,-1,'lamp');furniture('grotto',0,0,'lamp');
 for(const p of parts)if(['floor','excavation'].includes(p.kind))p.view.receivesLight=true;
 parts.sort((a,b)=>['garden','lookout','workshop','grotto'].indexOf(a.view.level)-['garden','lookout','workshop','grotto'].indexOf(b.view.level));
 const backdrop=[];
 const poly=(points,fill,extra={})=>backdrop.push({points,fill,...extra});
 const ellipse=(x,y,rx,ry,fill,extra={})=>backdrop.push({ellipse:[x,y,rx,ry],fill,...extra});
 // Distant cloud banks and little floating neighbours, authored as reusable shape data.
 for(const [x,y,scale]of [[48,54,.6],[409,72,.7],[73,230,.4]]){
  poly([[x-30*scale,y],[x+32*scale,y],[x+12*scale,y+38*scale],[x-8*scale,y+49*scale]],'#b1b5c9');
  ellipse(x,y,33*scale,9*scale,'#c0daca');ellipse(x-6*scale,y-11*scale,12*scale,15*scale,'#9bbfba');
 }
 for(const [x,y,rx]of [[55,93,54],[429,143,60],[43,277,83],[409,280,84],[270,295,100]]){
  ellipse(x,y,rx,12,'#fff8f0',{opacity:.8,drift:3});ellipse(x-14,y-8,rx*.45,14,'#fff8f0',{opacity:.8,drift:3});
 }
 poly([[116,126],[160,97],[267,91],[354,129],[333,181],[289,238],[247,279],[211,260],[182,221],[145,194]],'#9a8ba9');
 poly([[116,126],[205,155],[247,279],[182,221],[145,194]],'#baacc0');
 poly([[205,155],[282,145],[333,134],[309,206],[247,279]],'#877c9b');
 poly([[147,162],[177,183],[182,219],[166,201]],'#cfc0d0');
 poly([[285,219],[267,241],[254,256],[266,223]],'#beb1ce');
 poly([[115,124],[157,96],[209,85],[273,91],[324,104],[355,125],[324,146],[268,160],[209,156],[157,144]],'#79b5a0');
 poly([[115,119],[157,91],[209,80],[273,86],[324,99],[355,120],[324,141],[268,155],[209,151],[157,139]],'#b9d5a4');
 poly([[252,138],[264,144],[252,150],[240,144]],'#6c777a');
 ellipse(286,137,24,7,'#95cbbd');ellipse(286,136,19,4,'#b2e0d1');
 for(const [x,y,n]of [[128,123,40],[332,133,52],[305,155,29],[164,145,28]]){
  poly([[x,y],[x-3,y+n*.45],[x+2,y+n]],null,{open:true,stroke:'#588f86',width:2});
  for(let j=7;j<n;j+=10)ellipse(x+(j%3-1)*3,y+j,4,2,'#76b6a1');
 }
 for(const [x,y,size]of [[150,112,19],[311,106,23],[337,122,15]]){
  poly([[x-2,y],[x-1,y-size],[x+3,y-size],[x+3,y]],'#a28477');
  ellipse(x,y-size, size*.78,size*.76,'#74aa9a');ellipse(x-6,y-size-5,size*.56,size*.6,'#9ac6a8');ellipse(x+7,y-size-3,size*.43,size*.5,'#89bba2');
 }
 for(const [x,y]of [[185,145],[319,131],[159,124]]){ellipse(x,y,5,2,'#83b899');ellipse(x,y-3,4,3,'#edb6bc');}
 const plan={id:'floating-mountain-v1',signature:'floating-mountain-v1',silhouette:'floating-mountain-v1',name:'云芽悬浮山',
  description:'云海中的可爱悬山 · 向上建家，向下挖洞 · 四层自由查看',template:true,cutaway:true,residential:true,gridBuild:true,parts,costs,
  construction:{gathering:{worker:1,multiplier:1,sources:{W:65,S:365,B:90,D:140},water:150,mix:132,
   supply:{version:1,kinds:Object.fromEntries(['W','S','B','D'].map(k=>[k,{buffer:8,cap:16,batch:2,periods:[6]}])),manual:{W:{units:3,seconds:2.5},S:{units:3,seconds:2.5}}}},
   experience:{version:1},
   view:{projection:'diagonal',origin:[240,120],tile:[24,12],sky:'#dcecee',background:null,backdrop,terrain,levels,surfaceLevel:'garden',ripples:[],
    textures:{bunny:'assets/island/bunny.webp',fox:'assets/island/fox.webp'},petSize:[10,16],
    path:[[0,130,126],[140,177,141],[240,245,146],[380,324,129],[480,350,122]],
    resources:[{kind:'W',point:[151,108],radius:17},{kind:'S',point:[327,135],radius:14}],scenery:[]}},
  environment:{weather:'clear',ground:[115,145,240,5]}};
 // Stage order follows the actual construction dependency order.
 plan.construction.experience.stages=['garden','lookout','workshop','grotto'].map(id=>({label:levels.find(a=>a.id===id).name+'准备好了',parts:parts.filter(p=>p.view.level===id).map(p=>p.id)}));
 if(typeof module!=='undefined'&&module.exports)module.exports=plan;else root.TownBlueprints.push(plan);
})(globalThis);
