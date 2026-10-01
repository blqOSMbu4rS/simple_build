/* Separate sprites, geology and source animation; installed tiles own the house. */
(function(root){
  'use strict';
  const images={},api={draw,environment,trees,gatherOverlay,timberOverlay,installedLog,windowPanes,revision:0};
  const sources={...root.TownWildernessAssets,...Object.fromEntries(Object.entries({...root.TownWildernessAssetsV2,...root.TownWildernessAssetsV4,...root.TownWildernessAssetsV5,...root.TownWildernessAssetsV6}).map(([k,v])=>['v2-'+k,v])),...Object.fromEntries(Object.entries(root.TownWildernessTimber||{}).map(([k,v])=>['timber-'+k,v]))};
  api.ready=Promise.all(Object.entries(sources).map(([key,url])=>new Promise(resolve=>{
    const image=new Image();image.onload=()=>{images[key]=image;api.revision++;resolve(true);};
    image.onerror=()=>resolve(false);image.src=url;
  })));
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
  function drawV2(c,p,x,y,w,h,time){
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
    if(plan?.artStyle==='creek-v2'){drawV2(c,p,x,y,w,h,time);return;}
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
  function environment(c,s,time=0){
    const latest=(s.plan||root.TownBlueprints.find(p=>p.id===s.blueprint))?.artStyle==='creek-v2';
    if(latest&&images['v2-environment']){
      // Keep the whole background visible; the scene projection places the shelter.
      c.drawImage(images['v2-environment'],0,0,480,304);
    }else if(images.environment){
      // Generated ground lip is row 446; align walkable ground with simulation.
      c.drawImage(images.environment,0,0,960,446,0,0,480,272);
      c.drawImage(images.environment,0,446,960,194,0,272,480,32);
    }else{
      box(c,0,0,480,304,'#384f52');box(c,0,256,432,48,'#715d43');box(c,438,235,42,69,'#385e65');
    }
    // Animated current is restricted to the remote creek, away from the house.
    for(let i=0;i<9;i++){const xx=445+(i*13+Math.floor(time*5))%32;box(c,xx,252+i*4,3,1,'#6c8990');}
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
  function roundLog(c,x,y,width=16,height=7){
    if(images['timber-log']){c.drawImage(images['timber-log'],x-width/2,y-height/2,width,height);return;}
    box(c,x-width/2,y-height/2,width,height,'#4b3828');
    box(c,x-width/2+1,y-height/2+1,width-2,height-2,'#725137');
    box(c,x-width/2+3,y-height/2+2,width-5,1,'#8b6845');
    box(c,x+width/2-3,y-height/2+1,2,height-2,'#a27c50');
    box(c,x+width/2-2,y-1,1,2,'#63462f');
  }
  function standingTree(c,x,y,index,time=0,angle=0){
    const image=images['timber-tree'+(index%3)];
    if(image){c.save();c.translate(x,y);c.rotate(angle);const h=[88,94,90,92][index],w=h*image.width/image.height;c.drawImage(image,-w/2,-h,w,h);c.restore();return;}
    c.save();c.translate(x,y);c.rotate(angle);
    const height=[42,49,38,45][index];
    box(c,-3,-height+10,6,height-10,'#493d2e');box(c,-1,-height+11,2,height-13,'#796148');
    box(c,-4,-6,2,6,'#594732');box(c,2,-4,3,4,'#594732');
    for(let branch=0;branch<3;branch++){
      const side=branch%2?1:-1,yy=-height+17+branch*6;
      for(let n=0;n<4;n++)box(c,side*(2+n*2),yy-n,3,2,'#5d5038');
    }
    const sway=angle?0:Math.round(Math.sin(time*.8+index)*.8);
    // Connected, irregular pixel clusters: a tapered crown with broad matte shades.
    for(let row=0;row<32;row+=2){
      const radius=Math.round(Math.sqrt(Math.max(0,1-((row-15)/17)**2))*(index%2?12:15));
      const edge=(row+index*3)%6<3?2:0,yy=-height-11+row;
      box(c,-radius+sway-edge,yy,radius*2+edge+1,2,row>23?'#2f4b36':'#314e3a');
      const patch=Math.max(2,Math.round(radius*.6)),offset=Math.round(Math.sin((row+index)*.45)*4);
      if(row>2&&row<25)box(c,-patch+sway+offset,yy,patch+3,2,row<12?'#4e6947':'#3e5d40');
      if(row>8&&row<22)box(c,radius-8+sway,yy,5,2,'#3a5740');
    }
    c.restore();
  }
  function trees(c,s,time,projectX=x=>x,preview=false){
    const plan=s.plan||root.TownBlueprints.find(p=>p.id===s.blueprint);
    if((!plan?.wholeTimber&&plan?.id!=='cutaway-creek-shelter-v3-grid-v1')||(s.wilderness&&!s.wilderness.trees))return;
    const list=s.wilderness?.trees||[25,58,91,124].map((x,i)=>({id:'tree-'+i,x,felled:false}));
    const pose=preview?null:root.TownWildGather?.sample(s.wilderness);
    for(const [i,tree]of list.entries()){
      const x=projectX(tree.x),falling=pose?.treeId===tree.id&&pose.phase==='fell';
      if(!tree.felled&&!falling)standingTree(c,x,272,i,time);
      else{
        if(images['timber-stump'])c.drawImage(images['timber-stump'],x-6,264,12,8);
        else{box(c,x-4,268,8,4,'#5b432f');box(c,x-3,268,6,2,'#98764b');}
        if(falling)standingTree(c,x,270,i,time,pose.progress*Math.PI/2);
        else if(tree.remaining>0){
          // Depleted source trees leave only a stump.
          if(images['timber-fallen'])c.drawImage(images['timber-fallen'],x,249,80,23);
          else roundLog(c,x+40,268,80,6.4);
        }
      }
    }
  }
  function installedLog(c,p,x,y,w,h){
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip();roundLog(c,x+w/2,y+h/2,w,h);
    const side=images['v2-side'],sy=272-(p.tileSource.y+p.tileSource.h)*16;
    if(side){c.drawImage(side,x,sy,7,32);c.drawImage(side,x+w-7,sy,7,32);}
    c.restore();
  }
  function timberOverlay(c,pose,time,projectX=x=>x){
    if(!pose)return;
    if(pose.log){
      const {x,y}=pose.log;
      roundLog(c,projectX(x),y,pose.log.length||16,pose.log.diameter||7);
      // Hands reach toward the same log; neither pet owns a duplicate sprite.
      if(pose.team&&['team-pickup','team-carry','stage','lift','align','reveal','stock'].includes(pose.phase)){
        pose.pets.forEach((p,i)=>{
          const xx=pose.log.length>16?projectX(x)+p.x-x:projectX(p.x),yy=Math.min(p.y-5,y+1);
          box(c,xx+(i===0?3:-7),yy,5,3,'#d8b38b');
        });
      }
    }
    if(['chop','trim'].includes(pose.phase)){
      pose.pets.forEach((p,i)=>{
        const x=projectX(p.x),hit=Math.floor(time*7+i)%2,side=pose.team&&i===1?-1:1;
        box(c,x+side*6,253+hit*6,2,13,'#876344');
        box(c,x+side*6-3,252+hit*6,8,3,'#697572');
      });
    }else if(pose.phase==='cut'){
      const center=projectX(pose.log.x)-(pose.whole?30:0),stroke=Math.round(Math.sin(time*10)*2);
      box(c,center-10+stroke,265,20,2,'#77817a');
      box(c,center-12+stroke,263,2,5,'#805d3c');box(c,center+10+stroke,263,2,5,'#805d3c');
      box(c,center-4,271,3,1,'#8f6a43');
    }
  }
  function gatherOverlay(c,s,time,projectX=x=>x){
    const pose=root.TownWildGather?.sample(s.wilderness);if(!pose)return;
    if(pose.treeId){
      // The single carrier uses the existing held-material drawing while walking.
      timberOverlay(c,pose.team||!['pickup','gather-carry','stock'].includes(pose.phase)?pose:{...pose,log:null},time,projectX);
      return;
    }
    const p={...pose,x:projectX(pose.x)};
    if(['chop','cut'].includes(p.phase)){
      const hit=Math.floor(time*9)%2;box(c,p.x+8,250+hit*5,2,14,'#9b7146');box(c,p.x+4,249+hit*5,9,4,'#818b86');
      box(c,p.x+13,263,3,2,'#977443');
    }else if(p.phase==='mix'||p.phase==='dig'){
      box(c,p.x+8,257,2,12,'#947447');box(c,p.x+4,268,13,2,'#8e6945');
      box(c,p.x+5+Math.floor(time*4)%4,266,3,1,'#ab8254');
    }else if(p.phase==='fill-water')box(c,p.x+4,268,6,4,'#698b90');
  }
  root.TownWildernessArt=api;
})(globalThis);
