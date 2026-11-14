/* ---------- interactive donut (Spending Totals) ---------- */
const DHINT='<p class="note dhint">Tap a slice or a row to see what\'s behind it.</p>';
const DR=92,DW=34,DC=2*Math.PI*DR;
function donutI(keys,vals,cm,total,anim){
  let g='',acc=0;const gap=keys.length>1?2.2:0;
  const disp=dispFracs(keys.map(k=>Math.max(0,vals[k]||0)));
  keys.forEach((k,i)=>{const v=vals[k];if(v<=0)return;const len=DC*disp[i],mid=(acc+len/2)/DC*2*Math.PI;
    const dash=Math.max(.5,len-gap);
    const on=IS.sel===k,dim=IS.sel&&!on,off=on?"translate("+(Math.cos(mid)*9).toFixed(1)+"px,"+(Math.sin(mid)*9).toFixed(1)+"px)":"";
    g+='<circle class="dseg'+(on?" on":"")+(dim?" dim":"")+'" data-dkey="'+esc(k)+'" data-mid="'+mid.toFixed(4)+'" data-a0="'+(acc/DC*360).toFixed(3)+'" data-a1="'+((acc+len)/DC*360).toFixed(3)+'" cx="130" cy="130" r="'+DR+'" fill="none" stroke="'+cm[k]+'" stroke-width="'+DW+'" stroke-dasharray="'+dash.toFixed(2)+' '+DC.toFixed(2)+'" stroke-dashoffset="'+(-acc).toFixed(2)+'" style="--len:'+dash.toFixed(2)+';--d:'+(i*0.07).toFixed(2)+'s'+(off?';transform:'+off:'')+'"><title>'+esc(k)+' · '+money(round2(v))+'</title></circle>';
    acc+=len});
  const sel=IS.sel&&IS.dd&&IS.dd[IS.sel];
  const c=sel?[esc(IS.sel),money(round2(sel.v)).replace(/\.00$/,""),sel.pct+"%"]:[(IS.group?esc(IS.group):"Total Spent"),money(Math.round(total)).replace(/\.00$/,""),""];
  return '<svg class="donut di'+(anim?" anim":"")+'" viewBox="0 0 260 260" role="img" aria-label="Spending by '+(IS.group?"item":"group")+'">'+
    '<circle class="dbg" cx="130" cy="130" r="'+(DR+DW/2+3)+'" fill="#fff"/>'+
    '<g class="wheel" style="transform:rotate('+(IS.sel?(IS.rot||0):0).toFixed(2)+'deg)"><g transform="rotate(-90 130 130)">'+(total>0?g:'<circle cx="130" cy="130" r="'+DR+'" fill="none" stroke="var(--trk)" stroke-width="'+DW+'"/>')+'</g></g>'+
    '<path class="dptr" d="M121 -12 L139 -12 L130 0 Z"'+(sel?' style="fill:'+sel.c+'"':'')+'/>'+
    '<circle class="dhit" data-dcenter="1" cx="130" cy="130" r="'+(DR-DW/2-4)+'" fill="transparent"/>'+
    '<g id="dcen" class="dcen" data-total="'+total+'"><text x="130" y="116" text-anchor="middle" class="dl">'+c[0]+'</text><text x="130" y="146" text-anchor="middle" class="dv num">'+c[1]+'</text><text x="130" y="168" text-anchor="middle" class="dp num">'+c[2]+'</text></g></svg>';
}
// every slice gets at least ~11° of the ring (less when there are many) so thin ones are easy to land on
function dispFracs(vs){
  const tot=vs.reduce((a,b)=>a+b,0),n=vs.filter(v=>v>0).length;if(!tot)return vs.map(()=>0);
  const m=Math.min(11/360,.55/n),orig=vs.map(v=>v/tot);let small=new Set();
  for(let it=0;it<8;it++){
    const rest=1-m*small.size,big=orig.reduce((a,f,i)=>a+(small.has(i)||!f?0:f),0);
    let changed=false;orig.forEach((f,i)=>{if(f>0&&!small.has(i)&&f*rest/big<m){small.add(i);changed=true}});
    if(!changed)return orig.map((f,i)=>!f?0:small.has(i)?m:f*rest/big);
  }
  return orig;
}
function dCountUp(){
  const v=document.querySelector("#main #dcen .dv");if(!v||IS.sel)return;const tot=+document.querySelector("#main #dcen").dataset.total||0;
  if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  const t0=performance.now(),dur=900;(function f(now){const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3);if(!v.isConnected||IS.sel)return;v.textContent=money(Math.round(tot*e)).replace(/\.00$/,"");if(k<1)requestAnimationFrame(f)})(t0);
}
function donutDetails(keys,byKey,byMonth,months,cm,total){
  const td=today(),out={},span=months.length&&months[0].slice(0,4)!==months[months.length-1].slice(0,4);
  const mLabel=ym=>shortM(ym)+(span?" \u2019"+ym.slice(2,4):"");
  keys.forEach(k=>{
    const series=months.map(ym=>round2((byMonth[ym]||{})[k]||0)),n=series.length,v=byKey[k];
    let ti=0;series.forEach((x,i)=>{if(x>series[ti])ti=i});
    let trend=null;if(n>=2){const hf=Math.floor(n/2),a=series.slice(0,hf).reduce((s,x)=>s+x,0)/hf,b=series.slice(n-hf).reduce((s,x)=>s+x,0)/hf;trend=a>0?Math.round((b-a)/a*100):(b>0?100:0)}
    const parts={};let big=null;
    months.forEach(ym=>txOf(ym).forEach(t=>{
      if(t.type==="income"||t.date>td)return;
      const g=groupNameOf(t,ym),it=itemNameOf(t,ym);
      if(IS.group){if(g!==IS.group||it!==k)return}else if(g!==k)return;
      const name=IS.group?(String(t.merchant||"Purchase").replace(/^\s*venmo\s*:\s*/i,"").trim()||"Purchase"):it;
      parts[name]=(parts[name]||0)+sAmt(t);
      if(t.type!=="refund"&&(!big||+t.amount>big.a))big={m:t.merchant||"Purchase",a:+t.amount||0,d:t.date};
    }));
    const pk=Object.keys(parts).filter(x=>parts[x]>0).sort((a,b)=>parts[b]-parts[a]).slice(0,5).map(x=>[x,round2(parts[x])]);
    out[k]={v,c:cm[k],pct:total>0?(v/total*100<1?(v/total*100).toFixed(1):Math.round(v/total*100)):0,avg:round2(v/Math.max(1,n)),series,months,topM:n?mLabel(months[ti]):"",topV:series[ti]||0,trend,parts:pk,big,mLabel};
  });
  return out;
}
function dPanelHTML(k){
  const d=IS.dd&&IS.dd[k];if(!d)return DHINT;
  const n=d.series.length,mx=Math.max(...d.series,0.01);
  const tr=d.trend===null?"—":d.trend>=200?"↑ "+(d.trend/100+1).toFixed(1)+"×":(d.trend>0?"↑ ":d.trend<0?"↓ ":"")+Math.abs(d.trend)+"%";
  let h='<div class="dpanel" style="--c:'+d.c+'"><div class="dph"><i></i><b>'+esc(k)+'</b><span class="num">'+d.pct+'% of '+(IS.group?esc(IS.group):"all spending")+'</span></div>';
  h+='<div class="dstats"><div><small>Monthly avg</small><b class="num">'+money(d.avg)+'</b></div><div><small>Top month</small><b class="num">'+esc(d.topM)+'</b><span class="num">'+money(d.topV)+'</span></div><div><small>Trend</small><b class="num'+(d.trend>0?" up":d.trend<0?" down":"")+'">'+tr+'</b><span>'+(n>=2?"recent vs earlier":"needs 2+ months")+'</span></div></div>';
  if(n>=2)h+='<div class="dspark" role="img" aria-label="Monthly amounts">'+d.series.map((x,i)=>'<div title="'+esc(d.mLabel(d.months[i]))+' · '+money(x)+'"><i style="height:'+Math.max(x>0?6:2,x/mx*100).toFixed(1)+'%;--d:'+(i*0.04).toFixed(2)+'s"></i><span>'+esc(shortM(d.months[i]).slice(0,1))+'</span></div>').join("")+'</div>';
  if(d.parts.length){const pm=d.parts[0][1];
    h+='<div class="dparts"><h5>'+(IS.group?"Top merchants":"Biggest items")+'</h5>'+d.parts.map(([nm,v],i)=>'<div class="dpart"><span class="pn">'+esc(nm)+'</span><span class="pb"><i style="width:'+Math.max(3,v/pm*100).toFixed(1)+'%;--d:'+(0.1+i*0.05).toFixed(2)+'s"></i></span><b class="num">'+money(v)+'</b></div>').join("")+'</div>'}
  if(d.big)h+='<p class="dbig">Biggest purchase: <b>'+esc(d.big.m)+'</b> · <span class="num">'+money(d.big.a)+'</span> · '+esc(dfmt({month:"short",day:"numeric",year:"numeric"}).format(new Date(d.big.d+"T12:00:00")))+'</p>';
  h+='<div class="btnrow">'+(IS.group?'':'<button class="btn" data-ddrill="'+esc(k)+'">Break down '+esc(k)+'</button>')+'<button class="btn sec" data-dtrend="'+esc(k)+'">Month by month</button></div></div>';
  return h;
}
/* the wheel: drag or flick to spin, the slice under the top pointer is the selected one */
const WH={raf:0,drag:null,lastTop:null,gen:0};
const dsvg=()=>document.querySelector("#main svg.di");
const dsegs=()=>[...document.querySelectorAll("#main svg.di .dseg")];
const nrm=a=>{a%=360;return a<0?a+360:a};
function setRot(r){IS.rot=r;const w=document.querySelector("#main svg.di .wheel");if(w)w.style.transform="rotate("+r.toFixed(2)+"deg)"}
function sliceAt(a){a=nrm(a);const s=dsegs();for(const c of s)if(a>=+c.dataset.a0&&a<+c.dataset.a1)return c;return s[0]||null}
const topSlice=()=>sliceAt(-(IS.rot||0));
const midDeg=c=>(+c.dataset.a0+ +c.dataset.a1)/2;
function rotFor(c){const cur=IS.rot||0;let d=nrm(-midDeg(c)-cur);if(d>180)d-=360;return cur+d}
// while the wheel moves, nothing on it changes except the arrow's tint: no centre text, no pops
function spinning(on){const svg=dsvg();if(!svg)return;svg.classList.remove("anim");
  if(on&&!svg.classList.contains("spinning")){svg.classList.add("spinning");WH.gen++;
    dsegs().forEach(c=>{c.classList.remove("on","dim");c.style.transform=""});
    document.querySelectorAll("#main .drow").forEach(r=>r.classList.remove("on","dim"));
    const pn=$("#dpanel");if(pn)pn.classList.add("stale")}
  else if(!on)svg.classList.remove("spinning")}
