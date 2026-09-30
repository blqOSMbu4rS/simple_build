/* Authored pixel components for the woodland cottage. Each is independently
   clipped to its installed 16px construction cell by cutaway-renderer. */
(function(root){
  'use strict';
  const ink='#292924',wood='#73553c',lit='#af885a',warm='#d0ad73',leaf='#67816a';
  // Each region is an isolated object, never a slice of a furnished room.
  const regions={shelf:[94,4,265,466],table:[427,128,522,342],chair:[991,84,215,377],
    bench:[16,557,501,282],cabinet:[553,473,367,366],plant:[966,478,273,366],
    window:[36,850,458,385],curtains:[525,849,398,397],'wall-shelf':[938,867,304,373]};
  let atlas,roofImage,wallImage,sectionRoof,frontAtlas,forest;
  const frontRegions={shelf:[59,14,393,493],table:[476,143,449,356],chair:[950,127,332,376],
    bench:[46,606,557,239],cabinet:[620,515,292,333],plant:[954,507,337,341],
    curtains:[66,859,518,337],'wall-shelf':[706,851,541,347]};
  const api={draw,environment,lampAnchor,revision:0};
  // Flame coordinates are authored in the independent furniture atlas. Keep
  // presentation anchors separate from the immutable construction/save plan.
  function lampAnchor(plan,source){
    if(plan.artStyle!=='woodland-v3')return null;
    const spec={lamp:['desk','table',821,195],'reading-lamp':['books','shelf',236,283],
      'cabinet-lamp':['cabinet','cabinet',797,590],'wall-shelf':['wall-shelf','wall-shelf',1018,1137]}[source.id];
    if(!spec)return null;
    const part=plan.parts.map(p=>p.tileSource||p).find(p=>p.id===spec[0]);if(!part)return null;
    const r=frontRegions[spec[1]],w=part.w*16,h=part.h*16,scale=Math.min((w-1)/r[2],(h-1)/r[3]);
    const dw=Math.round(r[2]*scale*2)/2,dh=Math.round(r[3]*scale*2)/2;
    return {x:240+part.x*16+(w-dw)/2+(spec[2]-r[0])*dw/r[2],
      y:272-(part.y+part.h)*16+h-dh+(spec[3]-r[1])*dh/r[3],glass:spec[1]==='table'?[5,2.5]:[3,4]};
  }
  function loadImage(source,accept){return typeof Image==='undefined'?Promise.resolve(false):new Promise(resolve=>{
    if(!source){resolve(false);return;}
    const image=new Image();
    image.onload=()=>{accept(image);api.revision++;resolve(true);};
    image.onerror=()=>resolve(false);
    image.src=source;
  });}
  api.ready=Promise.all([
    loadImage(root.TownCottageAtlas,image=>{atlas=image;}),
    loadImage(root.TownCottageRoof,image=>{roofImage=image;}),
    loadImage(root.TownCottageWall,image=>{wallImage=image;}),
    loadImage(root.TownCottageSectionRoof,image=>{sectionRoof=image;}),
    loadImage(root.TownCottageFrontAtlas,image=>{frontAtlas=image;}),
    loadImage(root.TownCottageForest,image=>{forest=image;})
  ]).then(results=>results.every(Boolean));
  function sprite(c,kind,x,y,w,h){
    const r=regions[kind],scale=Math.min(w/r[2],h/r[3]);
    const dw=Math.round(r[2]*scale*2)/2,dh=Math.round(r[3]*scale*2)/2;
    c.imageSmoothingEnabled=false;
    c.drawImage(atlas,...r,x+(w-dw)/2,y+h-dh,dw,dh);
  }
  let roofCache;
  const sectionCache=new Map();
  function sectionTexture(kind,image,bounds,w,h,fit=false){
    const key=kind+':'+w+':'+h;
    if(sectionCache.has(key))return sectionCache.get(key);
    const canvas=document.createElement('canvas');canvas.width=w*2;canvas.height=h*2;
    const context=canvas.getContext('2d');context.scale(2,2);context.imageSmoothingEnabled=false;
    const scale=Math.min(w/bounds[2],h/bounds[3]);
    const dw=fit?Math.round(bounds[2]*scale*2)/2:w,dh=fit?Math.round(bounds[3]*scale*2)/2:h;
    context.drawImage(image,...bounds,(w-dw)/2,h-dh,dw,dh);
    sectionCache.set(key,canvas);return canvas;
  }
  function roofTexture(w,h){
    if(roofCache&&roofCache.width===w*2&&roofCache.height===h*2)return roofCache;
    roofCache=document.createElement('canvas');roofCache.width=w*2;roofCache.height=h*2;
    const c=roofCache.getContext('2d');c.scale(2,2);c.imageSmoothingEnabled=false;
    // Keep the central features together at uniform scale. The outer eave
    // strips span the 12m roof; 2px headroom keeps sloped corners inside its cells.
    const sw=2149,sh=612,scale=Math.min(w/sw,(h-2)/sh),dh=Math.round(sh*scale*2)/2;
    c.fillStyle='#392d23';c.fillRect(16,h-5,w-32,5);
    c.fillStyle='#785537';c.fillRect(17,h-2,w-34,1);
    const edge=320,wing=Math.round((w-(sw-edge*2)*scale)/2),center=w-wing*2;
    c.drawImage(roofImage,11,93,edge,sh,0,h-dh,wing,dh);
    c.drawImage(roofImage,11+edge,93,sw-edge*2,sh,wing,h-dh,center,dh);
    c.drawImage(roofImage,11+sw-edge,93,edge,sh,wing+center,h-dh,wing,dh);
    return roofCache;
  }
  function environment(c){
    if(!forest)return false;
    c.imageSmoothingEnabled=false;
    // The source ground edge is at row 779. Align it with the simulation floor.
    c.drawImage(forest,0,0,forest.width,779,0,0,480,272);
    c.drawImage(forest,0,779,forest.width,forest.height-779,0,272,480,32);
    return true;
  }
  function retreat(c,p,w,h){
    const b=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(x,y,w,h);};
    if(p.kind==='foundation'){
      b(0,0,w,2,'#8a7250');b(0,2,w,1,'#403c2d');b(0,3,w,h-3,'#1d302e');
      for(let x=0;x<w;x+=9){const y=4+(x%3);b(x+.5,y,8,5,'#4b5b50');b(x+1,y,6,.5,'#84917a');b(x+2,y+1,2,.5,'#697766');
        b(x+1,y+5,7,2,'#293d36');b(x+2,y+7,5,1,'#354e3b');}
      return true;
    }
    if(p.kind==='wall'){
      b(0,0,w,h,'#354b49');
      // Frontal wallpaper and shallow paneling; narrow stone section edges.
      for(let x=6;x<w-6;x+=4){b(x,0,.5,h-22,'#3c5350');
        for(let y=5;y<h-22;y+=8){b(x+1,y,.5,1,'#5d6e5c');b(x,y+1,1,.5,'#4b6055');}}
      b(5,h-23,w-10,22,'#493c30');b(5,h-23,w-10,1,'#96774f');
      for(let x=6;x<w-5;x+=11){b(x,h-21,.5,19,'#9a7850');b(x+1,h-20,8,17,'#514335');b(x+2,h-18,.5,12,'#69533b');}
      for(const x of [0,w-5]){
        b(x,0,5,h,'#303d39');
        for(let y=0;y<h;y+=7){b(x+.5,y,4,6,'#647064');b(x+1,y,3,.5,'#a3a085');b(x+1+(y%2),y+2,1,2,'#7e8773');b(x,y+6,5,1,'#263531');}
        b(x+(x?0:4.5),0,.5,h,'#b19769');
      }
      return true;
    }
    if(p.kind==='roof'){
      // A shallow bowed contour, with staggered slate edges and moss clusters.
      for(let x=0;x<w;x+=.5){
        const t=x/w,curve=Math.round(6*Math.pow(Math.abs(t-.5)*2,2)*2)/2;
        const top=11+curve+(Math.floor(x/7)%3)*.5;
        b(x,top,.5,10,'#273c3c');b(x,top+2,.5,3,'#526461');
        b(x,top+5,.5,5,'#334c4a');b(x,top+10,.5,3,'#332e27');
        b(x,top+12,.5,.5,'#877852');
      }
      for(let x=1;x<w-5;x+=5){const curve=Math.round(6*Math.pow(Math.abs(x/w-.5)*2,2)*2)/2;
        const y=11+curve;b(x,y,4,.5,'#8a9380');b(x+1,y+3,4,.5,'#718378');
        b(x+3,y+5,.5,4,'#203836');b(x,y+9,3,.5,'#60796a');
        if(x%4===1){b(x,y-1.5,3,2,'#587448');b(x+1,y-2,1,.5,'#839159');}
      }
      for(const x of [14,45,w-34]){b(x,9,1,6,'#4d6541');b(x-2,10,3,1,'#739055');b(x+1,8,3,1,'#657f4a');}
      return true;
    }
    if(p.kind==='window'){
      b(1,1,w-2,h-2,'#292e28');b(3,3,w-6,h-6,'#28464e');
      for(let x=4;x<w-4;x+=9){b(x,6,1,h-13,'#3b6265');b(x-2,14,5,1,'#4a7576');}
      b(3,h-9,w-6,4,'#405d5b');b(2,2,w-4,1,'#9d7c51');
      b(w/2-1,3,2,h-5,'#8a6948');b(3,h/2,w-6,1,'#7f684b');
      b(0,h-3,w,3,'#795c40');b(0,h-3,w,.5,'#bc9863');return true;
    }
    if(p.kind==='lamp'&&p.invisible)return true;
    const r=frontRegions[p.kind];
    if(frontAtlas&&r){
      const scale=Math.min((w-1)/r[2],(h-1)/r[3]),dw=Math.round(r[2]*scale*2)/2,dh=Math.round(r[3]*scale*2)/2;
      c.imageSmoothingEnabled=false;
      c.drawImage(frontAtlas,...r,(w-dw)/2,h-dh,dw,dh);return true;
    }
    return false;
  }
  function draw(c,p,x,y,w,h){
    c.save();c.translate(x,y);
    if(p.appearance==='retreat-v3'&&retreat(c,p,w,h)){c.restore();return;}
    if(p.kind==='roof'&&p.appearance==='section-v2'&&sectionRoof){
      c.imageSmoothingEnabled=false;
      c.drawImage(sectionTexture('roof',sectionRoof,[17,95,2144,557],w,h,true),0,0,w,h);
      c.restore();return;
    }
    if(p.kind==='wall'&&p.appearance==='section-v2'&&wallImage){
      c.imageSmoothingEnabled=false;
      c.drawImage(sectionTexture('wall',wallImage,[64,66,1855,649],w,h),0,0,w,h);
      c.restore();return;
    }
    if(p.kind==='roof'&&roofImage){
      c.imageSmoothingEnabled=false;
      c.drawImage(roofTexture(w,h),0,0,w,h);
      c.restore();return;
    }
    if(atlas&&regions[p.kind]){
      const bounds=p.kind==='table'?[1,h-30,w-2,30]:p.kind==='chair'?[1,h-26,w-2,26]:
        p.kind==='cabinet'?[0,h-32,w,32]:p.kind==='plant'?[0,h-34,w,34]:[0,0,w,h];
      if(p.kind==='curtains'){
        // Curtain drops keep their aspect; the empty span follows the window width.
        const r=regions.curtains;
        c.imageSmoothingEnabled=false;
        c.drawImage(atlas,r[0],r[1],137,r[3],0,0,16,h);
        c.drawImage(atlas,r[0]+261,r[1],137,r[3],w-16,0,16,h);
        c.fillStyle=wood;c.fillRect(0,0,w,2);
      }else sprite(c,p.kind,...bounds);
      c.restore();return;
    }
    const b=(x,y,w,h,color)=>{c.fillStyle=color;c.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h));};
    // Fixed integer patterns: texture does not change when another cell installs.
    function grain(x,y,w,h,seed=0){
      for(let i=0;i<Math.ceil(w*h/38);i++){
        const xx=(i*29+seed*13)%Math.max(1,w-4),yy=(i*17+seed*7)%Math.max(1,h-1);
        b(x+xx,y+yy,2+i%3,1,i%3?'#846246':'#b08a5b');
      }
    }
    function plank(x,y,w,h){b(x,y,w,h,ink);b(x+1,y+1,w-2,h-2,wood);b(x+1,y+1,w-2,1,lit);grain(x+2,y+2,w-4,h-3);}
    function timber(x,y,w,h){
      plank(x,y,w,h);
      if(atlas){
        c.imageSmoothingEnabled=false;
        // Reuse actual timber from the furniture atlas for a consistent finish.
        if(h>w)c.drawImage(atlas,107,66,17,350,x+1,y+1,w-2,h-2);
        else for(let xx=1;xx<w-1;xx+=24){
          const length=Math.min(24,w-1-xx);
          c.drawImage(atlas,131,39,length*3,15,x+xx,y+1,length,h-2);
        }
      }
      c.fillStyle='#ba8c51';c.fillRect(x+1,y+1,w-2,.5);
      c.fillStyle='#302a22';c.fillRect(x+w-1,y+1,.5,h-1);
    }
    function pot(x,y){b(x-4,y-5,8,2,'#b18860');b(x-3,y-3,6,5,'#825544');b(x-2,y-2,2,3,'#b07650');b(x,y-15,1,10,'#52634b');
      for(const [dx,dy]of [[-4,-12],[2,-14],[-3,-17],[1,-20]]){b(x+dx,y+dy,4,2,leaf);b(x+dx+1,y+dy-1,2,1,'#91a177');}}
    function books(x,y,w){
      for(let i=0;i<w-3;i+=4){const hh=7+(i*7%5);b(x+i,y-hh,3,hh,['#8d6251','#738677','#b39b69','#627b80'][i/4%4]);b(x+i,y-hh+2,2,1,'#c3af80');b(x+i+3,y-hh,1,hh,'#363832');}
    }
    switch(p.kind){
      case 'foundation':
        b(0,2,w,h-2,'#343832');
        // Staggered fieldstone: chipped corners, narrow mortar and varied faces.
        for(let row=0;row<2;row++)for(let xx=-row*7;xx<w;xx+=13){
          const left=Math.max(0,xx),right=Math.min(w,xx+12),yy=5+row*5;
          const tone=['#7a7864','#666b5c','#85816d','#747364'][Math.abs(xx+row*3)%4];
          b(left+1,yy,right-left-2,5,tone);b(left,yy+1,right-left,3,tone);
          b(left+2,yy,right-left-4,1,'#a39b7c');b(left+2,yy+4,right-left-3,1,'#4f574b');
          c.fillStyle='#b0a587';c.fillRect(left+3,yy+1,2,.5);
          if(xx%3===0){b(left+4,yy+2,2,1,'#525b4d');b(left+5,yy+3,1,1,'#525b4d');}
          if(xx%4===0)b(left+1,yy+4,4,1,'#5c7048');
        }
        plank(0,0,w,4);b(0,4,w,1,'#242b27');break;
      case 'wall':
        b(0,0,w,h,'#394b47');
        for(let i=0;i<700;i++){
          const xx=4+i*37%(w-8),yy=4+i*23%(h-8);
          c.fillStyle=['#41534b','#35453f','#4a594d','#3c504a'][i%4];c.fillRect(xx,yy,1+(i%3)*.5,.5);
        }
        timber(0,0,w,7);timber(0,0,6,h);timber(w-6,0,6,h);timber(0,h-5,w,5);
        for(let xx=17;xx<w-5;xx+=26){b(xx,7,2,h-12,'#33423a');b(xx+2,7,1,h-12,'#59604a');}
        b(5,7,w-10,3,'#273833');
        // Fine timber streaks and iron pins share the furniture's texel pitch.
        for(let xx=7;xx<w-8;xx+=7){
          c.fillStyle=xx%3?'#493a2c':'#b18c58';c.fillRect(xx,2+(xx%3),4,.5);
          c.fillStyle='#433a2d';c.fillRect(xx,h-3,5,.5);
        }
        for(const xx of [1,w-4])for(const yy of [2,h-4]){
          c.fillStyle='#242923';c.fillRect(xx,yy,2,2);c.fillStyle='#8c8060';c.fillRect(xx,yy,1,.5);
        }
        // Carved knee braces, lower timber panels and restrained edge weathering.
        for(const side of [0,1])for(let yy=8;yy<19;yy++){
          const xx=side?w-6-(19-yy):5;
          b(xx,yy,19-yy,1,'#4a392b');b(side?xx:xx+18-yy,yy,1,1,'#9c784e');
        }
        for(let xx=6;xx<w-5;xx+=9){
          b(xx,h-15,8,9,xx%2?'#4c4937':'#514936');b(xx,h-15,8,1,'#6e6245');
          c.fillStyle='#827051';c.fillRect(xx+1,h-12,.5,5);
        }
        for(const side of [0,1]){
          const xx=side?w-7:0;
          // Stepped capitals, a recessed carved diamond, and forged joint straps.
          timber(xx,5,7,4);timber(xx,h-9,7,4);
          b(xx+1,1,5,3,'#33352d');b(xx+2,2,1,1,'#b89a62');b(xx+5,2,1,1,'#b89a62');
          for(let yy=10;yy<23;yy++){
            const offset=Math.floor((yy-10)/2),bx=side?w-7-offset:6+offset;
            b(bx,yy,2,1,'#402e21');c.fillStyle='#a37a46';c.fillRect(bx,yy,.5,1);
          }
          for(let yy=0;yy<5;yy++){
            const span=yy<3?yy:4-yy;
            c.fillStyle=yy<2?'#ae824a':'#483525';c.fillRect(xx+3-span*.5,25+yy,1+span,.5);
          }
          b(xx+1,h-14,5,2,'#393a30');b(xx+2,h-14,1,1,'#a99769');
        }
        break;
      case 'roof':
        // A short flat ridge and pixel-stepped hips fit the existing roof cells.
        for(let yy=2;yy<h-4;yy++){
          const half=Math.round(w/8+(yy-2)*(w*3/8)/(h-7)),left=w/2-half,right=w/2+half;
          b(left,yy,half*2,1,'#263b37');
          if(half>2)b(left+2,yy,half*2-4,1,'#45665c');
          b(left,yy,2,1,'#9b9c73');b(right-2,yy,2,1,'#344a42');
          for(let xx=left+3;xx<right-3;xx++){
            const seam=(xx+Math.floor(yy/5)%2*5)%11;
            if(yy%5===4){c.fillStyle='#2e4841';c.fillRect(xx,yy,1,.5);}
            else if(seam===0)b(xx,yy,1,1,'#304d45');
            else if(yy%5===0&&seam>1)b(xx,yy,1,1,(Math.floor(xx/11)+yy)%3?'#678475':'#81917a');
            else if(seam===3&&yy%5===2){c.fillStyle='#567668';c.fillRect(xx,yy,3,.5);}
          }
        }
        plank(w*3/8,2,w/4,3);
        // Recessed dormer with timber cheeks, blue glazing and a flower-box sill.
        plank(w/2-21,14,42,27);b(w/2-17,17,34,20,'#172f39');
        for(let xx=0;xx<3;xx++){
          b(w/2-16+xx*11,18,9,17,'#315669');b(w/2-15+xx*11,19,2,11,'#698d94');
          b(w/2-13+xx*11,30,6,4,'#254654');
          for(let yy=24;yy<34;yy+=2){
            const width=2+(yy-24)/2;
            b(w/2-12+xx*11-Math.floor(width/2),yy,width,1,'#263f45');
          }
        }
        plank(w/2-23,11,46,4);plank(w/2-20,36,40,4);
        for(let xx=w/2-18;xx<w/2+19;xx+=4){
          b(xx,35-(xx%3),3,3,'#617d49');b(xx+1,34-(xx%3),2,1,'#99a76b');
          if(xx%3===0)b(xx,34,1,1,'#c3a479');
        }
        for(const xx of [37,w-65]){
          if(atlas){
            c.imageSmoothingEnabled=false;
            c.drawImage(atlas,966,478,273,190,xx,23,24,14);
          }else pot(xx+12,34);
          plank(xx+1,36,22,4);b(xx+3,36,18,1,'#b1925e');
        }
        for(const start of [39,w-51])for(let yy=32;yy<43;yy+=2){
          const xx=start+Math.round(Math.sin(yy)*2);b(xx,yy,1,3,'#4e653e');b(xx-2,yy,3,1,'#7f945c');
        }
        plank(0,h-4,w,4);
        for(let xx=7;xx<w-6;xx+=12){b(xx,h-3,3,1,'#bd9a62');b(xx+3,h-2,5,1,'#46392c');}
        break;
      case 'window':
        plank(0,0,w,h);b(3,3,w-6,h-6,'#203b46');
        for(let yy=4;yy<h-4;yy++)b(4,yy,w-8,1,yy<h/2?'#314d59':'#263f43');
        for(let i=0;i<11;i++){
          const xx=4+i*13%(w-8);b(xx,5,2,h-10,i%2?'#203d3e':'#426063');
          for(let j=0;j<4;j++)b(Math.max(3,xx-4),7+j*9+(i%3),Math.min(11,w-xx),3,'#294c48');
        }
        b(4,4,w-8,1,'#6a8581');plank(w/2-2,2,4,h-4);plank(2,h/2, w-4,3);plank(0,h-4,w,4);break;
      case 'curtains':
        b(0,1,w,2,'#b59964');b(0,0,3,4,wood);b(w-3,0,3,4,wood);
        for(const side of [0,1])for(let yy=4;yy<h-4;yy++){
          const width=yy<h*.64?10-Math.floor(yy/8):7+Math.floor((yy-h*.64)/4);
          const xx=side?w-width:0;
          b(xx,yy,width,1,'#566758');b(xx+(side?1:width-3),yy,2,1,'#8a8960');
          if(yy%6===0)b(xx+3,yy,2,1,'#b19b63');
        }
        b(0,Math.floor(h*.65),7,2,'#c0a169');b(w-7,Math.floor(h*.65),7,2,'#c0a169');break;
      case 'door':
        timber(0,0,w,h);b(3,3,w-6,h-5,'#3c4d42');b(4,4,2,h-8,'#788267');b(w-5,h/2,2,2,'#c6a768');
        b(6,5,w-10,h-10,'#30413b');b(6,5,w-10,1,'#9a8258');
        for(const yy of [7,h-7]){b(2,yy,4,1,'#30352d');b(3,yy,1,1,'#a9915f');}break;
      case 'shelf':
        b(1,1,w-2,h-1,ink);b(4,4,w-8,h-7,'#3b3730');plank(1,1,3,h-1);plank(w-4,1,3,h-1);
        for(let yy=16;yy<h;yy+=15){books(5,yy-2,w-10);plank(2,yy,w-4,3);}plank(1,h-4,w-2,4);break;
      case 'cabinet':
        plank(1,h-24,w-2,24);plank(0,h-25,w,4);
        for(let yy=h-19;yy<h-3;yy+=8){b(4,yy,w-8,6,'#876649');b(5,yy,w-10,1,lit);b(w/2-1,yy+3,3,1,'#ceb07a');}
        pot(9,h-27);books(19,h-25,10);break;
      case 'wall-shelf':
        plank(0,14,w,3);books(2,14,18);pot(w-6,13);b(3,17,2,4,wood);b(w-5,17,2,4,wood);
        // A framed botanical print beneath the shelf.
        plank(7,21,12,10);b(9,23,8,6,'#b9b08b');b(13,24,1,5,'#576b51');b(11,25,4,1,'#687958');break;
      case 'bench':
        plank(0,h-7,w,7);b(2,h-10,w-4,4,'#56756b');b(3,h-10,w-6,1,'#829886');
        b(3,h-16,9,7,'#98745b');b(4,h-15,6,1,'#bc9b72');b(17,h-15,10,6,'#718371');b(20,h-14,2,3,'#b29f6c');break;
      case 'rug':
        b(0,h-5,w,5,'#413831');b(2,h-5,w-4,4,'#936454');b(4,h-4,w-8,2,'#697963');
        for(let xx=5;xx<w-5;xx+=6){
          c.fillStyle='#c4a478';c.fillRect(xx,h-3.5,3,.5);c.fillRect(xx+1,h-4,1,1.5);
          c.fillStyle='#694839';c.fillRect(xx+1,h-3.5,1,.5);
        }
        for(let xx=1;xx<w-1;xx+=2){c.fillStyle='#b6a17a';c.fillRect(xx,h-1,.5,1);}
        break;
      case 'table':
        plank(2,h-18,w-4,4);plank(4,h-14,3,14);plank(w-7,h-14,3,14);b(7,h-13,w-14,3,'#4d3e30');
        b(11,h-21,15,3,'#c4b591');b(18,h-21,1,3,'#7c765d');b(12,h-20,4,1,'#7c806b');
        b(28,h-24,4,6,'#b4bb9b');b(32,h-23,2,3,'#7b8e7d');b(29,h-24,2,1,'#45473a');break;
      case 'chair':
        plank(2,h-25,3,25);plank(w-5,h-25,3,25);plank(2,h-25,w-4,4);
        b(6,h-20,2,9,'#9a754e');b(10,h-20,2,9,'#9a754e');plank(1,h-11,w-2,3);b(3,h-12,w-6,2,'#73866d');break;
      case 'lamp':
        b(7,7,2,8,'#b79a60');b(4,14,8,2,'#947449');
        b(5,1,6,2,'#775c37');b(4,3,8,2,'#b79250');b(3,5,10,4,'#ccaa62');b(2,9,12,1,'#6c593d');b(6,4,3,5,'#dec083');break;
      case 'plant':
        plank(3,h-11,10,11);pot(8,h-13);
        for(let i=0;i<6;i++){const xx=3+i*7%11,yy=h-25-i*3;b(xx,yy,4,2,i%2?'#83936a':'#536f57');}break;
      case 'ivy':
        for(let i=0;i<h-2;i+=3){const xx=5+Math.floor(Math.sin(i)*2);b(xx,i,1,4,'#586b49');b(xx+(i%2?-3:1),i,3,2,i%2?'#7c9267':'#516e54');}break;
      case 'step':
        b(0,h-5,w,5,'#747d69');b(4,h-10,w-4,5,'#8c9074');b(9,h-15,w-9,5,'#a0a085');break;
    }
    c.restore();
  }
  root.TownCottageArt=api;
})(globalThis);
