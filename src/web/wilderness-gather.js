/* Bounded source-to-stock gathering. No material exists before delivery. */
(function(root){
  'use strict';
  const kinds=['W','S','B','D'],sources={W:35,S:418,B:90,D:110},piles={W:68,S:107,B:146,D:185};
  function create(s){
    if(!s.plan?.wilderness)return;
    const initial=Object.fromEntries(kinds.map(k=>[k,s.plan.costs[k]*2]));
    s.wilderness={building:s.building,auto:true,initial,remaining:{...initial},
      issued:Object.fromEntries(kinds.map(k=>[k,0])),queue:[],active:null};
  }
  function demand(s,k){
    const committed=s.installed.reduce((n,p)=>n+(p.cost[k]||0),0)+(s.active?.part.cost[k]||0);
    const stock=s.materials.filter(m=>m.kind===k&&m.state==='free').length;
    return Math.max(0,s.plan.costs[k]-committed-stock);
  }
  function request(s,k){
    const g=s.wilderness;
    if(!g||!kinds.includes(k)||s.status==='done'||s.paused)return false;
    if(demand(s,k)<=g.queue.filter(v=>v===k).length+(g.active?.kind===k?1:0)||g.remaining[k]<=0)return false;
    g.queue.push(k);return true;
  }
  function route(kind,start){
    const steps=[];let at={...start};
    const add=(phase,x,seconds,held=null)=>{steps.push({phase,from:{...at},to:{x,y:272},seconds,held});at={x,y:272};};
    add('descend',at.x,Math.abs(272-at.y)/90);
    add('source',sources[kind],Math.max(.2,Math.abs(at.x-sources[kind])/85));
    add({W:'chop',S:'collect-stone',B:'collect-branch',D:'dig'}[kind],sources[kind],kind==='W'?2.4:1.2);
    if(kind==='W')add('cut',sources[kind],1.4);
    if(kind==='D'){
      add('water',430,Math.abs(430-at.x)/85,'bucket');add('fill-water',430,.9,'bucket');
      add('return-water',148,Math.abs(at.x-148)/85,'bucket');add('mix',148,2);
    }
    add('gather-carry',piles[kind],Math.max(.2,Math.abs(at.x-piles[kind])/85),kind);
    add('stock',piles[kind],.35,kind);
    return steps;
  }
  function sample(g){
    const a=g?.active;if(!a)return null;
    let remaining=a.elapsed;
    for(const step of route(a.kind,a.start)){
      if(remaining<step.seconds){const t=remaining/step.seconds;return {...step,x:step.from.x+(step.to.x-step.from.x)*t,y:step.from.y+(step.to.y-step.from.y)*t,progress:t,kind:a.kind};}
      remaining-=step.seconds;
    }
    return {phase:'stock',x:piles[a.kind],y:272,held:a.kind,progress:1,kind:a.kind};
  }
  function advance(s,dt,E){
    const g=s.wilderness;if(!g||!s.plan?.wilderness||s.paused||s.status==='done')return;
    if(!g.active){
      let k=g.queue.shift();
      if(!k&&g.auto){
        const next=s.plan.parts.find(p=>!s.installed.some(i=>i.id===p.id)&&s.active?.id!==p.id);
        k=next&&demand(s,next.material)>0?next.material:kinds.find(k=>demand(s,k)>0);
      }
      if(!k||demand(s,k)<=0||g.remaining[k]<=0)return;
      g.remaining[k]--;g.active={kind:k,elapsed:0,start:{...s.pets[1]}};
    }
    g.active.elapsed+=dt;const pose=sample(g);s.pets[1]={x:pose.x,y:pose.y};
    const total=route(g.active.kind,g.active.start).reduce((n,step)=>n+step.seconds,0);
    if(g.active.elapsed>=total){
      const k=g.active.kind;
      if(E.addMaterials(s,k,1)){
        const m=s.materials.at(-1);m.source='wilderness';m.sourceSite=s.building;
        g.issued[k]++;g.active=null;
      }else g.active.elapsed=total;
    }
  }
  function validate(s){
    const g=s.wilderness;if(g===undefined){if(s.plan?.wilderness)throw Error('缺少采集现场');return;}
    if(!s.plan?.wilderness||g.building!==s.building||typeof g.auto!=='boolean'||!Array.isArray(g.queue)||g.queue.length>240||g.queue.some(k=>!kinds.includes(k)))throw Error('采集现场损坏');
    for(const k of kinds){
      if(g.initial?.[k]!==s.plan.costs[k]*2||![g.remaining?.[k],g.issued?.[k]].every(n=>Number.isInteger(n)&&n>=0))throw Error('采集资源损坏');
      const held=g.active?.kind===k?1:0;
      if(g.remaining[k]+g.issued[k]+held!==g.initial[k]||s.materials.filter(m=>m.source==='wilderness'&&m.sourceSite===s.building&&m.kind===k).length!==g.issued[k])throw Error('采集材料不守恒');
    }
    if(g.active){const a=g.active;
      if(!kinds.includes(a.kind)||!Number.isFinite(a.elapsed)||a.elapsed<0||!a.start||![a.start.x,a.start.y].every(Number.isFinite)||a.start.x<0||a.start.x>480||a.start.y<0||a.start.y>272||a.elapsed>route(a.kind,a.start).reduce((n,p)=>n+p.seconds,0)+.1)throw Error('采集动作损坏');
    }
  }
  const api={create,demand,request,advance,sample,validate,sources,piles,kinds};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownWildGather=api;
})(globalThis);
