/* ---------- events ---------- */
$("#seg").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;S.view=b.dataset.v;ls.set("pb.view",S.view);render()});
// Haptic tick: iOS Safari/WebKit fires a light haptic when a native switch toggles; Android uses vibrate.
const HAP={last:0};
const haptic=(()=>{let lab=null;return()=>{try{if(navigator.vibrate&&navigator.vibrate(8))return;if(performance.now()-HAP.last<150)return;
  if(!lab){lab=document.createElement("label");lab.className="pbhap";lab.setAttribute("aria-hidden","true");lab.style.cssText="position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0";const i=document.createElement("input");i.type="checkbox";i.setAttribute("switch","");i.tabIndex=-1;lab.appendChild(i);document.body.appendChild(lab)}
  lab.click()}catch(e){}}})();
/* Real-tap haptics. iOS 26.5 stopped haptics for switches clicked from code, but a switch toggled by a real tap still gives one.
   Every button gets an invisible <label class="hapsw" for="pbHapSw"> laid over it. A tap on the label toggles the one hidden
   switch (#pbHapSw) inside that same tap (haptic), and the click still bubbles up to the button, so everything works as before.
   A label (not the switch itself) is what sits over the button: iOS lets you drag a switch, which swallowed scrolls that started
   on a row; a label scrolls normally. The switch's input/change events are stopped at the window. Skipped: links, labels, .nohap,
   and buttons holding a select/input/textarea (custom pickers). haptic() above skips its old trick right after a real tap. */
(()=>{const SEL="button,[role=button]";
  const SW=document.createElement("input");SW.type="checkbox";SW.setAttribute("switch","");SW.id="pbHapSw";SW.tabIndex=-1;SW.setAttribute("aria-hidden","true");
  SW.style.cssText="position:fixed;left:-60px;top:0;width:40px;height:24px;opacity:0;pointer-events:none";document.body.appendChild(SW);
  const T=document.createElement("label");T.htmlFor="pbHapSw";T.className="hapsw";T.setAttribute("aria-hidden","true");
  const arm=b=>{const h=b._hap;if(h&&h.parentNode===b)return;if(b.closest("a,label,.nohap")||b.querySelector("select,textarea,input"))return;
    const t=T.cloneNode(false);b.classList.add("hapon");b.appendChild(t);b._hap=t};
  window.addEventListener("mousedown",e=>{if(e.target&&e.target.classList&&e.target.classList.contains("hapsw"))e.preventDefault()},true);
  /* long lists (Map, Transactions) can hold 1,000+ buttons: in #main, a button gets its switch only once it's within ~1 screen of view */
  const io=window.IntersectionObserver?new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){io.unobserve(e.target);e.target._hio=false;arm(e.target)}}),{rootMargin:"900px 0px"}):null;
  const want=b=>{const h=b._hap;if(h&&h.parentNode===b)return;if(io&&b.closest("#main")){if(!b._hio){b._hio=true;io.observe(b)}}else arm(b)};
  const scan=n=>{if(n.nodeType!==1||n.classList.contains("hapsw"))return;if(n.matches(SEL))want(n);if(n.firstElementChild)n.querySelectorAll(SEL).forEach(want)};
  let Q=new Set(),qd=false;const flush=()=>{qd=false;const q=Q;Q=new Set();q.forEach(n=>{if(n.isConnected)scan(n)})};
  new MutationObserver(ms=>{for(const m of ms){if(m.target.nodeType===1&&m.target.matches&&m.target.matches(SEL))Q.add(m.target);m.addedNodes.forEach(n=>{if(n.nodeType===1&&!n.classList.contains("hapsw"))Q.add(n)})}
    if(Q.size&&!qd){qd=true;queueMicrotask(flush)}}).observe(document.body,{childList:true,subtree:true});
  scan(document.body);
  ["input","change"].forEach(ev=>window.addEventListener(ev,e=>{if(e.target===SW)e.stopImmediatePropagation()},true));
  window.addEventListener("click",e=>{if(e.target===SW){e.stopImmediatePropagation();HAP.last=performance.now()}},true);
})();
/* tuned haptics: n quick taps (iPhone web apps get one tap style, so strength comes from rhythm) */
const hapticN=(n,gap)=>{for(let i=0;i<n;i++)setTimeout(haptic,i*(gap||100))};
$("#fab").addEventListener("pointerdown",()=>haptic(),{passive:true});
document.addEventListener("click",e=>{const b=e.target.closest("#seg button,[data-isub],#f-kind button");if(b&&b.getAttribute("aria-pressed")!=="true")haptic()},true);
document.querySelector("nav.tabs").addEventListener("click",e=>{const b=e.target.closest("button");if(!b)return;if(S.tab!==b.dataset.tab)haptic();S.tab=b.dataset.tab;S.upcoming=false;render();window.scrollTo(0,0)});
$("#monthBtn").onclick=monthSheet;
$("#fab").onclick=()=>txSheet();
$("#main").addEventListener("change",e=>{const id=e.target.id;
  if(id==="i-avr"){IS.avr=+e.target.value;ls.set("pb.avr",String(IS.avr));render()}
  else if(id==="i-range"){IS.sel=null;IS.rot=0;IS.range=+e.target.value;IS.ranges=IS.ranges||{};IS.ranges[IS.sub]=IS.range;ls.set("pb.irange."+IS.sub,String(IS.range));render()}
  else if(id==="i-group"){IS.group=e.target.value;IS.item="";IS.sel=null;IS.rot=0;IS.bmSel=null;IS.wdSel=null;IS.calSel=null;render()}
  else if(id==="i-item"){IS.item=e.target.value;render()}
  else if(id==="wd-var"){IS.wdVar=e.target.checked;ls.set("pb.wdvar",IS.wdVar?"1":"0");render()}});
