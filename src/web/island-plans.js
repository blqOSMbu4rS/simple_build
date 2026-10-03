(function(root){
 'use strict';
 const previous=typeof module!=='undefined'&&module.exports?require('./island-v6-plans.js'):root.TownBlueprints.find(p=>p.id==='island-stonewood-v6');
 const plan=JSON.parse(JSON.stringify(previous));
 plan.id=plan.signature=plan.silhouette='island-stonewood-v6-rug-v1';plan.replaces=[previous.id,...previous.replaces];
 plan.description='45° RPG 小岛 · 水平柱架 · 地毯对齐地板';
 for(const p of plan.parts.filter(p=>p.kind==='rug')){
  const a=p.view,[u,w]=a.anchor,du=p.id==='rug'?1.8:1.35,dw=p.id==='rug'?1.37:.98;
  a.surface={points:[[u-du,w-dw,10.05],[u,w-dw,10.05],[u,w,10.05],[u-du,w,10.05]],uv:[[.55,0],[1,.41],[.45,1],[0,.54]]};
 }
 if(typeof module!=='undefined'&&module.exports)module.exports=plan;else root.TownBlueprints.push(plan);
})(globalThis);
