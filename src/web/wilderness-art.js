/* Separate sprites, geology and source animation; installed tiles own the house. */
(function(root){
  'use strict';
  const images={},api={draw,environment,gatherOverlay,revision:0};
  const sources={...root.TownWildernessAssets,...Object.fromEntries(Object.entries(root.TownWildernessAssetsV2||{}).map(([k,v])=>['v2-'+k,v]))};
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
      c.save();c.globalAlpha=.25;
      for(let row=7;row<h-3;row+=7)box(c,x+7,y+row,w-14,.5,'#9b7950');c.restore();
    }else if(p.kind==='flue'){
      const image=images['v2-flue'];
      if(image){
        // Keep the cap's proportions; extend only the stone shaft texture.
        const cx=x+w/2-6;
        for(let row=6;row<h;row+=8)c.drawImage(image,24,96,80,56,cx,y+row,12,Math.min(8,h-row));
        c.drawImage(image,14,32,100,40,x+w/2-8,y,16,6);
      }
    }else if(p.kind==='hearth'){
      // Kettle, arch, firebox and embers are all visible in the actual sprite.
      sprite('hearth',x+2,y+8,w-4,h-8);
      c.save();c.globalAlpha=.22+.14*Math.sin(time*6.5);
      box(c,x+w/2-2,y+h-10,4,2,'#e5a84d');c.restore();
    }else if(p.kind==='bed')sprite('bed',x+5,y,w-5,h);
    else if(p.kind==='bedding'){
      c.save();c.globalAlpha=.35;
      for(let i=6;i<w-3;i+=5)box(c,x+i,y+8+(i%3)/2,2,.5,'#c29e55');c.restore();
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
      // The empty yard is aligned with the same fixed simulation floor.
      c.drawImage(images['v2-environment'],0,0,1920,650,0,0,480,272);
      c.drawImage(images['v2-environment'],0,650,1920,310,0,272,480,32);
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
    if(!g||g.issued.W===0){
      box(c,32,211,7,61,'#615240');box(c,35,212,2,56,'#857050');
      for(const [xx,yy,ww,hh]of [[12,209,47,15],[16,194,39,20],[23,180,25,19]]){box(c,xx,yy,ww,hh,'#385446');box(c,xx+4,yy+3,ww-9,4,'#516b50');}
    }
    if(g){
      const cut=g.initial.W-g.remaining.W;
      for(let i=0;i<Math.min(6,Math.floor(cut/3));i++){
        box(c,20+i*5,264-i%2*4,5,4,'#75583b');box(c,21+i*5,264-i%2*4,2,2,'#ab8351');
      }
    }
    return true;
  }
  function gatherOverlay(c,s,time){
    const p=root.TownWildGather?.sample(s.wilderness);if(!p)return;
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