function tintArrow(){const svg=dsvg(),c=topSlice();if(!svg||!c)return;const ptr=svg.querySelector(".dptr");if(ptr)ptr.style.fill=c.getAttribute("stroke");
  if(c.dataset.dkey!==WH.lastTop){WH.lastTop=c.dataset.dkey;try{haptic()}catch(_){}}}
// the wheel is at rest: show k as selected (null = whole view), fade the centre in, open its card
function settle(k){
  IS.sel=k||null;const svg=dsvg();if(!svg)return;const gen=++WH.gen;
  svg.classList.remove("spinning","anim");
  dsegs().forEach(c=>{const on=c.dataset.dkey===IS.sel,mid=+c.dataset.mid;
    c.classList.toggle("on",on);c.classList.toggle("dim",!!IS.sel&&!on);
    c.style.transform=on?"translate("+(Math.cos(mid)*9).toFixed(1)+"px,"+(Math.sin(mid)*9).toFixed(1)+"px)":""});
  document.querySelectorAll("#main .drow").forEach(r=>{r.classList.toggle("on",r.dataset.dkey===IS.sel);r.classList.toggle("dim",!!IS.sel&&r.dataset.dkey!==IS.sel)});
  const d=IS.sel&&IS.dd&&IS.dd[IS.sel],ptr=svg.querySelector(".dptr");if(ptr)ptr.style.fill=d?d.c:"";
  const cen=svg.querySelector("#dcen"),[l,v,p]=cen.querySelectorAll("text");
  cen.classList.add("swap");
  setTimeout(()=>{if(gen!==WH.gen)return;
    if(d){l.textContent=IS.sel;v.textContent=money(round2(d.v)).replace(/\.00$/,"");p.textContent=d.pct+"%"}
    else{l.textContent=IS.group||"Total Spent";v.textContent=money(Math.round(+cen.dataset.total)).replace(/\.00$/,"");p.textContent=""}
    cen.classList.remove("swap")},90);
  const pn=$("#dpanel");if(pn){pn.classList.remove("stale");if(pn.dataset.k!==String(IS.sel)){
      // while you're reading the details (bar showing), keep the page from shrinking under you as the card changes
      pn.style.minHeight=DBAR.el&&DBAR.el.classList.contains("on")?Math.max(pn.offsetHeight,parseFloat(pn.style.minHeight)||0)+"px":"";
      pn.innerHTML=IS.sel?dPanelHTML(IS.sel):DHINT;pn.dataset.k=String(IS.sel)}}
  dock();
}
function spinTo(target,ms,done,v0){
  cancelAnimationFrame(WH.raf);const from=IS.rot||0,dist=target-from;
  if(Math.abs(dist)<.05||matchMedia("(prefers-reduced-motion:reduce)").matches){setRot(target);done&&done();return}
  const t0=performance.now();
  const k0=v0&&Math.sign(v0)===Math.sign(dist)?Math.min(3,Math.abs(v0)*ms/Math.abs(dist)):1.8;
  const ease=t=>{const a=k0,b=3-2*a,c=a-2;return Math.min(1,a*t+b*t*t+c*t*t*t)};
  (function f(now){const t=Math.min(1,(now-t0)/ms);setRot(from+dist*ease(t));tintArrow();if(t<1)WH.raf=requestAnimationFrame(f);else{setRot(target);done&&done()}})(t0);
}
function coast(v){
  cancelAnimationFrame(WH.raf);
  const stop=()=>{const t=topSlice();settle(t?t.dataset.dkey:null)};
  if(!v){stop();return}
  v=Math.max(-2.5,Math.min(2.5,v));let last=performance.now();
  (function f(now){const dt=Math.min(40,now-last);last=now;
    setRot((IS.rot||0)+v*dt);tintArrow();
    v*=Math.pow(.9975,dt); // light friction: a real flick spins freely, then eases to a stop
    if(Math.abs(v)>.01)WH.raf=requestAnimationFrame(f);else stop()})(last);
}
function focusSlice(k){
  const c=dsegs().find(x=>x.dataset.dkey===k);if(!c)return;
  const target=rotFor(c),dist=Math.abs(target-(IS.rot||0));
  spinning(true);try{haptic()}catch(_){}
  spinTo(target,Math.round(Math.max(260,Math.min(620,260+dist*2))),()=>settle(k));
}
function wholeView(){
  if(!IS.sel&&!(IS.rot%360))return;
  spinning(true);
  const cur=IS.rot||0,target=Math.round(cur/360)*360;
  spinTo(target,Math.round(Math.max(280,Math.min(650,280+Math.abs(target-cur)*1.8))),()=>{setRot(0);settle(null)});
}
const ptAngle=(svg,x,y)=>{const r=svg.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;return{a:Math.atan2(x-cx,-(y-cy))*180/Math.PI,d:Math.hypot(x-cx,y-cy)/(r.width/260)}};
$("#main").addEventListener("pointerdown",e=>{
  const svg=e.target.closest&&e.target.closest("svg.di");if(!svg||!dsegs().length)return;
  const p=ptAngle(svg,e.clientX,e.clientY);
  if(p.d>DR+DW/2+40)return;
  WH.drag={svg,id:e.pointerId,x:e.clientX,y:e.clientY,rot0:IS.rot||0,acc:0,moved:false,onRing:p.d>DR-DW/2-8&&p.d<DR+DW/2+18,la:p.a,hist:[[performance.now(),0]]};
  cancelAnimationFrame(WH.raf);
  try{svg.setPointerCapture(e.pointerId)}catch(_){}
});
$("#main").addEventListener("pointermove",e=>{
  const D=WH.drag;if(!D||e.pointerId!==D.id)return;
  if(!D.moved&&Math.hypot(e.clientX-D.x,e.clientY-D.y)<6)return;
  if(!D.moved){D.moved=true;D.rot0=IS.rot||0;spinning(true)}
  const p=ptAngle(D.svg,e.clientX,e.clientY);let da=p.a-D.la;if(da>180)da-=360;if(da<-180)da+=360;
  if(p.d<22)da=0; // too close to the middle to read an angle reliably
  D.acc+=da;D.la=p.a;const now=performance.now();D.hist.push([now,D.acc]);while(D.hist.length>2&&now-D.hist[0][0]>90)D.hist.shift();
  setRot(D.rot0+D.acc);tintArrow();
});
const wheelUp=e=>{
  const D=WH.drag;if(!D||e.pointerId!==D.id)return;WH.drag=null;
  if(!D.moved){ // a tap
    if(!D.onRing){wholeView();return}
    const p=ptAngle(D.svg,e.clientX,e.clientY),c=sliceAt(p.a-(IS.rot||0));
    if(!c)return;if(c.dataset.dkey===IS.sel){wholeView();return}
    focusSlice(c.dataset.dkey);return;
  }
  // only a real flick coasts; a slow, deliberate drag stays exactly where you let go
  const now=performance.now(),hs=D.hist.filter(x=>now-x[0]<=90);let v=0;
  if(hs.length>=2&&now-hs[hs.length-1][0]<50){const f=hs[0],l=hs[hs.length-1];if(l[0]>f[0])v=(l[1]-f[1])/(l[0]-f[0])}
  coast(Math.abs(v)>=.35?v:0);
};
$("#main").addEventListener("pointerup",wheelUp);$("#main").addEventListener("pointercancel",wheelUp);
$("#main").addEventListener("click",e=>{
  const k=e.target.closest(".drow[data-dkey]");if(k){if(k.dataset.dkey===IS.sel)wholeView();else focusSlice(k.dataset.dkey);return}
  if(e.target.closest("[data-avmort]")){ls.set("pb.avmort",ls.get("pb.avmort")==="show"?"hide":"show");try{haptic()}catch(_){}render();return}
  const dr=e.target.closest("[data-ddrill]");if(dr){IS.group=dr.dataset.ddrill;IS.item="";IS.sel=null;IS.rot=0;try{haptic()}catch(_){}render();return}
  const tr=e.target.closest("[data-dtrend]");if(tr){if(IS.group)IS.item=tr.dataset.dtrend;else{IS.group=tr.dataset.dtrend;IS.item=""}
    IS.tview="months";IS.bmSel=null;IS.sel=null;IS.rot=0;IS.ranges=IS.ranges||{};if((IS.ranges.totals||6)<3){IS.ranges.totals=6;ls.set("pb.irange.totals","6")}
    render();window.scrollTo({top:0,behavior:"smooth"});return}
  const tv=e.target.closest("[data-tview]");if(tv){const v=tv.dataset.tview;if((IS.tview||"avg")===v)return;IS.tview=v;IS.bmSel=null;if(v==="wheel")IS.item="";
    if(v==="months"){IS.ranges=IS.ranges||{};if((IS.ranges.totals||6)<3){IS.ranges.totals=6;ls.set("pb.irange.totals","6")}}
    IS.sel=null;IS.rot=0;try{haptic()}catch(_){}render();return}
  if(e.target.closest("[data-dback]")){IS.group="";IS.item="";IS.sel=null;IS.rot=0;render();return}
});
/* once the wheel scrolls out of sight, a slim bar under the header keeps the selected slice in view */
const DBAR={raf:0,el:null};
function dbarEl(){
  if(DBAR.el)return DBAR.el;
  const el=document.createElement("div");el.className="dbar";el.setAttribute("role","region");el.setAttribute("aria-label","Selected category");
  el.innerHTML='<button class="dbp" data-dstep="-1" aria-label="Previous category">‹</button><button class="dbm" aria-label="Back to the wheel"><i></i><span class="dbn"></span><b class="num dbv"></b><span class="dbpct num"></span></button><button class="dbp" data-dstep="1" aria-label="Next category">›</button>';
  el.addEventListener("click",e=>{const st=e.target.closest("[data-dstep]");
    if(st){const ks=Object.keys(IS.dd||{});if(!ks.length)return;const i=ks.indexOf(IS.sel);const k=ks[(i+ +st.dataset.dstep+ks.length)%ks.length];
      try{haptic()}catch(_){}spinning(true);const c=dsegs().find(x=>x.dataset.dkey===k);setRot(c?rotFor(c):IS.rot);settle(k);return}
    if(e.target.closest(".dbm")){const w=document.querySelector("#main .dwrap");if(w)window.scrollTo({top:Math.max(0,scrollY+w.getBoundingClientRect().top-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hh"))||120)-8),behavior:"smooth"})}});
  document.body.appendChild(el);DBAR.el=el;return el;
}
function dock(){
  DBAR.raf=0;if(S.tab!=="insights"||IS.sub!=="totals"||IS.tview!=="wheel"){if(DBAR.el)DBAR.el.classList.remove("on");return}
  const w=document.querySelector("#main .dwrap"),el=dbarEl();
  const d=IS.sel&&IS.dd&&IS.dd[IS.sel];
  const hh=parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hh"))||120;
  const show=!!(w&&d&&S.tab==="insights"&&IS.sub==="totals"&&IS.tview==="wheel"&&w.getBoundingClientRect().bottom<hh+24);
  if(d){el.style.setProperty("--c",d.c);el.querySelector(".dbn").textContent=IS.sel;el.querySelector(".dbv").textContent=money(round2(d.v));el.querySelector(".dbpct").textContent=d.pct+"%"}
  el.classList.toggle("on",show);
}
addEventListener("scroll",()=>{if(!DBAR.raf)DBAR.raf=requestAnimationFrame(dock)},{passive:true});
addEventListener("resize",()=>{if(!DBAR.raf)DBAR.raf=requestAnimationFrame(dock)});
function syncMini(){}
// tapping anywhere off the wheel, its rows or its card details returns to the whole view
document.addEventListener("click",e=>{
  if(!e.isTrusted||(e.target.closest&&e.target.closest(".pbhap")))return; // the haptic tick works by clicking a hidden switch; only real taps count
  if(!IS.sel||S.tab!=="insights"||IS.sub!=="totals")return;
  if(e.target.closest&&e.target.closest("svg.di,.dbub,.drow,#dpanel,.dbar,select,.isel,header,nav.tabs,.fab,#sheetRoot,#padRoot,.dback,.pbx-scrim"))return;
  wholeView();
});
function donut(keys,vals,cm,total){
  const R=110,r=74,cx=130,cy=130;let a0=-Math.PI/2,g='';const gap=keys.length>1?0.012:0;
  keys.forEach(k=>{const v=vals[k];if(v<=0)return;const a1=a0+2*Math.PI*v/total;
    if(keys.length===1||v>=total){g+='<circle cx="'+cx+'" cy="'+cy+'" r="'+((R+r)/2)+'" fill="none" stroke="'+cm[k]+'" stroke-width="'+(R-r)+'"/>'}
    else{const s=a0+gap,e=a1-gap,lg=(e-s)>Math.PI?1:0;const P=(rad,ang)=>(cx+rad*Math.cos(ang)).toFixed(2)+" "+(cy+rad*Math.sin(ang)).toFixed(2);
      g+='<path d="M'+P(R,s)+" A"+R+" "+R+" 0 "+lg+" 1 "+P(R,e)+" L"+P(r,e)+" A"+r+" "+r+" 0 "+lg+" 0 "+P(r,s)+'z" fill="'+cm[k]+'"><title>'+esc(k)+" · "+money(round2(v))+'</title></path>'}
    a0=a1});
  return '<svg class="donut" viewBox="0 0 260 260" role="img" aria-label="Spending by group">'+(total>0?g:'<circle cx="130" cy="130" r="92" fill="none" stroke="var(--trk)" stroke-width="36"/>')+'<text x="130" y="122" text-anchor="middle" class="dl">Total Spent</text><text x="130" y="152" text-anchor="middle" class="dv num">'+money(Math.round(total)).replace(/\.00$/,"")+'</text></svg>';
}
function selHTML(id,opts,val){return '<label class="isel"><select id="'+id+'">'+opts.map(([v,l])=>'<option value="'+esc(v)+'"'+(v===val?" selected":"")+'>'+esc(l)+'</option>').join("")+'</select><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></label>'}

function paceReadHTML(p,d){const [y,m]=p.ym.split("-").map(Number);const dt=MONTHS[m-1].slice(0,3)+" "+d;
  const pace=round2(p.planned*d/p.dim);const has=d<=p.dayNow;const pj=!has&&p.proj&&p.proj[d]!=null;const sp=has?p.cum[d]:(pj?p.proj[d]:null);
  return '<span class="pd">'+dt+'</span><span><i style="background:var(--link)'+(pj?';opacity:.5':'')+'"></i>'+(sp!=null?(pj?"≈":"")+money(sp):"—")+'</span>'+(p.planned>0?'<span><i style="background:var(--muted)"></i>'+money(pace)+'</span>':'')+(sp!=null&&p.planned>0?'<span class="'+(sp>pace?"bad":"ok")+'">'+(sp>pace?"+":"−")+money(Math.abs(round2(sp-pace))).replace("-","")+'</span>':'')}
function paceScrub(svg,clientX){
  let p;try{p=JSON.parse(svg.dataset.p)}catch(e){return}
  const r=svg.getBoundingClientRect(),vx=(clientX-r.left)/r.width*p.W,pw=p.W-p.L-p.R,ph=p.H-p.T-p.B;
  const za=0,zb=p.dim;
  const d=Math.max(Math.max(1,Math.ceil(za)),Math.min(Math.floor(zb),Math.round(za+(vx-p.L)/pw*(zb-za))));
  const ylo=0,yhi=p.max;
  const X=x=>p.L+pw*(x-za)/(zb-za),Y=v=>p.T+ph-ph*(Math.max(0,v)-ylo)/(yhi-ylo);
  let g='<line x1="'+X(d)+'" x2="'+X(d)+'" y1="'+p.T+'" y2="'+(p.T+ph)+'" class="hov"/>';
  if(p.planned>0)g+='<circle cx="'+X(d)+'" cy="'+Y(p.planned*d/p.dim)+'" r="4.5" class="hdot2"/>';
  if(d<=p.dayNow)g+='<circle cx="'+X(d)+'" cy="'+Y(p.cum[d])+'" r="6" class="dot"/>';else if(p.proj&&p.proj[d]!=null)g+='<circle cx="'+X(d)+'" cy="'+Y(p.proj[d])+'" r="5" class="pdot"/>';
  svg.querySelector("#paceHover").innerHTML=g;
  const rd=$("#paceRead");if(rd)rd.innerHTML=paceReadHTML(p,d);
  if(svg._d!==d){if(svg._d!==undefined)try{navigator.vibrate&&navigator.vibrate(2)}catch(e){}svg._d=d}
}
function paceEnd(svg){let p;try{p=JSON.parse(svg.dataset.p)}catch(e){return}svg.querySelector("#paceHover").innerHTML="";svg._d=undefined;const rd=$("#paceRead");if(rd)rd.innerHTML=paceReadHTML(p,p.dayNow||1)}
$("#main").addEventListener("pointerdown",e=>{const svg=e.target.closest("#paceSvg");if(!svg)return;svg._act=true;try{svg.setPointerCapture(e.pointerId)}catch(_){}paceScrub(svg,e.clientX)});
$("#main").addEventListener("pointermove",e=>{const svg=e.target.closest("#paceSvg");if(svg&&svg._act)paceScrub(svg,e.clientX)});
["pointerup","pointercancel","lostpointercapture"].forEach(t=>$("#main").addEventListener(t,e=>{const svg=e.target.closest&&e.target.closest("#paceSvg");if(svg&&svg._act){svg._act=false;paceEnd(svg)}}));
/* top of the chart sits just above the highest point drawn; gridlines on round steps below it */
function paceTop(v){return Math.max(v*1.06,50)}
function paceStep(top){const st0=top/4,p10=Math.pow(10,Math.floor(Math.log10(st0)));for(const f of [1,2,2.5,5,10])if(f*p10>=st0*0.8)return f*p10;return 10*p10}
const yfmt=(v,st)=>st>=1000||v<1000?kfmt(v):"$"+NF0.format(Math.round(v));
function paceInner(p,a,b,ys,st){
  const {dim,dayNow,planned,max,W,H,L,R,T,B,cum,proj,ym,cur}=p,pw=W-L-R,ph=H-T-B,span=b-a;
  const ylo=0,yhi=max;st=paceStep(max);
  const X=d=>L+pw*(d-a)/span,Y=v=>T+ph-ph*(Math.max(0,v)-ylo)/(yhi-ylo),f=n=>n.toFixed(1);
  let g='';for(let val=0;val<=yhi+1e-6;val+=st){const yy=Y(val);g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+f(yy)+'" y2="'+f(yy)+'" class="grid"/>'+'<text x="'+(L-6)+'" y="'+f(yy+4)+'" class="ax" text-anchor="end">'+yfmt(val,st)+'</text>'}
  g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+T+'" y2="'+T+'" class="grid" style="opacity:.45"/>';
  g+='<g clip-path="url(#pclip)">';
  if(planned>0)g+='<line x1="'+f(X(0))+'" y1="'+Y(0)+'" x2="'+f(X(dim))+'" y2="'+f(Y(planned))+'" class="trk"/>';
  if(dayNow){let pts=[[X(0),Y(0)]];for(let d=1;d<=dayNow;d++)pts.push([X(d),Y(cum[d])]);
    const ln=pts.map((q,i)=>(i?"L":"M")+f(q[0])+" "+f(q[1])).join("");
    g+='<path class="area" d="'+ln+"L"+f(X(dayNow))+" "+f(T+ph)+"L"+f(X(0))+" "+f(T+ph)+'z"/><path class="act" pathLength="1" d="'+ln+'"/>';
    if(proj){let pp=[];for(let d=dayNow;d<=dim;d++)pp.push((d===dayNow?"M":"L")+f(X(d))+" "+f(Y(proj[d])));g+='<path class="proj" d="'+pp.join("")+'"/><circle class="pdot" cx="'+f(X(dim))+'" cy="'+f(Y(proj[dim]))+'" r="4"/>'}
    if(cur)g+='<line class="now" x1="'+f(X(dayNow))+'" x2="'+f(X(dayNow))+'" y1="'+T+'" y2="'+(T+ph)+'"/>';
    g+='<circle class="dot" cx="'+f(X(dayNow))+'" cy="'+f(Y(cum[dayNow]))+'" r="5"/>'}
  g+='</g>';
  let ticks;if(span>=dim-0.01)ticks=[1,8,15,22,dim];
  else{const st=span<=8?1:span<=15?2:span<=22?3:5;ticks=[];for(let d=Math.max(1,Math.ceil(a));d<=Math.floor(b);d++)if((d-1)%st===0)ticks.push(d)}
  const first=ticks[0];
  ticks.forEach(d=>{const x=X(d);if(x<L-2||x>W-R+2)return;g+='<text x="'+f(x)+'" y="'+(H-8)+'" class="ax" text-anchor="middle">'+(d===first?shortM(ym)+" "+d:d)+'</text>'});
  return g;
}
/* Fixed bills (mortgage, insurance, utilities…, see isFixed) land on set days, so Pace and Calendar leave them out by default.
   Not applied when one item is picked, or when the picked group is all bills. Toggle: [data-nofixed], stored in pb.nofixed. */
IS.noFixed=ls.get("pb.nofixed")!=="0";
function fixedSkip(ym){if(!IS.noFixed||IS.item)return null;const gs=groupsFor(ym),fx=new Set();gs.forEach(g=>g.items.forEach(it=>{if(isFixed(it,g))fx.add(it.id)}));
  if(!fx.size)return null;if(IS.group){const g=gs.find(x=>x.name===IS.group);if(g&&g.items.length&&g.items.every(it=>fx.has(it.id)))return null}return fx}
function fixedChip(ym,fx){const mine=t=>t.type!=="income"&&(!IS.group||groupNameOf(t,ym)===IS.group)&&(!IS.item||itemNameOf(t,ym)===IS.item);
  if(fx){const amt=round2(txOf(ym).filter(t=>mine(t)&&fx.has(t.itemId)).reduce((a,t)=>a+sAmt(t),0));return '<button class="fxchip" data-nofixed>Bills left out'+(amt>0?' · '+money(amt).replace(/\.00$/,""):'')+' · <u>Include</u></button>'}
  if(!IS.noFixed&&!IS.item&&(()=>{const gs=groupsFor(ym);return gs.some(g=>g.items.some(it=>isFixed(it,g)))})())return '<button class="fxchip" data-nofixed>Bills included · <u>Leave out</u></button>';return ""}
function paceCard(fh){
  const ym=S.ym,[y,m]=ym.split("-").map(Number),dim=new Date(y,m,0).getDate(),td=today();
  const cur=ymOf(td)===ym,past=ym<ymOf(td),dayNow=cur?+td.slice(8,10):(past?dim:0);
  const groups=groupsFor(ym),fx=fixedSkip(ym);let planned=0;
  groups.forEach(g=>{if(IS.group&&g.name!==IS.group)return;g.items.forEach(it=>{if(IS.item&&it.name!==IS.item)return;if(fx&&fx.has(it.id))return;planned+=+it.planned||0})});planned=round2(planned);
  const day=new Array(dim+1).fill(0);
  txOf(ym).forEach(t=>{if(t.type==="income")return;if(fx&&fx.has(t.itemId))return;if(IS.group&&groupNameOf(t,ym)!==IS.group)return;if(IS.item&&itemNameOf(t,ym)!==IS.item)return;const k=+String(t.date).slice(8,10);if(k>=1&&k<=dim)day[k]+=sAmt(t)});
  const cum=[0];for(let d=1;d<=dim;d++)cum[d]=round2(cum[d-1]+day[d]);
  const spentNow=dayNow?cum[dayNow]:0,paceNow=round2(planned*dayNow/dim),full=cum[dim];
  const daysLeft=dim-dayNow,committed=cur?round2(full-spentNow):0,free=round2(planned-spentNow-committed),perDay=cur&&daysLeft>0&&planned>0?round2(Math.max(free,0)/daysLeft):0;
  let proj=null;if(cur&&daysLeft>0&&(planned>0||committed>0)){proj=new Array(dim+1).fill(null);proj[dayNow]=spentNow;for(let d=dayNow+1;d<=dim;d++)proj[d]=round2(proj[d-1]+perDay+day[d])}
  const W=340,H=220,L=44,R=12,T=14,B=26,pw=W-L-R,ph=H-T-B;
  const max=paceTop(Math.max(planned,dayNow?Math.max(...cum.slice(0,dayNow+1)):0,cur?0:full,proj?Math.max(...proj.filter(v=>v!=null)):0));
  const X=d=>L+pw*d/dim,Y=v=>T+ph-ph*Math.max(0,v)/max;
  let g='<defs><clipPath id="pclip"><rect x="'+(L-1)+'" y="'+(T-7)+'" width="'+(pw+8)+'" height="'+(ph+8)+'"/></clipPath></defs>';
  const label=IS.item||IS.group||"All spending";
  let h='<section class="card pace"><div class="chead"><h2>Spending pace</h2><span class="lbl">'+MONTHS[m-1].slice(0,3)+' '+y+'</span></div>'+fh+fixedChip(ym,fx);
  const pd={ym,dim,dayNow,planned,max,W,H,L,R,T,B,cum:cum.slice(0,dim+1),proj,cur};
  h+='<div class="pread num" id="paceRead">'+paceReadHTML(pd,dayNow||1)+'</div>';
  const pkey=[ym,IS.group,IS.item,Math.round(full),Math.round(planned)].join("~"),panim=IS.paceKey!==pkey;IS.paceKey=pkey;
  h+='<div class="pzwrap"><svg class="chart pscrub'+(panim?' anim':'')+'" id="paceSvg" data-p="'+esc(JSON.stringify(pd))+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Cumulative spending versus on-track pace for '+esc(label)+'. Drag across to see each day.">'+g+'<g id="paceZ">'+paceInner(pd,0,dim)+'</g><g id="paceHover"></g></svg>'+'</div>';
  h+='<div class="legend"><span><i style="background:var(--link)"></i>Spent so far</span>'+(planned>0?'<span><i style="background:var(--muted)"></i>Pace</span>':'')+(proj?'<span><i style="background:var(--link);opacity:.5"></i>Projected</span>':'')+'</div>';
  if(!dayNow){h+='<p class="note" style="margin:12px 0 0">This month hasn\'t started yet. Planned: '+money(planned)+'.</p>';return h+'</section>'}
  const ref=cur?paceNow:planned,ou=round2(spentNow-ref),isOver=ou>0;
  if(planned<=0){
    h+='<p class="note" style="margin:12px 0 0">Nothing planned for '+esc(label)+(cur?' this month, so there\'s no pace to compare against.':' that month.')+(cur&&committed?' The dotted line shows what\'s already scheduled.':'')+'</p>';
    return h+'</section>';
  }
  h+=paceRings(spentNow,planned,dayNow,dim,cur,!!fx);
  return h+'</section>';
}
function daySheet(iso){
  const ym=ymOf(iso),groups=groupsFor(ym);
  const all=txOf(ym).filter(t=>t.date===iso);
  const match=t=>(!IS.group||groupNameOf(t,ym)===IS.group)&&(!IS.item||itemNameOf(t,ym)===IS.item);
  const shown=all.filter(match),hidden=all.length-shown.length;
  const spent=round2(shown.filter(t=>t.type!=="income").reduce((a,t)=>a+sAmt(t),0));
  let h='<h3>'+esc(fmtLong(iso))+'</h3><p class="note" style="margin:-8px 0 8px">'+esc(IS.item||IS.group||"All spending")+' · '+money(spent)+' spent</p>';
  if(!shown.length)h+='<div class="empty mini">'+EMPTY_ART.piggy+'<p class="note">'+(iso<=today()&&!(IS.group||IS.item)?"A $0 day. Nice!":"No transactions"+(IS.group||IS.item?" for this filter":"")+" on this day.")+'</p></div>';
  h+=shown.map(t=>{const ref=t.type==="refund"||t.type==="income";return '<button class="txrow" data-tx="'+esc(t.id)+'"><div class="l"><div class="m">'+esc(t.merchant||"Purchase")+'</div><div class="c">'+esc(txLabel(t,groups))+(t.note?" · "+esc(t.note):"")+'</div></div><div class="a num"'+(ref?' style="color:var(--ok)"':'')+'>'+(ref?"+":"")+money(+t.amount||0)+'</div></button>'}).join("");
  if(hidden>0)h+='<p class="note" style="margin:10px 0 0">'+hidden+' other transaction'+(hidden===1?"":"s")+' that day '+(hidden===1?"is":"are")+' outside this filter.</p>';
  openSheet(h,s=>s.querySelectorAll("[data-tx]").forEach(b=>b.onclick=()=>{const t=all.find(x=>x.id===b.dataset.tx);if(t)isHist(t)?histSheet(t):txSheet(t)}));
}
$("#main").addEventListener("click",e=>{const d=e.target.closest("[data-calday]");if(d)daySheet(d.dataset.calday)});
/* ---------- spending by day of week ---------- */
IS.wdVar=ls.get("pb.wdvar")!=="0";
const WD_ORDER=[1,2,3,4,5,6,0],WD_SHORT=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],WD_LONG=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const WD_COL={wk:"#4285f4",we:"#34a853"};

/* ---------- Totals · By month (interactive stacked bars) ---------- */
function barChartI(months,series,keys,cm,label){
  const W=340,H=230,L=44,R=8,T=14,B=26,pw=W-L-R,ph=H-T-B;
  const tot=months.map(ym=>keys.reduce((a,k)=>a+Math.max(0,(series[ym]||{})[k]||0),0));
  const used=tot.filter(v=>v>0),avg=used.length?used.reduce((a,b)=>a+b,0)/used.length:0;
  const max=niceMax(Math.max(...tot,avg));
  const step=pw/months.length,bw=Math.min(30,step*0.64);
  const key=[months.join(),keys.join("|"),Math.round(tot.reduce((a,b)=>a+b,0))].join("~"),anim=IS.bmKey!==key;IS.bmKey=key;
  if(IS.bmSel&&!months.includes(IS.bmSel))IS.bmSel=null;
  IS.bm={months,series,keys,cm,tot,avg,label};
  let g='';
  for(let i=0;i<=4;i++){const y=T+ph-ph*i/4;g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" class="grid"/><text x="'+(L-6)+'" y="'+(y+4)+'" class="ax" text-anchor="end">'+kfmt(max*i/4)+'</text>'}
  months.forEach((ym,mi)=>{
    const x=L+step*mi+(step-bw)/2;let y=T+ph;const parts=keys.map(k=>[k,Math.max(0,(series[ym]||{})[k]||0)]).filter(p=>p[1]>0);
    let col='';parts.forEach(([k,v],pi)=>{const hh=ph*v/max;y-=hh;col+='<path d="'+barPath(x,y,bw,hh,pi===parts.length-1?4:0)+'" fill="'+cm[k]+'"/>'});
    g+='<g class="bcol'+(IS.bmSel?(IS.bmSel===ym?' on':' dim'):'')+'" data-bm="'+ym+'" style="--d:'+(mi*0.05).toFixed(2)+'s"><rect class="bhit" x="'+(L+step*mi)+'" y="'+T+'" width="'+step+'" height="'+(ph+B)+'" fill="transparent"/><g class="bstack">'+col+'</g><text x="'+(x+bw/2)+'" y="'+(H-8)+'" class="ax" text-anchor="middle">'+shortM(ym)+'</text></g>';
  });
  if(avg){const y=T+ph-ph*avg/max;g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" class="avg"/>'}
  return '<div class="bmread" id="bmread">'+bmReadHTML()+'</div><svg class="chart bmc'+(anim?' anim':'')+'" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Spending by month for '+esc(label)+'. Tap a month for its breakdown.">'+g+'</svg>';
}
function bmReadHTML(){
  const b=IS.bm;if(!b)return"";const span=b.months[0].slice(0,4)!==b.months[b.months.length-1].slice(0,4);
  if(!IS.bmSel)return '<span class="avgpill num">'+money(Math.round(b.avg)).replace(/\.00$/,"")+' avg / month</span><span class="note">Tap a month for its breakdown</span>';
  const ym=IS.bmSel,s=b.series[ym]||{},t=b.keys.reduce((a,k)=>a+Math.max(0,s[k]||0),0),diff=b.avg?Math.round((t-b.avg)/b.avg*100):0;
  const top=b.keys.filter(k=>(s[k]||0)>0).sort((x,y)=>s[y]-s[x]).slice(0,3);
  return '<div class="bmh"><b>'+MONTHS[+ym.slice(5)-1]+(span||ym.slice(0,4)!==today().slice(0,4)?" "+ym.slice(0,4):"")+'</b><b class="num">'+money(round2(t))+'</b><span class="num '+(diff>0?"up":"down")+'">'+(diff>0?"↑ ":diff<0?"↓ ":"")+Math.abs(diff)+'% vs avg</span></div>'+
    '<div class="bmtop">'+top.map(k=>'<span><i style="background:'+b.cm[k]+'"></i>'+esc(k)+' <b class="num">'+money(round2(s[k]))+'</b></span>').join("")+'</div>';
}

