/* Transactional wall-clock handoff. A candidate becomes visible only after one atomic write. */
(function(root){
 'use strict';
 const MAX_OFFLINE=8*60*60,clone=v=>JSON.parse(JSON.stringify(v));
 const pause=()=>new Promise(resolve=>setTimeout(resolve,0));
 function baseline(s,now){s.wallTime=now;s.lastOffline=null;return s;}
 function elapsed(s,now){const away=Math.max(0,(now-s.wallTime)/1000);return {away,seconds:s.paused||!s.wallTime?0:Math.min(MAX_OFFLINE,away),capped:!s.paused&&away>=MAX_OFFLINE};}
 function summary(before,after,E,c,info){const delta=field=>Object.fromEntries(Object.keys(c.materials).map(k=>[k,after.ledger[field][k]-before.ledger[field][k]])),construction=(s,k)=>s.completed.reduce((n,p)=>n+(p.consumed[k]||0),0)+(s.project?.consumed[k]||0),consumed=delta('consumed');for(const k of Object.keys(consumed))consumed[k]+=construction(after,k)-construction(before,k);return {...info,gained:delta('created'),consumed,inventory:E.inventory(after,c),completed:after.completed.filter(p=>!before.completed.some(q=>q.id===p.id)).map(p=>c.plans.find(q=>q.id===p.id).name),waiting:after.project&&after.message||(c.plans.filter(p=>p.base).every(p=>after.completed.some(q=>q.id===p.id))?'等待玩家选择扩展建筑':after.pets.filter(p=>p.arrived).map(p=>E.workStatus(after,p,c)).join('；'))};}
 async function settle(s,{E,c,storage,now=Date.now(),yieldTask=pause,owns=()=>true,onProgress=()=>{}}){
  const info=elapsed(s,now),candidate=E.restore(E.save(s,c),c),started=performance.now();let left=info.seconds,sliceStart=started;
  while(left>1e-8){if(!owns())throw Error('当前标签页已失去小镇控制权');const part=Math.min(30,left);E.advance(candidate,part,c);left-=part;if(performance.now()-sliceStart>=8||left<=1e-8){onProgress(info.seconds-left,info.seconds);await yieldTask();sliceStart=performance.now();}}
  candidate.wallTime=Math.max(now,s.wallTime);candidate.lastOffline=summary(s,candidate,E,c,{...info,measuredMs:performance.now()-started});
  if(!owns())throw Error('当前标签页已失去小镇控制权');const encoded=E.save(candidate,c);storage.setItem(E.SAVE_KEY,encoded);return candidate;
 }
 const api={MAX_OFFLINE,baseline,elapsed,summary,settle};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownIdleTime=api;
})(globalThis);
