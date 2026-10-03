/* Session-only elapsed time. No timestamp survives a reload. */
(function(root){
 'use strict';
 const STEP=1/30;
 function create(now){return {previous:now,debt:0,ticks:0};}
 function capture(c,now,running,rate=1){const dt=Math.max(0,(now-c.previous)/1000);c.previous=now;if(running)c.debt+=dt*rate;return dt;}
 function pump(c,s,E,limit=120){let n=0;while(c.debt+1e-9>=STEP&&n<limit){E.advance(s,STEP);c.debt=Math.max(0,c.debt-STEP);c.ticks++;n++;if(s.status==='done'){c.debt=0;return false;}}return c.debt+1e-9>=STEP;}
 const api={STEP,create,capture,pump};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.TownSessionClock=api;
})(globalThis);