$("#hisub").addEventListener("click",e=>{const b=e.target.closest("[data-isub]");if(!b||IS.sub===b.dataset.isub)return;IS.sub=b.dataset.isub;ls.set("pb.isub",IS.sub);render();window.scrollTo(0,0)});
$("#hsearch").addEventListener("input",e=>{if(e.target.id==="txq"){S.q=e.target.value;render()}});
// Open Venmo via an iOS Shortcut. The page runs in a framed viewer, so try the top window first,
// then fall back to a new window and finally this frame if the app didn't switch away.
$("#main").addEventListener("click",e=>{const a=e.target.closest("#openVenmo");if(!a)return;e.preventDefault();e.stopPropagation();
  const url=a.getAttribute("href");let left=false;const onHide=()=>{if(document.visibilityState==="hidden")left=true};document.addEventListener("visibilitychange",onHide);
  try{window.top.location.href=url}catch(_){}
  setTimeout(()=>{if(left)return;try{const w=window.open(url,"_blank");if(w)return}catch(_){}
    setTimeout(()=>{if(left)return;try{location.href=url}catch(_){}
      setTimeout(()=>{document.removeEventListener("visibilitychange",onHide);if(!left)toast("Couldn't open Shortcuts from here. Try from Safari or a home-screen icon.")},900)},500)},500)},true);
