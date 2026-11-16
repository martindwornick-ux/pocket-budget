/* ---------- sheets ---------- */
function openSheet(html,bind){
  const root=$("#sheetRoot");
  root.innerHTML='<div class="scrim" id="scrim"><div class="sheet" role="dialog" aria-modal="true"><div class="grab"></div>'+html+'</div></div>';
  document.body.style.overflow="hidden";
  $("#scrim").addEventListener("click",e=>{if(e.target.id==="scrim")softCloseSheet()});
  const sh=root.querySelector(".sheet"),sc=root.firstChild;
  dragSheet(sc,sh);
  bind&&bind(sh);
  slideIn(sc,sh);
}
// Open: start fully below the screen with a clear scrim, then glide up on the same
// iOS-style curve the drag-to-dismiss uses, so opening and closing feel like one motion.
const SHEET_EASE="cubic-bezier(.32,.72,0,1)",SHEET_IN=300,SPRING="cubic-bezier(.34,1.32,.64,1)";
/* Shared-element open: a sheet opened by tapping a row grows out of that row (clip + slide), so you see where it came from. */
let ORIGIN=null;
document.addEventListener("pointerdown",e=>{const r=e.target.closest&&e.target.closest("#main [data-item],#main [data-tx],#main [data-income],#main .txrow");if(r){const b=r.getBoundingClientRect();ORIGIN={r:b,t:Date.now()}}},true);
function growIn(sc,sh,o){const s=sh.getBoundingClientRect(),r=o.r;if(!s.height||r.bottom<0||r.top>innerHeight)return false;
  const ty=Math.round(r.top-s.top),L=Math.max(0,r.left-s.left),R=Math.max(0,s.right-r.right),B=Math.max(0,s.height-r.height);
  sh.style.transition="none";sc.style.transition="none";sh.style.transform="translateY("+ty+"px)";sh.style.clipPath="inset(0 "+R+"px "+B+"px "+L+"px round 14px)";sc.style.background="rgba(5,15,10,0)";
  void sh.offsetHeight;sh._opening=true;
  requestAnimationFrame(()=>{sh.style.transition="transform 420ms "+SHEET_EASE+",clip-path 420ms "+SHEET_EASE;sc.style.transition="background 320ms ease-out";
    sh.style.transform="";sh.style.clipPath="inset(0 0 0 0 round 24px 24px 0 0)";sc.style.background="";
    setTimeout(()=>{if(sh._opening){sh._opening=false;sh.style.transition="";sc.style.transition=""}sh.style.clipPath=""},460)});return true}
