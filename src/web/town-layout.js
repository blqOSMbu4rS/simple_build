/* Finite adjacency templates, exact local transforms and locked construction differences. */
(function(root){
 'use strict';
 const clone=v=>JSON.parse(JSON.stringify(v)),id=(a,b)=>a+'/'+b;
 const overlap=(a,b)=>a[0]<b[0]+b[2]-.01&&a[0]+a[2]>b[0]+.01&&a[1]<b[1]+b[3]-.01&&a[1]+a[3]>b[1]+.01;
 const hash=t=>{let n=2166136261;for(const ch of t)n=Math.imul(n^ch.charCodeAt(0),16777619);return n>>>0;};
 const variant=(c,b)=>c.templates.find(t=>t.id===b.template)?.variants.find(v=>v.id===b.variant);
 function descriptors(c,s){return c.slots.map(slot=>s?.buildings.find(b=>b.id===slot.id)||{id:slot.id,template:slot.template,variant:c.templates.find(t=>t.id===slot.template).variants[0].id,x:slot.id===c.root.slot?c.root.x:0,y:256});}
 const body=(c,b)=>{const v=variant(c,b);return [b.x,b.y-v.height,v.width,v.height];};
 const occupied=(c,b)=>{const v=variant(c,b),rects=[{kind:'body',rect:body(c,b)}];if(b.y<256&&b.connection?.type!=='upper')rects.push({kind:'support',rect:[b.x,b.y,v.width,256-b.y]});if(b.connection){rects.push({kind:'connection',rect:b.connection.space});const co=b.connection;if(co.type!=='side'){const start=co.type==='upper'?co.route[1]:co.from,count=co.gap/16,x=Math.min(start.x,start.x+(co.to.x-start.x)/count);rects.push({kind:'connection',rect:[x,256,16,8]});}}return rects;};
 function connection(c,parent,port,v,type,gap){
  const pv=variant(c,parent),right=port.side==='right',sign=right?1:-1,rise=c.connections[type].rise;
  const x=type==='upper'?(right?parent.x+pv.width-v.width:parent.x):right?parent.x+pv.width+gap:parent.x-gap-v.width;
  const y=type==='step'?parent.y===256?240:256:parent.y-rise;
  const from={x:parent.x+port.x,y:parent.y},to={x:type==='upper'?parent.x+port.x:right?x:x+v.width,y};
  const outer=type==='upper'?from.x+sign*gap:to.x,low=type==='upper'?from:parent.y>y?from:to,high=parent.y>y?to:from;
  const route=type==='upper'?[from,{x:outer,y:from.y},to]:[from,to];
  const space=type==='upper'?[Math.min(from.x,outer),y-32,gap,256-y+32]:[Math.min(from.x,to.x),Math.min(parent.y,y)-32,gap,Math.abs(parent.y-y)+40];
  return {x,y,connection:{id:id(parent.id,port.id),parent:parent.id,port:port.id,targetPort:type==='upper'?port.id:v.ports.find(p=>p.side!==port.side).id,type,gap,reuseEntry:parent.id===c.root.slot&&port.id===pv.ports[0].id,rise:Math.abs(parent.y-y),from,to,route,space,low,high}};
 }
 function placementError(c,s,b,{reserve=true}={}){
  const v=variant(c,b);if(!v)return '建筑尺寸不存在';
  if(![256,240,192].includes(b.y)||!Number.isInteger(b.x/16))return '不支持的标高或施工网格';
  if(b.id===c.root.slot)return b.x===c.root.x&&b.y===c.root.y?null:'首栋起建位不匹配';
  const co=b.connection,parent=s.buildings.find(p=>p.id===co?.parent),pv=parent&&variant(c,parent),port=pv?.ports.find(p=>p.id===co?.port);
  if(!parent||!port||!port.types.includes(co.type))return '没有匹配的连接位';
  if(!c.connections[co.type]?.gaps.includes(co.gap))return '连接跨度超限';
  const exact=connection(c,parent,port,v,co.type,co.gap);
  if(JSON.stringify({...b.connection})!==JSON.stringify(exact.connection)||b.x!==exact.x||b.y!==exact.y)return '入口标高或连接方案不匹配';
  if(s.buildings.some(other=>other.id!==b.id&&other.connection?.parent===parent.id&&other.connection.port===port.id))return '连接位已使用';
  if(co.type==='upper'&&(!pv.allowsUpper||parent.y!==256||b.x<parent.x+pv.bearing[0]||b.x+v.width>parent.x+pv.bearing[1]))return '上接承托范围不足';
  if(co.type==='step'&&![240,256].includes(parent.y))return '不支持此楼梯高差';
  if(co.type==='side'&&b.y!==parent.y)return '侧接入口标高不一致';
  const rects=occupied(c,b);
  for(const other of s.buildings.filter(o=>o.id!==b.id)){
   for(const a of rects)for(const z of occupied(c,other)){
    if(a.kind==='connection'&&other.id===parent.id||z.kind==='connection'&&other.id===parent.id&&co.type==='upper')continue;
    if(overlap(a.rect,z.rect))return a.kind==='connection'||z.kind==='connection'?'楼梯、门口或公共通路空间不足':'建筑或承托穿入已有实体';
   }
   // Eaves are image bounds, not an opaque rectangle: only their narrow roof strip is protected.
   const ov=variant(c,other),eave=[other.x-2,other.y-64,ov.width+4,4];
   if(other.id!==parent.id&&rects.some(a=>overlap(a.rect,eave)))return '占用受保护屋檐';
  }
  const protectedSites=[[24,240,104,40],...c.recipes.filter(r=>r.point).map(r=>[r.point.x-8,r.point.y-16,16,24])];
  if(rects.some(a=>protectedSites.some(r=>overlap(a.rect,r))))return '占用营地、资源作业点或关键交互位置';
  if(b.y<256&&co.type!=='upper'&&![16,64].includes(256-b.y))return '地基支撑不足';
  if(reserve){
   const future=[...s.buildings.filter(o=>o.id!==b.id),b],next={...s,buildings:future};
   for(const slot of c.slots.filter(slot=>c.plans.some(p=>p.base&&p.mode==='build'&&p.slot===slot.id)&&!future.some(p=>p.id===slot.id))){
    const t=c.templates.find(t=>t.id===slot.template);if(!rawCandidates(c,next,slot.id,t.variants,{reserve:false,future:true}).length)return '将堵住基础住宅或纺织间的必要位置';
   }
  }
  return null;
 }
 function rawCandidates(c,s,slotId,versions,opts={}){
  const slot=c.slots.find(slot=>slot.id===slotId),out=[];
  for(const parent of s.buildings.filter(b=>opts.future||s.completed.some(done=>c.plans.find(p=>p.id===done.id)?.slot===b.id)))for(const port of variant(c,parent).ports.filter(port=>port.id!==parent.connection?.targetPort))for(const type of port.types.filter(type=>!(parent.id===c.root.slot&&port===variant(c,parent).ports[0]&&type==='step')))for(const gap of c.connections[type].gaps)for(const v of versions){
   const b={id:slot.id,template:slot.template,variant:v.id,...connection(c,parent,port,v,type,gap)};
   const error=placementError(c,s,b,opts);if(!error)out.push(b);
  }return out;
 }
 function candidates(c,s,planId){
  const plan=c.plans.find(p=>p.id===planId);if(!plan||plan.mode!=='build'||plan.slot===c.root.slot)return [];
  if(s.buildings.some(b=>b.id===plan.slot))return [];
  const slot=c.slots.find(slot=>slot.id===plan.slot),t=c.templates.find(t=>t.id===slot.template),all=rawCandidates(c,s,slot.id,t.variants),locations=new Map();
  for(const b of all){const key=[b.connection.parent,b.connection.port,b.connection.type,b.connection.gap].join(':');if(!locations.has(key))locations.set(key,[]);locations.get(key).push(b);}
  const signature=JSON.stringify(s.buildings.map(b=>[b.id,b.x,b.y,b.variant,b.connection]));
  return [...locations].map(([key,versions])=>({id:key,rank:hash(s.layout.seed+'|'+signature+'|'+key),versions})).sort((a,b)=>a.rank-b.rank||a.id.localeCompare(b.id)).slice(0,3);
 }
 function compile(base,s,pending=null){
  if(base.compiled)return base;const c=clone(base);c.compiled=true;c.source=base;c.parts=[];c.groups=[];c.beds=clone(base.campBeds);c.rooms=[clone(base.camp)];c.bonus=[];
  const ds=descriptors(base,s);if(pending){const at=ds.findIndex(b=>b.id===pending.id);ds[at]=clone(pending);}c.instances=ds;
  const partMap=new Map(),meta=new Map();
  const add=p=>{c.parts.push(p);partMap.set(p.id,p);return p.id;};
  const tasks=ids=>ids.map(target=>({type:'install',target}));
  for(const b of ds){const v=variant(base,b),pid=n=>id(b.id,n),point=p=>({x:p.x+b.x,y:p.y+b.y});
   const supports=[];
   if(b.y<256&&b.connection?.type!=='upper')for(let y=256;y>b.y;y-=16)for(const x of [0,v.width-16])supports.push(add({id:pid('pier-'+x+'-'+y),room:b.id,x:b.x+x,y:y-16,kind:'post',cost:{S:1},seconds:1.4,style:v.parts[0].style,pixelRatio:30/16,grounded:y===256,supports:y===256?[]:supports.slice(-2),connection:true}));
   const parent=b.connection&&ds.find(o=>o.id===b.connection.parent),pv=parent&&variant(base,parent);
   for(const p of v.parts){const q={...clone(p),id:pid(p.id),room:b.id,...point(p),supports:p.supports.map(pid),instance:b.id};if(p.group)q.group=pid(p.group);
    if(v.floor.includes(p.id)&&b.y<256){q.grounded=false;q.cost={W:1};q.supports=b.connection?.type==='upper'?pv.beam.map(n=>id(parent.id,n)):supports.slice(-2);}add(q);}
   for(const g of v.groups)c.groups.push({...clone(g),id:pid(g.id),room:b.id,parts:g.parts.map(pid)});
   for(const bed of v.beds)c.beds.push({...clone(bed),id:pid(bed.id),room:b.id,group:pid(bed.group),point:point(bed.point)});
   const connParts=[],reusedLinks=[],co=b.connection,entry=co?v.ports.find(p=>p.id===co.targetPort):v.ports[0];
   if(co){
    const count=co.gap/16;
    let baseSupport=null;if(co.type!=='side')baseSupport=add({id:pid('stair-footing'),room:b.id,x:Math.min((co.type==='upper'?co.route[1]:co.from).x,(co.type==='upper'?co.route[1]:co.from).x+(co.to.x-(co.type==='upper'?co.route[1]:co.from).x)/count),y:256,kind:'floor',cost:{S:1},seconds:1.4,grounded:true,supports:[],style:v.parts[0].style,pixelRatio:30/16,connection:true});
    if(baseSupport)connParts.push(baseSupport);
    for(let i=0;i<count;i++){
     const f=(i+1)/count,from=co.type==='upper'?co.route[1]:co.from,to=co.to;
     const x=from.x+(to.x-from.x)*f,y=from.y+(to.y-from.y)*f,previousY=from.y+(to.y-from.y)*i/count;
     if(co.reuseEntry&&co.type==='side'&&x===co.from.x-16&&y===co.from.y){const shared=id(parent.id,'approach');connParts.push(shared);reusedLinks.push(shared);continue;}
     connParts.push(add({id:pid('link-'+i),room:b.id,x:Math.min(x,from.x+(to.x-from.x)*(i/count)),y:Math.min(y,previousY),stairRise:Math.abs(y-previousY),stairUpRight:(to.x-from.x)*(to.y-from.y)<0,kind:co.type==='side'?'floor':'stairs',cost:{[co.type==='side'&&b.y===256?'S':'W']:1},seconds:1.4,grounded:co.type==='side'&&b.y===256,supports:co.type==='side'?(b.y===256?[]:i?[connParts.at(-1)]:pv.floor.map(n=>id(parent.id,n))):[connParts.at(-1)],style:v.parts[0].style,pixelRatio:30/16,connection:true}));
    }
   }else connParts.push(add({id:pid('approach'),room:b.id,x:b.x-16,y:b.y,stairRise:16,stairUpRight:true,kind:'stairs',cost:{S:1},seconds:1.4,grounded:true,supports:[],style:v.parts[0].style,pixelRatio:30/16,connection:true}));
   const door=add({id:pid('entry'),room:b.id,x:b.x+entry.x-8,y:b.y-32,kind:'door',cost:{W:1},seconds:1.4,supports:v.floor.map(pid),style:v.parts[0].style,pixelRatio:30/16,layer:6,connection:true});
   const room={id:b.id,name:base.templates.find(t=>t.id===b.template).name+' · '+(base.slots.filter(sl=>sl.template===b.template).findIndex(sl=>sl.id===b.id)+1),requirements:v.structural.map(pid),access:[...connParts,door],point:{x:b.x+v.width/2,y:b.y},instance:b.id,connection:co||null,entry:{x:b.x+entry.x,y:b.y}};c.rooms.push(room);
   meta.set(b.id,{b,v,pid,supports,connParts,reusedLinks,door,room,entry});
  }
  c.plans=base.plans.map(p=>{const q={...clone(p),tasks:[],disable:[],settle:[],unlock:[]};
   const target=s?.improvements?.[p.id]?.room||ds.find(b=>b.template===p.targetTemplate&&s?.buildings.some(x=>x.id===b.id))?.id||base.slots.find(sl=>sl.template===p.targetTemplate)?.id,m=meta.get(p.slot||target);
   q.targetRoom=m.b.id;
   if(p.mode==='build'){
    const {b,v,pid,connParts,reusedLinks,supports,door,entry}=m,entryCaps=entry.caps.map(pid),shell=v.parts.filter(part=>!entryCaps.includes(pid(part.id))).map(part=>pid(part.id));
    q.tasks=[...tasks(supports),...tasks(connParts.filter(n=>!reusedLinks.includes(n))),...tasks(shell)];
    const co=b.connection;
    if(co){const pm=meta.get(co.parent),port=pm.v.ports.find(port=>port.id===co.port);q.disable=co.reuseEntry&&co.type!=='upper'?[]:[pm.b.id];
     const removed=co.type==='upper'?pm.v.roof.filter(n=>{const o=partMap.get(pm.pid(n));return o.x>=b.x&&o.x<b.x+v.width;}).map(pm.pid):[];
     q.tasks.splice(supports.length+connParts.length,0,...removed.map(target=>({type:'dismantle',target,recover:1})));
     if(!co.reuseEntry)q.tasks.push(...port.caps.map(pm.pid).map(target=>({type:'dismantle',target,recover:1})));
     if(!co.reuseEntry)q.tasks.push(...tasks([add({id:pid('parent-door'),room:pm.b.id,x:co.from.x-8,y:co.from.y-32,kind:'door',cost:{W:1},seconds:1.4,supports:pm.v.floor.map(pm.pid),style:pm.v.parts[0].style,pixelRatio:30/16,layer:6,connection:true})]));
     if(removed.length)q.tasks.push(...tasks([add({id:pid('roof-edge'),room:pm.b.id,x:b.x,y:b.y-2,kind:'beam',cost:{W:1},seconds:1.4,supports:pm.v.beam.map(pm.pid),style:pm.v.parts[0].style,pixelRatio:30/16,layer:5,connection:true})]));
    }
    q.tasks.push(...tasks([door]));q.effect=base.templates.find(t=>t.id===b.template).effect;q.effectRoom=b.id;
    const first=base.plans.find(p=>p.mode==='build');
    if(p.id===first.id){q.settle=[{pet:base.pets.find(p=>p.capabilities.includes('woodwork')).id,bed:c.beds.find(bed=>bed.room===b.id).id}];q.unlock=base.pets.filter(p=>p.arrival===1).map(p=>p.id);}
    if(p.base&&base.templates.find(t=>t.id===b.template).variants[0].beds.length>=2)q.settle=base.pets.filter(p=>!p.capabilities.includes('build')).map((pet,i)=>({pet:pet.id,bed:c.beds.filter(bed=>bed.room===b.id)[i].id}));
    if(p.reuseTable){const source=ds.find(x=>variant(base,x).groups.some(g=>g.kind==='table')),sm=meta.get(source.id),g=sm.v.groups.find(g=>g.kind==='table');q.tasks.push({type:'reuse',target:sm.pid(g.id),room:b.id,positions:g.parts.map((_,i)=>({x:b.x+48+i*16,y:b.y-16})),supports:v.floor.map(pid)});}
   }else if(p.mode==='refit'){
    const {v,pid,b}=m;q.disable=[b.id];const move=v.groups.filter(g=>['bed','table'].includes(g.kind)),replace=v.groups.find(g=>g.capability==='wood-basic');
    const gid=pid('refit-saw'),newParts=Array.from({length:3},(_,i)=>add({id:pid('refit-saw-'+i),room:b.id,x:b.x+32+i*16,y:b.y-16,kind:'furniture',group:gid,art:{type:'saw',index:i,cols:3},cost:{W:1},seconds:1.4,supports:v.floor.map(pid),style:v.parts[0].style,pixelRatio:30/16,layer:4}));
    c.groups.push({id:gid,room:b.id,kind:'saw',label:'正式锯木台',capability:'wood-full',parts:newParts});
    q.tasks=[...move.map(g=>({type:'move',target:pid(g.id)})),...v.parts.filter(p=>p.kind==='partition'&&!v.ports.some(port=>port.caps.includes(p.id))).map((p,i)=>({type:'dismantle',target:pid(p.id),recover:0})),...replace.parts.map(n=>({type:'dismantle',target:pid(n),recover:1})),...tasks(newParts)];
   }else if(p.mode==='comfort'){
    const {v,b,pid}=m;q.disable=[b.id];const ids=[];
    for(const g of v.groups.filter(g=>g.kind==='bed')){const part=v.parts.find(part=>part.id===g.parts[0]);ids.push(add({id:pid('quilt-'+g.id),room:b.id,x:b.x+part.x,y:b.y+part.y,kind:'quilt',cost:{C:1},seconds:1.4,supports:g.parts.map(pid),style:part.style,pixelRatio:30/16,layer:7}));}
    for(const part of v.parts.filter(p=>p.kind==='window').slice(0,2))ids.push(add({id:pid('curtain-'+part.id),room:b.id,x:b.x+part.x,y:b.y+part.y,kind:'curtain',cost:{C:1},seconds:1.4,supports:[pid(part.id)],style:part.style,pixelRatio:30/16,layer:7}));
    ids.push(add({id:pid('comfort-lamp'),room:b.id,x:b.x+v.width-24,y:b.y-32,kind:'lamp',cost:{W:1},seconds:1.4,supports:v.floor.map(pid),style:v.parts[0].style,pixelRatio:30/16,layer:7}));q.tasks=tasks(ids);c.bonus.push({room:b.id,required:ids,multiplier:1.15});
    q.settle=clone(s?.improvements?.[p.id]?.settle||[]);
   }
   q.tasks.forEach((t,i)=>{t.id=id(q.id,'task-'+i);t.deps=i?[id(q.id,'task-'+(i-1))]:[];});return q;
  });return c;
 }
 const api={compile,candidates,placementError,variant,body,occupied,overlap,hash};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownLayout=api;
})(globalThis);
