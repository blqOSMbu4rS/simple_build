(function(root){
 'use strict';
 const E=root.TownGrowthEngine,C=root.TownGrowthConfig.create(),R=root.TownGrowthRenderer,T=root.TownSessionClock,I=root.TownIdleTime;
 const $=id=>document.getElementById(id),key=E.SAVE_KEY,backupKey=key+':debug-backup';
 const clock=T.create(performance.now()),canvas=$('town-scene'),kinds=Object.keys(C.materials);
 const overview=C.view.levels.find(v=>v.overview)||C.view.levels[0];
 const parts=new Map(C.parts.map(p=>[p.id,p])),groups=new Map(C.groups.map(g=>[g.id,g])),rooms=new Map(C.rooms.map(r=>[r.id,r]));
 let s=null,raw=null,level=overview.id,loadError=null,lastSave=0,lastUI=0,saveError='',debugSpeed=1,activeTab=null,busy=false,toastTimer;
 let owner=false,ready=false,releaseLock=null;const camera={x:0,y:0,zoom:1};
 let previewId=null,previewReturn=null,interactionId=null,observed=null,unseen=[];const dialogTriggers=new Map(),suppressedCloses=new Set();
 const names={preparing:'安排搬迁与设施停工',work:'逐件施工',settling:'居民入住验收',install:'搬运安装',dismantle:'拆解回收',move:'完整搬出家具',reuse:'复用家具',relocate:'搬迁中'};
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
 function replaceState(next,backup){
  if(!owner)throw Error('本页只读，不能写入小镇');I.baseline(next,Date.now());
  const encoded=E.save(next,C),original=s?E.save(s,C):raw;
  if(original!==null&&original!==undefined)localStorage.setItem(backup,original);
  localStorage.setItem(key,encoded);s=next;ready=true;raw=null;loadError=null;saveError='';resetClock();$('load-error').hidden=true;
 }
 function confirmAction(message){
  const dialog=$('confirm-dialog');text('confirm-message',message);dialog.returnValue='';
  return new Promise(resolve=>{const previous=document.querySelector('dialog[open]'),trigger=document.activeElement;dialog.addEventListener('close',()=>{if(previous){openDialog(previous.id,dialogTriggers.get(previous.id));trigger.focus();}resolve(dialog.returnValue==='accept');},{once:true});openDialog('confirm-dialog',trigger);});
 }
 async function restart(){
  capture();if(busy||clock.debt>=T.STEP){toast('正在处理进度，请稍候再开始新小镇。');return;}
  if(!await confirmAction('将当前记录另存备份，再开始一个新小镇？旧版建造的记录不受影响。'))return;
  try{replaceState(E.create(C,crypto.getRandomValues(new Uint32Array(1))[0]),key+':backup:'+Date.now());ready=true;debugSpeed=1;level=overview.id;document.querySelectorAll('dialog[open]').forEach(d=>d.close());refresh();toast('已备份原记录，新小镇准备好了。');}
  catch(e){text('settings-status','未能建立新记录，原进度保留：'+e.message);if(loadError)text('load-error-text','未能备份，未覆盖原记录：'+e.message);toast('操作失败，原记录仍保留。');}
 }
 function openDialog(id,trigger=document.activeElement){
  for(const d of document.querySelectorAll('dialog[open]')){suppressedCloses.add(d);d.close();}dialogTriggers.set(id,trigger);$(id).showModal();
 }
 function setTab(name,trigger=document.activeElement){
  activeTab=name;for(const panel of $('management-dialog').querySelectorAll('.tab-panel'))panel.hidden=panel.id!=='panel-'+name;
  text('management-title',({projects:'工程列表',extensions:'扩建 · 三选一',residents:'居民与床位',storage:'仓库与家具',rooms:'房间与区域',journal:'小镇动态'})[name]);
  if(name==='projects'){unseen=[];saveNotices();}refresh();openDialog('management-dialog',trigger);updateProjects();
  if(name==='projects'){const id=s.project?.plan||C.plans.find(p=>!planReason(p))?.id,row=[...$('project-list').children].find(r=>r.dataset.plan===id);row?.scrollIntoView({block:'center'});row?.querySelector('button')?.focus({preventScroll:true});}
 }
 function saveNotices(){try{localStorage.setItem(key+':ui',JSON.stringify({observed,unseen}));}catch{ /* Notice storage is independent of the town transaction. */ }}
 function initNotices(state){let record;try{record=JSON.parse(localStorage.getItem(key+':ui'));}catch{}observed=Array.isArray(record?.observed)?record.observed:state.completed.map(p=>p.id);unseen=Array.isArray(record?.unseen)?record.unseen:[];}
 function checkNotices(){if(!ready||observed===null)return;const ids=s.completed.map(p=>p.id),fresh=ids.filter(id=>!observed.includes(id));if(!fresh.length&&observed.length===ids.length)return;observed=ids;unseen=unseen.filter(id=>ids.includes(id));if(fresh.length){if(!$('management-dialog').open||activeTab!=='projects')unseen.push(...fresh);toast(fresh.length>1?fresh.length+' 项工程已完成，可查看下一项安排。':s.project?'工程已完成，原存档中的下一项安排正在继续。':C.plans.some(p=>!planReason(p))?'工程已完成，可安排下一项。':'工程已完成，小镇继续生产。');}saveNotices();}
 function planReason(p){
  if(s.completed.some(q=>q.id===p.id))return '已完成';const missing=p.requires.filter(id=>!s.completed.some(q=>q.id===id));if(missing.length)return (s.project?'当前工程尚未完成；':'')+'前置：'+missing.map(id=>title(C.plans.find(q=>q.id===id))).join('、');
  if(s.project)return '当前工程尚未完成';if(s.queue.includes(p.id))return '保留的存档安排将自动执行';
  if(p.choiceGroup&&s.selection&&s.selection!==p.id)return '已选择另一扩建方案，动工前可撤回';return E.preview(s,C,p.id).error||'';
 }
 function projectInfo(){
  const p=s.project;if(!p)return {label:C.plans.some(p=>!planReason(p))?'可开工':'工程空闲',percent:0,detail:'小镇生产继续运行',state:'idle'};
  const plan=C.plans.find(q=>q.id===p.plan),worker=s.pets.find(p=>C.pets.find(d=>d.id===p.id).capabilities.includes('build')),task=plan.tasks[p.at],a=worker.action;
  const fraction=a&&['install','dismantle','move','reuse'].includes(a.type)?a.elapsed/a.total:0,percent=Math.min(100,Math.floor((p.at+fraction)/plan.tasks.length*100));
  const stock=E.inventory(s,C),missing=task?.type==='install'&&a?.type!=='install'?Object.entries(parts.get(task.target).cost).filter(([k,n])=>stock[k]<n):[];
  const label=s.paused?'已暂停':p.phase==='preparing'?'准备中':p.phase==='settling'?'入住中':missing.length?'等待材料':'施工中';
  const detail=s.paused?'施工、生产与来访移动均已暂停':p.phase==='preparing'?'正在搬迁或等待设施当前批次交付':p.phase==='settling'?'施工结束，等待居民入住验收':missing.length?'尚缺 '+missing.map(([k,n])=>C.materials[k]+' '+(n-stock[k])).join('、')+'；会继续采集':a?'正在'+(a.type==='production'?'补采与运输材料':names[a.type]||'施工'):'等待施工条件 · '+s.message;
  return {label,percent,detail,state:s.paused?'paused':p.phase==='work'?(missing.length?'waiting':'working'):p.phase};
 }
 function updateProjects(){
  const info=projectInfo();text('badge-label',info.label);text('badge-progress',s.project?info.percent+'%'+(info.label==='等待材料'?' · 等待':''):'点击查看工程');
  $('project-badge').dataset.state=info.state;$('project-badge').setAttribute('aria-label','工程：'+info.label+(s.project?' '+info.percent+'%':'')+'。'+info.detail+'。点击打开工程列表');$('badge-ring').style.strokeDashoffset=132*(1-info.percent/100);$('project-notice').hidden=!unseen.length||!C.plans.some(p=>!planReason(p));
  if(!$('management-dialog').open||activeTab!=='projects')return;
  for(const p of C.plans){let row=[...$('project-list').children].find(r=>r.dataset.plan===p.id);if(!row){row=el('article','project-row');row.dataset.plan=p.id;row.append(el('h3','',title(p)),el('p','',p.description),el('strong','project-row-state'),el('p','project-row-detail'),el('progress'),el('button','primary'),el('button','text-button','取消尚未动工的工程'));row.querySelector('progress').max=100;row.querySelector('progress').setAttribute('aria-label',title(p)+'施工进度');row.querySelector('.primary').onclick=()=>showPreview(p.id);row.querySelector('.text-button').onclick=()=>act(()=>toast(E.cancelProject(s,C)?'已取消尚未动工的工程':s.message));$('project-list').append(row);}
   const current=s.project?.plan===p.id,done=s.completed.some(q=>q.id===p.id),reason=planReason(p);row.classList.toggle('current',current);row.classList.toggle('complete',done);row.querySelector('.project-row-state').textContent=current?info.label+' · '+info.percent+'%':done?'✓ 已完成':reason?'未满足条件':'可执行';
   row.querySelector('.project-row-detail').textContent=current?info.detail+'。'+s.project.at+' / '+p.tasks.length+' 项任务；剩余用料：'+formatCost(remainingCost()):reason||'前置已满足；无需备齐整项材料。';const progress=row.querySelector('progress');progress.hidden=!current;progress.value=info.percent;
   const b=row.querySelector('.primary');b.textContent=current?info.label:done?'✓ 已完成':reason?'未满足条件':'可执行';b.disabled=current||done||!!reason||blocked();const cancel=row.querySelector('.text-button');cancel.hidden=!current||s.project.locked||s.queue.length>0;cancel.disabled=blocked()||s.paused;
  }
  text('saved-queue',s.queue.length?'原存档已保存的安排仍会继续：'+s.queue.map(id=>title(C.plans.find(p=>p.id===id))).join(' → '):'');
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
 function listParts(ids){const counts={};for(const id of ids){const p=parts.get(id),name=p.group?groups.get(p.group).label:R.names[p.kind]||p.kind;counts[name]=(counts[name]||0)+1;}return Object.entries(counts).map(([n,count])=>n+' × '+count+' 格').join('，')||'无';}
 function updatePreviewStock(){
  const p=E.preview(s,C,previewId);if(!p)return;const stock=E.inventory(s,C);
  text('preview-cost','新增用料：'+formatCost(p.cost)+'。当前可用：'+formatCost(stock));
  for(const item of $('preview-materials').children){const k=item.dataset.kind,missing=Math.max(0,p.cost[k]-stock[k]);item.querySelector('p').textContent=`可用 ${stock[k]} / 需要 ${p.cost[k]}`;item.querySelector('small').textContent=missing?`尚差 ${missing} · 可边建边补`:'材料已够';item.querySelector('small').className=missing?'short':'';}
  $('start-project').disabled=!!p.error||!!s.project||blocked()||!!planReason(p.plan);text('start-project',s.paused?'继续小镇并开工':'确认安排并开工');
  // Do not erase a selection error while the player is correcting their arrangement.
  if(p.error)text('preview-error',p.error);
 }
 function showPreview(id){
  capture();if(blocked()||s.project)return;previewId=id;const p=E.preview(s,C,id);if(!p)return;previewReturn={tab:activeTab,scroll:$('management-dialog').scrollTop,focus:document.activeElement};
  text('preview-title',title(p.plan));text('preview-description',p.plan.description);text('diff-retained',listParts(p.retained));
  text('diff-moved',[...p.moved.map(id=>'搬出'+groups.get(id).label),...p.reused.map(id=>'复用'+groups.get(id).label)].join('；')||'无');
  text('diff-removed',listParts(p.removed));text('diff-added',listParts(p.added));
  text('preview-recovery','任务完成后预计回收：'+formatCost(p.recovery)+'；完整搬移家具不同时回收材料。');
  text('impact',p.plan.disable.length?'临时停用：'+p.plan.disable.map(id=>rooms.get(id).name).join('、')+'。当前批次先交付，其余空间继续工作。':'本工程不需要停用已有房间，小伙伴可以继续生产。');
  $('preview-materials').replaceChildren();for(const k of kinds)if(p.cost[k]){const item=el('div','preview-material');item.dataset.kind=k;item.append(el('strong','',C.materials[k]),el('p'),el('small'));$('preview-materials').append(item);}
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
   row.querySelector('.state-pill').textContent=available?'可用':ready?'改建中 · 停用':built?'建造中':'尚未建成';
   const residents=s.pets.filter(p=>C.beds.find(b=>b.id===p.home)?.room===r.id),beds=C.beds.filter(b=>b.room===r.id&&E.bedAvailable(s,b,C));
   row.querySelector('.room-beds').textContent='住在这里：'+(residents.map(p=>C.pets.find(d=>d.id===p.id).name).join('、')||'暂无居民')+(beds.length?` · 可用床位 ${beds.length}`:'');
   const facilities=C.groups.filter(g=>g.capability&&s.furniture[g.id].status==='installed'&&s.objects[g.parts[0]].room===r.id);
   row.querySelector('.room-detail').textContent=(r.initial?'基础营地始终保留。':`结构与通道 ${built} / ${needed.length} 格就绪。`)+(facilities.length?' 已安装：'+facilities.map(g=>g.label).join('、')+'。':'');
  }
 }
 function updateJournal(){const sig=JSON.stringify(s.events);if($('event-log').dataset.signature!==sig){$('event-log').replaceChildren();for(const event of s.events)$('event-log').append(el('li','',timeLabel(event.time)+' · '+event.text));$('event-log').dataset.signature=sig;}}
 function storageEstimate(k){
  const remaining=E.capacity(s,C)[k]-E.inventory(s,C,false)[k]-E.reserved(s,k);if(remaining<1)return '本批次仓位已满。';
  if(s.project||s.queue.length||s.paused||Object.values(s.assists).some(n=>n>0))return '产速随施工、暂停或协助变化，暂不估计满仓时间。';
  const recipes=E.stableRecipes(s,C).filter(r=>r.output[k]&&!Object.keys(r.input).length&&!r.regrow&&!r.buffer&&r.facility).sort((a,b)=>(b.priority||0)-(a.priority||0));
  const r=recipes[0],worker=r&&s.pets.find(p=>p.home&&C.pets.find(d=>d.id===p.id).capabilities.includes(r.capability));
  if(!r||!worker)return '产速或中间原料不稳定，暂不估计满仓时间。';
  const rate=r.output[k]/(r.seconds/E.efficiency(s,worker,r,C)+4);return `约 ${Math.ceil(remaining/rate/60)} 分钟达到仓位门槛（岗位和住处持续可用、不施工或取用时）。`;
 }
 function showOffline(){const info=s.lastOffline;if(!info)return;const list=$('offline-summary');list.replaceChildren(el('p','',`实际补算 ${timeLabel(info.seconds)}${info.capped?' · 已达 8 小时上限，超出时间已舍弃':''}`));
  for(const k of kinds)list.append(el('p','',`${C.materials[k]}：获得 ${info.gained[k]}，消耗 ${info.consumed[k]}，当前可用 ${info.inventory[k]}`));
  list.append(el('p','','完成工程：'+(info.completed.join('、')||'无')),el('p','','当前状态：'+info.waiting));openDialog('offline-dialog');
 }
 function updateExtensions(){
  const node=$('extensions'),signature=JSON.stringify([s.completed.map(p=>p.id),s.selection,s.project?.plan,s.project?.locked,projectInfo(),s.gardenStyle,s.paused,blocked()]);if(node.dataset.signature===signature)return;node.dataset.signature=signature;node.replaceChildren();
  for(const p of C.plans.filter(p=>p.choiceGroup)){
   const row=el('article','extension-card'),preview=el('canvas');preview.width=240;preview.height=192;preview.setAttribute('aria-label',p.name+'构件预览');R.preview(preview,s,C,p.id);
   const done=s.completed.some(q=>q.id===p.id),current=s.project?.plan===p.id,locked=current&&s.project.locked,reason=planReason(p);
   row.append(preview,el('h3','',p.name),el('p','',p.description),el('p','','用料：'+formatCost(E.preview(s,C,p.id).cost)),el('small','',current?projectInfo().label+' · '+projectInfo().percent+'%':done?'已完工 · 效果生效':reason||'已解锁；确认图纸后直接开工'));
   const b=el('button','primary',current?'工程进行中':done?'✓ 已完成':'查看图纸并开工');b.disabled=current||done||!!reason||blocked();b.onclick=()=>showPreview(p.id);row.append(b);
   if(s.selection===p.id&&!done){const undo=el('button','',locked?'已动工锁定':'撤回选择');undo.disabled=locked||s.paused||blocked();undo.onclick=()=>act(()=>E.choose(s,null,C));row.append(undo);}node.append(row);
  }
  if(C.plans.some(p=>p.effect?.residents&&s.completed.some(q=>q.id===p.id))){const b=el('button','','切换花园摆设');b.disabled=s.paused||blocked();b.onclick=()=>act(()=>E.cycleGarden(s,C));node.append(b);}
 }
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
  for(const r of C.rooms){const row=el('article','room-card');row.dataset.room=r.id;const head=el('div','room-heading');head.append(el('strong','',r.name),el('span','state-pill'));const b=el('button','','查看所在区域');b.onclick=()=>{$('management-dialog').close();setView((C.view.levels.find(v=>v.rooms?.includes(r.id))||overview).id);canvas.focus();};row.append(head,el('p','room-beds'),el('p','room-detail'),b);$('rooms').append(row);}
  for(const l of C.view.levels){const b=el('button','',l.name);b.dataset.level=l.id;b.setAttribute('aria-pressed',String(l.id===level));b.onclick=()=>setView(l.id);$('views').append(b);}
  const redraw=()=>{if(s){R.draw(canvas,s,C,level,camera);updateVisitors();}};
  const pan=delta=>{camera.x=Math.max(-700,Math.min(700,camera.x+delta));redraw();};
  $('pan-left').onclick=()=>pan(-96);$('pan-right').onclick=()=>pan(96);$('camera-reset').onclick=()=>setView(level);
  const zoom=delta=>{camera.zoom=Math.max(.75,Math.min(3,camera.zoom+delta));redraw();};$('zoom-in').onclick=()=>zoom(.25);$('zoom-out').onclick=()=>zoom(-.25);
  canvas.tabIndex=0;canvas.style.touchAction='none';let pointer=null;
  canvas.onpointerdown=e=>{if(pointer){pointer.drag=true;return;}const bubble=e.target.closest('.visitor-bubble');pointer={id:e.pointerId,x:e.clientX,y:e.clientY,pan:camera.x,py:camera.y,drag:false,eventId:bubble?.dataset.event,trigger:bubble||canvas};canvas.setPointerCapture(e.pointerId);};
  const hit=e=>{if(!s)return null;const scene=document.querySelector('.landscape').getBoundingClientRect(),scale=scene.width/document.querySelector('.landscape').offsetWidth,x=(e.clientX-scene.left)/scale,y=(e.clientY-scene.top)/scale;return visitorTargets().find(t=>t.visible&&t.pose.arrived&&Math.abs(t.x-x)<18&&y>t.y-30&&y<t.y+8);};
  canvas.onpointermove=e=>{canvas.style.cursor=hit(e)?'pointer':'grab';if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.hypot(dx,dy)>5)pointer.drag=true;if(pointer.drag&&s){const rect=R.viewRect(s,C,level,camera),bounds=canvas.getBoundingClientRect();camera.x=pointer.pan-dx/bounds.width*rect[2];camera.y=pointer.py-dy/bounds.height*rect[3];redraw();}};
  canvas.onpointerup=e=>{if(!pointer||pointer.id!==e.pointerId)return;const previous=pointer;pointer=null;if(previous.drag)return;if(previous.eventId){const event=s.interactions.find(q=>q.id===previous.eventId);if(event&&E.visitorPose(s,event).arrived)openInteraction(event.id,previous.trigger);}else{const target=hit(e);if(target)openInteraction(target.e.id);}};
  canvas.onpointercancel=()=>{pointer=null;};canvas.onwheel=e=>{e.preventDefault();if(pointer)pointer.drag=true;zoom(e.deltaY<0?.25:-.25);};canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','+','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')pan(-32);if(e.key==='ArrowRight')pan(32);if(e.key==='+')zoom(.25);if(e.key==='-')zoom(-.25);if(e.key==='Home')setView(level);}};
  for(const b of document.querySelectorAll('[data-tab]'))b.onclick=()=>setTab(b.dataset.tab,b);
  $('project-badge').onclick=()=>setTab('projects',$('project-badge'));$('open-journal').onclick=()=>setTab('journal',$('open-journal'));
  for(const d of document.querySelectorAll('dialog'))d.addEventListener('close',()=>{if(suppressedCloses.delete(d))return;if(d.id==='project-dialog'&&previewReturn){const back=previewReturn;previewReturn=null;setTab(back.tab);$('management-dialog').scrollTop=back.scroll;queueMicrotask(()=>back.focus?.focus({preventScroll:true}));return;}const trigger=dialogTriggers.get(d.id);queueMicrotask(()=>{if(trigger?.isConnected&&!trigger.closest('dialog:not([open])'))trigger.focus({preventScroll:true});else if(d.id==='interaction-dialog')canvas.focus({preventScroll:true});});});
  for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
  for(const [id,dialog]of [['open-help','help-dialog'],['open-settings','settings-dialog'],['open-debug','debug-dialog']])$(id).onclick=()=>{if(dialog==='debug-dialog'){if(s)$('debug-amount').value=E.inventory(s,C,false)[$('debug-material').value];updateDebug();}openDialog(dialog);};
  $('pause').onclick=()=>act(()=>{s.paused=!s.paused;});$('resume-town').onclick=()=>act(()=>{s.paused=false;});
  $('speed').onchange=()=>act(()=>{s.multiplier=Number($('speed').value);});$('priority').onchange=()=>act(()=>{s.gatherPriority=$('priority').value;});
  $('close-preview').onclick=()=>$('project-dialog').close();
  $('start-project').onclick=()=>act(()=>{const choices=Object.fromEntries([...$('moving-choices').querySelectorAll('select')].map(sel=>[sel.dataset.pet,sel.value]));const paused=s.paused;s.paused=false;const plan=C.plans.find(p=>p.id===previewId);if(plan.choiceGroup&&s.selection!==previewId&&!E.choose(s,previewId,C)){s.paused=paused;text('preview-error','扩建条件已经改变，请重新查看。');return;}if(E.startProject(s,C,choices,previewId)){previewReturn=null;$('project-dialog').close();toast('已开工，小伙伴会自动准备材料和施工。');}else{s.paused=paused;text('preview-error',s.message);}});
  $('export-save').onclick=()=>act(()=>{download(E.save(s,C),'little-town.json');text('settings-status','已导出当前进度。');});$('export-original').onclick=()=>download(raw||'','little-town-unreadable.json');
  $('new-game').onclick=restart;$('backup-restart').onclick=restart;
  $('import-save').onclick=()=>{if(owner&&!busy)$('import-file').click();};
  $('import-file').onchange=async()=>{const file=$('import-file').files[0];$('import-file').value='';if(!file)return;try{if(file.size>=4000000)throw Error('文件过大');const next=E.restore(await file.text(),C);if(!await confirmAction('导入将替换当前小镇，原记录会先备份。是否继续？'))return;capture();if(busy||clock.debt>=T.STEP)throw Error('正在处理进度，请稍后重试');next.paused=true;replaceState(next,key+':before-import:'+Date.now());debugSpeed=1;refresh();text('settings-status','导入成功，原记录已备份。关闭面板后点击继续小镇。');}catch(e){text('settings-status','导入失败，未替换原记录：'+e.message);}};
  $('debug-speed').onchange=()=>act(()=>{const rate=Number($('debug-speed').value);debugSpeed=[1,10,30].includes(rate)?rate:1;text('debug-result','全局速度已设为 ×'+debugSpeed+'；暂停仍冻结模拟。');});
  $('debug-material').onchange=()=>{if(s)$('debug-amount').value=E.inventory(s,C,false)[$('debug-material').value];updateDebug();};
  $('debug-set').onclick=()=>{const raw=$('debug-amount').value,n=raw.trim()===''?NaN:Number(raw),k=$('debug-material').value;debugMutation('修改'+C.materials[k],state=>E.debugSetInventory(state,{[k]:n},C));};
  $('debug-add').onclick=()=>{const k=$('debug-material').value;debugMutation('增加'+C.materials[k],state=>E.debugSetInventory(state,{[k]:Math.min(debugLimit(state,k),E.inventory(state,C,false)[k]+10)},C));};
  $('debug-fill').onclick=()=>debugMutation('补满仓位',fill);
  $('debug-minute').onclick=()=>debugMutation('推进一分钟',state=>{if(state.paused)throw Error('小镇已暂停');E.advance(state,60,C);});
  $('debug-finish').onclick=()=>debugMutation('完成当前工程',async state=>{if(state.paused||!state.project)throw Error('需要一个正在运行的工程');let seconds=0;while(state.project&&seconds<3600){fill(state);E.advance(state,1,C);seconds++;if(seconds%30===0){text('debug-result',`正在补料与施工 · 已推进 ${seconds} 秒…`);await new Promise(resolve=>setTimeout(resolve,0));}}if(state.project)throw Error('工程仍被住处、家具容量或作业条件阻挡；未应用本次修改。');});
  $('debug-validate').onclick=()=>{try{capture();if(!s)throw Error('没有有效记录');E.validate(s,C);text('debug-result','检查通过：材料账本、对象身份、工程和床位状态一致。');}catch(e){text('debug-result','检查未通过：'+e.message);}};
  $('debug-undo').onclick=async()=>{if(busy||!owner||!ready)return;if(!await confirmAction('恢复上次作弊前的备份？此后进度会被撤销，当前进度也会另存备份。'))return;try{capture();if(clock.debt>=T.STEP)throw Error('正在补算，请稍后重试');const next=E.restore(localStorage.getItem(backupKey),C);next.paused=true;replaceState(next,key+':before-debug-restore:'+Date.now());localStorage.removeItem(backupKey);debugSpeed=1;text('debug-result','已恢复作弊前的进度，小镇已暂停。');refresh();}catch(e){text('debug-result','未能恢复：'+e.message);}};
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