function slideIn(sc,sh){
  if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  const o=ORIGIN;ORIGIN=null;if(o&&Date.now()-o.t<700&&growIn(sc,sh,o))return;
  sh.style.transition="none";sc.style.transition="none";
  sh.style.transform="translateY(100%)";sc.style.background="rgba(5,15,10,0)";
  void sh.offsetHeight;// commit the off-screen start position before animating
  requestAnimationFrame(()=>{
    sh.style.transition="transform "+(SHEET_IN+80)+"ms cubic-bezier(.22,1.08,.36,1)";sc.style.transition="background "+SHEET_IN+"ms ease-out";
    sh.style.transform="";sc.style.background="";sh._opening=true;
    // clear only if nothing (a drag or a close) has taken over the sheet since
    setTimeout(()=>{if(sh._opening){sh._opening=false;sh.style.transition="";sc.style.transition=""}},SHEET_IN+40);
  });
}
function dragSheet(sc,sh){
  let y0=0,x0=0,dy=0,t0=0,pts=[],mode=0;// 0 undecided, 1 dragging, -1 not
  const scrolledAbove=el=>{for(;el&&el!==sh.parentNode;el=el.parentNode){if(el.scrollTop>0)return true}return false};
  sh.addEventListener("touchstart",e=>{if(e.touches.length!==1){mode=-1;return}const t=e.touches[0];y0=t.clientY;x0=t.clientX;dy=0;t0=Date.now();pts=[[t0,y0]];mode=scrolledAbove(e.target)?-1:0},{passive:true});
  sh.addEventListener("touchmove",e=>{if(mode===-1)return;const t=e.touches[0],d=t.clientY-y0;
    if(mode===0){if(Math.abs(t.clientX-x0)>Math.abs(d)&&Math.abs(t.clientX-x0)>8){mode=-1;return}if(d>8){mode=1;sh._opening=false;sh.style.transition="none";sh.style.animation="none";if(document.activeElement&&document.activeElement.blur)document.activeElement.blur()}else if(d<-4){if(sh.scrollHeight<=sh.clientHeight+1){mode=2;sh._opening=false;sh.style.transition="none"}else{mode=-1;return}}else return}
    if(mode===2){e.preventDefault();const up=Math.min(28,Math.pow(Math.max(0,-d),.62));sh.style.transform="translateY("+(-up)+"px)";return}
    e.preventDefault();dy=Math.max(0,d-8);sh.style.transform="translateY("+dy+"px)";sc.style.background="rgba(5,15,10,"+(0.45*Math.max(0,1-dy/(sh.offsetHeight||1))).toFixed(3)+")";
    const now=Date.now();pts.push([now,t.clientY]);while(pts.length>2&&now-pts[0][0]>100)pts.shift()},{passive:false});
  const end=()=>{if(mode===2){mode=0;sh.style.transition="transform .5s "+SPRING;sh.style.transform="";setTimeout(()=>{sh.style.transition=""},520);return}if(mode!==1){mode=0;return}mode=0;
    const a=pts[0],b=pts[pts.length-1],v=b&&a&&b[0]>a[0]?(b[1]-a[1])/(b[0]-a[0]):0;
    /* a flick closes it at the speed of your finger */
    const snap=()=>{sh.style.transition="transform .48s "+SPRING;sc.style.transition="background .28s";sh.style.transform="";sc.style.background="";setTimeout(()=>{sh.style.transition="";sc.style.transition=""},300)};
    const shut=v>0.45||dy>Math.min(120,sh.offsetHeight*0.25);
    /* a sheet with unsaved input springs back and asks first, so a stray swipe can't lose it */
    if(shut&&sh._dirty&&sh._dirty()){snap();askDiscard(sc,sh)}
    else if(v>0.45){haptic();closeSheet(Math.max(110,Math.min(240,(sh.offsetHeight-dy)/v)))}else if(shut){haptic();closeSheet()}else snap()};
  sh.addEventListener("touchend",end);sh.addEventListener("touchcancel",end);
}
/* iOS keeps a shrunken layout after the keyboard closes, so fixed bars (tab bar, + button) float mid-screen.
   When no text field is focused and the visual viewport is back to full height, nudge the page so iOS re-lays it out. */
(function kbFix(){
  const isField=el=>el&&el.matches&&el.matches("input,textarea,select,[contenteditable]");
  let t=0;const settle=()=>{clearTimeout(t);t=setTimeout(()=>{if(isField(document.activeElement))return;
    const y=window.scrollY;window.scrollTo(window.scrollX,y+1);window.scrollTo(window.scrollX,y);
    document.documentElement.style.height="100.1%";requestAnimationFrame(()=>{document.documentElement.style.height=""})},120)};
  document.addEventListener("focusout",e=>{if(isField(e.target))settle()},true);
  if(window.visualViewport){let last=visualViewport.height;visualViewport.addEventListener("resize",()=>{const h=visualViewport.height;if(h>last+80)settle();last=h})}
  document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")settle()});
  window.addEventListener("orientationchange",settle);
  /* The keyboard covers the bottom of a sheet without shrinking it, so anything under it (e.g. the last location
     suggestions) couldn't be scrolled into view. While a field is focused and the keyboard is up, html.kbup adds the
     keyboard's height (--kbh) as extra room at the bottom of the sheet, so it all scrolls up above the keyboard. */
  const de=document.documentElement;let kbr=0;
  const kb=()=>{kbr=0;const vv=window.visualViewport;if(!vv)return;const h=Math.max(0,Math.round(window.innerHeight-vv.height-vv.offsetTop));
    const up=h>120&&isField(document.activeElement);de.style.setProperty("--kbh",(up?h:0)+"px");de.classList.toggle("kbup",up)};
  const kbSoon=()=>{if(!kbr)kbr=requestAnimationFrame(kb)};
  if(window.visualViewport){visualViewport.addEventListener("resize",kbSoon);visualViewport.addEventListener("scroll",kbSoon)}
  document.addEventListener("focusin",()=>setTimeout(kb,60),true);document.addEventListener("focusout",()=>setTimeout(kb,60),true);
})();
function askDiscard(sc,sh){if(sc.querySelector(".discard"))return;try{haptic()}catch(_){}
  const d=document.createElement("div");d.className="discard";d.setAttribute("role","alertdialog");
  d.innerHTML='<b>Discard this transaction?</b><p>What you\'ve entered so far will be lost.</p><div class="btnrow"><button class="btn sec" data-dk="keep">Keep editing</button><button class="btn danger" data-dk="go">Discard</button></div>';
  d.addEventListener("click",e=>{const b=e.target.closest("[data-dk]");if(!b)return;e.stopPropagation();if(b.dataset.dk==="go"){sh._dirty=null;closeSheet()}else d.remove()});
  sc.appendChild(d);d.querySelector('[data-dk="keep"]').focus({preventScroll:true})}
