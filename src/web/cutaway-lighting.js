/* WebGL 1 lighting for the 2D cutaway. No simulation or save-state ownership. */
(function(root){
  'use strict';
  const WIDTH=480,HEIGHT=304,MAX_LIGHTS=8;
  const vertex=`attribute vec2 position;
    varying vec2 uv;
    void main(){uv=(position+1.0)*0.5;gl_Position=vec4(position,0.0,1.0);}`;
  const fragment=`precision mediump float;
    varying vec2 uv;
    uniform sampler2D scene, surface, blockers;
    uniform vec4 lights[8];
    uniform vec3 colors[8];
    uniform vec2 pixel;
    float relief(vec2 p){
      vec4 m=texture2D(surface,p);
      // Derive a shallow height field from authored pixel accents, not a 16px grid.
      return dot(m.rgb,vec3(0.299,0.587,0.114))*m.a;
    }
    void main(){
      vec3 base=texture2D(scene,uv).rgb;
      vec4 material=texture2D(surface,uv);
      vec2 pos=vec2(uv.x*480.0,(1.0-uv.y)*304.0);
      vec2 slope=vec2(relief(uv-pixel*vec2(1,0))-relief(uv+pixel*vec2(1,0)),
        relief(uv+pixel*vec2(0,1))-relief(uv-pixel*vec2(0,1)));
      vec3 normal=normalize(vec3(slope*2.8,1.0));
      float facing=max(dot(normal,normalize(vec3(-0.5,-0.7,1.0))),0.0);
      // Cool dusk environment; keep construction and pets legible without a lamp.
      vec3 illumination=mix(vec3(0.53,0.66,0.83),vec3(0.48,0.54,0.65)+facing*0.26,material.a);
      vec3 halo=vec3(0.0);
      for(int i=0;i<8;i++){
        if(lights[i].w<=0.0)continue;
        vec2 delta=lights[i].xy-pos;
        float radius=max(lights[i].z,1.0);
        float distanceToLight=length(delta);
        float falloff=pow(max(0.0,1.0-distanceToLight/radius),2.0);
        if(falloff<=0.0)continue;
        // Short 2D shadow rays through installed roof/floor silhouettes only.
        // Interior backdrop walls are receiving surfaces, not solid room volumes.
        float visibility=1.0;
        vec2 lightUV=vec2(lights[i].x/480.0,1.0-lights[i].y/304.0);
        for(int step=1;step<=24;step++){
          vec2 sampleUV=mix(uv,lightUV,float(step)/25.0);
          visibility*=1.0-texture2D(blockers,sampleUV).a*0.85;
        }
        float facingLight=mix(1.0,max(dot(normal,normalize(vec3(delta,26.0))),0.0),material.a);
        illumination+=colors[i]*falloff*(0.35+facingLight)*lights[i].w*visibility;
        halo+=colors[i]*exp(-distanceToLight*distanceToLight/145.0)*0.09*lights[i].w*visibility;
      }
      vec3 result=base*illumination+halo;
      // Soft highlight compression keeps texture visible beside warm emitters.
      result=result/(1.0+max(result-0.78,0.0));
      gl_FragColor=vec4(clamp(result,0.0,1.0),1.0);
    }`;

  // A source may span many construction cells. It emits once, only when its
  // luminous pixel is in an installed cell; no light from planned/missing tiles.
  function collectLights(s,preview=false,clock=0){
    if(!s.plan)return [];
    const result=[],seen=new Set(),plan=s.plan;
    const origin=plan.modular?root.TownModules.origin(plan):240;
    for(const p of preview?plan.parts:s.installed){
      const source=p.tileSource||p;
      const extra=plan.artStyle==='woodland-v3'&&source.kind==='wall-shelf';
      const kind=extra?'lamp':source.kind||source.asset;
      if(!['lamp','hearth','window'].includes(kind)||seen.has(source.id))continue;
      const left=origin+source.x*16,top=272-(source.y+source.h)*16;
      const anchor=root.TownCottageArt?.lampAnchor(plan,source);
      // Existing lamp tasks still activate from their original installation
      // cell. Only the displayed light centre follows the atlas's actual flame.
      const gateX=extra?anchor?.x:left+(source.light?.x??(kind==='lamp'?8:source.w*8));
      const gateY=extra?anchor?.y:top+(source.light?.y??(kind==='lamp'?9:kind==='hearth'?source.h*16-10:source.h*8));
      if(gateX==null||gateY==null)continue;
      const x=anchor?.x??gateX,y=anchor?.y??gateY;
      if(p.tileSource){
        const tx=origin+p.x*16,ty=272-(p.y+1)*16;
        if(gateX<tx||gateX>=tx+16||gateY<ty||gateY>=ty+16)continue;
      }
      seen.add(source.id);
      const time=preview?0:Math.floor(clock*12)/12;
      const pulse=preview||kind==='window'?1:Math.max(.57,Math.min(1.08,.84+.17*Math.sin(time*4.9+source.x)+.09*Math.sin(time*8.3+source.y)+.045*Math.sin(time*16.7+source.x*.3)));
      result.push({x,y,kind,pulse,glass:anchor?.glass,radius:(source.light?.radius??(extra?45:kind==='window'?65:kind==='hearth'?100:115))*(kind==='window'?1:.9+.1*pulse),
        strength:(source.light?.strength??(extra?0.18:kind==='window'?0.4:kind==='hearth'?1.0:1.15))*pulse,
        color:source.light?.color??(kind==='hearth'?[1,0.48,0.17]:[1,0.72,0.35])});
    }
    return result.slice(0,MAX_LIGHTS);
  }

  function drawEmitters(c,s,clock=0,preview=false){
    const time=preview?0:Math.floor(clock*12)/12;
    for(const light of collectLights(s,preview,time)){
      if(light.kind!=='lamp')continue;
      const {x,y,pulse}=light,radius=12+6*pulse;
      c.save();
      const glow=c.createRadialGradient(x,y,0,x,y,radius);
      glow.addColorStop(0,`rgba(255,181,76,${.16*pulse})`);
      glow.addColorStop(.35,`rgba(242,143,49,${.075*pulse})`);glow.addColorStop(1,'rgba(242,143,49,0)');
      c.fillStyle=glow;c.fillRect(x-radius,y-radius,radius*2,radius*2);
      if(light.glass){
        // Tint only the glass interior, then repaint the tiny flame. The brass
        // frame and independent furniture sprite retain their authored detail.
        const [w,h]=light.glass;
        c.fillStyle=`rgba(111,51,13,${.25+(1-pulse)*.7})`;c.fillRect(x-w/2,y-h/2,w,h);
        const height=1.5+Math.round(pulse*3)/2,dx=Math.round(Math.sin(time*7+x)*.6)/2;
        c.fillStyle='#e99a36';c.fillRect(Math.round((x+dx-.5)*2)/2,y+1-height,1.5,height);
        c.fillStyle=pulse>.85?'#ffe7a0':'#f5bd59';c.fillRect(Math.round((x+dx)*2)/2,y+.5-height/2,.5,height/2);
      }
      c.restore();
    }
  }

  let pipeline,unavailable=false;
  function create(){
    const output=document.createElement('canvas');output.width=WIDTH;output.height=HEIGHT;
    const gl=output.getContext('webgl',{alpha:false,antialias:false,depth:false,stencil:false});
    if(!gl)return null;
    const p={output,gl,lost:false};
    output.addEventListener('webglcontextlost',event=>{event.preventDefault();p.lost=true;});
    output.addEventListener('webglcontextrestored',()=>{pipeline=null;unavailable=false;});
    const shaders=[];
    try{
      for(const [type,code]of [[gl.VERTEX_SHADER,vertex],[gl.FRAGMENT_SHADER,fragment]]){
        const shader=gl.createShader(type);shaders.push(shader);gl.shaderSource(shader,code);gl.compileShader(shader);
        if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS))throw new Error(gl.getShaderInfoLog(shader));
      }
      p.program=gl.createProgram();for(const shader of shaders)gl.attachShader(p.program,shader);
      gl.linkProgram(p.program);
      if(!gl.getProgramParameter(p.program,gl.LINK_STATUS))throw new Error(gl.getProgramInfoLog(p.program));
      gl.useProgram(p.program);
      p.buffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,p.buffer);
      gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
      const location=gl.getAttribLocation(p.program,'position');gl.enableVertexAttribArray(location);gl.vertexAttribPointer(location,2,gl.FLOAT,false,0,0);
      p.textures=[];p.inputs=[];
      for(const [index,name]of ['scene','surface','blockers'].entries()){
        const canvas=document.createElement('canvas');canvas.width=WIDTH;canvas.height=HEIGHT;p.inputs.push(canvas);
        const texture=gl.createTexture();p.textures.push(texture);gl.activeTexture(gl.TEXTURE0+index);gl.bindTexture(gl.TEXTURE_2D,texture);
        for(const key of [gl.TEXTURE_MIN_FILTER,gl.TEXTURE_MAG_FILTER])gl.texParameteri(gl.TEXTURE_2D,key,gl.NEAREST);
        for(const key of [gl.TEXTURE_WRAP_S,gl.TEXTURE_WRAP_T])gl.texParameteri(gl.TEXTURE_2D,key,gl.CLAMP_TO_EDGE);
        gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,WIDTH,HEIGHT,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        gl.uniform1i(gl.getUniformLocation(p.program,name),index);
      }
      p.lightLocation=gl.getUniformLocation(p.program,'lights[0]');p.colorLocation=gl.getUniformLocation(p.program,'colors[0]');
      p.pixelLocation=gl.getUniformLocation(p.program,'pixel');
      p.lightData=new Float32Array(MAX_LIGHTS*4);p.colorData=new Float32Array(MAX_LIGHTS*3);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);
      return p;
    }catch(error){
      if(p.program)gl.deleteProgram(p.program);
      if(p.buffer)gl.deleteBuffer(p.buffer);
      for(const texture of p.textures||[])gl.deleteTexture(texture);
      throw error;
    }finally{for(const shader of shaders)gl.deleteShader(shader);}
  }
  function render(canvas,s,clock,preview){
    if(unavailable||typeof document==='undefined')return false;
    try{
      if(!pipeline){pipeline=create();if(!pipeline){unavailable=true;return false;}}
      const p=pipeline,gl=p.gl;if(p.lost||gl.isContextLost())return false;
      // Extra artwork texels do not change the 16-unit construction grid.
      const density=s.plan?.artStyle?.startsWith('woodland-')?2:1;
      const resized=p.density!==density;
      if(resized){
        p.density=density;p.output.width=WIDTH*density;p.output.height=HEIGHT*density;
        p.inputs.forEach((input,i)=>{
          input.width=p.output.width;input.height=p.output.height;
          gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,p.textures[i]);
          gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,input.width,input.height,0,gl.RGBA,gl.UNSIGNED_BYTE,null);
        });
      }
      root.TownCutawayRenderer.drawBase(p.inputs[0],s,clock,preview,true);
      const parts=preview?s.plan?.parts:s.installed;
      const revision=root.TownCottageArt?.revision||0;
      const changed=resized||p.artRevision!==revision||p.surfacePlan!==s.plan||p.parts!==parts||p.partCount!==parts?.length;
      const motionTick=preview?0:Math.floor(clock*12);
      const moving=parts?.some(p=>['plant','curtains','ivy','planter','hearth','banner','flag'].includes((p.tileSource||p).kind||(p.tileSource||p).asset));
      const surfaceChanged=changed||(moving&&p.motionTick!==motionTick);
      if(surfaceChanged)root.TownCutawayRenderer.drawSurface(p.inputs[1],s,preview,false,clock);
      p.motionTick=motionTick;
      if(changed){
        root.TownCutawayRenderer.drawSurface(p.inputs[2],s,preview,true);
        p.surfacePlan=s.plan;p.parts=parts;p.partCount=parts?.length;p.artRevision=revision;
      }
      for(let i=0;i<3;i++){
        if((i===1&&!surfaceChanged)||(i===2&&!changed))continue;
        gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,p.textures[i]);
        gl.texSubImage2D(gl.TEXTURE_2D,0,0,0,gl.RGBA,gl.UNSIGNED_BYTE,p.inputs[i]);
      }
      p.lightData.fill(0);p.colorData.fill(0);
      collectLights(s,preview,clock).forEach((light,i)=>{
        p.lightData.set([light.x,light.y,light.radius,light.strength],i*4);p.colorData.set(light.color,i*3);
      });
      gl.uniform4fv(p.lightLocation,p.lightData);gl.uniform3fv(p.colorLocation,p.colorData);
      gl.uniform2f(p.pixelLocation,1/p.output.width,1/p.output.height);
      gl.viewport(0,0,p.output.width,p.output.height);gl.drawArrays(gl.TRIANGLES,0,6);
      const c=canvas.getContext('2d');c.imageSmoothingEnabled=false;
      c.drawImage(p.output,...root.TownCutawayRenderer.viewport(s,preview).map(v=>v*density),0,0,canvas.width,canvas.height);
      canvas.dataset.lighting='webgl';return true;
    }catch(error){unavailable=true;console.warn('Pixel lighting unavailable; using Canvas 2D.',error);return false;}
  }
  root.TownCutawayLighting={render,collectLights,drawEmitters};
})(globalThis);
