/* A new experience contract; all earlier plans remain immutable. */
(function(root){
 'use strict';
 const old=typeof module!=='undefined'&&module.exports?require('./island-plans.js'):root.TownBlueprints.find(p=>p.id==='island-stonewood-v6-rug-v1');
 const p=JSON.parse(JSON.stringify(old));
 p.id=p.signature=p.silhouette='island-stonewood-experience-v1';p.replaces=[old.id,...old.replaces];
 p.description='自动供料 · 正常 / 双倍施工 · 点选树木或石头可选助力';
 const groups=[['地基就绪',['foundation','floor']],['柱架立起',['column','roof']],['墙体合拢',['wall']],['室内布置完成',null]];
 p.construction.experience={version:1,stages:groups.map(([label,kinds])=>({label,parts:p.parts.filter(a=>!kinds||kinds.includes(a.kind)).map(a=>a.id)}))};
 p.construction.gathering.supply={version:1,kinds:{
  W:{buffer:8,cap:16,batch:2,periods:[10,10,10,10]},S:{buffer:12,cap:16,batch:2,periods:[9,9,9,9]},B:{buffer:6,cap:12,batch:2,periods:[6,6,6,6]},D:{buffer:0,cap:10,batch:2,periods:[9,9,9,9]}
 },manual:{W:{units:3,seconds:2.5},S:{units:3,seconds:2.5}}};
 // Hit areas are display data; the interaction module knows neither projection nor theme.
 p.construction.view.resources=p.construction.view.scenery.map(a=>({kind:a.resource||'W',point:[a.x,a.y-a.height/3],radius:Math.max(14,a.width/2),...(a.source!==undefined?{source:a.source}:{})}));
 if(typeof module!=='undefined'&&module.exports)module.exports=p;else root.TownBlueprints.push(p);
})(globalThis);