function softCloseSheet(){const sc=$("#sheetRoot").firstChild,sh=sc&&sc.querySelector(".sheet");
  if(sh&&sh._dirty&&sh._dirty()){askDiscard(sc,sh);return}closeSheet()}
function closeSheet(ms){ms=typeof ms==="number"?ms:220;
  try{const a=document.activeElement;if(a&&a.blur&&a.matches&&a.matches("input,textarea,select"))a.blur()}catch(_){}
  const root=$("#sheetRoot"),sc=root.firstChild;document.body.style.overflow="";
  if(!sc)return;const sh=sc.querySelector(".sheet");
  if(!sh||matchMedia("(prefers-reduced-motion:reduce)").matches){root.innerHTML="";return}
  sc.style.pointerEvents="none";sh._opening=false;
  sh.style.animation="none";sh.style.transition="transform "+ms+"ms cubic-bezier(.3,.6,.5,1)";sc.style.transition="background "+ms+"ms";
  requestAnimationFrame(()=>{sh.style.transform="translateY("+(sh.offsetHeight+40)+"px)";sc.style.background="rgba(5,15,10,0)"});
  setTimeout(()=>{if(root.firstChild===sc)root.innerHTML=""},ms+30);
}
document.addEventListener("keydown",e=>{if(e.key==="Escape"){if(PAD){cancelPad();return}softCloseSheet()}});

/* ---------- number pad for planned amounts ---------- */
// Entry works in cents: typing 5,0,0,0,0 gives $500.00. The first key replaces the old amount.
const OPS={"+":(a,b)=>a+b,"−":(a,b)=>a-b,"×":(a,b)=>Math.round(a*b/100),"÷":(a,b)=>b?Math.round(a/(b/100)):a};
const curCents=()=>PAD.cur===""?0:+PAD.cur;
function padValue(){if(!PAD)return 0;if(!PAD.ops.length)return Math.max(0,curCents());
  let acc=PAD.ops[0][0];for(let i=0;i<PAD.ops.length;i++){const nx=i+1<PAD.ops.length?PAD.ops[i+1][0]:(PAD.cur===""?null:curCents());if(nx===null)break;acc=OPS[PAD.ops[i][1]](acc,nx)}
  return Math.max(0,acc)}
