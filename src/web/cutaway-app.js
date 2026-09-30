(function(){
  'use strict';
  const E=TownEngine,R=TownCutawayRenderer,$=id=>document.getElementById(id),KEY='desktop-build-cutaway-study-v1';
  const plans=E.BLUEPRINTS.filter(p=>p.residential&&p.gridBuild&&!['cutaway-window-cottage-v1','cutaway-window-cottage-v2'].includes(p.sourcePlanId));let state=E.create(42),selected=0,clock=0,lastSave=0;
  try{const saved=localStorage.getItem(KEY);if(saved){const data=JSON.parse(saved);state=E.restore(data.state);selected=Math.max(0,plans.findIndex(p=>p.id===data.selected||p.sourcePlanId===data.selected));if(state.status==='building'||state.status==='finishing')state.paused=true;}}
  catch(err){console.warn('2D study restore:',err);state=E.create(42);}
  if(state.status==='idle')state.blueprint=plans[selected].id;
  function persist(){try{localStorage.setItem(KEY,JSON.stringify({selected:plans[selected].id,state:E.save(state)}));lastSave=clock;}catch(err){$('status').textContent='自动保存不可用';console.warn(err);}}
  function update(){
    const plan=state.plan||plans[selected],inv=E.inventory(state);
    document.querySelectorAll('.card').forEach((el,i)=>{el.setAttribute('aria-pressed',String(i===selected));el.disabled=state.status!=='idle';});
    $('title').textContent=(state.plan?'正在建造：':'准备建造：')+plan.name;
    $('progress').textContent=`${state.installed.length} / ${state.plan?.parts.length||plan.parts.length} 块`;
    const action=state.active?.motion===TownCutawayMotion.VERSION?TownCutawayMotion.sample(state.active):null;
    const actionLabels={descend:'返回料堆',fetch:'前往料堆',pickup:'拿起一块材料',carry:'搬运一块材料',climb:'搬往高处施工点',deliver:'放下材料',install:'敲打建造中',reveal:'烟雾散去，方块完成'};
    $('message').textContent=action?(state.paused?'已暂停 · ':'')+actionLabels[action.phase]+' · '+state.active.part.label+' · 已送达 '+action.delivered+'/'+state.active.materialIds.length:state.message;
    $('cost').textContent='总用料 '+Object.entries(plan.costs).filter(([,n])=>n).map(([k,n])=>`${E.LABELS[k]} ${n}`).join(' · ')+(state.missing?' · 当前缺 '+Object.entries(state.missing.amounts).map(([k,n])=>`${E.LABELS[k]} ${n}`).join('、'):'');
    for(const k of E.KINDS)$('stock-'+k).textContent=inv.free[k]+inv.reserved[k];
    $('play').textContent=state.status==='done'?'下一块空地 →':state.paused?'继续建造 ▶':state.status==='building'||state.status==='finishing'?'暂停 Ⅱ':state.status==='waiting'?'等待材料 · 继续':'开始建造 ▶';
    $('speed').value=String(state.speed);
    $('status').textContent=['cutaway-window-cottage-v1','cutaway-window-cottage-v2'].includes(state.plan?.sourcePlanId)?'旧版书屋 · 重新开始或下一块空地使用新版':state.plan&&!state.plan.residential?'旧版进度 · 重新开始可使用新版住宅':state.status==='done'?'房子完工了':state.status==='waiting'?'等待材料':state.paused?'施工暂停':'本地自动存档';
  }
  for(const [i,p]of plans.entries()){
    const button=document.createElement('button');button.type='button';button.className='card';button.setAttribute('aria-label','选择'+p.name);
    const canvas=document.createElement('canvas');canvas.width=480;canvas.height=304;
    const title=document.createElement('strong');title.textContent=p.name;
    const desc=document.createElement('small');desc.textContent=p.description;
    button.append(canvas,title,desc);$('plans').append(button);
    R.draw(canvas,{...state,plan:p,installed:p.parts},0,true);
    button.onclick=()=>{if(state.status!=='idle')return;selected=i;state.blueprint=p.id;update();persist();};
  }
  TownCottageArt.ready?.then(()=>{
    document.querySelectorAll('.card canvas').forEach((canvas,i)=>R.draw(canvas,{...state,plan:plans[i],installed:plans[i].parts},0,true));
  });
  for(const button of document.querySelectorAll('[data-material]'))button.onclick=()=>{E.addMaterials(state,button.dataset.material,{W:8,S:6,C:2}[button.dataset.material]);update();persist();};
  $('fill').onclick=()=>{
    if(state.status==='done')return;
    const plan=state.plan||plans[selected],inv=E.inventory(state);
    for(const k of E.KINDS){
      const committed=state.installed.reduce((n,p)=>n+(p.cost[k]||0),0)+(state.active?.part.cost[k]||0);
      let need=plan.costs[k]-committed-inv.free[k]-inv.reserved[k];
      while(need>0){const n=Math.min(100,need,240-state.materials.filter(m=>m.kind===k&&m.state!=='installed').length);if(n<=0||!E.addMaterials(state,k,n))break;need-=n;}
    }
    update();persist();
  };
  $('play').onclick=()=>{
    if(state.status==='done'){E.next(state);state.blueprint=plans[selected].id;}
    else if(state.status==='building'||state.status==='finishing')state.paused=!state.paused;
    else if(state.status==='waiting'){state.paused=false;}
    else{state.blueprint=plans[selected].id;E.start(state);}
    update();persist();
  };
  $('speed').onchange=()=>{state.speed=Number($('speed').value);update();persist();};
  $('reset').onclick=()=>{state=E.create(42);state.blueprint=plans[selected].id;update();persist();};
  let previous=performance.now(),acc=0,ui=0,sceneryClock=state.time;
  function frame(now){
    const elapsed=Math.min((now-previous)/1000,.1);previous=now;
    if(!document.hidden){clock+=elapsed;acc+=elapsed*state.speed;
      try{while(acc>=1/30){E.advance(state,1/30);acc-=1/30;}}catch(err){state.paused=true;state.message='施工暂停：'+err.message;console.error(err);}
      if(!state.paused)sceneryClock+=elapsed;
      R.draw($('scene'),state,sceneryClock);
      ui+=elapsed;if(ui>.14){update();ui=0;}
      if(clock-lastSave>4)persist();
    }requestAnimationFrame(frame);
  }
  document.addEventListener('visibilitychange',()=>{previous=performance.now();acc=0;if(document.hidden)persist();});
  state.blueprint=state.plan?.id||plans[selected].id;update();requestAnimationFrame(frame);
})();
