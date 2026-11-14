#!/usr/bin/env python3
"""Embeds every PNG in the parent folder into ui.html so the plugin needs no file picker.
The UI also renders text labels to PNG (browser canvas) because Figma Linux cannot load fonts.
Run again whenever a screen PNG changes:  python3 build.py
"""
import base64, json, pathlib

here = pathlib.Path(__file__).resolve().parent
images = {p.stem: base64.b64encode(p.read_bytes()).decode() for p in sorted(here.parent.glob("*.png"))}

html = r"""<!doctype html><html><body>
<p style="font:13px sans-serif">Building Patchwork prototype…</p>
<script>
const IMAGES = __IMAGES__;
const SCALE = 2;
const FONT = '"DM Sans", Inter, Ubuntu, "Noto Sans", Roboto, Arial, sans-serif';
function b64(s){const b=atob(s);const u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u;}

function canvas(w, h){const c=document.createElement('canvas');c.width=Math.ceil(w*SCALE);c.height=Math.ceil(h*SCALE);const x=c.getContext('2d');x.scale(SCALE,SCALE);return [c,x];}
function rr(x,X,Y,W,H,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+W,Y,X+W,Y+H,r);x.arcTo(X+W,Y+H,X,Y+H,r);x.arcTo(X,Y+H,X,Y,r);x.arcTo(X,Y,X+W,Y,r);x.closePath();}
function tick(x,cx,cy,s){x.beginPath();x.arc(cx,cy,s/2,0,Math.PI*2);x.fillStyle='#496a56';x.fill();
  x.beginPath();x.moveTo(cx-s*0.22,cy+s*0.02);x.lineTo(cx-s*0.06,cy+s*0.18);x.lineTo(cx+s*0.24,cy-s*0.16);
  x.strokeStyle='#fff';x.lineWidth=2;x.lineCap='round';x.lineJoin='round';x.stroke();}

function render(it){
  if(it.kind==='chip'){const [c,x]=canvas(it.w,it.h);x.font='500 12px '+FONT;x.fillStyle='#ffffff';x.textBaseline='middle';x.fillText(it.text,10,it.h/2+0.5);return [c,it.w,it.h];}
  if(it.kind==='input'){const [c,x]=canvas(it.w,it.h);x.font='400 13px '+FONT;x.fillStyle='#252a26';x.textBaseline='middle';x.fillText(it.text,14,it.h/2+0.5);return [c,it.w,it.h];}
  // toast
  const m=document.createElement('canvas').getContext('2d');
  m.font='500 14px '+FONT;const w1=m.measureText(it.text).width;m.font='400 12px '+FONT;const w2=m.measureText('Tap to dismiss').width;
  const W=Math.ceil(22+20+12+w1+16+w2+22),H=52;const [c,x]=canvas(W,H);
  rr(x,0,0,W,H,12);x.fillStyle='#252a26';x.fill();tick(x,32,H/2,20);
  x.textBaseline='middle';x.font='500 14px '+FONT;x.fillStyle='#ffffff';x.fillText(it.text,54,H/2+0.5);
  x.font='400 12px '+FONT;x.fillStyle='#b1b5ad';x.fillText('Tap to dismiss',54+w1+16,H/2+0.5);
  return [c,W,H];
}
function png(c){return new Promise(r=>c.toBlob(b=>b.arrayBuffer().then(a=>r(new Uint8Array(a))),'image/png'));}

onmessage = async (e) => {
  const msg = e.data.pluginMessage;
  if (!msg || msg.type !== 'render') return;
  const out = [];
  for (const it of msg.items) { const [c,w,h] = render(it); out.push({ key: it.key, w, h, bytes: await png(c) }); }
  parent.postMessage({ pluginMessage: { type: 'rendered', items: out } }, '*');
};

const screens = Object.keys(IMAGES).map(name => ({ name, bytes: b64(IMAGES[name]) }));
parent.postMessage({ pluginMessage: { type: 'images', images: screens } }, '*');
</script></body></html>""".replace("__IMAGES__", json.dumps(images))

(here / "ui.html").write_text(html)
print(f"ui.html written with {len(images)} images ({len(html)/1e6:.1f} MB)")