function padOpen(kind,id){
  if(!S.db||S.readOnly){toast("Saving isn't available here");return}
  if(PAD){if(PAD.kind===kind&&PAD.id===id)return;commitPad()}
  const src=kind==="income"?incomeFor(S.ym).find(x=>x.id===id):((findItem(groupsFor(S.ym),id)||{}).it);
  if(!src)return;
  const c=Math.round((+src.planned||0)*100);
  PAD={kind,id,ym:S.ym,name:kind==="income"&&COMBINED&&incomeFor(S.ym).length===1?"Planned":src.name,orig:c,cur:String(c),ops:[],fresh:true,calc:ls.get("pb.calc")==="1"};
  document.body.classList.add("padopen");drawPad();render();
  requestAnimationFrame(()=>{const el=document.querySelector(kind==="item"?'[data-plan="'+CSS.escape(id)+'"]':'[data-iplan="'+CSS.escape(id)+'"]');
    if(el){const r=el.getBoundingClientRect(),pad=$(".pad"),top=pad?pad.getBoundingClientRect().top:innerHeight;
      if(r.bottom>top-24||r.top<120)window.scrollBy({top:r.top-Math.max(140,(top-r.height)/2),behavior:matchMedia("(prefers-reduced-motion:reduce)").matches?"auto":"smooth"})}});
}
function closePad(){PAD=null;document.body.classList.remove("padopen");drawPad();render()}
function cancelPad(){if(PAD)closePad()}
async function commitPad(){
  if(!PAD)return;const p=PAD,v=padValue();
  const groups=JSON.parse(JSON.stringify(groupsFor(p.ym))),inc=JSON.parse(JSON.stringify(incomeFor(p.ym)));
  closePad();
  if(v===p.orig||p.ym!==S.ym)return;
  await saveGroups(groups,inc);
}
function padKey(k){
  if(!PAD)return;const P=PAD;
  if(/^\d$/.test(k)){if(P.fresh){P.cur="";P.fresh=false}if(P.cur.length<9)P.cur=(P.cur+k).replace(/^0+(?=\d)/,"")}
  else if(k==="⌫"){if(P.fresh){P.cur="";P.fresh=false}else if(P.cur!=="")P.cur=P.cur.slice(0,-1);else if(P.ops.length){P.cur=String(P.ops.pop()[0])}}
  else if(k==="C"){P.cur="";P.ops=[];P.fresh=false}
  else if(OPS[k]){P.fresh=false;if(P.cur===""&&P.ops.length)P.ops[P.ops.length-1][1]=k;else{P.ops.push([curCents(),k]);P.cur=""}}
  else if(k==="="){const v=padValue();P.ops=[];P.cur=v?String(v):"";P.fresh=false}
  drawPad();render();
}
const BACK_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round" stroke-linecap="round"><path d="M9 5h11a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H9l-6-7z"/><path d="M12 9.5l5 5M17 9.5l-5 5"/></svg>';
const KEY_LABEL={"⌫":"Delete","÷":"Divide","×":"Multiply","−":"Subtract","+":"Add","C":"Clear"};
function drawPad(){
  const r=$("#padRoot");if(!PAD){r.innerHTML="";return}
  const c=PAD.calc;
  const keys=c?["1","2","3","÷","4","5","6","×","7","8","9","−","C","0","⌫","+"]:["1","2","3","4","5","6","7","8","9","","0","⌫"];
  const expr=c&&PAD.ops.length?PAD.ops.map(([v,o])=>money(v/100)+" "+o).join(" ")+(PAD.cur!==""?" "+money(curCents()/100):"")+" = "+money(padValue()/100):money(padValue()/100);
  /* "Assign the rest" / "Take off": snap this item to whatever makes the budget zero-based */
  let fill="";if(PAD.kind==="item"&&incomeFor(S.ym).length){const left=Math.round((incomeTotal(incomeFor(S.ym))-totals(groupsFor(S.ym),spentMap()).p)*100);
    if(left>0)fill='<button class="padfill" id="padFill" data-to="'+(padValue()+left)+'">Assign the rest · +'+money(left/100)+'</button>';
    else if(left<0){const to=Math.max(0,padValue()+left);fill='<button class="padfill neg" id="padFill" data-to="'+to+'">Take off '+money((padValue()-to)/100)+(to+left<0?" · still over":"")+'</button>'}}
  const inner='<div><div class="padhead"><span class="nm">'+esc(PAD.name)+'</span><span class="pexpr num" aria-live="polite">'+esc(expr)+'</span></div>'+(fill?'<div class="padfillrow">'+fill+'</div>':'')+
    '<div class="keys'+(c?" calc":"")+'">'+keys.map(k=>k?'<button class="key'+(OPS[k]?" op":"")+'" data-k="'+k+'"'+(KEY_LABEL[k]?' aria-label="'+KEY_LABEL[k]+'"':'')+'>'+(k==="⌫"?BACK_SVG:k)+'</button>':'<span></span>').join("")+'</div>'+
    '<div class="padfoot"><label class="tgl"><input type="checkbox" id="padCalc" role="switch"'+(c?" checked":"")+'><span class="sw"></span><b>Calculator</b></label>'+(c?'<button class="btn sec padEq" data-k="=" aria-label="Equals">=</button>':'')+'<button class="btn padDone" id="padDone">Done</button></div></div>';
  const ex=r.querySelector(".pad");
  if(ex){ex.innerHTML=inner;return}
  r.innerHTML='<div class="pad" role="dialog" aria-label="Change planned amount">'+inner+'</div>';
}
$("#padRoot").addEventListener("click",e=>{const f=e.target.closest("#padFill");if(f&&PAD){PAD.ops=[];PAD.cur=String(+f.dataset.to);PAD.fresh=false;try{haptic()}catch(_){}drawPad();render();return}const k=e.target.closest("[data-k]");if(k){padKey(k.dataset.k);return}if(e.target.closest("#padDone"))commitPad()});
$("#padRoot").addEventListener("change",e=>{if(e.target.id==="padCalc"&&PAD){PAD.calc=e.target.checked;ls.set("pb.calc",PAD.calc?"1":"0");if(!PAD.calc&&PAD.ops.length){const v=padValue();PAD.ops=[];PAD.cur=v?String(v):""}drawPad()}});
document.addEventListener("click",e=>{if(PAD&&!e.target.closest("#padRoot,[data-plan],[data-iplan]")){e.preventDefault();e.stopPropagation();commitPad()}},true);
document.addEventListener("keydown",e=>{if(!PAD||e.target.closest&&e.target.closest("input,select,textarea"))return;
  const m={"Backspace":"⌫","Delete":"⌫","+":"+","-":"−","*":"×","/":"÷","=":"="};
  if(/^\d$/.test(e.key)){padKey(e.key);e.preventDefault()}else if(e.key==="Enter"){commitPad();e.preventDefault()}else if(m[e.key]&&(PAD.calc||m[e.key]==="⌫")){padKey(m[e.key]);e.preventDefault()}});

