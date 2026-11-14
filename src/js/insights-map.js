/* ---------- Insights · Map: a heat map of where you spend ----------
   Uses transactions that have a map spot (GPS, a map pick, or a searched place). Brighter = more. */
const HEAT={p:null};
function loadHeat(){return loadLeaflet().then(()=>window.L.heatLayer?null:(HEAT.p||(HEAT.p=new Promise((res,rej)=>{const s=document.createElement("script");s.src=VEND+"leaflet.heat-0.2.0/leaflet-heat.js";s.onload=()=>res();s.onerror=()=>{HEAT.p=null;rej(new Error("heat"))};document.head.appendChild(s)}))))}
IS.hmMode=ls.get("pb.hm")||"amt";
function heatData(months){
  const all=[],pts=[];
  months.forEach(ym=>txOf(ym).forEach(t=>{if(t.type==="income")return;const g=groupNameOf(t,ym),it=itemNameOf(t,ym);if(IS.group&&g!==IS.group)return;if(IS.item&&it!==IS.item)return;
    all.push(t);if(t.loc&&t.loc.lat!=null&&t.loc.lng!=null&&sAmt(t)>0)pts.push(t)}));
  const places={};pts.forEach(t=>{const k=(locShort(t.loc)||locText(t.loc)).toLowerCase();const p=places[k]||(places[k]={name:locShort(t.loc)||locText(t.loc),full:locText(t.loc),amt:0,n:0,lat:0,lng:0});
    p.amt+=sAmt(t);p.n++;p.lat+=t.loc.lat;p.lng+=t.loc.lng});
  const list=Object.values(places).map(p=>Object.assign(p,{lat:p.lat/p.n,lng:p.lng/p.n,amt:round2(p.amt)}));
  return{all,pts,places:list};
}
// the place line without repeating the merchant ("Dog River Coffee" + "Hood River, OR")
function locSub(t){const l=t.loc;if(!l)return"";const nm=(l.name||"").toLowerCase(),mk=merchKey(t.merchant);return nm&&mk&&(mk.includes(nm)||nm.includes(mk))&&l.place?l.place:locText(l)}
function mapCard(fh,months,pending){
  const D=heatData(months);
  const pts=D.pts.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")||(b.createdAt||"").localeCompare(a.createdAt||""));
  IS.mapPts=pts;if(!(IS.mapActive>=-1&&IS.mapActive<pts.length))IS.mapActive=-1;
  let h='<section class="card mlcard"><div class="mltop"></div><div class="chead"><h2>Where you spend</h2></div>'+fh;
  if(pending)h+=SKEL;
  if(!pts.length)return h+'<div class="hmempty">'+PIN_SVG+'<b>No map spots yet</b><p>Transactions show up here once they have a location from your GPS, the map, or a searched place. New ones get your current location automatically; for older ones, open them and tap 🗺 next to Location.</p></div></section>';
  h+='<div class="mlmap"><div class="imap" id="imap"><div class="hmload">Loading map…</div></div>'+
    '<div class="mlzs" role="slider" aria-label="Zoom" aria-valuemin="3" aria-valuemax="18" tabindex="0"><span class="mlzp">+</span><div class="mlzt"><i class="mlzf"></i><b class="mlzb"></b></div><span class="mlzp">−</span></div>'+
    '<div class="mlcap" id="mlcap"></div></div>';
  const onMap=new Set(pts.map(t=>t.id)),missL=D.all.filter(t=>!onMap.has(t.id));IS.mapMiss=missL;const miss=missL.length;
  h+='<p class="mlnote">'+pts.length+' purchase'+(pts.length===1?'':'s')+' on the map'+(miss>0?' · <button type="button" class="mlmiss" data-mlmiss="1">'+miss+' without a spot ›</button>':'')+'</p>';
  let lastDay="";
  h+='<div class="mllist">'+pts.map((t,i)=>{const day=t.date!==lastDay?(i?'</div>':'')+'<div class="mlgrp"><div class="mlday">'+esc(fmtDay(t.date))+'</div>':'';lastDay=t.date;
    return day+'<button class="mlrow'+(i===IS.mapActive?' on':'')+'" data-mi="'+i+'"><i class="mldot"></i><div class="l"><div class="m">'+esc(t.merchant||"Purchase")+'</div><div class="c">'+PIN_SVG+esc(locSub(t))+'</div></div><div class="a num">'+(t.type==="refund"?"+":"")+money(+t.amount||0)+'</div></button>'}).join("")+(pts.length?'</div>':'')+'<div class="mlpad"></div></div>';
  setTimeout(initMapList,0);
  return h+'</section>';
}
const ML={map:null,pin:null,dots:[],raf:0,gl:false,noGL:false};
/* ---------- smooth flights between purchases (MapLibre GL, vector tiles) ----------
   Nearby purchase: a short glide. Far away (another city, across the country): one continuous
   zoom out → glide → zoom back in. Vector tiles are drawn every frame, so nothing blanks,
   fades or jump-cuts mid-flight. If WebGL or the map style can't load, the Leaflet map below
   takes over. Zoom numbers in the app stay in Leaflet units; MapLibre's are one lower. */
