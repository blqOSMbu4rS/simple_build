/* Separate sprites, geology and source animation; installed tiles own the house. */
(function(root){
  'use strict';
  const images={},api={draw,environment,windowPanes,ensure,revision:0};
  const sources={...Object.fromEntries(Object.entries({...root.TownWildernessAssetsV2,...root.TownWildernessAssetsV4,...root.TownWildernessAssetsV5,...root.TownWildernessAssetsV6}).map(([k,v])=>['v2-'+k,v])),...Object.fromEntries(Object.entries(root.TownWildernessTimber||{}).map(([k,v])=>['timber-'+k,v]))};
  function load(sources){return Promise.all(Object.entries(sources).map(([key,url])=>typeof Image==='undefined'?Promise.resolve(false):new Promise(resolve=>{
    const image=new Image();image.onload=()=>{images[key]=image;root.TownPetWorkArt?.registerTexture(key,image);api.revision++;resolve(true);};
    image.onerror=()=>resolve(false);image.src=url;
  }))).then(results=>results.every(Boolean));}
  api.ready=load(sources);
  let legacyReady;
  function loadLegacy(){return legacyReady||(legacyReady=load(root.TownWildernessAssets||{}));}
  function ensure(plan){return plan?.wilderness&&plan.artStyle!=='creek-v2'?
    Promise.all([api.ready,loadLegacy()]).then(results=>results.every(Boolean)):api.ready;}
  const box=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  function stones(c,x,y,w,h){
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip();
    if(images.flue){
      for(let row=0;row<h;row+=7)for(let col=-2;col<w;col+=8){
        c.drawImage(images.flue,0,54+(row%3)*4,32,28,x+col+(row%2?2:0),y+row,8,7);
      }
    }else{
      box(c,x+1,y+1,w-2,h-2,'#666452');box(c,x+2,y+2,w-4,2,'#878370');
    }
    c.restore();
  }
  function windowPanes(x,y,w,h){
    return [[8,21,22,15],[34,21,22,15],[8,40,22,13],[34,40,22,13]].map(([px,py,pw,ph])=>[x+px*w/64,y+py*h/64,pw*w/64,ph*h/64]);
  }
  function drawV2(c,p,x,y,w,h,time,plan){
    const sprite=(name,xx=x,yy=y,ww=w,hh=h)=>{const image=images['v2-'+name];if(image)c.drawImage(image,xx,yy,ww,hh);};
    if(p.kind==='wall'){
      sprite('back');sprite('side',x,y,7,h);sprite('side',x+w-7,y,7,h);
      // Subtle interior shade gives furniture separation without erasing grain.
      c.fillStyle='#251b1230';c.fillRect(x+7,y,w-14,h);
    }else if(p.kind==='gable'){
      c.save();c.beginPath();c.moveTo(x,y+h);c.lineTo(x+w/2,y+14);c.lineTo(x+w,y+h);c.closePath();c.clip();sprite('back');c.restore();
    }else if(p.kind==='foundation'){
      // Only a shallow irregular line of river stones, with no solid pedestal.
      for(let i=0;i<w;i+=22)sprite('foundation',x+i,y-1+(i%3)/2,Math.min(24,w-i),8);
    }else if(p.kind==='earth'){
      for(let i=0;i<w;i++){
        const yy=y+12+Math.round(Math.sin(i*.5)+Math.sin(i*.17));
        box(c,x+i,yy,1,h-(yy-y),'#795a3a');
        if(i%11===0)box(c,x+i,yy+1,3,1,'#96754b');
      }
    }else if(p.kind==='chinking'){
      if(plan?.wholeTimber){
        // Installed clay sits behind the round logs and seals their transparent gaps.
        // The renderer still clips this layer to each completed construction cell.
        c.save();c.beginPath();c.rect(x+7,y,w-14,h);c.clip();
        box(c,x+7,y,w-14,h,'#887354');
        for(let row=1;row<h;row+=4)for(let col=8;col<w-7;col+=11){
          box(c,x+col,y+row+(col%3),6,1,(row+col)%2?'#927e5e':'#7b664b');
        }
        c.restore();return;
      }
      // Clay follows irregular bark seams rather than drawing ruler-straight rows.
      c.save();c.globalAlpha=.18;
      for(let row=7;row<h-3;row+=7)for(let col=9;col<w-9;col+=7){
        box(c,x+col,y+row+Math.round(Math.sin(col*.23+row)),3,1,'#8d6b45');
      }c.restore();
    }else if(p.kind==='flue'){
      const image=images['v2-flue'];
      if(image){
        // Keep the cap's proportions; extend only the stone shaft texture.
        const cx=x+w/2-6,top=y+12;
        for(let row=6;row<h-12;row+=8)c.drawImage(image,24,96,80,56,cx,top+row,12,Math.min(8,h-12-row));
        c.drawImage(image,14,32,100,40,x+w/2-8,top,16,6);
      }
    }else if(p.kind==='hearth'){
      // The indoor shaft joins the stove behind its kettle, inside installed hearth cells.
      const shaft=images['v2-flue'];
      box(c,x+w/2-6,y,12,24,'#454b4b');
      if(shaft)for(let row=0;row<24;row+=8)c.drawImage(shaft,24,96,80,56,x+w/2-6,y+row,12,8);
      // Kettle, arch, firebox and embers are all visible in the actual sprite.
      sprite('hearth',x+2,y+8,w-4,h-8);
      c.save();c.globalAlpha=.22+.14*Math.sin(time*6.5);
      box(c,x+w/2-2,y+h-10,4,2,'#e5a84d');c.restore();
    }else if(p.kind==='bed'){
      // Three construction cells include the wall clearance and aisle; the
      // visible sleeping surface is 40 units (2.5 m), ending beside the hearth.
      if(w===48)sprite('bed',x+7,y-2,40,h+2);
      else sprite('bed',x+5,y,w-5,h);
    }
    else if(p.kind==='bedding'){
      c.save();c.globalAlpha=.35;
      for(let i=w===48?8:6;i<(w===48?46:w-3);i+=5)box(c,x+i,y+8+(i%3)/2,2,.5,'#c29e55');c.restore();
    }else if(p.kind==='window'){
      // Remove the baked landscape; only the wood frame and mullions remain.
      c.save();c.beginPath();c.rect(x,y,w,h);
      for(const pane of windowPanes(x,y,w,h))c.rect(...pane);
      c.clip('evenodd');sprite('window');c.restore();
    }else if(p.kind==='roof-seal'){
      for(let i=1;i<4;i++)box(c,x+12+i*19,y+10+i%2,3,1,'#735036');
    }else sprite(p.kind);
  }
  function draw(c,p,x,y,w,h,time=0,plan){
    if(plan?.artStyle==='creek-v2'){drawV2(c,p,x,y,w,h,time,plan);return;}
    loadLegacy();
    const kind=p.kind;
    if(kind==='wall'){
      if(images.wall)c.drawImage(images.wall,x,y,w,h);else box(c,x,y,w,h,'#735039');
      // Narrow rock cross-sections; no receding side wall.
      stones(c,x,y,4,h);stones(c,x+w-4,y,4,h);
    }else if(kind==='gable'){
      c.save();c.beginPath();c.moveTo(x,y+h);c.lineTo(x+w/2,y+4);c.lineTo(x+w,y+h);c.closePath();c.clip();
      if(images.wall)c.drawImage(images.wall,x,y,w,h);else box(c,x,y,w,h,'#735039');c.restore();
    }else if(kind==='foundation'){
      box(c,x,y+3,w,h-3,'#715b40');
      for(let i=0;i<w;i+=7){
        const yy=y+2+i%3,ww=Math.min(8,w-i);
        c.fillStyle=i%2?'#777665':'#656858';c.beginPath();c.moveTo(x+i+1,yy);c.lineTo(x+i+ww-2,yy);c.lineTo(x+i+ww,yy+3);c.lineTo(x+i+ww-1,yy+6);c.lineTo(x+i+1,yy+5);c.closePath();c.fill();
        box(c,x+i+2,yy+1,Math.max(1,ww-4),1,'#8a8977');
      }
    }else if(kind==='earth'){
      for(let i=0;i<w;i++){
        const ridge=11+Math.round(Math.sin(i*.7)+Math.sin(i*.19));
        box(c,x+i,y+ridge,1,h-ridge,'#816145');
        if(i%9===0)box(c,x+i,y+ridge,3,1,'#9b805b');
        if(i%13===4)box(c,x+i,y+ridge+2,2,1,'#635d4b');
      }
    }else if(kind==='chinking'){
      for(let yy=8;yy<h-4;yy+=8)for(let xx=5;xx<w-5;xx+=7)box(c,x+xx,y+yy+(xx%3===0?1:0),5,1,'#8a6c48');
    }else if(kind==='flue'){
      stones(c,x+4,y+2,w-8,h-2);
      if(images.flue)c.drawImage(images.flue,0,28,32,20,x+3,y,w-6,6);
      else box(c,x+2,y,w-4,3,'#777465');
    }else if(kind==='roof-seal'){
      for(let i=0;i<5;i++)box(c,x+12+i*15,y+12-(i===2?3:0),4,2,'#756046');
    }else if(kind==='bedding'){
      // Twig/straw layer remains a separate installed construction component.
      for(let i=0;i<w-4;i+=4)box(c,x+2+i,y+5+i%2,3,1,'#b09354');
    }else if(images[kind]){
      c.imageSmoothingEnabled=false;c.drawImage(images[kind],x,y,w,h);
      if(kind==='hearth'){
        const pulse=.75+.2*Math.sin(time*7),fx=x+w/2,fy=y+h-7;
        box(c,fx-2,fy-3,4,4,'#bb622b');box(c,fx-1,fy-5-Math.round(pulse*2),2,5,'#dca04c');
      }
    }else box(c,x+2,y+4,w-4,h-5,'#73543a');
  }
  let sceneryLayers;
  const {leafClusters,drawLeafClusters}=root.TownPetWorkArt;
  function splitScenery(image){
    if(sceneryLayers?.image===image)return sceneryLayers;
    const foliageImage=images['v2-environment-foliage'],waterImage=images['v2-environment-water'];
    if(!foliageImage||!waterImage)return null;
    // Cache decoded layers for consistent compositing in both renderer paths.
    // No pixel readback or full-image scanning is needed on the browser thread.
    const copy=source=>{const a=document.createElement('canvas');a.width=source.width;a.height=source.height;a.getContext('2d').drawImage(source,0,0);return a;};
    const base=copy(image),water=copy(waterImage),scale=image.width/480;
    const foliage=leafClusters(foliageImage,[[20,14,20,13],[68,25,24,18],[116,46,19,20],
      [40,75,23,18],[98,101,22,18],[190,45,23,22],[202,100,23,21],
      [248,127,21,15],[320,143,23,15],[373,116,27,22],[425,145,24,17],
      [460,91,20,22]].map(spot=>spot.map(n=>n*scale)));
    const flow=document.createElement('canvas');flow.width=water.width;flow.height=water.height;
    return sceneryLayers={image,base,foliage,water,flow,scale};
  }
  function wind(time,phase=0){
    return (Math.sin(time*.9+phase)-Math.sin(phase))*(.7+.3*Math.sin(time*.23)**2);
  }
  const creekCurrents=[
    {points:[[434,164],[446,166],[457,171],[464,175]],speed:5,gap:9},
    {points:[[460,178],[459,185],[458,193],[460,198]],speed:9,gap:7},
    {points:[[465,178],[464,187],[463,195],[466,199]],speed:10,gap:8},
    {points:[[458,200],[469,202],[480,200]],speed:6,gap:8},
    {points:[[477,205],[479,210],[478,216],[480,219]],speed:9,gap:7},
    {points:[[474,222],[479,225],[485,227]],speed:6,gap:8}
  ].map(current=>({...current,lengths:current.points.slice(1).map((p,i)=>Math.hypot(p[0]-current.points[i][0],p[1]-current.points[i][1]))}));
  function flowingWater(c,layers,time){
    const {flow,water,scale:k}=layers,f=flow.getContext('2d');
    f.clearRect(0,0,flow.width,flow.height);f.save();f.scale(k,k);f.translate(-424,-160);
    // Ripples travel along the authored channel at a constant speed. The painted
    // water and shoreline stay intact; no independent row/column texture wrapping.
    for(const current of creekCurrents){
      const length=current.lengths.reduce((a,b)=>a+b,0);
      for(let n=0;n<Math.ceil(length/current.gap);n++){
        const distance=(time*current.speed+n*current.gap)%length;
        let remaining=distance,segment=0;
        while(segment<current.lengths.length-1&&remaining>current.lengths[segment])remaining-=current.lengths[segment++];
        const a=current.points[segment],b=current.points[segment+1],t=remaining/current.lengths[segment];
        const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t,fall=Math.abs(b[1]-a[1])>Math.abs(b[0]-a[0]);
        f.globalAlpha=.24*Math.min(1,distance/4,(length-distance)/4);
        box(f,x,y,fall?1:4,fall?4:1,'#7ea5b8');
        box(f,x+(fall?1:0),y+(fall?0:1),fall?1:3,fall?3:1,'#315c7d');
      }
    }
    f.restore();f.globalCompositeOperation='destination-in';f.drawImage(water,0,0);f.globalCompositeOperation='source-over';
    c.drawImage(water,424,160,56,74);c.drawImage(flow,424,160,56,74);
  }
  function animatedScenery(c,image,time){
    time=Math.max(0,time);
    const layers=splitScenery(image);c.drawImage(layers?layers.base:image,0,0,480,304);
    if(!layers)return;
    // Broad crown patches sway independently; trunks and the rest stay fixed.
    c.save();c.scale(1/layers.scale,1/layers.scale);
    drawLeafClusters(c,layers.foliage,time,layers.scale);c.restore();
    flowingWater(c,layers,time);
    // Sparse leaves travel from the canopy and fade before reaching the worksite.
    for(let i=0;i<6;i++){
      const age=(time*.12+i*.173)%1;if(age>.8)continue;
      const x=38+i*68+age*25+Math.sin(time*.9+i)*3,y=38+i%3*25+age*108;
      c.save();c.globalAlpha=Math.sin(age/.8*Math.PI)*.65;
      box(c,x,y,Math.sin(time*3+i)>0?2:1,1,i%2?'#627747':'#849052');c.restore();
    }
  }
  function environment(c,s,time=0){
    const latest=(s.plan||root.TownBlueprints.find(p=>p.id===s.blueprint))?.artStyle==='creek-v2';
    if(!latest)loadLegacy();
    if(latest&&images['v2-environment']){
      // Keep the whole background visible; the scene projection places the shelter.
      animatedScenery(c,images['v2-environment'],time);
    }else if(images.environment){
      // Generated ground lip is row 446; align walkable ground with simulation.
      c.drawImage(images.environment,0,0,960,446,0,0,480,272);
      c.drawImage(images.environment,0,446,960,194,0,272,480,32);
    }else{
      box(c,0,0,480,304,'#384f52');box(c,0,256,432,48,'#715d43');box(c,438,235,42,69,'#385e65');
    }
    // Animated current is restricted to the remote creek, away from the house.
    if(!latest)for(let i=0;i<9;i++){const xx=445+(i*13+Math.floor(time*5))%32;box(c,xx,252+i*4,3,1,'#6c8990');}
    const g=s.wilderness;
    const treePlan=s.plan||root.TownBlueprints.find(p=>p.id===s.blueprint),timber=(treePlan?.wholeTimber||treePlan?.id==='cutaway-creek-shelter-v3-grid-v1')&&(!g||g.trees);
    if(!timber&&(!g||g.issued.W===0)){
      box(c,32,211,7,61,'#615240');box(c,35,212,2,56,'#857050');
      for(const [xx,yy,ww,hh]of [[12,209,47,15],[16,194,39,20],[23,180,25,19]]){box(c,xx,yy,ww,hh,'#385446');box(c,xx+4,yy+3,ww-9,4,'#516b50');}
    }
    if(g&&!g.trees){
      const cut=g.initial.W-g.remaining.W;
      for(let i=0;i<Math.min(6,Math.floor(cut/3));i++){
        box(c,20+i*5,264-i%2*4,5,4,'#75583b');box(c,21+i*5,264-i%2*4,2,2,'#ab8351');
      }
    }
    return true;
  }
  root.TownWildernessArt=api;
})(globalThis);
