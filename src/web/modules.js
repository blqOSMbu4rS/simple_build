/* Versioned procedural grammar. Every placement references a reusable component.
 * Coordinates are structural 16px grid units; depth is a fixed screen projection. */
(function(root){
 'use strict';
 const kit={
  footing:{w:2,h:1,label:'铺设基础块',W:2,S:2},
  wall:{w:2,h:2,label:'拼装墙体',W:2,S:3},
  floor:{w:2,h:1,label:'安装承重楼板',W:2,S:2},
  gable:{w:1,h:1,label:'拼装山墙填充板',W:1},
  roofLeft:{w:1,h:1,label:'铺左坡屋面',W:1},
  roofRight:{w:1,h:1,label:'铺右坡屋面',W:1},
  parapet:{w:2,h:1,label:'安装石质城垛',S:2},
  door:{w:2,h:2,label:'安装入口门',W:2},
  window:{w:2,h:2,label:'安装窗与窗台',W:1},
  awning:{w:2,h:1,label:'挂起门口布篷',C:1},
  flag:{w:1,h:2,label:'升起屋顶旗帜',C:1},
  dormer:{w:2,h:1,label:'安装阁楼窗',W:1},
  clock:{w:2,h:2,label:'安装木制钟面',W:1},
  chimney:{w:1,h:2,label:'砌筑烟囱',S:2},
  banner:{w:1,h:2,label:'悬挂布饰',C:1},
  planter:{w:2,h:1,label:'摆好花箱',W:1},
  trellis:{w:1,h:2,label:'安装爬藤木架',W:1},
  bed:{w:2,h:1,label:'摆好床铺',W:2},
  shelf:{w:2,h:2,label:'安装书架',W:2},
  hearth:{w:2,h:2,label:'砌好壁炉',S:2}
 };
 function hash(text){let h=2166136261;for(const c of String(text))h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;}
 function generateV1(seed,budget={W:0,S:0,C:0},choice=0,artProfile=false){
  const recipe={version:1,seed:seed>>>0,budget:{W:budget.W||0,S:budget.S||0,C:budget.C||0},choice};
  const rand=k=>{let n=hash(recipe.seed+':'+choice+':'+k);n=Math.imul(n^(n>>>16),0x7feb352d);n=Math.imul(n^(n>>>15),0x846ca68b);return (n^(n>>>16))>>>0;};const stone=budget.S>budget.W,wood=budget.W||!budget.S;
  const wide=artProfile==='cutaway',width=(wide?6:3)+rand('width')%(wide?3:artProfile?3:4),heights=[];
  const high=(wide?2:artProfile?1:2)+rand('height')%(wide?1:artProfile?2:3);
  for(let x=0;x<width;x++)heights.push(Math.max(wide?1:artProfile?1:2,high-(rand('tier'+Math.floor(x/2))%2)+(x===Math.floor(width/2)&&rand('tower')%2?1:0)));
  // Never more than three adjacent roof bays: short ridges retain a readable silhouette.
  const groups=[];for(let x=0;x<width;){let end=x+1;while(end<width&&heights[end]===heights[x]&&end-x<3)end++;groups.push([x,end]);x=end;}
  const parts=[],costs={W:0,S:0,C:0};
  function add(id,asset,x,y,material,deps=[],extra={}){
   const def=kit[asset],c={id,kind:'module',asset,x,y,w:def.w,h:def.h,material,cost:{[material]:def[material]},deps,seconds:asset.startsWith('roof')?3.8:4.2,workers:asset==='floor'?2:1,required:true,layer:['door','window','awning','flag'].includes(asset)?5:2,label:def.label,...extra};
   if(!c.cost[material])throw Error('Unsupported module material');parts.push(c);costs[material]+=c.cost[material];return id;
  }
  const wallIds=[],tops=[],baseMat=stone||(artProfile&&budget.S>0)?'S':'W';
  for(let x=0;x<width;x++)add('base-'+x,'footing',x*2,0,baseMat);
  const maxHeight=Math.max(...heights);
  for(let level=0;level<maxHeight;level++)for(let x=0;x<width;x++)if(level<heights[x]){
   const previous=level?wallIds[x][level-1]:'base-'+x;
   if(!wallIds[x])wallIds[x]=[];
   // Stone always has stone below; timber upper stories cannot carry stone.
   const mat=stone&&(!wood||level<2)?'S':'W';
   const y=1+level*2+(level>=2?1:0);
   let support=previous;
   if(level===2)support=add('floor-'+x,'floor',x*2,5,mat,[previous]);
   wallIds[x][level]=add('wall-'+x+'-'+level,'wall',x*2,y,mat,[support],{side:x===width-1||heights[x+1]<=level,variant:rand('wall'+x+':'+level)%3});
   tops[x]=wallIds[x][level];
  }
  const roofColor=['red','blue','green'][rand('roof-color')%3];
  for(const [left,right]of groups){
   const height=heights[left],y=1+height*2+(height>2?1:0),support=tops.slice(left,right),span=right-left;
   if(stone&&!wood){for(let x=left;x<right;x++)add('cap-'+x,'parapet',x*2,y,'S',[tops[x]],{side:x===width-1||heights[x+1]<height});}
   else for(let i=0;i<span*2;i++){
    const slope=i<span,step=slope?i:span*2-1-i;
    let under=support;for(let j=0;j<step;j++)under=[add('gable-'+left+'-'+i+'-'+j,'gable',left*2+i,y+j,'W',under)];
    add('roof-'+left+'-'+i,slope?'roofLeft':'roofRight',left*2+i,y+step,'W',under,{roofColor,edge:i===span*2-1});
   }
  }
  const entry=rand('entry')%width;
  add('door','door',entry*2,1,'W',[wallIds[entry][0]]);
  for(let x=0;x<width;x++)for(let level=0;level<heights[x];level++)if(!(x===entry&&level===0)&&(level%2===0||heights[x]<=3)){
   add('window-'+x+'-'+level,'window',x*2,1+level*2+(level>=2?1:0),'W',[wallIds[x][level]],{variant:rand('window'+x+':'+level)%2});
  }
  if(budget.C){
   add('awning','awning',entry*2,3,'C',['door'],{roofColor});
   const x=heights.indexOf(maxHeight),group=groups.find(([a,b])=>x>=a&&x<b),roofDeps=parts.filter(p=>p.asset==='parapet'?p.x===x*2:p.id.startsWith('roof-'+group[0]+'-')).map(p=>p.id);
   const roofY=1+maxHeight*2+(maxHeight>2?1:0)+(stone&&!wood?1:group[1]-group[0]);
   add('flag','flag',stone&&!wood?x*2:group[0]+group[1],roofY,'C',roofDeps);
  }
  const id='assembly-'+hash(JSON.stringify(recipe)).toString(16),signature=heights.join('-')+':'+baseMat+':'+roofColor;
  return {id,name:(stone?'石木':'林间')+'组合屋 · '+width+'跨',template:true,modular:true,recipe,width,heights,entry,roofColor,parts,costs,silhouette:heights.join('-'),signature,spaces:width};
 }
 function generateV2(seed,budget={W:0,S:0,C:0},choice=0,wide=false){
  const p=generateV1(seed,budget,choice,wide?'cutaway':true);p.recipe.version=wide?3:2;
  const candidates=p.parts.filter(c=>c.asset==='window'&&c.y>=5);
  if(candidates.length&&hash(seed+':clock')%2){const c=candidates[hash(seed)%candidates.length];c.asset='clock';c.label=kit.clock.label;}
  function append(id,asset,x,y,material,deps){const spec=kit[asset];p.parts.push({id,kind:'module',asset,x,y,w:spec.w,h:spec.h,material,cost:{[material]:spec[material]},deps,seconds:4.2,workers:1,required:true,layer:5,label:spec.label});p.costs[material]+=spec[material];}
  const groupKeys=[...new Set(p.parts.filter(c=>c.asset==='roofLeft').map(c=>c.id.split('-')[1]))];
  for(const key of groupKeys){const slopes=p.parts.filter(c=>c.asset==='roofLeft'&&c.id.startsWith('roof-'+key+'-'));if(slopes.length>=2){const base=Math.min(...slopes.map(c=>c.y)),deps=p.parts.filter(c=>c.asset==='gable'&&c.id.startsWith('gable-'+key+'-')).map(c=>c.id);append('loft-'+key,'dormer',Number(key)*2+slopes.length-1,base+(slopes.length===3?1:0),'W',deps);}}
  const stoneTop=p.parts.find(c=>c.asset==='wall'&&c.material==='S'&&!p.parts.some(o=>o.asset==='wall'&&o.x===c.x&&o.y>c.y));
  if(stoneTop)append('chimney','chimney',stoneTop.x+1,stoneTop.y+stoneTop.h,'S',[stoneTop.id]);
  const bare=p.parts.find(c=>c.asset==='wall'&&c.y>1&&!p.parts.some(o=>['window','clock','door'].includes(o.asset)&&o.x===c.x&&o.y===c.y));
  if(budget.C&&bare)append('banner','banner',bare.x,bare.y,'C',[bare.id]);
  else if(budget.C&&hash(seed+':banner')%3===0){const w=p.parts.find(c=>c.asset==='window'&&c.y>1);if(w){p.parts=p.parts.filter(c=>c!==w);p.costs.W-=w.cost.W;append('banner','banner',w.x,w.y,'C',w.deps);}}
  if(wide){
   const spaces=p.parts.filter(c=>c.asset==='wall'&&(c.x/2)%3===1);
   let furnishing=0;
   for(const wall of spaces){
    const opening=p.parts.find(c=>['window','clock'].includes(c.asset)&&c.x===wall.x&&c.y===wall.y);
    if(opening){p.parts=p.parts.filter(c=>c!==opening);p.costs.W-=opening.cost.W;}
    if(furnishing++>=4)continue;
    const asset=wall.y===1&&wall.material==='S'&&furnishing===1?'hearth':wall.y>1?'shelf':'bed';
    append('room-'+wall.x+'-'+wall.y,asset,wall.x,wall.y,asset==='bed'?'W':asset==='hearth'?'S':'W',[wall.id]);
   }
   const left=p.parts.find(c=>c.asset==='footing'),right=[...p.parts].reverse().find(c=>c.asset==='footing');
   append('garden-box','planter',left.x,1,'W',[left.id]);
   const upper=p.parts.find(c=>c.asset==='wall'&&c.x===right.x&&c.y>1)||p.parts.find(c=>c.asset==='wall'&&c.x===right.x);
   if(upper)append('garden-vine','trellis',right.x+1,upper.y,'W',[upper.id]);
  }
  p.signature+=':'+(budget.S>budget.W?'stone':'timber');p.id='assembly-'+hash(JSON.stringify(p.recipe)).toString(16);return p;
 }
 function generate(seed,budget={W:0,S:0,C:0},choice=0){return generateV2(seed,budget,choice,true);}
 function canonical(plan){
  const r=plan?.recipe;if(!r||![1,2,3].includes(r.version)||!Number.isInteger(r.seed)||r.seed<0||r.seed>4294967295||!Number.isInteger(r.choice)||r.choice<0||r.choice>1000000||!r.budget||['W','S','C'].some(k=>!Number.isInteger(r.budget[k])||r.budget[k]<0||r.budget[k]>720))return null;
  return (r.version===1?generateV1:r.version===2?generateV2:generate)(r.seed,r.budget,r.choice);
 }
 function origin(plan){return 302-plan.width*16;}
 function renderScale(plan){return plan.recipe?.version===2?1.2:1;}
 function workPoint(plan,c){const zoom=renderScale(plan);return {x:302+(origin(plan)+(c.x+c.w/2)*16-302)*zoom,y:Math.min(272,272-c.y*16*zoom)};}
 const api={kit,generate,canonical,origin,renderScale,workPoint,hash};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownModules=api;
})(globalThis);
