(function(root){
 'use strict';
 const E=root.TownGrowthEngine,B=root.TownGrowthConfig.create(),R=root.TownGrowthRenderer,T=root.TownSessionClock,I=root.TownIdleTime;
 let C=E.scene(E.create(B),B);
 const $=id=>document.getElementById(id),key=E.SAVE_KEY,backupKey=key+':debug-backup';
 const clock=T.create(performance.now()),canvas=$('town-scene'),kinds=Object.keys(C.materials);
 const overview=C.view.levels.find(v=>v.overview)||C.view.levels[0];
 let parts=new Map(C.parts.map(p=>[p.id,p])),groups=new Map(C.groups.map(g=>[g.id,g])),rooms=new Map(C.rooms.map(r=>[r.id,r]));
 let s=null,raw=null,level=overview.id,loadError=null,lastSave=0,lastUI=0,saveError='',debugSpeed=1,activeTab=null,busy=false,toastTimer;
 let owner=false,ready=false,releaseLock=null;const camera={x:0,y:0,zoom:1};
 let selectionPlan=null,locationId=null,variantId=null,previewChoice=null,picking=false;
 let previewId=null,previewReturn=null,interactionId=null,observed=null,unseen=[],resultIds=[];const dialogTriggers=new Map(),suppressedCloses=new Set();
 const names={preparing:'安排搬迁与设施停工',work:'逐件施工',settling:'入住与返家',install:'搬运安装',dismantle:'拆解回收',move:'完整搬出家具',reuse:'复用家具',relocate:'搬迁中'};
 const zero=()=>Object.fromEntries(kinds.map(k=>[k,0]));
 const text=(id,value)=>{const el=$(id),next=String(value);if(el.textContent!==next)el.textContent=next;};
 const el=(tag,className,value)=>{const node=document.createElement(tag);if(className)node.className=className;if(value!==undefined)node.textContent=value;return node;};
 const formatCost=a=>Object.entries(a).filter(([,n])=>n).map(([k,n])=>C.materials[k]+' '+n).join('、')||'无';
 const title=p=>p.name.replace(/^[①②③④⑤⑥⑦⑧⑨⑩]\s*/, '');
 const timeLabel=n=>Math.floor(n/60)+' : '+String(Math.floor(n%60)).padStart(2,'0');
 const roomName=home=>{const b=C.beds.find(b=>b.id===home);return b?rooms.get(b.room).name+(b.temporary?' · 临时铺位':''):'尚未入住';};
 const blocked=()=>!s||!owner||!ready||busy||clock.debt>=T.STEP;
 function toast(message){text('toast',message);$('toast').hidden=false;clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').hidden=true,4200);}
 function resetClock(){clock.debt=0;clock.previous=performance.now();lastSave=s?.time||0;}
 async function restore(){try{raw=localStorage.getItem(key);const original=raw?E.restore(raw,C):I.baseline(E.create(C,crypto.getRandomValues(new Uint32Array(1))[0]),Date.now());
   initNotices(original);if(owner){busy=true;s=original;text('ownership-banner','正在结算离开期间的小镇…');$('ownership-banner').hidden=false;refresh();
    try{s=await I.settle(original,{E,c:C,storage:localStorage,owns:()=>owner,onProgress:(n,total)=>text('ownership-banner',`正在结算 ${Math.floor(n/60)} / ${Math.ceil(total/60)} 分钟…`)});}
    catch(e){s=original;saveError='离线结算未保存，原记录保留：'+e.message;throw e;}
    finally{busy=false;}
    $('ownership-banner').hidden=true;ready=true;resetClock();if(s.lastOffline.seconds>=5)showOffline();
   }else{s=original;text('ownership-banner','另一个标签页正在管理此小镇。本页只读；关闭另一页后刷新即可接管。');$('ownership-banner').hidden=false;}
  }catch(e){loadError=e.message;text('load-error-text',e.message);ready=false;if(!raw)s=null;}$('load-error').hidden=!loadError;refresh();}
 function persist(){if(!s||loadError||!owner||!ready||busy)return false;const old=s.wallTime;try{s.wallTime=Math.max(old,Date.now()-clock.debt/debugSpeed*1000);localStorage.setItem(key,E.save(s,C));lastSave=s.time;saveError='';return true;}catch(e){s.wallTime=old;saveError='保存失败：'+e.message;return false;}}
 function capture(){T.capture(clock,performance.now(),!!s&&owner&&ready&&!s.paused&&!busy,debugSpeed);if(s&&owner&&ready&&!busy)T.pump(clock,s,{advance:(state,dt)=>E.advance(state,dt,C)},240);}
 function act(f){capture();if(blocked()){toast(busy?'正在完成调试操作，请稍候。':'正在补算小镇进度，请稍候再操作。');return;}const result=f();persist();refresh();return result;}
 function download(value,name){const a=el('a');a.href=URL.createObjectURL(new Blob([value],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 function replaceState(next,backup,resetNotifications=false){
  if(!owner)throw Error('本页只读，不能写入小镇');I.baseline(next,Date.now());
  const encoded=E.save(next,C),original=s?E.save(s,C):raw;
  if(original!==null&&original!==undefined)localStorage.setItem(backup,original);
  localStorage.setItem(key,encoded);s=next;if(resetNotifications){initNotices(next,true);selectionPlan=null;locationId=null;variantId=null;previewChoice=null;previewReturn=null;}ready=true;raw=null;loadError=null;saveError='';resetClock();$('load-error').hidden=true;
 }
 function confirmAction(message){
  const dialog=$('confirm-dialog');text('confirm-message',message);dialog.returnValue='';
  return new Promise(resolve=>{const previous=document.querySelector('dialog[open]'),trigger=document.activeElement;dialog.addEventListener('close',()=>{if(previous){openDialog(previous.id,dialogTriggers.get(previous.id));trigger.focus();}resolve(dialog.returnValue==='accept');},{once:true});openDialog('confirm-dialog',trigger);});
 }
 async function restart(){
  capture();if(busy||clock.debt>=T.STEP){toast('正在处理进度，请稍候再开始新小镇。');return;}
  if(!await confirmAction('将当前记录另存备份，再开始一个新小镇？旧版建造的记录不受影响。'))return;
  try{replaceState(E.create(C,crypto.getRandomValues(new Uint32Array(1))[0]),key+':backup:'+Date.now(),true);ready=true;debugSpeed=1;level=overview.id;document.querySelectorAll('dialog[open]').forEach(d=>d.close());refresh();toast('已备份原记录，新小镇准备好了。');}
  catch(e){text('settings-status','未能建立新记录，原进度保留：'+e.message);if(loadError)text('load-error-text','未能备份，未覆盖原记录：'+e.message);toast('操作失败，原记录仍保留。');}
 }
 function openDialog(id,trigger=document.activeElement){
  for(const d of document.querySelectorAll('dialog[open]')){suppressedCloses.add(d);d.close();}dialogTriggers.set(id,trigger);$(id).showModal();
 }
 function setTab(name,trigger=document.activeElement){
  if(name==='projects')resultIds=[...unseen];
  activeTab=name;for(const panel of $('management-dialog').querySelectorAll('.tab-panel'))panel.hidden=panel.id!=='panel-'+name;
  text('management-title',({projects:'建造',extensions:'建造 · 位置与尺寸',residents:'居民与床位',storage:'仓库与家具',rooms:'建筑与区域',journal:'小镇动态'})[name]);
  openDialog('management-dialog',trigger);refresh();
 }
 const completionKey=p=>JSON.stringify([p.id,p.time]);
 const noticeTown=state=>JSON.stringify([state.signature,state.layout.seed]);
 function saveNotices(){try{localStorage.setItem(key+':ui',JSON.stringify({town:noticeTown(s),observed,unseen}));}catch{ /* Notice storage is independent of the town transaction. */ }}
 function initNotices(state,reset=false){
  let record;if(!reset)try{record=JSON.parse(localStorage.getItem(key+':ui'));}catch{}
  const ids=state.completed.map(completionKey),valid=record?.town===noticeTown(state)&&Array.isArray(record.observed)&&Array.isArray(record.unseen);
  observed=valid?record.observed.filter(id=>ids.includes(id)):ids;unseen=valid?record.unseen.filter(id=>ids.includes(id)):[];resultIds=[];
  if(reset)saveNotices();
 }
 function checkNotices(){
  if(!ready||busy||observed===null)return;const ids=s.completed.map(completionKey),fresh=ids.filter(id=>!observed.includes(id));
  unseen=unseen.filter(id=>ids.includes(id));resultIds=resultIds.filter(id=>ids.includes(id));
  if(!fresh.length&&JSON.stringify(observed)===JSON.stringify(ids))return;
  observed=ids;unseen.push(...fresh);
  if(fresh.length){if($('management-dialog').open&&activeTab==='projects')resultIds.push(...fresh);const done=s.completed.filter(p=>fresh.includes(completionKey(p)));toast(done.map(q=>title(C.plans.find(p=>p.id===q.id))+'已完工').join('、')+'，可在「建造」查看成果。');}
  saveNotices();
 }
 function planReason(p){
  if(s.completed.some(q=>q.id===p.id))return '已完成';const missing=p.requires.filter(id=>!s.completed.some(q=>q.id===id));if(missing.length)return '前置：'+missing.map(id=>title(C.plans.find(q=>q.id===id))).join('、');
  if(s.project)return '当前工程尚未完成';if(p.mode==='build'&&p.slot!==B.root.slot){const options=E.candidates(s,B,p.id).flatMap(o=>o.versions);if(!options.length)return '没有合法相邻位置；主体、连接或承托空间不足';const checks=options.map(b=>E.preview(s,B,p.id,b));return checks.every(p=>p.error)?checks[0].error:'';}return E.preview(s,B,p.id).error||'';
 }
 function projectInfo(){
  const p=s.project;if(!p){const remaining=C.plans.filter(p=>!s.completed.some(q=>q.id===p.id)),available=remaining.some(p=>!planReason(p));return {label:unseen.length?'有完工成果':available?'选择下一项':remaining.length?'暂时无法开工':'全部建成',percent:null,detail:!remaining.length?'当前内容已全部建成，小镇继续生产':available?'选择项目，查看图纸后确认开工':'尚有项目未完成，请查看条件或空间限制',state:'idle'};}
  const plan=E.currentPlan(s,C),worker=s.pets.find(p=>C.pets.find(d=>d.id===p.id).capabilities.includes('build')),task=plan.tasks[p.at],a=worker.action;
  const stock=E.inventory(s,C),missing=task?.type==='install'&&a?.type!=='install'?Object.entries(parts.get(task.target).cost).filter(([k,n])=>stock[k]<n):[];
  const room=rooms.get(plan.targetRoom),connecting=p.phase==='work'&&plan.mode==='build'&&room.requirements.every(id=>s.objects[id].status==='installed')&&!E.roomReady(s,room.id,C);
  let stage,detail,handling='automatic';
  if(p.phase==='preparing'){
   stage='正在准备';const delivery=s.pets.filter(pet=>pet.action?.type==='production'&&p.affected.includes(pet.action.room));const moves=p.moves.filter(m=>s.pets.find(p=>p.id===m.pet).home!==m.bed);
   detail=delivery.length?'等待 '+delivery.map(p=>C.pets.find(d=>d.id===p.id).name).join('、')+' 的当前批次完成并交付':moves.length?'等待 '+moves.map(m=>C.pets.find(d=>d.id===m.pet).name+' 搬至'+roomName(m.bed)).join('、'):'正在检查住处与设施，随后自动施工';
  }else if(p.phase==='settling'){
   const arriving=plan.settle.filter(m=>s.pets.find(p=>p.id===m.pet).home!==m.bed);stage=arriving.some(m=>p.oldHomes.find(old=>old.pet===m.pet)?.home!==m.bed)?'正在入住':'正在安排返家';
   const moves=arriving.length?arriving:p.oldHomes.filter(old=>old.home&&p.moves.some(m=>m.pet===old.pet)&&!plan.settle.some(m=>m.pet===old.pet)&&E.bedAvailable(s,C.beds.find(b=>b.id===old.home),C)&&s.pets.find(p=>p.id===old.pet).home!==old.home).map(old=>({pet:old.pet,bed:old.home}));
   detail=moves.length?moves.map(m=>C.pets.find(d=>d.id===m.pet).name+' → '+roomName(m.bed)).join('、')+'；完成后工程才结束':'施工任务已结束，正在完成住处安排';
   if(moves.some(m=>s.pets.find(p=>p.id===m.pet).action?.type==='production'))detail+='；等待当前批次交付后自动继续';
   else if(moves.length&&!s.pets.some(p=>p.action?.type==='relocate')){handling='blocked';detail+='。'+s.message;}
  }else{
   stage=connecting?'正在接通入口':task?'施工中':'施工任务已结束';
   detail=connecting?'主体已就绪，接通入口后才能使用。':!task?'正在转入住处安排，工程尚未结束。':'';
   if(missing.length){handling='materials';detail+='当前任务尚缺 '+missing.map(([k,n])=>C.materials[k]+' '+(n-stock[k])).join('、')+'；会自动采集或生产，补齐后继续。';}
   else if(a)detail+='正在'+(a.type==='production'?'采集与运输材料':names[a.type]||'施工')+'，自动继续。';
   else if(task&&p.locked){handling='blocked';detail+='等待处理：'+s.message;}
   else if(task)detail+='正在准备首项施工任务。';
  }
  const fraction=a&&['install','dismantle','move','reuse'].includes(a.type)?a.elapsed/a.total:0;
  const percent=p.phase==='work'&&task?Math.floor((p.at+fraction)/plan.tasks.length*100):null;
  return {label:title(plan)+' · '+stage,stage,percent,detail:(s.paused?'整个小镇已暂停；施工、生产、搬迁与来访移动均暂停。':'')+detail,state:s.paused?'paused':handling==='materials'?'waiting':handling==='blocked'?'blocked':p.phase,handling};
 }
 function benefits(p,cfg=C){
  const out=[],target=p.targetRoom;
  if(p.mode==='build'){const beds=cfg.beds.filter(b=>b.room===target);if(beds.length)out.push('新增 '+beds.length+' 个床位；空床不会增加居民');}
  const added=new Set(p.tasks.filter(t=>t.type==='install').map(t=>t.target)),facilities=cfg.groups.filter(g=>g.capability&&g.parts.some(id=>added.has(id)));
  if(facilities.length)out.push('新增或升级：'+facilities.map(g=>g.label).join('、'));
  if(p.mode==='comfort'){const bonus=cfg.bonus.find(b=>b.room===target);if(bonus)out.push('该住宅已入住居民作业效率 +'+Math.round((bonus.multiplier-1)*100)+'%（运输不变）');}
  if(p.effect?.capacity)out.push('四种基础仓容量 ×'+p.effect.capacity+'：'+formatCost(Object.fromEntries(kinds.map(k=>[k,B.capacity[k]*p.effect.capacity]))));
  if(p.effect?.efficiency)out.push((p.effect.residents?'已入住居民':C.recipes.filter(r=>r.capability===p.effect.capability).map(r=>r.name).join('、')+'岗位')+'作业效率 +'+Math.round(p.effect.efficiency*100)+'%（运输不变）');
  if(p.effect?.decorations?.length)out.push(p.effect.decorations.length+' 种可切换摆设');
  return out.join('；')||p.description;
 }
 function chooseProject(p){
  if(p.mode==='build'&&p.slot!==B.root.slot){selectionPlan=p.id;setTab('extensions');}else showPreview(p.id);
 }
 function updateProjects(){
  const info=projectInfo();text('badge-label','建造');text('badge-progress',(s.paused?'小镇暂停 · ':'')+(info.stage||info.label));
  $('project-badge').dataset.state=info.state;$('project-badge').setAttribute('aria-label','建造：'+info.label+'。'+info.detail+'。点击查看');$('badge-ring').style.strokeDashoffset=info.percent===null?132:132*(1-info.percent/100);$('project-notice').hidden=!unseen.length;
  if(!$('management-dialog').open||activeTab!=='projects')return;
  if(resultIds.some(id=>unseen.includes(id))){unseen=unseen.filter(id=>!resultIds.includes(id));saveNotices();$('project-notice').hidden=!unseen.length;}
  const remaining=C.plans.filter(p=>!s.completed.some(q=>q.id===p.id)),available=remaining.filter(p=>p.requires.every(id=>s.completed.some(q=>q.id===id))),done=C.plans.filter(p=>s.completed.some(q=>q.id===p.id));
  const signature=JSON.stringify([s.project?.plan,s.project?.locked,s.paused,done.map(p=>p.id),resultIds,available.map(p=>[p.id,planReason(p)]),blocked()]);
  if($('project-list').dataset.signature!==signature){
   $('project-list').dataset.signature=signature;$('project-list').replaceChildren();$('completed-projects').replaceChildren();$('project-result').replaceChildren();$('project-result').hidden=!resultIds.length;$('project-history').hidden=!done.length;
   if(resultIds.length){for(const q of s.completed.filter(q=>resultIds.includes(completionKey(q)))){const p=C.plans.find(p=>p.id===q.id);$('project-result').append(el('h3','',title(p)+'已完工'),el('p','',benefits(p)));}
    $('project-result').append(el('p','',available.length?'下一步：'+available.map(p=>title(p)+' — '+p.description+(planReason(p)?' 条件：'+planReason(p):'')).join('；'):info.detail));
    const actions=el('div','dialog-actions'),next=el('button','primary',available.some(p=>p.base)?'看看下一步':'选择下一项建造'),later=el('button','','先让小镇运转');next.id='build-next';next.hidden=!remaining.length;next.onclick=()=>{resultIds=[];$('project-list').dataset.signature='';updateProjects();document.querySelector('#project-list button:not(:disabled)')?.focus();};later.id='build-later';later.onclick=()=>$('management-dialog').close();actions.append(next,later);$('project-result').append(actions);
   }
   const shown=s.project?[C.plans.find(p=>p.id===s.project.plan)]:resultIds.length?[]:available;
   for(const p of shown){const current=s.project?.plan===p.id,row=el('article','project-row'+(current||p.base?' current':''));row.dataset.plan=p.id;row.append(el('h3','',title(p)),el('p','',p.description));
    if(current){row.append(el('strong','project-row-state'),el('p','project-row-detail'),el('p','task-count'),el('progress'));row.querySelector('progress').max=100;row.querySelector('progress').setAttribute('aria-label',title(p)+'施工任务进度');const cancel=el('button','text-button','取消尚未动工的工程');cancel.hidden=s.project.locked;cancel.disabled=blocked();cancel.onclick=()=>act(()=>toast(E.cancelProject(s,C)?'已取消尚未动工的工程':s.message));row.append(cancel);}
    else{const previous=p.requires.map(id=>title(C.plans.find(p=>p.id===id))).join('、');if(p.base)row.append(el('p','',previous?'接续「'+previous+'」的下一步':'先让居民安家，之后增加独立住宅。'));row.append(el('p','',benefits(p)));
     if(p.slot){const slot=B.slots.find(b=>b.id===p.slot),template=B.templates.find(t=>t.id===slot.template),count=s.buildings.filter(b=>b.template===template.id&&done.some(p=>p.mode==='build'&&p.slot===b.id)).length;row.append(el('p','','该类建筑 '+count+' / '+template.limit+' 栋；受合法位置与连接空间限制。'));}
     const reason=planReason(p);row.append(el('p','project-row-detail',reason||'当前可选；无需备齐全部材料，确认图纸后才开工。'));const button=el('button','primary',p.mode==='build'&&p.slot!==B.root.slot?'选择项目与位置':'查看图纸');button.disabled=!!reason||blocked();button.onclick=()=>chooseProject(p);row.append(button);
    }$('project-list').append(row);
   }
   for(const p of done){const row=el('article','project-row complete');row.dataset.plan=p.id;row.append(el('h3','',title(p)+' · 已完成'),el('p','',benefits(p)));if(p.effect?.decorations?.length){const b=el('button','','切换花园摆设');b.disabled=blocked()||s.paused;b.onclick=()=>act(()=>E.cycleGarden(s,C));row.append(b);}$('completed-projects').append(row);}
  }
  const row=document.querySelector('#project-list .current');if(s.project&&row){row.querySelector('.project-row-state').textContent=info.label;row.querySelector('.project-row-detail').textContent=info.detail;row.querySelector('.task-count').textContent=info.percent===null?'已结束施工任务 '+s.project.at+' / '+E.currentPlan(s,C).tasks.length+' 项；'+(s.project.at===E.currentPlan(s,C).tasks.length?'等待当前阶段完成':'准备完成后自动施工'):'施工任务进度 '+info.percent+'% · '+s.project.at+' / '+E.currentPlan(s,C).tasks.length+' 项已结束；剩余用料：'+formatCost(remainingCost());const progress=row.querySelector('progress');progress.hidden=info.percent===null;progress.value=info.percent||0;}
  $('build-empty').hidden=!!s.project||!!resultIds.length||available.some(p=>!planReason(p));text('build-empty',info.detail);text('saved-queue','同时只建造一项；开窗不暂停小镇，完工后由你选择下一项。');
 }
 function setView(id){level=id;Object.assign(camera,{x:0,y:0,zoom:1});for(const b of $('views').children)b.setAttribute('aria-pressed',String(b.dataset.level===level));if(s){R.draw(canvas,s,C,level,camera);updateVisitors();}}
 function activity(pet){
  const a=pet.action;if(!a)return E.workStatus(s,pet,C);
  if(a.type==='production'){const r=C.recipes.find(r=>r.id===a.recipe);return r.name+(a.elapsed>=a.workEnd?' · 搬运交付':a.elapsed<2?' · 前往作业点':' · 作业中');}
  return names[a.type]||'工作中';
 }
 function remainingCost(){
  const cost=zero(),plan=E.currentPlan(s,C);if(!s.project||!plan)return cost;
  for(const t of plan.tasks.slice(s.project?.at||0))if(t.type==='install'&&!s.pets.some(p=>p.action?.type==='install'&&p.action.part===t.target))for(const [k,n]of Object.entries(parts.get(t.target).cost))cost[k]+=n;
  return cost;
 }
 function listParts(ids,cfg=C){const parts=new Map(cfg.parts.map(p=>[p.id,p])),groups=new Map(cfg.groups.map(g=>[g.id,g]));const counts={};for(const id of ids){const p=parts.get(id),name=p.group?groups.get(p.group).label:R.names[p.kind]||p.kind;counts[name]=(counts[name]||0)+1;}return Object.entries(counts).map(([n,count])=>n+' × '+count+' 格').join('，')||'无';}
 function updatePreviewStock(){
  const p=E.preview(s,B,previewId,previewChoice);if(!p)return;const stock=E.inventory(s,C);
  text('preview-cost','建筑：'+formatCost(p.buildingCost)+'；连接与承托：'+formatCost(p.connectionCost)+'。当前可用：'+formatCost(stock));
  for(const item of $('preview-materials').children){const k=item.dataset.kind,missing=Math.max(0,p.cost[k]-stock[k]);item.querySelector('p').textContent=`可用 ${stock[k]} / 需要 ${p.cost[k]}`;item.querySelector('small').textContent=missing?`尚差 ${missing} · 可边建边补`:'材料已够';item.querySelector('small').className=missing?'short':'';}
  $('start-project').disabled=!!p.error||!!s.project||blocked()||!!planReason(p.plan);text('start-project',s.paused?'继续小镇并开工':'确认开工');
  // Do not erase a selection error while the player is correcting their arrangement.
  if(p.error)text('preview-error',p.error);
 }
 function showPreview(id,keepReturn=false){
  capture();if(blocked()||s.project)return;const def=B.plans.find(p=>p.id===id);if(previewId!==id&&def.mode!=='build')previewChoice=null;if(def.mode==='build'&&previewChoice?.id!==def.slot)previewChoice=null;if(def.mode==='comfort'){const targets=s.buildings.filter(b=>b.template===def.targetTemplate);if(!targets.some(b=>b.id===previewChoice?.room))previewChoice={room:targets[0].id};}if(def.mode==='build'&&def.slot!==B.root.slot&&!previewChoice){selectionPlan=id;setTab('extensions');return;}previewId=id;const p=E.preview(s,B,id,previewChoice);if(!p)return;if(!keepReturn)previewReturn={tab:activeTab,scroll:$('management-dialog').scrollTop,focus:document.activeElement};
  R.blueprint($('blueprint-scene'),s,p);text('preview-title',title(p.plan));text('preview-description',p.plan.description.replace('连接验收后','入口接通后')+' '+benefits(p.plan,p.config)+(p.building?'。选址：'+placementName(p.building):''));text('diff-retained',listParts(p.retained,p.config));
  text('diff-moved',[...p.moved.map(id=>'搬出'+groups.get(id).label),...p.reused.map(id=>'复用'+groups.get(id).label)].join('；')||'无');
  text('diff-removed',listParts(p.removed,p.config));text('diff-added',listParts(p.added,p.config));
  text('preview-recovery','任务完成后预计回收：'+formatCost(p.recovery)+'；完整搬移家具不同时回收材料。');
  text('impact',p.plan.disable.length?'临时停用：'+p.plan.disable.map(id=>rooms.get(id).name).join('、')+'。当前批次先交付，其余空间继续工作。':'本工程不需要停用已有建筑，小伙伴可以继续生产。');
  $('preview-materials').replaceChildren();for(const k of kinds)if(p.cost[k]){const item=el('div','preview-material');item.dataset.kind=k;item.append(el('strong','',C.materials[k]),el('p'),el('small'));$('preview-materials').append(item);}
  $('target-building').replaceChildren();if(def.mode==='comfort'){const label=el('label','field-row','改善哪栋建筑'),select=el('select');select.id='improvement-target';select.setAttribute('aria-label','选择改善的住宅');for(const b of s.buildings.filter(b=>b.template===def.targetTemplate)){const option=el('option','',rooms.get(b.id).name);option.value=b.id;select.append(option);}select.value=previewChoice.room;select.onchange=()=>{previewChoice={room:select.value};showPreview(id,true);};label.append(select);$('target-building').append(label);}
  $('moving-choices').replaceChildren();for(const move of p.moves||[]){const row=el('label','moving-row',C.pets.find(p=>p.id===move.pet).name+'临时搬至');const sel=el('select');sel.dataset.pet=move.pet;
   for(const b of C.beds.filter(b=>!b.permanent&&!p.plan.disable.includes(b.room)&&E.bedAvailable(s,b,C)&&!s.pets.some(p=>p.home===b.id))){const option=el('option','',roomName(b.id)+' · 床位 '+(C.beds.indexOf(b)+1));option.value=b.id;sel.append(option);}sel.value=move.bed;row.append(sel);$('moving-choices').append(row);}
  text('preview-error',p.error||'');$('project-dialog').querySelector('details').open=false;updatePreviewStock();openDialog('project-dialog',$('project-badge'));
 }
 function updateResidents(){
  for(const row of $('residents').children){const pet=s.pets.find(p=>p.id===row.dataset.pet),def=C.pets.find(p=>p.id===pet.id),a=pet.action;
   row.setAttribute('aria-disabled',String(!pet.arrived));row.querySelector('.home').textContent=pet.arrived?'住处：'+roomName(pet.home):'尚未到访 · 完成前置工程后加入';
   const recipe=a?.recipe?C.recipes.find(r=>r.id===a.recipe):E.stableRecipes(s,C).filter(r=>r.facility&&def.capabilities.includes(r.capability)).sort((a,b)=>(b.priority||0)-(a.priority||0))[0],bonus=recipe?(a?.efficiency||E.efficiency(s,pet,recipe,C)):1;row.querySelector('.activity').textContent=(s.paused?'已暂停 · ':'')+activity(pet)+(bonus>1?' · 岗位作业效率 +'+Math.round((bonus-1)*100)+'%（运输不变）':'');
   const select=row.querySelector('select');
   if(document.activeElement!==select){const opts=C.beds.filter(b=>!b.permanent&&E.bedAvailable(s,b,C)&&!s.pets.some(p=>p!==pet&&(p.home===b.id||p.action?.bed===b.id))),sig=opts.map(b=>b.id).join('|')+'|'+pet.home;
    if(select.dataset.signature!==sig){select.replaceChildren();const option=el('option','','选择一个可用床位');option.value='';select.append(option);for(const b of opts){const o=el('option','',roomName(b.id)+' · 床位 '+(C.beds.indexOf(b)+1));o.value=b.id;select.append(o);}select.value=pet.home||'';select.dataset.signature=sig;}}
   let reason=def.capabilities.includes('build')?'建造员常住营地，始终保留基础取材能力。':!pet.arrived?'到访后才能安排住处。':s.project?'工程期间由搬迁安排统一管理，完工后可调整。':s.paused?'继续小镇后可安排住处。':a?'当前工作完成后可调整床位。':'选择床位后，小伙伴会自动搬过去。';
   row.querySelector('.home-hint').textContent=reason;select.disabled=blocked()||!!s.project||!!a||!pet.arrived||s.paused||def.capabilities.includes('build');
  }
 }
 function updateStorage(){
  const stock=E.inventory(s,C,false),available=E.inventory(s,C),need=remainingCost(),yardUsed=s.materials.filter(m=>m.state==='yard').length;
  const cap=E.capacity(s,C);for(const row of $('warehouse').children){const k=row.dataset.kind,extra=available[k]-stock[k],incoming=s.materials.filter(m=>m.kind===k&&['transit','transport'].includes(m.state)).length;
   row.querySelector('b').textContent=`${stock[k]} / ${cap[k]}`;row.querySelector('.stock-meter span').style.width=(stock[k]/cap[k]*100)+'%';
   row.querySelector('.stock-detail').textContent=`可用 ${available[k]} · 在途 ${incoming} · 批次预留 ${E.reserved(s,k)} · 仓外 ${extra}。${storageEstimate(k)}`;
   row.querySelector('.availability').textContent=need[k]?`本工程还有 ${need[k]} 份待领取${need[k]>available[k]?'，小伙伴会继续供料。':'，当前可用材料已够。'}`:'当前工程不缺这类材料，可留给后续建设。';
   const button=row.querySelector('button');button.disabled=blocked()||s.paused||!stock[k]||yardUsed>=C.yardCapacity;button.title=s.paused?'请先继续小镇':!stock[k]?'仓内暂无这类材料':yardUsed>=C.yardCapacity?'营地料垛已满':'最多转存 4 份，仍可用于施工和加工';
  }
  text('yard-status',`营地料垛 ${yardUsed} / ${C.yardCapacity} 份；拆解回收箱 ${s.materials.filter(m=>m.state==='salvage').length} / ${C.salvageCapacity} 份。`);
  const stored=C.groups.filter(g=>['stored','parked'].includes(s.furniture[g.id].status));text('furniture-status','完整家具：'+(stored.map(g=>g.label+(s.furniture[g.id].status==='parked'?'（营地）':'（库内）')).join('、')||'暂无')+`。家具库 ${stored.filter(g=>s.furniture[g.id].status==='stored').length} / ${C.furnitureCapacity} 件。`);
  const sig=stored.map(g=>g.id+s.furniture[g.id].status).join('|');if($('furniture-buttons').dataset.signature!==sig){$('furniture-buttons').replaceChildren();for(const g of stored.filter(g=>s.furniture[g.id].status==='stored')){const b=el('button','','将'+g.label+'安置到营地');b.onclick=()=>act(()=>{toast(E.parkFurniture(s,g.id,C)?'家具已安置到营地，之后仍可复用。':'暂时无法安置，请等待工程结束。');});$('furniture-buttons').append(b);}$('furniture-buttons').dataset.signature=sig;}
  for(const b of $('furniture-buttons').children){b.disabled=blocked()||s.paused||!!s.project;b.title=s.project?'工程结束后可安置家具':s.paused?'请先继续小镇':'';}
 }
 function updateRooms(){
  for(const row of $('rooms').children){const r=rooms.get(row.dataset.room),ready=E.roomReady(s,r.id,C),available=E.roomAvailable(s,r.id,C),needed=[...new Set([...r.requirements,...r.access])],built=needed.filter(id=>s.objects[id].status==='installed').length;
   row.querySelector('.state-pill').textContent=available?'可用':ready?'改建中 · 停用':r.requirements.length&&r.requirements.every(id=>s.objects[id].status==='installed')?'等待接通':built?'建造中':'尚未建成';
   const residents=s.pets.filter(p=>C.beds.find(b=>b.id===p.home)?.room===r.id),beds=C.beds.filter(b=>b.room===r.id&&E.bedAvailable(s,b,C));
   row.querySelector('.room-beds').textContent='住在这里：'+(residents.map(p=>C.pets.find(d=>d.id===p.id).name).join('、')||'暂无居民')+(beds.length?` · 可用床位 ${beds.length} · 空置 ${beds.filter(b=>!s.pets.some(p=>p.home===b.id)).length}`:'');
   const facilities=C.groups.filter(g=>g.capability&&s.furniture[g.id].status==='installed'&&s.objects[g.parts[0]].room===r.id);
   row.querySelector('.room-detail').textContent=(r.initial?'基础营地始终保留。':`结构与通道 ${built} / ${needed.length} 格就绪。`)+(facilities.length?' 已安装：'+facilities.map(g=>g.label).join('、')+'。':'');
  }
 }
 function updateJournal(){const sig=JSON.stringify(s.events);if($('event-log').dataset.signature!==sig){$('event-log').replaceChildren();for(const event of s.events)$('event-log').append(el('li','',timeLabel(event.time)+' · '+event.text));$('event-log').dataset.signature=sig;}}
 function storageEstimate(k){
  const remaining=E.capacity(s,C)[k]-E.inventory(s,C,false)[k]-E.reserved(s,k);if(remaining<1)return '本批次仓位已满。';
  if(s.project||s.paused||Object.values(s.assists).some(n=>n>0))return '产速随施工、暂停或协助变化，暂不估计满仓时间。';
  const recipes=E.stableRecipes(s,C).filter(r=>r.output[k]&&!Object.keys(r.input).length&&!r.regrow&&!r.buffer&&r.facility).sort((a,b)=>(b.priority||0)-(a.priority||0));
  const r=recipes[0],worker=r&&s.pets.find(p=>p.home&&C.pets.find(d=>d.id===p.id).capabilities.includes(r.capability));
  if(!r||!worker)return '产速或中间原料不稳定，暂不估计满仓时间。';
  const rate=r.output[k]/(r.seconds/E.efficiency(s,worker,r,C)+4);return `约 ${Math.ceil(remaining/rate/60)} 分钟达到仓位门槛（岗位和住处持续可用、不施工或取用时）。`;
 }
 function showOffline(){const info=s.lastOffline;if(!info)return;const list=$('offline-summary');list.replaceChildren(el('p','',`实际补算 ${timeLabel(info.seconds)}${info.capped?' · 已达 8 小时上限，超出时间已舍弃':''}`));
  for(const k of kinds)list.append(el('p','',`${C.materials[k]}：获得 ${info.gained[k]}，消耗 ${info.consumed[k]}，当前可用 ${info.inventory[k]}`));
  list.append(el('p','','完成工程：'+(info.completed.join('、')||'无')),el('p','','当前状态：'+info.waiting));openDialog('offline-dialog');
 }
 function extensionPlans(){return C.plans.filter(p=>p.mode==='build'&&p.slot!==B.root.slot&&!s.completed.some(q=>q.id===p.id)&&p.requires.every(id=>s.completed.some(q=>q.id===id)));}
 function selectedOptions(){return selectionPlan?E.candidates(s,B,selectionPlan):[];}
 function updateExtensions(){
  const node=$('extensions'),available=extensionPlans();if(!available.some(p=>p.id===selectionPlan)){selectionPlan=available[0]?.id||null;locationId=null;variantId=null;}
  const options=selectedOptions();if(!options.some(o=>o.id===locationId)){locationId=options[0]?.id||null;variantId=null;}const selected=options.find(o=>o.id===locationId);
  if(!selected?.versions.some(b=>b.variant===variantId))variantId=selected?.versions[0]?.variant||null;
  const signature=JSON.stringify([selectionPlan,locationId,variantId,s.completed,s.project?.plan,s.gardenStyle,s.paused,blocked()]);if(node.dataset.signature===signature)return;node.dataset.signature=signature;node.replaceChildren();
  if(!available.length){node.append(el('p','',projectInfo().detail));const back=el('button','','返回建造');back.onclick=()=>setTab('projects');node.append(back);}
  else{
   const back=el('button','','返回项目选择');back.id='placement-back';back.onclick=()=>setTab('projects');node.append(back,el('h3','',title(C.plans.find(p=>p.id===selectionPlan))));
   const pick=el('button','','在场景中选择位置');pick.id='pick-on-scene';pick.disabled=!options.length||!!s.project;pick.onclick=()=>{picking=true;camera.candidates=options;$('management-dialog').close();$('placement-hint').hidden=false;focusPlacement(selected?.versions[0]);refresh();};node.append(pick);
   const list=el('div','placement-options');list.id='placement-options';for(const [i,o]of options.entries()){const b=o.versions[0],button=el('button','',placementName(b));button.setAttribute('aria-pressed',String(o.id===locationId));button.onclick=()=>{locationId=o.id;variantId=null;node.dataset.signature='';updateExtensions();};list.append(button);}node.append(list);
   if(selected){const size=el('select');size.id='building-size';size.setAttribute('aria-label','建筑实际尺寸版本');for(const b of selected.versions){const o=el('option','',root.TownLayout.variant(B,b).name);o.value=b.variant;size.append(o);}size.value=variantId;size.onchange=()=>{variantId=size.value;node.dataset.signature='';updateExtensions();};node.append(size);
    const choice=selected.versions.find(b=>b.variant===variantId),diff=E.preview(s,B,selectionPlan,choice),canvas=el('canvas');canvas.width=720;canvas.height=260;R.blueprint(canvas,s,diff);node.append(canvas,el('p','',C.plans.find(p=>p.id===selectionPlan).description),el('p','','建筑 '+formatCost(diff.buildingCost)+'；连接及承托 '+formatCost(diff.connectionCost)+'；预计回收 '+formatCost(diff.recovery)),el('p','',diff.error||'位置与施工通路已检查；可以边建边备料。'));
    const b=el('button','primary','查看完整图纸');b.id='preview-placement';b.disabled=!!diff.error||!!s.project||blocked();b.onclick=()=>{previewChoice=choice;showPreview(selectionPlan);};node.append(b);
   }else node.append(el('p','save-warning',planReason(C.plans.find(p=>p.id===selectionPlan))));
  }
  for(const p of C.plans.filter(p=>p.effect?.residents&&s.completed.some(q=>q.id===p.id))){const b=el('button','','切换花园摆设');b.disabled=s.paused||blocked();b.onclick=()=>act(()=>E.cycleGarden(s,C));node.append(b);}
 }
 function placementName(b){
  const co=b.connection,parent=s.buildings.find(p=>p.id===co.parent),v=root.TownLayout.variant(B,parent),port=v.ports.find(p=>p.id===co.port),name=rooms.get(parent.id).name;
  const position=co.type==='upper'?'上方':port.side==='right'?'右侧':'左侧',height=b.y===256?'地面通路':co.type==='upper'?'楼梯连接':'略高于地面 · 台阶连接';
  return name+' '+position+' · '+height;
 }
 function focusPlacement(b){if(!b)return;setView(overview.id);const rect=R.viewRect(s,C,level,camera);camera.x+=b.x+root.TownLayout.variant(B,b).width/2-(rect[0]+rect[2]/2);camera.y+=b.y-32-(rect[1]+rect[3]/2);}
 const interactionName=e=>({pickup:'拾取散落材料',commission:'来访委托',assist:'协助整理工具'})[e.type];
 function openInteraction(id,trigger=canvas){interactionId=id;updateInteraction();openDialog('interaction-dialog',trigger);}
 function updateInteraction(){
  const e=s.interactions.find(e=>e.id===interactionId);if(!e){if($('interaction-dialog').open)$('interaction-dialog').close();return;}text('interaction-title',interactionName(e));const node=$('interaction-detail');
  if(node.dataset.event!==e.id){node.dataset.event=e.id;node.replaceChildren(el('p','interaction-cost'),el('p','interaction-effect'),el('p','interaction-reason'),el('button','primary'),el('button','text-button','放弃并送别'));
   node.querySelector('.primary').onclick=()=>act(()=>{const event=s.interactions.find(q=>q.id===interactionId);if(!event)return;if(event.status==='active')E.progressInteraction(s,event.id,C);else if(E.claimInteraction(s,event.id,C))toast('互动已结算，来访伙伴正在离开。');});node.querySelector('.text-button').onclick=()=>act(()=>{if(E.abandonInteraction(s,interactionId,C))toast('已送别来访伙伴。');});
  }
  node.querySelector('.interaction-cost').textContent='投入：'+formatCost(e.input)+'；所得：'+formatCost(e.reward);node.querySelector('.interaction-effect').textContent=e.type==='assist'?'整理 '+e.progress+' / '+e.clicks+' 次；'+C.recipes.filter(r=>r.capability===e.assistKey).map(r=>r.name).join(' / ')+'接下来三个批次作业效率 +10%，不缩短运输。':'确认后整笔结算；保护当前工程下一项施工用料。';
  const check=E.interactionCheck(s,e.id,C),arrived=E.visitorPose(s,e).arrived;node.querySelector('.interaction-reason').textContent=s.paused?'小镇已暂停，继续后可操作。':!arrived?'正在路上，到达后显示点击互动气泡。':check.error||'可以确认结算；不会重复发放。';
  const b=node.querySelector('.primary');b.textContent=e.status==='active'?'整理一次':'确认领取 / 提交';b.disabled=blocked()||s.paused||!arrived||(e.status==='ready'&&!!check.error);node.querySelector('.text-button').disabled=blocked()||s.paused;
 }
 function visitorTargets(){
  const rect=R.viewRect(s,C,level,camera),selected=C.view.levels.find(v=>v.id===level),b=canvas.getBoundingClientRect(),scene=document.querySelector('.landscape').getBoundingClientRect(),scale=scene.width/document.querySelector('.landscape').offsetWidth;
  return s.interactions.map(e=>{const pose=E.visitorPose(s,e),x=(b.left-scene.left+(pose.x-rect[0])/rect[2]*b.width)/scale,y=(b.top-scene.top+(pose.y-rect[1])/rect[3]*b.height)/scale;return {e,pose,x,y,visible:R.visitorVisible(pose,selected,rect,camera.overlays)};});
 }
 function focusVisitor(id){const e=s.interactions.find(e=>e.id===id);if(!e)return;setView(overview.id);const pose=E.visitorPose(s,e),rect=R.viewRect(s,C,level,camera);camera.x+=pose.x-(rect[0]+rect[2]/2);camera.y+=pose.y-(rect[1]+rect[3]*.65);refresh();canvas.focus();}
 function updateVisitors(){
  const bubbles=$('visitor-bubbles'),hints=$('visitor-hints'),shown=new Set();for(const [index,{e,pose,x,y,visible}]of visitorTargets().entries()){shown.add(e.id);let b=[...bubbles.children].find(n=>n.dataset.event===e.id);if(!b){b=el('button','visitor-bubble','点击互动');b.dataset.event=e.id;b.onpointerdown=event=>canvas.onpointerdown(event);b.onclick=event=>{if(event.detail===0)openInteraction(e.id,b);};bubbles.append(b);}b.hidden=!visible||!pose.arrived;b.style.left=x+'px';b.style.top=(y-38-index%2*34)+'px';b.setAttribute('aria-label',interactionName(e)+'，点击查看详情');
   let hint=[...hints.children].find(n=>n.dataset.event===e.id);if(!hint){hint=el('button');hint.dataset.event=e.id;hint.onclick=()=>focusVisitor(e.id);hints.append(hint);}hint.hidden=visible;hint.textContent='来访 · '+(pose.arrived?'点击定位':'正在路上');hint.setAttribute('aria-label',interactionName(e)+'，切换视图并定位角色');
  }for(const node of [...bubbles.children,...hints.children])if(!shown.has(node.dataset.event))node.remove();
 }
 function debugLimit(state,k){return Math.max(0,E.capacity(state,C)[k]-state.pets.reduce((n,p)=>n+(p.action?.output?.[k]||0),0));}
 function updateDebug(){
  const disabled=blocked();for(const id of ['debug-speed','debug-set','debug-add','debug-fill','debug-validate','debug-material','debug-amount'])$(id).disabled=disabled;
  $('debug-minute').disabled=disabled||s?.paused;$('debug-finish').disabled=disabled||s?.paused||!s?.project;
  let hasBackup=false;try{hasBackup=!!localStorage.getItem(backupKey);}catch{}$('debug-undo').disabled=blocked()||!hasBackup||clock.debt>=T.STEP;
  $('debug-speed').value=debugSpeed;if(!s){text('debug-state','没有可读取的小镇记录。请使用设置或错误提示恢复进度。');return;}
  const k=$('debug-material').value,stock=E.inventory(s,C,false),max=debugLimit(s,k);$('debug-amount').max=max;
  text('debug-material-hint',`仓内 ${stock[k]} / ${E.capacity(s,C)[k]}；在途批次预留 ${E.capacity(s,C)[k]-max}。可设置范围 0～${max}，不会改变仓外材料。`);
  text('debug-time-hint',s.paused?'小镇已暂停。先关闭面板并继续小镇，再推进时间或工程。':!s.project?'当前没有施工工程。可以推进生产时间，或关闭面板后选择图纸。':'快速完成会补充材料并推进真实施工，只完成当前工程，不自动开启下一项。');
  text('debug-state',`模拟时间  ${timeLabel(s.time)}\n工程完成  ${s.completed.length} / ${C.plans.length}\n当前阶段  ${s.project?names[s.project.phase]+' · '+s.project.at:'无工程'}\n材料身份  ${s.materials.length} 个\n正在工作  ${s.pets.filter(p=>p.action).length} 位\n调试增加  ${formatCost(s.ledger.debug?.added||{})}\n调试移除  ${formatCost(s.ledger.debug?.removed||{})}`);
 }
 function refresh(){
  if(s){C=E.scene(s,B);parts=new Map(C.parts.map(p=>[p.id,p]));groups=new Map(C.groups.map(g=>[g.id,g]));rooms=new Map(C.rooms.map(r=>[r.id,r]));}
  for(const id of ['pause','resume-town','speed','priority','export-save','new-game'])$(id).disabled=blocked();
  for(const b of document.querySelectorAll('#project-badge,[data-tab],#open-journal,.resource-card'))b.disabled=!s;
  if(!s){$('pause-banner').hidden=true;updateDebug();return;}
  const stock=E.inventory(s,C,false),available=E.inventory(s,C);
  const cap=E.capacity(s,C);for(const k of kinds){text('stock-'+k,available[k]);text('stock-detail-'+k,`仓内 ${stock[k]}/${cap[k]} · 预留 ${E.reserved(s,k)}`);}
  text('town-time','小镇时间 '+timeLabel(s.time));text('pause',s.paused?'继续小镇':'暂停小镇');$('pause').setAttribute('aria-pressed',String(s.paused));$('pause-banner').hidden=!s.paused;
  $('speed').value=s.multiplier;$('priority').value=s.gatherPriority;const changed=!!s.ledger.debug;
  $('debug-badge').hidden=debugSpeed===1&&!changed;text('debug-badge',[debugSpeed!==1?'调试 ×'+debugSpeed:'',changed?'已修改材料':''].filter(Boolean).join(' · '));
  text('save-status',saveError||'本地自动保存');$('save-status').className=saveError?'save-warning':'';text('message',s.message);
  text('resident-count',s.pets.filter(p=>p.home).length+'/'+C.pets.length);
  checkNotices();updateProjects();if(activeTab==='extensions')updateExtensions();if(activeTab==='journal')updateJournal();if($('interaction-dialog').open)updateInteraction();if(activeTab==='residents')updateResidents();if(activeTab==='storage')updateStorage();if(activeTab==='rooms')updateRooms();
  if($('project-dialog').open)updatePreviewStock();if($('debug-dialog').open)updateDebug();
  for(const b of $('views').children)b.setAttribute('aria-pressed',String(b.dataset.level===level));R.draw(canvas,s,C,level,camera);updateVisitors();
 }
 async function debugMutation(label,mutate){
  capture();if(blocked())return;const before=E.save(s,C),candidate=E.restore(before,C);busy=true;text('debug-result',label+'中…');refresh();
  try{await mutate(candidate);E.validate(candidate,C);replaceState(candidate,backupKey);text('debug-result',label+'完成。已保存修改，可恢复操作前的备份。');}
  catch(e){text('debug-result','未应用修改：'+e.message);}
  finally{busy=false;resetClock();refresh();}
 }
 function fill(state){return E.debugSetInventory(state,Object.fromEntries(kinds.map(k=>[k,debugLimit(state,k)])),C);}
 function setup(){
  text('town-name',C.name);text('scene-name',C.name+' · 建筑群');
  for(const [i,k]of kinds.entries()){
   const button=el('button','resource-card');button.setAttribute('aria-label',C.materials[k]+'可用库存，查看仓库');button.append(el('span','resource-symbol',['▰','◆','✿','▧'][i%4]),el('span','resource-name',C.materials[k]));
   const count=el('b','','0');count.id='stock-'+k;const detail=el('small');detail.id='stock-detail-'+k;button.append(count,detail);button.onclick=()=>{setTab('storage',button);const row=[...$('warehouse').children].find(r=>r.dataset.kind===k);row.scrollIntoView({block:'center'});row.querySelector('button').focus({preventScroll:true});};$('resource-cards').append(button);
   const row=el('div','warehouse-row');row.dataset.kind=k;const head=el('div','warehouse-heading');head.append(el('strong','',C.materials[k]+' · 仓内'),el('b'));const meter=el('div','stock-meter');meter.append(el('span'));
   const source=C.recipes.filter(r=>r.output[k]).map(r=>r.name).join(' / ');row.append(head,meter,el('p','stock-detail'),el('p','','来源：'+source),el('p','availability'));
   const stow=el('button','','转存最多 4 份到营地');stow.onclick=()=>act(()=>toast(E.stow(s,k,C)?'已转存，材料仍可用于施工和加工。':'暂无材料或营地料垛已满。'));row.append(stow);$('warehouse').append(row);
   const option=el('option','',C.materials[k]);option.value=k;$('debug-material').append(option);
  }
  for(const def of C.pets){const row=el('div','resident');row.dataset.pet=def.id;const mark=el('span','pet-mark');mark.style.setProperty('--pet',def.color);mark.setAttribute('aria-hidden','true');const info=el('div'),name=el('div');name.append(el('strong','',def.name),el('span','pet-role',def.capabilities.includes('build')?'建造伙伴':C.recipes.filter(r=>def.capabilities.includes(r.capability)).map(r=>r.name).join(' / ')));
   const details=el('details'),select=el('select');select.setAttribute('aria-label','为'+def.name+'分配床位');select.onchange=()=>act(()=>toast(E.assignHome(s,def.id,select.value,C)?'已安排搬迁，小伙伴会自己过去。':'暂时无法搬迁，请检查床位与工作状态。'));details.append(el('summary','','安排住处'),select,el('p','home-hint'));info.append(name,el('p','home'),el('p','activity'),details);row.append(mark,info);$('residents').append(row);}
  for(const r of C.rooms){const row=el('article','room-card');row.dataset.room=r.id;const head=el('div','room-heading');head.append(el('strong','',r.name),el('span','state-pill'));const b=el('button','','查看所在区域');b.onclick=()=>{$('management-dialog').close();setView(overview.id);const at=rooms.get(r.id).point,rect=R.viewRect(s,C,level,camera);camera.x+=at.x-(rect[0]+rect[2]/2);camera.y+=at.y-32-(rect[1]+rect[3]/2);refresh();canvas.focus();};row.append(head,el('p','room-beds'),el('p','room-detail'),b);$('rooms').append(row);}
  for(const l of C.view.levels){const b=el('button','',l.name);b.dataset.level=l.id;b.setAttribute('aria-pressed',String(l.id===level));b.onclick=()=>setView(l.id);$('views').append(b);}
  const redraw=()=>{if(s){R.draw(canvas,s,C,level,camera);updateVisitors();}};
  const pan=delta=>{camera.x+=delta;redraw();};
  $('pan-left').onclick=()=>pan(-96);$('pan-right').onclick=()=>pan(96);$('camera-reset').onclick=()=>setView(level);
  const zoom=delta=>{camera.zoom=Math.max(.75,Math.min(3,camera.zoom+delta));redraw();};$('zoom-in').onclick=()=>zoom(.25);$('zoom-out').onclick=()=>zoom(-.25);
  canvas.tabIndex=0;canvas.style.touchAction='none';let pointer=null;
  canvas.onpointerdown=e=>{if(pointer){pointer.drag=true;return;}const bubble=e.target.closest('.visitor-bubble');pointer={id:e.pointerId,x:e.clientX,y:e.clientY,pan:camera.x,py:camera.y,drag:false,eventId:bubble?.dataset.event,trigger:bubble||canvas};canvas.setPointerCapture(e.pointerId);};
  const hit=e=>{if(!s)return null;const scene=document.querySelector('.landscape').getBoundingClientRect(),scale=scene.width/document.querySelector('.landscape').offsetWidth,x=(e.clientX-scene.left)/scale,y=(e.clientY-scene.top)/scale;return visitorTargets().find(t=>t.visible&&t.pose.arrived&&Math.abs(t.x-x)<18&&y>t.y-30&&y<t.y+8);};
  canvas.onpointermove=e=>{canvas.style.cursor=hit(e)?'pointer':'grab';if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.hypot(dx,dy)>5)pointer.drag=true;if(pointer.drag&&s){const rect=R.viewRect(s,C,level,camera),bounds=canvas.getBoundingClientRect();camera.x=pointer.pan-dx/bounds.width*rect[2];camera.y=pointer.py-dy/bounds.height*rect[3];redraw();}};
  canvas.onpointerup=e=>{if(!pointer||pointer.id!==e.pointerId)return;const previous=pointer;pointer=null;if(previous.drag)return;if(picking){const bounds=canvas.getBoundingClientRect(),rect=R.viewRect(s,C,level,camera),x=rect[0]+(e.clientX-bounds.left)/bounds.width*rect[2],y=rect[1]+(e.clientY-bounds.top)/bounds.height*rect[3],options=selectedOptions(),option=options.find((o,i)=>{const b=o.versions[0],v=root.TownLayout.variant(B,b);return Math.abs(x-b.x-v.width/2)<=22&&Math.abs(y-(b.y-80-i*22))<=10;})||options.find(o=>{const b=o.versions[0],v=root.TownLayout.variant(B,b);return x>=b.x&&x<=b.x+v.width&&y>=b.y-64&&y<=b.y;});if(option){locationId=option.id;variantId=null;picking=false;camera.candidates=[];$('placement-hint').hidden=true;setTab('extensions',canvas);}return;}if(previous.eventId){const event=s.interactions.find(q=>q.id===previous.eventId);if(event&&E.visitorPose(s,event).arrived)openInteraction(event.id,previous.trigger);}else{const target=hit(e);if(target)openInteraction(target.e.id);}};
  canvas.onpointercancel=()=>{pointer=null;};canvas.onwheel=e=>{e.preventDefault();if(pointer)pointer.drag=true;zoom(e.deltaY<0?.25:-.25);};canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','+','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')pan(-32);if(e.key==='ArrowRight')pan(32);if(e.key==='+')zoom(.25);if(e.key==='-')zoom(-.25);if(e.key==='Home')setView(level);}};
  $('placement-return').onclick=()=>{picking=false;camera.candidates=[];$('placement-hint').hidden=true;setTab('extensions',canvas);};
  for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>setTab(b.dataset.tab,b);
  $('project-badge').onclick=()=>setTab('projects',$('project-badge'));$('open-journal').onclick=()=>setTab('journal',$('open-journal'));
  for(const d of document.querySelectorAll('dialog'))d.addEventListener('close',()=>{if(suppressedCloses.delete(d))return;if(d.id==='project-dialog'&&previewReturn){const back=previewReturn;previewReturn=null;setTab(back.tab);$('management-dialog').scrollTop=back.scroll;queueMicrotask(()=>back.focus?.focus({preventScroll:true}));return;}const trigger=dialogTriggers.get(d.id);queueMicrotask(()=>{if(trigger?.isConnected&&!trigger.closest('dialog:not([open])'))trigger.focus({preventScroll:true});else if(d.id==='interaction-dialog')canvas.focus({preventScroll:true});});});
  for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
  for(const [id,dialog]of [['open-help','help-dialog'],['open-settings','settings-dialog'],['open-debug','debug-dialog']])$(id).onclick=()=>{if(dialog==='debug-dialog'){if(s)$('debug-amount').value=E.inventory(s,C,false)[$('debug-material').value];updateDebug();}openDialog(dialog);};
  $('pause').onclick=()=>act(()=>{s.paused=!s.paused;});$('resume-town').onclick=()=>act(()=>{s.paused=false;});
  $('speed').onchange=()=>act(()=>{s.multiplier=Number($('speed').value);});$('priority').onchange=()=>act(()=>{s.gatherPriority=$('priority').value;});
  $('close-preview').onclick=()=>$('project-dialog').close();
  $('start-project').onclick=()=>act(()=>{const choices=Object.fromEntries([...$('moving-choices').querySelectorAll('select')].map(sel=>[sel.dataset.pet,sel.value]));const paused=s.paused;s.paused=false;if(E.startProject(s,B,choices,previewId,previewChoice)){previewReturn=null;previewChoice=null;picking=false;camera.candidates=[];$('placement-hint').hidden=true;$('project-dialog').close();toast('已开工，小伙伴会自动准备材料和施工。');}else{s.paused=paused;text('preview-error',s.message);}});
  $('export-save').onclick=()=>act(()=>{download(E.save(s,C),'little-town.json');text('settings-status','已导出当前进度。');});$('export-original').onclick=()=>download(raw||'','little-town-unreadable.json');
  $('new-game').onclick=restart;$('backup-restart').onclick=restart;
  $('import-save').onclick=()=>{if(owner&&!busy)$('import-file').click();};
  $('import-file').onchange=async()=>{const file=$('import-file').files[0];$('import-file').value='';if(!file)return;try{if(file.size>=4000000)throw Error('文件过大');const next=E.restore(await file.text(),C);if(!await confirmAction('导入将替换当前小镇，原记录会先备份。是否继续？'))return;capture();if(busy||clock.debt>=T.STEP)throw Error('正在处理进度，请稍后重试');next.paused=true;replaceState(next,key+':before-import:'+Date.now(),true);debugSpeed=1;refresh();text('settings-status','导入成功，原记录已备份。关闭面板后点击继续小镇。');}catch(e){text('settings-status','导入失败，未替换原记录：'+e.message);}};
  $('debug-speed').onchange=()=>act(()=>{const rate=Number($('debug-speed').value);debugSpeed=[1,10,30].includes(rate)?rate:1;text('debug-result','全局速度已设为 ×'+debugSpeed+'；暂停仍冻结模拟。');});
  $('debug-material').onchange=()=>{if(s)$('debug-amount').value=E.inventory(s,C,false)[$('debug-material').value];updateDebug();};
  $('debug-set').onclick=()=>{const raw=$('debug-amount').value,n=raw.trim()===''?NaN:Number(raw),k=$('debug-material').value;debugMutation('修改'+C.materials[k],state=>E.debugSetInventory(state,{[k]:n},C));};
  $('debug-add').onclick=()=>{const k=$('debug-material').value;debugMutation('增加'+C.materials[k],state=>E.debugSetInventory(state,{[k]:Math.min(debugLimit(state,k),E.inventory(state,C,false)[k]+10)},C));};
  $('debug-fill').onclick=()=>debugMutation('补满仓位',fill);
  $('debug-minute').onclick=()=>debugMutation('推进一分钟',state=>{if(state.paused)throw Error('小镇已暂停');E.advance(state,60,C);});
  $('debug-finish').onclick=()=>debugMutation('完成当前工程',async state=>{if(state.paused||!state.project)throw Error('需要一个正在运行的工程');let seconds=0;while(state.project&&seconds<3600){fill(state);E.advance(state,1,C);seconds++;if(seconds%30===0){text('debug-result',`正在补料与施工 · 已推进 ${seconds} 秒…`);await new Promise(resolve=>setTimeout(resolve,0));}}if(state.project)throw Error('工程仍被住处、家具容量或作业条件阻挡；未应用本次修改。');});
  $('debug-validate').onclick=()=>{try{capture();if(!s)throw Error('没有有效记录');E.validate(s,C);text('debug-result','检查通过：材料账本、对象身份、工程和床位状态一致。');}catch(e){text('debug-result','检查未通过：'+e.message);}};
  $('debug-undo').onclick=async()=>{if(busy||!owner||!ready)return;if(!await confirmAction('恢复上次作弊前的备份？此后进度会被撤销，当前进度也会另存备份。'))return;try{capture();if(clock.debt>=T.STEP)throw Error('正在补算，请稍后重试');const next=E.restore(localStorage.getItem(backupKey),C);next.paused=true;replaceState(next,key+':before-debug-restore:'+Date.now(),true);localStorage.removeItem(backupKey);debugSpeed=1;text('debug-result','已恢复作弊前的进度，小镇已暂停。');refresh();}catch(e){text('debug-result','未能恢复：'+e.message);}};
 }
 // Preserve the desktop frame; narrow hosts reflow the HUD and resize the world viewport.
 function fitGame(){
  const scale=innerWidth<800?1:Math.min(1,innerWidth/1280,innerHeight/720);document.documentElement.style.setProperty('--game-scale',scale);
  const viewport=document.querySelector('.game-viewport');viewport.style.width=innerWidth<800?'100%':1280*scale+'px';viewport.style.height=innerWidth<800?'100dvh':720*scale+'px';
  const world=document.querySelector('.world'),bounds=world.getBoundingClientRect();camera.aspect=world.clientWidth/world.clientHeight;camera.overlays=[...document.querySelectorAll('.scene-management,.camera-tools')].map(e=>{const b=e.getBoundingClientRect();return [(b.left-bounds.left)/bounds.width,(b.top-bounds.top)/bounds.height,(b.right-bounds.left)/bounds.width,(b.bottom-bounds.top)/bounds.height];});canvas.width=Math.round(world.clientWidth*devicePixelRatio);canvas.height=Math.round(world.clientHeight*devicePixelRatio);if(s)refresh();
 }
 fitGame();window.addEventListener('resize',fitGame);new ResizeObserver(fitGame).observe(document.querySelector('.world'));
 setup();refresh();
 if(navigator.locks){navigator.locks.request(key+':writer',{ifAvailable:true},async lock=>{owner=!!lock;await restore();if(lock)await new Promise(resolve=>{releaseLock=resolve;});}).catch(e=>{text('ownership-banner','无法获得小镇写入锁：'+e.message);$('ownership-banner').hidden=false;});}
 else{owner=false;restore();text('ownership-banner','浏览器不支持安全多标签页锁，请使用支持 Web Locks 的浏览器。');$('ownership-banner').hidden=false;}
 document.addEventListener('visibilitychange',()=>{capture();persist();if(!document.hidden)refresh();});window.addEventListener('pagehide',()=>{capture();persist();owner=false;if(releaseLock)releaseLock();});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 function frame(now){capture();if(s&&!document.hidden){if(owner&&ready&&!busy&&s.time-lastSave>=3)persist();if(now-lastUI>150){refresh();lastUI=now;}else{R.draw(canvas,s,C,level,camera);updateVisitors();}}requestAnimationFrame(frame);}requestAnimationFrame(frame);
 root.TownGrowthApp={get state(){return s;},config:C,refresh,save:persist,get view(){return level;},get camera(){return camera;},get owner(){return owner;},get ready(){return ready;},get catchingUp(){return busy||clock.debt>=T.STEP;},get debugBusy(){return busy;}};
})(globalThis);
