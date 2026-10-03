/* Bounded source-to-stock gathering. No material exists before delivery. */
(function(root){
  'use strict';
  const CONFIG=typeof module!=='undefined'&&module.exports?require('./construction-config.js'):root.TownConstructionConfig;
  const kinds=['W','S','B','D'];
  const TREE_VERSION='gather-trees-v1',LONG_TREE_VERSION='gather-whole-timber-v1';
  const isTree=a=>a?.timber===TREE_VERSION||a?.timber===LONG_TREE_VERSION;
  function create(s,E){
    const site=CONFIG.site(s.plan),gathering=site.gathering;if(!gathering)return;
    const initial=Object.fromEntries(kinds.map(k=>[k,(s.plan.costs[k]||0)*gathering.multiplier]));
    s.wilderness={building:s.building,auto:true,initial,remaining:{...initial},
      issued:Object.fromEntries(kinds.map(k=>[k,0])),queue:[],active:null};
    if(gathering.trees?.length)s.wilderness.trees=gathering.trees.map((x,i)=>{
      const units=Math.floor(initial.W/gathering.trees.length)+(i<initial.W%gathering.trees.length?1:0);
      return {id:'tree-'+i,x,units,remaining:units,felled:false};
    });
    if(gathering.supply){
      s.wilderness.feed={version:1,credit:Object.fromEntries(kinds.map(k=>[k,0])),manual:null};
      for(const k of kinds){const units=Math.min(gathering.supply.kinds[k].buffer,demand(s,k),capacity(s,k));
        if(units){const claim=claimSource(s,k,units);if(claim)deliver(s,{...claim,mode:'buffer'},E);}
      }
    }
  }
  function capacity(s,k){const cap=CONFIG.site(s.plan).gathering.supply?.kinds[k].cap||240;
    return Math.max(0,cap-s.materials.filter(m=>m.kind===k&&m.state!=='installed').length-(s.wilderness.active?.kind===k?(s.wilderness.active.units||1):0)-(s.wilderness.feed?.manual?.kind===k?s.wilderness.feed.manual.units:0));
  }
  function claimSource(s,k,units,source){
    const g=s.wilderness;if(g.remaining[k]<units)return null;
    const trees=[];let left=units;
    if(k==='W'&&g.trees){for(const t of g.trees.filter(t=>source===undefined||t.x===source)){const n=Math.min(left,t.remaining);if(n){trees.push({id:t.id,units:n});left-=n;}if(!left)break;}if(left)return null;}
    g.remaining[k]-=units;for(const a of trees)g.trees.find(t=>t.id===a.id).remaining-=a.units;
    return {kind:k,units,trees};
  }
  function release(s,claim){const g=s.wilderness;g.remaining[claim.kind]+=claim.units;for(const a of claim.trees)g.trees.find(t=>t.id===a.id).remaining+=a.units;}
  function deliver(s,claim,E){
    const cap=CONFIG.site(s.plan).gathering.supply?.kinds[claim.kind].cap||240;
    if(s.materials.filter(m=>m.kind===claim.kind&&m.state!=='installed').length+claim.units>cap)return false;
    if(!E.addMaterials(s,claim.kind,claim.units))return false;
    const g=s.wilderness,items=s.materials.slice(-claim.units);let index=0;
    for(const m of items){m.source='wilderness';m.sourceSite=s.building;if(claim.mode)m.sourceAction=claim.mode;}
    for(const a of claim.trees){const t=g.trees.find(t=>t.id===a.id);t.felled=true;for(let i=0;i<a.units;i++)items[index++].sourceTree=a.id;}
    g.issued[claim.kind]+=claim.units;return true;
  }
  function manual(s,k,source){
    const g=s.wilderness,cfg=CONFIG.site(s.plan).gathering?.supply?.manual[k];
    if(!g?.feed||!cfg||g.feed.manual||s.paused||!['building','waiting','finishing'].includes(s.status))return false;
    const units=Math.min(cfg.units,capacity(s,k),g.remaining[k],source===undefined?Infinity:g.trees?.find(t=>t.x===source)?.remaining||0);
    if(!units)return false;const claim=claimSource(s,k,units,source);if(!claim)return false;
    g.feed.manual={...claim,mode:'manual',elapsed:0,seconds:cfg.seconds};return true;
  }
  function cancel(s){const f=s.wilderness?.feed;if(!f?.manual)return false;release(s,f.manual);f.manual=null;return true;}
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
    const feed=g.feed,cfg=site.gathering.supply;
    if(feed){
      for(const k of kinds){const period=cfg.kinds[k].periods[Math.min(s.experience.stage,cfg.kinds[k].periods.length-1)];feed.credit[k]=Math.min(1,feed.credit[k]+dt/period);}
      const m=feed.manual;if(m){m.elapsed=Math.min(m.seconds,m.elapsed+dt);if(m.elapsed>=m.seconds&&deliver(s,m,E)){feed.manual=null;E.feedback(s,'gather',`收到 ${m.units} 份${E.LABELS[m.kind]}`);}}
    }
    // Cooperative construction owns both pets until this one material is installed.
    if(s.active?.workers.length===2)return;
    if(!g.active){
      let k=g.queue[0];
      const next=s.plan.parts.find(p=>!s.installed.some(i=>i.id===p.id)&&s.active?.id!==p.id);
      if(!k&&g.auto){
        k=next&&demand(s,next.material)>0?next.material:kinds.find(k=>demand(s,k)>0);
      }
      if(!k)return;
      if(feed&&(feed.credit[k]<1||capacity(s,k)<1))return;
      if(demand(s,k)<=0||g.remaining[k]<=0){if(g.queue.length)g.queue.shift();return;}
      const whole=CONFIG.action(next)==='timber-lift';
      const team=k==='W'&&!!g.trees&&CONFIG.isTimber(s.plan,next)&&(!whole||demand(s,k)>=2);
      if(team&&s.active)return;
      const pending=feed?.manual?.kind===k?feed.manual.units:0;
      const units=team&&whole?2:feed?Math.min(cfg.kinds[k].batch,Math.max(0,demand(s,k)-pending),g.remaining[k],capacity(s,k)):1;
      if(!units)return;
      if(feed&&(capacity(s,k)<units||g.remaining[k]<units))return;
      const tree=k==='W'&&g.trees?g.trees.find(t=>t.remaining>=(feed?1:units)):null;
      if(k==='W'&&g.trees&&!tree)return;
      if(g.queue.length)g.queue.shift();
      if(feed)feed.credit[k]-=1;
      const claim=feed?claimSource(s,k,units):null;
      if(!feed)g.remaining[k]-=units;g.active={kind:k,elapsed:0,site,worker:site.gathering.worker,start:{...s.pets[site.gathering.worker]}};
      if(feed)g.active.treeClaims=claim.trees;
      if(feed)g.active.units=units;
      if(k==='W'&&g.trees){
        if(!feed)tree.remaining-=units;
        Object.assign(g.active,{timber:team&&whole?LONG_TREE_VERSION:TREE_VERSION,treeId:tree.id,sourceX:tree.x,fellTree:!tree.felled,team});
        if(team&&whole){g.active.units=2;g.active.timberSize={...next.longTimber};}
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
      if(deliver(s,{kind:k,units,trees:g.active.treeClaims||(g.active.treeId?[{id:g.active.treeId,units}]:[]),...(feed?{mode:'auto'}:{})},E)){
        g.active=null;
      }else g.active.elapsed=total;
    }
  }
  function validate(s){
    const site=CONFIG.site(s.plan),gathering=site.gathering,g=s.wilderness;if(g===undefined){if(gathering)throw Error('缺少采集现场');return;}
    if(!gathering||g.building!==s.building||typeof g.auto!=='boolean'||!Array.isArray(g.queue)||g.queue.length>240||g.queue.some(k=>!kinds.includes(k)))throw Error('采集现场损坏');
    for(const k of kinds){
      if(g.initial?.[k]!==(s.plan.costs[k]||0)*gathering.multiplier||![g.remaining?.[k],g.issued?.[k]].every(n=>Number.isInteger(n)&&n>=0))throw Error('采集资源损坏');
      const held=(g.active?.kind===k?(g.active.units||1):0)+(g.feed?.manual?.kind===k?g.feed.manual.units:0);
      if(g.remaining[k]+g.issued[k]+held!==g.initial[k]||s.materials.filter(m=>m.source==='wilderness'&&m.sourceSite===s.building&&m.kind===k).length!==g.issued[k])throw Error('采集材料不守恒');
    }
    if(!!gathering.trees?.length!==!!g.trees)throw Error('缺少取材树木');
    if(g.trees!==undefined){
      if(!gathering.trees?.length||!Array.isArray(g.trees)||g.trees.length!==gathering.trees.length)throw Error('取材树木损坏');
      for(const [i,t]of g.trees.entries()){
        const units=Math.floor(g.initial.W/g.trees.length)+(i<g.initial.W%g.trees.length?1:0);
        if(t.id!=='tree-'+i||t.x!==gathering.trees[i]||t.units!==units||!Number.isInteger(t.remaining)||t.remaining<0||t.remaining>units||typeof t.felled!=='boolean')throw Error('取材树木损坏');
        const manualHeld=g.feed?.manual?.trees.filter(a=>a.id===t.id).reduce((n,a)=>n+a.units,0)||0;
        const activeHeld=g.active?.treeClaims?g.active.treeClaims.filter(a=>a.id===t.id).reduce((n,a)=>n+a.units,0):(g.active?.treeId===t.id?(g.active.units||1):0);
        if(!t.felled&&t.remaining!==units-manualHeld-activeHeld)throw Error('取材树木进度损坏');
        const delivered=s.materials.filter(m=>m.source==='wilderness'&&m.sourceSite===s.building&&m.sourceTree===t.id&&m.kind==='W').length;
        if(t.remaining+delivered+activeHeld+manualHeld!==t.units)throw Error('树木来源材料不守恒');
      }
      if(g.trees.reduce((n,t)=>n+t.remaining,0)!==g.remaining.W)throw Error('树木材料不守恒');
    }
    if(!!gathering.supply!==!!g.feed)throw Error('供料版本缺失');
    if(g.feed){const f=g.feed;if(f.version!==1||!kinds.every(k=>Number.isFinite(f.credit[k])&&f.credit[k]>=0&&f.credit[k]<=1))throw Error('供料时钟损坏');
      const m=f.manual;if(m){const c=gathering.supply.manual[m.kind];if(!c||!Number.isInteger(m.units)||m.units<1||m.units>c.units||m.seconds!==c.seconds||!Number.isFinite(m.elapsed)||m.elapsed<0||m.elapsed>m.seconds||!Array.isArray(m.trees)||new Set(m.trees.map(a=>a.id)).size!==m.trees.length||m.trees.some(a=>!g.trees?.some(t=>t.id===a.id)||!Number.isInteger(a.units)||a.units<1)||((m.kind==='W'&&g.trees)?m.trees.reduce((n,a)=>n+a.units,0)!==m.units:m.trees.length!==0))throw Error('主动采集损坏');}
    }
    if(g.active){const a=g.active;
      if(g.feed&&(!Number.isInteger(a.units)||a.units<1||a.units>Math.max(2,gathering.supply.kinds[a.kind]?.batch||0)||!Array.isArray(a.treeClaims)||new Set(a.treeClaims.map(t=>t.id)).size!==a.treeClaims.length||a.treeClaims.some(t=>!g.trees?.some(b=>b.id===t.id)||!Number.isInteger(t.units)||t.units<1)||((a.kind==='W'&&g.trees)?a.treeClaims.reduce((n,t)=>n+t.units,0)!==a.units:a.treeClaims.length!==0)))throw Error('采集批次损坏');
      if(JSON.stringify(a.site)!==JSON.stringify(site)||a.worker!==gathering.worker)throw Error('采集工地配置损坏');
      if(a.timber!==undefined){
        const tree=g.trees?.find(t=>t.id===a.treeId);
        if(!isTree(a)||a.kind!=='W'||!tree||tree.x!==a.sourceX||typeof a.fellTree!=='boolean'||typeof a.team!=='boolean')throw Error('伐木任务损坏');
        if(a.timber===LONG_TREE_VERSION&&(!s.plan.parts.some(p=>CONFIG.action(p)==='timber-lift'&&JSON.stringify(p.longTimber)===JSON.stringify(a.timberSize))||a.units!==2||!a.team)||a.timber!==LONG_TREE_VERSION&&a.units!==undefined&&!g.feed)throw Error('整根木料数量损坏');
        if(a.team&&(!Array.isArray(a.starts)||a.starts.length!==2||a.starts.some(p=>!p||![p.x,p.y].every(Number.isFinite)||p.x<0||p.x>480||p.y<0||p.y>272)||s.active))throw Error('伐木人员冲突');
        if(!a.fellTree&&!tree.felled)throw Error('未砍倒树木');
      }else if(g.trees&&a.kind==='W')throw Error('缺少伐木来源');
      if(!kinds.includes(a.kind)||!Number.isFinite(a.elapsed)||a.elapsed<0||!a.start||![a.start.x,a.start.y].every(Number.isFinite)||a.start.x<0||a.start.x>480||a.start.y<0||a.start.y>272||a.elapsed>stepsFor(a).reduce((n,p)=>n+p.seconds,0)+.1)throw Error('采集动作损坏');
      if(s.active?.workers.includes(a.worker))throw Error('采集施工人员冲突');
    }
  }
  const api={create,demand,request,advance,sample,validate,kinds,manual,cancel,capacity};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownWildGather=api;
})(globalThis);
