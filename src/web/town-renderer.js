/* Code-native pixel components. Every visible building cell is a real object. */
(function(root){
 'use strict';
 const box=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 function polygon(c,pts,color){c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
 const names={floor:'地基／楼板',post:'承重柱',beam:'横梁',wall:'木墙',window:'窗墙',door:'出入口',roof:'屋顶',stairs:'外楼梯',partition:'隔断',furniture:'家具',sign:'招牌',drying:'晾晒架',quilt:'床品',curtain:'窗帘',lamp:'灯',canvas:'青布棚面','timber-rack':'木件料架','tree-trunk':'院树树干','tree-crown':'院树枝叶','long-table':'长桌',stool:'凳子',awning:'莓红布篷','awning-light':'帆布条','stall-counter':'交换摊台','market-crate':'交换货箱'};
 function tree(c,x,y,size,time){
  box(c,x-2,y-size,5,size,'#574d3c');
  for(let j=0;j<6;j++){const w=12+Math.round(Math.sin(j*.7)*12),yy=y-size-12+j*5;box(c,x-w/2,yy,w,7,j%3===0?'#42645a':'#34584f');box(c,x-w/2+2,yy,5,2,'#55756a');}
  box(c,x+4,y-3,10,2,'#253e38');
 }
 function furniture(c,p,x,y,time){const a=p.art,i=a.index,n=a.cols,type=a.type;
  if(type==='bed'){
   box(c,x,y+8,16,5,'#755139');box(c,x,y+5,16,3,'#c2a77b');box(c,x,y+7,16,3,'#ac8560');
   if(i===0){box(c,x,y+2,3,13,'#9e7651');box(c,x+4,y+4,8,4,'#e0cfaa');}if(i===n-1)box(c,x+13,y+7,3,8,'#a67b51');box(c,x+2,y+13,2,3,'#533f32');
  }else if(type==='table'||type==='saw'){
   box(c,x,y+4,16,4,'#b68b5c');box(c,x,y+8,16,1,'#594435');if(i===0)box(c,x+2,y+8,3,8,'#7f5c41');if(i===n-1)box(c,x+11,y+8,3,8,'#7f5c41');
   if(type==='saw'){box(c,x+1,y+1,14,3,'#bf9b6b');box(c,x+3,y,11,1,'#d2b486');if(i===1){box(c,x+6,y-3,3,8,'#a4b7b5');box(c,x+4,y-2,7,2,'#d5d4b4');}}else if(i===0){box(c,x+5,y,5,4,'#728470');box(c,x+6,y-2,3,2,'#90a786');}
  }else if(type==='loom'){
   box(c,x+2,y,3,16,'#b08757');box(c,x+12,y,2,16,'#9b704d');box(c,x,y+1,16,2,'#cba979');box(c,x,y+12,16,2,'#cba979');
   for(let k=5;k<12;k+=2)box(c,x+k,y+3,1,9,'#d7c9a5');box(c,x+4,y+7,9,3,'#aa7f79');box(c,x+5,y+9,8,2,'#b89c9a');
  }else if(type==='planter'){
   box(c,x,y+10,16,6,'#8e6649');box(c,x,y+9,16,2,'#c2935f');box(c,x+3,y+2,2,9,'#71865d');box(c,x+10,y,2,10,'#71865d');
   for(const [xx,yy]of [[2,3],[10,0]]){box(c,x+xx,y+yy,5,4,'#d8d6bd');box(c,x+xx+1,y+yy-1,3,6,'#f0e6cb');}
  }else if(type==='shelf'){
   box(c,x+1,y,14,16,'#574738');for(let j=0;j<3;j++){box(c,x+1,y+j*5,14,2,'#a77e55');box(c,x+3,y+2+j*5,3,3,j%2?'#859385':'#bb946d');box(c,x+8,y+2+j*5,4,3,'#b79879');}
  }
 }
 function extensionPart(c,p,o,time){
  c.save();c.translate(o.x,o.y);c.scale(16/30,16/30);const st=p.style;
  const b=(x,y,w,h,color)=>box(c,x,y,w,h,color);
  switch(p.kind){
   case 'trellis':b(3,0,2,30,'#789577');b(25,0,2,30,'#789577');for(let y=4;y<30;y+=8)b(3,y,24,2,'#789577');b(10,9,4,4,'#a6bc85');b(20,20,3,3,'#d1b991');break;
   case 'pergola':b(0,18,30,3,'#a3a178');for(let x=1;x<30;x+=6)b(x,10,2,20,'#8d946c');break;
   case 'floor':b(0,0,30,p.cost.S?30:15,p.cost.S?'#66766d':st.wood);b(0,0,30,2,'#a6b2a0');b(2,7,12,1,'#4b5d53');b(17,10,10,1,'#4b5d53');break;
   case 'post':b(10,0,11,30,p.cost.S?'#758679':st.wood);b(10,0,2,30,st.light);b(13,7,1,9,'#70543d');break;
   case 'beam':b(0,15,30,15,st.wood);b(0,15,30,2,st.light);b(4,22,15,1,'#76563d');break;
   case 'wall':case 'window':b(0,0,30,30,st.wall);for(let y=2;y<30;y+=7)b(0,y,30,1,'#718071');if(p.kind==='window'){b(3,3,24,24,'#a5b8a1');b(5,5,20,18,'#4c7779');b(7,6,5,6,'#9cbbab');b(14,4,2,21,'#d1b184');b(3,23,24,3,'#d1b184');}break;
   case 'door':b(7,0,16,60,'#2d433c');b(4,0,3,60,'#c4a175');b(23,0,3,60,'#c4a175');b(4,0,22,3,'#d8bd89');break;
   case 'roof':polygon(c,[[0,29],[4,10],[26,10],[30,29]],st.roof);for(let y=12;y<29;y+=5)b(4,y,22,1,'#8ba392');break;
   case 'stairs':{const h=30*(p.stairRise||16)/16;for(let j=0;j<4;j++){const y=p.stairUpRight?h*(3-j)/4:h*j/4;b(j*7.5,y,8,4,st.light);b(j*7.5,y+4,8,Math.max(3,h-y),st.wood);}b(26,-18,2,20,'#c4ae84');break;}
   case 'partition':b(12,0,5,30,st.wood);b(12,0,2,30,st.light);break;
   case 'quilt':b(10,9,40,12,'#b4867d');b(12,9,36,2,'#ddbaa4');for(let x=14;x<48;x+=7)b(x,14,2,2,'#dfb99d');break;
   case 'curtain':b(0,0,5,30,'#b28c7e');b(25,0,5,30,'#b28c7e');b(0,0,30,3,'#d5b894');break;
   case 'lamp':b(13,6,2,24,'#c2a576');b(7,3,15,9,'#eccb8d');b(6,28,18,2,'#bda074');break;
   case 'canvas':case 'awning':case 'awning-light':{
    const [cloth,edge]=p.kind==='canvas'?['#448f87','#8cc3ad']:p.kind==='awning'?['#ae615e','#e38d78']:['#dfbd83','#f3d7a0'];
    b(0,8,30,17,cloth);b(0,8,30,3,edge);b(0,24,30,3,edge);b(2,27,11,3,cloth);b(17,27,11,3,cloth);break;
   }
   case 'timber-rack':b(2,26,26,4,'#654733');b(1,19,28,5,'#a66f42');b(4,14,25,4,'#c3925e');b(5,10,20,3,'#e2b680');b(23,14,6,4,'#e7b980');break;
   case 'tree-trunk':b(11,-2,9,62,'#795e47');b(12,1,3,55,'#b18a5e');b(4,-3,25,6,'#688659');b(20,54,8,6,'#795e47');break;
   case 'tree-crown':b(0,16,30,34,'#52774f');b(5,8,25,13,'#72975b');b(10,4,14,8,'#8bab69');b(3,28,19,9,'#698e57');b(22,19,8,7,'#94a969');b(10,45,13,7,'#486d4b');b(13,20,4,3,'#d5b575');break;
   case 'long-table':b(0,13,30,4,'#d6a671');b(0,17,30,3,'#81583b');b(3,20,4,10,'#916849');b(16,9,8,4,'#abb499');break;
   case 'stool':b(5,20,22,4,'#d5a16a');b(6,24,4,6,'#825a3e');b(20,24,4,6,'#825a3e');break;
   case 'stall-counter':b(0,10,30,20,'#956546');b(0,8,30,5,'#d1a46b');b(2,23,26,2,'#c39360');b(4,3,9,5,'#d8a679');b(19,1,9,7,'#91a97d');break;
   case 'market-crate':b(4,13,23,17,'#9d744c');b(4,13,23,3,'#cca871');b(8,16,2,14,'#d1a970');b(21,16,2,14,'#d1a970');break;
   case 'furniture':
    if(p.art.type==='bed'){b(0,14,30,12,'#876344');b(0,10,30,5,'#c7b48a');b(3,26,4,4,'#594532');if(p.art.index===0){b(0,5,4,25,st.light);b(7,8,17,6,'#e4d2ae');}if(p.art.index===p.art.cols-1)b(26,12,4,18,st.light);}
    else if(p.art.type==='loom'){b(3,0,4,30,st.light);b(24,0,4,30,st.wood);b(0,2,30,3,st.light);b(0,24,30,3,st.light);for(let x=9;x<23;x+=3)b(x,5,1,19,'#d4c7a5');b(7,14,18,6,'#ad8a87');}
    else if(p.art.type==='planter'){b(0,18,30,12,'#987958');b(2,17,26,2,'#d2ae7b');b(12,2,2,17,'#709c72');b(5,5,8,5,'#9ab584');b(14,2,9,5,'#91aa79');b(7,3,4,4,'#d5b58c');}
    else if(p.art.type==='shelf'){b(2,0,26,30,'#65523f');for(let y=2;y<29;y+=9){b(2,y,26,2,'#c3a176');b(5,y+3,7,5,'#a7b09a');b(17,y+3,7,5,'#d1b88a');}}
    else{b(0,9,30,5,'#c5a06c');b(4,14,4,16,'#95704b');b(23,14,4,16,'#95704b');b(10,3,15,4,'#95aaa1');}break;
  }c.restore();
 }
 function part(c,p,o,time){if(p.pixelRatio)return extensionPart(c,p,o,time);const {x,y}=o,st=p.style;
  switch(p.kind){
   case 'floor':box(c,x,y,16,8,p.cost.S?'#67746c':st.wood);box(c,x,y,16,2,p.cost.S?'#99a298':st.light);box(c,x+1,y+5,8,1,'#48554e');break;
   case 'post':box(c,x+5,y,6,16,st.wood);box(c,x+5,y,2,16,st.light);box(c,x+10,y+2,1,5,'#634c3a');break;
   case 'beam':box(c,x,y+8,16,8,st.wood);box(c,x,y+8,16,2,st.light);box(c,x,y+14,16,2,'#503f32');break;
   case 'wall':case 'window':
    box(c,x,y,16,16,st.wall);for(let j=0;j<4;j++){box(c,x,y+j*4,16,1,'#62594a');box(c,x+((j*7)%15),y+j*4+1,1,3,'#49473e');}
    if(p.kind==='window'){box(c,x+1,y+1,14,14,'#2a3f42');box(c,x+3,y+3,10,10,'#779b92');box(c,x+3,y+3,4,5,'#abc2ab');box(c,x+7,y+2,2,12,'#b18e5c');box(c,x+2,y+7,12,2,'#b18e5c');box(c,x,y+14,16,2,'#b68d5b');}break;
   case 'roof':polygon(c,[[x-1,y+15],[x+2,y+5],[x+14,y+5],[x+17,y+15]],st.roof);for(let j=0;j<3;j++)box(c,x,y+6+j*3,16,1,j%2?'#73958b':'#395951');box(c,x-1,y+15,18,2,'#293d38');break;
   case 'door':box(c,x+4,y,8,32,'#2b3b35');box(c,x+2,y,2,32,'#b28a5c');box(c,x+12,y,2,32,'#b28a5c');box(c,x+2,y,12,2,'#d0a777');box(c,x+3,y+31,11,2,'#bf9c6c');break;
   case 'stairs':box(c,x,y+12,16,4,st.wood);box(c,x,y+11,16,2,st.light);box(c,x+11,y,2,14,'#c4a575');box(c,x+1,y+5,12,2,'#a4835c');break;
   case 'partition':box(c,x+6,y,3,16,'#99704a');box(c,x+5,y+2,5,1,'#c09b67');break;
   case 'furniture':furniture(c,p,x,y,time);break;
   case 'sign':box(c,x-3,y-1,36,12,'#c1a778');box(c,x-1,y+1,32,8,'#304e49');c.fillStyle='#e2c78e';c.font='7px monospace';c.fillText(p.label||'工坊',x+1,y+8);break;
   case 'drying':box(c,x,y+3,16,1,'#b5a27f');box(c,x+2,y+4,11,8,'#b2978c');box(c,x+3,y+4,2,8,'#d0b6a0');break;
   case 'quilt':box(c,x+8,y+5,20,5,'#b4867d');box(c,x+9,y+5,18,1,'#dbb7a3');for(let k=10;k<26;k+=4)box(c,x+k,y+7,2,1,'#d5b5a2');break;
   case 'curtain':box(c,x,y,3,17,'#b28c7e');box(c,x+13,y,3,17,'#b28c7e');box(c,x-1,y-1,18,2,'#d1b890');break;
   case 'lamp':box(c,x+5,y+3,1,13,'#b29d71');box(c,x+3,y+1,6,5,'#e9c484');box(c,x+2,y+15,8,1,'#b49a6d');break;
  }
 }
 function pet(c,def,pose,time){const x=Math.round(pose.x),y=Math.round(pose.y)+(pose.phase==='sit'?3:0),step=['walk','carry','climb','deliver','fetch'].includes(pose.phase)?Math.round(Math.sin(time*14)):0;
  box(c,x-5,y-2,10,2,'#213b35');box(c,x-4,y-9,8,8,def.color);box(c,x-5,y-12,10,6,def.color);
  if(def.species==='bunny'){box(c,x-4,y-16,3,5,def.color);box(c,x+2,y-16,3,5,def.color);box(c,x-3,y-15,1,3,'#ae837b');}
  else{polygon(c,[[x-5,y-10],[x-5,y-16],[x-1,y-12]],def.color);polygon(c,[[x+1,y-12],[x+5,y-16],[x+5,y-10]],def.color);}
  box(c,x-2,y-10,1,1,'#34312d');box(c,x+2,y-10,1,1,'#34312d');box(c,x-2,y-7,5,2,'#e2cfad');box(c,x-3,y-2+step,2,2,'#aa8e72');box(c,x+2,y-2-step,2,2,'#aa8e72');
  box(c,x-3,y-5,6,3,def.species==='fox'?'#697e74':def.species==='cat'?'#9a7d87':'#708d92');
  if(pose.phase==='work'){const reach=Math.floor(time*4)%2;box(c,x+2+reach*2,y-6+reach,4,2,def.color);}
  if(pose.phase==='sit'){box(c,x-3,y-2,4,2,def.color);box(c,x+2,y-2,4,2,def.color);}
  if(def.scarf){box(c,x-5,y-7,10,2,'#b98759');box(c,x+3,y-5,2,4,'#e0ad72');}
  if(pose.phase==='sort'){const offset=Math.floor(time*4)%3;box(c,x+2,y-8+offset,9,3,'#c49359');box(c,x+8,y-8+offset,3,3,'#e3bf86');}
  if(pose.held==='W'&&root.TownPetWorkArt)root.TownPetWorkArt.timberOverlay(c,{log:{x:x+5,y:y-5,length:12,diameter:4}},time);
  else if(pose.held==='W')box(c,x+3,y-7,8,3,'#ca9564');
  else if(pose.held)box(c,x+3,y-7,6,5,pose.held==='S'?'#8d9b96':pose.held==='C'?'#bc9b94':'#e0dec5');
  if(pose.hammer){const dy=Math.floor(time*7)%2*3;box(c,x+7,y-13+dy,2,8,'#b08d62');box(c,x+5,y-14+dy,7,3,'#a3b4ab');}
 }
 function viewRect(s,cfg,level='all',camera={}){const selected=cfg.view.levels.find(l=>l.id===level)||cfg.view.levels[0],base=selected.rect,z=camera.zoom||1,aspect=camera.aspect||base[2]/base[3],w=Math.max(base[2],base[3]*aspect)/z,h=w/aspect;return [base[0]+(camera.x||0)+(base[2]-w)/2,base[1]+(camera.y||0)+(base[3]-h)/2,w,h];}
 function focalBuilding(s,cfg){
  const plan=cfg.plans.find(p=>p.id===(s.project?.plan||s.completed.at(-1)?.id))||cfg.plans.find(p=>p.base);
  const building=cfg.instances.find(b=>b.id===plan.targetRoom),v=root.TownLayout.variant(cfg.source,building);
  return {id:building.id,x:building.x+v.width/2,y:building.y-v.height/2,floor:building.y,width:v.width};
 }
 function visitorPortrait(canvas,event){
  const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);c.imageSmoothingEnabled=false;
  pet(c,visitorStyle(event),{x:12,y:21,phase:'idle'},0);
 }
 function visitorStyle(e){return e.guest?{...e.guest,scarf:true}:{species:'cat',color:e.type==='pickup'?'#d3c39b':e.type==='assist'?'#8ec4b6':'#c79eaa'};}
 function caption(c,text,x,y,background='#2b4941'){c.font='8px sans-serif';const w=c.measureText(text).width;box(c,x-w/2-3,y-8,w+6,11,background);c.fillStyle='#f1dfb6';c.fillText(text,x-w/2,y);}
 function visitorVisible(p,selected,rect,overlays=[]){
  if(selected.plot||selected.yRange&&(p.y<selected.yRange[0]||p.y>selected.yRange[1]))return false;
  if(!rect)return true;const x=(p.x-rect[0])/rect[2],y=(p.y-rect[1])/rect[3];
  return x>=0&&x<=1&&y>=0&&y<=1&&!overlays.some(b=>x>=b[0]&&x<=b[2]&&y>=b[1]&&y<=b[3]);
 }
 function draw(canvas,s,cfg,level='all',camera={}){
  const c=canvas.getContext('2d'),E=root.TownGrowthEngine,v=cfg.view,selected=v.levels.find(l=>l.id===level)||v.levels[0],rect=viewRect(s,cfg,level,camera);
  c.imageSmoothingEnabled=false;c.clearRect(0,0,canvas.width,canvas.height);c.save();c.scale(canvas.width/rect[2],canvas.height/rect[3]);c.translate(-rect[0],-rect[1]);
  box(c,rect[0],rect[1],rect[2]+1,rect[3]+1,v.palette.sky);box(c,rect[0],185,rect[2]+1,87,['#466269','#4d6260','#495b69'][s.layout.palette]);
  for(const item of s.layout.environment)if(item.type==='tree')tree(c,item.x,item.y,item.size,s.time);;
  box(c,rect[0],272,rect[2]+1,Math.max(0,rect[1]+rect[3]-272)+1,v.palette.ground);box(c,rect[0],272,rect[2]+1,2,'#72836a');
  for(const item of s.layout.environment)if(item.type==='grass')box(c,item.x,item.y,4,2,'#6a8665');else if(item.type==='stone')box(c,item.x,item.y,7,3,'#73867a');
  // Permanent camp and short forest paths are scenery, never an instant finished house.
  polygon(c,[[34,270],[60,240],[85,270]],'#a28f6d');polygon(c,[[60,240],[60,270],[78,270]],'#716c56');box(c,56,258,9,14,'#39463a');
  for(let i=0;i<4;i++)box(c,90+i*21,274,14,2,'#9d967c');
  const quarry=cfg.recipes.find(r=>r.point&&r.output.S)?.point;if(quarry){box(c,quarry.x-8,261,17,11,'#7e8d85');box(c,quarry.x-4,258,9,5,'#9aa69b');}
  const stock=E.inventory(s,cfg);for(let j=0;j<Math.min(5,Math.ceil(stock.W/8));j++){box(c,96,268-j*3,16,3,'#8d684b');box(c,97,268-j*3,3,2,'#caa575');}
  for(const group of cfg.groups.filter(g=>s.furniture[g.id]?.status==='parked')){const i=cfg.groups.indexOf(group);for(const pid of group.parts){const p=cfg.parts.find(p=>p.id===pid);part(c,p,{x:18+(i%3)*32+p.art.index*16,y:284},s.time);}}
  const visible=o=>(!selected.rooms||selected.rooms.includes(o.room))&&(!selected.yRange||(()=>{const y=cfg.rooms.find(r=>r.id===o.room).point.y;return y>=selected.yRange[0]&&y<=selected.yRange[1];})());
  const ordered=cfg.parts.filter(p=>s.objects[p.id].status==='installed'&&visible(s.objects[p.id])).sort((a,b)=>(a.layer??2)-(b.layer??2)||a.y-b.y);
  if(s.project){const target=focalBuilding(s,cfg);if(visible({room:target.id})){c.strokeStyle='#c8b57e';c.setLineDash([3,4]);c.strokeRect(target.x-target.width/2,target.y-32,target.width,64);c.setLineDash([]);}}
  for(const p of ordered){const o=s.objects[p.id];c.globalAlpha=E.roomAvailable(s,o.room,cfg)?1:.55;part(c,p,o,s.time);}c.globalAlpha=1;
  if(camera.placement?.building){
   const {building:b,error}=camera.placement,v=root.TownLayout.variant(cfg.source,b),color=error?'#ed947d':'#a8e1b5';
   c.globalAlpha=.5;for(const p of [...v.parts].sort((a,b)=>(a.layer??2)-(b.layer??2)))part(c,p,{x:b.x+p.x,y:b.y+p.y},s.time);c.globalAlpha=1;
   c.strokeStyle=color;c.lineWidth=1.5;c.setLineDash([4,3]);c.strokeRect(b.x,b.y-v.height,v.width,v.height);
   if(b.connection){const points=b.connection.route;c.beginPath();points.forEach((p,i)=>i?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}
   c.setLineDash([]);c.lineWidth=1;c.fillStyle=color;c.font='8px monospace';c.fillText(error?'位置不可用':'可建造 · 点击确认',b.x,b.y-v.height-8);
  }
  const garden=cfg.plans.find(p=>p.effect?.residents&&s.completed.some(q=>q.id===p.id));if(garden)for(let i=0;i<4;i++){const room=cfg.rooms.find(r=>r.id===garden.effectRoom),x=room.point.x-20+i*11,y=room.point.y-5;box(c,x,y,2,5,'#83a776');box(c,x-1,y-2,4,3,s.gardenStyle?'#e9c88e':'#c99ca5');}
  for(const event of [...s.interactionHistory.filter(e=>e.visitor&&e.resolvedAt+8>s.time),...s.interactions]){
   const pose=E.visitorPose(s,event);if(pose.gone||!visitorVisible(pose,selected,rect,camera.overlays))continue;
   const time=Math.floor(s.time*(pose.phase==='walk'?8:5))/(pose.phase==='walk'?8:5);
   pet(c,visitorStyle(event),pose,time);
   if(pose.arrived){box(c,pose.x-4,pose.y-22+Math.floor(time*5)%2,8,5,'#eee0b7');box(c,pose.x-1,pose.y-20,2,2,'#405b48');}
  }
  // Local lights have fixed positions and are evaluated from completed fixtures.
  for(const p of ordered.filter(p=>p.kind==='lamp')){c.globalAlpha=.12;box(c,p.x-9,p.y,30,22,'#ffd997');c.globalAlpha=1;part(c,p,s.objects[p.id],s.time);}
  const build=s.pets.find(p=>['install','dismantle','reuse','move'].includes(p.action?.type));
  const workPart=build&&cfg.parts.find(p=>p.id===build.action.part);
  if(workPart){
   const pos=s.objects[workPart.id];
   if(visible(pos)){
    c.strokeStyle=build.action.type==='dismantle'?'#d7957a':'#e6c888';c.setLineDash([2,2]);c.strokeRect(pos.x-.5,pos.y-.5,17,17);c.setLineDash([]);
    if(build.action.type==='install'&&E.actionPoint(s,build,cfg).hammer){c.globalAlpha=.5;part(c,workPart,pos,s.time);c.globalAlpha=1;}
   }
  }
  const hasPublicSpace=cfg.rooms.some(r=>r.activity&&s.completed.some(q=>cfg.plans.find(p=>p.id===q.id)?.slot===r.id));
  if(hasPublicSpace||s.project?.disabled){
   const origin=cfg.plans.find(p=>p.mode==='refit'&&s.completed.some(q=>q.id===p.id));
   for(const r of cfg.rooms.filter(r=>visible({room:r.id})&&E.roomReady(s,r.id,cfg))){
    const closed=s.project?.disabled&&s.project.affected.includes(r.id);
    const name=r.id===origin?.targetRoom?'老屋 · 木作所':r.name.split(' · ')[0];
    if(closed)caption(c,name+' · 施工停用',r.point.x,r.point.y-43,'#654b36');
    else if(hasPublicSpace&&(r.activity||r.id===origin?.targetRoom))caption(c,name,r.point.x,r.point.y-43);
   }
  }
  for(const petState of s.pets){
   if(!petState.arrived)continue;
   const def=cfg.pets.find(p=>p.id===petState.id),pose=E.actionPoint(s,petState,cfg);
   if(selected.yRange&&(pose.y<selected.yRange[0]||pose.y>selected.yRange[1]))continue;
   pet(c,def,pose,Math.floor(s.time*8)/8);
   const a=petState.action;
   let label;
   if(pose.waitingFor)label='等'+cfg.rooms.find(r=>r.id===pose.waitingFor).name.split(' · ')[0]+'复工';
   else if(a?.type==='public-use'&&a.visited&&a.elapsed<a.workEnd)label=cfg.rooms.find(r=>r.id===a.room).activity.label;
   else if(pose.phase==='work')label=cfg.recipes.find(r=>r.id===a.recipe).name;
   else if(a?.type==='install'&&(pose.hammer||pose.phase==='reveal'))label='安装'+(names[workPart.kind]||'构件');
   else if(pose.hammer)label={dismantle:'拆解回收',move:'搬出家具',reuse:'安置家具'}[a.type];
   // Idle residents wait beside the supplies, below the visitor interaction buttons.
   if(label)caption(c,def.name+' · '+label,pose.x,pose.y+(pose.phase==='rest'?30:-21));
  }
  if(selected.overview){c.font='7px monospace';c.fillStyle='#c3c4ac';c.fillText('营地',44,288);c.fillText('木石料垛',92,288);}
  c.restore();canvas.dataset.level=selected.id;canvas.dataset.installed=String(ordered.length);
 }
 function blueprint(canvas,s,diff){
  const ctx=canvas.getContext('2d'),cfg=diff.config,ids=new Set([...diff.added,...diff.removed,...diff.retained]),defs=cfg.parts.filter(p=>ids.has(p.id)&&(diff.added.includes(p.id)||diff.removed.includes(p.id)||p.room===diff.plan.targetRoom||diff.plan.disable.includes(p.room))),xs=defs.map(p=>p.x),ys=defs.map(p=>p.y),left=Math.min(...xs)-24,top=Math.min(...ys)-16,width=Math.max(...xs)-left+48,height=Math.max(...ys)-top+48,scale=Math.min(canvas.width/width,canvas.height/height);
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle='#243b44';ctx.fillRect(0,0,canvas.width,canvas.height);ctx.save();ctx.translate((canvas.width-width*scale)/2,(canvas.height-height*scale)/2);ctx.scale(scale,scale);ctx.translate(-left,-top);ctx.imageSmoothingEnabled=false;
  for(const p of defs.sort((a,b)=>(a.layer??2)-(b.layer??2))){const removed=diff.removed.includes(p.id),added=diff.added.includes(p.id);ctx.globalAlpha=removed?.4:added?1:.4;part(ctx,p,p,0);if(removed||added){ctx.strokeStyle=removed?'#ff947d':p.connection?'#e7c376':'#8fd1bd';ctx.strokeRect(p.x,p.y,16,16);}}ctx.restore();ctx.globalAlpha=1;
 }
 function preview(canvas,s,cfg,id,choice){const diff=root.TownGrowthEngine.preview(s,cfg,id,choice);if(diff)blueprint(canvas,s,diff);}
 root.TownGrowthRenderer={draw,part,names,viewRect,focalBuilding,visitorPortrait,visitorVisible,preview,blueprint};
})(globalThis);
