/* Continuous room surfaces and real roof-surface construction cells. */
(function(root){
 'use strict';
 const source=typeof module!=='undefined'&&module.exports?require('./mini-mountain-v2-plans.js'):root.TownBlueprints.find(p=>p.id==='mini-mountain-anime-v2');
 const p=JSON.parse(JSON.stringify(source)),v=p.construction.view,h=v.tile[0]/2;
 p.id=p.signature=p.silhouette='mini-mountain-anime-v3';p.replaces=[source.id,...source.replaces];
 p.description='原视角 45° · 连续木地板与墙面 · 按坡面逐格盖屋顶';
 v.textures['materials-v3']='assets/mini-mountain/v3/materials.webp';
 for(let rank=0;rank<3;rank++)for(const side of ['floor','north','south','west','east']){const key='rank-'+rank+'-'+side;v.textures[key]='assets/mini-mountain/v3/'+key+'.webp';}
 p.parts=p.parts.filter(a=>!a.view.overviewOnly);
 const colors={floor:'#e9b972',plaster:'#e7dac0',stone:'#aea4ad',wood:'#94633e'};
 const uv={floor:[0,0,.5,.5],plaster:[.5,0,.5,.5],stone:[0,.5,.5,.5],wood:[.5,.5,.5,.5]};
 function face(points,material,shade=0){return {points,clipPoints:points,texture:'materials-v3',uv:uv[material],color:colors[material],shade};}
 function box(u,w,width,depth,z,height,material){return [face([[u,w,z+height],[u+width,w,z+height],[u+width,w+depth,z+height],[u,w+depth,z+height]],material),face([[u,w+depth,z+height],[u+width,w+depth,z+height],[u+width,w+depth,z],[u,w+depth,z]],material,.12),face([[u+width,w+depth,z+height],[u+width,w,z+height],[u+width,w,z],[u+width,w+depth,z]],material,.22)];}
 const openings=[{'south:2':'window'},{'south:1':'window','east:2':'window'},{'south:1':'door','east:1':'window','north:2':'window'}];
 function wallFaces(a,level,side,segment,band){
  const horizontal=['north','south'].includes(side),base=level.elevation+.12*h,faces=[],opening=openings[Math.round(level.elevation/(1.55*h))][side+':'+(segment+2)],material=level.underground?'stone':'plaster';
  function panel(left,right,bottom,top,mat=material,thickness=.14,cap=1.43){bottom=Math.max(bottom,band);top=Math.min(top,band+1,cap);if(right<=left||top<=bottom)return;const outward=(thickness-.14)/2;
   const u=horizontal?segment+left:(side==='west'?-2.14:2)-outward,w=horizontal?(side==='north'?-2.14:2)-outward:segment+left;
   faces.push(...box(u,w,horizontal?right-left:thickness,horizontal?thickness:right-left,base+bottom*h,(top-bottom)*h,mat));
  }
  if(opening){const aperture=opening==='door'?.72:.58,left=(1-aperture)/2,lo=opening==='door'?0:.56,hi=opening==='door'?1.12:1.1;
   panel(0,left,0,1.43);panel(1-left,1,0,1.43);panel(left,1-left,0,lo);panel(left,1-left,hi,1.43);
   for(const x of [left,1-left-.04])panel(x,x+.04,lo,hi,'wood',.17);
   panel(left,1-left,hi-.025,hi+.025,'wood',.17);
   if(opening==='window'){panel(left,1-left,lo-.025,lo+.045,'wood',.25);panel(.4875,.5125,lo,hi,'wood',.06);panel(left,1-left,(lo+hi)/2-.0125,(lo+hi)/2+.0125,'wood',.06);}
  }else panel(0,1,0,1.43);
  panel(0,1,0,.07,'wood',.165);panel(0,1,1.375,1.45,'wood',.165,1.45);return faces;
 }
 for(const a of p.parts){const level=v.levels.find(l=>l.id===a.view.level),z=level.elevation;
  if(a.kind==='floor'){
   const [u,w]=[a.x,a.y];a.view.faces=box(u,w,1,1,z,.132*h,'floor');a.view.joint=[level.id,u,w];
   a.view.faces[0].texturePlane=[[-2,-2,z+.132*h],[2,-2,z+.132*h],[2,2,z+.132*h],[-2,2,z+.132*h]];a.view.faces[0].seamJoints=[[level.id,u,w-1],[level.id,u+1,w],[level.id,u,w+1],[level.id,u-1,w]];a.view.faces[0].texture='rank-'+Math.round(z/(1.55*h))+'-floor';a.view.faces[0].uv=[0,0,1,1];
   a.view.faces[1].hiddenBy=[level.id,u,w+1];a.view.faces[2].hiddenBy=[level.id,u+1,w];
  }else if(['wall','column'].includes(a.kind)){
   const side=a.x===-3?'west':a.x===2?'east':a.y===-3?'north':'south',axis=['north','south'].includes(side)?0:1,segment=axis===0?a.x:a.y,band=Math.round((a.view.z-z-.12*h)/h);
   if(a.kind==='wall'){a.view.faces=wallFaces(a,level,side,segment,band);a.view.joint=[level.id,'wall',side,segment,band];}
   if(a.kind==='column'&&a.view.faces[0].points[0][0]<0&&a.view.faces[0].points[0][1]<0)a.view.order=level.elevation/h/1.55*100+25;
   for(const f of a.view.faces){f.texture='materials-v3';f.clipPoints=f.points;
    if(a.kind==='wall'&&f.points.every(q=>Math.abs(q[axis]-(segment+1))<1e-8))f.hiddenBy=[level.id,'wall',side,segment+1,band];
    const material=f.uv[0]===.5&&f.uv[1]===.5?'wood':level.underground?'stone':'plaster';f.uv=uv[material];f.color=colors[material];if(material==='wood'){f.shade=(f.shade||0)+.2;f.clipPadding=.3;}
    const [a0,a1,,a3]=f.points,alongU=Math.abs(a1[0]-a0[0])>Math.abs(a1[1]-a0[1]);
    // Only vertical wall faces share a full side's material coordinate frame.
    if(a0[2]!==a3[2]&&a.kind==='wall'&&material!=='wood'){
     const axis=alongU?0:1,other=1-axis,top=z+1.55*h,bottom=z+.12*h;
     const point=(x,y)=>{const q=[0,0,y];q[axis]=x;q[other]=a0[other];return q;};
     const left=a1[axis]>a0[axis]?-2:2,right=-left;f.texturePlane=[point(left,top),point(right,top),point(right,bottom),point(left,bottom)];f.clipPadding=.3;
    }
   }
   // Projected semantic materials carry the reference's plaster, ivy and framing.
   for(const f of a.kind==='wall'?a.view.faces:[]){const [q0,q1,,q3]=f.points,faceAxis=Math.abs(q1[0]-q0[0])>Math.abs(q1[1]-q0[1])?0:1;if(q0[2]===q3[2]||faceAxis!==axis||f.uv[0]===.5&&f.uv[1]===.5)continue;const normal=1-axis,plane=['north','west'].includes(side)?-2:2.14,point=(t,z)=>{const q=[0,0,z];q[axis]=t;q[normal]=plane;return q;};f.texture='rank-'+Math.round(z/(1.55*h))+'-'+side;f.uv=[0,0,1,1];f.texturePlane=[point(-2.14,z+1.57*h),point(2.14,z+1.57*h),point(2.14,z+.12*h),point(-2.14,z+.12*h)];f.seamJoints=f.points.map((q,i)=>{const r=f.points[(i+1)%4],y=(q[2]-z-.12*h)/h;if(Math.abs(q[axis]-r[axis])<1e-8){if(Math.abs(q[axis]-segment)<1e-8)return [level.id,'wall',side,segment-1,band];if(Math.abs(q[axis]-segment-1)<1e-8)return [level.id,'wall',side,segment+1,band];}if(Math.abs(q[2]-r[2])<1e-8){if(Math.abs(y-band)<1e-8)return [level.id,'wall',side,segment,band-1];if(Math.abs(y-band-1)<1e-8)return [level.id,'wall',side,segment,band+1];}return null;});f.shade=0;}
  }
 }
 for(const a of p.parts.filter(a=>['stair','stair-section'].includes(a.kind))){const upper=p.parts.find(b=>b.kind==='stair'&&b.view.level===a.view.level).view.connectsTo;a.view.coveredBy=[upper,1,1];}
 // Furniture keeps the authored sprite coordinates and uses its real floor footprint.
 const placements={bed:[-2,-2,1,2],table:[0,0,1,1],cabinet:[0,-2,2,1],shelf:[-2,-2,2,1],'crate-a':[-2,0,1,1],'crate-b':[0,-1,1,1],bench:[-2,-2,2,1],'tool-cabinet':[1,-2,1,1]};
 for(const a of p.parts.filter(a=>a.kind==='furniture')){const siblings=p.parts.filter(b=>b.kind==='furniture'&&b.view.texture===a.view.texture),index=siblings.indexOf(a),[x,y,w,d]=placements[a.view.texture];a.x=x+index%w;a.y=y+Math.floor(index/w);a.view.u=a.x;a.view.v=a.y;a.view.standAnchor=[a.x+.5,a.y+.6,a.view.standAnchor[2]];a.workPoint.x=240+(a.x-a.y)*16;a.deps=a.deps.filter(id=>!p.parts.some(b=>b.id===id&&b.kind==='floor'));a.deps.push(p.parts.find(b=>b.kind==='floor'&&b.view.level===a.view.level&&b.x===a.x&&b.y===a.y).id);}
 // A traversable stair landing closes the visible floor edge without occupying its exit.
 for(const upper of v.levels.filter(l=>p.parts.some(a=>a.kind==='stair'&&a.view.connectsTo===l.id))){
  const stair=p.parts.find(a=>a.kind==='stair'&&a.view.connectsTo===upper.id),sample=p.parts.find(a=>a.kind==='floor'&&a.view.level===upper.id),a=JSON.parse(JSON.stringify(sample));a.id=upper.id+'-stair-landing';a.kind='landing';a.label='安装楼梯出口平台一格';a.x=a.y=1;a.deps=[stair.id,...sample.deps];a.workPoint={x:240,y:224};Object.assign(a.view,{u:1,v:1,anchor:[1.5,1.5,upper.elevation],standAnchor:[1.5,1.6,upper.elevation+.13*h],faces:box(1,1,1,1,upper.elevation,.132*h,'floor'),joint:[upper.id,1,1]});a.view.faces[0].texturePlane=[[-2,-2,upper.elevation+.132*h],[2,-2,upper.elevation+.132*h],[2,2,upper.elevation+.132*h],[-2,2,upper.elevation+.132*h]];a.view.faces[0].texture='rank-'+Math.round(upper.elevation/(1.55*h))+'-floor';a.view.faces[0].uv=[0,0,1,1];a.view.faces[0].clipPadding=.3;a.view.faces[1].hiddenBy=[upper.id,1,2];a.view.faces[2].hiddenBy=[upper.id,2,1];p.parts.push(a);
 }
 for(const landing of p.parts.filter(a=>a.kind==='landing')){landing.deps.push(...p.parts.filter(a=>a.kind==='floor'&&a.view.level===landing.view.level).map(a=>a.id));for(const column of p.parts.filter(a=>a.kind==='column'&&a.view.level===landing.view.level))column.deps.push(landing.id);}
 for(const a of p.parts.filter(a=>a.kind==='landing'))a.view.faces[0].seamJoints=[[a.view.level,1,0],[a.view.level,2,1],[a.view.level,1,2],[a.view.level,0,1]];
 const surface=v.levels.find(l=>l.id===v.surfaceLevel),roofBase=surface.elevation+1.55*h,half=2.24,rise=1.15,slopeLength=Math.hypot(half,rise),roof=[];
 const wallIds=p.parts.filter(a=>a.view.level===surface.id).map(a=>a.id);
 function addRoof(id,kind,u,w,z,material,faces,deps,extra={}){
  const a={id,kind,x:Math.floor(u),y:Math.floor(w),w:1,h:1,material,cost:{[material]:1},deps:[...new Set(deps)],seconds:1.2,workers:1,required:true,buildAction:'install',layer:2,label:'安装'+kind+'一格',workPoint:{x:240+(u-w)*16,y:224},view:{level:surface.id,u,v:w,z,anchor:[u,w,z],standAnchor:[u,w,z],order:300,actionOrder:310,overviewOnly:true,faces:extra.fallbackFaces||faces,clipPadding:1,...(extra.imageRect?{imageGroup:'roof-surfaces'}:{}),...extra}};roof.push(a);return a.id;
 }
 function silhouette(points){const project=q=>[v.origin[0]+(q[0]-q[1])*h,v.origin[1]+(q[0]+q[1])*v.tile[1]/2-q[2]],list=points.map(q=>({q,p:project(q)})).sort((a,b)=>a.p[0]-b.p[0]||a.p[1]-b.p[1]),cross=(a,b,c)=>(b.p[0]-a.p[0])*(c.p[1]-a.p[1])-(b.p[1]-a.p[1])*(c.p[0]-a.p[0]);const low=[],high=[];for(const a of list){while(low.length>1&&cross(low.at(-2),low.at(-1),a)<=0)low.pop();low.push(a);}for(const a of list.slice().reverse()){while(high.length>1&&cross(high.at(-2),high.at(-1),a)<=0)high.pop();high.push(a);}return [...low.slice(0,-1),...high.slice(0,-1)].map(a=>a.q);}
 function roofArt(faces){return {texture:'roof-assembly',imageRect:[0,0,768,768],clipPoints:silhouette(faces.flatMap(f=>f.clipPoints||f.points)),fallbackFaces:faces};}
 const gables=[];
 for(const side of [-1,1])for(let col=0;col<4;col++)for(let band=0;band<2;band++){
  const u=col-2,lo=band,hi=band+1,max=rise*2/half;
  const polygon=[[u,lo],[u+1,lo],[u+1,hi],[u,hi]];
  let clipped=polygon;for(const sign of [-1,1]){const result=[];for(let i=0;i<clipped.length;i++){const a=clipped[i],b=clipped[(i+1)%clipped.length],da=max-sign*a[0]*rise/half-a[1],db=max-sign*b[0]*rise/half-b[1];if(da>=0)result.push(a);if((da>=0)!==(db>=0)){const t=da/(da-db);result.push([a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t]);}}clipped=result;}
  if(clipped.length<3||Math.abs(clipped.reduce((sum,a,i)=>sum+a[0]*clipped[(i+1)%clipped.length][1]-a[1]*clipped[(i+1)%clipped.length][0],0))<1e-7)continue;
  const w=side<0?-2:2.14,points=[[u,w,roofBase+hi*h],[u+1,w,roofBase+hi*h],[u+1,w,roofBase+lo*h],[u,w,roofBase+lo*h]],f=face(points,'plaster');f.clipPoints=clipped.map(([x,y])=>[x,w,roofBase+y*h]);f.texturePlane=[[-2,w,roofBase+max*h],[2,w,roofBase+max*h],[2,w,roofBase],[-2,w,roofBase]];
  const center=clipped.reduce((sum,q)=>[sum[0]+q[0]/clipped.length,sum[1]+q[1]/clipped.length],[0,0]);
  gables.push(addRoof('gable-'+side+'-'+col+'-'+band,'gable',center[0],w,roofBase+center[1]*h,'W',side<0?[f]:[],band?[gables.at(-1)]:wallIds,{...(side>0?roofArt([f]):{}),standAnchor:[center[0],w-side*.25,roofBase]}));
 }
 // A square surface grid follows the slope. Boundary cells retain transparent trim.
 const panels=[];
 for(const sign of [-1,1])for(let row=0;row<6;row++)for(let col=0;col<3;col++){
  const w0=Math.max(-half,row-3),w1=Math.min(half,row-2);if(w0>=w1)continue;
  const d0=col,d1=Math.min(slopeLength,col+1),point=(d,w)=>[sign*d*half/slopeLength,w,roofBase+(rise-d*rise/slopeLength)*h];
  const points=[point(d0,w0),point(d1,w0),point(d1,w1),point(d0,w1)],f={points,clipPoints:points,texture:'roof-assembly',uv:points.map(q=>q),color:'#acc8b6'};
  // Original independent roof art is sampled through its actual projected panel.
  const corners=[];for(const d of [d0,d1])for(const w of [w0,w1])for(const normal of [-.0525,.09]){const q=point(d,w);corners.push([q[0]+sign*normal*rise/slopeLength,q[1],q[2]+normal*half/slopeLength*h]);}
  const u=sign*(d0+d1)/2*half/slopeLength,w=(w0+w1)/2,z=roofBase+(rise-(d0+d1)/2*rise/slopeLength)*h;
  const id=addRoof('roof-slope-'+sign+'-'+row+'-'+col,'roof',u,w,z,'S',[],gables,{texture:'roof-assembly',imageRect:[0,0,768,768],clipPoints:silhouette(corners),fallbackFaces:[{...f,texture:undefined,uv:undefined}],standAnchor:[u+sign*.0525*rise/slopeLength,w,z+.0525*half/slopeLength*h],surfaceGrid:{origin:[d0,w0],size:[d1-d0,w1-w0],slope:sign}});panels.push(id);
 }
 for(let row=0;row<4;row++)addRoof('roof-ridge-'+row,'ridge',0,row-1.5,roofBase+(rise+.03)*h,'W',[],panels,{...roofArt(box(-.08,row-2,.16,1,roofBase+(rise-.03)*h,.12*h,'wood')),standAnchor:[0,row-1.5,roofBase+(rise+.09)*h]});
 for(const sign of [-1,1])for(let row=0;row<6;row++){const w=Math.max(-half,row-3),end=Math.min(half,row-2);if(w>=end)continue;addRoof('roof-eave-'+sign+'-'+row,'eave',sign*half,(w+end)/2,roofBase,'W',[],panels,{...roofArt(box(sign*half-.05,w,.1,end-w,roofBase-.1*h,.16*h,'wood')),standAnchor:[sign*(half-.05),(w+end)/2,roofBase+.06*h]});}
 p.parts.push(...roof);p.costs={W:0,S:0,C:0,B:0,D:0};for(const a of p.parts)for(const [k,n]of Object.entries(a.cost))p.costs[k]+=n;
 const stages=p.construction.experience.stages;stages.at(-1).parts=roof.map(a=>a.id);for(const stage of stages.slice(2,-1)){const level=p.parts.find(a=>a.id===stage.parts[0]).view.level;stage.parts=p.parts.filter(a=>a.view.level===level&&a.buildAction!=='excavate'&&!a.view.overviewOnly).map(a=>a.id);}
 // Newly added landings also participate in the complete-stage barriers.
 for(let i=1;i<stages.length;i++)for(const id of stages[i].parts){const a=p.parts.find(a=>a.id===id);a.deps=[...new Set([...a.deps,...stages[i-1].parts])];}
 if(typeof module!=='undefined'&&module.exports)module.exports=p;else root.TownBlueprints.push(p);
})(globalThis);
