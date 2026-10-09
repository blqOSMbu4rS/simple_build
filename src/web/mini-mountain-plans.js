/* Three-storey anime artwork, authored on the original 45° / 45° projection.
 * Rooms use independent material surfaces; only roof/furniture/shell assets are sprites.
 * All simulation, resource collection, section controls and saves are shared. */
(function(root){
 'use strict';
 const parts=[],terrain=[],geometry=[],costs={W:0,S:0,C:0,B:0,D:0};
 const unit=768/10.8,height=unit/Math.sqrt(2),step=1.55*height,origin=[384,384+2*height];
 const rooms=[
  {id:'ground',label:'一层',name:'卧室与小桌',rank:2,asset:'ground-room-shell',openings:{'south:1':'door','east:1':'window','north:2':'window'}},
  {id:'basement1',label:'B1',name:'储藏室',rank:1,asset:'storage-room-shell',openings:{'south:1':'window','east:2':'window'}},
  {id:'basement2',label:'B2',name:'工作间',rank:0,asset:'workshop-room-shell',openings:{'south:2':'window'}}
 ];
 const textures=Object.fromEntries(['solid-rock-base',...rooms.map(r=>r.asset),'roof-assembly','bed','table','cabinet','shelf','crate-a','crate-b','bench','tool-cabinet','materials'].map(k=>[k,'assets/mini-mountain/'+k+'.webp']));
 Object.assign(textures,{bunny:'assets/island/v4/bunny.webp',fox:'assets/island/v4/fox.webp',tree:'assets/island/tree.webp',stone:'assets/island/v4/stone.webp',stump:'assets/island/stump.webp'});
 const levels=[...rooms.map(r=>({id:r.id,label:r.label,name:r.name,elevation:r.rank*step,underground:r.rank<2})),{id:'rock',label:'岩石层',name:'天然岩石基座',elevation:-height}];
 const floorIds=new Map(),frameIds=new Map(),digIds=new Map(),key=(r,u,v)=>r+':'+u+':'+v;
 const project=([u,v,z=0])=>[origin[0]+(u-v)*height,origin[1]+(u+v)*unit/2-z];
 const atlas={floor:[0,0,.5,.5],plaster:[.5,0,.5,.5],stone:[0,.5,.5,.5],wood:[.5,.5,.5,.5]};
 function face(points,material,shade=0){return {points,texture:'materials',uv:atlas[material],color:{floor:'#dca567',plaster:'#eadcc0',stone:'#a9a1b0',wood:'#ad794d'}[material],shade};}
 function box(u,v,w,d,z,h,material){return [face([[u,v,z+h],[u+w,v,z+h],[u+w,v+d,z+h],[u,v+d,z+h]],material),face([[u,v+d,z+h],[u+w,v+d,z+h],[u+w,v+d,z],[u,v+d,z]],material,.12),face([[u+w,v+d,z+h],[u+w,v,z+h],[u+w,v,z],[u+w,v+d,z]],material,.22)];}
 function add(id,kind,r,u,v,z,material,deps,view={}){
  const p={id,kind,x:u,y:v,w:1,h:1,material:material||'S',cost:material?{[material]:1}:{},deps:[...new Set(deps.filter(Boolean))],seconds:material?1.2:2.4,workers:1,required:true,buildAction:material?'install':'excavate',layer:2,label:(material?'安装':'开挖')+kind+'一格',workPoint:{x:240+(u-v)*16,y:224},view:{level:r.id,u,v,z,anchor:[u+.5,v+.5,z],standAnchor:[u+.5,v+.6,r.rank*step+.13*height],order:r.rank*100+20,actionOrder:r.rank*100+75,...view}};
  parts.push(p);if(material)costs[material]++;return p;
 }
 function image(texture,level,order,fallbackFaces){return {view:{texture,level,order,anchor:[0,0,0],imageRect:[0,0,768,768],width:768,height:768,fallbackFaces}};}
 geometry.push(image('solid-rock-base','rock',-100,box(-3,-3,6,6,-height*1.1,height*1.1,'stone')));
 for(const r of rooms){
  const shellTop=r.rank===2?r.rank*step+.055*height:(r.rank+1)*step;
  const back=image(r.asset,r.id,r.rank*100+5,box(-3,-3,6,1,r.rank*step,r.rank===2?4:step,'stone'));
  geometry.push(back);
  const front=image(r.asset,r.id,r.rank*100+55,box(-3,2,6,1,r.rank*step,r.rank===2?4:step,'stone'));
  front.view.clipPoints=[[-10,10,shellTop],[-2.14,2.14,shellTop],[2.14,2.14,shellTop],[2.14,-2.14,shellTop],[10,-10,shellTop],[10,10,shellTop]];geometry.push(front);
 }
 // The natural shell/base remains fixed. Interior rock is removed through adjacent dig tasks.
 let entrance=[];
 for(const r of rooms){
  const z=r.rank*step,ids=[],digs=[],queue=[[1,1]],seen=new Set(['1,1']),parent=new Map();
  for(let i=0;i<queue.length;i++)for(const [u,v]of [[queue[i][0]-1,queue[i][1]],[queue[i][0]+1,queue[i][1]],[queue[i][0],queue[i][1]-1],[queue[i][0],queue[i][1]+1]])if(u>=-2&&u<2&&v>=-2&&v<2&&!seen.has(u+','+v)){seen.add(u+','+v);parent.set(u+','+v,queue[i]);queue.push([u,v]);}
  for(const [u,v]of queue){let deps=entrance;
   if(r.rank<2){const prev=parent.get(u+','+v),p=add('dig-'+key(r.id,u,v),'excavation',r,u,v,z,null,prev?[digIds.get(key(r.id,...prev))]:entrance,{faces:[],order:r.rank*100+10});digIds.set(key(r.id,u,v),p.id);digs.push(p.id);terrain.push({clearBy:p.id,view:{level:r.id,u,v,z,anchor:[u+.5,v+.5,z],faces:box(u,v,1,1,z,step,'stone'),order:r.rank*100+60+(u+v)*.01}});deps=[p.id];}
   // Upper floors leave the same unoccupied 1×1 stair exit clear.
   if(r.rank>0&&u===1&&v===1)continue;
   const p=add('floor-'+key(r.id,u,v),'floor',r,u,v,z,'W',deps,{faces:box(u,v,1,1,z,.12*height,'floor'),receivesLight:true,order:r.rank*100+10});floorIds.set(key(r.id,u,v),p.id);ids.push(p.id);
  }
  floorIds.set(r.id,ids);
  const posts=[];
  for(const [u,v]of [[-2.14,-2.14],[-2.14,2],[2,-2.14],[2,2]])for(let band=0;band<2;band++){
   const p=add(r.id+'-post-'+u+'-'+v+'-'+band,'column',r,Math.floor(u),Math.floor(v),z+.12*height+band*height,'W',band?[posts.at(-1)]:ids,{faces:box(u,v,.14,.14,z+.12*height+band*height,Math.min(height,(1.43-band)*height),'wood'),order:r.rank*100+45});posts.push(p.id);
  }
  const walls=[];
  for(const side of ['north','west','south','east'])for(let index=0;index<4;index++)for(let band=0;band<2;band++){
   const horizontal=side==='north'||side==='south',front=side==='south'||side==='east',u=horizontal?index-2:side==='west'?-2.14:2,v=horizontal?side==='north'?-2.14:2:index-2;
   const bottom=band,top=Math.min(1.43,band+1),opening=r.openings[side+':'+index],lo=opening==='door'?0:.56,hi=opening==='door'?1.12:1.1,aperture=opening==='door'?.72:.58;
   const surfaces=[];
   function panel(a,b,c,d,material='plaster'){
    if(b<=a||d<=c)return;
    if(horizontal)surfaces.push(...box(u+a,v,b-a,.14,z+(.12+c)*height,(d-c)*height,material));else surfaces.push(...box(u,v+a,.14,b-a,z+(.12+c)*height,(d-c)*height,material));
   }
   if(opening){const left=(1-aperture)/2;panel(0,left,bottom,top);panel(1-left,1,bottom,top);panel(left,1-left,bottom,Math.min(top,lo));panel(left,1-left,Math.max(bottom,hi),top);
    if(opening==='window'&&band===0){panel(.485,.515,lo,hi,'wood');panel(left,1-left,(lo+hi)/2-.015,(lo+hi)/2+.015,'wood');panel(left-.03,left+.03,lo,hi,'wood');panel(1-left-.03,1-left+.03,lo,hi,'wood');}
   }else panel(0,1,bottom,top);
   if(band===0)panel(0,1,0,.055,'wood');if(band===1)panel(0,1,1.375,1.43,'wood');
   const support=band?[walls.at(-1)]:posts,p=add(r.id+'-'+side+'-'+index+'-'+band,'wall',r,Math.floor(u),Math.floor(v),z+(.12+bottom)*height,'W',support,{faces:surfaces,receivesLight:true,order:r.rank*100+(front?42:20)+(u+v)*.01});walls.push(p.id);
  }
  frameIds.set(r.id,[...posts,...walls]);
  if(r.rank<2){const upper=rooms.find(a=>a.rank===r.rank+1),stair=[];
   for(let band=0;band<2;band++){const faces=[];for(let i=0;i<8;i++){const t=(i+.5)/8;faces.push(...box(1.05,1.02+i*.1,.85,.07,z+.12*height+(band+t)*step/2,3,'wood'));}
    const p=add(r.id+'-stairs-'+band,band?'stair':'stair-section',r,1,1,z,'W',band?[stair.at(-1)]:[...ids,...digs],{faces,order:r.rank*100+35,connectsTo:band?upper.id:undefined,exitAnchor:band?[1,1,upper.rank*step+.12*height]:undefined});stair.push(p.id);}
   entrance=[...frameIds.get(r.id),...stair];
  }else entrance=frameIds.get(r.id);
 }
 const spriteBounds={bed:[293,150,134,128],table:[347,296,74,86],cabinet:[471,214,98,115],shelf:[367,206,109,133],'crate-a':[248,312,71,75],'crate-b':[399,347,71,76],bench:[352,306,124,122],'tool-cabinet':[515,392,61,97]};
 const items=[['ground','bed',-2,-2,2,1],['ground','table',0,0,1,1],['ground','cabinet',-2,0,1,2],['basement1','shelf',-2,-2,1,2],['basement1','crate-a',0,-2,1,1],['basement1','crate-b',-1,0,1,1],['basement2','bench',-2,-2,1,2],['basement2','tool-cabinet',-2,1,1,1]];
 for(const [l,texture,u,v,w,d]of items){const r=rooms.find(r=>r.id===l);for(let row=0;row<d;row++)for(let col=0;col<w;col++){
  const a=add(l+'-'+texture+'-'+col+'-'+row,'furniture',r,u+col,v+row,r.rank*step+.13*height,'W',[...frameIds.get(l),floorIds.get(key(l,u+col,v+row))],{...image(texture,l,r.rank*100+30,box(u+col,v+row,1,1,r.rank*step+.13*height,height*.8,'wood')).view,anchor:[u+w/2,v+d/2,r.rank*step+.13*height]});
  // Furniture sprites retain their original full-canvas registration; construction masks split the independent sprite only.
  if(w*d>1){const [x,y,width,h]=spriteBounds[texture],index=row*w+col,total=w*d;
   const left=index===0?0:Math.round(x+index*width/total),right=index===total-1?768:Math.round(x+(index+1)*width/total);
   a.view.imageClip=[left,0,right-left,768];
  }
 }}
 // Independent roof assembly is clipped in equal construction squares, preserving
 // all its original ridge, eaves and gable pixels. No complete-house art is used.
 const ground=rooms[0],roofZ=4.65*height,roofCell=64;
 const roofCells=[[0,2],[0,3],[0,4],[0,5],[1,1],[1,2],[1,3],[1,4],[1,5],[1,6],[2,0],[2,1],[2,2],[2,3],[2,4],[2,5],[2,6],[2,7],[3,0],[3,1],[3,2],[3,3],[3,4],[3,5],[3,6],[3,7],[4,1],[4,2],[4,3],[4,4],[4,5],[5,3],[5,4]];
 for(const [row,col]of roofCells){
  const cx=144+(col+.5)*roofCell,cy=64+(row+.5)*roofCell;
  const q=(cx-origin[0])/height,t=(cy-origin[1]+roofZ)/(unit/2),u=(t+q)/2,v=(t-q)/2;
  add('roof-'+row+'-'+col,'roof',ground,Math.round(u),Math.round(v),roofZ,'S',frameIds.get('ground'),{...image('roof-assembly','ground',300,box(u,v,1,1,roofZ,8,'wood')).view,imageClip:[144+col*roofCell,64+row*roofCell,roofCell,roofCell],overviewOnly:true,anchor:[u,v,roofZ],standAnchor:[u,v,roofZ],actionOrder:310});
 }
 const stages=rooms.map(r=>({label:r.label+'空间准备好了',parts:parts.filter(p=>p.view.level===r.id&&!p.view.overviewOnly).map(p=>p.id)}));stages.push({label:'迷你悬浮山建好了',parts:parts.filter(p=>p.view.overviewOnly).map(p=>p.id)});
 const plan={id:'mini-mountain-anime-v1',signature:'mini-mountain-anime-v1',silhouette:'mini-mountain-anime-v1',name:'迷你悬浮山 · 二次元',description:'原视角 45° · 三层小屋 · 逐格开挖与建造',template:true,cutaway:true,residential:true,gridBuild:true,parts,costs,
  construction:{gathering:{worker:1,multiplier:1,sources:{W:65,S:365,B:90,D:140},water:150,mix:132,trees:[65],supply:{version:1,kinds:Object.fromEntries(['W','S','B','D'].map(k=>[k,{buffer:4,cap:16,batch:2,periods:[4]}])),manual:{W:{units:3,seconds:2.5},S:{units:3,seconds:2.5}}}},experience:{version:1,stages},
   view:{projection:'diagonal',sectionMode:'stacked',preserveCameraOnLevelChange:true,backgroundFixed:true,worldSize:[768,768],fitViewport:true,renderOnChange:true,origin,tile:[height*2,unit],basis:[[height,unit/2],[-height,unit/2]],sky:'#b8dcf0',background:'prototypes/mini-mountain-2d/assets/background/sky.webp',textures,levels,terrain,geometry,surfaceLevel:'ground',ripples:[],petSize:[30,45],path:[[0,82,380],[65,115,365],[140,204,402],[240,384,482],[380,649,380],[480,692,345]],resources:[{kind:'W',point:[115,365],radius:30,source:65},{kind:'S',point:[620,397],radius:27}],scenery:[{texture:'tree',source:65,x:115,y:365,width:70,height:110,level:'ground'},{texture:'stone',resource:'S',x:620,y:397,width:60,height:44,level:'ground'}],weatherGround:450}},environment:{weather:'clear',ground:[70,430,630,4]}};
 if(typeof module!=='undefined'&&module.exports)module.exports=plan;else root.TownBlueprints.push(plan);
})(globalThis);