$("#hsearch").addEventListener("click",e=>{if(e.target.closest("#txqClear")){S.q="";render();const i=$("#txq");i&&i.focus()}});
$("#main").addEventListener("click",e=>{
  const isb=e.target.closest("[data-isub]");if(isb){IS.sub=isb.dataset.isub;ls.set("pb.isub",IS.sub);render();return}
  if(e.target.closest("#txqClear")){S.q="";render();const i=$("#txq");i&&i.focus();return}
  if(e.target.closest("#histImport")){importHistory();return}
  if(e.target.closest("#openRepeats")){e.preventDefault();try{haptic()}catch(_){}repeatsSheet();return}
  if(e.target.closest("[data-upcoming]")){S.upcoming=true;S.q="";S.tab="tx";try{haptic()}catch(_){}render();window.scrollTo(0,0);return}
  const mtg=e.target.closest("#msTog");if(mtg){msToggle(mtg);return}
  const gt=e.target.closest("[data-gtog]");if(gt){let o={};try{o=JSON.parse(ls.get("pb.gopen")||"{}")||{}}catch(_){}const id=gt.dataset.gtog;if(o[id])delete o[id];else o[id]=1;ls.set("pb.gopen",JSON.stringify(o));try{haptic()}catch(_){}render();return}
  const ct=e.target.closest("[data-mtog]");if(ct&&!e.target.closest("[data-plan]")){const c=ct.closest(".pb-card");const op=!c.classList.contains("is-open");c.classList.toggle("is-open",op);
    const tg=c.querySelector(".pb-toggle");if(tg)tg.setAttribute("aria-expanded",String(op));ls.set("pb.msubOpen",op?"1":"0");try{haptic()}catch(_){}return}
  if(e.target.closest("#futTog")){const w=e.target.closest(".futw");const shut=!w.classList.contains("shut");w.classList.toggle("shut",shut);ls.set("pb.futHide",shut?"1":"0");e.target.closest("#futTog").setAttribute("aria-expanded",String(!shut));try{haptic()}catch(_){}return}
  if(e.target.closest("#clrUp")){S.upcoming=false;render();return}
  if(e.target.closest("#openVenmo")){e.preventDefault();let left=false;const off=()=>{left=true};document.addEventListener("visibilitychange",off,{once:true});addEventListener("pagehide",off,{once:true});
    location.href="venmo://";setTimeout(()=>{if(!left&&document.visibilityState==="visible")window.open("https://venmo.com/","_blank","noopener")},1600);return}
  const pv=e.target.closest("[data-plan],[data-iplan]");if(pv){if(pv.dataset.iplan&&COMBINED&&pv.closest(".eqcard")){plannedSheet();return}pv.dataset.plan?padOpen("item",pv.dataset.plan):padOpen("income",pv.dataset.iplan);return}
  if(COMBINED&&e.target.closest(".eqcard #addIncome")){plannedSheet();return}
  if(e.target.closest("[data-plannext]")){planNextSheet();return}
  if(e.target.closest("[data-mlmiss]")){mlMissing();return}
  const t=e.target.closest("[data-income],#addIncome,[data-item],[data-gmenu],[data-additem],[data-tx],[data-tab-go],#addGroup,#addAside,#addFund,#exportCsv,#syncAll");if(!t)return;
  if(t.dataset.income)incomeSheet(t.dataset.income);
  else if(t.id==="addIncome")incomeSheet(null);
  else if(t.dataset.item&&t.dataset.msub)subSheet(t.dataset.msub);
  else if(t.dataset.item)itemSheet(t.dataset.item,t.dataset.msub);
  else if(t.dataset.gmenu)groupSheet(t.dataset.gmenu);
  else if(t.dataset.additem)newItemSheet(t.dataset.additem);
  else if(t.dataset.tx){const x=S.tx.find(y=>y.id===t.dataset.tx);if(x)isHist(x)?histSheet(x):txSheet(x)}
  else if(t.dataset.tabGo){S.tab=t.dataset.tabGo;render()}
  else if(t.id==="addGroup")groupSheet(null);
  else if(t.id==="addFund")groupSheet(null,true);
  else if(t.id==="addAside"){const gs=JSON.parse(JSON.stringify(groupsFor(S.ym))),g={id:uid(),name:"Set aside",aside:true,items:[]};gs.push(g);saveGroups(gs).then(ok=>{if(ok)setTimeout(()=>newItemSheet(g.id),60)})}
  else if(t.id==="exportCsv")exportCsv();
  else if(t.id==="syncAll")syncAll(t);
});
async function syncAll(btn){AS.fail="";
  const list=sortedTx().filter(t=>t.sheet!=="synced"&&!waitSheet(t)).reverse();
  btn.disabled=true;btn.textContent="Sending…";let n=0;
  if(!list.length){btn.disabled=false;btn.textContent="Try again";return}
  let err="";for(const t of list){if(await pushToSheet(t.id,t))n++;else{const f=S.tx.find(x=>x.id===t.id);err=(f&&f.sheetMsg)||"";break}}
  if(btn.isConnected){btn.disabled=false;btn.textContent="Try again"}AS.fail=err;render();
  toast(n&&!err?"Added "+n+" to your sheet":n?"Added "+n+", then stopped: "+(err||"couldn't reach your sheet"):(err||"Couldn't reach your sheet. Check Settings → Google Sheet sync"));
}

