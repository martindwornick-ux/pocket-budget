/* ---------- pull down to refresh ---------- */
let GEST=null; // which page gesture owns the current touch: "pull" | "tabs"
async function refreshNow(){
  if(!S.db)return;
  const ym=S.ym;
  const [snap,hs,bs]=await Promise.all([
    S.db.collection("tx").where("date",">=",ym+"-01").where("date","<=",ym+"-31").limit(1000).get(),
    ym<HIST_BEFORE?S.db.doc("hist/"+ym).get().catch(()=>null):Promise.resolve(null),
    S.db.collection("budgets").get().catch(()=>null)]);
  if(ym!==S.ym)return;
  S.tx=snap.docs.map(d=>Object.assign({id:d.id},d.data())).concat(hs&&hs.exists?histToTx(ym,hs.data()):[]);S.txLoaded=true;
  if(bs&&bs.docs&&bs.docs.length){const m={};bs.docs.forEach(d=>m[d.id]=d.data());S.budgets=m;S.budgetsLoaded=true}
  IS.fresh={};IS.loading={};loadHist();loadSubs();render();
}
(()=>{
  const el=document.createElement("div");el.id="ptr";el.setAttribute("aria-hidden","true");
  el.innerHTML='<svg viewBox="0 0 40 40">'+Array.from({length:8},(_,i)=>'<line x1="20" y1="5" x2="20" y2="12" transform="rotate('+(i*45)+' 20 20)"/>').join("")+'</svg>';
  document.body.appendChild(el);
  const main=$("#main"),svg=el.firstChild,lines=[...el.querySelectorAll("line")],BASE=lines.map((_,i)=>0.22+0.78*i/7);
  const TH=66,REST=54,EASE="cubic-bezier(.22,1,.36,1)";
  // iOS-style rubber band: follows the finger at first, then resists more the farther you pull
  const rubber=d=>{const dim=Math.max(420,innerHeight*.95);return(1-1/(d*.75/dim+1))*dim};
  /* BOUNCE: cards fan apart while you pull, then ricochet back with a few overshoots, staggered card by card.
     Fast flings into the top or bottom ricochet too. Turn it down with BOUNCE.amp / BOUNCE.spread / BOUNCE.ms. */
  const BOUNCE={amp:1,spread:.11,ms:800,stagger:22,maxV:3.2};
  const cardEls=()=>[...main.children].filter(c=>c.offsetHeight>20).slice(0,14);
  function spread(p){const cs=cardEls(),n=cs.length;cs.forEach((c,i)=>{const k=p>0?i:(n-1-i),o=p*BOUNCE.spread*k;c.style.transition="none";c._tilt=false;c.style.transform=o?"translate3d(0,"+o.toFixed(2)+"px,0)":""})}
  const promote=on=>{main.style.willChange=on?"transform":"";cardEls().forEach(c=>c.style.willChange=on?"transform":"")};
  let animEnd=0;
  /* Physics, no spring wobble (critically damped):
     release: glides home from where you let go, y = p(1+wt)e^(-wt)
     fling:   keeps the speed it hit the edge with, coasts out and eases back, y = v t e^(-wt)
     Sampled once per frame into keyframes so there are no jumps. */
  const W=1/105;
  const curveRel=(p,t)=>p*(1+W*t)*Math.exp(-W*t);
  const curveFling=(v,t)=>v*t*Math.exp(-W*t);
  const framesOf=(fn,ms,scale)=>{const N=Math.max(8,Math.round(ms/16.7)),f=[];for(let i=0;i<=N;i++){const t=i/N*ms;f.push({transform:"translate3d(0,"+(fn(t)*scale).toFixed(2)+"px,0)",offset:i/N})}f[N].transform="translate3d(0,0,0)";return f};
  function ricochet(from,vel0){ /* from: page offset at release (px); vel0: edge-hit speed for flings (px/ms) */
    clearTimeout(settleT);if(raf){cancelAnimationFrame(raf);raf=0}
    main.style.transition="";const a=BOUNCE.amp,ms=BOUNCE.ms;
    const fn=vel0?(t=>curveFling(vel0*a,t)):(t=>curveRel(from,t)),dir=Math.sign(vel0||from)||1;
    promote(true);main.style.transform="";main.animate(framesOf(fn,ms,1),{duration:ms,easing:"linear"});
    const cs=cardEls(),n=cs.length;
    cs.forEach((c,i)=>{const k=dir>0?i:(n-1-i);c.style.transform="";if(!k)return;
      c.animate(framesOf(fn,ms,BOUNCE.spread*k),{duration:ms,delay:k*BOUNCE.stagger,easing:"linear",fill:"backwards"})});
    animEnd=performance.now()+ms+n*BOUNCE.stagger;
    pull=0;el.style.transition="opacity 260ms ease";el.style.opacity="0";el.style.transform="";
    settleT=setTimeout(()=>{promote(false);el.style.transition=""},ms+n*BOUNCE.stagger+60)}

  const atTop=()=>window.scrollY<=0;
  const atBottom=()=>window.scrollY+window.innerHeight>=document.documentElement.scrollHeight-2;
  const blocked=t=>PAD||$("#sheetRoot").firstChild||document.querySelector(".pbx-scrim,.pbx-gate,.cel,.alrt")||(t.closest&&t.closest("input,textarea,select,.pscrub,svg.di,.imap,.mlzs"));
  let y0=null,x0=0,startY=0,mode=0,busy=false,armed=false,pull=0,raf=0,want=0,settleT=0;
  function paint(p){
    main.style.transform=p?"translate3d(0,"+p.toFixed(2)+"px,0)":"";spread(p);
    const top=Math.max(0,p);
    el.style.transform="translate3d(0,"+Math.max(0,top/2-14).toFixed(2)+"px,0)";
    if(busy){el.style.opacity="1";return}
    el.style.opacity=top>4?Math.min(1,top/(TH*.7)).toFixed(3):"0";
    const prog=top/TH*8;lines.forEach((l,i)=>l.style.opacity=(BASE[i]*Math.max(0,Math.min(1,prog-i))).toFixed(3));
    svg.style.transform="rotate("+(top/TH*30-30).toFixed(1)+"deg)";
  }
  function live(p){pull=p;want=p;if(!raf)raf=requestAnimationFrame(()=>{raf=0;paint(want)})}
  function settle(p,ms,fade){
    clearTimeout(settleT);if(raf){cancelAnimationFrame(raf);raf=0}
    const tr="transform "+ms+"ms "+EASE;
    main.style.transition=tr;el.style.transition=tr+",opacity "+(fade?ms*.6:ms)+"ms ease";svg.style.transition="transform "+ms+"ms "+EASE;
    pull=p;paint(p);if(fade)el.style.opacity="0";
    settleT=setTimeout(()=>{main.style.transition=el.style.transition=svg.style.transition="";if(!p&&!busy)main.style.willChange=""},ms+40);
  }
  document.addEventListener("touchstart",e=>{y0=null;mode=0;if(busy||e.touches.length!==1||blocked(e.target))return;
    y0=e.touches[0].clientY;x0=e.touches[0].clientX;armed=false},{passive:true});
  document.addEventListener("touchmove",e=>{if(y0===null)return;const t=e.touches[0];
    if(!mode){const dy=t.clientY-y0,dx=t.clientX-x0;
      if(Math.abs(dx)>10&&Math.abs(dx)>Math.abs(dy)){y0=null;return}
      if(GEST&&GEST!=="pull"){y0=null;return}
      if(dy>3&&dy>Math.abs(dx)*1.2&&atTop())mode=1;else{if(Math.abs(dy)>3)y0=null;return}
      GEST="pull";
      startY=t.clientY;clearTimeout(settleT);main.getAnimations().forEach(a=>a.cancel());cardEls().forEach(c=>c.getAnimations().forEach(a=>a.cancel()));main.style.transition=el.style.transition=svg.style.transition="none";promote(true)}
    e.preventDefault();
    const d=t.clientY-startY;
    if(mode===1){const p=rubber(Math.max(0,d));
      if(p>=TH&&!armed){armed=true;try{haptic()}catch(_){}}else if(p<TH-8)armed=false;live(p)}
    else live(-rubber(Math.max(0,-d)))},{passive:false});
  const end=async()=>{const m=mode;mode=0;y0=null;if(GEST==="pull")GEST=null;if(!m)return;
    if(m===-1||pull<TH){ricochet(pull);return}
    busy=true;el.classList.add("spin");lines.forEach((l,i)=>l.style.opacity=BASE[i]);svg.style.transform="";settle(REST,380);
    const t0=Date.now();
    try{await refreshNow()}catch(e){toast("Couldn't refresh. Check your connection.")}
    setTimeout(()=>{busy=false;el.classList.remove("spin");ricochet(REST)},Math.max(0,750-(Date.now()-t0)))};
  document.addEventListener("touchend",end);document.addEventListener("touchcancel",end);
})();
/* ---------- swipe left / right between tabs (pages sit side by side like cards) ---------- */
(()=>{
  const TABS=["budget","tx","insights"],main=$("#main"),EASE="cubic-bezier(.25,.9,.3,1)";
  const blocked=t=>PAD||$("#sheetRoot").firstChild||document.querySelector(".pbx-scrim,.pbx-gate,.cel,.alrt")||(t.closest&&t.closest(".pscrub,svg.di,.imap,.mlzs,input,textarea,select,.isel,nav.tabs,.pad"));
  let x0=null,y0=0,on=false,dx=0,onRow=false,raf=0,busy=false,lastX=0,lastT=0,vel=0,peek=null,side=0;
  const W=()=>innerWidth;
  const pageHTML=tab=>{const g=groupsFor(S.ym);return tab==="budget"?renderBudget(g,spentMap()):tab==="tx"?renderTx(g):renderInsights(g,spentMap())};
  // the neighbour page lines up exactly where it will sit once it becomes the real page
  function headerFor(tab){const cur=S.tab;S.tab=tab;renderHeader();const hh=$("header").offsetHeight;S.tab=cur;renderHeader();return hh}
  function makePeek(s){
    dropPeek();const i=TABS.indexOf(S.tab),t=TABS[i+s];if(!t)return;
    const up=S.upcoming;S.upcoming=false;
    peek=document.createElement("main");peek.className="peek";peek.setAttribute("aria-hidden","true");peek.dataset.tab=t;
    peek.style.top="calc(env(safe-area-inset-top,0px) + "+headerFor(t)+"px)";
    peek.innerHTML=pageHTML(t);S.upcoming=up;
    peek.style.transform="translate3d("+(s*W())+"px,0,0)";document.body.appendChild(peek);side=s;
  }
  function dropPeek(){if(peek){peek.remove();peek=null}side=0}
  function paint(x){
    main.style.transform=x?"translate3d("+x.toFixed(1)+"px,0,0)":"";
    if(peek)peek.style.transform="translate3d("+(x+side*W()).toFixed(1)+"px,0,0)";
  }
  document.addEventListener("touchstart",e=>{x0=null;on=false;if(busy||e.touches.length!==1||blocked(e.target))return;
    const t=e.touches[0];if(t.clientX<16||t.clientX>innerWidth-8)return; // leave the screen edges to iOS
    x0=t.clientX;y0=t.clientY;lastT=Date.now();lastX=x0;vel=0;onRow=!!(e.target.closest&&e.target.closest(".swr"))},{passive:true});
  document.addEventListener("touchmove",e=>{if(x0===null)return;const t=e.touches[0],ddx=t.clientX-x0,ddy=t.clientY-y0;
    if(!on){
      if(GEST&&GEST!=="tabs"){x0=null;dropPeek();return}
      if(Math.abs(ddy)>10&&Math.abs(ddy)>=Math.abs(ddx)){x0=null;dropPeek();return}
      if(onRow&&(ddx<0||SW.openRow)){if(Math.abs(ddx)>8){x0=null;dropPeek()}return} // left on a row = Delete; an open row closes first
      if(!peek&&Math.abs(ddx)>5&&Math.abs(ddx)>Math.abs(ddy)*1.4){const s=ddx<0?1:-1;if(TABS[TABS.indexOf(S.tab)+s])makePeek(s)}
      if(Math.abs(ddx)<12||Math.abs(ddx)<Math.abs(ddy)*1.4)return;
      on=true;GEST="tabs";x0=t.clientX;main.style.transition="none";main.style.willChange="transform";
    }
    e.preventDefault();
    const now=Date.now();if(now>lastT){vel=.6*vel+.4*(t.clientX-lastX)/(now-lastT);lastX=t.clientX;lastT=now}
    let d=t.clientX-x0;const s=d<0?1:-1,i=TABS.indexOf(S.tab),has=!!TABS[i+s];
    if(d&&has&&side!==s)makePeek(s);
    if(!has){if(peek)dropPeek();d=d/(1+Math.abs(d)/120)*.5} // first/last tab: stretch and spring back
    dx=d;if(!raf)raf=requestAnimationFrame(()=>{raf=0;if(on)paint(dx)})},{passive:false});
  // carry the finger's speed into the slide: the curve starts at the release velocity, then eases to rest
  function glide(x,done){
    const dist=x-dx,ad=Math.abs(dist);
    const ms=Math.round(Math.max(280,Math.min(480,240+ad*.55)));
    const s=ad>1&&Math.sign(vel)===Math.sign(dist)?Math.abs(vel)*ms/ad:0;
    const y1=Math.max(0,Math.min(1,.28*s));
    const tr="transform "+ms+"ms cubic-bezier(.28,"+y1.toFixed(3)+",.32,1)";
    main.style.transition=tr;if(peek)peek.style.transition=tr;
    paint(x);setTimeout(done,ms+20);
  }
  const end=()=>{const was=on;on=false;x0=null;if(GEST==="tabs")GEST=null;if(!was){if(peek&&!busy)dropPeek();return}
    if(raf){cancelAnimationFrame(raf);raf=0}
    const w=W(),i=TABS.indexOf(S.tab);
    const go=peek&&((side===1&&(dx<-w*.25||vel<-.3))||(side===-1&&(dx>w*.25||vel>.3)));
    busy=true;
    if(!go){
      glide(0,()=>{dropPeek();main.style.transition="";main.style.willChange="";busy=false});dx=0;return;
    }
    glide(-side*w,()=>{
      S.tab=TABS[i+side];S.upcoming=false;
      main.style.transition="none";main.style.transform="";
      render();window.scrollTo(0,0);dropPeek();main.style.willChange="";dx=0;busy=false;
      try{haptic()}catch(_){}
    });
  };
  document.addEventListener("touchend",end);document.addEventListener("touchcancel",end);
})();
init();
})();
