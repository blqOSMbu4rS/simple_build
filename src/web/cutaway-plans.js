/* Three authored 2D silhouettes for a bounded visual and construction trial. */
(function(root){
  'use strict';
  function plan(id,name,description,layout,design){
    const parts=[],costs={W:0,S:0,C:0};
    function add(key,kind,x,y,w,h,material,units,deps=[],layer=2,options={}){
      const part={id:key,kind,x,y,w,h,material,cost:{[material]:units},deps,seconds:3.6,
        workers:w>=6?2:1,required:true,layer,label:({foundation:'铺好地基',wall:'搭起房间',floor:'铺设楼板',roof:'盖上屋顶',door:'装上门',window:'装上窗',porch:'搭起门廊',hearth:'砌好壁炉',bed:'摆好床铺',shelf:'安装书架',lamp:'点亮灯',stair:'装好楼梯',awning:'挂上布篷',bench:'摆好长凳',planter:'摆好花箱',trellis:'固定爬藤木架'})[kind]};
      Object.assign(part,options);parts.push(part);costs[material]+=units;return key;
    }
    design(add);
    return {id,name,description,template:true,cutaway:true,layout,parts,costs,
      silhouette:id,signature:id,spaces:id.endsWith('-v3')?3:layout==='stone'?2:layout==='long'?2:1};
  }
  const wood=plan('cutaway-wood-v2','宽檐林间木屋','宽阔双间 · 偏左入口 · 绿植木架','wood',a=>{
    a('base','foundation',-4,0,15,1,'W',8);
    a('left-room','wall',-4,1,7,5,'W',6,['base'],1);
    a('right-room','wall',3,1,8,5,'W',7,['base'],1);
    a('roof','roof',-5,6,17,3,'W',9,['left-room','right-room'],3);
    a('door','door',1,1,2,3,'W',2,['left-room'],4);
    a('window-left','window',-2,2,2,2,'W',1,['left-room'],4);
    a('window-right','window',7,2,2,2,'W',1,['right-room'],4);
    a('hearth','hearth',-4,1,2,3,'S',3,['left-room'],4);
    a('bed','bed',4,1,3,2,'W',2,['right-room'],4);
    a('shelf','shelf',9,1,2,3,'W',2,['right-room'],4);
    a('porch','porch',0,0,3,2,'W',2,['door'],5);
    a('trellis','trellis',10,1,1,5,'W',2,['right-room'],5);
    a('planter','planter',-3,0,2,1,'W',1,['base'],5);
    a('lamp','lamp',3,4,1,1,'C',1,['roof'],6);
  });
  const stone=plan('cutaway-stone-v2','石基双层高屋','宽阔双层 · 石砌下层 · 绿植露台','stone',a=>{
    a('base','foundation',-2,0,12,1,'S',7);
    a('lower','wall',-2,1,12,5,'S',11,['base'],1);
    a('floor','floor',-2,6,12,1,'W',6,['lower'],3);
    a('upper','wall',-1,7,10,4,'W',9,['floor'],1);
    a('roof','roof',-2,11,12,3,'W',8,['upper'],3);
    a('door','door',6,1,2,3,'W',2,['lower'],4);
    a('window-low','window',0,2,2,2,'W',1,['lower'],4);
    a('window-high','window',6,8,2,2,'W',1,['upper'],4);
    a('stair','stair',3,1,2,5,'W',3,['floor'],4);
    a('hearth','hearth',-2,1,2,3,'S',3,['lower'],4);
    a('shelf','shelf',0,7,3,3,'W',2,['upper'],4);
    a('bed','bed',4,7,3,1,'W',2,['upper'],4);
    a('planter','planter',-2,7,2,1,'W',1,['floor'],5);
    a('trellis','trellis',9,1,1,5,'W',2,['lower'],5);
    a('lamp-low','lamp',4,4,1,1,'C',1,['lower'],6);
    a('lamp-high','lamp',4,9,1,1,'C',1,['roof'],6);
  });
  const long=plan('cutaway-long-v2','侧棚长屋','长形双间 · 右侧工作棚 · 攀藤花箱','long',a=>{
    a('base','foundation',-6,0,19,1,'W',9);
    a('left-room','wall',-6,1,7,5,'W',6,['base'],1);
    a('right-room','wall',1,1,7,5,'W',6,['base'],1);
    a('roof','roof',-7,6,16,3,'W',9,['left-room','right-room'],3);
    a('side','porch',8,1,5,4,'W',5,['base','right-room'],2);
    a('awning','awning',8,5,5,2,'C',3,['side'],3);
    a('door','door',-1,1,2,3,'W',2,['left-room'],4);
    a('window-left','window',-4,2,2,2,'W',1,['left-room'],4);
    a('window-right','window',5,2,2,2,'W',1,['right-room'],4);
    a('bed','bed',-6,1,3,2,'W',2,['left-room'],4);
    a('shelf','shelf',2,1,2,3,'W',2,['right-room'],4);
    a('bench','bench',9,1,3,1,'W',2,['side'],4);
    a('trellis','trellis',8,1,1,4,'W',2,['side'],5);
    a('planter','planter',11,0,2,1,'W',1,['base'],5);
    a('lamp','lamp',3,4,1,1,'C',1,['roof'],6);
  });
  const terrace=plan('cutaway-terrace-v3','错层庭院屋','低檐起居室 · 石基餐室 · 楼上卧室','stone',a=>{
    a('base','foundation',-8,0,19,1,'S',9);
    a('living','wall',-8,1,9,5,'W',7,['base'],1);
    a('dining','wall',1,1,10,5,'S',9,['base'],1);
    a('lower-roof','roof',-9,6,11,3,'W',6,['living'],3);
    a('upper-floor','floor',2,6,9,1,'W',5,['dining'],3);
    a('bedroom','wall',3,7,8,5,'W',7,['upper-floor'],1);
    a('upper-roof','roof',2,12,10,3,'W',7,['bedroom'],3);
    a('door','door',0,1,2,3,'W',2,['living'],4);
    a('window-left','window',-5,2,2,2,'W',1,['living'],4);
    a('window-right','window',7,2,2,2,'W',1,['dining'],4);
    a('window-up','window',8,8,2,2,'W',1,['bedroom'],4);
    a('hearth','hearth',2,1,2,3,'S',3,['dining'],4);
    a('shelf','shelf',-7,1,2,3,'W',2,['living'],4);
    a('stair','stair',8,1,2,5,'W',3,['upper-floor'],4);
    a('bed','bed',4,7,3,2,'W',2,['bedroom'],4);
    a('courtyard','porch',-10,0,3,3,'W',2,['base'],5);
    a('planter','planter',-9,1,2,1,'W',1,['courtyard'],5);
    a('trellis','trellis',10,1,1,5,'W',2,['dining'],5);
    a('lamp','lamp',0,4,1,1,'C',1,['lower-roof'],6);
  });
  const tower=plan('cutaway-tower-v3','塔楼与阅读附屋','三层窄塔 · 单层书房 · 双屋顶','wood',a=>{
    a('base','foundation',-7,0,19,1,'W',9);
    a('tower-low','wall',-7,1,7,5,'S',7,['base'],1);
    a('study','wall',0,1,12,5,'W',9,['base'],1);
    a('study-roof','roof',-1,6,14,3,'W',8,['study'],3);
    a('floor-mid','floor',-7,6,7,1,'W',4,['tower-low'],3);
    a('tower-mid','wall',-7,7,7,3,'W',6,['floor-mid'],1);
    a('floor-high','floor',-7,10,7,1,'W',4,['tower-mid'],3);
    a('tower-high','wall',-7,11,7,3,'W',5,['floor-high'],1);
    a('tower-roof','roof',-8,14,9,2,'W',6,['tower-high'],3);
    a('door','door',2,1,2,3,'W',2,['study'],4);
    a('window-low','window',-5,2,2,2,'W',1,['tower-low'],4);
    a('window-mid','window',-5,8,2,2,'W',1,['tower-mid'],4);
    a('window-high','window',-5,11,2,2,'W',1,['tower-high'],4);
    a('window-study','window',8,2,2,2,'W',1,['study'],4);
    a('hearth','hearth',-7,1,2,3,'S',3,['tower-low'],4);
    a('stair','stair',-2,1,2,5,'W',3,['floor-mid'],4);
    a('bed','bed',-6,7,3,2,'W',2,['tower-mid'],4);
    a('stair-high','stair',-2,7,2,3,'W',2,['floor-high'],4);
    a('shelf-high','shelf',-6,11,2,3,'W',2,['tower-high'],4);
    a('shelf','shelf',5,1,3,3,'W',2,['study'],4);
    a('porch','porch',1,0,4,2,'W',2,['door'],5);
    a('planter','planter',10,0,2,1,'W',1,['base'],5);
    a('trellis','trellis',11,1,1,5,'W',2,['study'],5);
    a('lamp','lamp',5,4,1,1,'C',1,['study-roof'],6);
  });
  const greenhouse=plan('cutaway-greenhouse-v3','绿荫温室长屋','卧室 · 起居室 · 敞开温室侧翼','long',a=>{
    a('base','foundation',-9,0,22,1,'W',10);
    a('bedroom','wall',-9,1,7,5,'W',6,['base'],1);
    a('living','wall',-2,1,7,5,'W',6,['base'],1);
    a('main-roof','roof',-10,6,16,3,'W',9,['bedroom','living'],3);
    a('greenhouse','porch',5,1,8,5,'W',6,['base','living'],2);
    a('glass-roof','awning',5,6,8,2,'C',4,['greenhouse'],3);
    a('door','door',-3,1,2,3,'W',2,['bedroom'],4);
    a('window-bed','window',-7,2,2,2,'W',1,['bedroom'],4);
    a('window-living','window',2,2,2,2,'W',1,['living'],4);
    a('bed','bed',-9,1,3,2,'W',2,['bedroom'],4);
    a('hearth','hearth',-1,1,2,3,'S',3,['living'],4);
    a('shelf','shelf',3,1,2,3,'W',2,['living'],4);
    a('bench','bench',7,1,4,1,'W',2,['greenhouse'],4);
    a('planter-left','planter',5,1,2,1,'W',1,['greenhouse'],5);
    a('planter-right','planter',11,1,2,1,'W',1,['greenhouse'],5);
    a('trellis','trellis',11,1,1,5,'W',2,['greenhouse'],5);
    a('porch','porch',-10,0,3,2,'W',2,['door'],5);
    a('lamp','lamp',0,4,1,1,'C',1,['main-roof'],6);
  });
  // New authored residences use 16 pixels/metre. Keep every older plan canonical.
  // Room tuple: x, bottom, width, use. Each room has 3m clear height; storeys
  // include a 1m construction band for beams and the floor/ladder connection.
  const residenceSpecs=[
    ['wood','林间复式宅','三层七室 · 中央阁楼 · 双侧低屋顶','wood',[
      [-10,1,8,'living'],[-2,1,6,'hall'],[4,1,7,'workshop'],
      [-8,5,6,'bedroom'],[-2,5,6,'library'],[4,5,5,'bedroom'],[-2,9,6,'study']]],
    ['stone','石基庭院公馆','三层六室 · 石砌首层 · 双侧露台','stone',[
      [-9,1,9,'living'],[0,1,10,'kitchen'],[-9,5,9,'library'],[0,5,10,'bedroom'],
      [-6,9,6,'study'],[0,9,7,'bedroom']]],
    ['long','长檐工坊住宅','双层五室 · 大工作间 · 错落长屋顶','long',[
      [-11,1,8,'living'],[-3,1,7,'kitchen'],[4,1,7,'workshop'],
      [-10,5,7,'bedroom'],[-3,5,7,'library']]],
    ['terrace','阶梯花园宅','三层六室 · 逐级抬高 · 露台花架','stone',[
      [-11,1,7,'living'],[-4,1,8,'hall'],[4,1,7,'kitchen'],
      [-4,5,8,'bedroom'],[4,5,7,'library'],[4,9,6,'study']]],
    ['tower','钟楼书房宅','三层六室 · 中央高塔 · 两翼附屋','wood',[
      [-10,1,7,'workshop'],[-3,1,7,'living'],[4,1,7,'kitchen'],
      [-3,5,7,'library'],[4,5,7,'bedroom'],[-3,9,7,'study']]],
    ['greenhouse','温室藏书宅','双层五室 · 玻璃温室 · 屋顶花园','long',[
      [-11,1,7,'bedroom'],[-4,1,7,'living'],[3,1,8,'greenhouse'],
      [-10,5,6,'bedroom'],[-4,5,7,'library']]]
  ];
  function residence([key,name,description,layout,rooms]){
    const connections=[];
    for(const [i,r]of rooms.entries())if(r[1]>1){
      const below=rooms.map((b,j)=>({b,j,left:Math.max(b[0],r[0]),right:Math.min(b[0]+b[2],r[0]+r[2])}))
        .filter(v=>v.b[1]===r[1]-4&&v.right-v.left>=3).at(-1);
      connections.push({upper:i,lower:below.j,hatch:below.right-2});
    }
    const result=plan('cutaway-'+key+'-residence-v1',name,description,layout,a=>{
      const left=Math.min(...rooms.filter(r=>r[1]===1).map(r=>r[0]));
      const right=Math.max(...rooms.filter(r=>r[1]===1).map(r=>r[0]+r[2]));
      a('base','foundation',left,0,right-left,1,'S',1);
      // Build structural support first, then finite furnishing tasks.
      rooms.forEach(([x,y,w,use],i)=>{
        const below=rooms.map((r,j)=>({r,j})).filter(({r})=>r[1]===y-4&&r[0]<x+w&&r[0]+r[2]>x);
        if(y>1)a('floor-'+i,'floor',x,y-1,w,1,'W',1,below.map(({j})=>'room-'+j),3,
          {openings:[connections.find(c=>c.upper===i).hatch-x]});
        a('room-'+i,use==='greenhouse'?'porch':'wall',x,y,w,3,y===1&&layout==='stone'?'S':'W',1,
          [y===1?'base':'floor-'+i],1,{roomUse:use,
            openLeft:rooms.some(r=>r[1]===y&&r[0]+r[2]===x),openRight:rooms.some(r=>r[1]===y&&r[0]===x+w)});
      });
      // Cover every exposed top interval: large central roofs and lower side wings.
      rooms.forEach(([x,y,w,use],i)=>{
        const covered=rooms.filter(r=>r[1]===y+4);
        let start=null;
        for(let col=x;col<=x+w;col++){
          const exposed=col<x+w&&!covered.some(r=>col>=r[0]&&col<r[0]+r[2]);
          if(exposed&&start===null)start=col;
          if(!exposed&&start!==null){
            const length=col-start;
            const roofLeft=covered.some(r=>start-1>=r[0]&&start-1<r[0]+r[2])?start:start-1;
            const roofRight=covered.some(r=>col>=r[0]&&col<r[0]+r[2])?col:col+1;
            if(length>=4&&use!=='greenhouse')a('roof-'+i+'-'+start,'roof',roofLeft,y+3,roofRight-roofLeft,Math.min(3,Math.ceil(length/3)),'W',1,['room-'+i],3);
            else{
              a('terrace-'+i+'-'+start,'floor',start,y+3,length,1,'W',1,['room-'+i],3);
              a('rail-'+i+'-'+start,'railing',start,y+4,length,1,'W',1,['terrace-'+i+'-'+start],5,{label:'安装露台栏杆'});
              if(length>=2)a('flowers-'+i+'-'+start,'planter',start,y+4,2,1,'W',1,['terrace-'+i+'-'+start],5);
            }
            start=null;
          }
        }
      });
      connections.forEach(({upper,lower,hatch})=>a('stair-'+upper,'stair',hatch-1,rooms[lower][1],2,4,'W',1,
        ['room-'+lower,'floor-'+upper],4,{label:'连接上下层楼梯'}));
      const entry=rooms.findIndex(r=>r[1]===1&&['hall','living'].includes(r[3]));
      const living=rooms.findIndex(r=>r[1]===1&&r[3]==='living');
      rooms.forEach(([x,y,w,use],i)=>{
        const structural='room-'+i;
        const reserved=connections.filter(c=>c.lower===i).map(c=>[c.hatch-1,c.hatch+1]);
        if(i===entry)reserved.push([x+1,x+2]);
        function furnish(id,kind,width,height,material='W',options={}){
          for(let at=x;at+width<=x+w;at++)if(!reserved.some(([l,r])=>at<r&&at+width>l)){
            reserved.push([at,at+width]);a(id,kind,at,y,width,height,material,1,[structural],4,options);return;
          }
        }
        if(i===entry)a('door','door',x+1,y,1,2,'W',1,[structural],4);
        if(i%2===0)a('window-'+i,'window',x+Math.floor(w/2),y+1,1,1,'W',1,[structural],4);
        else a('lamp-'+i,'lamp',x+Math.floor(w/2),y+2,1,1,'C',1,[structural],6);
        // Keep furnishings out of the entry and the actual stair/hatch footprint.
        if(i===living)furnish('hearth','hearth',2,2,'S');
        if(use==='bedroom'){
          furnish('bed-'+i,'bed',2,1);
          furnish('chest-'+i,'chest',1,1,'W',{label:'摆放储物箱'});
        }else if(use==='library'||use==='study'){
          furnish('shelf-'+i,'shelf',2,2);
          furnish('desk-'+i,'table',2,1,'W',{label:'布置书桌',books:true});
        }else if(use==='greenhouse'){
          furnish('plants-'+i,'planter',3,1);
          furnish('trellis-'+i,'trellis',1,3);
        }else{
          furnish('table-'+i,'table',2,1,'W',{label:use==='workshop'?'搭好工作台':'摆好餐桌',tools:use==='workshop'});
          if(w>=7)furnish('shelf-'+i,'shelf',1,2);
        }
      });
      a('entry-step','step',rooms[entry][0]+1,0,1,1,'S',1,['base','door'],5,{label:'铺好入口台阶'});
    });
    return {...result,spaces:rooms.length,residential:true,pixelsPerMeter:16,petHeightMeters:1,
      rooms:rooms.map(([x,y,w,use],i)=>({id:'room-'+i,x,y,w,h:3,use})),connections};
  }
  const legacy=typeof module!=='undefined'&&module.exports?require('./cutaway-legacy-plans.js'):root.TownLegacyCutawayPlans;
  // Versioned unit-cell plans: old authored plans remain canonical for saved games.
  function gridPlan(source){
    const parts=[],costs={W:0,S:0,C:0},groups=new Map();
    for(const original of source.parts){
      const cells=[];
      for(let row=0;row<original.h;row++)for(let col=0;col<original.w;col++){
        if(original.openings?.includes(col))continue;
        // A stepped silhouette made from whole square roof blocks.
        const inset=original.roofInsets?.[row]??row;
        if(original.kind==='roof'&&(col<inset||col>=original.w-inset))continue;
        const id=original.id+'@'+col+','+row;
        const deps=cells.length?[cells[cells.length-1].id]:original.deps.flatMap(key=>groups.get(key).map(p=>p.id));
        const cell={...original,id,x:original.x+col,y:original.y+row,w:1,h:1,
          cost:{[original.material]:1},workers:1,seconds:1.2,deps,
          tileSource:original,label:original.label+' · 第 '+(cells.length+1)+' 块'};
        cells.push(cell);parts.push(cell);costs[original.material]++;
      }
      groups.set(original.id,cells);
    }
    const id=source.id+'-grid-v1';
    return {...source,id,sourcePlanId:source.id,gridBuild:true,parts,costs,signature:id,silhouette:id};
  }
  const authored=[wood,stone,long,terrace,tower,greenhouse];
  const cottage=plan('cutaway-window-cottage-v1','林窗书屋','单层精装 · 窗前书桌 · 柔光阅读角','wood',a=>{
    a('base','foundation',-5,0,10,1,'S',1,[],0);
    a('room','wall',-5,1,10,4,'W',1,['base'],1);
    a('roof','roof',-6,5,12,3,'W',1,['room'],2);
    a('window','window',-2,2,4,3,'W',1,['room'],3,{light:{x:32,y:25,radius:65,strength:.16,color:[.42,.65,.83]}});
    a('curtains','curtains',-2,2,4,3,'C',1,['window'],4,{label:'挂好窗帘'});
    a('door','door',-5,1,1,2,'W',1,['room'],4);
    a('books','shelf',-4,1,2,4,'W',1,['room'],5);
    a('cabinet','cabinet',2,1,2,3,'W',1,['room'],5,{label:'装好抽屉矮柜'});
    a('wall-shelf','wall-shelf',2,3,2,2,'W',1,['room'],5,{label:'挂好陈列架'});
    a('bench','bench',-2,1,2,1,'W',1,['room'],6);
    a('rug','rug',-2,1,6,1,'C',1,['base'],7,{label:'铺好织纹地毯'});
    a('desk','table',0,1,3,2,'W',1,['window','rug'],8,{label:'摆好窗前书桌'});
    a('chair','chair',0,1,1,2,'W',1,['desk'],9,{label:'摆好阅读椅'});
    a('lamp','lamp',2,2,1,1,'C',1,['desk'],10,{label:'点亮桌灯',light:{x:8,y:8,radius:46,strength:.38,color:[1,.70,.38]}});
    a('plant','plant',4,1,1,3,'W',1,['room'],10,{label:'摆好盆栽'});
    a('ivy','ivy',1,3,1,2,'W',1,['curtains'],11,{label:'挂好垂藤'});
    a('entry-step','step',-5,0,1,1,'S',1,['door','base'],5);
  });
  Object.assign(cottage,{artStyle:'woodland-v1',residential:true,pixelsPerMeter:16,petHeightMeters:1,spaces:1});
  // Wider eaves require real construction cells. Keep v1 canonical for old sites.
  const wideCottage={...cottage,id:'cutaway-window-cottage-v2',artStyle:'woodland-v2',
    parts:cottage.parts.filter(p=>!['door','entry-step'].includes(p.id))
      .map(p=>p.kind==='roof'?{...p,appearance:'section-v2',x:-7,y:4,w:14,h:4,roofInsets:[0,0,2,3],layer:12}:{...p,appearance:'section-v2'})};
  const catalog=[gridPlan(wideCottage),gridPlan(cottage),...residenceSpecs.map(residence).map(gridPlan),...authored.map(gridPlan),...authored,...legacy];
  if(typeof module!=='undefined'&&module.exports)module.exports=catalog;
  else root.TownBlueprints=catalog;
})(globalThis);
