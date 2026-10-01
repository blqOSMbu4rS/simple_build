/* Shared work tools and carried objects. Textures are supplied by asset data. */
(function(root){
 'use strict';
 const images={};
 const box=(c,x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
  function roundLog(c,x,y,width=16,height=7,texture=null){
    if(images[texture]){c.drawImage(images[texture],x-width/2,y-height/2,width,height);return;}
    box(c,x-width/2,y-height/2,width,height,'#4b3828');
    box(c,x-width/2+1,y-height/2+1,width-2,height-2,'#725137');
    box(c,x-width/2+3,y-height/2+2,width-5,1,'#8b6845');
    box(c,x+width/2-3,y-height/2+1,2,height-2,'#a27c50');
    box(c,x+width/2-2,y-1,1,2,'#63462f');
  }
  function timberOverlay(c,pose,time,projectX=x=>x,texture=null){
    const ground=pose?.ground??272;
    if(!pose)return;
    if(pose.log){
      const {x,y}=pose.log;
      roundLog(c,projectX(x),y,pose.log.length||16,pose.log.diameter||7,texture);
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
        box(c,x+side*6,ground-19+hit*6,2,13,'#876344');
        box(c,x+side*6-3,ground-20+hit*6,8,3,'#697572');
      });
    }else if(pose.phase==='cut'){
      const center=projectX(pose.log.x)-(pose.whole?30:0),stroke=Math.round(Math.sin(time*10)*2);
      box(c,center-10+stroke,ground-7,20,2,'#77817a');
      box(c,center-12+stroke,ground-9,2,5,'#805d3c');box(c,center+10+stroke,ground-9,2,5,'#805d3c');
      box(c,center-4,ground-1,3,1,'#8f6a43');
    }
  }
  function mudOverlay(c,pose,time,projectX=x=>x){
    if(!pose?.mud)return;
    const x=projectX(pose.x),y=pose.y;
    if(pose.phase==='mix'){
      const stroke=Math.round(Math.sin(time*7)*3);
      box(c,x+8+stroke,y-15,2,13,'#947447');
      box(c,x+5+stroke,y-3,8,2,'#8e6945');
      box(c,x+4+stroke,y-10,5,3,'#d8b38b');
    }else if(['load-mud','carry','climb','deliver','seal'].includes(pose.phase)){
      // A mud pail and a small trowel replace the generic hammer animation.
      box(c,x+7,y-11,9,7,'#493e30');box(c,x+8,y-10,7,5,'#806044');
      box(c,x+8,y-11,7,2,'#987052');
      if(pose.phase==='seal'){
        const stroke=Math.round(Math.sin(time*8)*2);
        box(c,x+7,y-14+stroke,6,3,'#d8b38b');
        box(c,x+12,y-15+stroke,3,2,'#876443');
        box(c,x+15,y-14+stroke,5,2,'#7b8072');
      }
    }
  }
  function gatherOverlay(c,s,time,projectX=x=>x,texture=null){
    const ground=s.wilderness?.active?.site.ground??272;
    const sampled=root.TownWildGather?.sample(s.wilderness);if(!sampled)return;const pose={...sampled,ground};
    if(pose.treeId){
      // The single carrier uses the existing held-material drawing while walking.
      timberOverlay(c,pose.team||!['pickup','gather-carry','stock'].includes(pose.phase)?pose:{...pose,log:null},time,projectX,texture);
      return;
    }
    const p={...pose,x:projectX(pose.x)};
    if(['chop','cut'].includes(p.phase)){
      const hit=Math.floor(time*9)%2;box(c,p.x+8,ground-22+hit*5,2,14,'#9b7146');box(c,p.x+4,ground-23+hit*5,9,4,'#818b86');
      box(c,p.x+13,ground-9,3,2,'#977443');
    }else if(p.phase==='mix'||p.phase==='dig'){
      box(c,p.x+8,ground-15,2,12,'#947447');box(c,p.x+4,ground-4,13,2,'#8e6945');
      box(c,p.x+5+Math.floor(time*4)%4,ground-6,3,1,'#ab8254');
    }else if(p.phase==='fill-water')box(c,p.x+4,ground-4,6,4,'#698b90');
  }
  const treeLeaves=new WeakMap();
  function leafClusters(source,spots){
    const still=document.createElement('canvas');still.width=source.width;still.height=source.height;
    const fixed=still.getContext('2d');fixed.drawImage(source,0,0);
    const patches=spots.map(([cx,cy,rx,ry])=>{
      const x=Math.round(cx-rx),y=Math.round(cy-ry),image=document.createElement('canvas');
      image.width=Math.ceil(rx*2);image.height=Math.ceil(ry*2);const p=image.getContext('2d');
      // Separate irregular crown silhouettes, copied once with crisp pixel edges.
      // Every extracted cluster subsequently moves as one intact sprite.
      for(let row=0;row<image.height;row++){
        const v=(row+.5)/ry-1,radius=Math.sqrt(Math.max(0,1-v*v))*rx*(.9+.1*Math.sin(row*1.7));
        const left=Math.ceil(rx-radius),w=Math.max(0,Math.floor(rx+radius)-left);
        if(w){p.drawImage(source,x+left,y+row,w,1,left,row,w,1);fixed.clearRect(x+left,y+row,w,1);}
      }
      return {image,x,y};
    });
    return {still,patches};
  }
  function drawLeafClusters(c,group,time,scale=1,phase=0){
    c.drawImage(group.still,0,0);
    for(const [i,p]of group.patches.entries()){
      const t=phase+i*.73,dx=Math.round(wind(time,t)*scale*1.05);
      const dy=Math.round((Math.sin(time*.8+t)-Math.sin(t))*scale*.35);
      c.drawImage(p.image,p.x+dx,p.y+dy);
    }
  }
  function wind(time,phase=0){return (Math.sin(time*.9+phase)-Math.sin(phase))*(.7+.3*Math.sin(time*.23)**2);}
  function standingTree(c,x,y,index,time=0,angle=0,art={}){
    const image=images[art.textures?.[index%(art.textures.length||1)]];
    if(image){
      c.save();c.translate(x,y);c.rotate(angle);
      const h=(art.heights||[88,94,90,92])[index%(art.heights?.length||4)],w=h*image.width/image.height;
      if(angle)c.drawImage(image,-w/2,-h,w,h);
      else{
        if(!treeLeaves.has(image))treeLeaves.set(image,leafClusters(image,
          [[.45,.25,.23,.075],[.2,.4,.18,.07],[.82,.45,.16,.08]].map(([cx,cy,rx,ry])=>[cx*image.width,cy*image.height,rx*image.width,ry*image.height])));
        c.translate(-w/2,-h);c.scale(w/image.width,h/image.height);
        drawLeafClusters(c,treeLeaves.get(image),time,image.height/h,index*.8);
      }c.restore();return;
    }
    c.save();c.translate(x,y);c.rotate(angle);
    const height=[42,49,38,45][index%4];
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
    const plan=s.plan||root.TownBlueprints.find(p=>p.id===s.blueprint),site=root.TownConstructionConfig.site(plan),art=site.view.trees||{};
    if(!site.gathering?.trees?.length)return;
    const list=s.wilderness?.trees||site.gathering.trees.map((x,i)=>({id:'tree-'+i,x,felled:false}));
    const pose=preview?null:root.TownWildGather?.sample(s.wilderness);
    for(const [i,tree]of list.entries()){
      const x=projectX(tree.x),falling=pose?.treeId===tree.id&&pose.phase==='fell';
      if(!tree.felled&&!falling)standingTree(c,x,site.ground,i,time,0,art);
      else{
        if(images[art.stump])c.drawImage(images[art.stump],x-6,site.ground-8,12,8);
        else{box(c,x-4,site.ground-4,8,4,'#5b432f');box(c,x-3,site.ground-4,6,2,'#98764b');}
        if(falling)standingTree(c,x,site.ground-2,i,time,pose.progress*Math.PI/2,art);
        else if(tree.remaining>0){
          // Depleted source trees leave only a stump.
          if(images[art.fallen])c.drawImage(images[art.fallen],x,site.ground-23,80,23);
          else roundLog(c,x+40,site.ground-4,80,6.4);
        }
      }
    }
  }
 function installedLog(c,p,x,y,w,h,view={}){
  c.save();c.beginPath();c.rect(x,y,w,h);c.clip();roundLog(c,x+w/2,y+h/2,w,h,view.logTexture);
  const side=images[view.timberEdgeTexture],source=p.tileSource||p,sy=272-(source.y+source.h)*16;
  if(side){const edge=view.timberEdgeWidth||7;c.drawImage(side,x,sy,edge,source.h*16);c.drawImage(side,x+w-edge,sy,edge,source.h*16);}
  c.restore();
 }
 root.TownPetWorkArt={timberOverlay,mudOverlay,gatherOverlay,installedLog,trees,leafClusters,drawLeafClusters,registerTexture:(key,image)=>{images[key]=image;}};
})(globalThis);