function categoryOptions(groups,sel,ym){
  let h='';const inc=incomeFor(ym||S.ym);if(inc.length&&(!COMBINED||inc.some(x=>x.id===sel))){h+='<optgroup label="Income received">';inc.forEach(x=>h+='<option value="'+esc(x.id)+'"'+(x.id===sel?" selected":"")+'>'+esc(x.name)+'</option>');h+='</optgroup>'}
  groups.forEach(g=>{if(g.aside&&!g.items.some(it=>it.id===sel))return;h+='<optgroup label="'+esc(groupLbl(g,ym))+'">';g.items.forEach(it=>h+='<option value="'+esc(it.id)+'"'+(it.id===sel?" selected":"")+'>'+esc(it.name)+'</option>');h+='</optgroup>'});
  return h;
}
function tVal(T){if(!T.ops.length)return Math.max(0,T.cur===""?0:+T.cur);
  const cc=()=>T.cur===""?0:+T.cur;let acc=T.ops[0][0];for(let i=0;i<T.ops.length;i++){const nx=i+1<T.ops.length?T.ops[i+1][0]:(T.cur===""?null:cc());if(nx===null)break;acc=OPS[T.ops[i][1]](acc,nx)}
  return Math.max(0,acc)}
/* In-sheet keypad (same as the Planned sheet's): moving decimal, commas via money(), optional calculator. */
function sheetPad(sh){let pad=sh.querySelector(".plpad.gp");if(!pad){pad=document.createElement("div");pad.className="plpad gp";pad.hidden=true;sh.appendChild(pad)}
  let T=null,st=null;
  const raw=()=>{const cc=()=>T.cur===""?0:+T.cur;if(!T.ops.length)return cc();let acc=T.ops[0][0];for(let i=0;i<T.ops.length;i++){const nx=i+1<T.ops.length?T.ops[i+1][0]:(T.cur===""?null:cc());if(nx===null)break;acc=OPS[T.ops[i][1]](acc,nx)}return acc};
  const val=()=>round2(raw()/100);
  const draw=()=>{const c=T.calc,keys=c?["1","2","3","÷","4","5","6","×","7","8","9","−","C","0","⌫","+"]:["1","2","3","4","5","6","7","8","9","","0","⌫"];
    const expr=c&&T.ops.length?T.ops.map(([v,o])=>money(v/100)+" "+o).join(" ")+(T.cur!==""?" "+money(+T.cur/100):""):"";
    pad.innerHTML=(c?'<div class="texpr num">'+esc(expr)+'</div>':'')+'<div class="keys'+(c?" calc":"")+'">'+keys.map(k=>k?'<button type="button" class="key'+(OPS[k]?" op":"")+'" data-gk="'+k+'"'+(KEY_LABEL[k]?' aria-label="'+KEY_LABEL[k]+'"':'')+'>'+(k==="⌫"?BACK_SVG:k)+'</button>':'<span></span>').join("")+'</div>'+
      '<div class="padfoot"><label class="tgl"><input type="checkbox" class="gp-calc" role="switch"'+(c?" checked":"")+'><span class="sw"></span><b>Calculator</b></label>'+(c?'<button type="button" class="btn sec padEq" data-gk="=" aria-label="Equals">=</button>':'')+'<button type="button" class="btn padDone" data-gdone="1">Done</button></div>';
    pad.querySelector(".gp-calc").onchange=e=>{T.calc=e.target.checked;ls.set("pb.calc",T.calc?"1":"0");draw()}};
  const finish=save=>{if(!st)return;const s0=st;st=null;const v=val();s0.btn.classList.remove("on");pad.hidden=true;s0.onDone(save?v:null)};
  pad.addEventListener("click",e=>{if(e.target.closest("[data-gdone]")){finish(true);return}const b=e.target.closest("[data-gk]");if(!b||!st)return;const k=b.dataset.gk;
    if(k==="="){const v=raw();T.ops=[];T.cur=v?String(Math.abs(Math.round(v))):"";T.fresh=false}else tKey(T,k);try{haptic()}catch(_){}st.onLive(val());draw()});
  return{open(btn,init,onLive,onDone){if(st)finish(true);st={btn,onLive,onDone};T={cur:init?String(Math.round(init*100)):"",ops:[],fresh:true,calc:ls.get("pb.calc")==="1"};
      btn.classList.add("on");pad.hidden=false;draw();onLive(val());
      requestAnimationFrame(()=>requestAnimationFrame(()=>{const pt=pad.getBoundingClientRect().top,r=btn.getBoundingClientRect();if(r.bottom>pt-12)sh.scrollTop+=r.bottom-(pt-12)+24;else if(r.top<90)sh.scrollTop-=90-r.top}))},
    finish,active:()=>st&&st.btn}}
