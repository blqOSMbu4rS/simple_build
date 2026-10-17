(function(root){
 'use strict';
 const E=root.TownGrowthEngine,C=root.TownGrowthConfig.create(),R=root.TownGrowthRenderer,T=root.TownSessionClock,$=id=>document.getElementById(id),key=E.SAVE_KEY;
 let s=null,raw=null,level='all',loadError=null,lastSave=0,lastUI=0,saveError='',debugSpeed=1;
 const clock=T.create(performance.now()),canvas=$('town-scene');
 const names={preparing:'安排搬迁与设施停工',work:'逐件施工',settling:'居民入住验收',production:'生产',install:'搬运安装',dismantle:'拆解回收',move:'完整搬出家具',reuse:'复用家具',relocate:'搬迁中'};
 const formatCost=a=>Object.entries(a).filter(([,n])=>n).map(([k,n])=>C.materials[k]+' '+n).join('、')||'无';
 const roomName=home=>{const b=C.beds.find(b=>b.id===home);return b?C.rooms.find(r=>r.id===b.room).name+(b.temporary?' · 临时铺位':''):'尚未入住';};
 function restore(){try{raw=localStorage.getItem(key);s=raw?E.restore(raw,C):E.create(C);if(raw)s.paused=true;loadError=null;}catch(e){loadError=e.message;s=null;$('load-error-text').textContent=e.message;}$('load-error').hidden=!loadError;}
 function persist(){if(!s||loadError)return false;try{localStorage.setItem(key,E.save(s,C));lastSave=s.time;saveError='';return true;}catch(e){saveError='保存失败：'+e.message;return false;}}
 function capture(){T.capture(clock,performance.now(),!!s&&!s.paused,debugSpeed);if(s)T.pump(clock,s,{advance:(state,dt)=>E.advance(state,dt,C)},240);}
 function act(f){capture();if(!s||clock.debt>=T.STEP)return;f();persist();refresh();}
 function download(text,name){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:'application/json'}));a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
 function restart(){if(!confirm('将原记录另存备份，再开始一个新小镇？旧版建造的记录不受影响。'))return;
  try{const original=localStorage.getItem(key);if(original!==null)localStorage.setItem(key+':backup:'+Date.now(),original);const next=E.create(C);localStorage.setItem(key,E.save(next,C));s=next;loadError=null;raw=null;clock.debt=0;clock.previous=performance.now();$('load-error').hidden=true;refresh();}catch(e){$('load-error').hidden=false;$('load-error-text').textContent='未能备份，未覆盖原记录：'+e.message;}}
 function listParts(ids){const counts={};for(const id of ids){const p=C.parts.find(p=>p.id===id),name=p.group?C.groups.find(g=>g.id===p.group).label:R.names[p.kind];counts[name]=(counts[name]||0)+1;}return Object.entries(counts).map(([n,count])=>n+' × '+count+' 格').join('，')||'无';}
 function showPreview(){capture();if(!s||s.project||clock.debt>=T.STEP)return;const p=E.preview(s,C);if(!p)return;
  $('preview-title').textContent=p.plan.name;$('preview-description').textContent=p.plan.description;$('diff-retained').textContent=listParts(p.retained);
  $('diff-moved').textContent=[...p.moved.map(id=>'搬出'+C.groups.find(g=>g.id===id).label),...p.reused.map(id=>'复用'+C.groups.find(g=>g.id===id).label)].join('；')||'无';
  $('diff-removed').textContent=listParts(p.removed);$('diff-added').textContent=listParts(p.added);$('preview-cost').textContent='新增用料：'+formatCost(p.cost)+'。当前可用：'+formatCost(E.inventory(s,C));$('preview-recovery').textContent='任务完成后预计回收：'+formatCost(p.recovery)+'；完整搬移家具不同时回收材料。';
  $('impact').textContent=p.plan.disable.length?'临时停用：'+p.plan.disable.map(id=>C.rooms.find(r=>r.id===id).name).join('、')+'。当前批次先交付，其余空间继续生产。':'本工程不需要停用已有房间。';
  $('moving-choices').replaceChildren();for(const move of p.moves||[]){const row=document.createElement('label');row.className='moving-row';row.textContent=C.pets.find(p=>p.id===move.pet).name+'临时搬至';const sel=document.createElement('select');sel.dataset.pet=move.pet;
   for(const b of C.beds.filter(b=>!b.permanent&&!p.plan.disable.includes(b.room)&&E.bedAvailable(s,b,C)&&!s.pets.some(p=>p.home===b.id))){const o=document.createElement('option');o.value=b.id;o.textContent=roomName(b.id)+' · '+(C.beds.indexOf(b)+1);sel.append(o);}sel.value=move.bed;row.append(sel);$('moving-choices').append(row);}
  $('preview-error').textContent=p.error||'';$('start-project').disabled=!!p.error||s.paused;$('project-dialog').showModal();
 }
 function updateResidents(){
  const parent=$('residents');if(!parent.children.length)for(const def of C.pets){const row=document.createElement('div');row.className='resident';row.dataset.pet=def.id;const mark=document.createElement('span');mark.className='pet-mark';mark.style.setProperty('--pet',def.color);const info=document.createElement('div');info.innerHTML='<strong></strong><p class="home"></p><p class="activity"></p><details><summary>安排住处</summary><select aria-label="分配床位"></select></details>';info.querySelector('strong').textContent=def.name;row.append(mark,info);parent.append(row);}
  for(const row of parent.children){const pet=s.pets.find(p=>p.id===row.dataset.pet),def=C.pets.find(p=>p.id===pet.id),a=pet.action;row.style.opacity=pet.arrived?'1':'.45';row.querySelector('.home').textContent=pet.arrived?roomName(pet.home):'小屋建成后到访';
   let text=E.workStatus(s,pet,C);
   if(a)text=a.type==='production'?C.recipes.find(r=>r.id===a.recipe).name+(a.elapsed>=a.workEnd?' · 搬运交付':' · 作业中'):names[a.type];
   if(E.comfort(s,pet,C)>1)text+=' · 住宅效率 +15%';row.querySelector('.activity').textContent=text;
   const select=row.querySelector('select');if(document.activeElement!==select){const opts=C.beds.filter(b=>!b.permanent&&E.bedAvailable(s,b,C)&&!s.pets.some(p=>p!==pet&&(p.home===b.id||p.action?.bed===b.id)));const signature=opts.map(b=>b.id).join('|')+'|'+pet.home;if(select.dataset.signature!==signature){select.replaceChildren();const placeholder=document.createElement('option');placeholder.value='';placeholder.textContent='选择床位';select.append(placeholder);for(const b of opts){const o=document.createElement('option');o.value=b.id;o.textContent=roomName(b.id)+' · '+(C.beds.indexOf(b)+1);select.append(o);}select.value=pet.home||'';select.dataset.signature=signature;}}select.disabled=!!s.project||!!a||!pet.arrived||s.paused||def.capabilities.includes('build');select.onchange=()=>act(()=>E.assignHome(s,pet.id,select.value,C));
  }
  $('resident-count').textContent=s.pets.filter(p=>p.home).length+' / 3';
 }
 function refresh(){
  for(const id of ['pause','preview-project','speed','priority','export-save','new-game','debug-speed'])$(id).disabled=!s;
  if(!s)return;const stock=E.inventory(s,C);for(const k of Object.keys(C.materials))$('stock-'+k).textContent=stock[k];
  $('town-time').textContent='小镇时间 '+Math.floor(s.time/60)+' : '+String(Math.floor(s.time%60)).padStart(2,'0');
  $('pause').textContent=s.paused?'继续小镇':'暂停小镇';$('pause').setAttribute('aria-pressed',String(s.paused));$('speed').value=s.multiplier;$('priority').value=s.gatherPriority;$('debug-speed').value=debugSpeed;
  $('save-status').textContent=saveError||(s.paused?'已暂停 · 进度已保存':'本地自动保存');$('save-status').className=saveError?'save-warning':'';$('message').textContent=s.message;
  const p=s.project,plan=C.plans[s.completed.length],done=!plan;$('chapter-number').textContent=done?'A TOWN OF OUR OWN':'CHAPTER '+String(s.completed.length+1).padStart(2,'0')+' / 05';$('project-title').textContent=done?'小镇开始了日常':plan.name;
  $('objective').textContent=done?'五项工程都已完成。木作、采棉与织布仍在继续。看看住处，或等一等下一批材料。':plan.description;
  $('preview-project').hidden=!!p||done;$('preview-project').disabled=s.paused;$('project-status').textContent=p?names[p.phase]+' · '+p.at+' / '+plan.tasks.length+' 项':done?'本版目标完成 · 生产持续运行':'材料不足也可以开工。';
  $('project-progress').hidden=!p;if(p){$('project-progress').max=plan.tasks.length;$('project-progress').value=p.at;}$('cancel-project').hidden=!p||p.locked;$('cancel-project').disabled=s.paused;
  $('yard-status').textContent='营地料垛：'+s.materials.filter(m=>m.state==='yard').length+' / '+C.yardCapacity+'；拆解回收箱 '+s.materials.filter(m=>m.state==='salvage').length+' / '+C.salvageCapacity+'。可用库存含暂存材料，仓位上限只计算仓内材料。';
  const stored=C.groups.filter(g=>['stored','parked'].includes(s.furniture[g.id].status));$('furniture-status').textContent='完整家具：'+(stored.map(g=>g.label+(s.furniture[g.id].status==='parked'?'（营地）':'（库内）')).join('、')||'暂无')+'；库内容量 '+C.furnitureCapacity+' 件。';
  const sig=stored.map(g=>g.id+s.furniture[g.id].status).join('|');if($('furniture-buttons').dataset.signature!==sig){$('furniture-buttons').replaceChildren();for(const g of stored.filter(g=>s.furniture[g.id].status==='stored')){const b=document.createElement('button');b.textContent='安置'+g.label+'到营地';b.onclick=()=>act(()=>E.parkFurniture(s,g.id,C));$('furniture-buttons').append(b);}$('furniture-buttons').dataset.signature=sig;}
  updateResidents();R.draw(canvas,s,C,level);
 }
 for(const l of C.view.levels){const b=document.createElement('button');b.textContent=l.name;b.dataset.level=l.id;b.setAttribute('aria-pressed',String(l.id===level));b.onclick=()=>{level=l.id;for(const b of $('views').children)b.setAttribute('aria-pressed',String(b.dataset.level===level));refresh();};$('views').append(b);}
 for(const [k,label]of Object.entries(C.materials)){const b=document.createElement('button');b.textContent='转存 4 '+label;b.onclick=()=>act(()=>E.stow(s,k,C));$('stow-buttons').append(b);}
 $('pause').onclick=()=>act(()=>{s.paused=!s.paused;});$('speed').onchange=()=>act(()=>{s.multiplier=Number($('speed').value);});$('priority').onchange=()=>act(()=>{s.gatherPriority=$('priority').value;});
 $('debug-speed').onchange=()=>act(()=>{const rate=Number($('debug-speed').value);debugSpeed=[1,30].includes(rate)?rate:1;});
 $('preview-project').onclick=showPreview;$('close-preview').onclick=()=>{$('project-dialog').close();};$('cancel-project').onclick=()=>act(()=>E.cancelProject(s));
 $('start-project').onclick=()=>act(()=>{const choices=Object.fromEntries([...$('moving-choices').querySelectorAll('select')].map(s=>[s.dataset.pet,s.value]));if(E.startProject(s,C,choices)){$('project-dialog').close();}else $('preview-error').textContent=s.message;});
 $('export-save').onclick=()=>{capture();if(s)download(E.save(s,C),'little-town.json');};$('export-original').onclick=()=>download(raw||'','little-town-unreadable.json');$('new-game').onclick=restart;$('backup-restart').onclick=restart;
 document.addEventListener('visibilitychange',()=>{capture();persist();if(!document.hidden)refresh();});window.addEventListener('pagehide',()=>{capture();persist();});
 restore();refresh();
 function frame(now){capture();if(s&&!document.hidden){if(s.time-lastSave>=3)persist();if(now-lastUI>120){refresh();lastUI=now;}}requestAnimationFrame(frame);}requestAnimationFrame(frame);
 // Read-only handles for deterministic browser QA; no material injection or offline clock.
 root.TownGrowthApp={get state(){return s;},config:C,refresh,save:persist,get view(){return level;},get catchingUp(){return clock.debt>=T.STEP;}};
})(globalThis);
