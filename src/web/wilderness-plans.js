/* Independent, versioned wilderness site. Existing blueprints are untouched. */
(function(root){
  'use strict';
  function build(latest=false){
  const parts=[],costs={W:0,S:0,C:0,B:0,D:0},groups=new Map();
  function add(id,kind,x,y,w,h,material,deps,layer,label,extra={}){
    // Put the finished dirt floor on the actual walkable ground; footing is buried below it.
    y--;
    const source={id,kind,x,y,w,h,material,layer,label,...extra};
    const cells=[];
    for(let row=0;row<h;row++)for(let col=0;col<w;col++){
      const key=id+'@'+col+','+row;
      const cell={...source,id:key,x:x+col,y:y+row,w:1,h:1,cost:{[material]:1},
        deps:cells.length?[cells.at(-1).id]:deps.flatMap(key=>groups.get(key)),
        seconds:1.2,workers:1,required:true,tileSource:source};
      cells.push(cell);parts.push(cell);costs[material]++;
    }
    groups.set(id,cells.map(p=>p.id));
  }
  add('base','foundation',3,0,latest?5:4,1,'S',[],0,'铺设溪石地基');
  add('earth','earth',3,1,latest?5:4,1,'D',['base'],4,'夯实泥土地面');
  add('logs','wall',3,1,latest?5:4,latest?2:3,'W',['base','earth'],2,'搭建原木墙');
  add('gable','gable',3,latest?3:4,latest?5:4,2,'W',['logs'],2,'封好低矮山墙');
  add('chinking','chinking',3,1,latest?5:4,latest?2:3,'D',['logs'],3,'和泥填封木墙缝');
  add('window','window',4,2,1,1,'W',['logs'],4,'安装小木窗',
    {light:{x:8,y:8,radius:34,strength:.12,color:[.4,.62,.8]}});
  if(latest)add('tools','tools',5,2,1,1,'W',['logs'],5,'挂好工具与干草束');
  add('bed','bed',3,1,2,1,'W',['earth','logs'],5,'搭起铺草睡台');
  add('bedding','bedding',3,1,2,1,'B',['bed'],6,'铺好干草与枝垫');
  add('hearth','hearth',6,1,latest?2:1,2,'S',['base','earth','logs'],6,'砌筑小石炉',
    {light:{x:latest?16:8,y:24,radius:72,strength:latest?.48:.62,color:[1,.56,.25]}});
  add('flue','flue',6,3,latest?2:1,latest?3:4,'S',['hearth'],7,'接通垂直石烟道');
  add('roof','roof',2,latest?3:4,latest?7:6,2,'B',['logs','gable','chinking','flue'],8,'编枝搭接树皮屋顶');
  add('roof-seal','roof-seal',2,latest?3:4,latest?7:6,1,'D',['roof'],9,'抹泥封住屋顶接缝');
  const id=latest?'cutaway-creek-shelter-v2-grid-v1':'cutaway-creek-shelter-v1-grid-v1';
  const plan={id,sourcePlanId:latest?'cutaway-creek-shelter-v2':'cutaway-creek-shelter-v1',name:'溪谷石木小屋',
    description:'荒野庇护所 · 就地取材 · 石炉与铺草睡台',template:true,cutaway:true,
    gridBuild:true,residential:true,wilderness:true,artStyle:latest?'creek-v2':'creek-v1',layout:'wood',
    pixelsPerMeter:16,petHeightMeters:1,spaces:1,parts,costs,signature:id,silhouette:id};
  return plan;
  }
  const current=build(true),legacy=build(false);
  if(typeof module!=='undefined'&&module.exports)module.exports=current;
  else root.TownBlueprints.push(current,legacy);
})(globalThis);