const GLV="4.7.1",GL_STYLE=window.PB_MAP_STYLE||"https://tiles.openfreemap.org/styles/positron";
const GLLIB={p:null},RMOT=window.matchMedia?matchMedia("(prefers-reduced-motion: reduce)"):{matches:false};
const glEase=t=>(1-Math.cos(Math.PI*t))/2; // ease-in-out-sine: gentle start/stop, low peak speed
let GLOK;function glOK(){if(GLOK===undefined){try{const c=document.createElement("canvas");GLOK=!!(window.WebGLRenderingContext&&(c.getContext("webgl2")||c.getContext("webgl")))}catch(_){GLOK=false}}return GLOK}
function loadMapGL(){if(window.maplibregl&&window.maplibregl.Map)return Promise.resolve();if(!glOK())return Promise.reject(new Error("webgl"));
  return GLLIB.p||(GLLIB.p=new Promise((res,rej)=>{const base=VEND+"maplibre-gl-"+GLV+"/maplibre-gl.";
    if(!document.querySelector('link[data-mlgl]')){const l=document.createElement("link");l.rel="stylesheet";l.href=base+"css";l.setAttribute("data-mlgl","");document.head.appendChild(l)}
    const s=document.createElement("script");s.src=base+"js";const to=setTimeout(()=>fail(),9000);
    const fail=()=>{clearTimeout(to);GLLIB.p=null;rej(new Error("map"))};
    s.onload=()=>{clearTimeout(to);window.maplibregl?res():fail()};s.onerror=fail;document.head.appendChild(s)}))}
function glFC(pts,cnt){return{type:"FeatureCollection",features:pts.map((t,i)=>({type:"Feature",id:i,properties:{n:cnt?cnt[i]:0},geometry:{type:"Point",coordinates:[t.loc.lng,t.loc.lat]}}))}}
// same heat rule as the Leaflet dots: purchases that overlap on screen glow hotter
function glHeat(){const m=ML.map,pts=IS.mapPts||[];if(!ML.gl||!m||!m.getSource("mlpts"))return;
  const P=pts.map(t=>m.project([t.loc.lng,t.loc.lat])),R=13,cnt=P.map(()=>0);
  for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const dx=P[i].x-P[j].x,dy=P[i].y-P[j].y;if(dx*dx+dy*dy<R*R){cnt[i]++;cnt[j]++}}
  const k=cnt.join(",");if(k===ML.heatKey)return;ML.heatKey=k;m.getSource("mlpts").setData(glFC(pts,cnt))}
// move the camera: "jump" (first draw), otherwise glide if it's already on screen, else fly
function glGo(center,z,how){const m=ML.map;if(!m)return;const zz=z-1;
  if(how==="jump"||RMOT.matches){m.jumpTo({center,zoom:zz});return}
  const w=m.getContainer().clientWidth,h=m.getContainer().clientHeight,p=m.project(center);
  const near=Math.abs(p.x-w/2)<w*.4&&Math.abs(p.y-h/2)<h*.4&&Math.abs(m.getZoom()-zz)<1.5;
  if(near){m.easeTo({center,zoom:zz,duration:550,easing:glEase});return}
  const c=m.getCenter(),km=locDist({lat:c.lat,lng:c.lng},{lat:center[1],lng:center[0]})/1000;
  m.flyTo({center,zoom:zz,curve:1.5,duration:Math.round(Math.min(3000,Math.max(1100,1000+km*.5))),easing:glEase,essential:true})}
