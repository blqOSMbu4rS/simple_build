/* Generic resource hit areas and restrained event-driven synthesized audio. */
(function(root){
 'use strict';
 function hit(resources,point){return (resources||[]).find(a=>Math.hypot(a.point[0]-point[0],a.point[1]-point[1])<=a.radius)||null;}
 function markers(canvas,resources,view,manual){
  if(!resources?.length)return;const c=canvas.getContext('2d'),[x,y,w,h]=view;
  c.save();c.setTransform(canvas.width/w,0,0,canvas.height/h,-x*canvas.width/w,-y*canvas.height/h);
  for(const a of resources){const [px,py]=a.point;c.beginPath();c.arc(px,py,5,0,Math.PI*2);c.fillStyle='#f5ecc9b0';c.fill();c.strokeStyle='#536e57';c.lineWidth=.8;c.stroke();
   if(manual?.kind===a.kind){c.beginPath();c.arc(px,py,8,-Math.PI/2,-Math.PI/2+Math.PI*2*manual.elapsed/manual.seconds);c.strokeStyle='#dba955';c.lineWidth=2;c.stroke();}}
  c.restore();
 }
 function audio(){let context=null,muted=false,last=-1;
  function unlock(){try{context ||= new (root.AudioContext||root.webkitAudioContext)();context.resume().catch(()=>{});}catch(_){/* Audio is optional. */}}
  function play(type){if(muted||!context||context.state!=='running')return;
   const now=context.currentTime;if(now-last<.12)return;last=now;
   const tones={drop:[170,.055,.025],hammer:[420,.035,.016],stage:[620,.16,.023],complete:[780,.28,.03]},tone=tones[type];if(!tone)return;
   const o=context.createOscillator(),g=context.createGain();o.type=type==='hammer'?'triangle':'sine';o.frequency.setValueAtTime(tone[0],now);o.frequency.exponentialRampToValueAtTime(tone[0]*.65,now+tone[1]);g.gain.setValueAtTime(tone[2],now);g.gain.exponentialRampToValueAtTime(.0001,now+tone[1]);o.connect(g);g.connect(context.destination);o.start(now);o.stop(now+tone[1]);
  }
  function mute(value){muted=value;if(muted&&context)context.suspend().catch(()=>{});}
  function suspend(){if(context)context.suspend().catch(()=>{});}
  function wake(){if(context&&!muted)context.resume().catch(()=>{});}
  return {unlock,play,mute,suspend,wake};
 }
 const api={hit,markers,audio};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownExperienceUI=api;
})(globalThis);
