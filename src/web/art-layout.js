/* Screen-space artwork is separate from the saved 16×16 structural grid.
 * Regions use a 0..1000 sprite space; later regions own overlapping pixels. */
(function(root){
  'use strict';
  const box=(x,y,w,h)=>[[x,y],[x+w,y],[x+w,y+h],[x,y+h]];
  const region=(id,polygon,anchor)=>({id,polygon,anchor});
  const layouts={
    'blueprint-castle':{file:'castle.webp',x:173,y:6,size:280,regions:[
      region('gatehouse',box(0,0,1000,1000),[450,810]),
      region('west-0',box(0,620,440,380),[225,760]),
      region('west-1',box(0,490,440,130),[220,610]),
      region('west-2',box(0,320,440,170),[220,490]),
      region('east-0',box(530,760,470,240),[760,855]),
      region('east-1',box(530,620,470,140),[760,750]),
      region('east-2',box(530,450,470,170),[760,605]),
      region('foundation',[[0,745],[265,790],[330,845],[535,855],[600,877],[760,895],[1000,815],[1000,1000],[0,1000]],[490,945]),
      region('rampart',[[325,390],[564,390],[585,545],[350,559]],[455,540]),
      region('west-cornice',box(0,340,440,90),[210,390]),
      region('east-cornice',box(500,425,500,80),[780,500]),
      region('gate',box(318,575,205,275),[425,837]),
      region('crest',box(354,482,100,116),[404,600]),
      region('west-roof',box(0,0,440,340),[225,350]),
      region('east-roof',box(500,0,500,425),[760,460]),
      region('west-flag',box(0,0,505,154),[214,153]),
      region('east-flag',box(505,0,495,208),[752,207])
    ]},
    'blueprint-cottage':{file:'cottage.webp',x:159,y:18,size:280,regions:[
      region('room-1',box(0,0,1000,1000),[417,810]),
      region('room-0',box(0,440,290,560),[210,810]),
      region('room-2',box(470,440,530,560),[720,810]),
      region('foundation',[[0,820],[310,800],[490,800],[650,848],[1000,805],[1000,1000],[0,1000]],[440,900]),
      region('door',box(280,563,178,258),[375,815]),
      region('eaves',[[24,465],[290,480],[592,475],[984,517],[960,560],[600,521],[270,510],[30,510]],[610,535]),
      region('roof-left',[[0,0],[305,0],[329,253],[170,490],[0,490]],[210,380]),
      region('roof-right',[[300,0],[1000,0],[1000,550],[590,493],[297,219]],[740,465]),
      region('dormer',[[171,281],[299,174],[545,460],[545,482],[171,482]],[355,420]),
      region('chimney',box(655,118,151,172),[733,285]),
      region('left-shutter',box(146,612,133,139),[212,752]),
      region('right-shutter',box(452,608,163,135),[534,745]),
      region('door-awning',box(160,461,347,122),[343,580])
    ]},
    'blueprint-lodge':{file:'lodge.webp',x:154,y:4,size:280,regions:[
      region('tower-low',box(0,0,1000,1000),[419,875]),
      region('left-room',box(0,500,282,500),[185,850]),
      region('right-room',box(554,490,446,510),[763,853]),
      region('tower-high',box(270,200,345,442),[415,574]),
      region('foundation',[[0,845],[250,860],[283,886],[493,875],[560,848],[1000,849],[1000,1000],[0,1000]],[415,938]),
      region('door',box(313,703,163,178),[397,876]),
      region('west-roof',[[0,0],[280,0],[280,620],[0,650]],[195,570]),
      region('east-roof',[[616,345],[1000,320],[1000,633],[520,636],[582,462]],[771,610]),
      region('tower-roof',box(210,0,490,285),[447,237]),
      region('clock',box(318,266,148,145),[391,410]),
      region('canopy',box(267,610,226,98),[388,705]),
      region('pennant',box(518,293,86,163),[560,454])
    ]}
  };
  function workPoint(plan,id){const l=layouts[plan?.id],r=l?.regions.find(r=>r.id===id);return r?{x:l.x+r.anchor[0]*l.size/1000,y:Math.min(272,l.y+r.anchor[1]*l.size/1000)}:null;}
  const api={layouts,workPoint};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownArtLayout=api;
})(globalThis);
