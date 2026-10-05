/* Versioned one-unit hauling, including paired timber lifts. Pure simulation-time sampling. */
(function(root){
 'use strict';
 const CONFIG=typeof module!=='undefined'&&module.exports?require('./construction-config.js'):root.TownConstructionConfig;
 const VERSION='cutaway-haul-v1',TEAM_VERSION='cutaway-timber-v1',LONG_VERSION='cutaway-whole-timber-v1',MUD_VERSION='cutaway-chinking-v1',DIG_VERSION='cutaway-excavate-v1';
 const isTeam=a=>a?.motion===TEAM_VERSION||a?.motion===LONG_VERSION;
 const accepts=a=>a?.motion===VERSION||a?.motion===MUD_VERSION||a?.motion===DIG_VERSION||isTeam(a);
 const {isTimber,isChinking}=CONFIG;
 const supply=(kind,site=CONFIG.site())=>({x:site.piles[kind],y:site.ground});
 function timeline(part,ids,kinds,start,target,site=CONFIG.site()){
  const GROUND=site.ground;
  const steps=[];let at={...start},time=0;
  function add(phase,to,seconds,unit,held=false){
   steps.push({phase,from:{...at},to:{...to},seconds,start:time,unit,held});
   time+=seconds;at={...to};
  }
  if(CONFIG.action(part)==='excavate'){
   add('descend',{x:at.x,y:GROUND},Math.abs(GROUND-at.y)/90,0);
   add('approach',{x:target.x,y:GROUND},Math.max(.2,Math.abs(target.x-at.x)/85),0);
   add('enter',target,Math.abs(GROUND-target.y)/90,0);
   add('excavate',target,part.seconds,0);
   add('reveal',target,.45,0);
   return {steps,total:time};
  }
  ids.forEach((id,unit)=>{
   const pile=supply(kinds[unit],site);
   add('descend',{x:at.x,y:GROUND},Math.abs(GROUND-at.y)/90,unit);
   add('fetch',pile,Math.max(.15,Math.abs(pile.x-at.x)/100),unit);
   add('pickup',pile,.35,unit);
   add('carry',{x:target.x,y:GROUND},Math.max(.2,Math.abs(target.x-pile.x)/85),unit,true);
   add('climb',target,Math.abs(GROUND-target.y)/90,unit,true);
   add('deliver',target,.25,unit,true);
  });
  add('install',target,part.seconds,ids.length);
  add('reveal',target,.45,ids.length);
  return {steps,total:time};
 }
 function timberTimeline(starts,target,part=null,site=CONFIG.site()){
  const GROUND=site.ground;
  const steps=[];let at=starts.map(p=>({...p})),time=0;
  const reach=part?part.longTimber.length/2-4:12,groundHeight=part?GROUND-part.longTimber.diameter/2:GROUND-2;
  const finalHeight=target.y-(part?part.longTimber.diameter/2:8);
  const pair=(x,y)=>[{x:x-reach,y},{x:x+reach,y}];
  function add(phase,to,seconds,logFrom=null,logTo=logFrom){
   steps.push({phase,from:at,to,seconds,start:time,logFrom,logTo});time+=seconds;at=to;
  }
  const pile=part?{x:site.timberPile,y:GROUND}:supply('W',site),ground={x:target.x,y:GROUND};
  add('descend',at.map(p=>({x:p.x,y:GROUND})),Math.max(...at.map(p=>GROUND-p.y))/90);
  const pickup=pair(pile.x,GROUND);
  add('fetch',pickup,Math.max(.2,...at.map((p,i)=>Math.abs(p.x-pickup[i].x)/85)));
  add('team-pickup',pickup,.7,{x:pile.x,y:groundHeight},{x:pile.x,y:GROUND-8});
  add('team-carry',pair(ground.x,GROUND),Math.max(.3,Math.abs(ground.x-pile.x)/60),{x:pile.x,y:GROUND-8},{x:ground.x,y:GROUND-8});
  add('stage',pair(ground.x,GROUND),.5,{x:ground.x,y:GROUND-8},{x:ground.x,y:groundHeight});
  add('lift',pair(target.x,target.y),.9+(GROUND-target.y)/35,{x:ground.x,y:groundHeight},{x:target.x,y:finalHeight});
  add('align',pair(target.x,target.y),1.2,{x:target.x,y:finalHeight});
  add('reveal',pair(target.x,target.y),.45,{x:target.x,y:finalHeight});
  return {steps,total:time};
 }
 function mudTimeline(part,ids,start,target,site=CONFIG.site()){
  const GROUND=site.ground,mudStation={x:site.mudStation,y:GROUND};
  const steps=[];let at={...start},time=0;
  function add(phase,to,seconds,unit,held=null){
   steps.push({phase,from:{...at},to:{...to},seconds,start:time,unit,held});time+=seconds;at={...to};
  }
  ids.forEach((id,unit)=>{
   const pile=supply('D',site);
   add('descend',{x:at.x,y:GROUND},Math.abs(GROUND-at.y)/90,unit);
   add('fetch',pile,Math.max(.15,Math.abs(pile.x-at.x)/100),unit);
   add('pickup',pile,.35,unit);
   add('to-mix',mudStation,Math.max(.2,Math.abs(at.x-mudStation.x)/85),unit,'D');
   add('mix',mudStation,2,unit);
   add('load-mud',mudStation,.5,unit);
   add('carry',{x:target.x,y:GROUND},Math.max(.2,Math.abs(target.x-at.x)/85),unit,'mud');
   add('climb',target,Math.abs(GROUND-target.y)/90,unit,'mud');
   add('deliver',target,.25,unit,'mud');
  });
  add('seal',target,part.seconds+1.2,ids.length);
  add('reveal',target,.45,ids.length);
  return {steps,total:time};
 }
 function create(part,materials,starts,worker,target,team=false,mud=false,site=CONFIG.site()){
  const ids=materials.map(m=>m.id),kinds=materials.map(m=>m.kind);
  const whole=team&&!!part.longTimber;
  const route=team?timberTimeline(starts,target,whole?part:null,site):mud?mudTimeline(part,ids,starts[worker],target,site):timeline(part,ids,kinds,starts[worker],target,site);
  return {motion:CONFIG.action(part)==='excavate'?DIG_VERSION:whole?LONG_VERSION:team?TEAM_VERSION:mud?MUD_VERSION:VERSION,id:part.id,part:JSON.parse(JSON.stringify(part)),workers:team?[0,1]:[worker],
   site:JSON.parse(JSON.stringify(site)),materialIds:ids,materialKinds:kinds,starts:starts.map(p=>({...p})),target,
   supply:CONFIG.action(part)==='excavate'?{x:target.x,y:site.ground}:whole?{x:site.timberPile,y:site.ground}:supply(kinds[0],site),elapsed:0,phase:route.steps[0].phase,
   durations:route.steps.map(s=>s.seconds),total:route.total};
 }
 function sample(a){
  if(isTeam(a)){
   const whole=a.motion===LONG_VERSION,route=timberTimeline(a.starts,a.target,whole?a.part:null,a.site);
   const step=route.steps.find(s=>s.seconds>0&&a.elapsed<s.start+s.seconds)||route.steps.at(-1);
   const progress=Math.max(0,Math.min(1,(a.elapsed-step.start)/Math.max(.001,step.seconds)));
   const mix=(from,to)=>({x:from.x+(to.x-from.x)*progress,y:from.y+(to.y-from.y)*progress});
   const pets=step.from.map((p,i)=>mix(p,step.to[i]));
   return {phase:step.phase,...pets[0],pets,progress,team:true,whole,
    log:step.logFrom?{...mix(step.logFrom,step.logTo),length:whole?a.part.longTimber.length:16,diameter:whole?a.part.longTimber.diameter:7}:null,materialId:a.materialIds[0],held:null,
   delivered:['align','reveal'].includes(step.phase)?a.materialIds.length:0,hammer:false,visible:false,
    smoke:step.phase==='align'?.35:step.phase==='reveal'?.35*(1-progress):0};
  }
  const mud=a.motion===MUD_VERSION;
  const route=mud?mudTimeline(a.part,a.materialIds,a.starts[a.workers[0]],a.target,a.site):timeline(a.part,a.materialIds,a.materialKinds,a.starts[a.workers[0]],a.target,a.site);
  const step=route.steps.find(s=>s.seconds>0&&a.elapsed<s.start+s.seconds)||route.steps.at(-1);
  const progress=Math.max(0,Math.min(1,(a.elapsed-step.start)/Math.max(.001,step.seconds)));
  return {phase:step.phase,x:step.from.x+(step.to.x-step.from.x)*progress,
   y:step.from.y+(step.to.y-step.from.y)*progress,progress,unit:step.unit,
   held:step.held?(mud?step.held:a.materialKinds[step.unit]):null,mud,
   mixDepth:mud?(step.phase==='to-mix'?progress:['mix','load-mud'].includes(step.phase)?1:step.phase==='carry'?1-progress:0):0,
   materialId:step.held?a.materialIds[step.unit]:null,
   delivered:step.unit,excavating:a.motion===DIG_VERSION,hammer:['install','excavate'].includes(step.phase),
   visible:step.phase==='reveal',smoke:mud?0:['install','excavate'].includes(step.phase)?1:step.phase==='reveal'?1-progress:0};
 }
 function validate(a,materials){
  const team=isTeam(a),whole=a.motion===LONG_VERSION;
  if(!accepts(a)||a.workers.length!==(team?2:1)||!Array.isArray(a.materialKinds)||a.materialKinds.length!==a.materialIds.length||(a.motion===DIG_VERSION?a.materialIds.length!==0||CONFIG.action(a.part)!=='excavate':!a.materialIds.length))throw Error('搬运任务损坏');
  if(team&&(JSON.stringify(a.workers)!=='[0,1]'||a.materialIds.length!==(whole?2:1)||a.materialKinds.some(k=>k!=='W')||!isTimber(null,a.part)))throw Error('合抬原木任务损坏');
  if(whole&&(!a.part.longTimber||!Number.isFinite(a.part.longTimber.length)||a.part.longTimber.length<=8||!Number.isFinite(a.part.longTimber.diameter)||a.part.longTimber.diameter<=0))throw Error('整根圆木规格损坏');
  if(a.motion===MUD_VERSION&&(!isChinking(null,a.part)||a.materialIds.length!==1||a.materialKinds[0]!=='D'))throw Error('泥封任务损坏');
  if(a.materialIds.some((id,i)=>materials.find(m=>m.id===id)?.kind!==a.materialKinds[i]))throw Error('搬运材料损坏');
  const route=team?timberTimeline(a.starts,a.target,whole?a.part:null,a.site):a.motion===MUD_VERSION?mudTimeline(a.part,a.materialIds,a.starts[a.workers[0]],a.target,a.site):timeline(a.part,a.materialIds,a.materialKinds,a.starts[a.workers[0]],a.target,a.site);
  if(JSON.stringify(a.durations)!==JSON.stringify(route.steps.map(s=>s.seconds))||Math.abs(a.total-route.total)>.001)throw Error('搬运时间损坏');
 }
 const api={VERSION,TEAM_VERSION,LONG_VERSION,MUD_VERSION,DIG_VERSION,accepts,isTeam,isTimber,isChinking,create,sample,validate};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownCutawayMotion=api;
})(globalThis);
