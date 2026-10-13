/* Load the optional 3D adapter only when a scene asks for it. */
(function(root){
 'use strict';
 const base=typeof document==='undefined'?null:new URL('.',document.currentScript.src);
 let pending=null,revision=0;const models=new Map(),assets=new Map();
 const key=v=>JSON.stringify([v.model,v.surfaces||{},v.background||null]);
 function ensure(plan){
  const v=plan?.construction?.view;if(v?.renderer!=='three'||!base)return Promise.resolve(false);
  if(!pending)pending=new Promise(resolve=>{const script=document.createElement('script');script.src=new URL('three-scene-runtime.js?v=20261013-windows',base).href;script.onload=()=>resolve(!!root.TownThreeRuntime);script.onerror=()=>resolve(false);document.head.append(script);});
  if(!models.has(v.model))models.set(v.model,fetch(new URL(v.model,base),{cache:'no-cache'}).then(r=>{if(!r.ok)throw Error('3D model unavailable');return r.json();}));
  const identity=key(v);
  if(!assets.has(identity)){
   const entry={ready:null,promise:null};assets.set(identity,entry);
   entry.promise=Promise.all([pending,models.get(v.model)]).then(async([ready,model])=>{
    if(!ready)return false;
    // Do not build an untextured scene while the authored surfaces are still downloading.
    await root.TownThreeRuntime.ensureSurfaces(v.surfaces||{},base,v.background);
    root.TownThreeRuntime.register(v.model,model);return true;
   }).catch(()=>false).then(ready=>{entry.ready=ready;revision++;return ready;});
  }
  return assets.get(identity).promise;
 }
 function loading(plan){const v=plan?.construction?.view;return v?.renderer==='three'&&assets.get(key(v))?.ready===null;}
 function draw(canvas,s,...args){
  const p=s.plan||root.TownBlueprints.find(p=>p.id===s.blueprint);if(!args[1])ensure(p);
  return assets.get(key(p.construction.view))?.ready===true&&root.TownThreeRuntime?.draw(canvas,s,...args)||false;
 }
 root.TownThreeRenderer={ensure,draw,loading,get revision(){return revision+(root.TownThreeRuntime?.revision||0);}};
})(globalThis);