function tKey(T,k){const cc=()=>T.cur===""?0:+T.cur;
  if(/^\d$/.test(k)){if(T.fresh){T.cur="";T.fresh=false}if(T.cur.length<9)T.cur=(T.cur+k).replace(/^0+(?=\d)/,"")}
  else if(k==="⌫"){if(T.fresh){T.cur="";T.fresh=false}else if(T.cur!=="")T.cur=T.cur.slice(0,-1);else if(T.ops.length)T.cur=String(T.ops.pop()[0])}
  else if(k==="C"){T.cur="";T.ops=[];T.fresh=false}
  else if(OPS[k]){T.fresh=false;if(T.cur===""&&T.ops.length)T.ops[T.ops.length-1][1]=k;else{T.ops.push([cc(),k]);T.cur=""}}
  else if(k==="="){const v=tVal(T);T.ops=[];T.cur=v?String(v):"";T.fresh=false}}
function fmtLong(d){return dfmt({month:"long",day:"numeric",year:"numeric"}).format(new Date(d+"T12:00:00"))}
const CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';
function logStats(){
  const loc=iso=>{const d=new Date(iso);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
  const days=new Set();let todayN=0;const td=today();
  S.tx.forEach(t=>{if(!t.createdAt||isHist(t))return;const k=loc(t.createdAt);days.add(k);if(k===td)todayN++});
  days.add(td);let streak=0;const d=new Date();for(;;){const k=d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());if(!days.has(k))break;streak++;d.setDate(d.getDate()-1)}
  return {todayN:Math.max(1,todayN),streak};
}
function celebrate(amount,merchant,kind,left){
  const old=document.querySelector(".cel");if(old)old.remove();
  const st=logStats();const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
  const cheers=["Nice work!","Logged!","Every dollar counts","Way to stay on it","Budget boss","Another one tracked"];
  const msg=left?(left.v>=0?'<b>'+money(left.v)+'</b> left in '+esc(left.n):'<b style="color:var(--over)">'+money(-left.v)+'</b> over in '+esc(left.n)):(merchant?esc(merchant)+" · ":"")+cheers[Math.floor(Math.random()*cheers.length)];
  const badge=st.streak>=2?"🔥 "+st.streak+"-day logging streak":(st.todayN>1?"✨ "+st.todayN+" logged today":"✨ First one today");
  const el=document.createElement("div");el.className="cel";el.setAttribute("role","status");el.setAttribute("aria-live","polite");
  el.innerHTML='<canvas></canvas><div class="box"><div class="ring"><svg viewBox="0 0 24 24"><path d="M5.5 12.5l4 4 9-9.5"/></svg></div><div class="camt num">'+(kind==="refund"?"+":"")+money(0)+'</div><div class="cmsg">'+msg+'</div><div class="cstreak">'+badge+'</div></div>';
  document.body.appendChild(el);
  requestAnimationFrame(()=>el.classList.add("in"));
  // haptics: a quick double tick
  haptic();setTimeout(haptic,140);setTimeout(haptic,360);SND.play(kind==="income"||kind==="refund"?"chime":"coin");
  if(left&&left.v<0)setTimeout(()=>hapticN(2,90),700);
  // count-up amount
  const amtEl=el.querySelector(".camt"),t0=performance.now(),dur=reduce?1:650,pre=kind==="refund"?"+":"";
  (function tick(now){const k=Math.min(1,(now-t0)/dur),e=1-Math.pow(1-k,3);amtEl.textContent=pre+money(round2(amount*e));if(k<1)requestAnimationFrame(tick)})(t0);
  // confetti
  if(!reduce){const cv=el.querySelector("canvas"),dpr=Math.min(2,devicePixelRatio||1),W=innerWidth,H=innerHeight;cv.width=W*dpr;cv.height=H*dpr;const c=cv.getContext("2d");c.scale(dpr,dpr);
    const cols=["#3fd08c","#17885c","#f2c200","#ff7a6e","#6cb6ff","#ffffff","#b388ff"];const P=[];const cx=W/2,cy=H/2-30;
    for(let i=0;i<140;i++){const a=Math.random()*Math.PI*2,v=6+Math.random()*9;P.push({x:cx,y:cy,vx:Math.cos(a)*v,vy:Math.sin(a)*v-5,r:Math.random()*Math.PI,vr:(Math.random()-.5)*.35,w:6+Math.random()*6,h:3+Math.random()*5,c:cols[i%cols.length],o:1,circ:Math.random()<.25})}
    const s0=performance.now();(function fr(now){const t=now-s0;c.clearRect(0,0,W,H);let live=0;
      P.forEach(p=>{p.vy+=.32;p.vx*=.985;p.vy*=.985;p.x+=p.vx;p.y+=p.vy;p.r+=p.vr;if(t>1100)p.o-=.03;if(p.o<=0||p.y>H+20)return;live++;
        c.save();c.globalAlpha=Math.max(0,p.o);c.translate(p.x,p.y);c.rotate(p.r);c.fillStyle=p.c;if(p.circ){c.beginPath();c.arc(0,0,p.w/2.4,0,7);c.fill()}else c.fillRect(-p.w/2,-p.h/2,p.w,p.h*Math.abs(Math.cos(p.r*2)));c.restore()});
      if(live&&el.isConnected)requestAnimationFrame(fr)})(s0)}
  let gone=false;const close=()=>{if(gone)return;gone=true;el.classList.remove("in");el.classList.add("out");setTimeout(()=>el.remove(),350);setTimeout(flyIn,140)};
  el.addEventListener("click",close);setTimeout(close,reduce?1400:2100);
}
/* Satisfying save: after the celebration, the amount flies into its budget item (or the Budget tab), which glows as its number rolls down. */
let FLY=null;
function flyIn(){const f=FLY;FLY=null;if(!f||matchMedia("(prefers-reduced-motion:reduce)").matches)return;
  const vis=el=>{if(!el)return false;const r=el.getBoundingClientRect();return r.height>0&&r.bottom>60&&r.top<innerHeight-90};
  const row=f.item&&[...document.querySelectorAll('#main [data-item="'+CSS.escape(f.item)+'"]')].find(vis);
  const card=row&&(row.closest(".item")||row),dest=vis(card)?(card.querySelector(".v")||card):document.querySelector('nav.tabs [data-tab="'+(S.tab==="budget"?"budget":"tx")+'"]');if(!dest)return;
  const d=dest.getBoundingClientRect(),chip=document.createElement("div");chip.className="flychip num";chip.textContent=(f.kind==="expense"?"−":"+")+money(f.amt);document.body.appendChild(chip);
  const c=chip.getBoundingClientRect(),x0=innerWidth/2-c.width/2,y0=innerHeight/2-40,x1=d.left+d.width/2-c.width/2,y1=d.top+d.height/2-c.height/2;
  const a=chip.animate([{transform:"translate("+x0+"px,"+y0+"px) scale(1.15)",opacity:0},{transform:"translate("+x0+"px,"+(y0-14)+"px) scale(1.15)",opacity:1,offset:.18},
    {transform:"translate("+((x0+x1)/2)+"px,"+(Math.min(y0,y1)-60)+"px) scale(.9)",opacity:1,offset:.6},{transform:"translate("+x1+"px,"+y1+"px) scale(.45)",opacity:0}],{duration:720,easing:"cubic-bezier(.45,0,.25,1)",fill:"forwards"});
  a.onfinish=()=>{chip.remove();haptic();const t=vis(card)?card:dest;t.classList.remove("landed");void t.offsetWidth;t.classList.add("landed");setTimeout(()=>t.classList.remove("landed"),900);if(f.over)setTimeout(()=>hapticN(2,90),120)}}
