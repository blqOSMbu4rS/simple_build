(function(){
  'use strict';
  const replaces=(p,id)=>[].concat(p.replaces||[]).includes(id);
  const E=TownEngine,R=TownCutawayRenderer,$=id=>document.getElementById(id),KEY='desktop-build-cutaway-study-v1';
  const plans=E.BLUEPRINTS.filter(p=>p.residential&&p.gridBuild&&!E.BLUEPRINTS.some(q=>replaces(q,p.id))&&!['cutaway-window-cottage-v1','cutaway-window-cottage-v2','cutaway-creek-shelter-v1','cutaway-creek-shelter-v2','cutaway-creek-shelter-v3','cutaway-creek-shelter-v4'].includes(p.sourcePlanId));let state=E.create(42),selected=Math.max(0,plans.findIndex(p=>p.construction?.experience)),clock=0,lastSave=0,weather=null,sceneryClock=0,atmospherePaused=false;
  let muted=false,devSpeed=1,loadError=false,selectedLevel=null,levelPlan=null;
  const sound=TownExperienceUI.audio();
  try{const saved=localStorage.getItem(KEY);if(saved){const data=JSON.parse(saved);state=E.restore(data.state);muted=data.muted===true;selectedLevel=typeof data.selectedLevel==='string'?data.selectedLevel:null;weather=TownCutawayWeather.modes.includes(data.weather)?data.weather:null;sceneryClock=Number.isFinite(data.sceneryClock)&&data.sceneryClock>=0?data.sceneryClock:state.time;atmospherePaused=data.atmospherePaused===true;selected=Math.max(0,plans.findIndex(p=>p.id===data.selected||replaces(p,data.selected)||p.sourcePlanId===data.selected||(/^cutaway-creek-shelter-v[1234]/.test(String(data.selected))&&p.sourcePlanId==='cutaway-creek-shelter-v5')));if(state.status==='building'||state.status==='finishing'||state.status==='waiting')state.paused=true;}}
  catch(err){console.warn('2D study restore:',err);loadError=true;state=E.create(42);}
  if(state.status==='idle')state.blueprint=plans[selected].id;
  if(state.speed>2){devSpeed=state.speed;state.speed=1;}
  sound.mute(muted);
  // Account for elapsed time before applying a control; catch-up cannot be reinterpreted by a later setting.
  const timer=TownSessionClock.create(performance.now());let catching=false,eventSeq=state.experience?.sequence||0,feedbackUntil=0;
  const running=()=>!state.paused&&['building','waiting','finishing'].includes(state.status);
  function capture(){const dt=TownSessionClock.capture(timer,performance.now(),running(),devSpeed*(state.experience?1:state.speed));clock+=dt;if(!state.paused&&!atmospherePaused)sceneryClock+=dt;return dt;}
  function settle(){capture();catching=TownSessionClock.pump(timer,state,E);return !catching;}
  document.addEventListener('click',event=>{if(catching||!settle()){event.preventDefault();event.stopImmediatePropagation();return;}if(!muted&&!document.hidden)sound.unlock();},true);
  document.addEventListener('change',event=>{if(catching||!settle()){event.stopImmediatePropagation();update();}},true);
  // Camera belongs to this view, never to the construction state or saved plan.
  const scene=$('scene');let camera=null,drag=null,lastPaint=null;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function worldSize(){return (state.plan||plans[selected]).construction?.view?.worldSize||[480,304];}
  function setCamera(x,y,w,h){
    const [ww,wh]=worldSize();w=clamp(w,ww/6,ww);h=clamp(h,wh/6,wh);
    camera=[clamp(x,0,ww-w),clamp(y,0,wh-h),w,h];
  }
  function endDrag(){
    if(drag&&scene.hasPointerCapture(drag.id))scene.releasePointerCapture(drag.id);
    drag=null;scene.classList.remove('dragging');
  }
  function resetView(){endDrag();camera=(state.plan||plans[selected]).construction?.view?.levels?.find(a=>a.id===selectedLevel)?.camera?.slice()||null;}
  function updateLevels(plan){
    const levels=plan.construction?.view?.levels||[],nav=$('floor-controls');nav.hidden=!levels.length;
    if(levelPlan!==plan.id){
      levelPlan=plan.id;
      if(!levels.some(a=>a.id===selectedLevel))selectedLevel=null;
      nav.replaceChildren();
      for(const a of [{id:null,label:'总览',name:'完整场景'},...levels]){
        const b=document.createElement('button');b.type='button';b.dataset.level=a.id||'';
        b.textContent=a.label;b.title=a.name;b.setAttribute('aria-label',a.label+' · '+a.name);
        b.onclick=()=>{selectedLevel=a.id;resetView();update();persist();};nav.append(b);
      }
    }
    for(const b of nav.children)b.setAttribute('aria-pressed',String((b.dataset.level||null)===selectedLevel));
    const floor=levels.find(a=>a.id===selectedLevel),items=plan.parts.filter(p=>!floor||p.view?.level===floor.id),done=new Set(state.installed.map(p=>p.id));
    const [ww,wh]=worldSize(),aspect=floor?.camera?floor.camera[2]/floor.camera[3]:ww/wh;
    const height=Math.round(scene.width/aspect);if(scene.height!==height)scene.height=height;
    scene.style.imageRendering=plan.construction?.view?.worldSize?'auto':'pixelated';
    const fit=plan.construction?.view?.fitViewport;
    scene.style.maxWidth=fit&&(!floor||plan.construction.view.sectionMode==='horizontal')?'calc(max(240px, 100dvh - 200px) * '+aspect+')':'';
    scene.style.marginInline=fit?'auto':'';
    $('floor-status').hidden=!levels.length;
    $('floor-status').textContent=(floor?floor.label+' · '+floor.name:'总览 · 全部楼层')+' · '+items.filter(p=>done.has(p.id)).length+'/'+items.length;
    if(floor&&state.active&&state.active.part.view.level!==floor.id)$('floor-status').textContent+=' · 正在其他楼层施工';
  }
  scene.addEventListener('pointerdown',event=>{
    if(event.button!==0||drag)return;
    const view=R.viewport(state,false,camera);
    if(!settle())return;
    if(!muted)sound.unlock();drag={id:event.pointerId,x:event.clientX,y:event.clientY,view:[...view],moved:false};
    scene.setPointerCapture(event.pointerId);scene.classList.add('dragging');event.preventDefault();
  });
  scene.addEventListener('pointermove',event=>{
    if(!drag||drag.id!==event.pointerId)return;
    if(Math.hypot(event.clientX-drag.x,event.clientY-drag.y)>6)drag.moved=true;
    if(!drag.moved)return;
    const rect=scene.getBoundingClientRect(),[x,y,w,h]=drag.view;
    setCamera(x-(event.clientX-drag.x)*w/rect.width,y-(event.clientY-drag.y)*h/rect.height,w,h);
  });
  for(const type of ['pointerup','pointercancel','lostpointercapture'])scene.addEventListener(type,event=>{
    if(drag?.id===event.pointerId){
      if(type==='pointerup'&&!drag.moved&&!catching){
        const rect=scene.getBoundingClientRect(),[x,y,w,h]=drag.view;
        const point=[x+(event.clientX-rect.left)*w/rect.width,y+(event.clientY-rect.top)*h/rect.height];
        const resource=TownExperienceUI.hit(TownConstructionConfig.site(state.plan).view.resources,point);
        if((selectedLevel===null||selectedLevel===state.plan?.construction.view.surfaceLevel)&&resource&&TownWildGather.manual(state,resource.kind,resource.source)){update();persist();}
      }endDrag();
    }
  });
  window.addEventListener('blur',endDrag);
  scene.addEventListener('wheel',event=>{
    event.preventDefault();endDrag();
    const rect=scene.getBoundingClientRect(),[x,y,w,h]=R.viewport(state,false,camera);
    const px=clamp((event.clientX-rect.left)/rect.width,0,1),py=clamp((event.clientY-rect.top)/rect.height,0,1);
    const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?rect.height:1);
    const [ww,wh]=worldSize(),factor=clamp(Math.exp(clamp(delta,-1000,1000)*.0015),Math.max(ww/6/w,wh/6/h),Math.min(ww/w,wh/h));
    setCamera(x+px*w*(1-factor),y+py*h*(1-factor),w*factor,h*factor);
  },{passive:false});
  $('reset-view').onclick=resetView;
  function persist(){if(loadError)return;try{localStorage.setItem(KEY,JSON.stringify({selected:plans[selected].id,state:E.store(state),weather,sceneryClock,atmospherePaused,muted,selectedLevel}));lastSave=clock;}catch(err){$('status').textContent='自动保存不可用';console.warn(err);}}
  function update(){
    const plan=state.plan||plans[selected],inv=E.inventory(state);
    updateLevels(plan);
    document.querySelectorAll('.card').forEach((el,i)=>{el.setAttribute('aria-pressed',String(i===selected));el.disabled=state.status!=='idle';});
    $('title').textContent=(state.plan?'正在建造：':'准备建造：')+plan.name;
    $('progress').textContent=`${state.installed.length} / ${state.plan?.parts.length||plan.parts.length} ${plan.wholeTimber?'件':'块'}`;
    const action=TownCutawayMotion.accepts(state.active)?TownCutawayMotion.sample(state.active):null;
    const actionLabels={descend:'返回料堆',fetch:'前往料堆',pickup:'拿起一块材料',carry:'搬运一块材料',climb:'搬往施工点',deliver:'放下材料',install:'敲打建造中',reveal:'烟雾散去，方块完成',
      'team-pickup':'两人握住圆木两端','team-carry':'两人合抬圆木到墙下',stage:'在墙下放稳圆木',lift:'两人从地面抬升圆木',align:'对齐并固定原木墙',
      'to-mix':'把泥料送到前景和泥盆',mix:'在和泥盆搅拌泥料','load-mud':'装好一桶湿泥',seal:'用泥抹封圆木之间的缝隙',approach:'走向开挖入口',enter:'进入山体作业点',excavate:'挥镐挖开山体'};
    const mudLabels={carry:'提泥桶到墙边',climb:'把湿泥送到上层墙缝',deliver:'放好泥桶',reveal:'这段圆木墙缝已封好'};
    $('message').textContent=action?(state.paused?'已暂停 · ':'')+(action.mud&&mudLabels[action.phase]||actionLabels[action.phase])+' · '+state.active.part.label+(action.excavating?' · 不消耗建材':' · 已送达 '+action.delivered+'/'+state.active.materialIds.length):state.message;
    $('cost').textContent='总用料 '+Object.entries(plan.costs).filter(([,n])=>n).map(([k,n])=>`${E.LABELS[k]} ${n}`).join(' · ')+(state.missing?' · 当前缺 '+Object.entries(state.missing.amounts).map(([k,n])=>`${E.LABELS[k]} ${n}`).join('、'):'');
    for(const k of E.MATERIAL_KINDS)$('stock-'+k).textContent=inv.free[k]+inv.reserved[k];
    $('play').textContent=state.status==='done'?'下一块空地 →':state.paused?'继续建造 ▶':state.status==='building'||state.status==='finishing'?'暂停 Ⅱ':state.status==='waiting'?(TownConstructionConfig.site(state.plan).gathering?'暂停采集 Ⅱ':'等待材料 · 继续'):'开始建造 ▶';
    $('speed').value=String(state.experience?.multiplier||state.speed);
    $('dev-speed').value=String(devSpeed);
    $('speed').querySelector('[value="2"]').disabled=!TownConstructionConfig.site(plan).experience;
    $('mute').textContent=muted?'开启声音':'静音';$('mute').setAttribute('aria-pressed',String(muted));
    $('weather').value=TownCutawayWeather.mode(state,weather);
    $('atmosphere-pause').textContent=atmospherePaused?'继续氛围':'暂停氛围';
    $('atmosphere-pause').setAttribute('aria-pressed',String(atmospherePaused));
    const wild=!!TownConstructionConfig.site(plan).gathering,g=state.wilderness,pose=TownWildGather.sample(g);
    const materialParent=wild?$('developer-buttons'):$('gather-controls');if($('materials').parentElement!==materialParent)materialParent.prepend($('materials'));
    document.querySelectorAll('[data-material]').forEach(b=>{b.hidden=!(plan.costs[b.dataset.material]>0)||(wild&&TownWildGather.kinds.includes(b.dataset.material));});
    document.querySelectorAll('[data-gather]').forEach(b=>{b.hidden=!wild||!(plan.costs[b.dataset.gather]>0);b.disabled=!g||state.status==='done'||state.paused;});
    $('auto-gather').hidden=!wild;$('auto-gather').disabled=!g||state.status==='done';
    $('auto-gather').textContent='自动采集：'+(g?.auto===false?'关':'开');
    $('fill').textContent=wild?'按需自动取材':'补足这座房子的用料';
    $('supply-heading').textContent=wild?'02 / 就地取材，一点点搭建':'02 / 撒材料，看它们搭建';
    $('supply-hint').textContent=wild?'开工后自动采集；也可关闭自动，逐次指定取材':'缺料时现场会保留，补齐后继续';
    const phases={descend:'返回地面',source:'前往材料来源',chop:pose?.team?'两人合作砍树':'砍伐取木',fell:'退开，树木倒下',trim:'修枝整理倒木',cut:pose?.team?'两人拉锯截取圆木':'截成短木',
      'collect-stone':'收集石料','collect-branch':'整理树枝与干草',dig:'挖取泥土',water:'前往水源提水',
      'fill-water':'装水', 'return-water':'把水提回和泥盆',mix:'搅拌和泥','gather-carry':'搬回料堆',stock:'放好一份材料',
      pickup:'拿起截好的木料','team-pickup':'两人抬起截好的圆木','team-carry':'两人把圆木搬回料堆'};
    $('gather-status').hidden=!wild;
    $('gather-status').textContent=(state.paused?'已暂停 · ':'')+(pose?phases[pose.phase]:g?(state.status==='done'?'取材建造完成':'采集待命'):'开工后开始取材')+' · 库存 '+['W','S','B','D'].map(k=>E.LABELS[k]+' '+(inv.free[k]+inv.reserved[k])).join(' / ');
    const exp=TownConstructionConfig.site(plan).experience,manual=g?.feed?.manual;
    if(exp){
      $('auto-gather').hidden=true;
      $('supply-heading').textContent='02 / 安心观看，偶尔搭把手';
      $('supply-hint').textContent='正常施工自动供料 · 点选树木或石头可帮助双倍施工';
      document.querySelectorAll('[data-gather]').forEach(b=>{b.hidden=!TownConstructionConfig.site(plan).gathering.supply.manual[b.dataset.gather];b.disabled=!g||state.status==='done'||state.paused||!!manual||catching;});
      if(manual)$('gather-status').textContent+=' · 采集中 '+Math.floor(manual.elapsed/manual.seconds*100)+'%';
    }
    $('cancel-gather').hidden=!manual;$('cancel-gather').disabled=catching;

    $('status').textContent=state.plan&&plans.some(p=>replaces(p,state.plan.id))?'旧版现场 · 重新开始或下一块空地使用新版':['cutaway-window-cottage-v1','cutaway-window-cottage-v2'].includes(state.plan?.sourcePlanId)?'旧版书屋 · 重新开始或下一块空地使用新版':state.plan&&!state.plan.residential?'旧版进度 · 重新开始可使用新版住宅':state.status==='done'?'房子完工了':state.status==='waiting'?'等待材料':state.paused?'施工暂停':'本地自动存档';
    if(catching)$('status').textContent='正在推进离开期间的建造…';
    else if(state.experience&&state.status==='waiting'&&!state.paused)$('status').textContent='材料正在送来';
    $('play').disabled=loadError;
    if(loadError)$('status').textContent='存档未能读取，原记录已保留；重新开始会先备份原记录';
  }
  for(const [i,p]of plans.entries()){
    const button=document.createElement('button');button.type='button';button.className='card';button.setAttribute('aria-label','选择'+p.name);
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=304;
    if(p.construction?.view?.worldSize){const [w,h]=p.construction.view.worldSize;canvas.height=Math.round(480*h/w);canvas.style.aspectRatio=w+'/'+h;canvas.style.imageRendering='auto';}
    const title=document.createElement('strong');title.textContent=p.name;
    const desc=document.createElement('small');desc.textContent=p.description;
    button.append(canvas,title,desc);$('plans').append(button);
    R.draw(canvas,{...state,plan:p,installed:p.parts},0,true);
    button.onclick=()=>{if(state.status!=='idle')return;selected=i;selectedLevel=null;state.blueprint=p.id;if(!TownConstructionConfig.site(p).experience)state.speed=1;resetView();update();persist();};
  }
  Promise.all([TownCottageArt.ensure(state.plan||plans[selected]),TownWildernessArt.ensure(state.plan||plans[selected]),TownDiagonalRenderer.ensure(state.plan||plans[selected])]).then(()=>{
    document.querySelectorAll('.card canvas').forEach((canvas,i)=>R.draw(canvas,{...state,plan:plans[i],installed:plans[i].parts},0,true));
  });
  // Large scene assets load when their card enters view, or when the scene is selected.
  const cardObserver=new IntersectionObserver(entries=>{for(const entry of entries)if(entry.isIntersecting){
    const index=Number(entry.target.dataset.planIndex),p=plans[index];cardObserver.unobserve(entry.target);
    TownDiagonalRenderer.ensure(p).then(()=>R.draw(entry.target.querySelector('canvas'),{...state,plan:p,installed:p.parts},0,true));
  }},{rootMargin:'100px'});
  document.querySelectorAll('.card').forEach((card,index)=>{card.dataset.planIndex=index;cardObserver.observe(card);});
  for(const button of document.querySelectorAll('[data-material]'))button.onclick=()=>{E.addMaterials(state,button.dataset.material,{W:8,S:6,C:2}[button.dataset.material]);update();persist();};
  document.querySelectorAll('[data-gather]').forEach(b=>b.onclick=()=>{if(state.experience)TownWildGather.manual(state,b.dataset.gather);else TownWildGather.request(state,b.dataset.gather);update();persist();});
  $('cancel-gather').onclick=()=>{TownWildGather.cancel(state);update();persist();};
  $('auto-gather').onclick=()=>{if(state.wilderness)state.wilderness.auto=!state.wilderness.auto;update();persist();};
  $('fill').onclick=()=>{
    if(state.status==='done')return;
    if(TownConstructionConfig.site(state.plan||plans[selected]).gathering&&!state.experience){if(!state.plan)E.start(state);state.wilderness.auto=true;update();persist();return;}
    const plan=state.plan||plans[selected],inv=E.inventory(state);
    for(const k of E.MATERIAL_KINDS){
      const committed=state.installed.reduce((n,p)=>n+(p.cost[k]||0),0)+(state.active?.part.cost[k]||0);
      let need=plan.costs[k]-committed-inv.free[k]-inv.reserved[k];
      while(need>0){const n=Math.min(100,need,240-state.materials.filter(m=>m.kind===k&&m.state!=='installed').length);if(n<=0||!E.addMaterials(state,k,n))break;need-=n;}
    }
    update();persist();
  };
  $('play').onclick=()=>{
    if(state.status==='done'){E.next(state);eventSeq=0;state.blueprint=plans[selected].id;resetView();}
    else if(state.status==='building'||state.status==='finishing')state.paused=!state.paused;
    else if(state.status==='waiting'){state.paused=TownConstructionConfig.site(state.plan).gathering?!state.paused:false;}
    else{state.blueprint=plans[selected].id;E.start(state);}
    update();persist();
  };
  $('weather').onchange=()=>{weather=$('weather').value;update();persist();};
  $('atmosphere-pause').onclick=()=>{atmospherePaused=!atmospherePaused;update();persist();};
  $('speed').onchange=()=>{E.setMultiplier(state,Number($('speed').value));update();persist();};
  $('dev-speed').onchange=()=>{devSpeed=Number($('dev-speed').value);};
  $('mute').onclick=()=>{muted=!muted;sound.mute(muted);if(!muted)sound.unlock();update();persist();};
  $('reset').onclick=()=>{if(loadError){try{localStorage.setItem(KEY+'-unreadable-'+Date.now(),localStorage.getItem(KEY));loadError=false;}catch(err){$('status').textContent='原存档备份失败，尚未覆盖';return;}}state=E.create(42);state.blueprint=plans[selected].id;eventSeq=0;timer.debt=0;resetView();update();persist();};
  let ui=0,frameId=0;
  function schedule(){if(!frameId&&!document.hidden)frameId=requestAnimationFrame(frame);}
  function frame(now){
    frameId=0;
    if(!document.hidden){const elapsed=capture();
      const previousStatus=state.status;
      const wasCatching=catching;
      try{catching=TownSessionClock.pump(timer,state,E);}catch(err){state.paused=true;timer.debt=0;state.message='施工暂停：'+err.message;console.error(err);}
      const events=state.experience?.events.filter(e=>e.seq>eventSeq)||[];eventSeq=state.experience?.sequence||0;
      if(!wasCatching&&!catching)for(const e of events){if(!state.paused&&devSpeed===1)sound.play(e.type);if(e.text){$('feedback').textContent=e.text;$('feedback').hidden=false;feedbackUntil=now+4500;}}
      if(now>feedbackUntil)$('feedback').hidden=true;
      const paintKey=[state.time,sceneryClock,state.installed.length,state.materials.length,state.active?.id,state.active?.elapsed,state.building,selected,selectedLevel,weather,scene.width,scene.height,camera?.join(','),TownCottageArt.revision,TownWildernessArt.revision,TownDiagonalRenderer.revision].join('|');
      if(!(state.plan||plans[selected]).construction?.view?.renderOnChange||paintKey!==lastPaint){
        R.draw(scene,state,sceneryClock,false,camera,weather,selectedLevel);lastPaint=paintKey;
        scene.dataset.viewport=JSON.stringify(R.viewport(state,false,camera));
        if(state.experience&&state.status!=='done'&&(selectedLevel===null||selectedLevel===state.plan.construction.view.surfaceLevel))TownExperienceUI.markers(scene,TownConstructionConfig.site(state.plan).view.resources,R.viewport(state,false,camera),state.wilderness?.feed?.manual);
      }
      ui+=elapsed;if(ui>.14){update();ui=0;}
      if(clock-lastSave>4||(state.status==='done'&&previousStatus!=='done'))persist();
      if(wasCatching&&!catching){update();persist();}
    }schedule();
  }
  document.addEventListener('visibilitychange',()=>{capture();if(document.hidden){cancelAnimationFrame(frameId);frameId=0;sound.suspend();persist();}else{catching=timer.debt>=1/30;eventSeq=state.experience?.sequence||0;sound.wake();schedule();}});
  window.addEventListener('pagehide',()=>{capture();TownSessionClock.pump(timer,state,E);persist();});
  state.blueprint=state.plan?.id||plans[selected].id;update();resetView();schedule();
})();
