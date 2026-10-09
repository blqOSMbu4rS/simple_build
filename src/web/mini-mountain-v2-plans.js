/* Versioned construction data. The published v1 recipe and camera stay intact. */
(function(root){
 'use strict';
 const source=typeof module!=='undefined'&&module.exports?require('./mini-mountain-plans.js'):root.TownBlueprints.find(p=>p.id==='mini-mountain-anime-v1');
 const plan=JSON.parse(JSON.stringify(source)),view=plan.construction.view;
 plan.id=plan.signature=plan.silhouette='mini-mountain-anime-v2';
 plan.replaces=[source.id];
 plan.description='原视角 45° · 先挖地下两层 · 自下而上建造';
 const underground=view.levels.filter(l=>l.underground).sort((a,b)=>b.elevation-a.elevation);
 const rooms=view.levels.filter(l=>plan.parts.some(p=>p.view.level===l.id&&!p.view.overviewOnly)).sort((a,b)=>a.elevation-b.elevation);
 const phases=[
  ...underground.map(l=>({label:l.label+'开挖完成',parts:plan.parts.filter(p=>p.view.level===l.id&&p.buildAction==='excavate')})),
  ...rooms.map(l=>({label:l.label+'空间准备好了',parts:plan.parts.filter(p=>p.view.level===l.id&&p.buildAction!=='excavate'&&!p.view.overviewOnly)})),
  {label:'迷你悬浮山建好了',parts:plan.parts.filter(p=>p.view.overviewOnly)}
 ];
 const byId=new Map(plan.parts.map(p=>[p.id,p]));let previous=[];
 for(const phase of phases){
  for(const p of phase.parts){
   // Dig dependencies retain the adjacent tunnel, never an unbuilt upper room.
   const local=p.buildAction==='excavate'?p.deps.filter(id=>byId.get(id).buildAction==='excavate'):p.deps;
   p.deps=[...new Set([...local,...previous])];
   if(!p.view.overviewOnly){const l=view.levels.find(l=>l.id===p.view.level),front=view.geometry.find(a=>a.view.level===l.id&&a.view.clipPoints);p.view.actionOrder=front.view.order-3;}
  }
  previous=phase.parts.map(p=>p.id);
 }
 // Interior rock is behind the worker; the permanent front shell remains in front.
 for(const terrain of view.terrain){const front=view.geometry.find(a=>a.view.level===terrain.view.level&&a.view.clipPoints);terrain.view.order=front.view.order-5+(terrain.view.u+terrain.view.v)*.01;}
 plan.parts=phases.flatMap(phase=>phase.parts);
 plan.construction.experience.stages=phases.map(phase=>({label:phase.label,parts:phase.parts.map(p=>p.id)}));
 if(typeof module!=='undefined'&&module.exports)module.exports=plan;else root.TownBlueprints.push(plan);
})(globalThis);
