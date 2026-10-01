/* Bounded source-to-stock gathering. No material exists before delivery. */
(function(root){
  'use strict';
  const CONFIG=typeof module!=='undefined'&&module.exports?require('./construction-config.js'):root.TownConstructionConfig;
  const kinds=['W','S','B','D'];
  const TREE_VERSION='gather-trees-v1',LONG_TREE_VERSION='gather-whole-timber-v1';
  const isTree=a=>a?.timber===TREE_VERSION||a?.timber===LONG_TREE_VERSION;
  function create(s){
    const site=CONFIG.site(s.plan),gathering=site.gathering;if(!gathering)return;
    const initial=Object.fromEntries(kinds.map(k=>[k,(s.plan.costs[k]||0)*gathering.multiplier]));
    s.wilderness={building:s.building,auto:true,initial,remaining:{...initial},
      issued:Object.fromEntries(kinds.map(k=>[k,0])),queue:[],active:null};
    if(gathering.trees?.length)s.wilderness.trees=gathering.trees.map((x,i)=>{
      const units=Math.floor(initial.W/gathering.trees.length)+(i<initial.W%gathering.trees.length?1:0);
      return {id:'tree-'+i,x,units,remaining:units,felled:false};
    });
  }
  function demand(s,k){
    const committed=s.installed.reduce((n,p)=>n+(p.cost[k]||0),0)+(s.active?.part.cost[k]||0);
    const stock=s.materials.filter(m=>m.kind===k&&m.state==='free').length;
    return Math.max(0,s.plan.costs[k]-committed-stock);
  }
  function request(s,k){
    const g=s.wilderness;
    if(!g||!kinds.includes(k)||s.status==='done'||s.paused)return false;
    if(demand(s,k)<=g.queue.filter(v=>v===k).length+(g.active?.kind===k?(g.active.units||1):0)||g.remaining[k]<=0)return false;
    g.queue.push(k);return true;
  }
  function route(kind,start,site){
    const {ground,piles}=site,{sources,water,mix}=site.gathering;
    const steps=[];let at={...start};
    const add=(phase,x,seconds,held=null)=>{steps.push({phase,from:{...at},to:{x,y:ground},seconds,held});at={x,y:ground};};
    add('descend',at.x,Math.abs(ground-at.y)/90);
    add('source',sources[kind],Math.max(.2,Math.abs(at.x-sources[kind])/85));
    add({W:'chop',S:'collect-stone',B:'collect-branch',D:'dig'}[kind],sources[kind],kind==='W'?2.4:1.2);
    if(kind==='W')add('cut',sources[kind],1.4);
    if(kind==='D'){
      add('water',water,Math.abs(water-at.x)/85,'bucket');add('fill-water',water,.9,'bucket');
      add('return-water',mix,Math.abs(at.x-mix)/85,'bucket');add('mix',mix,2);
    }
    add('gather-carry',piles[kind],Math.max(.2,Math.abs(at.x-piles[kind])/85),kind);
    add('stock',piles[kind],.35,kind);
    return steps;
  }
  function timberRoute(a){
    const {ground,piles,timberPile}=a.site,length=a.timberSize?.length||16,diameter=a.timberSize?.diameter||7;
    const whole=a.timber===LONG_TREE_VERSION;
    const steps=[];let at=(a.team?a.starts:[a.start]).map(p=>({...p}));
    const positions=(x,y=ground)=>a.team?[{x:x-12,y},{x:x+12,y}]:[{x,y}];
    const add=(phase,to,seconds,logFrom=null,logTo=logFrom)=>{
      steps.push({phase,from:at,to,seconds,logFrom,logTo});at=to;
    };
    add('descend',at.map(p=>({x:p.x,y:ground})),Math.max(...at.map(p=>ground-p.y))/90);
    const pile=whole?timberPile:piles.W;
    const station=positions(a.sourceX),log={x:a.sourceX+(whole?length*.75:0),y:whole?ground-diameter/2:ground-2};
    const grip=(x)=>whole?[{x:x-(length/2-4),y:ground},{x:x+(length/2-4),y:ground}]:positions(x);
    add('source',station,Math.max(.2,...at.map((p,i)=>Math.abs(p.x-station[i].x)/85)));
    if(a.fellTree){
      add('chop',station,2.4);
      // Both step behind the stump, away from the tree's rightward fall.
      add('fell',a.team?[{x:a.sourceX-20,y:ground},{x:a.sourceX-10,y:ground}]:[{x:a.sourceX-16,y:ground}],1.3);
      add('trim',station,1.2,log);
    }
    add('cut',whole?grip(log.x):station,1.4,log);
    add(a.team?'team-pickup':'pickup',whole?grip(log.x):station,.65,log,{x:log.x,y:ground-8});
    add(a.team?'team-carry':'gather-carry',grip(pile),Math.max(.2,Math.abs(pile-log.x)/60),{x:log.x,y:ground-8},{x:pile,y:ground-8});
    add('stock',grip(pile),.35,{x:pile,y:ground-8},{x:pile,y:whole?ground-diameter/2:ground-2});
    return steps;
  }
  const stepsFor=a=>isTree(a)?timberRoute(a):route(a.kind,a.start,a.site);
  function sample(g){
    const a=g?.active;if(!a)return null;
    let remaining=a.elapsed;
    for(const step of stepsFor(a)){
      if(remaining<step.seconds){
        const t=remaining/step.seconds,mix=(from,to)=>({x:from.x+(to.x-from.x)*t,y:from.y+(to.y-from.y)*t});
        if(isTree(a)){
          const pets=step.from.map((p,i)=>mix(p,step.to[i]));
          return {...pets[0],pets,phase:step.phase,progress:t,kind:a.kind,team:!!a.team,whole:a.timber===LONG_TREE_VERSION,treeId:a.treeId,
            log:step.logFrom?{...mix(step.logFrom,step.logTo),length:a.timberSize?.length||16,diameter:a.timberSize?.diameter||7}:null,held:!a.team&&['gather-carry','stock'].includes(step.phase)?'W':null};
        }
        return {...step,...mix(step.from,step.to),progress:t,kind:a.kind};
      }
      remaining-=step.seconds;
    }
    if(isTree(a))return {phase:'stock',...timberRoute(a).at(-1).to[0],pets:timberRoute(a).at(-1).to,team:!!a.team,whole:a.timber===LONG_TREE_VERSION,held:a.team?null:'W',progress:1,kind:'W',treeId:a.treeId,log:{x:a.timber===LONG_TREE_VERSION?a.site.timberPile:a.site.piles.W,y:a.site.ground-(a.timber===LONG_TREE_VERSION?a.timberSize.diameter/2:2),length:a.timberSize?.length||16,diameter:a.timberSize?.diameter||7}};
    return {phase:'stock',x:a.site.piles[a.kind],y:a.site.ground,held:a.kind,progress:1,kind:a.kind};
  }
  function advance(s,dt,E){
    const site=CONFIG.site(s.plan),g=s.wilderness;if(!g||!site.gathering||s.paused||s.status==='done')return;
    // Cooperative construction owns both pets until this one material is installed.
    if(s.active?.workers.length===2)return;
    if(!g.active){
      let k=g.queue[0];
      const next=s.plan.parts.find(p=>!s.installed.some(i=>i.id===p.id)&&s.active?.id!==p.id);
      if(!k&&g.auto){
        k=next&&demand(s,next.material)>0?next.material:kinds.find(k=>demand(s,k)>0);
      }
      if(!k)return;
      if(demand(s,k)<=0||g.remaining[k]<=0){if(g.queue.length)g.queue.shift();return;}
      const whole=CONFIG.action(next)==='timber-lift';
      const team=k==='W'&&!!g.trees&&CONFIG.isTimber(s.plan,next)&&(!whole||demand(s,k)>=2);
      if(team&&s.active)return;
      const units=team&&whole?2:1;
      const tree=k==='W'&&g.trees?g.trees.find(t=>t.remaining>=units):null;
      if(k==='W'&&g.trees&&!tree)return;
      if(g.queue.length)g.queue.shift();
      g.remaining[k]-=units;g.active={kind:k,elapsed:0,site,worker:site.gathering.worker,start:{...s.pets[site.gathering.worker]}};
      if(k==='W'&&g.trees){
        tree.remaining-=units;
        Object.assign(g.active,{timber:units===2?LONG_TREE_VERSION:TREE_VERSION,treeId:tree.id,sourceX:tree.x,fellTree:!tree.felled,team});
        if(units===2){g.active.units=2;g.active.timberSize={...next.longTimber};}
        if(team)g.active.starts=s.pets.map(p=>({...p}));
      }
    }
    g.active.elapsed+=dt;const pose=sample(g);
    if(g.active.team)pose.pets.forEach((p,i)=>{s.pets[i]={...p};});else s.pets[g.active.worker]={x:pose.x,y:pose.y};
    if(isTree(g.active)&&g.active.fellTree){
      let fellAt=0;for(const step of timberRoute(g.active)){fellAt+=step.seconds;if(step.phase==='fell')break;}
      if(g.active.elapsed>=fellAt)g.trees.find(t=>t.id===g.active.treeId).felled=true;
    }
    const total=stepsFor(g.active).reduce((n,step)=>n+step.seconds,0);
    if(g.active.elapsed>=total){
      const k=g.active.kind;
      const units=g.active.units||1;
      if(E.addMaterials(s,k,units)){
        for(const m of s.materials.slice(-units)){m.source='wilderness';m.sourceSite=s.building;if(g.active.treeId)m.sourceTree=g.active.treeId;}
        g.issued[k]+=units;g.active=null;
      }else g.active.elapsed=total;
    }
  }
  function validate(s){
    const site=CONFIG.site(s.plan),gathering=site.gathering,g=s.wilderness;if(g===undefined){if(gathering)throw Error('缺少采集现场');return;}
    if(!gathering||g.building!==s.building||typeof g.auto!=='boolean'||!Array.isArray(g.queue)||g.queue.length>240||g.queue.some(k=>!kinds.includes(k)))throw Error('采集现场损坏');
    for(const k of kinds){
      if(g.initial?.[k]!==(s.plan.costs[k]||0)*gathering.multiplier||![g.remaining?.[k],g.issued?.[k]].every(n=>Number.isInteger(n)&&n>=0))throw Error('采集资源损坏');
      const held=g.active?.kind===k?(g.active.units||1):0;
      if(g.remaining[k]+g.issued[k]+held!==g.initial[k]||s.materials.filter(m=>m.source==='wilderness'&&m.sourceSite===s.building&&m.kind===k).length!==g.issued[k])throw Error('采集材料不守恒');
    }
    if(!!gathering.trees?.length!==!!g.trees)throw Error('缺少取材树木');
    if(g.trees!==undefined){
      if(!gathering.trees?.length||!Array.isArray(g.trees)||g.trees.length!==gathering.trees.length)throw Error('取材树木损坏');
      for(const [i,t]of g.trees.entries()){
        const units=Math.floor(g.initial.W/g.trees.length)+(i<g.initial.W%g.trees.length?1:0);
        if(t.id!=='tree-'+i||t.x!==gathering.trees[i]||t.units!==units||!Number.isInteger(t.remaining)||t.remaining<0||t.remaining>units||typeof t.felled!=='boolean')throw Error('取材树木损坏');
        if(!t.felled&&t.remaining!==units&&!(g.active?.treeId===t.id&&g.active.fellTree&&t.remaining===units-(g.active.units||1)))throw Error('取材树木进度损坏');
        const delivered=s.materials.filter(m=>m.source==='wilderness'&&m.sourceSite===s.building&&m.sourceTree===t.id&&m.kind==='W').length;
        if(t.remaining+delivered+(g.active?.treeId===t.id?(g.active.units||1):0)!==t.units)throw Error('树木来源材料不守恒');
      }
      if(g.trees.reduce((n,t)=>n+t.remaining,0)!==g.remaining.W)throw Error('树木材料不守恒');
    }
    if(g.active){const a=g.active;
      if(JSON.stringify(a.site)!==JSON.stringify(site)||a.worker!==gathering.worker)throw Error('采集工地配置损坏');
      if(a.timber!==undefined){
        const tree=g.trees?.find(t=>t.id===a.treeId);
        if(!isTree(a)||a.kind!=='W'||!tree||tree.x!==a.sourceX||typeof a.fellTree!=='boolean'||typeof a.team!=='boolean')throw Error('伐木任务损坏');
        if(a.timber===LONG_TREE_VERSION&&(!s.plan.parts.some(p=>CONFIG.action(p)==='timber-lift'&&JSON.stringify(p.longTimber)===JSON.stringify(a.timberSize))||a.units!==2||!a.team)||a.timber!==LONG_TREE_VERSION&&a.units!==undefined)throw Error('整根木料数量损坏');
        if(a.team&&(!Array.isArray(a.starts)||a.starts.length!==2||a.starts.some(p=>!p||![p.x,p.y].every(Number.isFinite)||p.x<0||p.x>480||p.y<0||p.y>272)||s.active))throw Error('伐木人员冲突');
        if(!a.fellTree&&!tree.felled)throw Error('未砍倒树木');
      }else if(g.trees&&a.kind==='W')throw Error('缺少伐木来源');
      if(!kinds.includes(a.kind)||!Number.isFinite(a.elapsed)||a.elapsed<0||!a.start||![a.start.x,a.start.y].every(Number.isFinite)||a.start.x<0||a.start.x>480||a.start.y<0||a.start.y>272||a.elapsed>stepsFor(a).reduce((n,p)=>n+p.seconds,0)+.1)throw Error('采集动作损坏');
      if(s.active?.workers.includes(a.worker))throw Error('采集施工人员冲突');
    }
  }
  const api={create,demand,request,advance,sample,validate,kinds};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownWildGather=api;
})(globalThis);
