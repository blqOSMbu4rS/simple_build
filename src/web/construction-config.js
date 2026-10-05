/* Scene-independent worksite and task contracts. Scene authors supply data only. */
(function(root){
 'use strict';
 const defaults={ground:272,origin:240,grid:16,piles:{W:68,S:107,C:146,B:146,D:185},
  timberPile:110,mudStation:132,rest:[{x:272,y:256},{x:295,y:256}],
  gathering:null,view:{scale:1,anchor:[0,0],display:[0,0],travel:[],mudDepth:0}};
 const copy=value=>JSON.parse(JSON.stringify(value));
 function site(plan){
  const config=plan?.construction||{};
  return {...copy(defaults),...copy(config),piles:{...defaults.piles,...config.piles},
   view:{...copy(defaults.view),...copy(config.view||{})}};
 }
 const action=part=>part?.buildAction||'install';
 const isTimber=(_plan,part)=>['team-lift','timber-lift'].includes(action(part));
 const isChinking=(_plan,part)=>action(part)==='seal';
 function target(plan,part){
  const config=site(plan);
  return part.workPoint?{...part.workPoint}:{x:config.origin+(part.x+part.w/2)*config.grid-(isTimber(plan,part)?0:12),y:Math.min(config.ground,config.ground-part.y*config.grid)};
 }
 function validate(plan){
  const config=site(plan),point=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.x>=0&&p.x<=480&&p.y>=0&&p.y<=272;
  // One logical coordinate system; scene placement is expressed by view data.
  if(config.ground!==272||config.origin!==240||config.grid!==16||
   ![...Object.values(config.piles),config.timberPile,config.mudStation].every(x=>Number.isFinite(x)&&x>=0&&x<=480)||config.rest.length!==2||!config.rest.every(point))throw Error('施工配置损坏');
  const g=config.gathering;
  if(g&&(!Number.isInteger(g.worker)||g.worker<0||g.worker>1||!Number.isInteger(g.multiplier)||g.multiplier<1||
   !['W','S','B','D'].every(k=>Number.isFinite(g.sources?.[k])&&g.sources[k]>=0&&g.sources[k]<=480)||
   (g.trees!==undefined&&!Array.isArray(g.trees))||![g.water,g.mix,...(g.trees||[])].every(x=>Number.isFinite(x)&&x>=0&&x<=480)))throw Error('采集配置损坏');
  const v=config.view,pair=p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite);
  if(v.levels){
   if(!Array.isArray(v.levels)||!v.levels.length||new Set(v.levels.map(a=>a.id)).size!==v.levels.length||v.levels.some(a=>typeof a.id!=='string'||!a.id||typeof a.label!=='string'||typeof a.name!=='string'||!Number.isFinite(a.elevation)||a.camera&&(!Array.isArray(a.camera)||a.camera.length!==4||!a.camera.every(Number.isFinite)||a.camera[2]<=0||a.camera[3]<=0)))throw Error('楼层配置损坏');
   if(plan.parts.some(p=>!v.levels.some(a=>a.id===p.view?.level)))throw Error('构件楼层缺失');
   if(v.terrain?.some(t=>!v.levels.some(a=>a.id===t.view?.level)||!plan.parts.some(p=>p.id===t.clearBy&&action(p)==='excavate')))throw Error('开挖地形配置损坏');
  }
  const exp=config.experience,feed=g?.supply;
  if(exp&&(exp.version!==1||!g||!feed||exp.stages!==undefined&&(!Array.isArray(exp.stages)||exp.stages.some(a=>typeof a.label!=='string'||!Array.isArray(a.parts)||a.parts.some(id=>!plan.parts.some(p=>p.id===id))))))throw Error('体验配置损坏');
  if(feed){
   if(!exp||feed.version!==1||!['W','S','B','D'].every(k=>{const a=feed.kinds?.[k];return a&&Number.isInteger(a.buffer)&&a.buffer>=0&&a.buffer<=100&&Number.isInteger(a.cap)&&a.cap>=2&&a.cap<=240&&a.buffer<=a.cap&&Number.isInteger(a.batch)&&a.batch>=1&&a.batch<=a.cap&&a.batch<=100&&Array.isArray(a.periods)&&a.periods.length>0&&a.periods.every(n=>Number.isFinite(n)&&n>0);})||!feed.manual||Object.entries(feed.manual).some(([k,a])=>!['W','S','B','D'].includes(k)||!Number.isInteger(a.units)||a.units<1||a.units>100||!Number.isFinite(a.seconds)||a.seconds<=0))throw Error('供料配置损坏');
  }
  if(v.resources!==undefined&&(!Array.isArray(v.resources)||v.resources.some(a=>!['W','S','B','D'].includes(a.kind)||!pair(a.point)||!Number.isFinite(a.radius)||a.radius<=0||a.source!==undefined&&!g?.trees?.includes(a.source))))throw Error('资源交互配置损坏');
  if(!Number.isFinite(v.scale)||v.scale<=0||!pair(v.anchor)||!pair(v.display)||!Number.isFinite(v.mudDepth)||
   !Array.isArray(v.travel)||v.travel.some((p,i)=>!pair(p)||(i>0&&p[0]<=v.travel[i-1][0])))throw Error('施工显示配置损坏');
  for(const part of plan.parts){
   if(!['install','team-lift','timber-lift','seal','excavate'].includes(action(part))||part.workPoint&&!point(part.workPoint))throw Error('施工动作配置损坏');
   if(action(part)==='excavate'&&Object.values(part.cost).some(n=>n!==0))throw Error('开挖不应消耗建筑材料');
   if(isTimber(plan,part)&&(Object.keys(part.cost).some(k=>k!=='W'&&part.cost[k])||part.cost.W!==(action(part)==='timber-lift'?2:1)))throw Error('合抬材料配置损坏');
   if(action(part)==='timber-lift'&&(!part.longTimber||!Number.isFinite(part.longTimber.length)||part.longTimber.length<=8||!Number.isFinite(part.longTimber.diameter)||part.longTimber.diameter<=0))throw Error('圆木任务配置损坏');
   if(action(part)==='seal'&&(part.cost.D!==1||Object.values(part.cost).reduce((a,b)=>a+b,0)!==1))throw Error('泥封任务配置损坏');
  }
  return config;
 }
 const api={site,action,isTimber,isChinking,target,validate};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownConstructionConfig=api;
})(globalThis);
