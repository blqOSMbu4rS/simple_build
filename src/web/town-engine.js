/* Persistent, data-driven town simulation; old single-site saves never enter here. */
(function(root){
 'use strict';
 const node=typeof module!=='undefined'&&module.exports;
 const CONFIG=node?require('./town-config.js'):root.TownGrowthConfig;
 const MOT=node?require('./cutaway-motion.js'):root.TownCutawayMotion;
 const STEP=1/30,SAVE_KEY='desktop-build-town-idle-v1';
 const clone=v=>JSON.parse(JSON.stringify(v)),same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
 const index=new WeakMap();
 function data(c){if(!index.has(c))index.set(c,{parts:new Map(c.parts.map(p=>[p.id,p])),groups:new Map(c.groups.map(g=>[g.id,g])),rooms:new Map(c.rooms.map(r=>[r.id,r])),recipes:new Map(c.recipes.map(r=>[r.id,r])),beds:new Map(c.beds.map(b=>[b.id,b]))});return index.get(c);}
 const kinds=c=>Object.keys(c.materials),zero=c=>Object.fromEntries(kinds(c).map(k=>[k,0]));
 const requireRule=(ok,message)=>{if(!ok)throw Error(message);};
 function validateConfig(c){
  requireRule(c&&c.version===1&&Array.isArray(c.parts)&&c.parts.length>0,'未知城镇配置');
  for(const list of [c.parts,c.groups,c.rooms,c.beds,c.pets,c.recipes,c.plans])requireRule(new Set(list.map(p=>p.id)).size===list.length,'配置身份重复');
  const d=data(c),validCost=a=>a&&Object.entries(a).every(([k,n])=>k in c.materials&&Number.isInteger(n)&&n>=0);
  for(const k of kinds(c))requireRule(Number.isInteger(c.capacity[k])&&c.capacity[k]>=3&&Number.isInteger(c.initial[k])&&c.initial[k]>=0&&c.initial[k]<=c.capacity[k],'仓库配置错误');
  requireRule(c.pets.filter(p=>p.capabilities.includes('build')).length===1,'首版需要一位独立建造员');
  for(const p of c.parts)requireRule(d.rooms.has(p.room)&&validCost(p.cost)&&Object.values(p.cost).reduce((a,b)=>a+b,0)===1&&p.supports.every(id=>d.parts.has(id))&&[p.x,p.y,p.seconds].every(Number.isFinite)&&p.seconds>0,'施工格配置错误');
  for(const g of c.groups)requireRule(g.parts.length>0&&new Set(g.parts).size===g.parts.length&&g.parts.every(id=>d.parts.get(id)?.group===g.id),'家具组配置错误');
  for(const b of c.beds)requireRule(d.rooms.has(b.room)&&(!b.group||d.groups.has(b.group)),'床位配置错误');
  for(const r of c.recipes)requireRule(validCost(r.input)&&validCost(r.output)&&r.seconds>0&&Object.values(r.output).some(n=>n>0),'生产配方错误');
  const placed=new Set();
  const knownPlans=new Set();for(const p of c.plans){requireRule(Array.isArray(p.requires)&&p.requires.every(id=>knownPlans.has(id)),'工程前置配置错误');knownPlans.add(p.id);const done=new Set();for(const t of p.tasks){requireRule(t.deps.every(id=>done.has(id)),'工程依赖错误');done.add(t.id);
    requireRule(['install','dismantle','move','reuse'].includes(t.type),'未知拆装动作');
    if(t.type==='install'){const part=d.parts.get(t.target);requireRule(part&&!placed.has(part.id)&&part.supports.every(id=>placed.has(id))&&(part.grounded||part.supports.length>0),'安装支撑链错误');placed.add(part.id);}
    if(t.type==='dismantle'){requireRule(placed.has(t.target)&&![...placed].some(id=>id!==t.target&&d.parts.get(id).supports.includes(t.target)),'拆解破坏支撑链');placed.delete(t.target);}
    if(t.type==='move'||t.type==='reuse'){const g=d.groups.get(t.target);requireRule(g,'未知家具');for(const id of g.parts){requireRule(t.type==='move'?placed.has(id):!placed.has(id),'家具重复拆装');if(t.type==='move')placed.delete(id);else placed.add(id);}if(t.type==='reuse')requireRule(t.positions?.length===g.parts.length&&d.rooms.has(t.room),'复用位置错误');}
   }}
  return true;
 }
 function random(seed){return (Math.imul(seed,1664525)+1013904223)>>>0;}
 function layout(c,seed){let rng=random(Math.imul(seed^0x9e3779b9,0x85ebca6b));const next=()=>{rng=random(rng);return rng/4294967296;};
  const anchor=clone(c.anchors[Math.floor(next()*c.anchors.length)]),palette=Math.floor(next()*3),environment=[];
  for(let i=0;i<24;i++){const x=-180+i*36+Math.floor(next()*12),type=i%3===0?'stone':i%3===1?'grass':'tree';environment.push({x,y:type==='tree'?264:280+Math.floor(next()*12),type,size:35+Math.floor(next()*30)});}
  return {version:1,seed:seed>>>0,anchor,palette,environment};
 }
 function create(c=CONFIG.create(),seed=1){
  validateConfig(c);const z=()=>zero(c);
  const s={format:'town-idle',version:1,configVersion:c.version,scene:c.id,signature:JSON.stringify(c),layout:layout(c,seed),eventRng:random(seed^0x93ab12),nextEvent:Math.round(c.interactions.interval/STEP),nextInteraction:1,interactions:[],interactionHistory:[],assists:{},decorations:[],gardenStyle:0,queue:[],selection:null,queueWait:'',wallTime:0,lastOffline:null,ticks:0,time:0,remainder:0,paused:false,status:'running',multiplier:1,completed:[],project:null,nextMaterial:1,nextAction:1,
   objects:Object.fromEntries(c.parts.map(p=>[p.id,{id:p.id,status:'absent',x:p.x,y:p.y,room:p.room,supports:clone(p.supports),materials:[]}])) ,furniture:Object.fromEntries(c.groups.map(g=>[g.id,{id:g.id,status:'absent'}])),
   pets:c.pets.map(p=>({id:p.id,home:p.home||null,arrived:p.arrival===0,x:p.home?data(c).beds.get(p.home).point.x:136,y:272,action:null})),materials:[],
   ledger:{created:z(),consumed:z(),lost:z(),rewards:z(),submitted:z(),recipes:Object.fromEntries(c.recipes.map(r=>[r.id,{started:0,finished:0}]))},regrowth:Object.fromEntries(c.recipes.map(r=>[r.id,0])),gatherPriority:'auto',message:'先建一间小屋，让来访的小伙伴安家。',events:[]};
  for(const p of c.parts.filter(p=>p.plot))s.objects[p.id].x+=s.layout.anchor.x;
  for(const k of kinds(c))mint(s,k,c.initial[k],'stock',null,'initial');return s;
 }
 function note(s,text){if(s.message===text)return;s.message=text;s.events.unshift({time:s.time,text});s.events.length=Math.min(s.events.length,16);}
 function mint(s,kind,n,state,owner,source){const out=[];for(let i=0;i<n;i++){const m={id:s.nextMaterial++,kind,state,owner,source};s.materials.push(m);out.push(m.id);}s.ledger.created[kind]+=n;return out;}
 function inventory(s,c=CONFIG.create(),includeYard=true){const v=zero(c);for(const m of s.materials)if(m.state==='stock'||includeYard&&['yard','salvage'].includes(m.state))v[m.kind]++;return v;}
 // Explicit debug mutations keep real identities and accounting; normal production never calls this.
 function debugSetInventory(s,targets,c=CONFIG.create()){
  validate(s,c);requireRule(targets&&typeof targets==='object'&&!Array.isArray(targets)&&Object.keys(targets).length>0,'请选择要修改的材料');
  const stock=inventory(s,c,false);
  for(const [k,n]of Object.entries(targets)){
   requireRule(Object.hasOwn(c.materials,k)&&Number.isInteger(n)&&n>=0,'材料数量必须为非负整数');
   requireRule(n<=Math.max(0,capacity(s,c)[k]-reserved(s,k)),c.materials[k]+'数量超过可用仓位；请为在途批次保留空间');
  }
  if(Object.entries(targets).every(([k,n])=>stock[k]===n))return false;
  if(!s.ledger.debug)s.ledger.debug={added:zero(c),removed:zero(c)};
  for(const [k,n]of Object.entries(targets)){
   const delta=n-stock[k];
   if(delta>0){mint(s,k,delta,'stock',null,'debug');s.ledger.debug.added[k]+=delta;}
   if(delta<0){const ids=new Set(s.materials.filter(m=>m.kind===k&&m.state==='stock').slice(0,-delta).map(m=>m.id));s.materials=s.materials.filter(m=>!ids.has(m.id));s.ledger.debug.removed[k]+=-delta;}
  }
  note(s,'Debug 已修改仓内材料；施工、家具和在途材料保持不变。');validate(s,c);return true;
 }
 const placed=(s,id)=>s.objects[id]?.status==='installed';
 const completed=(s,id)=>s.completed.some(p=>p.id===id);
 function currentPlan(s,c=CONFIG.create()){return c.plans.find(p=>p.id===s.project?.plan)||c.plans.find(p=>p.id===s.queue[0])||c.plans.find(p=>p.base&&!completed(s,p.id));}
 function capacity(s,c=CONFIG.create()){const out=clone(c.capacity);for(const p of activeEffects(s,c))if(p.effect.capacity)for(const k of kinds(c))out[k]=c.capacity[k]*p.effect.capacity;return out;}
 function activeEffects(s,c){return c.plans.filter(p=>p.effect&&completed(s,p.id)&&roomAvailable(s,p.plotRoom,c));}
 function roomReady(s,id,c){const r=data(c).rooms.get(id);return !!r&&(r.initial||r.requirements.every(p=>placed(s,p))&&r.access.every(p=>placed(s,p)));}
 const disabled=(s,id)=>!!s.project?.disabled&&s.project.affected.includes(id);
 const roomAvailable=(s,id,c)=>roomReady(s,id,c)&&!disabled(s,id);
 function groupReady(s,g){return s.furniture[g.id]?.status==='installed'&&g.parts.every(id=>placed(s,id));}
 function bedAvailable(s,b,c){return roomAvailable(s,b.room,c)&&(!b.group||groupReady(s,data(c).groups.get(b.group)));}
 function comfort(s,pet,c){const b=data(c).beds.get(pet.home);return b&&b.room===c.bonus.room&&bedAvailable(s,b,c)&&c.bonus.required.every(id=>placed(s,id))?c.bonus.multiplier:1;}
 function efficiency(s,pet,r,c){let bonus=comfort(s,pet,c)-1;for(const p of activeEffects(s,c))if(p.effect.residents&&pet.home&&bedAvailable(s,data(c).beds.get(pet.home),c)||p.effect.capability===r.capability)bonus+=p.effect.efficiency||0;return 1+bonus;}
 function reserved(s,k,except=null){return s.pets.reduce((n,p)=>n+(p.action&&p.action!==except&&!p.action.salvage?(p.action.output?.[k]||0):0),0);}
 function fits(s,output,c,except=null){const stock=inventory(s,c,false),cap=capacity(s,c);return Object.entries(output).every(([k,n])=>stock[k]+reserved(s,k,except)+n<=cap[k]);}
 function claim(s,cost,state,owner,c){const stock=inventory(s,c);if(Object.entries(cost).some(([k,n])=>stock[k]<n))return null;const ids=[];for(const [k,n]of Object.entries(cost)){const list=s.materials.filter(m=>m.kind===k&&['stock','yard','salvage'].includes(m.state)).slice(0,n);for(const m of list){m.state=state;m.owner=owner;ids.push(m.id);}}return ids;}
 function retire(s,ids,field){const set=new Set(ids);s.materials=s.materials.filter(m=>{if(!set.has(m.id))return true;s.ledger[field][m.kind]++;return false;});}
 function allocate(s,pet,type,extra){pet.action={id:'action-'+s.nextAction++,type,elapsed:0,elapsedTicks:0,from:{x:pet.x,y:pet.y},...extra};return pet.action;}
 function relocation(s,pet,bed,c){if(pet.home===bed)return true;const b=data(c).beds.get(bed);if(!pet.arrived||!b||!bedAvailable(s,b,c)||s.pets.some(p=>p!==pet&&(p.home===bed||p.action?.bed===bed))||b.permanent&&!c.pets.find(p=>p.id===pet.id).capabilities.includes('build'))return false;
  if(pet.action)return false;allocate(s,pet,'relocate',{bed,total:3,target:clone(b.point),output:{}});return true;
 }
 function assignHome(s,petId,bed,c=CONFIG.create()){const pet=s.pets.find(p=>p.id===petId);if(s.paused||s.project)return false;return !!pet&&relocation(s,pet,bed,c);}
 function preflight(s,p,c,choices={}){
  const affected=new Set(p.disable),occupied=new Set(s.pets.map(p=>p.home).filter(Boolean)),moves=[];
  for(const pet of s.pets){const old=data(c).beds.get(pet.home);if(!old||!affected.has(old.room))continue;
   const b=c.beds.find(b=>(!choices[pet.id]||b.id===choices[pet.id])&&!affected.has(b.room)&&!b.permanent&&!occupied.has(b.id)&&bedAvailable(s,b,c));
   if(!b)return {error:'没有可接收的床位；请先腾出正式床位或营地临时铺位。'};occupied.add(b.id);moves.push({pet:pet.id,bed:b.id});
  }
  let stored=Object.values(s.furniture).filter(g=>g.status==='stored').length;
  for(const t of p.tasks){if(t.type==='move')stored++;if(t.type==='reuse'&&s.furniture[t.target].status!=='parked')stored--;if(stored>c.furnitureCapacity)return {error:'家具接收空间不足；先将库存家具安置到营地。'};}
  return {moves};
 }
 function preview(s,c=CONFIG.create(),planId=null){
  const p=planId?c.plans.find(p=>p.id===planId):currentPlan(s,c);if(!p)return null;
  const changed=new Set(p.tasks.flatMap(t=>data(c).groups.has(t.target)?data(c).groups.get(t.target).parts:[t.target]));
  const retained=c.parts.filter(p=>placed(s,p.id)&&!changed.has(p.id)).map(p=>p.id),cost=zero(c),recovery=zero(c);
  for(const t of p.tasks){if(t.type==='install')for(const[k,n]of Object.entries(data(c).parts.get(t.target).cost))cost[k]+=n;if(t.type==='dismantle')for(const k of Object.keys(data(c).parts.get(t.target).cost))recovery[k]+=t.recover||0;}
  return {plan:p,retained,moved:p.tasks.filter(t=>t.type==='move').map(t=>t.target),removed:p.tasks.filter(t=>t.type==='dismantle').map(t=>t.target),added:p.tasks.filter(t=>t.type==='install').map(t=>t.target),reused:p.tasks.filter(t=>t.type==='reuse').map(t=>t.target),cost,recovery,...preflight(s,p,c)};
 }
 function startProject(s,c=CONFIG.create(),choices={},planId=null){
  if(s.project||s.paused)return false;const p=planId?c.plans.find(p=>p.id===planId):currentPlan(s,c);if(!p||completed(s,p.id)||!p.requires.every(id=>completed(s,id))||p.choiceGroup&&s.selection!==p.id)return false;const check=preflight(s,p,c,choices);if(check.error){note(s,check.error);s.queueWait=check.error;return false;}
  s.queue=s.queue.filter(id=>id!==p.id);s.queueWait='';
  s.project={plan:p.id,phase:'preparing',at:0,locked:false,disabled:false,affected:clone(p.disable),moves:check.moves,oldHomes:s.pets.map(p=>({pet:p.id,home:p.home})),consumed:zero(c),sources:{},startedAt:s.time};
  note(s,'安排临时住处'+(check.moves.length?'：'+check.moves.map(m=>c.pets.find(p=>p.id===m.pet).name+' → '+data(c).rooms.get(data(c).beds.get(m.bed).room).name).join('、'):'')+'，等待受影响空间中的生产批次交付。');return true;
 }
 function cancelProject(s,c=CONFIG.create()){const p=s.project;if(!p||p.locked)return false;if(!queueValid({...s,project:null},s.queue,c)){note(s,'后续待办依赖当前工程，请先移除相关待办。');return false;}for(const old of p.oldHomes){const pet=s.pets.find(p=>p.id===old.pet);if(pet.action?.type==='relocate'){pet.action=null;pet.x=64;pet.y=272;}pet.home=old.home;}s.project=null;note(s,'已取消，住处与设施恢复原安排。');return true;}
 function queueValid(s,ids,c){const done=new Set(s.completed.map(p=>p.id));if(s.project)done.add(s.project.plan);if(ids.length>3||new Set(ids).size!==ids.length)return false;
  for(const id of ids){const p=c.plans.find(p=>p.id===id);if(!p||done.has(id)||!p.requires.every(id=>done.has(id))||p.choiceGroup&&s.selection!==id)return false;done.add(id);}return true;
 }
 function enqueue(s,id,c=CONFIG.create()){if(!queueValid(s,[...s.queue,id],c))return false;s.queue.push(id);return true;}
 function reorderQueue(s,ids,c=CONFIG.create()){if(ids.length!==s.queue.length||!ids.every(id=>s.queue.includes(id))||!queueValid(s,ids,c))return false;s.queue=clone(ids);return true;}
 function removeQueued(s,id,c=CONFIG.create()){const ids=s.queue.filter(p=>p!==id);if(ids.length===s.queue.length||!queueValid(s,ids,c))return false;s.queue=ids;return true;}
 function choose(s,id,c=CONFIG.create()){
  const existing=c.plans.find(p=>p.id===s.selection);if(existing&&completed(s,existing.id))return false;if(existing&&s.project?.plan===existing.id){if(s.project.locked||!cancelProject(s,c))return false;}
  if(id!==null){const p=c.plans.find(p=>p.id===id);if(!p?.choiceGroup||!c.plans.filter(p=>p.base).every(p=>completed(s,p.id)))return false;}
  s.queue=s.queue.filter(p=>p!==s.selection);s.selection=id;return true;
 }
 function cycleGarden(s,c=CONFIG.create()){if(!activeEffects(s,c).some(p=>p.effect.residents))return false;s.gardenStyle=1-s.gardenStyle;return true;}
 function parkFurniture(s,id,c=CONFIG.create()){const g=s.furniture[id];if(s.paused||s.project||g?.status!=='stored')return false;g.status='parked';return true;}
 function stow(s,kind,c=CONFIG.create()){
  if(s.paused)return false;const room=c.yardCapacity-s.materials.filter(m=>m.state==='yard').length,list=s.materials.filter(m=>m.kind===kind&&m.state==='stock').slice(0,Math.min(room,4));
  for(const m of list)m.state='yard';if(list.length)note(s,'材料转存营地料垛，仍可供施工与加工使用。');return !!list.length;
 }
 function facility(s,r,c){if(!r.facility)return {point:r.point,room:null};const g=c.groups.find(g=>g.capability===r.facility&&groupReady(s,g)&&roomAvailable(s,s.objects[g.parts[0]].room,c));if(!g)return null;const o=s.objects[g.parts[0]];return {id:g.id,room:o.room,point:{x:o.x+8,y:o.y+16}};}
 function beginRecipe(s,pet,r,c){
  const def=c.pets.find(p=>p.id===pet.id),fac=facility(s,r,c);if(!pet.arrived||!def.capabilities.includes(r.capability)||!fac||r.facility&&!pet.home||s.project?.phase==='preparing'&&s.project.affected.includes(fac.room)||s.regrowth[r.id]>0)return false;
  if(fac.id&&s.pets.some(p=>p.action?.facility===fac.id)||!fits(s,r.output,c))return false;
  const inv=inventory(s,c);if(r.buffer&&Object.entries(r.output).every(([k,n])=>inv[k]+reserved(s,k)>=Math.min(capacity(s,c)[k],r.buffer*(capacity(s,c)[k]/c.capacity[k]))))return false;
  if(Object.entries(r.input).some(([k,n])=>inv[k]<n))return false;
  const assistance=(s.assists[r.capability]||0)>0?c.interactions.assistEfficiency:0,rate=efficiency(s,pet,r,c)+assistance;
  const a=allocate(s,pet,'production',{recipe:r.id,facility:fac.id||null,room:fac.room,output:clone(r.output),target:clone(fac.point),efficiency:rate,assisted:!!assistance,total:r.seconds/rate+4,workEnd:r.seconds/rate+2,minted:false,materials:[]});
  if(assistance)s.assists[r.capability]--;
  const ids=claim(s,r.input,'processing',a.id,c);retire(s,ids,'consumed');s.ledger.recipes[r.id].started++;return true;
 }
 function along(points,t){const lengths=points.slice(1).map((p,i)=>Math.hypot(p.x-points[i].x,p.y-points[i].y)),total=lengths.reduce((a,b)=>a+b,0);let left=t*total;for(let i=0;i<lengths.length;i++){if(left<=lengths[i]||i===lengths.length-1){const f=lengths[i]?left/lengths[i]:1;return {x:points[i].x+(points[i+1].x-points[i].x)*f,y:points[i].y+(points[i+1].y-points[i].y)*f};}left-=lengths[i];}return points[0];}
 function actionPoint(s,pet,c){const a=pet.action;if(!a)return {x:pet.x,y:pet.y,phase:'rest'};
  if(a.motion){const pose=MOT.sample(a.motion),route=data(c).rooms.get(s.objects[a.part]?.room)?.route;if(route&&pose.phase==='climb')return {...pose,...along([{x:a.target.x,y:272},...route,a.target],pose.progress)};return pose;}
  if(a.type==='relocate'){const route=data(c).rooms.get(data(c).beds.get(a.bed)?.room)?.route,old=data(c).rooms.get(data(c).beds.get(pet.home)?.room)?.route;return {...along([a.from,...(old?clone(old).reverse():[]),...(route||[]),a.target],Math.min(1,a.elapsed/a.total)),phase:'walk'};}
  const workEnd=a.workEnd||a.total-1,ratio=a.elapsed<2?Math.min(1,a.elapsed/2):a.elapsed>=workEnd?Math.min(1,(a.elapsed-workEnd)/Math.max(.001,a.total-workEnd)):0;
  if(a.elapsed<2)return {x:a.from.x+(a.target.x-a.from.x)*ratio,y:a.from.y+(a.target.y-a.from.y)*ratio,phase:'walk'};
  if(a.type==='production'&&a.elapsed>=workEnd)return {x:a.target.x+(104-a.target.x)*ratio,y:a.target.y+(272-a.target.y)*ratio,phase:'deliver',held:Object.keys(a.output)[0]};
  return {...a.target,phase:a.type==='relocate'?'move':a.type==='production'?'work':a.type,hammer:a.type==='install'||a.type==='dismantle'};
 }
 function workStatus(s,pet,c=CONFIG.create()){
  if(pet.action){const a=pet.action;if(a.type==='production')return data(c).recipes.get(a.recipe).name+(a.minted?' · 正在运输交付':' · 正在作业');return {relocate:'正在搬迁',install:'正在搬运安装',dismantle:'正在拆解回收',move:'正在完整搬出家具',reuse:'正在复用家具'}[a.type];}
  if(!pet.arrived)return '小屋建成后到访';if(!pet.home)return '来访 · 先安排可用床位';
  const recipes=c.recipes.filter(r=>c.pets.find(p=>p.id===pet.id).capabilities.includes(r.capability));
  const usable=recipes.filter(r=>facility(s,r,c));if(!usable.length)return '等待对应作业设施建成';
  const inv=inventory(s,c),stock=inventory(s,c,false);
  if(usable.every(r=>!fits(s,r.output,c)))return '本批次仓位不足 · 等待用料或转存营地';
  const missing=usable.find(r=>Object.entries(r.input).some(([k,n])=>inv[k]<n));
  if(missing)return '等待投入：'+Object.entries(missing.input).filter(([k,n])=>inv[k]<n).map(([k,n])=>c.materials[k]+' '+(n-inv[k])).join('、');
  const growing=usable.find(r=>s.regrowth[r.id]>0);if(growing)return Object.keys(growing.output).map(k=>c.materials[k]).join('、')+'正在再生 · 稍后自动采收';
  if(usable.some(r=>r.buffer&&Object.keys(r.output).some(k=>stock[k]>=r.buffer)))return '取材缓冲已足 · 等待工程用料';
  return '休息 · 等待可用作业点';
 }
 function canDismantle(s,target,c){return !c.parts.some(p=>placed(s,p.id)&&p.id!==target&&s.objects[p.id].supports.includes(target));}
 function beginTask(s,pet,t,c){
  const d=data(c),p=d.parts.get(t.target),g=d.groups.get(t.target),proj=s.project;
  if(t.type==='install'){
   if(!p.supports.every(id=>placed(s,id)))return note(s,'等待完整支撑链。'),false;
   const stock=inventory(s,c),missing=Object.fromEntries(Object.entries(p.cost).filter(([k,n])=>stock[k]<n).map(([k,n])=>[k,n-stock[k]]));
   if(Object.keys(missing).length){note(s,'缺少 '+Object.entries(missing).map(([k,n])=>c.materials[k]+' '+n).join('、')+'；取材或生产后自动继续。');return missing;}
   const ids=claim(s,p.cost,'transport',p.id,c),materials=ids.map(id=>s.materials.find(m=>m.id===id));
   const o=s.objects[p.id],target={x:o.x+8,y:Math.min(272,o.y+16)};
   const motion=MOT.create({id:p.id,buildAction:'install',seconds:p.seconds,cost:p.cost},materials,[{x:pet.x,y:pet.y}],0,target,false,false,{ground:272,piles:{W:104,S:112,Q:96,C:96},view:{}});
   allocate(s,pet,'install',{target,part:p.id,materials:ids,output:{},total:motion.total,motion});
   for(const m of materials){proj.consumed[m.kind]++;proj.sources[m.source]=(proj.sources[m.source]||0)+1;}
  }else if(t.type==='dismantle'){
   if(!placed(s,p.id)||!canDismantle(s,p.id,c))return note(s,'拆解会破坏支撑，工程停止。'),false;
   const output=Object.fromEntries(Object.keys(p.cost).map(k=>[k,t.recover||0])),salvage=!fits(s,output,c);if(salvage&&s.materials.filter(m=>m.state==='salvage').length+(t.recover||0)>c.salvageCapacity)return note(s,'回收箱没有接收空间；先用料或转存仓库。'),false;
   allocate(s,pet,'dismantle',{part:p.id,target:{x:p.x+8,y:p.y+16},output,total:4,recover:t.recover||0,salvage});
  }else if(t.type==='move'){
   if(Object.values(s.furniture).filter(g=>g.status==='stored').length>=c.furnitureCapacity)return note(s,'家具库存已满。'),false;
   if(!groupReady(s,g))return false;
   const o=s.objects[g.parts[0]];allocate(s,pet,'move',{group:g.id,target:{x:o.x+8,y:o.y+16},total:g.parts.length*3+2,output:{}});
  }else if(t.type==='reuse'){
   if(!['stored','parked'].includes(s.furniture[g.id].status))return note(s,'等待可复用家具。'),false;
   if(t.supports&&!t.supports.every(id=>placed(s,id)))return false;
   allocate(s,pet,'reuse',{group:g.id,room:t.room,positions:clone(t.positions),supports:clone(t.supports||[]),target:{x:t.positions[0].x+8,y:t.positions[0].y+16},total:g.parts.length*3+2,output:{}});
  }
  proj.locked=true;return true;
 }
 function completeAction(s,pet,a,c){
  if(a.type==='relocate'){pet.home=a.bed;note(s,c.pets.find(p=>p.id===pet.id).name+'已搬到'+data(c).rooms.get(data(c).beds.get(a.bed).room).name+'。');}
  if(a.type==='production'){
   if(!fits(s,a.output,c,a))return false;
   for(const m of s.materials)if(m.owner===a.id){m.state='stock';m.owner=null;}
   s.regrowth[a.recipe]=data(c).recipes.get(a.recipe).regrow||0;
  }
  if(a.type==='install'){
   const o=s.objects[a.part];o.status='installed';o.materials=a.materials;
   for(const m of s.materials)if(a.materials.includes(m.id)){m.state='installed';m.owner=o.id;}
   const g=data(c).groups.get(data(c).parts.get(a.part).group);if(g&&g.parts.every(id=>placed(s,id)))s.furniture[g.id].status='installed';
  }
  if(a.type==='dismantle'){
   const o=s.objects[a.part],ids=o.materials.slice(),recover=ids.slice(0,a.recover);retire(s,ids.slice(a.recover),'lost');
   for(const m of s.materials)if(recover.includes(m.id)){m.state=a.salvage?'salvage':'stock';m.owner=null;}
   o.materials=[];o.status='removed';const g=data(c).groups.get(data(c).parts.get(o.id).group);if(g)s.furniture[g.id].status='removed';
  }
  if(['move','reuse'].includes(a.type)){
   const g=data(c).groups.get(a.group);s.furniture[g.id].status=a.type==='move'?'stored':'installed';
   g.parts.forEach((id,i)=>{const o=s.objects[id];o.status=a.type==='move'?'stored':'installed';if(a.positions){o.x=a.positions[i].x;o.y=a.positions[i].y;o.room=a.room;o.supports=clone(a.supports);}for(const m of s.materials)if(o.materials.includes(m.id))m.state=a.type==='move'?'furniture':'installed';});
  }
  if(['install','dismantle','move','reuse'].includes(a.type))s.project.at++;
  const pose=actionPoint(s,pet,c);pet.x=Math.round(pose.x);pet.y=Math.round(pose.y);pet.action=null;return true;
 }
 function projectStep(s,c){const p=s.project;if(!p){if(s.queue.length)startProject(s,c,{},s.queue[0]);return;}const plan=c.plans.find(q=>q.id===p.plan);
  if(p.phase==='preparing'){
   if(s.pets.some(pet=>pet.action?.type==='production'&&p.affected.includes(pet.action.room))){note(s,'等待受影响设施的当前批次完成并交付。');return;}
   for(const move of p.moves){const pet=s.pets.find(p=>p.id===move.pet);if(pet.home!==move.bed){relocation(s,pet,move.bed,c);return;}}
   p.disabled=true;p.phase='work';
  }
  if(p.phase==='work'&&p.at===plan.tasks.length){p.disabled=false;p.phase='settling';}
  if(p.phase==='settling'){
   for(const move of plan.settle){const pet=s.pets.find(p=>p.id===move.pet);if(pet.home!==move.bed){if(!relocation(s,pet,move.bed,c))note(s,'等待目标床位腾空或当前任务交付。');return;}}
   s.completed.push({id:plan.id,time:s.time,consumed:p.consumed,sources:p.sources});for(const id of plan.unlock)s.pets.find(p=>p.id===id).arrived=true;for(const decoration of plan.effect?.decorations||[])if(!s.decorations.includes(decoration))s.decorations.push(decoration);
   s.project=null;note(s,plan.name+'完成，小镇继续生产。'+(plan.base?'可继续安排已解锁工程。':'扩展设施已投入使用。'));
  }
 }
 function schedule(s,pet,c){if(pet.action||!pet.arrived)return;const def=c.pets.find(p=>p.id===pet.id);
  if(def.capabilities.includes('build')&&s.project?.phase==='work'){
   const task=c.plans.find(p=>p.id===s.project.plan).tasks[s.project.at];if(task){const result=beginTask(s,pet,task,c);if(result===true)return;if(result&&typeof result==='object'){
     const k=Object.keys(result).find(k=>c.recipes.some(r=>!r.facility&&def.capabilities.includes(r.capability)&&r.output[k]));
     if(k){const r=c.recipes.find(r=>!r.facility&&def.capabilities.includes(r.capability)&&r.output[k]);beginRecipe(s,pet,r,c);}return;}
    return;}
  }
  if(def.capabilities.includes('build')&&s.project)return;
  const recipes=c.recipes.filter(r=>def.capabilities.includes(r.capability)).sort((a,b)=>(b.priority||0)-(a.priority||0));
  if(s.gatherPriority!=='auto'&&def.capabilities.includes('build'))recipes.sort((a,b)=>Number(!!b.output[s.gatherPriority])-Number(!!a.output[s.gatherPriority]));
  for(const r of recipes)if(beginRecipe(s,pet,r,c))break;
 }
 function stableRecipes(s,c){return c.recipes.filter(r=>facility(s,r,c)&&s.pets.some(p=>p.arrived&&(!r.facility||p.home)&&c.pets.find(d=>d.id===p.id).capabilities.includes(r.capability)));}
 function generateInteraction(s,c){
  if(s.ticks<s.nextEvent)return;s.nextEvent=s.ticks+Math.round(c.interactions.interval/STEP);if(s.interactions.length>=c.interactions.slots)return;
  const recipes=stableRecipes(s,c),resources=kinds(c).filter(k=>recipes.some(r=>r.output[k])),pool=[];
  for(const k of resources.filter(k=>c.interactions.pickupKinds.includes(k)))pool.push({type:'pickup',kind:k,reward:{[k]:c.interactions.pickup},input:{},progress:0,clicks:0,point:{x:72+resources.indexOf(k)*48,y:268}});
  for(const k of resources.filter(k=>c.interactions.commission[k])){const to=resources.find(q=>q!==k&&c.interactions.reward[q]);if(to)pool.push({type:'commission',input:{[k]:c.interactions.commission[k]},reward:{[to]:c.interactions.reward[to]},progress:0,clicks:0,point:{x:200,y:180}});}
  for(const r of recipes.filter(r=>r.facility))pool.push({type:'assist',recipe:r.id,assistKey:r.capability,input:{},reward:{},progress:0,clicks:3,point:{...facility(s,r,c).point}});
  s.eventRng=random(s.eventRng);const event=clone(pool[Math.floor(s.eventRng/4294967296*pool.length)]);if(!event)return;
  s.interactions.push({...event,id:'interaction-'+s.nextInteraction++,status:event.clicks?'active':'ready',createdAt:s.time});
 }
 function protectedCost(s,c){if(!s.project)return {};const busy=s.pets.some(p=>['install','dismantle','move','reuse'].includes(p.action?.type)),t=currentPlan(s,c)?.tasks.slice(s.project.at+Number(busy)).find(t=>t.type==='install');return t?data(c).parts.get(t.target).cost:{};}
 function interactionCheck(s,id,c=CONFIG.create()){
  const e=s.interactions.find(e=>e.id===id);if(!e)return {error:'该互动已处理'};if(e.status!=='ready')return {error:'还需整理 '+(e.clicks-e.progress)+' 次'};
  if(e.type==='assist'&&(s.assists[e.assistKey]||0)>0)return {error:'同类协助尚有 '+s.assists[e.assistKey]+' 批，不能叠加'};
  const stock=inventory(s,c),protect=protectedCost(s,c),missing={};for(const[k,n]of Object.entries(e.input))if(stock[k]-(protect[k]||0)<n)missing[k]=n-Math.max(0,stock[k]-(protect[k]||0));
  if(Object.keys(missing).length)return {error:'保护下一项施工用料；尚差 '+Object.entries(missing).map(([k,n])=>c.materials[k]+' '+n).join('、')};
  // Inputs and reward share one transaction. Receiving space includes freed stock inputs.
  const inStock=inventory(s,c,false),cap=capacity(s,c);for(const[k,n]of Object.entries(e.reward))if(inStock[k]+reserved(s,k)+n-(e.input[k]||0)>cap[k])return {error:'接收仓位不足，奖励保留待领取'};
  return {event:e};
 }
 function progressInteraction(s,id,c=CONFIG.create()){const e=s.interactions.find(e=>e.id===id);if(s.paused||!e||e.status!=='active')return false;e.progress=Math.min(e.clicks,e.progress+1);if(e.progress===e.clicks)e.status='ready';return true;}
 function claimInteraction(s,id,c=CONFIG.create()){
  if(s.paused)return false;const check=interactionCheck(s,id,c);if(check.error){note(s,check.error);return false;}const e=check.event;
  const ids=claim(s,e.input,'processing',e.id,c);retire(s,ids,'consumed');for(const[k,n]of Object.entries(e.input))s.ledger.submitted[k]+=n;
  for(const[k,n]of Object.entries(e.reward)){mint(s,k,n,'stock',null,'reward');s.ledger.rewards[k]+=n;}
  if(e.type==='assist')s.assists[e.assistKey]=c.interactions.assistBatches;
  s.interactionHistory.push({...clone(e),status:'claimed',resolvedAt:s.time});s.interactions=s.interactions.filter(q=>q!==e);s.nextEvent=Math.max(s.nextEvent,s.ticks+Math.round(c.interactions.interval/STEP));note(s,'互动已结算'+(e.type==='assist'?'：接下来三个批次作业效率 +10%。':'，材料已入仓。'));return true;
 }
 function abandonInteraction(s,id,c=CONFIG.create()){const e=s.interactions.find(e=>e.id===id);if(!e)return false;s.interactionHistory.push({...clone(e),status:'abandoned',resolvedAt:s.time});s.interactions=s.interactions.filter(q=>q!==e);s.nextEvent=Math.max(s.nextEvent,s.ticks+Math.round(c.interactions.interval/STEP));return true;}
 function tick(s,c,count=1){s.ticks+=count;s.time=s.ticks*STEP;
  for(const id of Object.keys(s.regrowth))s.regrowth[id]=Math.max(0,Math.round(s.regrowth[id]/STEP)-count)*STEP;
  for(const pet of s.pets){const a=pet.action;if(!a)continue;const rate=['install','dismantle','move','reuse'].includes(a.type)?s.multiplier:1;a.elapsedTicks+=count*rate;a.elapsed=Math.min(a.total,a.elapsedTicks*STEP);if(a.motion)a.motion.elapsed=a.elapsed;
   if(a.type==='production'&&!a.minted&&a.elapsed+1e-8>=a.workEnd){for(const[k,n]of Object.entries(a.output))a.materials.push(...mint(s,k,n,'transit',a.id,a.recipe));a.minted=true;s.ledger.recipes[a.recipe].finished++;}
   if(a.elapsed+1e-8>=a.total)completeAction(s,pet,a,c);
  }
  projectStep(s,c);for(const pet of s.pets)schedule(s,pet,c);generateInteraction(s,c);
 }
 // Skip only ticks without a threshold crossing; all mutations still use the same tick rules.
 function nextBoundary(s,c){if(s.queue.length&&!s.project||s.project&&s.project.phase!=='work')return 1;let n=Math.max(1,s.nextEvent-s.ticks);for(const pet of s.pets){const a=pet.action;if(!a)continue;const rate=['install','dismantle','move','reuse'].includes(a.type)?s.multiplier:1;for(const end of [a.total,...(a.type==='production'&&!a.minted?[a.workEnd]:[])])n=Math.min(n,Math.max(1,Math.ceil((end-a.elapsed-1e-8)/(STEP*rate))));}for(const value of Object.values(s.regrowth))if(value>0)n=Math.min(n,Math.max(1,Math.round(value/STEP)));return n;}
 function advance(s,dt=STEP,c=CONFIG.create()){if(s.paused)return;requireRule(Number.isFinite(dt)&&dt>=0&&dt<=60,'无效模拟时间');const total=s.remainder+dt;let ticks=Math.floor((total+1e-9)/STEP);s.remainder=Math.max(0,total-ticks*STEP);if(s.remainder<1e-8)s.remainder=0;let first=true;while(ticks){const n=first?1:Math.min(ticks,nextBoundary(s,c));tick(s,c,n);ticks-=n;first=false;}}
 function validate(s,c=CONFIG.create()){
  validateConfig(c);const d=data(c);requireRule(s?.format==='town-idle','不支持此存档格式');requireRule(s.version===1&&s.configVersion===c.version&&s.scene===c.id&&s.signature===JSON.stringify(c),'存档版本或图纸配置不匹配，原记录已保留');
  requireRule(s.status==='running'&&typeof s.paused==='boolean'&&[1,2].includes(s.multiplier)&&Number.isInteger(s.ticks)&&s.ticks>=0&&Math.abs(s.time-s.ticks*STEP)<1e-7&&s.remainder>=0&&s.remainder<STEP+1e-8,'时间状态损坏');
  requireRule(Array.isArray(s.completed)&&new Set(s.completed.map(p=>p.id)).size===s.completed.length&&s.completed.every((p,i)=>{const plan=c.plans.find(q=>q.id===p.id);return plan&&plan.requires.every(id=>s.completed.slice(0,i).some(q=>q.id===id));}),'工程记录损坏');
  requireRule(queueValid(s,s.queue,c),'待办依赖损坏');requireRule(c.plans.filter(p=>p.choiceGroup&&completed(s,p.id)).length<=1&&(!s.selection||c.plans.some(p=>p.id===s.selection&&p.choiceGroup)),'扩展选择损坏');
  requireRule(s.layout&&same(s.layout,layout(c,s.layout.seed))&&Number.isSafeInteger(s.eventRng)&&s.eventRng>=0&&s.eventRng<4294967296&&Number.isSafeInteger(s.nextEvent)&&s.nextEvent>s.ticks&&Number.isSafeInteger(s.nextInteraction)&&s.nextInteraction>0&&[0,1].includes(s.gardenStyle),'随机或互动时钟损坏');
  requireRule(Number.isFinite(s.wallTime)&&s.wallTime>=0&&s.interactions.length<=c.interactions.slots&&new Set([...s.interactions,...s.interactionHistory].map(e=>e.id)).size===s.interactions.length+s.interactionHistory.length,'互动记录损坏');
  for(const e of [...s.interactions,...s.interactionHistory])requireRule(['pickup','commission','assist'].includes(e.type)&&['active','ready','claimed','abandoned'].includes(e.status)&&Number.isInteger(e.progress)&&e.progress>=0&&e.progress<=e.clicks&&Object.entries({...e.input,...e.reward}).every(([k,n])=>k in c.materials&&Number.isSafeInteger(n)&&n>=0)&&(e.type!=='assist'||d.recipes.get(e.recipe)?.capability===e.assistKey),'互动任务损坏');
  for(const [id,n]of Object.entries(s.assists))requireRule(c.recipes.some(r=>r.capability===id)&&Number.isInteger(n)&&n>=0&&n<=c.interactions.assistBatches,'协助批次损坏');
  requireRule(s.pets.length===c.pets.length&&new Set(s.pets.map(p=>p.id)).size===s.pets.length&&s.pets.every(p=>c.pets.some(q=>q.id===p.id)),'宠物身份损坏');
  const actions=s.pets.map(p=>p.action).filter(Boolean),facilities=actions.map(a=>a.facility).filter(Boolean);requireRule(new Set(actions.map(a=>a.id)).size===actions.length&&new Set(facilities).size===facilities.length,'居民或设施重复占用');
  requireRule(same([...s.decorations].sort(),[...new Set(c.plans.filter(p=>completed(s,p.id)).flatMap(p=>p.effect?.decorations||[]))].sort()),'装饰解锁记录损坏');
  const homes=s.pets.map(p=>p.home).filter(Boolean),targets=s.pets.map(p=>p.action?.bed).filter(Boolean);requireRule(new Set(homes).size===homes.length&&new Set(targets).size===targets.length,'床位重复占用');
  for(const pet of s.pets){requireRule([pet.x,pet.y].every(Number.isFinite)&&typeof pet.arrived==='boolean'&&(!pet.home||pet.arrived&&d.beds.has(pet.home)&&bedAvailable(s,d.beds.get(pet.home),c)),'住处或位置损坏');const a=pet.action;if(!a)continue;
   requireRule(['production','install','dismantle','move','reuse','relocate'].includes(a.type)&&Number.isSafeInteger(a.elapsedTicks)&&a.elapsedTicks>=0&&a.elapsed===Math.min(a.total,a.elapsedTicks*STEP)&&a.elapsed>=0&&a.elapsed<=a.total+1e-7&&a.total>0&&[a.target.x,a.target.y,a.from.x,a.from.y].every(Number.isFinite),'任务进度损坏');
   if(a.type==='production'){const r=d.recipes.get(a.recipe);requireRule(r&&c.pets.find(p=>p.id===pet.id).capabilities.includes(r.capability)&&Number.isFinite(a.efficiency)&&a.efficiency>=1&&a.total===r.seconds/a.efficiency+4&&a.workEnd===r.seconds/a.efficiency+2&&same(a.output,r.output)&&a.workEnd<a.total&&a.minted===(a.elapsed+1e-8>=a.workEnd),'生产批次损坏');requireRule(a.materials.length===(a.minted?Object.values(r.output).reduce((a,b)=>a+b,0):0)&&new Set(a.materials).size===a.materials.length,'在途产物损坏');for(const[k,n]of Object.entries(r.output))requireRule(a.materials.filter(id=>s.materials.some(m=>m.id===id&&m.kind===k&&m.source===r.id&&m.owner===a.id)).length===(a.minted?n:0),'产物配方不符');}
   if(a.type==='relocate')requireRule(d.beds.has(a.bed)&&bedAvailable(s,d.beds.get(a.bed),c)&&!s.pets.some(p=>p!==pet&&p.home===a.bed),'搬迁目的床位损坏');
   if(['install','dismantle','move','reuse'].includes(a.type)){const t=c.plans.find(p=>p.id===s.project?.plan)?.tasks[s.project?.at];requireRule(s.project?.phase==='work'&&s.project.locked&&t?.type===a.type&&t.target===(a.part||a.group)&&c.pets.find(p=>p.id===pet.id).capabilities.includes('build'),'施工归属损坏');if(a.motion){requireRule(a.motion.elapsed===a.elapsed&&a.motion.total===a.total&&same(a.motion.materialIds,a.materials),'搬运动作损坏');MOT.validate(a.motion,s.materials);}}
  }
  if(s.project){const p=s.project,plan=c.plans.find(q=>q.id===p.plan);requireRule(plan&&p.plan===plan.id&&['preparing','work','settling'].includes(p.phase)&&Number.isInteger(p.at)&&p.at>=0&&p.at<=plan.tasks.length&&same(p.affected,plan.disable)&&typeof p.locked==='boolean'&&p.disabled===(p.phase==='work'),'工程进度损坏');}
  const debug=s.ledger.debug;
  if(debug)for(const field of ['added','removed'])requireRule(debug[field]&&same(Object.keys(debug[field]).sort(),kinds(c).sort())&&Object.values(debug[field]).every(n=>Number.isSafeInteger(n)&&n>=0),'调试材料账本损坏');
  const ids=new Set();for(const m of s.materials){requireRule(Number.isInteger(m.id)&&m.id>0&&m.id<s.nextMaterial&&!ids.has(m.id)&&m.kind in c.materials&&['stock','yard','salvage','installed','transport','furniture','transit'].includes(m.state)&&(m.source==='initial'||m.source==='reward'||d.recipes.has(m.source)||m.source==='debug'&&debug),'材料身份损坏');ids.add(m.id);
   if(['stock','yard','salvage'].includes(m.state))requireRule(m.owner===null,'库存归属损坏');
   if(m.state==='transit')requireRule(s.pets.some(p=>p.action?.id===m.owner&&p.action.materials.includes(m.id)&&p.action.type==='production'),'交付归属损坏');
   if(m.state==='transport')requireRule(s.pets.some(p=>p.action?.part===m.owner&&p.action.materials.includes(m.id)&&p.action.type==='install'),'施工在途归属损坏');
   if(['installed','furniture'].includes(m.state))requireRule(s.objects[m.owner]?.materials.includes(m.id),'构件材料归属损坏');
  }
  const expected=Object.fromEntries(c.parts.map(p=>[p.id,{status:'absent',x:p.x+(p.plot?s.layout.anchor.x:0),y:p.y,room:p.room,supports:p.supports}]));let loss=0;
  for(let i=0;i<s.completed.length+Number(!!s.project);i++){const plan=c.plans.find(p=>p.id===(i<s.completed.length?s.completed[i].id:s.project.plan)),tasks=i<s.completed.length?plan.tasks:plan.tasks.slice(0,s.project.at);for(const t of tasks){if(t.type==='install')expected[t.target].status='installed';if(t.type==='dismantle'){expected[t.target].status='removed';loss+=1-(t.recover||0);}if(t.type==='move'||t.type==='reuse')d.groups.get(t.target).parts.forEach((id,j)=>{expected[id].status=t.type==='move'?'stored':'installed';if(t.type==='reuse')Object.assign(expected[id],t.positions[j],{room:t.room,supports:t.supports||[]});});}}
  requireRule(Object.values(s.ledger.lost).reduce((a,b)=>a+b,0)===loss,'拆解回收重复或缺失');
  for(const p of c.parts){const o=s.objects[p.id];requireRule(o?.id===p.id&&same({status:o.status,x:o.x,y:o.y,room:o.room,supports:o.supports},expected[p.id]),'工程差异或保留件身份损坏');
   requireRule(o.materials.length===(['installed','stored'].includes(o.status)?1:0)&&o.materials.every(id=>s.materials.some(m=>m.id===id&&m.owner===p.id&&m.kind in p.cost&&m.state===(o.status==='stored'?'furniture':'installed'))),'构件材料不守恒');
   if(o.status==='installed')requireRule(o.supports.every(id=>placed(s,id)),'支撑链损坏');
   if(!p.group||!c.plans.filter(p=>completed(s,p.id)||p.id===s.project?.plan).some(p=>p.tasks.some(t=>t.type==='reuse'&&t.target===d.parts.get(o.id).group)))requireRule(o.x===p.x+(p.plot?s.layout.anchor.x:0)&&o.y===p.y&&o.room===p.room,'保留构件位置损坏');
  }
  for(const g of c.groups){const f=s.furniture[g.id];requireRule(f&&['absent','installed','stored','parked','removed'].includes(f.status),'家具库存损坏');if(['stored','parked'].includes(f.status))requireRule(g.parts.every(id=>s.objects[id].status==='stored'),'家具组重复结算');if(f.status==='installed')requireRule(g.parts.every(id=>placed(s,id)),'家具组不完整');}
  requireRule(Object.values(s.furniture).filter(g=>g.status==='stored').length<=c.furnitureCapacity&&s.materials.filter(m=>m.state==='yard').length<=c.yardCapacity&&s.materials.filter(m=>m.state==='salvage').length<=c.salvageCapacity,'接收容量损坏');
  requireRule(Number.isInteger(s.nextAction)&&s.nextAction>0&&Number.isInteger(s.nextMaterial)&&s.nextMaterial===Object.values(s.ledger.created).reduce((a,b)=>a+b,0)+1,'身份计数器损坏');
  requireRule(Object.keys(s.objects).length===c.parts.length&&Object.keys(s.furniture).length===c.groups.length,'多余城镇对象');
  const production=s.pets.filter(p=>p.action?.type==='production').map(p=>p.action);
  for(const r of c.recipes){const b=s.ledger.recipes[r.id];requireRule(b&&Number.isInteger(b.started)&&Number.isInteger(b.finished)&&b.finished>=0&&b.started-b.finished===production.filter(a=>a.recipe===r.id&&!a.minted).length,'配方账本损坏');}
  for(const k of kinds(c)){const created=c.initial[k]+c.recipes.reduce((n,r)=>n+s.ledger.recipes[r.id].finished*(r.output[k]||0),0)+(debug?.added[k]||0)+s.ledger.rewards[k],consumed=c.recipes.reduce((n,r)=>n+s.ledger.recipes[r.id].started*(r.input[k]||0),0)+s.ledger.submitted[k];
   const claimed=s.interactionHistory.filter(e=>e.status==='claimed');requireRule(s.ledger.rewards[k]===claimed.reduce((n,e)=>n+(e.reward[k]||0),0)&&s.ledger.submitted[k]===claimed.reduce((n,e)=>n+(e.input[k]||0),0),'互动账本损坏');
   requireRule(s.ledger.created[k]===created&&s.ledger.consumed[k]===consumed&&Number.isInteger(s.ledger.lost[k])&&s.ledger.lost[k]>=0&&created===s.materials.filter(m=>m.kind===k).length+consumed+s.ledger.lost[k]+(debug?.removed[k]||0),'材料来源／加工／损耗不守恒');
   requireRule(s.materials.filter(m=>m.kind===k&&m.source==='debug').length<=(debug?.added[k]||0),'调试材料来源损坏');
   requireRule(inventory(s,c,false)[k]+reserved(s,k)<=capacity(s,c)[k],'仓库超容');
  }return true;
 }
 function save(s,c=CONFIG.create()){validate(s,c);return JSON.stringify(s);}
 function restore(text,c=CONFIG.create()){requireRule(typeof text==='string'&&text.length<4000000,'存档过大');const s=JSON.parse(text);validate(s,c);return s;}
 const api={STEP,SAVE_KEY,currentPlan,capacity,efficiency,reserved,enqueue,reorderQueue,removeQueued,choose,cycleGarden,interactionCheck,progressInteraction,claimInteraction,abandonInteraction,stableRecipes,layout,create,advance,inventory,debugSetInventory,preview,startProject,cancelProject,assignHome,parkFurniture,stow,roomReady,roomAvailable,bedAvailable,comfort,actionPoint,workStatus,validate,validateConfig,save,restore};
 if(node)module.exports=api;else root.TownGrowthEngine=api;
})(globalThis);
