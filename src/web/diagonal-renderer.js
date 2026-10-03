/* Data-driven sprite projection, shared by any diagonal scene. No theme modules required. */
(function(root){
 'use strict';
 const images=new Map(),pending=new Map(),loads=new WeakMap();let revision=0;
 const base=typeof document==='undefined'?null:new URL('.',document.currentScript.src);
 function ensure(plan){
  const v=plan?.construction?.view;if(v?.projection!=='diagonal')return Promise.resolve();
  if(loads.has(v))return loads.get(v);
  const promise=Promise.all([v.background,...Object.values(v.textures||{})].filter(Boolean).map(url=>{
   if(!pending.has(url))pending.set(url,new Promise(resolve=>{const img=new Image();img.onload=()=>{images.set(url,img);revision++;resolve();};img.onerror=()=>resolve();img.src=base?new URL(url,base).href:url;}));
   return pending.get(url);
  }));loads.set(v,promise);return promise;
 }
 function point(plan,p){const v=plan.construction.view,a=p.view;return [v.origin[0]+(a.u-a.v)*v.tile[0]/2,v.origin[1]+(a.u+a.v+1)*v.tile[1]/2-(a.z||0)];}
 function pathPoint(plan,x){const a=plan.construction.view.path;let i=a.findIndex(p=>p[0]>=x);if(i<1)i=i===0?1:a.length-1;const l=a[i-1],r=a[i],t=Math.max(0,Math.min(1,(x-l[0])/(r[0]-l[0])));return [l[1]+(r[1]-l[1])*t,l[2]+(r[2]-l[2])*t];}
 function actorPoint(plan,s,p,index){
  const ground=pathPoint(plan,p.x),a=s.active;
  if(a?.workers.includes(index)&&a.target.y<272){
   const t=Math.max(0,Math.min(1,(272-p.y)/(272-a.target.y))),dest=point(plan,a.part);
   return [ground[0]+(dest[0]-ground[0])*t,ground[1]+(dest[1]+(a.part.view.z||0)-ground[1])*t];
  }return ground;
 }
 function sprite(c,v,key,x,y,w,h){
  const img=images.get(v.textures[key]);
  if(img)c.drawImage(img,x-w/2,y-h,w,h);
  else{c.fillStyle=key==='stone'?'#b8b3a1':'#ba9056';c.fillRect(x-w/2,y-h,w,h);}
 }
 function partSprite(c,v,a,x,y){
  c.save();c.translate(x,y);if(a.flipX)c.scale(-1,1);
  if(a.skewY)c.transform(1,a.skewY,0,1,0,0);
  sprite(c,v,a.texture,0,a.skewY?Math.abs(a.skewY)*a.width/2:0,a.width,a.height);c.restore();
 }
 function draw(canvas,s,clock=0,preview=false,camera=null,weather){
  const plan=s.plan||root.TownBlueprints.find(p=>p.id===s.blueprint),v=plan.construction.view;
  ensure(plan);const c=canvas.getContext('2d'),[vx,vy,vw,vh]=preview||!camera?[0,0,480,304]:camera,time=preview?0:clock;
  c.save();c.setTransform(canvas.width/vw,0,0,canvas.height/vh,-vx*canvas.width/vw,-vy*canvas.height/vh);c.imageSmoothingEnabled=true;
  c.fillStyle='#65bfc3';c.fillRect(0,0,480,304);const bg=images.get(v.background);if(bg)c.drawImage(bg,0,0,480,304);
  // Water movement stays over ocean and the pond, never moving land or parts.
  c.strokeStyle='#d1f0d055';c.lineWidth=.6;
  if(v.ripples){for(const [i,a]of v.ripples.entries()){c.beginPath();c.ellipse(a.x,a.y+Math.sin(time*.9+i),a.rx+Math.sin(time+i),a.ry,0,0,Math.PI);c.stroke();}}
  else{for(let i=0;i<12;i++){const x=20+i*39,y=288+Math.sin(time*.9+i)*2;c.beginPath();c.ellipse(x,y,7,1.4,0,0,Math.PI);c.stroke();}
   c.beginPath();c.ellipse(381,90,7+Math.sin(time)*2,2,0,0,Math.PI*2);c.stroke();}
  const layers=[],harvest=!preview&&root.TownWildGather.sample(s.wilderness);
  for(const a of v.scenery||[]){
   const tree=s.wilderness?.trees?.find(t=>t.x===a.source),key=tree?.felled?'stump':a.texture;
   const exhausted=a.resource&&s.wilderness?.remaining[a.resource]===0;
   if(exhausted)continue;
   layers.push({depth:a.y,draw:()=>{
    const falling=tree&&harvest?.treeId===tree.id&&harvest.phase==='fell';
    if(falling){c.save();c.translate(a.x,a.y);c.rotate(-harvest.progress*Math.PI*.43);sprite(c,v,'tree',0,0,a.width,a.height);c.restore();}
    else{const sway=key==='tree'?Math.sin(time*1.2+a.x)*.7:0;sprite(c,v,key,a.x+sway,a.y,key==='stump'?26:a.width,key==='stump'?18:a.height);}
    if(tree?.felled&&tree.remaining>0&&!falling){c.fillStyle='#8f643b';c.fillRect(a.x+12,a.y-4,22,5);c.fillStyle='#dfb675';c.beginPath();c.ellipse(a.x+34,a.y-1.5,2.5,3,0,0,Math.PI*2);c.fill();}
   }});
  }
  const parts=preview?plan.parts:s.installed;
  for(const p of parts){const [x,y]=point(plan,p),a=p.view;
   const paint=()=>{c.save();if(a.shadow){c.fillStyle='#31432c';c.globalAlpha=a.shadow.opacity;c.beginPath();c.ellipse(x,y-1,a.shadow.rx,a.shadow.ry,0,0,Math.PI*2);c.fill();c.globalAlpha=1;}partSprite(c,v,a,x,y);c.restore();};
   if(p.layer<2)paint();else layers.push({depth:v.origin[1]+(a.u+a.v+1)*v.tile[1]/2+(a.depthOffset||0),draw:paint});
  }
  if(!preview){
   const pose=s.active&&root.TownCutawayMotion.sample(s.active),g=root.TownWildGather.sample(s.wilderness);
   for(const [i,p]of s.pets.entries()){
    const [x,y]=actorPoint(plan,s,p,i),working=s.active?.workers.includes(i),gathering=i===(s.wilderness?.active?.worker??1)&&g;
    const held=gathering?g.held:working?pose?.held:null,hammer=working&&pose?.hammer,walking=held||gathering||working;
    const [pw,ph]=v.petSize||[14,22],scale=ph/22;
    layers.push({depth:y+.1,draw:()=>{
     c.fillStyle='#38513733';c.beginPath();c.ellipse(x,y,pw*.43,2*scale,0,0,Math.PI*2);c.fill();
     const bob=walking?Math.sin(s.time*8)*.65:0;sprite(c,v,i?'fox':'bunny',x,y+bob,pw,ph);
     if(held){c.fillStyle=held==='S'?'#939b96':held==='B'?'#a89950':'#9e6338';c.fillRect(x+3*scale,y-10*scale,7*scale,4*scale);}
     if(hammer||gathering&&['chop','cut','collect-stone'].includes(g.phase)){
      c.save();c.translate(x+6*scale,y-12*scale);c.rotate(Math.sin(s.time*12)*.7);c.scale(scale,scale);c.fillStyle='#895a30';c.fillRect(0,-9,2,10);c.fillStyle='#626f77';c.fillRect(-3,-10,7,3);c.restore();
     }
    }});
   }
   if(pose?.smoke){const [x,y]=point(plan,s.active.part);layers.push({depth:400,draw:()=>{c.globalAlpha=pose.smoke*.55;c.fillStyle='#eee8c8';for(let i=0;i<5;i++){c.beginPath();c.arc(x-12+i*6,y-7-Math.sin(s.time*4+i)*4,5,0,Math.PI*2);c.fill();}c.globalAlpha=1;}});}
   for(const [k,n]of Object.entries(root.TownEngine.inventory(s).free)){if(!n)continue;const [x,y]=pathPoint(plan,root.TownConstructionConfig.site(plan).piles[k]);c.fillStyle=k==='S'?'#8d9690':'#9b7044';for(let i=0;i<Math.min(n,6);i++)c.fillRect(x-8+i%3*6,y-2-Math.floor(i/3)*4,6,4);}
  }
  layers.sort((a,b)=>a.depth-b.depth);for(const a of layers)a.draw();
  // Use the shared weather controls and camera for this projection too.
  c.restore();if(canvas.dataset)canvas.dataset.lighting='canvas2d-diagonal';
  root.TownCutawayWeather?.draw(canvas,s,time,preview,camera,weather);
 }
 function roofMask(c,plan,parts){const v=plan.construction.view;for(const p of parts){const [x,y]=point(plan,p);partSprite(c,v,p.view,x,y);}}
 root.TownDiagonalRenderer={ensure,draw,point,pathPoint,actorPoint,roofMask,get revision(){return revision;}};
})(globalThis);
