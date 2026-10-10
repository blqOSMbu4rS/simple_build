/* Load the optional 3D adapter only when a scene asks for it. */
(function(root){
 'use strict';
 const base=typeof document==='undefined'?null:new URL('.',document.currentScript.src);
 let pending=null,revision=0;const models=new Map();
 function ensure(plan){
  const v=plan?.construction?.view;if(v?.renderer!=='three'||!base)return Promise.resolve(false);
  if(!pending)pending=new Promise(resolve=>{const script=document.createElement('script');script.src=new URL('three-scene-runtime.js?v=20261010-anime',base).href;script.onload=()=>resolve(!!root.TownThreeRuntime);script.onerror=()=>resolve(false);document.head.append(script);});
  if(!models.has(v.model))models.set(v.model,Promise.all([pending,fetch(new URL(v.model,base)).then(r=>{if(!r.ok)throw Error('3D model unavailable');return r.json();})]).then(async([ready,model])=>{if(!ready)return false;root.TownThreeRuntime.register(v.model,model);await root.TownThreeRuntime.ensureSurfaces(v.surfaces||{},base,v.background);revision++;return true;}).catch(()=>false));
  return models.get(v.model);
 }
 function draw(canvas,s,...args){const p=s.plan||root.TownBlueprints.find(p=>p.id===s.blueprint);if(!args[1])ensure(p);return root.TownThreeRuntime?.draw(canvas,s,...args)||false;}
 root.TownThreeRenderer={ensure,draw,get revision(){return revision+(root.TownThreeRuntime?.revision||0);}};
})(globalThis);