/* Optional sounds (Settings → Personal touches, off by default): soft synthesized coin, chime and swish. */
const SND={ctx:null,on(){return localStorage.getItem("pb.sounds")==="1"},
  play(k){if(!this.on())return;try{const C=this.ctx||(this.ctx=new (window.AudioContext||window.webkitAudioContext)());if(C.state==="suspended")C.resume();const t=C.currentTime,out=C.createGain();out.gain.value=.16;out.connect(C.destination);
    const tone=(f,at,dur,type)=>{const o=C.createOscillator(),g=C.createGain();o.type=type||"sine";o.frequency.setValueAtTime(f,t+at);g.gain.setValueAtTime(0,t+at);g.gain.linearRampToValueAtTime(1,t+at+.008);g.gain.exponentialRampToValueAtTime(.001,t+at+dur);o.connect(g);g.connect(out);o.start(t+at);o.stop(t+at+dur+.02)};
    if(k==="coin"){tone(1318.5,0,.12);tone(1975.5,.075,.32)}
    else if(k==="chime"){tone(1046.5,0,.35);tone(1318.5,.09,.35);tone(1568,.18,.5)}
    else if(k==="swish"){const n=C.sampleRate*.28,b=C.createBuffer(1,n,C.sampleRate),d=b.getChannelData(0);for(let i=0;i<n;i++)d[i]=(Math.random()*2-1)*Math.sin(Math.PI*i/n);
      const src=C.createBufferSource(),bp=C.createBiquadFilter();bp.type="bandpass";bp.Q.value=1.4;bp.frequency.setValueAtTime(2400,t);bp.frequency.exponentialRampToValueAtTime(500,t+.28);src.buffer=b;src.connect(bp);bp.connect(out);src.start(t)}}catch(_){}}};
window.PB_SND=SND;window.PB_RENDER=()=>render();
function reimbFroms(){const seen={};txPool().forEach(t=>{if(t.reimbFrom)seen[t.reimbFrom]=(seen[t.reimbFrom]||0)+1});return Object.keys(seen).sort((a,b)=>seen[b]-seen[a]).slice(0,12)}
