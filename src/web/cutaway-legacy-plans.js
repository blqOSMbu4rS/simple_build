/* Three authored 2D silhouettes for a bounded visual and construction trial. */
(function(root){
  'use strict';
  function plan(id,name,description,layout,design){
    const parts=[],costs={W:0,S:0,C:0};
    function add(key,kind,x,y,w,h,material,units,deps=[],layer=2){
      const part={id:key,kind,x,y,w,h,material,cost:{[material]:units},deps,seconds:3.6,
        workers:w>=6?2:1,required:true,layer,label:({foundation:'铺好地基',wall:'搭起房间',floor:'铺设楼板',roof:'盖上屋顶',door:'装上门',window:'装上窗',porch:'搭起门廊',hearth:'砌好壁炉',bed:'摆好床铺',shelf:'安装书架',lamp:'点亮灯',stair:'装好楼梯',awning:'挂上布篷',bench:'摆好长凳'})[kind]};
      parts.push(part);costs[material]+=units;return key;
    }
    design(add);
    return {id,name,description,template:true,cutaway:true,layout,parts,costs,
      silhouette:id,signature:id,spaces:layout==='stone'?2:layout==='long'?2:1};
  }
  const wood=plan('cutaway-wood','宽檐林间木屋','宽矮轮廓 · 偏左入口 · 暖炉与床','wood',a=>{
    a('base','foundation',0,0,10,1,'W',5);
    a('room','wall',0,1,10,5,'W',8,['base'],1);
    a('roof','roof',-1,6,12,3,'W',7,['room'],3);
    a('door','door',2,1,2,3,'W',2,['room'],4);
    a('window','window',7,2,2,2,'W',1,['room'],4);
    a('hearth','hearth',0,1,2,3,'S',3,['room'],4);
    a('bed','bed',5,1,3,2,'W',2,['room'],4);
    a('porch','porch',1,0,3,2,'W',2,['door'],5);
    a('lamp','lamp',5,4,1,1,'C',1,['roof'],6);
  });
  const stone=plan('cutaway-stone','石基双层高屋','窄高轮廓 · 两层生活空间 · 侧置烟囱','stone',a=>{
    a('base','foundation',1,0,8,1,'S',5);
    a('lower','wall',1,1,8,5,'S',9,['base'],1);
    a('floor','floor',1,6,8,1,'W',4,['lower'],3);
    a('upper','wall',1,7,8,4,'W',7,['floor'],1);
    a('roof','roof',0,11,10,3,'W',7,['upper'],3);
    a('door','door',6,1,2,3,'W',2,['lower'],4);
    a('window-low','window',2,2,2,2,'W',1,['lower'],4);
    a('window-high','window',6,8,2,2,'W',1,['upper'],4);
    a('stair','stair',4,1,2,5,'W',3,['floor'],4);
    a('hearth','hearth',1,1,2,3,'S',3,['lower'],4);
    a('shelf','shelf',2,7,3,3,'W',2,['upper'],4);
    a('bed','bed',5,7,3,1,'W',2,['upper'],4);
    a('lamp-low','lamp',5,4,1,1,'C',1,['lower'],6);
    a('lamp-high','lamp',5,9,1,1,'C',1,['roof'],6);
  });
  const long=plan('cutaway-long','侧棚长屋','低矮长屋 · 右侧工作棚 · 布篷','long',a=>{
    a('base','foundation',-2,0,14,1,'W',6);
    a('main','wall',-2,1,9,5,'W',8,['base'],1);
    a('roof','roof',-3,6,11,3,'W',7,['main'],3);
    a('side','porch',7,1,5,4,'W',5,['base','main'],2);
    a('awning','awning',7,5,5,2,'C',3,['side'],3);
    a('door','door',0,1,2,3,'W',2,['main'],4);
    a('window','window',4,2,2,2,'W',1,['main'],4);
    a('bed','bed',-2,1,3,2,'W',2,['main'],4);
    a('shelf','shelf',2,1,2,3,'W',2,['main'],4);
    a('bench','bench',8,1,3,1,'W',2,['side'],4);
    a('lamp','lamp',3,4,1,1,'C',1,['roof'],6);
  });
  const catalog=[wood,stone,long];
  if(typeof module!=='undefined'&&module.exports)module.exports=catalog;
  else root.TownLegacyCutawayPlans=catalog;
})(globalThis);