function glFail(el,key){ML.noGL=true;ML.gl=false;if(ML.map){try{ML.map.remove()}catch(_){}ML.map=null}ML.key=null;
  if(el&&el.isConnected){el.innerHTML="";initMapLeaflet(el,key)}}
function initMapGL(el,key){const gl=window.maplibregl,pts=IS.mapPts;
  if(ML.map){try{ML.map.remove()}catch(_){}ML.map=null}
  el.innerHTML='<div class="hmload">Loading map…</div>';ML.el=el;ML.key=key;ML.gl=true;ML.dots=[];ML.pin=null;ML.heatKey="";
  const t0=pts[Math.max(0,IS.mapActive)]||pts[0];let map;
  try{map=new gl.Map({container:el,style:GL_STYLE,center:[t0.loc.lng,t0.loc.lat],zoom:14,interactive:false,attributionControl:{compact:true},
    fadeDuration:0,maxTileCacheSize:800,refreshExpiredTiles:false})}catch(_){glFail(el,key);return}
  ML.map=map;let ready=false,styleOk=false,tiles=0,bad=0;map.once("styledata",()=>{styleOk=true});
  const guard=setTimeout(()=>{if(!styleOk&&ML.map===map)glFail(el,key)},10000); // style never arrived: use Leaflet
  map.on("error",()=>{if(ML.map!==map)return;if(!styleOk){clearTimeout(guard);glFail(el,key);return}
    if(++bad>=4&&!tiles&&!el.querySelector(".hmload")){const d=document.createElement("div");d.className="hmload";d.textContent="Map pictures aren't loading. Check your connection.";el.appendChild(d)}});
  map.on("data",e=>{if(e.tile)tiles++});
  map.on("load",()=>{if(ML.map!==map)return;ready=true;clearTimeout(guard);const ld=el.querySelector(".hmload");if(ld)ld.remove();
    map.addSource("mlpts",{type:"geojson",data:glFC(pts)});
    const off=["boolean",["feature-state","off"],false];
    map.addLayer({id:"mlpts",type:"circle",source:"mlpts",layout:{"circle-sort-key":["get","n"]},paint:{
      "circle-radius":["case",[">",["get","n"],0],7,6],
      "circle-color":["step",["get","n"],ML_HEAT[0][1]].concat(...ML_HEAT.slice(1)),
      "circle-stroke-color":"#fff","circle-stroke-width":1.5,
      "circle-opacity":["case",off,0,1],"circle-stroke-opacity":["case",off,0,1]}});
    // Leaflet-shaped handles so the list code drives either map the same way
    ML.dots=pts.map((t,i)=>({setStyle:s=>{try{map.setFeatureState({source:"mlpts",id:i},{off:s.opacity===0})}catch(_){}}}));
    const pe=document.createElement("div");pe.className="mlpin";pe.innerHTML=PIN_SVG+'<i></i>';pe.style.opacity="0";
    const mk=new gl.Marker({element:pe,anchor:"bottom",offset:[0,2]}).setLngLat([t0.loc.lng,t0.loc.lat]).addTo(map);
    ML.pin={setOpacity:o=>{pe.style.opacity=String(o)},setLatLng:ll=>mk.setLngLat([ll[1],ll[0]]),getElement:()=>pe};
    map.on("moveend",glHeat);map.on("zoom",mlZoomUI);mlZoomWire();mlTapWire(el);
    el.classList.add("on");const cur=IS.mapActive;IS.mapActive=-2;mlSetActive(cur,true);glHeat();setTimeout(mlScan,60)});
}
// dots that sit on top of each other at the current zoom turn hotter: blue → purple → orange → red
const ML_HEAT=[[0,"#1a73e8"],[1,"#8e44e8"],[2,"#ff9800"],[4,"#f4511e"],[7,"#c62828"]];
function mlHeatDots(){if(ML.gl)return glHeat();const m=ML.map;if(!m||!ML.dots.length||!m._loaded)return;
  const P=ML.dots.map(d=>m.latLngToLayerPoint(d.getLatLng())),R=13,cnt=P.map(()=>0);
  for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const dx=P[i].x-P[j].x,dy=P[i].y-P[j].y;if(dx*dx+dy*dy<R*R){cnt[i]++;cnt[j]++}}
  const col=n=>{let c=ML_HEAT[0][1];for(const [k,v] of ML_HEAT)if(n>=k)c=v;return c};
  ML.dots.map((d,i)=>[d,cnt[i]]).sort((a,b)=>a[1]-b[1]).forEach(([d,n])=>{if(!d._path)return;d.setStyle({fillColor:col(n),radius:n?7:6});d.bringToFront()})}
