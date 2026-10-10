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
 function project(plan,[u,w,z=0]){const v=plan.construction.view,[a,b]=v.basis||[[v.tile[0]/2,v.tile[1]/2],[-v.tile[0]/2,v.tile[1]/2]];return [v.origin[0]+u*a[0]+w*b[0],v.origin[1]+u*a[1]+w*b[1]-z];}
 function point(plan,p){const a=p.view;return project(plan,a.anchor||[a.u+.5,a.v+.5,a.z||0]);}
 function pathPoint(plan,x){const a=plan.construction.view.path;let i=a.findIndex(p=>p[0]>=x);if(i<1)i=i===0?1:a.length-1;const l=a[i-1],r=a[i],t=Math.max(0,Math.min(1,(x-l[0])/(r[0]-l[0])));return [l[1]+(r[1]-l[1])*t,l[2]+(r[2]-l[2])*t];}
 function actorPoint(plan,s,p,index){
  const ground=pathPoint(plan,p.x),a=s.active;
  if(a?.workers.includes(index)&&a.target.y<272){
   const t=Math.max(0,Math.min(1,(272-p.y)/(272-a.target.y))),view=a.part.view,dest=view.standAnchor?project(plan,view.standAnchor):point(plan,a.part);
   return [ground[0]+(dest[0]-ground[0])*t,ground[1]+(dest[1]+(view.standAnchor?0:view.z||0)-ground[1])*t];
  }return ground;
 }
 function sprite(c,v,key,x,y,w,h,fit=false){
  const img=images.get(v.textures[key]);
  if(img&&fit){const scale=Math.min(w/img.width,h/img.height);w=img.width*scale;h=img.height*scale;}
  if(img)c.drawImage(img,x-w/2,y-h,w,h);
  else{c.fillStyle=key==='stone'?'#b8b3a1':'#ba9056';c.fillRect(x-w/2,y-h,w,h);}
 }
 function partSprite(c,v,a,x,y){
  c.save();c.translate(x,y);if(a.flipX)c.scale(-1,1);
  if(a.crop){const [col,row,cols,rows]=a.crop;c.beginPath();c.rect(-a.width/2+col*a.width/cols,-a.height+row*a.height/rows,a.width/cols+.03,a.height/rows+.03);c.clip();}
  if(a.skewY)c.transform(1,a.skewY,0,1,0,0);
  sprite(c,v,a.texture,0,a.skewY?Math.abs(a.skewY)*a.width/2:0,a.width,a.height,a.fit);c.restore();
 }
 function polygon(c,q,padding=0,begin=true){
  if(!padding){if(begin)c.beginPath();c.moveTo(...q[0]);for(const p of q.slice(1))c.lineTo(...p);c.closePath();return;}
  const area=q.reduce((s,p,i)=>s+p[0]*q[(i+1)%q.length][1]-p[1]*q[(i+1)%q.length][0],0),sign=area>=0?1:-1;
  const normals=q.map((p,i)=>{const b=q[(i+1)%q.length],dx=b[0]-p[0],dy=b[1]-p[1],length=Math.hypot(dx,dy);return [sign*dy/length,-sign*dx/length];});
  const points=q.map((p,i)=>{const prev=(i+q.length-1)%q.length,a=normals[prev],b=normals[i],da=Array.isArray(padding)?padding[prev]:padding,db=Array.isArray(padding)?padding[i]:padding,det=a[0]*b[1]-a[1]*b[0];if(Math.abs(det)<1e-10)return [p[0]+b[0]*db,p[1]+b[1]*db];return [p[0]+(da*b[1]-db*a[1])/det,p[1]+(a[0]*db-b[0]*da)/det];});
  if(begin)c.beginPath();c.moveTo(...points[0]);for(const p of points.slice(1))c.lineTo(...p);c.closePath();
 }
 // Intersect in world space before projection; preserve the original texture transform.
 function clipSection(points,height){
  if(!Number.isFinite(height))return points;
  const result=[];for(let i=0;i<points.length;i++){
   const a=points[i],b=points[(i+1)%points.length],inside=a[2]<height,next=b[2]<height;
   if(inside)result.push(a);
   if(inside!==next){const t=(height-a[2])/(b[2]-a[2]);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t,height]);}
  }return result;
 }
 function sectionHeight(v,level){return v.sectionMode==='horizontal'&&level!=null?v.levels.find(a=>a.id===level)?.cutElevation:undefined;}
 function face(c,plan,f,joints,cut){
  if(f.hiddenBy&&joints?.has(JSON.stringify(f.hiddenBy)))return;
  const clipped=clipSection(f.clipPoints||f.points,cut);if(clipped.length<3)return;
  const [p0,p1,,p3]=(f.texturePlane||f.points).map(p=>project(plan,p)),[u,w,du,dw]=f.uv||[0,0,1,1],img=images.get(plan.construction.view.textures[f.texture]);
  // The three shared corners define an affine surface. No independent sprite trimming or shear.
  const iw=img?.width||1,ih=img?.height||1,ax=(p1[0]-p0[0])/(du*iw),ay=(p1[1]-p0[1])/(du*iw),bx=(p3[0]-p0[0])/(dw*ih),by=(p3[1]-p0[1])/(dw*ih);
  c.save();if(f.texturePlane||f.clipPoints||Number.isFinite(cut)){const padding=f.seamJoints?.length===clipped.length?f.seamJoints.map(id=>id&&joints?.has(JSON.stringify(id))?1:0):f.clipPadding||0;polygon(c,clipped.map(p=>project(plan,p)),padding);c.clip();}
  c.transform(ax,ay,bx,by,p0[0]-ax*u*iw-bx*w*ih,p0[1]-ay*u*iw-by*w*ih);
  const x=u*iw,y=w*ih,width=du*iw,height=dw*ih,overlap=.006;
  c.fillStyle=img?c.createPattern(img,'repeat'):(f.color||'#bc9863');c.fillRect(x-overlap*iw,y-overlap*ih,width+2*overlap*iw,height+2*overlap*ih);
  if(f.shade){c.globalAlpha=f.shade;c.fillStyle=f.shadeColor||'#332411';c.fillRect(x-overlap*iw,y-overlap*ih,width+2*overlap*iw,height+2*overlap*ih);}c.restore();
  if(f.outline){const q=clipped.map(p=>project(plan,p));c.save();c.strokeStyle=f.outline.color;c.lineWidth=f.outline.width;c.lineJoin='round';c.lineCap='round';c.beginPath();for(const [a,b]of f.outline.edges||q.map((_,i)=>[i,(i+1)%q.length])){if(q[a]&&q[b]){c.moveTo(...q[a]);c.lineTo(...q[b]);}}c.stroke();c.restore();}
 }
 function surfaceSprite(c,plan,a){
  const img=images.get(plan.construction.view.textures[a.texture]);if(!img)return;
  const source=a.surface.uv.map(([u,w])=>[u*img.width,w*img.height]),target=a.surface.points.map(p=>project(plan,p));
  c.save();polygon(c,target);c.clip();
  for(const ids of [[0,1,2],[0,2,3]]){
   const [s0,s1,s2]=ids.map(i=>source[i]),[t0,t1,t2]=ids.map(i=>target[i]);
   const ux=s1[0]-s0[0],uy=s1[1]-s0[1],vx=s2[0]-s0[0],vy=s2[1]-s0[1],det=ux*vy-uy*vx;
   const ax=((t1[0]-t0[0])*vy-(t2[0]-t0[0])*uy)/det,bx=((t2[0]-t0[0])*ux-(t1[0]-t0[0])*vx)/det;
   const ay=((t1[1]-t0[1])*vy-(t2[1]-t0[1])*uy)/det,by=((t2[1]-t0[1])*ux-(t1[1]-t0[1])*vx)/det;
   c.save();polygon(c,[t0,t1,t2],.25);c.clip();c.transform(ax,ay,bx,by,t0[0]-ax*s0[0]-bx*s0[1],t0[1]-ay*s0[0]-by*s0[1]);c.drawImage(img,0,0);c.restore();
  }c.restore();
 }
 function surfaceCell(a){
  if(!a.crop)return a.surface.points;
  const [col,row,cols,rows]=a.crop,q=a.surface.points;
  const at=(u,v)=>q[0].map((_,i)=>(1-v)*((1-u)*q[0][i]+u*q[1][i])+v*((1-u)*q[3][i]+u*q[2][i]));
  return [at(col/cols,row/rows),at((col+1)/cols,row/rows),at((col+1)/cols,(row+1)/rows),at(col/cols,(row+1)/rows)];
 }
 function clipBillboard(c,x,y,z,cut,width,height){
  if(!Number.isFinite(cut))return;const boundary=y+z-cut,top=Math.max(y-height,boundary);c.beginPath();c.rect(x-width,top,width*2,Math.max(0,y-top));c.clip();
 }
 function part(c,plan,p,joints,cut,group){const a=p.view;c.save();
  if(a.imageRect&&images.has(plan.construction.view.textures[a.texture])){
   if(a.imageClip){c.beginPath();c.rect(...a.imageClip);c.clip();}
   if(group){c.beginPath();for(const item of group)polygon(c,item.view.clipPoints.map(q=>project(plan,q)),item.view.clipPadding||0,false);c.clip();}
   else if(a.clipPoints){polygon(c,a.clipPoints.map(q=>project(plan,q)),a.clipPadding||0);c.clip();}
   c.drawImage(images.get(plan.construction.view.textures[a.texture]),...a.imageRect);
  }
  else if(a.faces){for(const f of a.faces)face(c,plan,f,joints,cut);}
  else if(a.fallbackFaces&&!images.has(plan.construction.view.textures[a.texture])){for(const f of a.fallbackFaces)face(c,plan,f,joints,cut);}
  else if(a.surface){const q=clipSection(surfaceCell(a),cut);if(q.length>=3){polygon(c,q.map(p=>project(plan,p)));c.clip();surfaceSprite(c,plan,a);}}
  else{const [x,y]=point(plan,p);if(a.anchor)clipBillboard(c,x,y,a.anchor[2],cut,a.width,a.height);partSprite(c,plan.construction.view,a,x,y);}
  const solid=a.sectionSolid;if(solid&&Number.isFinite(cut)&&cut>solid.zRange[0]&&cut<solid.zRange[1]){const points=solid.footprint.map(([u,v])=>[u,v,cut]);face(c,plan,{points,texture:solid.texture,color:solid.color,uv:solid.uv||[0,0,1,1]},null);}
  c.restore();
 }
 function receiverPath(c,plan,parts,cut){
  const faces=parts.filter(p=>p.view.receivesLight).flatMap(p=>p.view.faces||[]);if(!faces.length)return false;
  c.beginPath();for(const f of faces){const q=clipSection(f.clipPoints||f.points,cut).map(p=>project(plan,p));if(q.length<3)continue;c.moveTo(...q[0]);for(const p of q.slice(1))c.lineTo(...p);c.closePath();}return true;
 }
 function illumination(c,plan,parts,time,lights=parts,cut){
  for(const p of lights){const a=p.view.light;if(!a||Number.isFinite(cut)&&a.anchor[2]>=cut)continue;c.save();if(!receiverPath(c,plan,parts,cut)){c.restore();continue;}c.clip();
   const [x,y]=project(plan,a.anchor),radius=a.radius*(1+Math.sin(time*5)*((a.pulse)||0)),gradient=c.createRadialGradient(x,y,0,x,y,radius);
   for(const [at,color]of a.stops)gradient.addColorStop(at,color);c.fillStyle=gradient;c.fillRect(x-radius,y-radius,radius*2,radius*2);c.restore();
  }
 }
 function depth(plan,p){const a=p.view,q=a.anchor||[a.u+.5,a.v+.5];return a.order??(project(plan,[q[0],q[1],0])[1]+(a.depthOffset||0));}
 function visible(view,level,v){
  if(level==null)return view.singleLevelOnly!==true;
  if(!['horizontal','stacked'].includes(v?.sectionMode))return !view.overviewOnly&&(view.level===undefined||view.level===level);
  const selected=v.levels.find(a=>a.id===level);if(!selected)return false;
  const owner=v.levels.find(a=>a.id===view.level);
  if(owner&&owner.elevation>selected.elevation)return false;
  if(v.sectionMode==='stacked')return !view.overviewOnly;
  const cut=selected.cutElevation,range=view.zRange||view.sectionSolid?.zRange;
  return !Number.isFinite(cut)||!range||range[0]<cut;
 }
 const bounds=plan=>[0,0,...(plan?.construction?.view?.worldSize||[480,304])];
 function backdrop(c,shapes,time){
  for(const a of shapes||[]){c.save();c.globalAlpha=a.opacity??1;c.translate(Math.sin(time*.2+(a.x||0))*(a.drift||0),0);c.beginPath();
   if(a.ellipse)c.ellipse(...a.ellipse,0,0,Math.PI*2);
   else if(a.points){c.moveTo(...a.points[0]);for(const p of a.points.slice(1))c.lineTo(...p);if(!a.open)c.closePath();}
   if(a.fill){c.fillStyle=a.fill;c.fill();}if(a.stroke){c.strokeStyle=a.stroke;c.lineWidth=a.width||1;c.lineJoin='round';c.lineCap='round';c.stroke();}c.restore();
  }
 }
 function draw(canvas,s,clock=0,preview=false,camera=null,weather,level=null){
  const plan=s.plan||root.TownBlueprints.find(p=>p.id===s.blueprint),v=plan.construction.view;
  if(!preview)ensure(plan);const c=canvas.getContext('2d'),[vx,vy,vw,vh]=preview||!camera?bounds(plan):camera,time=preview?0:clock,[,,worldW,worldH]=bounds(plan),cut=sectionHeight(v,level),shown=a=>visible(a,level,v);
  c.save();const bg=images.get(v.background);
  if(v.backgroundFixed){c.setTransform(1,0,0,1,0,0);c.fillStyle=v.sky||'#65bfc3';c.fillRect(0,0,canvas.width,canvas.height);if(bg)c.drawImage(bg,0,0,canvas.width,canvas.height);}
  c.setTransform(canvas.width/vw,0,0,canvas.height/vh,-vx*canvas.width/vw,-vy*canvas.height/vh);c.imageSmoothingEnabled=true;
  if(!v.backgroundFixed){c.fillStyle=v.sky||'#65bfc3';c.fillRect(0,0,worldW,worldH);if(bg)c.drawImage(bg,0,0,worldW,worldH);}
  backdrop(c,(v.backdrop||[]).filter(shown),time);
  const completed=new Set((preview?plan.parts:s.installed).map(p=>p.id));
  const terrain=(v.terrain||[]).filter(a=>shown(a.view)&&!completed.has(a.clearBy));
  // Water movement stays over ocean and the pond, never moving land or parts.
  c.strokeStyle='#d1f0d055';c.lineWidth=.6;
  if(v.ripples){for(const [i,a]of v.ripples.entries()){c.beginPath();c.ellipse(a.x,a.y+Math.sin(time*.9+i),a.rx+Math.sin(time+i),a.ry,0,0,Math.PI);c.stroke();}}
  else{for(let i=0;i<12;i++){const x=20+i*39,y=288+Math.sin(time*.9+i)*2;c.beginPath();c.ellipse(x,y,7,1.4,0,0,Math.PI);c.stroke();}
   c.beginPath();c.ellipse(381,90,7+Math.sin(time)*2,2,0,0,Math.PI*2);c.stroke();}
  const layers=[],harvest=!preview&&root.TownWildGather.sample(s.wilderness);
  for(const a of [...(v.fallbackGeometry||v.geometry||[]),...terrain])if(shown(a.view))layers.push({depth:depth(plan,a),draw:()=>part(c,plan,a,null,cut)});
  for(const a of v.scenery||[]){
   if(!shown(a))continue;
   const tree=s.wilderness?.trees?.find(t=>t.x===a.source),key=tree?.felled?'stump':a.texture;
   const exhausted=a.resource&&s.wilderness?.remaining[a.resource]===0;
   if(exhausted)continue;
   layers.push({depth:a.y,draw:()=>{
    const falling=tree&&harvest?.treeId===tree.id&&harvest.phase==='fell';
    if(falling){c.save();c.translate(a.x,a.y);c.rotate(-harvest.progress*Math.PI*.43);sprite(c,v,'tree',0,0,a.width,a.height);c.restore();}
    else{const sway=key==='tree'?Math.sin(time*1.2+a.x)*.7:0;sprite(c,v,key,a.x+sway,a.y,key==='stump'?26:a.width,key==='stump'?18:a.height);}
    if(tree?.felled&&tree.remaining>0&&!falling){const b=v.harvestRemnant;if(b)sprite(c,v,b.texture,a.x+b.offset[0],a.y+b.offset[1],...b.size);else{c.fillStyle='#8f643b';c.fillRect(a.x+12,a.y-4,22,5);c.fillStyle='#dfb675';c.beginPath();c.ellipse(a.x+34,a.y-1.5,2.5,3,0,0,Math.PI*2);c.fill();}}
   }});
  }
  const built=preview?plan.parts:s.installed,joints=new Set(built.filter(p=>p.view.joint).map(p=>JSON.stringify(p.view.joint)));
  let parts=built.filter(p=>shown(p.view)&&(!p.view.coveredBy||!joints.has(JSON.stringify(p.view.coveredBy))));
  if(parts.some(p=>p.view.faces))parts=[...parts.filter(p=>p.layer<2).sort((a,b)=>a.layer-b.layer||depth(plan,a)-depth(plan,b)),...parts.filter(p=>p.layer>=2)];
  const grouped=new Set();
  for(const p of parts){const [x,y]=point(plan,p),a=p.view;
   if(a.imageGroup&&images.has(v.textures[a.texture])){const key=JSON.stringify([a.imageGroup,a.texture,a.imageRect,a.level,a.order]);if(grouped.has(key))continue;grouped.add(key);const group=parts.filter(p=>p.view.imageGroup&&JSON.stringify([p.view.imageGroup,p.view.texture,p.view.imageRect,p.view.level,p.view.order])===key);layers.push({depth:depth(plan,p),draw:()=>part(c,plan,p,joints,cut,group)});continue;}
   const paint=()=>{c.save();if(a.shadow){c.save();if(a.shadow.clipReceivers&&receiverPath(c,plan,parts,cut))c.clip();c.fillStyle=a.shadow.color||'#31432c';c.globalAlpha=a.shadow.opacity;c.beginPath();
    if(a.shadow.points){const q=clipSection(a.shadow.points,cut).map(p=>project(plan,p));if(q.length>=3){c.moveTo(...q[0]);for(const p of q.slice(1))c.lineTo(...p);c.closePath();}}else c.ellipse(x,y-1,a.shadow.rx,a.shadow.ry,0,0,Math.PI*2);c.fill();c.restore();}part(c,plan,p,joints,cut);c.restore();};
   if(p.layer<2&&p.view.order===undefined)paint();else layers.push({depth:depth(plan,p),draw:paint});
  }
  illumination(c,plan,parts,time,parts.filter(p=>p.view.order===undefined),cut);
  for(const p of parts.filter(p=>p.view.light&&p.view.order!==undefined))layers.push({depth:depth(plan,p)+.1,draw:()=>illumination(c,plan,parts.filter(a=>a.view.level===p.view.level),time,[p],cut)});
  if(!preview){
   const pose=s.active&&root.TownCutawayMotion.sample(s.active),g=root.TownWildGather.sample(s.wilderness);
   for(const [i,p]of s.pets.entries()){
    const actorLevel=s.active?.workers.includes(i)?s.active.part.view.level:v.surfaceLevel;
    if(!shown({level:actorLevel}))continue;
    const action=s.active,acting=action?.workers.includes(i),travel=acting?Math.max(0,Math.min(1,(272-p.y)/(272-action.target.y))):0,actorZ=acting?(action.part.view.standAnchor?.[2]??action.part.view.z??0)*travel:0;
    if(Number.isFinite(cut)&&actorZ>=cut)continue;
    let [x,y]=actorPoint(plan,s,p,i);if(v.petStyle?.pixelSnap){x=Math.round(x);y=Math.round(y);}
    const working=s.active?.workers.includes(i),gathering=i===(s.wilderness?.active?.worker??1)&&g;
    const held=gathering?g.held:working?pose?.held:null,hammer=working&&pose?.hammer,walking=held||gathering||working;
    const [pw,ph]=v.petSize||[14,22],scale=ph/22;
    const actionOrder=working?(s.active.part.view.actionOrder??s.active.part.view.order):undefined;
    layers.push({depth:actionOrder===undefined?y+.1:actionOrder+.5,draw:()=>{
     c.save();clipBillboard(c,x,y,actorZ,cut,pw*2,ph+16*scale);
     c.fillStyle='#38513733';c.beginPath();c.ellipse(x,y,pw*.43,2*scale,0,0,Math.PI*2);c.fill();
     let bob=walking?Math.sin(s.time*8)*.65:0;if(v.petStyle?.pixelSnap)bob=Math.round(bob);
     c.save();c.imageSmoothingEnabled=v.petStyle?.smoothing??true;sprite(c,v,i?'fox':'bunny',x,y+bob,pw,ph);c.restore();
     if(held){c.fillStyle=held==='S'?'#939b96':held==='B'?'#a89950':'#9e6338';c.fillRect(x+3*scale,y-10*scale,7*scale,4*scale);}
     if(hammer||gathering&&['chop','cut','collect-stone'].includes(g.phase)){
      c.save();c.translate(x+6*scale,y-12*scale);c.rotate(Math.sin(s.time*12)*.7);c.scale(scale,scale);c.fillStyle='#895a30';c.fillRect(0,-9,2,10);c.fillStyle='#626f77';c.fillRect(-3,-10,7,3);c.restore();
     }
    }});
   }
   if(pose?.smoke&&shown(s.active.part.view)){const [x,y]=point(plan,s.active.part),order=s.active.part.view.actionOrder??s.active.part.view.order;layers.push({depth:order===undefined?400:order+.9,draw:()=>{c.save();clipBillboard(c,x,y,s.active.part.view.anchor?.[2]??s.active.part.view.z??0,cut,24,20);c.globalAlpha=pose.smoke*.55;c.fillStyle='#eee8c8';for(let i=0;i<5;i++){c.beginPath();c.arc(x-12+i*6,y-7-Math.sin(s.time*4+i)*4,5,0,Math.PI*2);c.fill();}c.restore();}});}
   for(const [k,n]of Object.entries(root.TownEngine.inventory(s).free)){if(!n||!shown({level:v.surfaceLevel}))continue;const [x,y]=pathPoint(plan,root.TownConstructionConfig.site(plan).piles[k]);c.fillStyle=k==='S'?'#8d9690':'#9b7044';for(let i=0;i<Math.min(n,6);i++)c.fillRect(x-8+i%3*6,y-2-Math.floor(i/3)*4,6,4);}
  }
  layers.sort((a,b)=>a.depth-b.depth);for(const a of layers)a.draw();
  // Use the shared weather controls and camera for this projection too.
  c.restore();if(canvas.dataset)canvas.dataset.lighting='canvas2d-diagonal';
  if(level===null||level===undefined||!(v.levels?.find(a=>a.id===level)?.underground))root.TownCutawayWeather?.draw(canvas,s,time,preview,camera,weather);
 }
 function roofMask(c,plan,parts){for(const p of parts)part(c,plan,p);}
 root.TownDiagonalRenderer={ensure,draw,point,project,pathPoint,actorPoint,roofMask,visible,bounds,clipSection,sectionHeight,surfaceCell,clipBillboard,get revision(){return revision;}};
})(globalThis);
