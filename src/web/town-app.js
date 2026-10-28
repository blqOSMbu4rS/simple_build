(function(root){
 'use strict';
 const E=root.TownGrowthEngine,C=root.TownGrowthConfig.create(),R=root.TownGrowthRenderer,T=root.TownSessionClock,I=root.TownIdleTime;
 const $=id=>document.getElementById(id),key=E.SAVE_KEY,backupKey=key+':debug-backup';
 const clock=T.create(performance.now()),canvas=$('town-scene'),kinds=Object.keys(C.materials);
 const overview=C.view.levels.find(v=>v.overview)||C.view.levels[0];
 const parts=new Map(C.parts.map(p=>[p.id,p])),groups=new Map(C.groups.map(g=>[g.id,g])),rooms=new Map(C.rooms.map(r=>[r.id,r]));
 let s=null,raw=null,level=overview.id,loadError=null,lastSave=0,lastUI=0,saveError='',debugSpeed=1,activeTab='projects',busy=false,toastTimer;
 let owner=false,ready=false,releaseLock=null;const camera={x:0,y:0,zoom:1};
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
   if(owner){busy=true;s=original;text('ownership-banner','正在结算离开期间的小镇…');$('ownership-banner').hidden=false;refresh();
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
  return new Promise(resolve=>{dialog.addEventListener('close',()=>resolve(dialog.returnValue==='accept'),{once:true});dialog.showModal();});
 }
 async function restart(){
  capture();if(busy||clock.debt>=T.STEP){toast('正在处理进度，请稍候再开始新小镇。');return;}
  if(!await confirmAction('将当前记录另存备份，再开始一个新小镇？旧版建造的记录不受影响。'))return;
  try{replaceState(E.create(C,crypto.getRandomValues(new Uint32Array(1))[0]),key+':backup:'+Date.now());ready=true;debugSpeed=1;level=overview.id;document.querySelectorAll('dialog[open]').forEach(d=>d.close());refresh();toast('已备份原记录，新小镇准备好了。');}
  catch(e){text('settings-status','未能建立新记录，原进度保留：'+e.message);if(loadError)text('load-error-text','未能备份，未覆盖原记录：'+e.message);toast('操作失败，原记录仍保留。');}
 }
 function setTab(name,focus=false){
  activeTab=name;for(const tab of document.querySelectorAll('[data-tab]')){const selected=tab.dataset.tab===name;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;$(tab.getAttribute('aria-controls')).hidden=!selected;if(selected&&focus)tab.focus();}refresh();
 }
 function setView(id){level=id;Object.assign(camera,{x:0,y:0,zoom:1});for(const b of $('views').children)b.setAttribute('aria-pressed',String(b.dataset.level===level));if(s)R.draw(canvas,s,C,level,camera);}
 function activity(pet){
  const a=pet.action;if(!a)return E.workStatus(s,pet,C);
  if(a.type==='production'){const r=C.recipes.find(r=>r.id===a.recipe);return r.name+(a.elapsed>=a.workEnd?' · 搬运交付':a.elapsed<2?' · 前往作业点':' · 作业中');}
  return names[a.type]||'工作中';
 }
 function remainingCost(){
  const cost=zero(),plan=E.currentPlan(s,C);if(!plan)return cost;
  for(const t of plan.tasks.slice(s.project?.at||0))if(t.type==='install'&&!s.pets.some(p=>p.action?.type==='install'&&p.action.part===t.target))for(const [k,n]of Object.entries(parts.get(t.target).cost))cost[k]+=n;
  return cost;
 }
 function updateGoal(){
  const p=s.project,plan=E.currentPlan(s,C),done=!plan,stock=E.inventory(s,C),need=remainingCost();
  text('chapter-number',done?'我们的日常':plan.base?`基础工程 · ${C.plans.filter(p=>p.base&&s.completed.some(q=>q.id===p.id)).length+1} / 5`:'扩展地块工程');
  text('project-title',done?'小镇开始了日常':title(plan));text('objective',done?'每一位居民都有了住处，小伙伴们仍在继续生产。':plan.description);
  text('project-state',s.paused?'已暂停':p?'进行中':done?'已完成':'待开工');
  const builder=s.pets.find(p=>C.pets.find(d=>d.id===p.id).capabilities.includes('build'));
  let hint=done?'可在下方选择扩展地块，或查看居民与仓库。小镇会持续自动生产。':'点击下方查看图纸，确认安排后开工。材料不足也可以开始。';
  if(p){
   if(p.phase==='preparing')hint='小伙伴正在收尾当前批次并搬迁。安排完成后自动开始施工。';
   else if(p.phase==='settling')hint='施工已结束，正在安排居民入住。稍后会解锁下一项工程。';
   else if(builder.action?.type==='production')hint=`${C.pets.find(d=>d.id===builder.id).name}正在${C.recipes.find(r=>r.id===builder.action.recipe).name}，送达后会自动继续施工。`;
   else if(builder.action)hint=`正在${names[builder.action.type]||'施工'}。你可以切换楼层近看，也可以查看居民与库存。`;
   else hint=s.message||'等待下一项作业条件就绪。';
  }
  if(s.paused)hint='点击「继续小镇」，施工、生产和搬迁才会继续。图纸与各项信息仍可查看。';
  if(clock.debt>=T.STEP)hint='正在补算页面后台经过的时间，完成后即可操作。';
  text('next-action',hint);text('project-status',p?`${names[p.phase]} · ${p.at} / ${plan.tasks.length} 项任务`:done?'全部工程完成，生产持续运行。':'开工后，小伙伴会自动取材、搬运和安装。');
  $('project-progress').hidden=!p;if(p){$('project-progress').max=plan.tasks.length;$('project-progress').value=p.at;}
  const signature=JSON.stringify([need,stock]);if($('project-needs').dataset.signature!==signature){$('project-needs').replaceChildren();for(const k of kinds)if(need[k])$('project-needs').append(el('span',stock[k]<need[k]?'short':'',`${C.materials[k]}待领 ${need[k]} · 可用 ${stock[k]}`));$('project-needs').dataset.signature=signature;}
  $('preview-project').hidden=!!p||done;$('preview-project').disabled=blocked();text('preview-project',s.paused?'查看下一项图纸':'查看图纸并开工 →');
  $('cancel-project').hidden=!p||p.locked;$('cancel-project').disabled=blocked()||s.paused;
 }
 function listParts(ids){const counts={};for(const id of ids){const p=parts.get(id),name=p.group?groups.get(p.group).label:R.names[p.kind]||p.kind;counts[name]=(counts[name]||0)+1;}return Object.entries(counts).map(([n,count])=>n+' × '+count+' 格').join('，')||'无';}
 function updatePreviewStock(){
  const p=E.preview(s,C);if(!p)return;const stock=E.inventory(s,C);
  text('preview-cost','新增用料：'+formatCost(p.cost)+'。当前可用：'+formatCost(stock));
  for(const item of $('preview-materials').children){const k=item.dataset.kind,missing=Math.max(0,p.cost[k]-stock[k]);item.querySelector('p').textContent=`可用 ${stock[k]} / 需要 ${p.cost[k]}`;item.querySelector('small').textContent=missing?`尚差 ${missing} · 可边建边补`:'材料已够';item.querySelector('small').className=missing?'short':'';}
  $('start-project').disabled=!!p.error||blocked();text('start-project',s.paused?'继续小镇并开工':'确认安排并开工');
  // Do not erase a selection error while the player is correcting their arrangement.
  if(p.error)text('preview-error',p.error);
 }
 function showPreview(){
  capture();if(blocked()||s.project)return;const p=E.preview(s,C);if(!p)return;
  text('preview-title',title(p.plan));text('preview-description',p.plan.description);text('diff-retained',listParts(p.retained));
  text('diff-moved',[...p.moved.map(id=>'搬出'+groups.get(id).label),...p.reused.map(id=>'复用'+groups.get(id).label)].join('；')||'无');
  text('diff-removed',listParts(p.removed));text('diff-added',listParts(p.added));
  text('preview-recovery','任务完成后预计回收：'+formatCost(p.recovery)+'；完整搬移家具不同时回收材料。');
  text('impact',p.plan.disable.length?'临时停用：'+p.plan.disable.map(id=>rooms.get(id).name).join('、')+'。当前批次先交付，其余空间继续工作。':'本工程不需要停用已有房间，小伙伴可以继续生产。');
  $('preview-materials').replaceChildren();for(const k of kinds)if(p.cost[k]){const item=el('div','preview-material');item.dataset.kind=k;item.append(el('strong','',C.materials[k]),el('p'),el('small'));$('preview-materials').append(item);}
  $('moving-choices').replaceChildren();for(const move of p.moves||[]){const row=el('label','moving-row',C.pets.find(p=>p.id===move.pet).name+'临时搬至');const sel=el('select');sel.dataset.pet=move.pet;
   for(const b of C.beds.filter(b=>!b.permanent&&!p.plan.disable.includes(b.room)&&E.bedAvailable(s,b,C)&&!s.pets.some(p=>p.home===b.id))){const option=el('option','',roomName(b.id)+' · 床位 '+(C.beds.indexOf(b)+1));option.value=b.id;sel.append(option);}sel.value=move.bed;row.append(sel);$('moving-choices').append(row);}
  text('preview-error',p.error||'');$('project-dialog').querySelector('details').open=false;updatePreviewStock();$('project-dialog').showModal();
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
 function updateRoadmap(){
  for(const [i,row]of [...$('roadmap').children].entries()){const plan=C.plans.filter(p=>p.base)[i],record=s.completed.find(p=>p.id===plan.id),unlocked=plan.requires.every(id=>s.completed.some(p=>p.id===id));row.className=record?'complete':unlocked?'current':'locked';row.querySelector('.step-dot').textContent=record?'✓':i+1;row.querySelector('small').textContent=record?'已完成 · '+timeLabel(record.time):unlocked?'已解锁 · 可查看图纸或加入队列':'等待前置工程完成';}
  const sig=JSON.stringify(s.events);if($('event-log').dataset.signature!==sig){$('event-log').replaceChildren();for(const event of s.events)$('event-log').append(el('li','',timeLabel(event.time)+' · '+event.text));$('event-log').dataset.signature=sig;}
 }
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
  list.append(el('p','','完成工程：'+(info.completed.join('、')||'无')),el('p','','当前状态：'+info.waiting));$('offline-dialog').showModal();
 }
 function updateIdle(){
  const render=(id,sig,build)=>{const target=$(id);if(target.dataset.signature===sig)return;target.replaceChildren();build(target);target.dataset.signature=sig;};
  const button=(label,fn,disabled=false)=>{const b=el('button','',label);b.disabled=disabled||blocked();b.onclick=()=>act(fn);return b;};
  const signature=JSON.stringify([s.queue,s.completed.map(p=>p.id),s.project?.plan,s.project?.locked,s.selection,s.paused,blocked()]);
  render('project-queue',signature,node=>{for(let i=0;i<3;i++){const id=s.queue[i],p=C.plans.find(p=>p.id===id),row=el('div','queue-row');row.append(el('span','',`${i+1}. ${p?p.name:'空闲待办位置'}`));if(p){row.append(button('移除',()=>toast(E.removeQueued(s,id,C)?'已移除待办':'后方工程依赖此项，请先移除后方工程。')));for(const delta of [-1,1]){const j=i+delta;row.append(button(delta<0?'↑':'↓',()=>{const ids=[...s.queue];[ids[i],ids[j]]=[ids[j],ids[i]];toast(E.reorderQueue(s,ids,C)?'已调整顺序':'此顺序不满足前置依赖。');},j<0||j>=s.queue.length));}}node.append(row);}});
  render('queue-options',signature,node=>{for(const p of C.plans.filter(p=>p.base&&!s.completed.some(q=>q.id===p.id)&&p.id!==s.project?.plan&&!s.queue.includes(p.id))){const known=new Set([...s.completed.map(q=>q.id),s.project?.plan,...s.queue]),missing=p.requires.filter(id=>!known.has(id)),row=el('div','queue-candidate');row.append(el('small','',p.name+' · '+(missing.length?'前置：'+missing.map(id=>C.plans.find(q=>q.id===id).name).join('、'):'前置已满足（含队列前方）')),button('加入待办',()=>toast(E.enqueue(s,p.id,C)?'已加入，满足条件会自动开工。':'队列已满或前置条件未满足。'),missing.length>0||s.queue.length>=3));node.append(row);}});
  text('queue-wait',s.queueWait||(!s.project&&s.queue.length?'待办将自动开工':!s.project?'等待玩家确认工程':'当前工程：'+C.plans.find(p=>p.id===s.project.plan).name));
  const eventSig=JSON.stringify([s.interactions,s.assists,E.inventory(s,C),E.capacity(s,C),s.project?.at,s.paused,blocked()]);
  render('interactions',eventSig,node=>{if(!s.interactions.length)node.append(el('p','panel-intro','小伙伴会按小镇时间带来互动；不领取也能完成全部工程。'));
   for(const event of s.interactions){const row=el('article','interaction-card');row.dataset.event=event.id;const name={pickup:'拾取散落材料',commission:'居民委托',assist:'整理生产工具'}[event.type];row.append(el('strong','',name));
    row.append(el('p','',event.type==='assist'?C.recipes.filter(r=>r.capability===event.assistKey).map(r=>r.name).join(' / ')+`：${event.progress} / ${event.clicks}，接下来三个批次作业效率 +10%`:'投入 '+formatCost(event.input)+' → 得到 '+formatCost(event.reward)));
    const check=E.interactionCheck(s,event.id,C);row.append(el('small','',check.error||'可以结算 · 不会重复领取'));
    row.append(button(event.status==='active'?'整理一次':'确认领取 / 提交',()=>event.status==='active'?E.progressInteraction(s,event.id,C):E.claimInteraction(s,event.id,C),s.paused||(event.status==='ready'&&!!check.error)),button('放弃',()=>E.abandonInteraction(s,event.id,C),s.paused));node.append(row);}
   for(const [id,n]of Object.entries(s.assists))if(n)node.append(el('p','',C.recipes.filter(r=>r.capability===id).map(r=>r.name).join(' / ')+'协助：剩余 '+n+' 批'));});
  render('extensions',signature+'|'+s.gardenStyle,node=>{if(!s.completed.length){node.append(el('p','panel-intro','完成第一项工程后可查看方案；五项基础工程后可选择。'));return;}
   const finished=C.plans.filter(p=>p.base).every(p=>s.completed.some(q=>q.id===p.id));
   for(const p of C.plans.filter(p=>p.choiceGroup)){const row=el('article','extension-card'),preview=el('canvas');preview.width=240;preview.height=192;preview.setAttribute('aria-label',p.name+'构件预览');R.preview(preview,s,C,p.id);const cost=E.preview(s,C,p.id).cost;
    const done=s.completed.some(q=>q.id===p.id),locked=s.project?.plan===p.id&&s.project.locked;row.append(preview,el('strong','',p.name),el('p','',p.description),el('p','','材料：'+formatCost(cost)),el('small','','人员：现有建造伙伴逐件施工；效果使用现有岗位。动工后用途不可转换。'));
    if(done)row.append(el('p','state-pill','已完工 · 效果生效'));else if(s.selection===p.id){row.append(el('p','',locked?'已动工锁定':'已选中；尚未动工可撤回'),button('加入待办',()=>E.enqueue(s,p.id,C),s.queue.includes(p.id)||s.project?.plan===p.id||s.queue.length>=3),button('撤回选择',()=>E.choose(s,null,C),locked));}
    else row.append(button('选择此方案',()=>E.choose(s,p.id,C),!finished||!!s.selection));node.append(row);
   }if(C.plans.some(p=>p.effect?.residents&&s.completed.some(q=>q.id===p.id)))node.append(button('切换花园摆设（仅外观）',()=>E.cycleGarden(s,C)));});
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
  for(const id of ['pause','resume-town','speed','priority','export-save','new-game','preview-project'])$(id).disabled=blocked();
  if(!s){text('next-action','原记录暂时无法读取。请先使用上方恢复操作，或在设置中导入有效记录。');$('pause-banner').hidden=true;updateDebug();return;}
  const stock=E.inventory(s,C,false),available=E.inventory(s,C);
  const cap=E.capacity(s,C);for(const k of kinds){text('stock-'+k,available[k]);text('stock-detail-'+k,`仓内 ${stock[k]}/${cap[k]} · 预留 ${E.reserved(s,k)}`);}
  text('town-time','小镇时间 '+timeLabel(s.time));text('pause',s.paused?'继续小镇':'暂停小镇');$('pause').setAttribute('aria-pressed',String(s.paused));$('pause-banner').hidden=!s.paused;
  $('speed').value=s.multiplier;$('priority').value=s.gatherPriority;const changed=!!s.ledger.debug;
  $('debug-badge').hidden=debugSpeed===1&&!changed;text('debug-badge',[debugSpeed!==1?'调试 ×'+debugSpeed:'',changed?'已修改材料':''].filter(Boolean).join(' · '));
  text('save-status',saveError||'本地自动保存');$('save-status').className=saveError?'save-warning':'';text('message',s.message);
  text('resident-count',s.pets.filter(p=>p.home).length+'/'+C.pets.length);
  updateGoal();if(activeTab==='projects'){updateRoadmap();updateIdle();}if(activeTab==='residents')updateResidents();if(activeTab==='storage')updateStorage();if(activeTab==='rooms')updateRooms();
  if($('project-dialog').open)updatePreviewStock();if($('debug-dialog').open)updateDebug();
  for(const b of $('views').children)b.setAttribute('aria-pressed',String(b.dataset.level===level));R.draw(canvas,s,C,level,camera);
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
   const count=el('b','','0');count.id='stock-'+k;const detail=el('small');detail.id='stock-detail-'+k;button.append(count,detail);button.onclick=()=>{setTab('storage');$('tab-storage').focus();};$('resource-cards').append(button);
   const row=el('div','warehouse-row');row.dataset.kind=k;const head=el('div','warehouse-heading');head.append(el('strong','',C.materials[k]+' · 仓内'),el('b'));const meter=el('div','stock-meter');meter.append(el('span'));
   const source=C.recipes.filter(r=>r.output[k]).map(r=>r.name).join(' / ');row.append(head,meter,el('p','stock-detail'),el('p','','来源：'+source),el('p','availability'));
   const stow=el('button','','转存最多 4 份到营地');stow.onclick=()=>act(()=>toast(E.stow(s,k,C)?'已转存，材料仍可用于施工和加工。':'暂无材料或营地料垛已满。'));row.append(stow);$('warehouse').append(row);
   const option=el('option','',C.materials[k]);option.value=k;$('debug-material').append(option);
  }
  for(const p of C.plans.filter(p=>p.base)){const li=el('li'),info=el('div');info.append(el('strong','',title(p)),el('small'));li.append(el('span','step-dot'),info);$('roadmap').append(li);}
  for(const def of C.pets){const row=el('div','resident');row.dataset.pet=def.id;const mark=el('span','pet-mark');mark.style.setProperty('--pet',def.color);mark.setAttribute('aria-hidden','true');const info=el('div'),name=el('div');name.append(el('strong','',def.name),el('span','pet-role',def.capabilities.includes('build')?'建造伙伴':C.recipes.filter(r=>def.capabilities.includes(r.capability)).map(r=>r.name).join(' / ')));
   const details=el('details'),select=el('select');select.setAttribute('aria-label','为'+def.name+'分配床位');select.onchange=()=>act(()=>toast(E.assignHome(s,def.id,select.value,C)?'已安排搬迁，小伙伴会自己过去。':'暂时无法搬迁，请检查床位与工作状态。'));details.append(el('summary','','安排住处'),select,el('p','home-hint'));info.append(name,el('p','home'),el('p','activity'),details);row.append(mark,info);$('residents').append(row);}
  for(const r of C.rooms){const row=el('article','room-card');row.dataset.room=r.id;const head=el('div','room-heading');head.append(el('strong','',r.name),el('span','state-pill'));const b=el('button','','查看所在区域');b.onclick=()=>{setView((C.view.levels.find(v=>v.rooms?.includes(r.id))||overview).id);};row.append(head,el('p','room-beds'),el('p','room-detail'),b);$('rooms').append(row);}
  for(const l of C.view.levels){const b=el('button','',l.name);b.dataset.level=l.id;b.setAttribute('aria-pressed',String(l.id===level));b.onclick=()=>setView(l.id);$('views').append(b);}
  const redraw=()=>{if(s)R.draw(canvas,s,C,level,camera);};
  const pan=delta=>{camera.x=Math.max(-700,Math.min(700,camera.x+delta));redraw();};
  $('pan-left').onclick=()=>pan(-96);$('pan-right').onclick=()=>pan(96);$('camera-reset').onclick=()=>setView(level);
  const zoom=delta=>{camera.zoom=Math.max(.75,Math.min(3,camera.zoom+delta));redraw();};$('zoom-in').onclick=()=>zoom(.25);$('zoom-out').onclick=()=>zoom(-.25);
  canvas.tabIndex=0;canvas.style.touchAction='none';let pointer=null;
  canvas.onpointerdown=e=>{pointer={id:e.pointerId,x:e.clientX,y:e.clientY,pan:camera.x,py:camera.y,drag:false};canvas.setPointerCapture(e.pointerId);};
  canvas.onpointermove=e=>{if(!pointer||pointer.id!==e.pointerId)return;const dx=e.clientX-pointer.x,dy=e.clientY-pointer.y;if(Math.hypot(dx,dy)>5)pointer.drag=true;if(pointer.drag&&s){const rect=R.viewRect(s,C,level,camera),bounds=canvas.getBoundingClientRect();camera.x=pointer.pan-dx/bounds.width*rect[2];camera.y=pointer.py-dy/bounds.height*rect[3];redraw();}};
  canvas.onpointerup=e=>{if(!pointer||pointer.id!==e.pointerId)return;const click=!pointer.drag;pointer=null;if(!click||blocked())return;const bounds=canvas.getBoundingClientRect(),rect=R.viewRect(s,C,level,camera),x=rect[0]+(e.clientX-bounds.left)/bounds.width*rect[2],y=rect[1]+(e.clientY-bounds.top)/bounds.height*rect[3],selected=C.view.levels.find(v=>v.id===level);
   const event=s.interactions.find(q=>Math.abs(q.point.x-x)<9&&Math.abs(q.point.y-y)<10&&(!selected.yRange||q.point.y>=selected.yRange[0]&&q.point.y<=selected.yRange[1])&&!selected.plot);if(event)act(()=>event.status==='active'?E.progressInteraction(s,event.id,C):E.claimInteraction(s,event.id,C));};
  canvas.onpointercancel=()=>{pointer=null;};canvas.onwheel=e=>{e.preventDefault();zoom(e.deltaY<0?.25:-.25);};canvas.onkeydown=e=>{if(['ArrowLeft','ArrowRight','+','-','Home'].includes(e.key)){e.preventDefault();if(e.key==='ArrowLeft')pan(-32);if(e.key==='ArrowRight')pan(32);if(e.key==='+')zoom(.25);if(e.key==='-')zoom(-.25);if(e.key==='Home')setView(level);}};
  const tabs=[...document.querySelectorAll('[data-tab]')];for(const [i,tab]of tabs.entries()){tab.onclick=()=>setTab(tab.dataset.tab);tab.onkeydown=e=>{let n;if(e.key==='ArrowRight')n=(i+1)%tabs.length;if(e.key==='ArrowLeft')n=(i+tabs.length-1)%tabs.length;if(e.key==='Home')n=0;if(e.key==='End')n=tabs.length-1;if(n!==undefined){e.preventDefault();setTab(tabs[n].dataset.tab,true);}};}
  for(const b of document.querySelectorAll('[data-close]'))b.onclick=()=>$(b.dataset.close).close();
  for(const [id,dialog]of [['open-help','help-dialog'],['open-settings','settings-dialog'],['open-debug','debug-dialog']])$(id).onclick=()=>{if(dialog==='debug-dialog'){if(s)$('debug-amount').value=E.inventory(s,C,false)[$('debug-material').value];updateDebug();}$(dialog).showModal();};
  $('pause').onclick=()=>act(()=>{s.paused=!s.paused;});$('resume-town').onclick=()=>act(()=>{s.paused=false;});
  $('speed').onchange=()=>act(()=>{s.multiplier=Number($('speed').value);});$('priority').onchange=()=>act(()=>{s.gatherPriority=$('priority').value;});
  $('preview-project').onclick=showPreview;$('close-preview').onclick=()=>$('project-dialog').close();
  $('cancel-project').onclick=()=>act(()=>toast(E.cancelProject(s,C)?'工程已取消，原住处安排已恢复。':s.message||'已经动工，只能暂停或继续。'));
  $('start-project').onclick=()=>act(()=>{const choices=Object.fromEntries([...$('moving-choices').querySelectorAll('select')].map(sel=>[sel.dataset.pet,sel.value]));const paused=s.paused;s.paused=false;if(E.startProject(s,C,choices)){$('project-dialog').close();toast('已开工，小伙伴会自动准备材料和施工。');}else{s.paused=paused;text('preview-error',s.message);}});
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
 // A fixed desktop game surface; smaller hosts scale the whole interface uniformly.
 function fitGame(){
  if(document.documentElement.clientWidth<800){document.documentElement.style.setProperty('--game-scale','1');const viewport=document.querySelector('.game-viewport');viewport.style.width='100%';viewport.style.height='auto';return;}
  const scale=Math.min(1,document.documentElement.clientWidth/1280,document.documentElement.clientHeight/720);
  document.documentElement.style.setProperty('--game-scale',String(scale));
  const viewport=document.querySelector('.game-viewport');
  viewport.style.width=1280*scale+'px';viewport.style.height=720*scale+'px';
 }
 fitGame();window.addEventListener('resize',fitGame);
 setup();refresh();
 if(navigator.locks){navigator.locks.request(key+':writer',{ifAvailable:true},async lock=>{owner=!!lock;await restore();if(lock)await new Promise(resolve=>{releaseLock=resolve;});}).catch(e=>{text('ownership-banner','无法获得小镇写入锁：'+e.message);$('ownership-banner').hidden=false;});}
 else{owner=false;restore();text('ownership-banner','浏览器不支持安全多标签页锁，请使用支持 Web Locks 的浏览器。');$('ownership-banner').hidden=false;}
 document.addEventListener('visibilitychange',()=>{capture();persist();if(!document.hidden)refresh();});window.addEventListener('pagehide',()=>{capture();persist();owner=false;if(releaseLock)releaseLock();});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 function frame(now){capture();if(s&&!document.hidden){if(owner&&ready&&!busy&&s.time-lastSave>=3)persist();if(now-lastUI>150){refresh();lastUI=now;}}requestAnimationFrame(frame);}requestAnimationFrame(frame);
 root.TownGrowthApp={get state(){return s;},config:C,refresh,save:persist,get view(){return level;},get camera(){return camera;},get owner(){return owner;},get ready(){return ready;},get catchingUp(){return busy||clock.debt>=T.STEP;},get debugBusy(){return busy;}};
})(globalThis);
