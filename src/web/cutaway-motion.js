/* Versioned one-unit hauling, including paired timber lifts. Pure simulation-time sampling. */
(function(root){
 'use strict';
 const VERSION='cutaway-haul-v1',TEAM_VERSION='cutaway-timber-v1',GROUND=272;
 const accepts=a=>a?.motion===VERSION||a?.motion===TEAM_VERSION;
 const isTimber=(plan,part)=>plan?.id==='cutaway-creek-shelter-v3-grid-v1'&&part?.tileSource?.id==='logs';
 const supply=kind=>({x:kind==='W'?68:kind==='S'?107:kind==='D'?185:146,y:GROUND});
 function timeline(part,ids,kinds,start,target){
  const steps=[];let at={...start},time=0;
  function add(phase,to,seconds,unit,held=false){
   steps.push({phase,from:{...at},to:{...to},seconds,start:time,unit,held});
   time+=seconds;at={...to};
  }
  ids.forEach((id,unit)=>{
   const pile=supply(kinds[unit]);
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
 function timberTimeline(starts,target){
  const steps=[];let at=starts.map(p=>({...p})),time=0;
  const pair=(x,y)=>[{x:x-12,y},{x:x+12,y}];
  function add(phase,to,seconds,logFrom=null,logTo=logFrom){
   steps.push({phase,from:at,to,seconds,start:time,logFrom,logTo});time+=seconds;at=to;
  }
  const pile=supply('W'),ground={x:target.x,y:GROUND};
  add('descend',at.map(p=>({x:p.x,y:GROUND})),Math.max(...at.map(p=>GROUND-p.y))/90);
  const pickup=pair(pile.x,GROUND);
  add('fetch',pickup,Math.max(.2,...at.map((p,i)=>Math.abs(p.x-pickup[i].x)/85)));
  add('team-pickup',pickup,.7,{x:pile.x,y:GROUND-2},{x:pile.x,y:GROUND-8});
  add('team-carry',pair(ground.x,GROUND),Math.max(.3,Math.abs(ground.x-pile.x)/60),{x:pile.x,y:GROUND-8},{x:ground.x,y:GROUND-8});
  add('stage',pair(ground.x,GROUND),.5,{x:ground.x,y:GROUND-8},{x:ground.x,y:GROUND-2});
  add('lift',pair(target.x,target.y),.9+(GROUND-target.y)/35,{x:ground.x,y:GROUND-2},{x:target.x,y:target.y-8});
  add('align',pair(target.x,target.y),1.2,{x:target.x,y:target.y-8});
  add('reveal',pair(target.x,target.y),.45,{x:target.x,y:target.y-8});
  return {steps,total:time};
 }
 function create(part,materials,starts,worker,target,team=false){
  const ids=materials.map(m=>m.id),kinds=materials.map(m=>m.kind);
  const route=team?timberTimeline(starts,target):timeline(part,ids,kinds,starts[worker],target);
  return {motion:team?TEAM_VERSION:VERSION,id:part.id,part:JSON.parse(JSON.stringify(part)),workers:team?[0,1]:[worker],
   materialIds:ids,materialKinds:kinds,starts:starts.map(p=>({...p})),target,
   supply:supply(kinds[0]),elapsed:0,phase:route.steps[0].phase,
   durations:route.steps.map(s=>s.seconds),total:route.total};
 }
 function sample(a){
  if(a.motion===TEAM_VERSION){
   const route=timberTimeline(a.starts,a.target);
   const step=route.steps.find(s=>s.seconds>0&&a.elapsed<s.start+s.seconds)||route.steps.at(-1);
   const progress=Math.max(0,Math.min(1,(a.elapsed-step.start)/Math.max(.001,step.seconds)));
   const mix=(from,to)=>({x:from.x+(to.x-from.x)*progress,y:from.y+(to.y-from.y)*progress});
   const pets=step.from.map((p,i)=>mix(p,step.to[i]));
   return {phase:step.phase,...pets[0],pets,progress,team:true,
    log:step.logFrom?mix(step.logFrom,step.logTo):null,materialId:a.materialIds[0],held:null,
    delivered:['align','reveal'].includes(step.phase)?1:0,hammer:false,visible:false,
    smoke:step.phase==='align'?.35:step.phase==='reveal'?.35*(1-progress):0};
  }
  const route=timeline(a.part,a.materialIds,a.materialKinds,a.starts[a.workers[0]],a.target);
  const step=route.steps.find(s=>s.seconds>0&&a.elapsed<s.start+s.seconds)||route.steps.at(-1);
  const progress=Math.max(0,Math.min(1,(a.elapsed-step.start)/Math.max(.001,step.seconds)));
  return {phase:step.phase,x:step.from.x+(step.to.x-step.from.x)*progress,
   y:step.from.y+(step.to.y-step.from.y)*progress,progress,unit:step.unit,
   held:step.held?a.materialKinds[step.unit]:null,
   materialId:step.held?a.materialIds[step.unit]:null,
   delivered:step.unit,hammer:step.phase==='install',
   visible:step.phase==='reveal',smoke:step.phase==='install'?1:step.phase==='reveal'?1-progress:0};
 }
 function validate(a,materials){
  const team=a.motion===TEAM_VERSION;
  if(!accepts(a)||a.workers.length!==(team?2:1)||!Array.isArray(a.materialKinds)||a.materialKinds.length!==a.materialIds.length||!a.materialIds.length)throw Error('搬运任务损坏');
  if(team&&(JSON.stringify(a.workers)!=='[0,1]'||a.materialIds.length!==1||a.materialKinds[0]!=='W'||a.part.tileSource?.id!=='logs'||a.target.x!==240+(a.part.x+.5)*16||a.target.y!==GROUND-a.part.y*16))throw Error('合抬原木任务损坏');
  if(a.materialIds.some((id,i)=>materials.find(m=>m.id===id)?.kind!==a.materialKinds[i]))throw Error('搬运材料损坏');
  const route=team?timberTimeline(a.starts,a.target):timeline(a.part,a.materialIds,a.materialKinds,a.starts[a.workers[0]],a.target);
  if(JSON.stringify(a.durations)!==JSON.stringify(route.steps.map(s=>s.seconds))||Math.abs(a.total-route.total)>.001)throw Error('搬运时间损坏');
 }
 const api={VERSION,TEAM_VERSION,accepts,isTimber,create,sample,validate};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownCutawayMotion=api;
})(globalThis);