/* ---------- data ---------- */
let histUnsub=null;
function subscribeTx(){
  if(!S.db)return;venWatch();txUnsub&&txUnsub();histUnsub&&histUnsub();histUnsub=null;if(!(S.fromCache&&S.cacheYm===S.ym)){S.txLoaded=false;S.tx=[]}
  const ym=S.ym;let live=[],past=[],gotLive=false,gotPast=ym>=HIST_BEFORE;
  const merge=()=>{if(ym!==S.ym)return;S.tx=live.concat(past);S.txLoaded=gotLive&&gotPast;S.fromCache=false;render();cacheSave();if(S.txLoaded)setTimeout(()=>autoSync(),800)};
  txUnsub=S.db.collection("tx").where("date",">=",ym+"-01").where("date","<=",ym+"-31").limit(1000).onSnapshot(snap=>{
    live=snap.docs.map(d=>Object.assign({id:d.id},d.data()));gotLive=true;merge();
  },()=>{gotLive=true;merge()});
  if(ym<HIST_BEFORE){let hd=null;
    hlLoad(ym).then(()=>{if(hd){past=histToTx(ym,hd);merge()}});
    histUnsub=S.db.doc("hist/"+ym).onSnapshot(snap=>{hd=snap.exists?snap.data():null;past=hd?histToTx(ym,hd):[];gotPast=true;merge()},()=>{gotPast=true;merge()})}
}
/* no pinch / double-tap zoom: the layout is built for the phone screen */
["gesturestart","gesturechange"].forEach(ev=>document.addEventListener(ev,e=>e.preventDefault(),{passive:false}));
/* Saved copy of the last budget + this month's transactions, so the app paints instantly on launch. */
let cacheT=0;
function cacheSave(){clearTimeout(cacheT);cacheT=setTimeout(()=>{if(!S.budgetsLoaded||!S.txLoaded||S.fromCache)return;
  try{localStorage.setItem("pb.cache",JSON.stringify({v:1,ym:S.ym,at:Date.now(),budgets:S.budgets,tx:S.tx.filter(t=>!isHist(t))}))}catch(e){}},1200)}
function cacheLoad(){try{const c=JSON.parse(localStorage.getItem("pb.cache")||"null");if(!c||c.v!==1||c.ym!==S.ym)return false;
  S.budgets=c.budgets||{};S.tx=c.tx||[];S.budgetsLoaded=true;S.txLoaded=true;S.fromCache=true;S.cacheYm=c.ym;return true}catch(e){return false}}
async function init(){
  cacheLoad();render();
  const db=await (window.claude?.use?.("db")||Promise.resolve(null)).catch(()=>null);
  if(!db){S.dbState="none";S.budgetsLoaded=true;S.txLoaded=true;render();return}
  S.db=db;S.dbState="ok";loadSubs();
  const user=await (window.claude?.use?.("user")||Promise.resolve(null)).catch(()=>null);
  if(user){try{S.readOnly=!(await user.isOwner())}catch(e){}}
  db.collection("budgets").onSnapshot(snap=>{const m={};snap.docs.forEach(d=>m[d.id]=d.data());S.budgets=m;S.budgetsLoaded=true;S.fromCache=false;fundWatch();render();cacheSave()},()=>{S.budgetsLoaded=true;render()});
  db.doc("meta/history").onSnapshot(snap=>{H.meta=snap.exists?snap.data():null;H.metaLoaded=true;render()},()=>{H.metaLoaded=true;render()});
  subscribeTx();
  setTimeout(merchLoad,1200);
}