// the zoom bar on the right of the map: drag up to zoom in, down to zoom out (always around the current spot)
const MLZ={min:3,max:18};
function mlZoomUI(){const m=ML.map,b=document.querySelector("#main .mlzs");if(!m||!b)return;const zz=m.getZoom()+(ML.gl?1:0),f=(zz-MLZ.min)/(MLZ.max-MLZ.min),p=Math.max(0,Math.min(1,f))*100;
  b.querySelector(".mlzb").style.bottom=p+"%";b.querySelector(".mlzf").style.height=p+"%";b.setAttribute("aria-valuenow",zz.toFixed(1))}
function mlZoomWire(){const b=document.querySelector("#main .mlzs");if(!b||b._w)return;b._w=1;const tr=b.querySelector(".mlzt");
  const at=y=>{const r=tr.getBoundingClientRect();return MLZ.min+(1-Math.max(0,Math.min(1,(y-r.top)/r.height)))*(MLZ.max-MLZ.min)};
  const go=z=>{const m=ML.map;if(!m)return;const t=(IS.mapPts||[])[IS.mapActive];
    if(ML.gl){m.jumpTo({center:t?[t.loc.lng,t.loc.lat]:m.getCenter(),zoom:z-1});if(IS.mapActive>=0)IS.mapZoom=z;mlZoomUI();return}
    ML.user=true;m.setView(t?[t.loc.lat,t.loc.lng]:m.getCenter(),z,{animate:false});if(IS.mapActive>=0)IS.mapZoom=z;mlZoomUI()};
  let on=false,last=0;
  b.addEventListener("pointerdown",e=>{on=true;b.classList.add("on");try{b.setPointerCapture(e.pointerId)}catch(_){}go(at(e.clientY));e.preventDefault()});
  b.addEventListener("pointermove",e=>{if(!on)return;const z=at(e.clientY);go(z);if(Math.round(z)!==last){last=Math.round(z);try{navigator.vibrate&&navigator.vibrate(2)}catch(_){}}});
  ["pointerup","pointercancel","lostpointercapture"].forEach(t=>b.addEventListener(t,()=>{on=false;b.classList.remove("on")}));
  b.addEventListener("keydown",e=>{const m=ML.map;if(!m)return;if(e.key==="ArrowUp"||e.key==="ArrowRight"){go(Math.min(MLZ.max,m.getZoom()+1));e.preventDefault()}else if(e.key==="ArrowDown"||e.key==="ArrowLeft"){go(Math.max(MLZ.min,m.getZoom()-1));e.preventDefault()}});
  mlZoomUI()}
// tap a dot on either map (MapLibre or Leaflet) → go to that purchase; finger-sized target around each dot
function mlCapHTML(t){return '<b>'+esc(t.merchant||"Purchase")+' · '+money(+t.amount||0)+'</b><span>'+esc(locSub(t))+' · '+esc(fmtDay(t.date))+'</span>'+
  '<button type="button" class="mlcopy" data-mlcopy aria-label="Copy the address"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/></svg>Copy address</button>'}
/* Copy the selected purchase's address (business, street, town) for pasting into Maps.
   iPhone only lets a page copy during the tap itself, so the lookup is handed to the clipboard as a promise. */
