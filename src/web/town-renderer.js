/* Code-native pixel components. Every visible building cell is a real object. */
(function(root){
 'use strict';
 const box=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
 function polygon(c,pts,color){c.fillStyle=color;c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
 const names={floor:'地基／楼板',post:'承重柱',beam:'横梁',wall:'木墙',window:'窗墙',door:'出入口',roof:'屋顶',stairs:'外楼梯',partition:'隔断',furniture:'家具',sign:'招牌',drying:'晾晒架',quilt:'床品',curtain:'窗帘',lamp:'灯'};
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
 function part(c,p,o,time){const {x,y}=o,st=p.style;
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
 function pet(c,def,pose,time){const x=Math.round(pose.x),y=Math.round(pose.y),step=['walk','carry','climb','deliver','fetch'].includes(pose.phase)?Math.round(Math.sin(time*14)):0;
  box(c,x-5,y-2,10,2,'#213b35');box(c,x-4,y-9,8,8,def.color);box(c,x-5,y-12,10,6,def.color);
  if(def.species==='bunny'){box(c,x-4,y-16,3,5,def.color);box(c,x+2,y-16,3,5,def.color);box(c,x-3,y-15,1,3,'#ae837b');}
  else{polygon(c,[[x-5,y-10],[x-5,y-16],[x-1,y-12]],def.color);polygon(c,[[x+1,y-12],[x+5,y-16],[x+5,y-10]],def.color);}
  box(c,x-2,y-10,1,1,'#34312d');box(c,x+2,y-10,1,1,'#34312d');box(c,x-2,y-7,5,2,'#e2cfad');box(c,x-3,y-2+step,2,2,'#aa8e72');box(c,x+2,y-2-step,2,2,'#aa8e72');
  box(c,x-3,y-5,6,3,def.species==='fox'?'#697e74':def.species==='cat'?'#9a7d87':'#708d92');
  if(pose.held==='W')root.TownPetWorkArt?.timberOverlay(c,{log:{x:x+5,y:y-5,length:12,diameter:4}},time);
  else if(pose.held)box(c,x+3,y-7,6,5,pose.held==='S'?'#8d9b96':pose.held==='C'?'#bc9b94':'#e0dec5');
  if(pose.hammer){const dy=Math.floor(time*7)%2*3;box(c,x+7,y-13+dy,2,8,'#b08d62');box(c,x+5,y-14+dy,7,3,'#a3b4ab');}
 }
 function draw(canvas,s,cfg,level='all'){
  const c=canvas.getContext('2d'),E=root.TownGrowthEngine,v=cfg.view,selected=v.levels.find(l=>l.id===level)||v.levels[0],rect=selected.rect;
  c.imageSmoothingEnabled=false;c.clearRect(0,0,canvas.width,canvas.height);c.save();c.scale(canvas.width/rect[2],canvas.height/rect[3]);c.translate(-rect[0],-rect[1]);
  box(c,0,0,480,304,v.palette.sky);box(c,0,185,480,87,v.palette.haze);
  for(let i=0;i<21;i++)tree(c,i*29-15,265,38+(i%5)*9,s.time);
  box(c,0,272,480,32,v.palette.ground);box(c,0,272,480,2,'#72836a');for(let i=0;i<90;i++)box(c,(i*37)%480,276+(i*11)%24,3,1,i%2?'#405747':'#4a6350');
  // Permanent camp and short forest paths are scenery, never an instant finished house.
  polygon(c,[[34,270],[60,240],[85,270]],'#a28f6d');polygon(c,[[60,240],[60,270],[78,270]],'#716c56');box(c,56,258,9,14,'#39463a');
  for(let i=0;i<4;i++)box(c,90+i*21,274,14,2,'#9d967c');
  box(c,445,261,17,11,'#7e8d85');box(c,449,258,9,5,'#9aa69b');
  const stock=E.inventory(s,cfg);for(let j=0;j<Math.min(5,Math.ceil(stock.W/8));j++){box(c,96,268-j*3,16,3,'#8d684b');box(c,97,268-j*3,3,2,'#caa575');}
  for(const group of cfg.groups.filter(g=>s.furniture[g.id].status==='parked')){const i=cfg.groups.indexOf(group);for(const pid of group.parts){const p=cfg.parts.find(p=>p.id===pid);part(c,p,{x:18+(i%3)*32+p.art.index*16,y:284},s.time);}}
  const visible=o=>!selected.rooms||selected.rooms.includes(o.room);
  const ordered=cfg.parts.filter(p=>s.objects[p.id].status==='installed'&&visible(s.objects[p.id])).sort((a,b)=>(a.layer??2)-(b.layer??2)||a.y-b.y);
  for(const p of ordered){const o=s.objects[p.id];c.globalAlpha=E.roomAvailable(s,o.room,cfg)?1:.55;part(c,p,o,s.time);}c.globalAlpha=1;
  // Local lights have fixed positions and are evaluated from completed fixtures.
  for(const p of ordered.filter(p=>p.kind==='lamp')){c.globalAlpha=.12;box(c,p.x-9,p.y,30,22,'#ffd997');c.globalAlpha=1;part(c,p,s.objects[p.id],s.time);}
  const build=s.pets.find(p=>['install','dismantle','reuse','move'].includes(p.action?.type));
  if(build){const a=build.action,p=cfg.parts.find(p=>p.id===a.part),pos=p&&s.objects[p.id];if(pos&&visible(pos)){c.strokeStyle=a.type==='dismantle'?'#d7957a':'#e6c888';c.setLineDash([2,2]);c.strokeRect(pos.x-.5,pos.y-.5,17,17);c.setLineDash([]);if(a.type==='install'){const pose=E.actionPoint(s,build,cfg);if(pose.hammer){c.globalAlpha=.5;part(c,p,pos,s.time);c.globalAlpha=1;}}}}
  for(const petState of s.pets){if(!petState.arrived)continue;const def=cfg.pets.find(p=>p.id===petState.id),pose=E.actionPoint(s,petState,cfg);if(!selected.yRange||pose.y>=selected.yRange[0]&&pose.y<=selected.yRange[1])pet(c,def,pose,s.time);}
  if(selected.overview){c.font='7px monospace';c.fillStyle='#c3c4ac';c.fillText('营地',44,288);c.fillText('木石料垛',92,288);}
  c.restore();canvas.dataset.level=selected.id;canvas.dataset.installed=String(ordered.length);
 }
 root.TownGrowthRenderer={draw,part,names};
})(globalThis);
