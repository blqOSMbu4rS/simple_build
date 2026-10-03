/* Authored shared-edge surfaces; all construction and projection remain generic. */
(function(root){
 'use strict';
 const previous=typeof module!=='undefined'&&module.exports?require('./island-v2-plans.js'):root.TownBlueprints.find(p=>p.id==='island-stonewood-v2');
 const plan=JSON.parse(JSON.stringify(previous)),v=plan.construction.view;
 plan.id=plan.signature=plan.silhouette='island-stonewood-v3';plan.replaces=[previous.id,previous.replaces];
 plan.description='45° RPG 小岛 · 连续石木结构 · 温暖室内';
 const keys=['floor','stone','plaster','timber'];for(const key of keys)v.textures['surface-'+key]='assets/island/v3/'+key+'.webp';
 // All corners use u/v grid coordinates and a common vertical height in display pixels.
 function box(u0,v0,u1,v1,z0,z1,texture,top=texture){return [
  {points:[[u0,v0,z1],[u1,v0,z1],[u1,v1,z1],[u0,v1,z1]],texture:top,uv:[u0,v0,u1-u0,v1-v0],shade:.02},
  {points:[[u0,v1,z1],[u1,v1,z1],[u1,v1,z0],[u0,v1,z0]],texture,uv:[u0,-z1/20,u1-u0,(z1-z0)/20],shade:.12},
  {points:[[u1,v1,z1],[u1,v0,z1],[u1,v0,z0],[u1,v1,z0]],texture,uv:[-v1,-z1/20,v1-v0,(z1-z0)/20],shade:.23}
 ];}
 const stone='surface-stone',wood='surface-timber',plaster='surface-plaster';
 for(const p of plan.parts){const a=p.view,u=p.x,w=p.y;
  if(['foundation','floor'].includes(p.kind)){
   const floor=p.kind==='floor',z=floor?10:0,tag=floor?'floor':'base';a.anchor=[u+.5,w+.5,z];a.standAnchor=[u+.5,w+.5,z];a.joint=[u,w,z,tag];
   a.faces=box(u,w,u+1,w+1,floor?8:0,floor?10:8,floor?wood:stone,floor?'surface-floor':stone);
   if(floor)a.faces[0].uv=[u/2,w/2,.5,.5];
   a.faces[1].hiddenBy=[u,w+1,z,tag];a.faces[2].hiddenBy=[u+1,w,z,tag];
  }else if(p.kind==='wall'){
   const back=p.material==='W',alongU=['wall-right','front-right'].includes(a.texture);
   const u0=back?u:alongU?u:5.85,v0=back?w:alongU?4.85:w,u1=alongU?u0+1:u0+.15,v1=alongU?v0+.15:v0+1;
   const tag=(back?'back':'front')+(alongU?'-u':'-v'),next=[alongU?u+1:u,alongU?w:w+1,10,tag];a.joint=[u,w,10,tag];
   a.anchor=[(u0+u1)/2,(v0+v1)/2,10];a.standAnchor=[back?u+.5:Math.min(u+.5,5.5),back?w+.5:Math.min(w+.5,4.5),10];
   a.faces=box(u0,v0,u1,v1,10,back?54:27,back?plaster:stone);a.faces[alongU?2:1].hiddenBy=next;
   if(back){
    const post=alongU?box(u0,v0,u0+.09,v1+.015,10,54,wood):box(u0,v0,u1+.015,v0+.09,10,54,wood);
    const end=alongU?box(u1-.09,v0,u1,v1+.015,10,54,wood):box(u0,v1-.09,u1+.015,v1,10,54,wood);
    for(const f of end)f.hiddenBy=next;a.faces.push(...post,...end);
   }else a.faces.push(...box(u0,v0,u1,v1,27,29,wood));
  }else if(p.kind==='roof'){
   const alongU=a.texture==='beam-right';a.anchor=[u+.5,w+.5,54];a.standAnchor=[u+.5,w+.5,10];
   a.faces=box(u,w,alongU?u+1:u+.19,alongU?w+.19:w+1,54,57,wood);
  }else if(p.kind==='steps'){
   a.anchor=[2.5,5.45,0];a.standAnchor=[2.5,5.7,0];
   a.faces=[...box(2,5,3,5.45,0,7,stone),...box(2,5.45,3,5.9,0,3.5,stone)];
  }else if(p.kind==='door')a.anchor=[2.5,5,10];
  else if(p.kind==='window'){a.anchor=[.13,.8,30];a.width=22;a.height=26;}
  else if(p.kind==='decoration')a.anchor=[2.5,.13,26];
  else a.anchor=[a.u+.5,a.v+.5,a.z||0];
  if(a.faces){delete a.shadow;delete a.skewY;delete a.flipX;}
 }
 const used=new Set(plan.parts.flatMap(p=>p.view.faces?p.view.faces.map(f=>f.texture):[p.view.texture]));
 for(const key of ['tree','stump','rock','bunny','fox'])used.add(key);
 v.textures=Object.fromEntries(Object.entries(v.textures).filter(([key])=>used.has(key)));
 if(typeof module!=='undefined'&&module.exports)module.exports=plan;else root.TownBlueprints.push(plan);
})(globalThis);