function mlAddr(t){const l=t.loc||{};const done=road=>{const parts=[];if(l.name)parts.push(l.name);if(road)parts.push(road);
    const town=l.place||(locText(l).split(",").slice(-2).join(",").trim());if(town&&!parts.some(p=>p===town))parts.push(town);
    return parts.length?addrDedupe(parts.join(", ")):(l.lat!=null?l.lat.toFixed(6)+", "+l.lng.toFixed(6):locText(l))};
  if(l.lat==null)return Promise.resolve(done(""));
  return LOC.place({lat:l.lat,lng:l.lng}).then(pl=>done(pl&&pl.road||"")).catch(()=>done(""))}
function mlCopyAddr(){const t=(IS.mapPts||[])[IS.mapActive];if(!t)return;try{haptic()}catch(_){}
  const p=mlAddr(t);let wrote;
  try{if(window.ClipboardItem&&navigator.clipboard&&navigator.clipboard.write)wrote=navigator.clipboard.write([new ClipboardItem({"text/plain":p.then(s=>new Blob([s],{type:"text/plain"}))})]);
    else wrote=p.then(s=>navigator.clipboard.writeText(s))}catch(e){wrote=Promise.reject(e)}
  Promise.all([p,wrote]).then(([s])=>toast("Copied: "+s)).catch(()=>p.then(s=>{try{const ta=document.createElement("textarea");ta.value=s;ta.style.position="fixed";ta.style.opacity="0";document.body.appendChild(ta);ta.select();const ok=document.execCommand("copy");ta.remove();toast(ok?"Copied: "+s:"Address: "+s)}catch(_){toast("Address: "+s)}}))}
function mlTapWire(el){if(!el||el._tap)return;el._tap=1;
  el.addEventListener("click",e=>{const m=ML.map,pts=IS.mapPts||[];if(!m||!pts.length)return;const r=el.getBoundingClientRect(),x=e.clientX-r.left,y=e.clientY-r.top;
    const pe=ML.pin&&ML.pin.getElement&&ML.pin.getElement();if(pe&&IS.mapActive>=0&&pe.style.opacity!=="0"){const b=pe.getBoundingClientRect();if(e.clientX>=b.left-8&&e.clientX<=b.right+8&&e.clientY>=b.top-8&&e.clientY<=b.bottom+8){mlCopyAddr();return}} // tap the pin = copy its address
    let best=-1,bd=26*26;pts.forEach((t,k)=>{const q=ML.gl?m.project([t.loc.lng,t.loc.lat]):m.latLngToContainerPoint([t.loc.lat,t.loc.lng]);const dx=q.x-x,dy=q.y-y,dd=dx*dx+dy*dy;if(dd<bd){bd=dd;best=k}});
    if(best>=0){if(best===IS.mapActive)mlCopyAddr();else mlGo(best)}})}
// bring purchase i into the slot under the map and select it (from a row tap or a dot tap)
function mlGo(i){const r=document.querySelector('#main .mlrow[data-mi="'+i+'"]');if(!r)return;try{haptic()}catch(_){}
  document.querySelectorAll("#main .mlrow").forEach(x=>x.classList.toggle("on",x===r));
  r.scrollIntoView({block:"start",behavior:"smooth"});clearTimeout(ML.settle);ML.settle=setTimeout(()=>{if(IS.mapActive!==i)mlSetActive(i)},450);
  r.classList.remove("flash");void r.offsetWidth;r.classList.add("flash")}
