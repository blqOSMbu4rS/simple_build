/* Deterministic construction simulation. Also loadable by Node for rule tests. */
(function (root) {
  'use strict';
  const MOD=typeof module!=='undefined'&&module.exports?require('./modules.js'):root.TownModules;
  const MOT=typeof module!=='undefined'&&module.exports?require('./cutaway-motion.js'):root.TownCutawayMotion;
  const ART=typeof module!=='undefined'&&module.exports?require('./art-layout.js'):root.TownArtLayout;
  const BLUEPRINTS=typeof module!=='undefined'&&module.exports?require('./blueprints.js'):root.TownBlueprints;
  const GATHER=typeof module!=='undefined'&&module.exports?require('./wilderness-gather.js'):root.TownWildGather;
  const CONFIG=typeof module!=='undefined'&&module.exports?require('./construction-config.js'):root.TownConstructionConfig;
  const KINDS = ['W', 'S', 'C'], MATERIAL_KINDS=[...KINDS,'B','D'];
  const LABELS = { W: '木材', S: '石材', C: '布料', B: '树枝 / 干草', D: '泥土' };
  const GRID = 16, GROUND = 272, ORIGIN = 240;
  const count = () => ({ W: 0, S: 0, C: 0, B: 0, D: 0 });
  const clone = value => JSON.parse(JSON.stringify(value));
  function hash(text) { let h = 2166136261; for (const c of String(text)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
  function fingerprint(c) { return JSON.stringify([c.id,c.kind,c.x,c.y,c.w,c.h,c.material,c.cost,c.shape]); }
  function makePlan(frame, wall, roof, upper, left, right) {
    const parts = [];
    function add(id, kind, x, y, w, h, material, units, deps, options = {}) {
      const c = { id,kind,x,y,w,h,material,cost: { [material]: units },deps,seconds: kind === 'roof' ? 4.8 : 3.6,
        workers: ['beam','deck','canopy'].includes(kind) ? 2 : 1,required:true,layer:2,...options };
      parts.push(c); return id;
    }
    function room(prefix, x, bottom, mat, wallMat, top, isUpper) {
      let bases;
      if (!isUpper) bases = [add(prefix+'-base-a','base',x,0,2,1,mat,1,[]), add(prefix+'-base-b','base',x+2,0,3,1,mat,1,[])];
      else bases = ['main-deck','upper-ladder'];
      const pillars = [add(prefix+'-post-a','post',x,bottom,1,4,mat,1,bases), add(prefix+'-post-b','post',x+4,bottom,1,4,mat,1,bases)];
      const beam = add(prefix+'-beam','beam',x,bottom+4,5,1,mat,2,pillars);
      const walls = [];
      for (let i=0;i<3;i++) walls.push(add(prefix+'-wall-'+i,'wall',x+1+i,bottom,1,4,wallMat,1,[beam],{layer:1,shape:i===1?'door':'window'}));
      const deps = [beam,...walls];
      if (top === 'deck') {
        add('main-deck','deck',x,bottom+5,5,1,'W',2,deps);
        add('upper-ladder','ladder',x,bottom,1,6,'W',2,['main-deck'],{layer:4});
      } else if (top === 'C') {
        add(prefix+'-roof-cloth','canopy',x-1,bottom+5,7,2,'C',1,deps,{layer:3});
      } else if (top === 'S') {
        for(let i=0;i<3;i++) add(prefix+'-roof-'+i,'flat',x+[-1,1,4][i],bottom+5,[2,3,2][i],1,'S',1,deps,{layer:3});
      } else {
        const gables = [add(prefix+'-gable','gable',x,bottom+5,5,4,'W',2,deps,{layer:1})];
        for(let i=0;i<3;i++) {
          add(prefix+'-roof-l'+i,'roof',x-1+i,bottom+5+i,1,1,'W',1,gables,{shape:'left',layer:3});
          add(prefix+'-roof-r'+i,'roof',x+5-i,bottom+5+i,1,1,'W',1,gables,{shape:'right',layer:3});
        }
        add(prefix+'-ridge','ridge',x+2,bottom+8,1,1,'W',1,parts.filter(c=>c.id.startsWith(prefix+'-roof-')).map(c=>c.id),{layer:3});
      }
    }
    room('main',0,1,frame,wall,upper?'deck':roof,false);
    if (upper) room('upper',0,7,'W','W',roof,true);
    function side(name, x, material) {
      const base=add(name+'-base','base',x,0,4,1,'W',1,[]);
      const posts=[add(name+'-post-a','post',x,1,1,2,'W',1,[base]),add(name+'-post-b','post',x+3,1,1,2,'W',1,[base])];
      const beam=add(name+'-beam','beam',x,3,4,1,'W',1,posts);
      if(material==='C')add(name+'-cover','canopy',x,4,4,1,'C',1,[beam],{layer:3});
      else for(let i=0;i<4;i++)add(name+'-cover-'+i,'flat',x+i,4,1,1,'W',1,[beam],{layer:3});
    }
    if(left)side('left',-4,left);
    if(right)side('right',5,right);
    const silhouette=[upper?'two':'one',roof,[left,right].filter(Boolean).sort().join('+')].join(':');
    const id=[frame,wall,roof,+upper,left||'-',right||'-'].join('_');
    const costs={W:0,S:0,C:0}; for(const p of parts)for(const k of KINDS)costs[k]+=p.cost[k]||0;
    const mainName=upper?(frame==='S'?'石下木上小屋':'双层木屋'):frame==='S'?(wall==='W'?'石基木墙小屋':'石砌小屋'):'林间木屋';
    return {id,frame,wall,roof,upper,left,right,parts,costs,silhouette,signature:silhouette+':'+frame+':'+wall,
      name:mainName+(roof==='C'?' · 布篷顶':'')+(left||right?' · 带侧棚':''),spaces:1+Number(upper)+Number(!!left)+Number(!!right)};
  }
  const CATALOG=[];
  for(const frame of ['W','S'])for(const wall of (frame==='S'?['S','W']:['W']))for(const upper of [false,true])for(const roof of ['W','C','S']) {
    if(roof==='S'&&(frame==='W'||upper))continue;
    for(const [left,right] of [[null,null],['W',null],[null,'C'],['W','C']]) CATALOG.push(makePlan(frame,wall,roof,upper,left,right));
  }
  CATALOG.sort((a,b)=>a.id.localeCompare(b.id,'en'));
  const ALL_PLANS=[...CATALOG,...BLUEPRINTS];
  function score(plan, s) {
    const fixed=new Set([...s.installed.map(p=>p.id),...(s.active?[s.active.id]:[])]);
    const installed=new Set(s.installed.map(p=>p.id));
    const total=plan.parts.reduce((n,c)=>n+c.seconds,0);
    const C=plan.parts.filter(c=>installed.has(c.id)).reduce((n,c)=>n+c.seconds,0)/total;
    const recent=s.batches.slice(-3).reverse(); let sum=0,weights=0;
    for(const k of MATERIAL_KINDS) {
      const index=recent.findIndex(b=>b.kind===k); if(index<0)continue;
      const I=s.materials.filter(m=>m.kind===k&&recent.some(b=>b.id===m.batch)&&['free','soft'].includes(m.state)).length;
      if(!I)continue;
      const D=plan.parts.filter(c=>!fixed.has(c.id)).reduce((n,c)=>n+(c.cost[k]||0),0);
      const w=3-index; sum+=w*Math.min(1,D/I); weights+=w;
    }
    const M=weights?sum/weights:0;
    const history=s.history.slice(-3);
    const V=history.some(h=>h.plan.signature===plan.signature)?0:history.some(h=>h.plan.silhouette===plan.silhouette)?0.5:1;
    // All catalog entries satisfy the three silhouette and three coherence predicates.
    return {H:1,C,M,U:1,V,total:30+25*C+20*M+15+10*V};
  }
  function available(s) { const c=count(); for(const m of s.materials)if(['free','soft'].includes(m.state))c[m.kind]++; return c; }
  function feasible(plan,s) {
    const fixed=[...s.installed.filter(p=>p.required),...(s.active&&s.active.part.required?[s.active.part]:[])];
    if(fixed.some(p=>!plan.parts.some(c=>fingerprint(c)===fingerprint(p))))return false;
    const ids=new Set(fixed.map(p=>p.id)), remaining=count();
    for(const c of plan.parts)if(!ids.has(c.id))for(const k of MATERIAL_KINDS)remaining[k]+=c.cost[k]||0;
    const budget=available(s); return MATERIAL_KINDS.every(k=>remaining[k]<=budget[k]);
  }
  function choose(s) {
    const candidates=CATALOG.filter(p=>feasible(p,s)).map(plan=>({plan,score:score(plan,s)}));
    if(!candidates.length)return null;
    const best=Math.max(...candidates.map(c=>c.score.total));
    const current=s.plan&&candidates.find(c=>c.plan.id===s.plan.id);
    if(current&&best<current.score.total+6-1e-9)return current;
    const pool=candidates.filter(c=>c.score.total>=best-8-1e-9&&(!current||c.score.total>=current.score.total+6-1e-9));
    const weights=pool.map(c=>1/(1+best-c.score.total));
    let roll=hash(s.seed+':'+s.building+':'+s.decision+':'+pool.map(c=>c.plan.id).join('|'))/4294967296*weights.reduce((a,b)=>a+b,0);
    for(let i=0;i<pool.length;i++){roll-=weights[i];if(roll<=0)return pool[i];}return pool[pool.length-1];
  }
  function create(seed=12691) {
    return {version:1,blueprint:'modular',layoutChoice:0,missing:null,seed:seed>>>0,time:0,building:1,decision:0,nextMaterial:1,nextBatch:1,materials:[],batches:[],
      plan:null,installed:[],active:null,decorations:[],status:'idle',paused:false,speed:1,history:[],startedAt:0,completedAt:null,
      pets:[{x:170,y:GROUND},{x:194,y:GROUND}],message:'先选一些材料，再开始你的小屋。',log:[],dirty:false};
  }
  function note(s,text) { s.message=text; s.log.unshift({time:s.time,text});s.log=s.log.slice(0,8); }
  function feedback(s,type,text=''){
    if(!s.experience)return;const x=s.experience;
    x.events.push({seq:++x.sequence,type,text,time:s.time});x.events=x.events.slice(-8);
  }
  function setMultiplier(s,value){
    if(![1,2].includes(value))return false;
    if(s.experience&&value===2&&s.missing){value=1;feedback(s,'normal','储备暂时用完了，材料送来后可再次选择双倍。');}
    if(s.experience)s.experience.multiplier=value;else s.speed=value;
    return true;
  }
  function addMaterials(s,kind,units) {
    if(!MATERIAL_KINDS.includes(kind)||!Number.isInteger(units)||units<1||units>100)return false;
    if(s.materials.filter(m=>m.kind===kind&&m.state!=='installed').length+units>240) {note(s,'这类材料已经堆满了，先让小伙伴用掉一些吧。');return false;}
    const batch=s.nextBatch++;s.batches.push({id:batch,kind,units});s.batches=s.batches.slice(-12);
    for(let i=0;i<units;i++)s.materials.push({id:s.nextMaterial++,kind,batch,state:'free',owner:null,building:null});
    s.dirty=true;
    note(s,s.status==='finishing'||s.status==='done'?'材料收好啦，会留给下一间小屋。':`收到了 ${units} 份${LABELS[kind]}。`);return true;
  }
  function reserve(s,plan) {
    // Build the complete next allocation before changing the old ledger.
    const pool=s.materials.filter(m=>['free','soft'].includes(m.state));
    const fixed=new Set([...s.installed.map(c=>c.id),...(s.active?[s.active.id]:[])]), assignment=new Map();
    for(const c of plan.parts)if(!fixed.has(c.id))for(const k of MATERIAL_KINDS) {
      const need=c.cost[k]||0, stock=pool.filter(m=>m.kind===k&&!assignment.has(m.id)).slice(0,need);
      if(stock.length!==need)return false; for(const m of stock)assignment.set(m.id,c.id);
    }
    for(const m of pool){m.state=assignment.has(m.id)?'soft':'free';m.owner=assignment.get(m.id)||null;m.building=assignment.has(m.id)?s.building:null;}
    s.plan=clone(plan);return true;
  }
  function replan(s) {
    if(!['building','waiting'].includes(s.status))return;
    if(s.plan?.template){s.dirty=false;s.status='building';s.missing=null;return;}
    const selected=choose(s);s.decision++;s.dirty=false;
    if(!selected){if(!s.plan){s.status='waiting';note(s,'还不够建好一整间小屋，再加一点木材或石材吧。');}return;}
    const changed=s.plan&&s.plan.id!==selected.plan.id;
    if(!reserve(s,selected.plan))throw Error('Reservation transaction failed');
    s.lastScore=selected.score;s.status='building';
    if(changed)note(s,'新材料有了新用处：保留已建部分，调整后面的施工。');
  }
  function preview(s){return s.plan||MOD.generate(hash(s.seed+':'+s.building),Object.fromEntries(KINDS.map(k=>[k,available(s)[k]])),s.layoutChoice||0);}
  function shuffle(s){if(s.status!=='idle')return false;s.blueprint='modular';s.layoutChoice=((s.layoutChoice||0)+1)%1000000;return true;}
  function canonical(plan){return plan?.modular?MOD.canonical(plan):ALL_PLANS.find(p=>p.id===plan?.id);}
  function start(s) {
    if(s.status!=='idle'&&s.status!=='waiting')return false;
    if(!s.plan&&s.blueprint==='modular'){s.plan=preview(s);s.status='building';s.paused=false;s.startedAt=s.time;s.dirty=false;note(s,'构件组合已确定，开始逐件搭建；缺料时会等你补齐。');return true;}
    if(!s.plan&&s.blueprint){s.plan=clone(BLUEPRINTS.find(p=>p.id===s.blueprint)||BLUEPRINTS[0]);CONFIG.validate(s.plan);
      if(CONFIG.site(s.plan).experience)s.experience={version:1,multiplier:s.speed===2?2:1,stage:0,sequence:0,events:[]};
      GATHER?.create(s,api);s.status='building';s.paused=false;s.startedAt=s.time;s.dirty=false;note(s,s.experience?'开工啦。材料会自动送来，安心看房子慢慢长出来。':'按图纸开工：缺少材料时会停下来等你。');return true;}
    s.status='waiting';s.paused=false;s.startedAt=s.time;replan(s);
    if(s.plan)note(s,'开工啦！先整理材料，慢慢打好地基。');return !!s.plan;
  }
  function taskLabel(c) {
    return c.label||({masonry:'砌筑石墙模块',plaster:'安装半木墙面',archdoor:'安装拱形门',cornice:'安装塔楼檐口',steeproof:'拼装尖顶',roofhalf:'铺设屋顶坡面',flag:'升起旗帜',crest:'安装城堡纹章',battlement:'砌筑城垛',dormer:'安装老虎窗',chimney:'砌筑烟囱',shutters:'安装木百叶窗',awning:'安装门口遮阳篷',clock:'安装木制钟面',base:'铺设地基',post:'竖起立柱',beam:'两人合抬横梁',wall:'安装墙面',gable:'拼装山墙',roof:'铺设斜屋面',ridge:'合拢屋脊',flat:'铺设盖顶',canopy:'两人展开布篷',deck:'安装楼板',ladder:'固定上层梯子',sign:'挂上木招牌',banner:'挂好布饰',step:'摆放入口石阶'})[c.kind];
  }
  function beginTask(s,c) {
    const site=CONFIG.site(s.plan),timber=MOT?.isTimber(s.plan,c);
    // Finish a collector's current delivery before asking the same pet to lift timber.
    if(s.wilderness?.active&&(s.wilderness.active.team||timber))return;
    if(s.plan.template){
      const budget=available(s),missing={};
      for(const k of MATERIAL_KINDS)if((c.cost[k]||0)>budget[k])missing[k]=c.cost[k]-budget[k];
      if(Object.keys(missing).length){
        if(s.experience?.multiplier===2){s.experience.multiplier=1;feedback(s,'normal','储备暂时用完了，已恢复正常施工。材料会自动送来。');}
        s.status='waiting';s.missing={module:c.id,label:taskLabel(c),cost:c.cost,amounts:missing};note(s,`等待材料：${taskLabel(c)}还缺 `+Object.entries(missing).map(([k,n])=>`${LABELS[k]} ${n} 份`).join('、')+'。补齐后自动继续。');return;}
      const assigned=[];
      for(const k of MATERIAL_KINDS)assigned.push(...s.materials.filter(m=>m.state==='free'&&m.kind===k).slice(0,c.cost[k]||0));
      for(const m of assigned){m.state='soft';m.owner=c.id;m.building=s.building;}
      s.missing=null;
    }
    const stock=s.materials.filter(m=>m.state==='soft'&&m.owner===c.id&&m.building===s.building);
    if(MATERIAL_KINDS.some(k=>stock.filter(m=>m.kind===k).length!==(c.cost[k]||0)))throw Error('Missing reserved material');
    for(const m of stock)m.state='hard'; // Dedicated shaping begins at claim: irreversible and atomic.
    if(s.plan.cutaway){
      const target=CONFIG.target(s.plan,c);
      s.active=MOT.create(c,stock,s.pets,site.gathering?1-site.gathering.worker:hash(c.id)%2,target,timber,MOT.isChinking(s.plan,c),site);
      note(s,taskLabel(c)+(timber?' · 两人抬木，到墙下再抬升对齐':s.plan.gridBuild?' · 搬一块，建一格':' · 每次搬一块，搬齐后敲打建造'));return;
    }
    const target=(s.plan.modular?MOD.workPoint(s.plan,c):ART.workPoint(s.plan,c.id))||{x:ORIGIN+(c.x+c.w/2)*GRID,y:Math.min(GROUND,GROUND-c.y*GRID)};
    const supply={x:c.material==='W'?84:c.material==='S'?127:165,y:GROUND};
    const lead=hash(c.id)%2;
    const workers=c.workers===2?[0,1]:[lead];
    const descend=Math.max(...workers.map(i=>GROUND-s.pets[i].y))/27;
    const travel=Math.max(...workers.map(i=>Math.abs(s.pets[i].x-supply.x)))/38;
    const walk=Math.abs(target.x-supply.x)/34;
    const climb=(GROUND-target.y)/27;
    s.active={id:c.id,part:clone(c),workers,materialIds:stock.map(m=>m.id),elapsed:0,phase:'fetch',target,supply,
      starts:s.pets.map(p=>({...p})),durations:[descend,Math.max(.5,travel),1.4,walk,climb,c.seconds],total:descend+Math.max(.5,travel)+1.4+walk+climb+c.seconds};
    note(s,taskLabel(c)+' · '+(c.workers===2?'一起搭把手':'一件一件来'));
  }
  function finishPlan(s) {
    if(s.plan.template){s.decorations=[];s.status='finishing';s.dirty=false;return;}
    const extras=[],budget=available(s),deps=s.installed.map(p=>p.id);
    const append=(id,kind,x,y,w,h,material,units)=>{if(budget[material]>=units){budget[material]-=units;extras.push({id,kind,x,y,w,h,material,cost:{[material]:units},deps,seconds:4,workers:1,required:false,layer:5});}};
    append('decor-sign','sign',1,4,3,1,'W',1);
    append('decor-step','step',1,0,3,1,'S',1);
    // The outside face of the right pillar is a dedicated decorative socket.
    append('decor-banner','banner',4,2,1,2,'C',1);
    const future=s.materials.filter(m=>m.state==='free');const assignments=[];
    for(const c of extras){const m=future.find(m=>m.kind===c.material&&!assignments.some(a=>a.m.id===m.id));if(!m)throw Error('Decoration budget');assignments.push({m,c});}
    for(const {m,c} of assignments){m.state='soft';m.owner=c.id;m.building=s.building;}
    s.decorations=extras;s.status='finishing';note(s,extras.length?'主体做好了，添上最后一点生活气息。':'小屋已经搭好了！');
  }
  function advance(s,dt=1/30) {
    if(s.paused||!['building','waiting','finishing'].includes(s.status))return;
    s.time+=dt;
    GATHER?.advance(s,dt,api);
    if(s.dirty)replan(s);
    if(s.active) {
      const a=s.active,phase=a.phase;a.elapsed+=dt*(s.experience?.multiplier||1);
      if(MOT?.accepts(a)){
        const pose=MOT.sample(a);a.phase=pose.phase;
        if(pose.team)pose.pets.forEach((p,i)=>{s.pets[i]={...p};});
        else s.pets[a.workers[0]]={x:pose.x,y:pose.y};
      }else{
      let rest=a.elapsed,index=0;
      while(index<a.durations.length-1&&rest>=a.durations[index])rest-=a.durations[index++];
      const t=Math.min(1,rest/Math.max(.001,a.durations[index]));a.phase=['descend','fetch','shape','carry','climb','install'][index];
      for(const i of a.workers) {
        const offset=a.workers.length===2?(i===0?-7:7):0;
        const pet=s.pets[i], start=a.starts[i];
        if(index===0){pet.x=start.x;pet.y=start.y+(GROUND-start.y)*t;}
        if(index===1){pet.x=start.x+(a.supply.x+offset-start.x)*t;pet.y=GROUND;}
        if(index===2){pet.x=a.supply.x+offset;pet.y=GROUND;}
        if(index===3){pet.x=a.supply.x+(a.target.x-a.supply.x)*t+offset;pet.y=GROUND;}
        if(index===4){pet.x=a.target.x+offset;pet.y=GROUND+(a.target.y-GROUND)*t;}
        if(index===5){pet.x=a.target.x+offset;pet.y=a.target.y;}
      }
      }
      if(a.phase!==phase&&['deliver','install','align'].includes(a.phase))feedback(s,a.phase==='deliver'?'drop':'hammer');
      if(a.elapsed>=a.total) {
        s.installed.push(a.part);
        for(const id of a.materialIds){const m=s.materials.find(m=>m.id===id);m.state='installed';}
        s.active=null;s.dirty=true;
        const stages=CONFIG.site(s.plan).experience?.stages||[];
        while(s.experience&&s.experience.stage<stages.length&&stages[s.experience.stage].parts.every(id=>s.installed.some(p=>p.id===id))){feedback(s,'stage',stages[s.experience.stage].label);s.experience.stage++;}
      }
      return;
    }
    if(s.status==='waiting')return;
    const done=new Set(s.installed.map(p=>p.id));
    const list=s.status==='finishing'?s.decorations:s.plan.parts;
    const ready=list.filter(c=>!done.has(c.id)&&c.deps.every(id=>done.has(id)));
    if(ready.length) {
      // Prefer tasks which unlock more work; deterministic IDs resolve ties.
      if(!s.plan.template)ready.sort((a,b)=>list.filter(c=>c.deps.includes(b.id)).length-list.filter(c=>c.deps.includes(a.id)).length||a.id.localeCompare(b.id,'en'));
      const c=ready[0];
      if(s.status==='building'&&['roof','canopy','flat','deck'].includes(c.kind)&&!s.roofChecked){s.roofChecked=true;replan(s);return;}
      beginTask(s,c);return;
    }
    if(list.some(c=>!done.has(c.id)))throw Error('Construction dependency deadlock');
    if(s.status==='building') {replan(s);if(s.plan.parts.some(c=>!done.has(c.id)))return;finishPlan(s);}
    else {GATHER?.cancel(s);s.status='done';s.completedAt=s.time;s.pets=CONFIG.site(s.plan).rest;feedback(s,'complete','小屋完工啦，坐一会儿。');note(s,'小屋完工啦。坐一会儿，再去下一块空地吧。');}
  }
  function next(s) {
    if(s.status!=='done')return false;
    s.history.push({number:s.building,plan:clone(s.plan),parts:clone(s.installed)});
    delete s.wilderness;
    delete s.experience;
    s.building++;s.plan=null;s.installed=[];s.active=null;s.decorations=[];s.status='idle';s.decision=0;s.roofChecked=false;s.completedAt=null;s.paused=false;s.dirty=false;s.missing=null;s.blueprint='modular';s.layoutChoice=0;
    s.pets=[{x:170,y:GROUND},{x:194,y:GROUND}];note(s,'余料已经带来了，新的一间会是什么样呢？');return true;
  }
  function inventory(s) {
    const result={free:count(),reserved:count(),installed:count()};
    for(const m of s.materials)result[m.state==='free'?'free':m.state==='installed'?'installed':'reserved'][m.kind]++;
    return result;
  }
  function validate(s) {
    if(!s||s.version!==1||!Number.isInteger(s.seed)||!Number.isFinite(s.time)||s.time<0||!Number.isInteger(s.building)||s.building<1||!Array.isArray(s.materials)||s.materials.length>100000)throw Error('存档格式不兼容');
    if(!['idle','waiting','building','finishing','done'].includes(s.status)||![1,2,10,30].includes(s.speed)||typeof s.paused!=='boolean')throw Error('存档状态无效');
    if(!Array.isArray(s.installed)||!Array.isArray(s.history)||!Array.isArray(s.batches)||!Array.isArray(s.decorations)||!Array.isArray(s.pets)||s.pets.length!==2)throw Error('存档结构无效');
    if(s.layoutChoice!==undefined&&(!Number.isInteger(s.layoutChoice)||s.layoutChoice<0||s.layoutChoice>=1000000))throw Error('组合编号损坏');
    const ids=new Set();for(const m of s.materials){if(!Number.isInteger(m.id)||ids.has(m.id)||!MATERIAL_KINDS.includes(m.kind)||!['free','soft','hard','installed'].includes(m.state))throw Error('材料账本损坏');ids.add(m.id);}
    if(!Number.isInteger(s.nextMaterial)||s.materials.some(m=>m.id>=s.nextMaterial))throw Error('材料编号损坏');
    if(s.plan) {
      CONFIG.validate(s.plan);const definition=canonical(s.plan);if(!definition||JSON.stringify(definition)!==JSON.stringify(s.plan))throw Error('建筑方案损坏');
    } else if(['building','finishing','done'].includes(s.status))throw Error('缺少建筑方案');
    const definitions=[...(s.plan?s.plan.parts:[]),...s.decorations];
    const currentIds=new Set();
    for(const p of s.installed){if(currentIds.has(p.id)||!definitions.some(c=>JSON.stringify(c)===JSON.stringify(p)))throw Error('已安装构件损坏');currentIds.add(p.id);}
    const activeIds=new Set(s.active?s.active.materialIds:[]);
    if(s.active) {
      if(currentIds.has(s.active.id)||!definitions.some(c=>JSON.stringify(c)===JSON.stringify(s.active.part))||s.active.id!==s.active.part.id||!Number.isFinite(s.active.elapsed)||s.active.elapsed<0||s.active.elapsed>s.active.total+.1)throw Error('施工任务损坏');
      if(!Array.isArray(s.active.workers)||s.active.workers.length!==(MOT?.isTeam(s.active)?2:s.active.motion===MOT?.VERSION?1:s.active.part.workers)||new Set(s.active.workers).size!==s.active.workers.length||s.active.workers.some(i=>i!==0&&i!==1))throw Error('施工人员损坏');
    }
    for(const field of ['nextBatch','decision'])if(!Number.isInteger(s[field])||s[field]<0)throw Error('计数器损坏');
    for(const pet of s.pets)if(!Number.isFinite(pet.x)||!Number.isFinite(pet.y)||pet.x<0||pet.x>480||pet.y<0||pet.y>GROUND)throw Error('宠物位置损坏');
    if(s.active){
      const a=s.active;
      if(a.motion!==undefined&&(!s.plan.cutaway||!MOT?.accepts(a)))throw Error('未知施工动作版本');
      if(MOT?.accepts(a)){
        if((a.motion===MOT.VERSION&&CONFIG.action(a.part)!=='install')||(a.motion===MOT.LONG_VERSION&&CONFIG.action(a.part)!=='timber-lift')||(a.motion===MOT.TEAM_VERSION&&CONFIG.action(a.part)!=='team-lift'))throw Error('施工动作不匹配');
        if(MOT.isTeam(a)&&!MOT.isTimber(s.plan,a.part))throw Error('合抬图纸损坏');
        if(a.motion===MOT.MUD_VERSION&&!MOT.isChinking(s.plan,a.part))throw Error('泥封图纸损坏');
        if(JSON.stringify(a.site)!==JSON.stringify(CONFIG.site(s.plan))||JSON.stringify(a.target)!==JSON.stringify(CONFIG.target(s.plan,a.part)))throw Error('施工工地配置损坏');
        MOT.validate(a,s.materials);
      }
      if(!Array.isArray(a.durations)||(!MOT?.accepts(a)&&a.durations.length!==6)||a.durations.some(n=>!Number.isFinite(n)||n<0||n>120)||!Number.isFinite(a.total)||Math.abs(a.durations.reduce((x,y)=>x+y,0)-a.total)>.001)throw Error('施工时间损坏');
      if(!Array.isArray(a.materialIds)||new Set(a.materialIds).size!==a.materialIds.length||a.materialIds.some(id=>!s.materials.some(m=>m.id===id&&m.owner===a.id&&m.state==='hard'&&m.building===s.building)))throw Error('施工材料损坏');
      if(!a.part.deps.every(id=>currentIds.has(id)))throw Error('施工前置缺失');
      for(const pos of [a.target,a.supply,...a.starts])if(!pos||!Number.isFinite(pos.x)||!Number.isFinite(pos.y)||pos.x<0||pos.x>480||pos.y<0||pos.y>GROUND)throw Error('施工路径损坏');
    }
    if(new Set(s.decorations.map(c=>c.id)).size!==s.decorations.length||s.decorations.length>3||s.decorations.some(c=>!['decor-sign','decor-step','decor-banner'].includes(c.id)||c.required!==false||!MATERIAL_KINDS.includes(c.material)||c.cost[c.material]!==1||c.seconds!==4||c.workers!==1||![c.x,c.y,c.w,c.h].every(Number.isInteger)))throw Error('装饰定义损坏');
    for(const m of s.materials) {
      if(m.state==='hard'&&!activeIds.has(m.id))throw Error('材料任务归属损坏');
      if(m.state!=='free'&&m.building===s.building&&!definitions.some(c=>c.id===m.owner))throw Error('材料引用损坏');
    }
    for(const c of definitions) {
      const expected=currentIds.has(c.id)?'installed':s.active?.id===c.id?'hard':'soft';
      for(const k of MATERIAL_KINDS)if(s.materials.filter(m=>m.building===s.building&&m.owner===c.id&&m.kind===k&&m.state===expected).length!==(s.plan?.template&&expected==='soft'?0:(c.cost[k]||0)))throw Error('构件材料不守恒');
    }
    const decorationSpec={
      'decor-sign':['sign',1,4,3,1,'W'],
      'decor-step':['step',1,0,3,1,'S'],
      'decor-banner':['banner',4,2,1,2,'C']
    };
    const buildings=new Map([[s.building,{plan:s.plan,parts:s.installed,decorations:s.decorations}]]);
    for(const h of s.history){
      if(!Number.isInteger(h.number)||h.number<1||h.number>=s.building||buildings.has(h.number)||!Array.isArray(h.parts))throw Error('历史建筑损坏');
      const definition=canonical(h.plan);
      if(!definition||JSON.stringify(h.plan)!==JSON.stringify(definition))throw Error('历史方案损坏');
      const base=h.parts.filter(p=>p.required),decorations=h.parts.filter(p=>!p.required);
      if(base.length!==definition.parts.length||base.some(p=>!definition.parts.some(c=>JSON.stringify(c)===JSON.stringify(p))))throw Error('历史构件损坏');
      buildings.set(h.number,{plan:h.plan,parts:h.parts,decorations});
    }
    for(const [number,b] of buildings){
      if(new Set(b.parts.map(c=>c.id)).size!==b.parts.length||b.decorations.length>3)throw Error('重复构件');
      for(const d of b.decorations){
        if(JSON.stringify([d.kind,d.x,d.y,d.w,d.h,d.material])!==JSON.stringify(decorationSpec[d.id])||Object.keys(d.cost).length!==1||d.cost[d.material]!==1)throw Error('装饰规格损坏');
      }
      if(number!==s.building)for(const c of b.parts)for(const k of MATERIAL_KINDS)if(s.materials.filter(m=>m.building===number&&m.owner===c.id&&m.state==='installed'&&m.kind===k).length!==(c.cost[k]||0))throw Error('历史材料不守恒');
    }
    for(const m of s.materials){
      if(m.state==='free'){if(m.owner!==null||m.building!==null)throw Error('自由材料归属错误');continue;}
      const b=buildings.get(m.building);if(!b||!b.plan)throw Error('材料所属建筑不存在');
      const definition=[...b.plan.parts,...b.decorations].find(c=>c.id===m.owner);
      if(!definition||!(definition.cost[m.kind]>0)||(m.building!==s.building&&m.state!=='installed'))throw Error('材料归属不合法');
    }
    const experience=CONFIG.site(s.plan).experience;
    if(!!experience!==!!s.experience)throw Error('体验版本缺失');
    if(s.experience){const x=s.experience,stages=experience.stages||[];
      if(x.version!==1||![1,2].includes(x.multiplier)||!Number.isInteger(x.stage)||x.stage<0||x.stage>stages.length||stages.slice(0,x.stage).some(a=>!a.parts.every(id=>currentIds.has(id)))||!Number.isInteger(x.sequence)||x.sequence<0||!Array.isArray(x.events)||x.events.length>8||x.events.some((e,i)=>!Number.isInteger(e.seq)||e.seq<1||e.seq>x.sequence||(i&&e.seq<=x.events[i-1].seq)||!['drop','hammer','stage','complete','normal','gather'].includes(e.type)||typeof e.text!=='string'||!Number.isFinite(e.time)||e.time<0||e.time>s.time))throw Error('体验进度损坏');
    }
    GATHER?.validate(s);
    return true;
  }
  function save(s) { validate(s);return JSON.stringify(s); }
  function restore(text) { if(text.length>12000000)throw Error('存档过大');const s=JSON.parse(text);if(s.status==='idle')s.blueprint='modular';else if(s.blueprint===undefined)s.blueprint='blueprint-castle';if(s.speed===.5||s.speed===1.5)s.speed=1;validate(s);return s; }
  const api={KINDS,MATERIAL_KINDS,LABELS,GRID,GROUND,ORIGIN,CATALOG,BLUEPRINTS,create,preview,shuffle,addMaterials,start,advance,next,inventory,score,feasible,choose,reserve,validate,save,restore,taskLabel,hash,feedback,setMultiplier};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this);
