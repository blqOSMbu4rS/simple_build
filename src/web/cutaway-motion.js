/* Single-pet, one-unit hauling timeline. Pure simulation-time sampling. */
(function(root){
 'use strict';
 const VERSION='cutaway-haul-v1',GROUND=272;
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
 function create(part,materials,starts,worker,target){
  const ids=materials.map(m=>m.id),kinds=materials.map(m=>m.kind);
  const route=timeline(part,ids,kinds,starts[worker],target);
  return {motion:VERSION,id:part.id,part:JSON.parse(JSON.stringify(part)),workers:[worker],
   materialIds:ids,materialKinds:kinds,starts:starts.map(p=>({...p})),target,
   supply:supply(kinds[0]),elapsed:0,phase:route.steps[0].phase,
   durations:route.steps.map(s=>s.seconds),total:route.total};
 }
 function sample(a){
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
  if(a.motion!==VERSION||a.workers.length!==1||!Array.isArray(a.materialKinds)||a.materialKinds.length!==a.materialIds.length||!a.materialIds.length)throw Error('搬运任务损坏');
  if(a.materialIds.some((id,i)=>materials.find(m=>m.id===id)?.kind!==a.materialKinds[i]))throw Error('搬运材料损坏');
  const route=timeline(a.part,a.materialIds,a.materialKinds,a.starts[a.workers[0]],a.target);
  if(JSON.stringify(a.durations)!==JSON.stringify(route.steps.map(s=>s.seconds))||Math.abs(a.total-route.total)>.001)throw Error('搬运时间损坏');
 }
 const api={VERSION,create,sample,validate};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownCutawayMotion=api;
})(globalThis);
