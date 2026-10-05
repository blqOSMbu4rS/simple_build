/* Shared, deterministic atmosphere. Scene differences are authored data only. */
(function(root){
  'use strict';
  const modes=['clear','rain','snow'],W=480,H=304;
  let cache=null;
  const planOf=s=>s.plan||root.TownBlueprints.find(p=>p.id===s.blueprint);
  const mode=(s,override)=>modes.includes(override)?override:modes.includes(planOf(s)?.environment?.weather)?planOf(s).environment.weather:'clear';
  const mod=(n,m)=>(n%m+m)%m;
  function dimensions(s){return planOf(s)?.construction?.view?.worldSize||[W,H];}
  function cover(s,preview){
    const plan=planOf(s),parts=preview?plan?.parts||[]:s.installed||[];
    const roofs=parts.filter(p=>p.weatherCover??['roof','roofLeft','roofRight','awning'].includes(p.kind||p.asset));
    const revision=(root.TownWildernessArt?.revision||0)+(root.TownCottageArt?.revision||0)+(root.TownDiagonalRenderer?.revision||0);
    const key=roofs.map(p=>p.id).join('|');
    if(cache?.plan===plan&&cache.key===key&&cache.revision===revision)return cache.top;
    const [width,height]=dimensions(s),top=Array(width).fill(height),mask=document.createElement('canvas');mask.width=width;mask.height=height;
    const c=mask.getContext('2d',{willReadFrequently:true}),R=root.TownCutawayRenderer;
    const state=s.plan?s:{...s,plan},[x,y]=R.project(state,0,0),scale=R.siteScale(state);
    if(plan?.construction?.view?.projection==='diagonal')root.TownDiagonalRenderer.roofMask(c,plan,roofs);
    else{c.translate(x,y);c.scale(scale,scale);for(const p of roofs)R.drawPart(c,p,plan,0);}
    const pixels=c.getImageData(0,0,width,height).data;
    for(let x=0;x<width;x++)for(let y=0;y<height;y++)if(pixels[(y*width+x)*4+3]>96){top[x]=y;break;}
    cache={plan,key,revision,top};return top;
  }
  function particles(kind,time,width=W,height=H){
    const rain=kind==='rain',count=rain?180:130;
    return Array.from({length:count},(_,i)=>{
      const near=i%3===0,speed=rain?(near?155:108):(near?17:10);
      return {x:Math.floor(mod(i*73.31+time*(rain?-23:7)+(!rain?Math.sin(time*.8+i)*7:0),width)),
        y:Math.floor(mod(i*41.73+time*speed,height+16)-8),near,length:rain?(near?8:5):(near?2:1)};
    });
  }
  function draw(canvas,s,clock=0,preview=false,camera=null,override){
    const kind=mode(s,override);if(kind==='clear')return;
    const time=preview?0:Math.floor(clock*12)/12,top=cover(s,preview),R=root.TownCutawayRenderer,[width,height]=dimensions(s);
    const c=canvas.getContext('2d'),[vx,vy,vw,vh]=R.viewport(s,preview,camera),rain=kind==='rain';
    c.save();c.imageSmoothingEnabled=false;c.scale(canvas.width/vw,canvas.height/vh);c.translate(-vx,-vy);
    // Shelter ends at the house ground line; the foreground yard stays outdoors.
    const bottom=Math.min(height,Math.max(0,planOf(s)?.construction?.view?.weatherGround??R.project(s,0,272)[1]));
    // Only installed roof pixels shelter the cutaway. Unbuilt gaps remain exposed.
    c.beginPath();let start=0;
    for(let x=1;x<=width;x++)if(x===width||top[x]!==top[start]){
      if(top[start]<bottom){c.rect(start,0,x-start,top[start]);c.rect(start,bottom,x-start,height-bottom);}
      else c.rect(start,0,x-start,height);
      start=x;
    }
    c.clip();c.fillStyle=rain?'#163653':'#b3cee1';c.globalAlpha=rain?.22:.15;c.fillRect(0,0,width,height);
    for(const p of particles(kind,time,width,height)){
      c.fillStyle=rain?'#b1cbd8':'#e4eff2';c.globalAlpha=p.near?(rain?.55:.88):(rain?.28:.48);
      if(rain){for(let k=0;k<p.length;k++)c.fillRect(p.x-Math.floor(k/4),p.y+k,1,1);}
      else{c.fillRect(p.x,p.y,p.length,p.length);if(p.near&&p.x%5===0)c.fillRect(p.x-1,p.y+1,4,1);}
    }
    const [gx,gy,gw,gh]=planOf(s)?.environment?.ground||[0,274,480,30];
    for(let i=0;i<46;i++){
      const x=Math.floor(gx+mod(i*67.3,gw)),y=Math.floor(gy+mod(i*31.7,gh));
      c.globalAlpha=rain?.32:.58;c.fillStyle=rain?'#93bbc6':'#d5e4e7';
      if(rain){const phase=mod(time*1.7+i*.37,1);if(phase<.28){c.fillRect(x-2,y,2,1);c.fillRect(x+2,y,2,1);if(phase<.12)c.fillRect(x,y-2,1,1);}}
      else c.fillRect(x,y,2+i%3,1);
    }
    if(!rain){c.globalAlpha=.8;c.fillStyle='#dae8eb';for(let x=0;x<width;x++)if(top[x]<height&&x%7<5)c.fillRect(x,Math.max(0,top[x]-1),1,1);}
    c.restore();
  }
  root.TownCutawayWeather={modes,mode,draw,cover,particles};
})(globalThis);
