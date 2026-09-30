'use client';

import { ChangeEvent, PointerEvent, useEffect, useMemo, useRef, useState } from 'react';

type Pt = { x: number; y: number };
type Layer = { x:number; y:number; w:number; h:number; rotation:number; opacity:number; shadow:number; brightness:number; warpX:number; warpY:number };

const initial: Layer = { x: 360, y: 180, w: 300, h: 360, rotation: 0, opacity: 1, shadow: 18, brightness: 100, warpX: 0, warpY: 0 };

function loadImage(src:string) {
  return new Promise<HTMLImageElement>((resolve,reject) => {
    const im = new Image(); im.onload=()=>resolve(im); im.onerror=reject; im.src=src;
  });
}

export default function ProductCompositor() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene,setScene] = useState<HTMLImageElement|null>(null);
  const [product,setProduct] = useState<HTMLImageElement|null>(null);
  const [layer,setLayer] = useState<Layer>(initial);
  const [drag,setDrag] = useState<Pt|null>(null);
  const [mode,setMode] = useState<'move'|'scale'>('move');

  const importImage = (kind:'scene'|'product') => async (e:ChangeEvent<HTMLInputElement>) => {
    const file=e.target.files?.[0]; if(!file) return;
    const url=URL.createObjectURL(file); const im=await loadImage(url);
    if(kind==='scene') setScene(im); else {
      setProduct(im);
      setLayer(v=>({...v,w:Math.min(360,im.width),h:Math.min(440,im.height)}));
    }
  };

  useEffect(()=>{
    const c=canvasRef.current; if(!c) return; const ctx=c.getContext('2d'); if(!ctx) return;
    ctx.clearRect(0,0,c.width,c.height); ctx.fillStyle='#171717'; ctx.fillRect(0,0,c.width,c.height);
    if(scene) {
      const s=Math.min(c.width/scene.width,c.height/scene.height), w=scene.width*s,h=scene.height*s;
      ctx.drawImage(scene,(c.width-w)/2,(c.height-h)/2,w,h);
    }
    if(product) {
      ctx.save();
      ctx.translate(layer.x+layer.w/2,layer.y+layer.h/2);
      ctx.rotate(layer.rotation*Math.PI/180);
      ctx.globalAlpha=layer.opacity;
      ctx.transform(1,layer.warpY/500,layer.warpX/500,1,0,0);
      ctx.filter=`brightness(${layer.brightness}%) drop-shadow(0 8px ${layer.shadow}px rgba(0,0,0,.38))`;
      // Source pixels are drawn directly. No generative redraw, OCR, or text reconstruction.
      ctx.drawImage(product,-layer.w/2,-layer.h/2,layer.w,layer.h);
      ctx.filter='none'; ctx.globalAlpha=1;
      ctx.strokeStyle='#fff';ctx.lineWidth=1;ctx.setLineDash([6,5]);ctx.strokeRect(-layer.w/2,-layer.h/2,layer.w,layer.h);
      ctx.restore();
    }
  },[scene,product,layer]);

  const point=(e:PointerEvent<HTMLCanvasElement>)=>{
    const r=e.currentTarget.getBoundingClientRect(); return {x:(e.clientX-r.left)*e.currentTarget.width/r.width,y:(e.clientY-r.top)*e.currentTarget.height/r.height};
  };
  const down=(e:PointerEvent<HTMLCanvasElement>)=>{ if(!product)return; const p=point(e);setDrag(p);e.currentTarget.setPointerCapture(e.pointerId); };
  const move=(e:PointerEvent<HTMLCanvasElement>)=>{
    if(!drag||!product)return; const p=point(e),dx=p.x-drag.x,dy=p.y-drag.y;
    setLayer(v=>mode==='move'?{...v,x:v.x+dx,y:v.y+dy}:{...v,w:Math.max(40,v.w+dx),h:Math.max(40,v.h+dy)});
    setDrag(p);
  };
  const exportPng=()=>{
    const c=canvasRef.current;if(!c)return;
    // Hide selection outline by rendering a clean export canvas.
    const out=document.createElement('canvas');out.width=c.width;out.height=c.height;const ctx=out.getContext('2d');if(!ctx)return;
    ctx.fillStyle='#171717';ctx.fillRect(0,0,out.width,out.height);
    if(scene){const s=Math.min(out.width/scene.width,out.height/scene.height),w=scene.width*s,h=scene.height*s;ctx.drawImage(scene,(out.width-w)/2,(out.height-h)/2,w,h);}
    if(product){ctx.save();ctx.translate(layer.x+layer.w/2,layer.y+layer.h/2);ctx.rotate(layer.rotation*Math.PI/180);ctx.globalAlpha=layer.opacity;ctx.filter=`brightness(${layer.brightness}%) drop-shadow(0 8px ${layer.shadow}px rgba(0,0,0,.38))`;ctx.drawImage(product,-layer.w/2,-layer.h/2,layer.w,layer.h);ctx.restore();}
    const a=document.createElement('a');a.download='vedette-composite.png';a.href=out.toDataURL('image/png',1);a.click();
  };

  return <main style={{minHeight:'100vh',background:'#0b0b0b',color:'#f5f5f5',fontFamily:'Arial,sans-serif',padding:24}}>
    <div style={{maxWidth:1400,margin:'0 auto'}}>
      <div style={{display:'flex',justifyContent:'space-between',gap:20,alignItems:'end',marginBottom:20,flexWrap:'wrap'}}>
        <div><div style={{fontSize:12,letterSpacing:4,opacity:.6}}>VEDETTE LAB</div><h1 style={{fontSize:34,margin:'7px 0'}}>Product Compositor</h1><p style={{margin:0,opacity:.7}}>Remplacement non génératif : les pixels, logos et textes du produit importé sont conservés.</p></div>
        <button onClick={exportPng} disabled={!scene||!product} style={btn}>Exporter PNG HD</button>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'minmax(0,1fr) 300px',gap:18}}>
        <section style={panel}>
          <canvas ref={canvasRef} width={1200} height={760} onPointerDown={down} onPointerMove={move} onPointerUp={()=>setDrag(null)} style={{width:'100%',height:'auto',display:'block',touchAction:'none',borderRadius:12,cursor:mode==='move'?'move':'nwse-resize'}}/>
        </section>
        <aside style={{...panel,padding:18}}>
          <h2 style={{fontSize:17,marginTop:0}}>1 · Sources</h2>
          <label style={upload}>Photo boutique<input hidden type="file" accept="image/*" onChange={importImage('scene')}/></label>
          <label style={upload}>Vêtement PNG / photo<input hidden type="file" accept="image/*" onChange={importImage('product')}/></label>
          <h2 style={{fontSize:17,marginTop:26}}>2 · Placement</h2>
          <div style={{display:'flex',gap:8}}><button style={small} onClick={()=>setMode('move')}>Déplacer</button><button style={small} onClick={()=>setMode('scale')}>Redimensionner</button></div>
          <Control label="Rotation" min={-30} max={30} value={layer.rotation} onChange={rotation=>setLayer(v=>({...v,rotation}))}/>
          <Control label="Perspective X" min={-80} max={80} value={layer.warpX} onChange={warpX=>setLayer(v=>({...v,warpX}))}/><Control label="Perspective Y" min={-80} max={80} value={layer.warpY} onChange={warpY=>setLayer(v=>({...v,warpY}))}/><Control label="Luminosité" min={60} max={140} value={layer.brightness} onChange={brightness=>setLayer(v=>({...v,brightness}))}/>
          <Control label="Ombre" min={0} max={45} value={layer.shadow} onChange={shadow=>setLayer(v=>({...v,shadow}))}/>
          <Control label="Opacité" min={20} max={100} value={Math.round(layer.opacity*100)} onChange={opacity=>setLayer(v=>({...v,opacity:opacity/100}))}/>
          <button style={{...small,width:'100%',marginTop:18}} onClick={()=>setLayer(initial)}>Réinitialiser le calque</button>
          <div style={{marginTop:22,padding:12,border:'1px solid #333',borderRadius:10,fontSize:12,lineHeight:1.5,opacity:.72}}>Garantie V1 : aucune IA générative ne redessine le vêtement. Pour une fidélité absolue, importe un PNG déjà détouré. Une photo JPG gardera aussi son fond.</div>
        </aside>
      </div>
    </div>
  </main>;
}

function Control({label,min,max,value,onChange}:{label:string;min:number;max:number;value:number;onChange:(n:number)=>void}) {
  return <label style={{display:'block',marginTop:16,fontSize:12,opacity:.85}}>{label} <b style={{float:'right'}}>{value}</b><input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))} style={{width:'100%',marginTop:8}}/></label>
}
const panel={background:'#121212',border:'1px solid #292929',borderRadius:16,overflow:'hidden'} as const;
const btn={background:'#f2f2f2',color:'#090909',border:0,borderRadius:999,padding:'12px 20px',fontWeight:700,cursor:'pointer'} as const;
const small={background:'#202020',color:'#fff',border:'1px solid #393939',borderRadius:9,padding:'9px 11px',cursor:'pointer'} as const;
const upload={display:'block',padding:'12px',marginTop:9,border:'1px dashed #555',borderRadius:10,cursor:'pointer',fontSize:13} as const;
