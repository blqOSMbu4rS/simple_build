/* Authored reference layout. All simulation and section behavior is shared. */
(function(root){
 'use strict';
 const parts=[],terrain=[],geometry=[],costs={W:0,S:0,C:0,B:0,D:0},floors=new Map(),frames=new Map(),dig=new Map(),stairs=new Map();
 // Inclusive u intervals, one per v row starting at -3. Irregular masks, not scaled rectangles.
 const rooms=[
  ['attic','3F','主卧与左阳台',176,[[-7,6],[-7,6],[-7,6],[-6,6],[-6,5]],5,1],
  ['dining','2F','餐厅与左阳台',88,[[-7,7],[-7,7],[-7,7],[-7,6],[-7,6]],6,1],
  ['kitchen','1F','厨房、露台与门廊',0,[[-7,7],[-7,7],[-7,7],[-7,7],[-7,7],[-6,7]],6,2],
  ['living','B1','宽拱双沙发客厅',-88,[[-7,7],[-8,7],[-8,7],[-7,7],[-7,7],[-6,7]],6,2],
  ['bedroom','B2','卧室与石拱吧台',-176,[[-7,6],[-7,7],[-7,7],[-7,7],[-6,7],[-5,6]],5,2],
  ['hall','B3','餐厨与右侧壁龛',-264,[[-6,6],[-7,6],[-7,6],[-6,6],[-5,6]],5,1],
  ['study','B4','藏书壁龛与书房',-352,[[-6,5],[-6,6],[-6,6],[-5,6],[-4,6]],5,1],
  ['retreat','B5','内收休憩室',-440,[[-4,5],[-5,5],[-5,5],[-4,5],[-3,5]],4,1]
 ].map(([id,label,name,elevation,rows,su,sv])=>({id,label,name,elevation,rows,su,sv}));
 const room=id=>rooms.find(a=>a.id===id),key=(l,u,v)=>l+':'+u+':'+v;
 const levels=[{id:'roof',label:'屋顶',name:'屋顶与整栋住宅',role:'roof',elevation:264,cutElevation:null,camera:[60,0,620,470]},...rooms.map(a=>({id:a.id,label:a.label,name:a.name,role:'storey',elevation:a.elevation,cutElevation:a.elevation+87,underground:a.elevation<0,camera:[60,Math.max(0,300-a.elevation-110),620,Math.min(920,800+a.elevation)]}))];
 const colors={timber:'#725137',plaster:'#c9bea9',stone:'#8c8576',rock:'#666c68',slate:'#58636b'};
 const textures=Object.fromEntries(['bed','sofa','table','counter','shelf','hearth','window','door','ivy','plant','desk','barrels','tree','lamp','rug','timber','plaster','rock','slate','stone','stoneWindow'].map(k=>[k,'assets/floating/'+k+'.webp']));
 textures.slab='assets/floating/slab-v3.webp';textures.crag='assets/floating/crag-v3.webp';textures.bunny='assets/island/v4/bunny.webp';textures.fox='assets/island/v4/fox.webp';
 textures.archWide='assets/floating/arch-wide-v3.webp';textures.archRoom='assets/floating/arch-room-v3.webp';
 function face(points,texture,shade=0){const a=points[0],b=points[1],d=points[3],horizontal=a[2]===b[2]&&a[2]===d[2];return {points,texture,color:colors[texture]||'#806343',shade,uv:horizontal?[a[0]*.15,a[1]*.2,Math.hypot(b[0]-a[0],b[1]-a[1])*.15,Math.hypot(d[0]-a[0],d[1]-a[1])*.2]:[a[0]*.15,-a[2]/96,Math.hypot(b[0]-a[0],b[1]-a[1])*.15||.15,Math.abs(d[2]-a[2])/96||.16]};}
 function box(u,v,w,d,z,h,texture){return [
  face([[u,v,z+h],[u+w,v,z+h],[u+w,v+d,z+h],[u,v+d,z+h]],texture),
  face([[u,v+d,z+h],[u+w,v+d,z+h],[u+w,v+d,z],[u,v+d,z]],texture,.16),
  face([[u+w,v+d,z+h],[u+w,v,z+h],[u+w,v,z],[u+w,v+d,z]],texture,.3)];}
 const rank=(l,n)=>((room(l)?.elevation??264)+528)*20+n;
 function add(id,kind,u,v,l,material,deps,faces,n=50){
  const z=room(l)?.elevation??264,p={id,kind,x:u,y:v,w:1,h:1,material:material||'S',cost:material?{[material]:1}:{},deps:[...new Set(deps.filter(Boolean))],seconds:material?1.2:2.4,workers:1,required:true,buildAction:material?'install':'excavate',layer:2,label:material?'安装'+kind+'一格':'从相邻已开通岩格开挖',workPoint:{x:240+(u-v)*10,y:224},view:{u,v,z,level:l,anchor:[u+.5,v+.5,z+4],standAnchor:[u+.5,v+.6,z+4],faces,order:rank(l,n)}};
  parts.push(p);if(material)costs[material]++;return p;
 }
 function cells(r){return r.rows.flatMap(([a,b],i)=>Array.from({length:b-a+1},(_,j)=>[a+j,i-3]));}
 function floor(r,entry){
  const mask=new Map(cells(r).map(p=>[p.join(','),p])),queue=[[r.su,r.sv]],seen=new Set(queue.map(p=>p.join(','))),parents=new Map();
  // Connected breadth-first excavation, with actual adjacent parent dependencies.
  for(let i=0;i<queue.length;i++){const [u,v]=queue[i];for(const p of [[u-1,v],[u,v-1],[u+1,v],[u,v+1]]){const k=p.join(',');if(mask.has(k)&&!seen.has(k)){seen.add(k);parents.set(k,[u,v]);queue.push(p);}}}
  const ids=[];for(const [u,v]of queue){let deps=entry;
   if(r.elevation<0){const parent=parents.get([u,v].join(',')),p=add('dig-'+key(r.id,u,v),'excavation',u,v,r.id,null,parent?[dig.get(key(r.id,...parent))]:entry,[],110+(u+v));p.view.actionOrder=rank(r.id,390);dig.set(key(r.id,u,v),p.id);
    terrain.push({clearBy:p.id,view:{...p.view,zRange:[r.elevation,r.elevation+87],faces:box(u,v,1,1,r.elevation,87,'rock'),order:rank(r.id,360+(u+v)*.1)}});deps=[p.id];
   }
   if(r.id!=='retreat'&&u===r.su&&v===r.sv)continue;
   const p=add('floor-'+key(r.id,u,v),'floor',u,v,r.id,'W',deps,box(u,v,1,1,r.elevation,3,'timber'),20+(u+v)*.1);p.view.receivesLight=true;floors.set(key(r.id,u,v),p.id);ids.push(p.id);
  }return ids;
 }
 const at=(l,u,v)=>floors.get(key(l,u,v));
 function wall(r,u,v,w,height,texture,kind='wall',n=45){const ids=[];
  for(let i=0;i<height/16;i++){const p=add(r.id+'-'+kind+'-'+u+'-'+v+'-'+i,kind,u,v,r.id,texture==='stone'?'S':'W',i?[ids.at(-1)]:[...(frames.get(r.id)||[]),texture==='stone'?dig.get(key(r.id,u,v)):at(r.id,u,v),dig.get(key(r.id,u,v))],box(u,v,w,.22,r.elevation+3+i*16-(texture==='stone'&&i===0?7:0),Math.min(16,height-i*16)+(texture==='stone'&&i===0?7:0),texture),n);p.view.receivesLight=true;ids.push(p.id);}return ids;
 }
 function frame(r,floorIds){const ids=[],underground=r.elevation<0,min=r.rows[0][0],max=r.rows[0][1];
  const posts=[min,underground?0:-3,max];for(const u of posts)ids.push(...wall(r,u,-3,.3,80,underground?'stone':'timber','post'));
  for(let u=min;u<=max;u++){
   ids.push(add(r.id+'-beam-'+u,'beam',u,-3,r.id,underground?'S':'W',ids.slice(),box(u,-3,1,.28,r.elevation+81,6,underground?'stone':'timber'),55).id);
   wall(r,u,-3,1,80,underground?'stone':'plaster','back-wall',35);
  }
  frames.set(r.id,ids);
  // Right facade follows each row, so perimeter steps are real geometry.
  for(let row=0;row<r.rows.length;row++){const u=r.rows[row][1]+.82,v=row-3;
   if(!underground)for(let j=0;j<5;j++){const p=add(r.id+'-facade-'+row+'-'+j,'wall',Math.floor(u),v,r.id,'W',ids,box(u,v,.18,1,r.elevation+3+j*16,16,'plaster'),300);p.view.zRange=[r.elevation,r.elevation+83];}
   if(!underground){for(let j=0;j<5;j++)add(r.id+'-edge-post-'+row+'-'+j,'column',Math.floor(u),v,r.id,'W',ids,box(u+.04,v,.15,.15,r.elevation+3+j*16,16,'timber'),310);
    add(r.id+'-edge-beam-'+row,'beam',Math.floor(u),v,r.id,'W',ids,box(u+.02,v,.18,1,r.elevation+81,6,'timber'),312);}
  }
  return ids;
 }
 function stair(r,to,deps){let previous;const target=room(to);
  for(let chunk=0;chunk<6;chunk++){const surfaces=[];for(let i=0;i<18;i++){const t=(18-i)/18,bottom=r.elevation+3+chunk*16,h=Math.min(16,r.elevation+3+t*88-bottom);if(h>0)surfaces.push(...box(r.su+(target.su-r.su)*t,r.sv+(target.sv-r.sv)*t+i/18,.76,1/18,bottom,h,'timber'));}
   const p=add(r.id+'-stair-'+chunk,chunk===5?'stair':'stair-section',r.su,r.sv,r.id,'W',previous?[previous]:deps,surfaces,240+chunk);if(chunk===5){p.view.connectsTo=to;p.view.exitAnchor=[target.su,target.sv,target.elevation+3];}previous=p.id;
  }stairs.set(r.id,previous);return previous;
 }
 let kitchen=room('kitchen'),f=floor(kitchen,[]);frame(kitchen,f);
 let last=stair(kitchen,'dining',[...f,...frames.get('kitchen')]);
 for(const id of ['dining','attic']){const r=room(id),below=id==='dining'?'kitchen':'dining';f=floor(r,[...frames.get(below),last]);frame(r,f);if(id==='dining')last=stair(r,'attic',[...f,...frames.get(id)]);}
 let entrance=[...frames.get('kitchen')];for(const id of ['living','bedroom','hall','study','retreat']){const r=room(id);f=floor(r,entrance);frame(r,f);entrance=[stair(r,rooms[rooms.indexOf(r)-1].id,[...f,...frames.get(id)])];}
 function furnish(l,texture,u,v,w,d,width,height,material='W',extra={}){
  const r=room(l),ids=[];for(let row=0;row<d;row++)for(let col=0;col<w;col++){
   const p=add(l+'-'+texture+'-'+u+'-'+v+'-'+col+'-'+row,'furniture',u+col,v+row,l,material,[...frames.get(l),at(l,u+col,v+row),dig.get(key(l,u+col,v+row))],undefined,120+(u+v)*3+row);
   p.view={...p.view,texture,anchor:[u+w/2,v+d/2,r.elevation+4],width,height,crop:[col,row,w,d],zRange:[r.elevation+4,r.elevation+4+height],fallbackFaces:box(u+col,v+row,1,1,r.elevation+4,Math.min(24,height),'timber'),...extra};ids.push(p.id);
  }return ids;
 }
 function light(l,u,v){const ids=furnish(l,'lamp',u,v,1,1,13,26,'B');parts.find(p=>p.id===ids[0]).view.light={anchor:[u+.5,v+.5,room(l).elevation+29],radius:64,stops:[[0,'#ffc16899'],[.5,'#ffb15e35'],[1,'#ffc16e00']]};}
 // Room-specific combinations and placements, taken from the confirmed reference.
 furnish('attic','bed',-1,-2,3,2,82,55);furnish('attic','desk',-5,-2,2,1,44,37);furnish('attic','rug',-2,0,4,1,95,32,'B');
 furnish('dining','table',-3,-1,4,2,106,55);furnish('dining','hearth',2,-3,2,1,44,57,'S');furnish('dining','shelf',-6,-3,2,1,46,55);
 furnish('kitchen','counter',-3,-3,5,1,123,48);furnish('kitchen','table',-3,0,4,2,108,54);furnish('kitchen','barrels',3,0,2,1,38,34);
 furnish('living','sofa',-5,-1,3,1,83,45);furnish('living','sofa',-1,0,3,1,83,45);furnish('living','rug',-4,0,5,2,122,45,'B',{order:rank('living',100)});furnish('living','table',3,0,2,1,52,43);furnish('living','shelf',-7,-1,2,1,48,58);
 furnish('bedroom','bed',-4,-1,3,2,81,53);furnish('bedroom','counter',1,0,3,1,75,43);furnish('bedroom','shelf',-6,-1,2,1,48,57);furnish('bedroom','rug',-5,0,4,2,99,41,'B',{order:rank('bedroom',100)});
 furnish('hall','counter',-3,-3,4,1,102,48);furnish('hall','table',-4,-1,4,2,102,52);furnish('hall','shelf',-6,-3,2,1,46,57);
 furnish('study','shelf',-5,-1,3,1,78,66);furnish('study','desk',-1,-1,3,2,76,43);furnish('study','rug',-2,0,4,1,92,30,'B',{order:rank('study',100)});
 furnish('retreat','shelf',-4,-1,2,1,52,60);furnish('retreat','sofa',-2,-1,3,1,87,45);furnish('retreat','hearth',1,-1,2,1,46,58,'S');furnish('retreat','rug',-3,0,4,1,95,31,'B',{order:rank('retreat',100)});
 for(const r of rooms){light(r.id,-4,-3);light(r.id,3,-3);furnish(r.id,'plant',3,-1,1,1,21,28,'B');}
 // Arches differ per room: one broad B1, partitioned B2/B3/B4, smaller B5.
 const spans={living:[[-7,8]],bedroom:[[-7,1],[1,8]],hall:[[-6,1],[1,7]],study:[[-5,-1],[-1,7]],retreat:[[-4,6]]};
 for(const r of rooms.filter(a=>a.elevation<0))for(const [start,end]of spans[r.id]){
  const v=r.rows.length-3+.1,z=r.elevation,center=(start+end)/2,half=(end-start)/2,curve=x=>z+36+45*Math.sqrt(Math.max(0,1-((x-center)/half)**2));
  for(let u=start;u<end;u++)for(let row=0;row<4;row++){
   const bottom=z+23+row*16,points=[[u,v,z+87],[u+1,v,z+87],[u+1,v,curve(u+1)],[u,v,curve(u)]],surfaces=box(u,v-.24,1,.34,bottom,16,'stone');surfaces[1].clipPoints=points;surfaces[0].clipPoints=points;surfaces[2].clipPoints=points;
   const p=add(r.id+'-arch-'+start+'-'+u+'-'+row,'arch',u,Math.min(r.sv,r.rows.length-4),r.id,'S',[...frames.get(r.id),...cells(r).filter(([x])=>x===u).map(([x,y])=>dig.get(key(r.id,x,y)))],surfaces,320+row);
   p.view.fallbackFaces=surfaces;delete p.view.faces;p.view.texture=end-start>=11?'archWide':'archRoom';p.view.surface={points:[[start,v,z+87],[end,v,z+87],[end,v,z+23],[start,v,z+23]],uv:[[0,0],[1,0],[1,1],[0,1]]};p.view.crop=[u-start,3-row,end-start,4];p.view.zRange=[bottom,bottom+16];
  }
  const pierWidth=end-start>=11?1.4:.8;
  for(const u of [start,end-pierWidth])for(let row=0;row<5;row++)add(r.id+'-arch-pier-'+start+'-'+u+'-'+row,'pier',Math.floor(u),r.sv,r.id,'S',[...frames.get(r.id),...cells(r).filter(([x])=>x===Math.floor(u)).map(([x,y])=>dig.get(key(r.id,x,y)))],box(u,v-.24,pierWidth,.34,z+3+row*16,16,'stone'),319);
 }
 function retained(u,v,w,d,z,h,texture='rock',n=350){const view={anchor:[u+w/2,v+d/2,z],zRange:[z,z+h],faces:box(u,v,w,d,z,h,texture),order:n,sectionSolid:{footprint:[[u,v],[u+w,v],[u+w,v+d],[u,v+d]],zRange:[z,z+h],texture}};geometry.push({view});return view;}
 // Solid shell is split along storeys and footprint steps; no full-height shell image.
 const shellBounds={living:[-11,11.5],bedroom:[-10.8,11.8],hall:[-10.5,12],study:[-10,11.8],retreat:[-9.5,11.5]};
 for(const r of rooms.filter(a=>a.elevation<0)){
  const z=r.elevation,min=r.rows[0][0],max=r.rows[0][1];retained(min-2,-5,max-min+5,2,z,88,'rock',rank(r.id,5));
  for(let i=0;i<r.rows.length;i++){const [a,b]=r.rows[i],v=i-3,[left,right]=shellBounds[r.id];retained(left,v,a-left,1,z,88,'rock',rank(r.id,340));retained(b+1,v,right-b-1,1,z,88,'rock',rank(r.id,345));}
  for(const side of [-1,1]){const u=side<0?r.rows[2][0]-1.5:r.rows[2][1]+2,v=-.5;
   // Windows are installed facade details; never painted into permanent rock.
   const p=furnish(r.id,'stoneWindow',side<0?r.rows[2][0]:r.rows[2][1],-1,1,2,28,57,'S',{anchor:[u,v,z+10],order:rank(r.id,355),flipX:side>0});
   for(const id of p)parts.find(a=>a.id===id).deps.push(...cells(r).map(([x,y])=>dig.get(key(r.id,x,y))));
   geometry.push({view:{anchor:[u,v,z-10],zRange:[z-10,z+61],texture:'ivy',width:31,height:71,order:rank(r.id,360)}});
  }
 }
 // Independent crags form the broad underside, with geometry fallback and section clipping.
 for(let u=-8;u<=8;u+=3){const bottom=-530-((u+8)%4)*14,top=-445-((u+8)%3)*7;
  geometry.push({view:{anchor:[u,2.3+((u+8)%3)*.4,bottom],texture:'crag',width:112+((u+8)%3)*8,height:top-bottom,zRange:[bottom,top],flipX:u<0,order:rank('retreat',350)+(u+8)*.01,fallbackFaces:box(u-1.5,1,3,3,bottom,top-bottom,'rock')}});
 }
 for(let u=-6;u<=6;u+=3)geometry.push({view:{anchor:[u,-1,-540],texture:'crag',width:116,height:96,zRange:[-540,-444],order:rank('retreat',10),fallbackFaces:box(u-1.5,-3,3,3,-540,96,'rock')}});
 for(const [u,v,z,w]of [[-5,1,-590,146],[-1,2,-607,157],[3,1.5,-588,151],[7,0,-570,135]])geometry.push({view:{anchor:[u,v,z],texture:'crag',width:w,height:w*142/240,zRange:[z,z+w*142/240],order:rank('retreat',9),fallbackFaces:box(u-2,v-2,4,4,z,w*142/240,'rock')}});
 for(const r of rooms.filter(a=>a.elevation<0))for(let row=0;row<r.rows.length;row+=2)for(const side of [-1,1]){
  const u=side<0?r.rows[row][0]-3.1:r.rows[row][1]+3.4,v=row-2.3;
  geometry.push({view:{level:r.id,anchor:[u,v,r.elevation-9],texture:'slab',width:78,height:98,zRange:[r.elevation-9,r.elevation+89],order:rank(r.id,348),flipX:side<0,fallbackFaces:box(u-1,v-1,2,2,r.elevation-9,98,'rock')}});
  const edge=shellBounds[r.id][side<0?0:1];geometry.push({view:{level:r.id,anchor:[edge-side*.2,v-.8,r.elevation-6],texture:'slab',width:65,height:103,zRange:[r.elevation-6,r.elevation+97],order:rank(r.id,347),flipX:side<0,fallbackFaces:box(edge-1,v-1,2,2,r.elevation-6,103,'rock')}});
 }
 for(const r of rooms.filter(a=>a.elevation>=0)){
  const min=r.rows[1][0];for(let v=-3;v<2;v++)for(const u of [min-2,min-1]){
   const p=add(r.id+'-balcony-'+u+'-'+v,'floor',u,v,r.id,'W',frames.get(r.id),box(u,v,1,1,r.elevation,3,'timber'),25);
   if(u===min-2)add(r.id+'-rail-'+v,'railing',u,v,r.id,'W',[p.id],box(u,v,.12,1,r.elevation+3,1,'timber').concat(box(u,v,.13,.13,r.elevation+3,22,'timber'),box(u,v,.13,1,r.elevation+25,2,'timber')),260);
  }furnish(r.id,'door',min,-2,1,1,28,63);furnish(r.id,'ivy',min-1,1,1,1,24,41,'B');
  for(const v of [-2,0])furnish(r.id,'window',r.rows[v+3][1],v,1,1,26,45,'W',{anchor:[r.rows[v+3][1]+1.03,v+.5,r.elevation+22],order:rank(r.id,320)});
 }
 // Ground terrace and projecting right porch follow the reference silhouette.
 const terrace=[];for(let u=-10;u<=10;u++)for(let v=3;v<5;v++){const p=add('terrace-'+u+'-'+v,'floor',u,v,'kitchen','S',frames.get('kitchen'),box(u,v,1,1,-3,6,'stone'),330);terrace.push(p.id);
  if(v===4&&u< -3)add('terrace-fence-'+u,'railing',u,v,'kitchen','W',[p.id],box(u,v,1,.1,17,2,'timber').concat(box(u,v,.12,.12,3,22,'timber')),340);
 }
 for(let u=8;u<=10;u++)for(let v=-2;v<2;v++)add('porch-floor-'+u+'-'+v,'floor',u,v,'kitchen','S',frames.get('kitchen'),box(u,v,1,1,0,4,'stone'),330);
 for(const [u,v]of [[8,-2],[10,-2],[10,1]])for(let j=0;j<4;j++)add('porch-post-'+u+'-'+v+'-'+j,'column',u,v,'kitchen','W',j?['porch-post-'+u+'-'+v+'-'+(j-1)]:terrace,box(u,v,.2,.2,4+j*16,16,'timber'),350);
 for(let u=8;u<=10;u++)for(let v=-2;v<2;v++)add('porch-roof-'+u+'-'+v,'awning',u,v,'kitchen','S',parts.filter(p=>p.id.startsWith('porch-post')).map(p=>p.id),[face([[u,v,72-v*5],[u+1,v,72-v*5],[u+1,v+1,67-v*5],[u,v+1,67-v*5]],'slate')],360);
 for(const [u,v]of [[-9,2],[9,3],[-8,4]]){furnish('kitchen','plant',u,v,1,1,30,40,'B',{order:rank('kitchen',370)});}
 // Roof has its own display group. Main pitch plus projecting gables/dormers.
 const roof=[];function pitch(prefix,u0,u1,v0,v1,z,rise,ridgeAxis='v'){
  const center=ridgeAxis==='v'?(v0+v1)/2:(u0+u1)/2,half=ridgeAxis==='v'?(v1-v0)/2:(u1-u0)/2;
  const height=(u,v)=>z+rise*(1-Math.abs((ridgeAxis==='v'?v:u)-center)/half);
  for(let u=u0;u<u1;u++)for(let v=v0;v<v1;v++){const p=add(prefix+'-'+u+'-'+v,'roof',u,v,'roof','S',frames.get('attic'),[face([[u,v,height(u,v)],[u+1,v,height(u+1,v)],[u+1,v+1,height(u+1,v+1)],[u,v+1,height(u,v+1)]],'slate',.1)],rank('attic',60)-rank('roof',0));p.view.order=rank('roof',40)+(u+v)*.1;for(const f of p.view.faces)f.uv=f.uv.map(a=>a*3);roof.push(p.id);}
 }
 pitch('main-slate',-7,8,-5,2,257,69);pitch('left-gable',-8,-3,-4,2,255,78,'u');pitch('right-wing',6,10,-5,-1,244,58,'v');
 for(const [u,z]of [[0,304],[5,292]])for(let j=0;j<7;j++)add('chimney-'+u+'-'+j,'chimney',u,-2,'roof','S',j?['chimney-'+u+'-'+(j-1)]:roof,box(u,-2,.8,.8,z+j*10,10,'stone'),150);
 for(const u of [-2,2,8]){
  const ids=[];for(let j=0;j<3;j++)ids.push(add('dormer-'+u+'-'+j,'wall',u,0,'roof','W',roof,box(u-.3,0,1.3,.85,268+j*12,12,'plaster'),100).id);
  const p=add('dormer-window-'+u,'window',u,0,'roof','W',ids,undefined,110);p.view={...p.view,anchor:[u+.35,.94,273],texture:'window',width:23,height:32,zRange:[273,305],fallbackFaces:box(u,0,.8,.1,273,32,'timber')};
  pitch('dormer-cap-'+u,u-1,u+2,-1,1,304,18,'u');for(const p of parts.filter(a=>a.id.startsWith('dormer-cap-'+u+'-')))p.view.order=rank('roof',125);
 }
 // Left main gable and roof timbers are installed, not scenery.
 for(let u=-8;u<-3;u++)for(let j=0;j<5;j++){const z=257+j*16,p=add('gable-'+u+'-'+j,'gable',u,1,'roof','W',frames.get('attic'),[face([[u,1,z+16],[u+1,1,z+16],[u+1,1,z],[u,1,z]],'plaster')],80);p.view.faces[0].clipPoints=[[-8,1,257],[-5.5,1,333],[-3,1,257]];}
 for(let u=-8;u<9;u++)add('eave-'+u,'beam',u,1,'roof','W',roof,box(u,1,1,.2,253,5,'timber'),160);
 // Natural grass/ivy is independent of the building; initial mountain stays solid.
 for(const r of rooms.filter(a=>a.elevation>=0)){
  const v=r.rows.length-3-.04,u=r.rows.at(-1)[0];for(let j=0;j<5;j++)add(r.id+'-front-column-'+j,'column',u,Math.floor(v),r.id,'W',j?[r.id+'-front-column-'+(j-1)]:frames.get(r.id),box(u,v,.22,.24,r.elevation+3+j*16,16,'timber'),280);
  for(let x=u;x<=r.rows.at(-1)[1];x++)add(r.id+'-front-header-'+x,'beam',x,Math.floor(v),r.id,'W',frames.get(r.id),box(x,v,1,.24,r.elevation+82,5,'timber'),282);
  const z=r.elevation+82;add(r.id+'-front-brace','beam',u,Math.floor(v),r.id,'W',frames.get(r.id),[face([[u,v,z-22],[u+1.2,v,z],[u+1.2,v,z-4],[u,v,z-26]],'timber')],284);
 }
 for(const u of [-2,2,8]){const center=u+.35,z=306,v=1.08;
  add('dormer-gable-'+u,'gable',u,1,'roof','W',roof,[{...face([[center-.85,v,z+20],[center+.85,v,z+20],[center+.85,v,z],[center-.85,v,z]],'plaster'),clipPoints:[[center-.85,v,z],[center,v,z+20],[center+.85,v,z]]}],120);
  for(const side of [-1,1])add('dormer-pitch-'+u+'-'+side,'roof',u,1,'roof','S',roof,[face([[center+side*.95,-.2,z],[center,-.2,z+21],[center,1.2,z+21],[center+side*.95,1.2,z]],'slate')],135);
 }
 const gw=add('left-gable-window','window',-6,1,'roof','W',roof,undefined,140);gw.view={...gw.view,anchor:[-5.5,1.08,273],texture:'window',width:25,height:39,fallbackFaces:box(-6,1,1,.1,273,39,'timber')};
 // Exterior decor must also wait for its actual deck cell, authored after the main rooms.
 for(const p of parts.filter(a=>a.kind==='furniture'&&a.view.level==='kitchen')){const support=parts.find(a=>a.kind==='floor'&&a.view.level===p.view.level&&a.x===p.x&&a.y===p.y);if(support&&!p.deps.includes(support.id))p.deps.push(support.id);}
 retained(-11,3,24,2,-8,8,'rock',rank('kitchen',15));
 for(const [u,v,w,h]of [[-10,4,68,103],[10,-3,95,138]])geometry.push({view:{level:'kitchen',anchor:[u,v,0],texture:'tree',width:w,height:h,zRange:[0,h],order:rank('kitchen',390)}});
 geometry.push({view:{level:'kitchen',anchor:[10,3,0],texture:'crag',width:31,height:18,zRange:[0,18],order:rank('kitchen',385)}});
 const plan={id:'floating-mountain-v3',signature:'floating-mountain-v3',silhouette:'floating-mountain-v3',replaces:['floating-mountain-v1','floating-mountain-v2'],name:'云芽悬浮山',description:'独立异形八层 · 木石住宅 · 水平剖切',template:true,cutaway:true,residential:true,gridBuild:true,parts,costs,
  construction:{gathering:{worker:1,multiplier:1,sources:{W:65,S:365,B:90,D:140},water:150,mix:132,supply:{version:1,kinds:Object.fromEntries(['W','S','B','D'].map(k=>[k,{buffer:8,cap:24,batch:2,periods:[5]}])),manual:{W:{units:3,seconds:2.5},S:{units:3,seconds:2.5}}}},experience:{version:1,stages:['kitchen','dining','attic','living','bedroom','hall','study','retreat','roof'].map(id=>({label:(room(id)?.label||'屋顶')+'准备好了',parts:parts.filter(p=>p.view.level===id).map(p=>p.id)}))},
   view:{projection:'diagonal',sectionMode:'horizontal',worldSize:[720,1120],fitViewport:true,renderOnChange:true,origin:[360,410],tile:[40,16],basis:[[20,6],[-14,5]],sky:'#cbd9e4',background:'assets/floating/clouds.webp',textures,levels,terrain,geometry,surfaceLevel:'kitchen',ripples:[],petSize:[11,16],path:[[0,55,379],[65,104,370],[140,175,383],[240,313,435],[380,552,486],[480,610,490]],resources:[{kind:'W',point:[104,370],radius:24},{kind:'S',point:[526,481],radius:18}],scenery:[],weatherGround:465}},environment:{weather:'clear',ground:[130,461,440,5]}};
 if(typeof module!=='undefined'&&module.exports)module.exports=plan;else root.TownBlueprints.push(plan);
})(globalThis);