/* Only cover what's behind the glass header once the map is actually pinned (otherwise it would hide the card title) */
function mlStuck(){const m=document.querySelector("#main .mlmap");const on=!!m&&m.getBoundingClientRect().top<=(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hh"))||120)-2;document.documentElement.classList.toggle("mlstuck",on)}
let MLS=0;addEventListener("scroll",()=>{if(S.tab==="insights"&&IS.sub==="map"){if(!MLS)MLS=requestAnimationFrame(()=>{MLS=0;mlStuck()})}else document.documentElement.classList.remove("mlstuck")},{passive:true});
/* "N without a spot": one opens that transaction to add a location; several open a short list */
function mlMissing(){const L=IS.mapMiss||[];if(!L.length)return;const open=t=>isHist(t)?histSheet(t):txSheet(t);if(L.length===1){open(L[0]);return}
  openSheet('<h3>Without a map spot</h3><p class="note" style="margin:-4px 0 10px">Open one and tap 🗺 next to Location to place it.</p>'+L.map(t=>'<button class="txrow" data-mt="'+esc(t.id)+'"><div class="l"><div class="m">'+esc(t.merchant||"Purchase")+'</div><div class="c">'+esc(fmtDay(t.date))+'</div></div><div class="a num">'+money(+t.amount||0)+'</div></button>').join(""),
    sh=>sh.querySelectorAll("[data-mt]").forEach(b=>b.onclick=()=>{const t=L.find(x=>x.id===b.dataset.mt);if(t)open(t)}))}
function mlLine(){const m=document.querySelector("#main .mlmap");return m?m.getBoundingClientRect().bottom+28+ML_DAYH:0}
const ML_DAYH=34;
function mlOverview(force){
  const pts=IS.mapPts||[],changed=IS.mapActive!==-1;IS.mapActive=-1;if(changed&&IS.mapActive!==-2)IS.mapZoom=null; // back at the top: next dive starts at street level
  document.querySelectorAll("#main .mlrow").forEach(r=>r.classList.remove("on"));
  const spent=round2(pts.reduce((a,t)=>a+sAmt(t),0)),places=new Set(pts.map(t=>(locShort(t.loc)||"").toLowerCase())).size;
  const cap=$("#mlcap");if(cap){cap.innerHTML='<b>All '+pts.length+' purchase'+(pts.length===1?'':'s')+' · '+money(spent)+'</b><span>'+places+' place'+(places===1?'':'s')+' · scroll down to visit each one</span>';if(changed){cap.classList.remove("pop");void cap.offsetWidth;cap.classList.add("pop")}}
  const map=ML.map;if(!map||!(ML.gl||window.L))return;
  ML.dots.forEach(d=>d.setStyle({opacity:1,fillOpacity:1}));
  if(ML.pin)ML.pin.setOpacity(0);
  if(!changed&&!force)return;
  if(ML.gl){if(!pts.length)return;const B=new window.maplibregl.LngLatBounds();pts.forEach(t=>B.extend([t.loc.lng,t.loc.lat]));
    const w=map.getContainer().clientWidth,h=map.getContainer().clientHeight,px=Math.min(40,w/6),py=Math.min(40,h/6);
    const cam=map.cameraForBounds(B,{padding:{top:py,bottom:py,left:px,right:px+30},maxZoom:13})||{center:B.getCenter(),zoom:3};
    if(force||RMOT.matches)map.jumpTo({center:cam.center,zoom:cam.zoom});
    else map.flyTo({center:cam.center,zoom:cam.zoom,curve:1.42,duration:1400,easing:glEase,essential:true});
    return}
  const b=window.L.latLngBounds(pts.map(t=>[t.loc.lat,t.loc.lng]));
  map.stop();if(b.isValid()){const el=map.getContainer();if(force)map.fitBounds(b.pad(0.2),{maxZoom:14,animate:false});
    else{el.classList.add("cut");setTimeout(()=>{if(!ML.map)return;map.fitBounds(b.pad(0.2),{maxZoom:14,animate:false});requestAnimationFrame(()=>el.classList.remove("cut"))},120)}}
}
function mlSetActive(i,force){
  if(i<0){mlOverview(force);return}
  const pts=IS.mapPts||[],t=pts[i];if(!t)return;const changed=i!==IS.mapActive,fromOverview=IS.mapActive===-1;IS.mapActive=i;
  document.querySelectorAll("#main .mlrow").forEach(r=>r.classList.toggle("on",+r.dataset.mi===i));
  const cap=$("#mlcap");if(cap){cap.innerHTML=mlCapHTML(t);cap.classList.remove("pop");void cap.offsetWidth;cap.classList.add("pop")}
  const map=ML.map;if(!map)return;const ll=[t.loc.lat,t.loc.lng];
  ML.dots.forEach((d,k)=>d.setStyle(k===i?{opacity:0,fillOpacity:0}:{opacity:1,fillOpacity:1}));
  if(ML.pin){ML.pin.setOpacity(1);ML.pin.setLatLng(ll);const el=ML.pin.getElement();if(el&&changed){el.classList.remove("drop");void el.offsetWidth;el.classList.add("drop")}}
  if(!changed&&!force)return;
  const c=map.getCenter(),far=locDist({lat:c.lat,lng:c.lng},{lat:ll[0],lng:ll[1]});
  // leaving the overview zooms in to street level (or the zoom you last pinched to)
  const z=IS.mapZoom||15;
  if(ML.gl){glGo([ll[1],ll[0]],z,force?"jump":"fly");return}
  map.stop();
  const el=map.getContainer(),zoomNow=Math.abs(map.getZoom()-z)<.05;
  if(force)map.setView(ll,z,{animate:false});
  else if(zoomNow&&far<25e3)map.panTo(ll,{animate:true,duration:.4,easeLinearity:.3});
  else{el.classList.add("cut");setTimeout(()=>{if(!ML.map)return;map.setView(ll,z,{animate:false});requestAnimationFrame(()=>el.classList.remove("cut"))},120)}
}
/* The list snaps one purchase at a time into the slot right under the map (CSS scroll snapping),
   and the map moves once the scroll comes to rest on it. Top of the list = overview. */
/* The pinned date sits exactly under the map: worked out live in CSS from the header height (--hh) and the map's height,
   so it stays right even when the header changes size (banner text, safe area). */
let mlRO=null;
function mlSnapVar(){const m=document.querySelector("#main .mlmap");if(!m)return;const de=document.documentElement,setH=v=>{if(de.style.getPropertyValue("--mlmaph")!==v)de.style.setProperty("--mlmaph",v)};
  if(window.ResizeObserver){if(mlRO&&mlRO._m===m)return;if(mlRO)mlRO.disconnect();mlRO=new ResizeObserver(()=>{if(m.isConnected)setH(m.offsetHeight+"px")});mlRO._m=m;mlRO.observe(m)}
  setH(m.offsetHeight+"px");if(!de.style.getPropertyValue("--mlsnap"))de.style.setProperty("--mlsnap","calc(var(--hh,120px) - 4px + var(--mlmaph,340px))")}
function mlPick(){const rows=document.querySelectorAll("#main .mlrow");if(!rows.length)return null;const line=mlLine()-28;
  if(rows[0].getBoundingClientRect().top>line+24)return -1;
  let best=-1,bd=1e9;for(const r of rows){const d=Math.abs(r.getBoundingClientRect().top-line);if(d<bd){bd=d;best=+r.dataset.mi}else if(d>bd)break}
  return best}
function mlScan(){ML.raf=0;if(S.tab!=="insights"||IS.sub!=="map")return;const pick=mlPick();if(pick==null)return;
  document.querySelectorAll("#main .mlrow").forEach(r=>r.classList.toggle("on",+r.dataset.mi===pick)); // highlight follows your finger
  clearTimeout(ML.settle);ML.settle=setTimeout(mlSettle,140)}                                          // the map waits for the scroll to rest
function mlSettle(){if(S.tab!=="insights"||IS.sub!=="map")return;const pick=mlPick();if(pick==null||pick===IS.mapActive)return;
  mlSetActive(pick);try{navigator.vibrate&&navigator.vibrate(4)}catch(_){}}
window.addEventListener("scroll",()=>{if(!ML.raf&&S.tab==="insights"&&IS.sub==="map")ML.raf=requestAnimationFrame(mlScan)},{passive:true});
if("onscrollend" in window)window.addEventListener("scrollend",()=>{if(S.tab==="insights"&&IS.sub==="map"){clearTimeout(ML.settle);mlSettle()}});
window.addEventListener("resize",()=>{if(S.tab==="insights"&&IS.sub==="map")mlSnapVar()});
function initMapList(){
  const el=document.querySelector("#main #imap");if(!el||!IS.mapPts||!IS.mapPts.length)return;
  const key=IS.mapPts.map(t=>t.id+"@"+t.loc.lat+","+t.loc.lng).join("|");
  if(ML.map&&ML.key===key&&ML.el&&!ML.el.isConnected){
    el.replaceWith(ML.el);if(ML.gl)ML.map.resize();else ML.map.invalidateSize({animate:false});mlZoomWire();mlZoomUI();
    const cur=IS.mapActive;document.querySelectorAll("#main .mlrow").forEach(r=>r.classList.toggle("on",+r.dataset.mi===cur));
    if(cur>=0){const t=IS.mapPts[cur],c=$("#mlcap");if(c&&t)c.innerHTML=mlCapHTML(t)}else mlOverview(false);
    return}
  if(!ML.noGL){loadMapGL().then(()=>{if(el.isConnected)initMapGL(el,key)}).catch(()=>{ML.noGL=true;if(el.isConnected)initMapLeaflet(el,key)});return}
  initMapLeaflet(el,key);
}
function initMapLeaflet(el,key){
  loadLeaflet().then(()=>{if(!el.isConnected)return;const L=window.L,pts=IS.mapPts;
    if(ML.map){try{ML.map.remove()}catch(_){}ML.map=null}
    el.innerHTML="";ML.el=el;ML.key=key;ML.gl=false;
    // look-only map: no dragging or pinching; the list and the +/− buttons move it
    const map=L.map(el,{zoomControl:false,attributionControl:true,dragging:false,touchZoom:false,doubleClickZoom:false,scrollWheelZoom:false,boxZoom:false,keyboard:false,tap:false,inertia:false,zoomSnap:0,zoomDelta:.5,bounceAtZoomLimits:false});ML.map=map;
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
    map.attributionControl.setPrefix(false);
    // dots that pile up glow hotter: one purchase is a blue dot, overlaps run purple → orange → red
    ML.dots=pts.map(t=>L.circleMarker([t.loc.lat,t.loc.lng],{radius:6,color:"#fff",weight:1.5,fillColor:"#1a73e8",fillOpacity:1,interactive:false}).addTo(map));
    map.on("zoomend",mlHeatDots);
    mlTapWire(el);map.on("zoomstart",()=>el.classList.add("zooming"));map.on("zoomend",()=>el.classList.remove("zooming"));
    const t0=pts[Math.max(0,IS.mapActive)]||pts[0];
    ML.pin=L.marker([t0.loc.lat,t0.loc.lng],{interactive:false,keyboard:false,opacity:0,icon:L.divIcon({className:"mlpin",html:PIN_SVG+'<i></i>',iconSize:[36,36],iconAnchor:[18,34]})}).addTo(map);
    map.setView([t0.loc.lat,t0.loc.lng],15,{animate:false});mlHeatDots();
    ML.user=false;map.on("zoomstart",e=>{});el.addEventListener("touchstart",e=>{if(e.touches.length>1)ML.user=true},{passive:true});
    map.on("zoomend",()=>{if(ML.user&&IS.mapActive>=0)IS.mapZoom=map.getZoom();ML.user=false;mlZoomUI()});map.on("zoom",mlZoomUI);mlZoomWire();
    el.classList.add("on");const cur=IS.mapActive;IS.mapActive=-2;mlSetActive(cur,true);setTimeout(mlScan,60);
    const tl=Object.values(map._layers).find(x=>x instanceof L.TileLayer);let ok=0,bad=0;
    if(tl){tl.on("tileload",()=>ok++);tl.on("tileerror",()=>{if(++bad>=4&&!ok&&!el.querySelector(".hmload")){const d=document.createElement("div");d.className="hmload";d.textContent="Map pictures aren't loading. Check your connection.";el.appendChild(d)}})}
  }).catch(()=>{el.innerHTML='<div class="hmload">The map couldn\'t load here. Open Pocket Budget from your Home Screen.</div>'});
}
$("#main").addEventListener("click",e=>{
  if(e.target.closest("#mlcap")){if(IS.mapActive>=0)mlCopyAddr();return}
  const r=e.target.closest(".mlrow");if(r)mlGo(+r.dataset.mi);
});

