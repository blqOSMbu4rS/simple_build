/* Pixel-cutaway study: every visible element belongs to an installed task. */
(function(root){
  'use strict';
  const O=240,G=16,Y=272;
  const palettes={wood:{edge:'#49372e',wall:'#aa8158',inside:'#e1c79c',trim:'#725039',roof:'#865342',roofLight:'#bd8061'},stone:{edge:'#3e454a',wall:'#788288',inside:'#d5cbb3',trim:'#654b3b',roof:'#394d63',roofLight:'#67819a'},long:{edge:'#494035',wall:'#aa885c',inside:'#ddc99d',trim:'#6d4f35',roof:'#68704d',roofLight:'#a0a16e'}};
  function box(c,x,y,w,h,color){c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));}
  function poly(c,points,color){c.fillStyle=color;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();}
  function houseRect(p,plan){return [(plan.modular?root.TownModules.origin(plan):O)+p.x*G,Y-(p.y+p.h)*G,p.w*G,p.h*G];}
  function siteScale(s){
    const plan=s.plan||root.TownBlueprints.find(p=>p.id===s.blueprint);
    return plan?.artStyle==='creek-v2'?1.8:1;
  }
  function project(s,x,y){
    const k=siteScale(s);return k===1?[x,y]:[247+(x-328)*k,184+(y-272)*k];
  }
  function siteTransform(c,s){const k=siteScale(s);if(k!==1){const [x,y]=project(s,0,0);c.translate(x,y);c.scale(k,k);}}
  function travelX(s,x){
    if(siteScale(s)===1)return x;
    const left=project(s,260,272)[0],right=project(s,392,272)[0];
    const anchors=[[0,0],[35,30],[90,90],[110,120],[148,180],[185,132],[260,left],[392,right],[418,388],[430,442],[480,480]];
    let display=project(s,x,272)[0];
    if(x<260||x>392){
      const index=Math.max(1,anchors.findIndex(a=>a[0]>=x)),[a,b]=[anchors[index-1],anchors[index]];
      display=a[1]+(x-a[0])*(b[1]-a[1])/(b[0]-a[0]);
    }
    return 328+(display-247)/1.8;
  }
  function renderLayer(p,plan){return plan.artStyle==='creek-v2'&&(p.tileSource||p).kind==='flue'?5.5:p.layer;}
  function windowGlass(c,s,preview,surface=false,clock=0){
    const plan=s.plan;if(plan?.artStyle!=='creek-v2')return;
    for(const p of (preview?plan.parts:s.installed).filter(p=>p.kind==='window')){
      const source=p.tileSource||p,[x,y,w,h]=houseRect(source,plan);
      c.save();const [tx,ty,tw,th]=houseRect(p,plan);
      c.beginPath();c.rect(tx,ty,tw,th);c.clip();c.beginPath();
      for(const pane of root.TownWildernessArt.windowPanes(x,y,w,h))c.rect(...pane);
      c.clip();
      if(surface){c.globalCompositeOperation='destination-out';c.fillRect(x,y,w,h);}
      else{const k=siteScale(s),[ox,oy]=project(s,0,0);c.translate(-ox/k,-oy/k);c.scale(1/k,1/k);root.TownWildernessArt.environment(c,s,clock);}
      c.restore();
    }
  }
  function foregroundStones(c,s,preview,clock=0){
    const plan=s.plan;if(plan?.artStyle!=='creek-v2')return;
    const parts=preview?plan.parts:s.installed;
    // A shallow foreground lip joins only installed footing/floor pairs.
    // It occupies the bottom four pixels of that floor, not an unbuilt tile.
    for(const p of parts.filter(p=>(p.tileSource||p).kind==='foundation')){
      const floor=parts.some(f=>(f.tileSource||f).kind==='earth'&&f.x===p.x&&f.y===p.y+1);
      if(!floor){drawPart(c,p,plan,clock);continue;}
      const [x,y,w]=houseRect(p,plan);
      c.save();c.beginPath();c.rect(x,y-4,w,20);c.clip();c.translate(0,-4);
      drawPart(c,p,plan,clock);c.restore();
    }
  }
  function tree(c,x,y,scale=1,time=0){
    c.save();c.translate(x,y);c.scale(scale,scale);
    box(c,-7,-83,15,83,'#5c604b');box(c,-4,-80,5,77,'#967b59');
    c.translate(Math.round(Math.sin(time*1.4+x)*1.5),0);
    box(c,-24,-99,12,8,'#5d7657');box(c,12,-94,12,7,'#5d7657');
    for(const [bx,by,w,h,color]of [[-34,-111,68,29,'#4d7356'],[-40,-94,80,28,'#5f875e'],[-31,-127,61,27,'#608762'],[-20,-142,42,25,'#729569'],[-29,-84,60,14,'#456b50']])box(c,bx,by,w,h,color);
    for(let i=0;i<20;i++){const xx=(i*23)%66-33,yy=-132+(i*17)%61;if(Math.abs(xx)<30)box(c,xx,yy,6,4,i%3?'#89a973':'#a5b984');}
    box(c,-36,-82,10,7,'#779663');box(c,28,-91,11,8,'#718e62');c.restore();
  }
  function shrubs(c,time=0){
    for(const [x,s]of [[12,1],[75,.8],[113,.65],[458,.82]]){
      c.save();c.translate(x,273);c.scale(s,s);
      c.translate(Math.round(Math.sin(time*1.7+x)),0);
      box(c,-12,-11,27,10,'#527a55');box(c,-8,-18,15,12,'#6d955d');box(c,2,-15,13,11,'#779e65');
      for(let i=0;i<5;i++){box(c,-9+i*5,-12-(i%3)*3,3,3,i%2?'#e9c281':'#f1d3a5');box(c,-8+i*5,-14-(i%3)*3,1,1,'#fff0ca');}
      c.restore();
    }
  }
  function ground(c,time=0){
    box(c,0,0,480,304,'#a9c1b5');box(c,0,0,480,116,'#bcd0bd');
    box(c,374,34,25,25,'#f1db9e');
    poly(c,[[0,194],[65,164],[117,184],[184,151],[237,181],[312,154],[397,188],[480,161],[480,274],[0,274]],'#94afa2');
    poly(c,[[0,224],[73,200],[142,215],[223,188],[296,217],[375,194],[480,213],[480,273],[0,273]],'#7d9e8d');
    tree(c,31,269,1.08,time);tree(c,458,269,.88,time);
    for(let i=0;i<14;i++){const x=i*38-12;box(c,x,250,3,20,'#718d70');box(c,x-7,244,17,7,'#83a479');box(c,x-4,237,11,9,'#91ad82');}
    box(c,0,269,480,7,'#648363');box(c,0,276,480,28,'#866d53');
    for(let i=0;i<80;i++){const x=i*79%480,y=280+i*37%22;box(c,x,y,3,2,i%2?'#9c8161':'#6c634e');}
  }
  function stock(c,s){
    const amounts=root.TownEngine.inventory(s);const colors={W:'#a8794c',S:'#89939a',C:'#ca8063',B:'#8d7850',D:'#947050'};
    for(const [i,k] of (s.plan?.wilderness?['W','S','B','D']:['W','S','C']).entries()){
      const pose=s.active?.motion===root.TownCutawayMotion?.VERSION?root.TownCutawayMotion.sample(s.active):null;
      const taken=pose?s.active.materialKinds.filter((kind,j)=>kind===k&&(j<pose.unit||(j===pose.unit&&pose.held))).length:0;
      const x=({W:56,S:95,C:134,B:134,D:173})[k],n=amounts.free[k]+amounts.reserved[k]-taken;
      for(let j=0;j<Math.min(4,Math.ceil(n/4));j++){
        const yy=267-j*6;box(c,x+(j%2)*3,yy,26,5,'#514b40');box(c,x+2+(j%2)*3,yy+1,22,3,colors[k]);
      }
    }
  }
  // Only flexible sprite regions move. The pot and curtain rail stay anchored;
  // the caller's construction-cell clip also applies to the displaced pixels.
  const movingSprites=new WeakMap();
  function movingCottagePart(c,p,x,y,w,h,time){
    let cached=movingSprites.get(p),revision=root.TownCottageArt.revision;
    if(!cached||cached.revision!==revision){
      const canvas=document.createElement('canvas');canvas.width=w*2;canvas.height=h*2;
      const context=canvas.getContext('2d');context.scale(2,2);
      root.TownCottageArt.draw(context,p,0,0,w,h);
      cached={canvas,revision};movingSprites.set(p,cached);
    }
    c.save();c.beginPath();c.rect(x,y,w,h);c.clip();c.imageSmoothingEnabled=false;
    for(let row=0;row<h;row+=2){
      const flexible=p.kind==='curtains'?Math.max(0,(row-3)/(h-3)):p.kind==='ivy'?row/h:Math.max(0,(h-10-row)/(h-10));
      const dx=Math.round(Math.sin(time*1.6+p.x*.7+row*.045)*flexible*2)/2;
      const band=Math.min(2,h-row);
      c.drawImage(cached.canvas,0,row*2,w*2,band*2,x+dx,y+row,w,band);
    }
    c.restore();
  }
  function drawPart(c,p,plan,time=0){
    if(p.tileSource){
      const [x,y]=houseRect(p,plan);
      c.save();c.beginPath();c.rect(x,y,G,G);c.clip();
      // The square is a construction boundary, not an opaque background.
      // Keep this component's transparent pixels, roof slope and fine details.
      drawPart(c,p.tileSource,plan,time);
      c.restore();return;
    }
    const [x,y,w,h]=houseRect(p,plan),pal=palettes[plan.layout];
    if(plan.wilderness&&root.TownWildernessArt){root.TownWildernessArt.draw(c,p,x,y,w,h,time,plan);return;}
    if(plan.artStyle?.startsWith('woodland-')&&root.TownCottageArt){
      if(time&&typeof document!=='undefined'&&['plant','curtains','ivy'].includes(p.kind))movingCottagePart(c,p,x,y,w,h,time);
      else root.TownCottageArt.draw(c,p,x,y,w,h);
      return;
    }
    if(p.kind==='foundation'){
      box(c,x,y,w,h,pal.edge);box(c,x+2,y+2,w-4,h-3,p.material==='S'?'#9ca7a4':'#ac8153');
      for(let i=0;i<w;i+=22)box(c,x+i+7,y+3,9,2,'#c5b69a');
    }else if(p.kind==='wall'){
      box(c,x,y,w,h,pal.edge);box(c,x+4,y+4,w-8,h-8,pal.inside);
      for(let yy=y+13;yy<y+h-6;yy+=16)box(c,x+5,yy,w-10,1,p.material==='S'?'#b9b3a0':'#c8a979');
      // Interior walls use subtle horizontal grain, without a dark lattice.
      box(c,x+4,y+3,w-8,4,pal.trim);box(c,x+4,y+h-8,w-8,4,pal.trim);
      if(p.material==='S')for(let yy=y+11;yy<y+h-10;yy+=18){box(c,x+6,yy,w-12,2,'#afa996');box(c,x+16,yy+7,20,1,'#aea792');}
      if(p.openLeft){box(c,x,y+h-32,4,28,pal.inside);box(c,x,y+h-34,4,2,pal.trim);}
      if(p.openRight){box(c,x+w-4,y+h-32,4,28,pal.inside);box(c,x+w-4,y+h-34,4,2,pal.trim);}
    }else if(p.kind==='floor'){
      box(c,x,y,w,h,pal.edge);box(c,x+2,y+2,w-4,6,'#b78d59');box(c,x+2,y+9,w-4,3,'#71513a');
    }else if(p.kind==='roof'){
      // Broad, pixel-stepped roof with a readable overhang and visible interior below.
      const tiers=Math.ceil(h/6),mid=x+w/2;
      for(let i=0;i<tiers;i++){
        const inset=Math.floor((tiers-1-i)*w/(tiers*2));
        box(c,x+inset-2,y+i*6,w-2*inset+4,7,pal.edge);
        box(c,x+inset,y+i*6+1,w-2*inset,4,i%2?pal.roof:pal.roofLight);
        for(let xx=x+inset+8+(i%2)*6;xx<x+w-inset-4;xx+=15)box(c,xx,y+i*6+4,4,1,pal.edge);
      }
      box(c,x-2,y+h-3,w+4,5,pal.edge);box(c,x,y+h,w,2,'#d2a36a');
      if(plan.layout==='stone'){box(c,x+18,y+7,11,h-7,'#647078');box(c,x+16,y+5,15,4,'#3f4548');}
    }else if(p.kind==='door'){
      if(plan.residential){
        box(c,x+1,y,w-2,h,pal.edge);box(c,x+3,y+2,w-6,h-3,'#956945');
        box(c,x+4,y+3,2,h-5,'#c09161');box(c,x+w-5,y+h/2,2,2,'#e8c681');
        return;
      }
      box(c,x+2,y+1,w-4,h-1,pal.edge);box(c,x+5,y+4,w-10,h-4,'#956945');
      for(let i=10;i<w-6;i+=8)box(c,x+i,y+7,2,h-11,'#b98250');
      box(c,x+w-10,y+h/2,3,3,'#e8c681');box(c,x-2,y+h-3,w+4,4,'#b3a17c');
    }else if(p.kind==='window'){
      if(plan.residential){
        box(c,x+1,y+1,w-2,h-2,pal.edge);box(c,x+3,y+3,w-6,h-6,'#e8c47d');
        box(c,x+4,y+4,3,h-8,'#ffe3a2');box(c,x+7,y+2,2,h-4,pal.trim);box(c,x,y+h-2,w,2,'#c5a575');
        return;
      }
      box(c,x+1,y+1,w-2,h-2,pal.edge);box(c,x+5,y+5,w-10,h-10,'#e8c47d');
      box(c,x+7,y+6,5,h-13,'#f8dea0');box(c,x+w/2-1,y+4,3,h-8,pal.trim);box(c,x+4,y+h/2, w-8,3,pal.trim);
      box(c,x-2,y+h-4,w+4,5,'#c5a575');box(c,x-4,y+3,4,h-8,pal.roof);box(c,x+w,y+3,4,h-8,pal.roof);
    }else if(p.kind==='porch'){
      if(p.roomUse==='greenhouse'){
        c.save();c.globalAlpha=.4;box(c,x+5,y+6,w-10,h-11,'#9fcfc0');c.restore();
        for(let xx=x+20;xx<x+w-5;xx+=20){box(c,xx,y+5,2,h-10,'#827b55');box(c,xx-10,y+10,5,1,'#c6e3cb');}
      }
      box(c,x+2,y+3,4,h-3,pal.trim);box(c,x+w-6,y+3,4,h-3,pal.trim);
      box(c,x,y+2,w,5,'#c19a61');box(c,x,y+h-5,w,5,'#8b6947');
      if(plan.layout==='long'){for(let i=12;i<w-6;i+=24)box(c,x+i,y+9,2,h-17,'#95714c');}
    }else if(p.kind==='awning'){
      poly(c,[[x,y+3],[x+w-7,y],[x+w,y+h-5],[x-3,y+h-5]],'#714c43');
      for(let i=2;i<w-3;i+=16)poly(c,[[x+i,y+5],[x+i+8,y+4],[x+i+13,y+h-5],[x+i+3,y+h-5]],i%32?'#e8bd91':'#bf7866');
      box(c,x-3,y+h-5,w+6,4,'#65483e');
    }else if(p.kind==='hearth'){
      box(c,x+3,y+3,w-7,h-3,'#817a70');box(c,x+5,y+4,w-11,3,'#b4a69a');
      box(c,x+8,y+h-19,w-16,17,'#3b3735');
      for(let i=0;i<3;i++){
        const height=7+Math.round((Math.sin(time*7+i*2+p.x)+1)*3),fx=x+11+i*3;
        box(c,fx,y+h-4-height,4,height,i===1?'#edb45e':'#d77944');
        box(c,fx+1,y+h-8,2,4,'#f4ce7a');
      }
    }else if(p.kind==='bed'){
      box(c,x+1,y+h-10,w-2,10,'#604a37');box(c,x+3,y+h-12,w-7,6,'#b87560');box(c,x+4,y+h-13,13,6,'#eee1ba');
      box(c,x+4,y+h-3,3,5,'#533e32');box(c,x+w-8,y+h-3,3,5,'#533e32');
    }else if(p.kind==='shelf'){
      box(c,x+2,y+3,w-4,h-3,'#614832');for(let yy=y+8;yy<y+h-4;yy+=14){box(c,x+5,yy,w-10,3,'#bb8a58');for(let xx=x+8;xx<x+w-8;xx+=7)box(c,xx,yy-8,4,8,(xx/7|0)%2?'#8c6850':'#738a6b');}
    }else if(p.kind==='stair'){
      if(plan.residential){
        const steps=h/8;
        for(let i=0;i<steps;i++){
          const xx=x+Math.floor(i*w/steps),yy=y+h-(i+1)*8;
          box(c,xx,yy,Math.min(10,x+w-xx),3,'#c4a477');box(c,xx,yy+3,3,5,'#6c503b');
        }
      }else for(let i=0;i<5;i++){box(c,x+i*4,y+h-(i+1)*13,w-i*4,4,'#7c5b42');box(c,x+i*4,y+h-(i+1)*13+4,2,9,'#b99468');}
    }else if(p.kind==='table'){
      box(c,x+1,y+h-10,w-2,3,'#c09966');box(c,x+3,y+h-7,3,7,'#634a36');box(c,x+w-6,y+h-7,3,7,'#634a36');
      if(p.books){box(c,x+5,y+h-14,10,4,'#78917b');box(c,x+7,y+h-16,9,2,'#d2b988');}
      else if(p.tools){box(c,x+6,y+h-13,14,2,'#69787b');box(c,x+7,y+h-16,4,4,'#a5a993');}
      else{box(c,x+7,y+h-12,8,2,'#e4d7b1');box(c,x+w-9,y+h-15,4,5,'#a97b60');}
    }else if(p.kind==='chest'){
      box(c,x+1,y+h-10,w-2,10,'#614c39');box(c,x+2,y+h-9,w-4,4,'#bb8b54');
      box(c,x+2,y+h-4,w-4,3,'#977048');box(c,x+w/2-1,y+h-6,3,3,'#e0c57e');
    }else if(p.kind==='railing'){
      box(c,x,y+5,w,2,'#c7a575');box(c,x,y+h-2,w,2,'#725740');
      for(let xx=x+2;xx<x+w;xx+=8)box(c,xx,y+7,2,h-9,'#92714e');
    }else if(p.kind==='step'){
      for(let i=0;i<3;i++){box(c,x+i*5,y+h-(i+1)*5,w-i*5,5,'#848b80');box(c,x+i*5,y+h-(i+1)*5,w-i*5,1,'#c2c3a5');}
    }else if(p.kind==='bench'){
      box(c,x,y+h-10,w,4,'#b88c5a');box(c,x+4,y+h-6,3,6,'#694d37');box(c,x+w-7,y+h-6,3,6,'#694d37');
    }else if(p.kind==='planter'){
      box(c,x+1,y+h-9,w-2,9,'#684e3b');box(c,x+3,y+h-8,w-6,3,'#a7784d');
      for(let i=5;i<w-2;i+=9){const dx=Math.round(Math.sin(time*1.6+i+p.x));box(c,x+i,y+h-15,2,8,'#5c7e4e');box(c,x+i-3+dx,y+h-16,5,4,'#7a9e61');box(c,x+i+1+dx,y+h-20,5,5,'#639258');box(c,x+i+dx,y+h-21,3,3,i%2?'#ebbc89':'#e3a5a0');}
    }else if(p.kind==='trellis'){
      box(c,x+3,y+3,3,h-7,'#6b563f');box(c,x+w-4,y+3,3,h-7,'#6b563f');
      for(let yy=y+9;yy<y+h-6;yy+=13){box(c,x+2,yy,w-3,2,'#a38155');box(c,x+4+(yy%2)*3,yy-5,8,6,'#5f8e5a');box(c,x+1,yy+2,7,5,'#7fa268');}
      box(c,x+6,y+7,3,h-13,'#4d7f51');
    }else if(p.kind==='lamp'){
      box(c,x+7,y-5,2,10,'#6c5640');box(c,x+3,y+5,10,8,'#f9d78c');box(c,x+1,y+11,14,2,'#745b41');
    }
  }
  function modulePart(c,p,plan,time=0){
    const [x,y,w,h]=houseRect(p,plan),pal=palettes[plan.layout],asset=p.asset;
    const mapping={footing:'foundation',wall:'wall',floor:'floor',door:'door',window:'window',awning:'awning',planter:'planter',trellis:'trellis',bed:'bed',shelf:'shelf',hearth:'hearth'};
    if(mapping[asset]){drawPart(c,{...p,kind:mapping[asset]},asset==='wall'&&p.material==='S'?{...plan,layout:'stone'}:plan,time);return;}
    if(asset==='gable'){
      box(c,x,y,w,h,pal.edge);box(c,x+2,y+2,w-4,h-4,pal.inside);box(c,x+2,y+h-5,w-4,3,pal.trim);
    }else if(asset==='roofLeft'||asset==='roofRight'){
      const left=asset==='roofLeft';
      poly(c,left?[[x,y+h],[x+w,y],[x+w,y+h]]:[[x,y],[x+w,y+h],[x,y+h]],pal.edge);
      poly(c,left?[[x+2,y+h-4],[x+w-2,y+3],[x+w-2,y+h-3]]:[[x+2,y+3],[x+w-2,y+h-4],[x+2,y+h-3]],p.roofColor==='blue'?'#6a8499':p.roofColor==='green'?'#839768':pal.roofLight);
      box(c,x,y+h-3,w,4,pal.edge);box(c,x+2,y+h-1,w-4,2,'#c7a677');
    }else if(asset==='parapet'){
      box(c,x,y+6,w,h-6,'#667376');for(let i=0;i<w;i+=10)box(c,x+i,y,7,10,'#a0a9a2');
    }else if(asset==='chimney'){
      box(c,x+3,y,w-5,h,'#866c5a');for(let yy=y+6;yy<y+h;yy+=7)box(c,x+4,yy,w-7,2,'#be9a7c');box(c,x+1,y,w-1,4,'#594a43');
    }else if(asset==='dormer'||asset==='clock'){
      box(c,x+1,y,w-2,h,'#775942');box(c,x+4,y+3,w-8,h-6,asset==='clock'?'#e5cd9b':'#dfbb79');
      if(asset==='clock'){box(c,x+w/2,y+6,2,8,'#60493d');box(c,x+w/2,y+12,8,2,'#60493d');}
      else{box(c,x+w/2,y+5,2,h-8,'#6d4d38');box(c,x+4,y+h/2,w-8,2,'#6d4d38');}
    }else if(asset==='banner'||asset==='flag'){
      const dy=Math.round(Math.sin(time*2+p.x)*2);
      box(c,x+2,y,3,h,'#715844');poly(c,[[x+5,y+3],[x+w,y+7+dy],[x+w-3,y+h-4+dy],[x+5,y+h-8]],'#bd7762');
    }
  }
  function pet(c,p,index,clock,held,hammer=false,metric=false){
    const x=Math.round(p.x),y=Math.round(p.y+(hammer?Math.sin(clock*15)>0?0:1:held?0:Math.sin(clock*2+index)*1));
    if(metric){
      // Ear tips to soles: exactly 16 source pixels = one metre.
      box(c,x-4,y-12,9,9,index?'#c9856e':'#d8ad79');box(c,x-3,y-16,2,5,index?'#b66f5e':'#bd8b60');box(c,x+2,y-16,2,5,index?'#b66f5e':'#bd8b60');
      box(c,x-2,y-6,5,2,'#f5ddbb');box(c,x-2,y-10,1,2,'#3d3b34');box(c,x+2,y-10,1,2,'#3d3b34');
      box(c,x-3,y-3,2,3,'#4e4b40');box(c,x+2,y-3,2,3,'#4e4b40');
    }else{
      box(c,x-5,y-15,11,11,index?'#c9856e':'#d8ad79');box(c,x-3,y-21,3,7,index?'#b66f5e':'#bd8b60');box(c,x+3,y-21,3,7,index?'#b66f5e':'#bd8b60');
      box(c,x-2,y-11,6,2,'#f5ddbb');box(c,x-2,y-17,2,2,'#3d3b34');box(c,x+3,y-17,2,2,'#3d3b34');
      box(c,x-3,y-4,3,4,'#4e4b40');box(c,x+2,y-4,3,4,'#4e4b40');
    }
    if(held){
      const offset=metric?3:0;
      box(c,x+4,y-12+offset,4,3,'#f5ddbb');
      box(c,x+7,y-17+offset,12,8,'#4f493f');
      box(c,x+8,y-16+offset,10,6,held==='W'?'#b1834d':held==='S'?'#929c9b':held==='B'?'#8d7850':held==='D'?'#947050':held==='bucket'?'#64858a':'#c98569');
      box(c,x+9,y-15+offset,5,1,held==='W'?'#dfb57b':'#d2c4a3');
    }
    if(hammer){
      const strike=Math.sin(clock*15)>.15;
      box(c,x+4,y-12,5,strike?4:2,'#f5ddbb');
      c.save();c.translate(x+7,y-12);c.rotate(strike?.8:-.85);
      box(c,0,-11,3,13,'#855b3c');box(c,-4,-14,11,5,'#49535a');box(c,-3,-14,9,2,'#c9c9bc');c.restore();
      if(strike){box(c,x+15,y-8,3,2,'#ffe6a2');box(c,x+18,y-12,2,2,'#fff3c6');}
    }
  }
  function smoke(c,part,plan,clock,opacity){
    if(opacity<=0)return;
    const [x,y,w,h]=houseRect(part,plan);
    c.save();c.globalAlpha=opacity;
    // All puffs stay within a 22×22 envelope around one 16×16 cell.
    c.beginPath();c.rect(x-3,y-3,G+6,G+6);c.clip();
    for(let i=0;i<7;i++){
      const dx=Math.round(Math.sin(clock*9+i*2)*3),dy=Math.round(Math.cos(clock*8+i)*2);
      const px=x-2+(i*7%15)+dx,py=y-2+(i*11%15)+dy;
      box(c,px,py,10,8,i%2?'#e5dfc9':'#d4cfb9');
      box(c,px+2,py-2,6,3,'#efe8d2');
    }
    c.restore();
  }
  function viewport(s,preview=false,camera=null){
    if(camera&&!preview)return camera;
    if(siteScale(s)!==1)return [0,0,480,304];
    if(s.plan?.wilderness&&(preview||s.status==='done'))return [208,148,232,147];
    if(s.plan?.artStyle==='woodland-v3'&&(preview||s.status==='done'))return [104,144,272,160];
    return s.plan?.artStyle?.startsWith('woodland-')&&(preview||s.status==='done')?[120,136,240,152]:[0,0,480,304];
  }
  function scenery(c,time,retreat){
    // A shallow foreground brook leaves the construction floor and stock clear.
    const bank=x=>293+Math.round(Math.sin(x*.035)*2+Math.sin(x*.09));
    for(let x=0;x<480;x++){
      const y=bank(x),depth=4+Math.round(Math.sin(x*.06));
      box(c,x,y-1,1,depth+2,retreat?'#283b32':'#596e52');
      box(c,x,y,1,depth,retreat?'#233c3f':'#506f75');
    }
    for(let i=0;i<36;i++){
      const x=i*53%480,y=bank(x);
      box(c,x,y-2,2+i%3,1,retreat?'#4a5345':'#7c8165');
      if(i%3===0){box(c,x+1,y-4,1,3,retreat?'#43513b':'#708058');box(c,x+2,y-3,2,1,retreat?'#576047':'#8d9769');}
    }
    for(let i=0;i<26;i++){
      const x=(i*37+time*(7+i%3))%480,y=bank(x)+1+i%2;
      box(c,x,y,2+i%3,1,retreat?'#415c5b':'#83a5a4');
    }
    c.save();
    for(let i=0;i<6;i++){
      const phase=(time*.06+i/6)%1,x=-60+phase*600,y=251+i%3*4;
      c.globalAlpha=Math.sin(phase*Math.PI)*.07;
      box(c,x,y,36+i%3*12,2,'#b2c9be');box(c,x+12,y-2,23,2,'#b2c9be');
    }
    c.globalAlpha=.6;
    for(let i=0;i<8;i++){
      const phase=(time*.045+i/8)%1,x=(i*73+time*9+Math.sin(time+i)*3)%480,y=162+phase*104;
      box(c,x,y,Math.sin(time*2+i)>0?2:3,1,i%2?'#899565':'#a28c59');
    }
    c.restore();
  }
  function chimneySmoke(c,s,time,preview){
    if(!s.plan)return;
    const parts=preview?s.plan.parts:s.installed,seen=new Set();
    // Smoke needs an installed fireplace as well as the chimney's outlet cell.
    if(!parts.some(p=>{
      const source=p.tileSource||p;if((source.kind||source.asset)!=='hearth')return false;
      if(!p.tileSource)return true;
      const [x,y,w,h]=houseRect(source,s.plan),[tx,ty]=houseRect(p,s.plan);
      const fx=x+(source.light?.x??w/2),fy=y+(source.light?.y??h-10);
      return fx>=tx&&fx<tx+G&&fy>=ty&&fy<ty+G;
    }))return;
    for(const p of parts){
      const source=p.tileSource||p;
      if(seen.has(source.id))continue;
      const [x,y,w]=houseRect(source,s.plan);
      let outlet;
      if(source.asset==='chimney'||source.kind==='flue')outlet=[x+w/2,y+(s.plan.artStyle==='creek-v2'&&source.kind==='flue'?12:0)];
      else if(source.kind==='roof'&&s.plan.layout==='stone'&&!s.plan.artStyle)outlet=[x+23,y+5];
      if(!outlet)continue;
      if(p.tileSource){const [tx,ty]=houseRect(p,s.plan);if(outlet[0]<tx||outlet[0]>=tx+G||outlet[1]<ty||outlet[1]>=ty+G)continue;}
      seen.add(source.id);c.save();
      for(let i=0;i<6;i++){
        const phase=(time*.22+i/6)%1,drift=phase*phase*12+Math.sin(time*1.5+i)*2,size=3+Math.floor(phase*6);
        c.globalAlpha=(1-phase)*.23;
        box(c,outlet[0]+drift-size/2,outlet[1]-phase*30-3,size,size-1,'#b8bfb0');
      }
      c.restore();
    }
  }
  function drawBase(canvas,s,clock=0,preview=false,world=false,camera=null){
    const c=canvas.getContext('2d'),[vx,vy,vw,vh]=world?[0,0,480,304]:viewport(s,preview,camera);
    c.imageSmoothingEnabled=false;c.save();c.scale(canvas.width/vw,canvas.height/vh);c.translate(-vx,-vy);
    const environmentPlan=s.plan||root.TownBlueprints.find(p=>p.id===s.blueprint);
    const retreat=environmentPlan?.artStyle==='woodland-v3';
    const time=preview?0:Math.floor(clock*12)/12;
    const wilderness=environmentPlan?.wilderness;
    if(wilderness)root.TownWildernessArt.environment(c,s,time);
    else {if(!retreat||!root.TownCottageArt?.environment(c))ground(c,time);scenery(c,time,retreat);}
    if(!preview){c.save();if(siteScale(s)!==1)c.translate(0,-88);stock(c,s);c.restore();}
    c.save();siteTransform(c,s);
    chimneySmoke(c,s,time,preview);
    const plan=s.plan;if(plan){
      const style=plan.modular?{...plan,layout:plan.recipe.budget.S>plan.recipe.budget.W?'stone':'wood'}:plan;
      const parts=preview?plan.parts:s.installed;
      const light=!root.TownCutawayLighting&&parts.some(p=>p.kind==='lamp');
      if(light){const glow=c.createRadialGradient(290,204,5,290,204,140);glow.addColorStop(0,'#ffe6a660');glow.addColorStop(1,'#ffe6a600');box(c,145,60,300,210,glow);}
      const layers=parts.map(p=>({p,progress:1}));
      const motion=s.active?.motion===root.TownCutawayMotion?.VERSION?root.TownCutawayMotion.sample(s.active):null;
      if(!preview&&motion?.visible&&!plan.gridBuild)layers.push({p:s.active.part,progress:1});
      // Legacy in-flight saves also hide their component until the task finishes.
      layers.sort((a,b)=>renderLayer(a.p,plan)-renderLayer(b.p,plan)||a.p.y-b.p.y);
      for(const {p,progress}of layers){if(plan.artStyle==='creek-v2'&&(p.tileSource||p).kind==='foundation')continue;c.save();if(progress<1){const [x,y,w,h]=houseRect(p,style);c.beginPath();c.rect(x-8,y+h*(1-progress)-7,w+16,h*progress+15);c.clip();}if(plan.modular)modulePart(c,p,style,time);else drawPart(c,p,style,time);c.restore();}
      foregroundStones(c,s,preview,time);
      windowGlass(c,s,preview,false,time);
    }
    if(!retreat&&!wilderness)shrubs(c,time);
    if(wilderness&&!preview)root.TownWildernessArt.gatherOverlay(c,s,time,x=>travelX(s,x));
    root.TownCutawayLighting?.drawEmitters(c,s,time,preview);
    if(preview&&wilderness){pet(c,{x:265,y:272},1,0,'B',false,true);}
    else if(preview&&s.plan?.artStyle?.startsWith('woodland-')){
      pet(c,{x:230,y:256},0,0,null,false,true);
    }else if(preview&&s.plan?.residential){
      pet(c,{x:29,y:269},0,0,null,false,true);
      box(c,42,253,1,16,'#dfdfb5');box(c,40,253,5,1,'#dfdfb5');box(c,40,268,5,1,'#dfdfb5');
      c.fillStyle='#e4e1c0';c.font='8px monospace';c.fillText('1m',47,264);
    }
    if(!preview){
      const a=s.active,pose=a?.motion===root.TownCutawayMotion?.VERSION?root.TownCutawayMotion.sample(a):null;
      const t=s.time; // Pause, speed and save/restore share the simulation clock.
      if(a){
        if(pose&&pose.delivered>0&&!pose.visible){
          for(let j=0;j<Math.min(6,pose.delivered);j++){
            const color=a.materialKinds[j]==='S'?'#929c9b':a.materialKinds[j]==='C'?'#c98569':'#b1834d';
            box(c,a.target.x+10+(j%2)*8,a.target.y-3-Math.floor(j/2)*5,11,4,color);
          }
        }
        const opacity=pose?pose.smoke:a.phase==='install'?1:0;
        if(opacity)smoke(c,a.part,s.plan,t,opacity);
        const worker=s.pets[a.workers[0]];
        if(worker.y<Y-4){
          box(c,worker.x-6,worker.y,2,Y-worker.y,'#816447');box(c,worker.x+6,worker.y,2,Y-worker.y,'#816447');
          for(let yy=worker.y+7;yy<Y;yy+=9)box(c,worker.x-6,yy,14,2,'#c19b66');
        }
      }
      const gathering=wilderness?root.TownWildGather.sample(s.wilderness):null;
      for(let i=0;i<2;i++)pet(c,{...s.pets[i],x:travelX(s,s.pets[i].x)},i,t,
        i===1&&gathering?gathering.held:
        a&&a.workers.includes(i)?pose?pose.held:['carry','climb'].includes(a.phase)?a.part.material:null:null,
        a&&a.workers.includes(i)&&(pose?pose.hammer:a.phase==='install'),!s.plan||!!s.plan.residential);
    }
    c.restore();c.restore();
  }
  // A separate transparent pass supplies only installed material to the lighting shader.
  // Reuse the same clipping/layer order so unfinished cells never acquire surface relief.
  function drawSurface(canvas,s,preview=false,occluders=false,clock=0){
    const c=canvas.getContext('2d');c.clearRect(0,0,canvas.width,canvas.height);
    c.imageSmoothingEnabled=false;
    const plan=s.plan;if(!plan)return;
    const style=plan.modular?{...plan,layout:plan.recipe.budget.S>plan.recipe.budget.W?'stone':'wood'}:plan;
    c.save();c.scale(canvas.width/480,canvas.height/304);siteTransform(c,s);
    for(const p of [...(preview?plan.parts:s.installed)].sort((a,b)=>renderLayer(a,plan)-renderLayer(b,plan)||a.y-b.y)){
      const source=p.tileSource||p;
      if(plan.artStyle==='creek-v2'&&source.kind==='foundation')continue;
      if(occluders&&(source.kind==='wall'||source.asset==='wall')){
        const [x,y,w,h]=houseRect(source,style);
        c.save();
        if(p.tileSource){const [tx,ty]=houseRect(p,style);c.beginPath();c.rect(tx,ty,16,16);c.clip();}
        // Back walls receive light; only the installed side cross-sections block it.
        c.fillStyle='#000';const thickness=plan.artStyle==='creek-v2'?7:4;
        c.fillRect(x,y,thickness,source.openLeft?Math.max(0,h-32):h);
        c.fillRect(x+w-thickness,y,thickness,source.openRight?Math.max(0,h-32):h);
        c.restore();continue;
      }
      if(occluders&&!['foundation','floor','roof','footing','roofLeft','roofRight'].includes(p.asset||p.kind))continue;
      const time=preview||occluders?0:Math.floor(clock*12)/12;
      if(plan.modular)modulePart(c,p,style,time);else drawPart(c,p,style,time);
    }
    foregroundStones(c,s,preview,clock);
    windowGlass(c,s,preview,true,clock);
    c.restore();
  }
  function draw(canvas,s,clock=0,preview=false,camera=null){
    if(root.TownCutawayLighting?.render(canvas,s,clock,preview,camera))return;
    if(canvas.dataset)canvas.dataset.lighting='canvas2d';
    drawBase(canvas,s,clock,preview,false,camera);
  }
  root.TownCutawayRenderer={draw,drawBase,drawSurface,viewport,project,siteScale,drawComponent:modulePart,drawPart,smoke};
})(globalThis);
