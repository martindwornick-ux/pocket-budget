/* ---------- rendering ---------- */
(()=>{const h=document.querySelector("header");const set=()=>document.documentElement.style.setProperty("--hh",h.offsetHeight+"px");set();try{new ResizeObserver(set).observe(h,{box:"border-box"})}catch(e){}addEventListener("resize",set);addEventListener("orientationchange",()=>setTimeout(set,300));document.addEventListener("visibilitychange",set)})();
// Hand-drawn style month doodles in the Google palette (blue #4285f4, red #ea4335, yellow #fbbc04, green #34a853)
const DOODLES=[
 ["Happy New Year",'<path d="M16 3v26M4.7 9.5l22.6 13M4.7 22.5l22.6-13" stroke="#4285f4" stroke-width="2.6" stroke-linecap="round"/><path d="M13 5l3 3 3-3M13 27l3-3 3 3M5 13.6l4-.9-1.1-4M27 18.4l-4 .9 1.1 4M5 18.4l4 .9-1.1 4M27 13.6l-4-.9 1.1-4" stroke="#4285f4" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/><circle cx="16" cy="16" r="2.6" fill="#fbbc04"/><circle class="spk" cx="27" cy="4" r="1.4" fill="#ea4335"/><circle class="spk" cx="4" cy="28" r="1.2" fill="#34a853"/>'],
 ["Happy Valentine's Day",'<path d="M16 27C6 20 3.5 15 3.5 10.8 3.5 7.4 6.2 5 9.3 5c2.6 0 4.8 1.6 6.7 4.2C17.9 6.6 20.1 5 22.7 5c3.1 0 5.8 2.4 5.8 5.8C28.5 15 26 20 16 27z" fill="#ea4335"/><path d="M9 9.5c-1.4.4-2.2 1.6-2.2 3" stroke="#fff" stroke-width="1.8" stroke-linecap="round" fill="none" opacity=".7"/><path class="spk" d="M27 3l.8 1.8 1.8.8-1.8.8L27 8.2l-.8-1.8-1.8-.8 1.8-.8z" fill="#fbbc04"/>'],
 ["Happy St. Patrick's Day",'<g fill="#34a853"><circle cx="16" cy="9.5" r="5.5"/><circle cx="9.5" cy="16" r="5.5"/><circle cx="22.5" cy="16" r="5.5"/><circle cx="16" cy="15.5" r="4"/></g><path d="M16 18c0 4 1.5 7.5 4.5 10" stroke="#1e8e3e" stroke-width="2.4" stroke-linecap="round" fill="none"/><path class="spk" d="M27 25l.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7z" fill="#fbbc04"/>'],
 ["Spring showers",'<path d="M4 16a12 12 0 0124 0z" fill="#4285f4"/><path d="M10 16a6 9 0 0112 0" fill="#ea4335"/><path d="M16 4v2M16 16v9a3 3 0 01-6 0" stroke="#202124" stroke-width="2.2" stroke-linecap="round" fill="none"/><path class="spk" d="M26 21c0 1.5-1 2.5-2 2.5S22 22.5 22 21s2-3.5 2-3.5 2 2 2 3.5z" fill="#4285f4"/><path class="spk" d="M30 26c0 1.2-.8 2-1.6 2s-1.6-.8-1.6-2 1.6-2.8 1.6-2.8 1.6 1.6 1.6 2.8z" fill="#34a853"/>'],
 ["Happy Mother's Day",'<g transform="translate(16 13)"><g fill="#ea4335"><ellipse rx="3.6" ry="6" transform="translate(0 -5.6)"/><ellipse rx="3.6" ry="6" transform="rotate(72) translate(0 -5.6)"/><ellipse rx="3.6" ry="6" transform="rotate(144) translate(0 -5.6)"/><ellipse rx="3.6" ry="6" transform="rotate(216) translate(0 -5.6)"/><ellipse rx="3.6" ry="6" transform="rotate(288) translate(0 -5.6)"/></g><circle r="3.6" fill="#fbbc04"/></g><path d="M16 21v9M16 26c-3 0-5-2-5-4 3 0 5 2 5 4z" stroke="#34a853" stroke-width="2.2" fill="#34a853" stroke-linecap="round" stroke-linejoin="round"/>'],
 ["Hello summer",'<g stroke="#fbbc04" stroke-width="2.6" stroke-linecap="round"><path d="M16 2v4M16 26v4M2 16h4M26 16h4M6.1 6.1l2.8 2.8M23.1 23.1l2.8 2.8M6.1 25.9l2.8-2.8M23.1 8.9l2.8-2.8"/></g><circle cx="16" cy="16" r="7" fill="#fbbc04"/><path d="M12.5 15.5h2.6M17 15.5h2.6M12.8 18.6c1.8 1.6 4.6 1.6 6.4 0" stroke="#202124" stroke-width="1.6" stroke-linecap="round" fill="none"/>'],
 ["Happy 4th of July",'<g stroke-width="2.4" stroke-linecap="round"><path d="M16 15V4M16 15l7.8-7.8M16 15l11 0M16 15l7.8 7.8M16 15v11M16 15l-7.8 7.8M16 15H5M16 15L8.2 7.2" stroke="#ea4335"/></g><g class="spk" fill="#4285f4"><circle cx="16" cy="3" r="1.8"/><circle cx="28" cy="15" r="1.8"/><circle cx="16" cy="27" r="1.8"/><circle cx="4" cy="15" r="1.8"/></g><g fill="#fbbc04"><circle cx="24.5" cy="6.5" r="1.5"/><circle cx="24.5" cy="23.5" r="1.5"/><circle cx="7.5" cy="23.5" r="1.5"/><circle cx="7.5" cy="6.5" r="1.5"/></g>'],
 ["Beach days",'<path d="M3 26c4-2 8 2 13 0s9-2 13 0" stroke="#4285f4" stroke-width="2.4" fill="none" stroke-linecap="round"/><path d="M15 24L19 6" stroke="#202124" stroke-width="2" stroke-linecap="round"/><path d="M6 9.5C9 3.5 19.5 1 28 8.5z" fill="#ea4335"/><path d="M12.5 7.4C15 3.5 19.5 3 22 6.6" stroke="#fff" stroke-width="2" fill="none" opacity=".8"/><circle class="spk" cx="6" cy="18" r="2.4" fill="#fbbc04"/>'],
 ["Back to school",'<path d="M16 9c-2.5-3-9-3-10 3-1 6.5 4 14 7.5 14 1.2 0 1.6-.6 2.5-.6s1.3.6 2.5.6C22 26 27 18.5 26 12c-1-6-7.5-6-10-3z" fill="#ea4335"/><path d="M16 9c0-2.5.5-4 2-5.5" stroke="#202124" stroke-width="1.8" stroke-linecap="round" fill="none"/><path d="M17.5 6.5c2-2.5 5-2.5 6.5-1.5-1.5 2.5-4.5 2.5-6.5 1.5z" fill="#34a853"/><path d="M10 13c.5-1.5 1.5-2.4 3-2.7" stroke="#fff" stroke-width="1.6" stroke-linecap="round" fill="none" opacity=".7"/>'],
 ["Happy Halloween",'<path d="M16 8.5c-3-1.3-11.5-1-11.5 9C4.5 24 9 27 16 27s11.5-3 11.5-9.5c0-10-8.5-10.3-11.5-9z" fill="#fa7b17"/><path d="M16 9c-1.6 3-1.6 15 0 18M16 9c1.6 3 1.6 15 0 18" stroke="#e8710a" stroke-width="1.4" fill="none"/><path d="M15.5 9c-.3-2.4.5-4.3 2.4-5.5" stroke="#34a853" stroke-width="2.4" stroke-linecap="round" fill="none"/><path d="M9.5 15.5l3 2-3 1zM22.5 15.5l-3 2 3 1zM10.5 21.5l2 1.5 1.6-1.4 1.9 1.5 1.9-1.5 1.6 1.4 2-1.5" fill="#202124" stroke="#202124" stroke-width="1.2" stroke-linejoin="round"/>'],
 ["Happy Thanksgiving",'<g transform="translate(16 18)"><g stroke="none"><ellipse rx="3.3" ry="7.2" transform="rotate(-72) translate(0 -8)" fill="#4285f4"/><ellipse rx="3.3" ry="7.2" transform="rotate(-36) translate(0 -8)" fill="#34a853"/><ellipse rx="3.3" ry="7.2" transform="translate(0 -8)" fill="#ea4335"/><ellipse rx="3.3" ry="7.2" transform="rotate(36) translate(0 -8)" fill="#fbbc04"/><ellipse rx="3.3" ry="7.2" transform="rotate(72) translate(0 -8)" fill="#4285f4"/></g></g><path d="M13.6 25.4l-.6 3.2M12 28.8h2.2M18.4 25.4l.6 3.2M18 28.8h2.2" stroke="#e37400" stroke-width="1.5" stroke-linecap="round" fill="none"/><circle cx="16" cy="19.5" r="6.8" fill="#8d5524"/><ellipse cx="16" cy="21.3" rx="4" ry="4.3" fill="#b07a45"/><circle cx="16" cy="12" r="3.7" fill="#8d5524"/><circle cx="14.6" cy="11.4" r=".85" fill="#202124"/><circle cx="17.4" cy="11.4" r=".85" fill="#202124"/><path d="M14.9 12.9h2.2L16 14.7z" fill="#fbbc04"/><path d="M17 13.6c1.2.5 1.5 2.1.6 3-.7-.7-.9-2-.6-3z" fill="#ea4335"/><path class="spk" d="M28 4l.7 1.5 1.5.7-1.5.7-.7 1.5-.7-1.5-1.5-.7 1.5-.7z" fill="#fbbc04"/><circle class="spk" cx="4" cy="5" r="1.3" fill="#ea4335"/>'],
 ["Happy holidays",'<rect x="5" y="13" width="22" height="15" rx="2.5" fill="#ea4335"/><rect x="3.5" y="9.5" width="25" height="5.5" rx="2" fill="#d93025"/><path d="M16 9.5V28" stroke="#fbbc04" stroke-width="3.2"/><path d="M16 9.5c-2.5-5-8-5.5-7.5-2s5 2.5 7.5 2zM16 9.5c2.5-5 8-5.5 7.5-2s-5 2.5-7.5 2z" fill="#34a853"/><circle class="spk" cx="28" cy="4" r="1.5" fill="#4285f4"/><circle class="spk" cx="4" cy="4.5" r="1.2" fill="#fbbc04"/>']
];
/* Doodle mood: the month's doodle reacts to how flexible spending (fixed bills left out) is going.
   good = at or under pace, warn = ahead of the calendar, over = past the plan (November's turkey gets roasted and smokes). */
function doodleMood(){try{const td=today(),cur=ymOf(td),ym=S.ym;if(ym>cur)return"";const gs=groupsFor(ym),fx=new Set();let p=0;
  gs.forEach(g=>g.items.forEach(it=>{if(isFixed(it,g)){fx.add(it.id);return}if(g.aside)return;p+=+it.planned||0}));if(p<=0)return"";
  const sp=S.tx.filter(t=>t.type!=="income"&&!fx.has(t.itemId)&&(t.date||"")<=td).reduce((a,t)=>a+sAmt(t),0),r=sp/p;
  if(r>1.0001)return"over";if(ym<cur)return"good";const [y,m]=ym.split("-").map(Number),mp=+td.slice(8,10)/new Date(y,m,0).getDate();return r>mp+.08?"warn":"good"}catch(_){return""}}
const MOOD_MSG={good:["Right on track","On track, the turkey's strutting"],warn:["A bit ahead of pace","Careful, the turkey's sweating"],over:["Over budget this month","Over budget, the turkey got roasted"]};
function renderDoodle(){const b=$("#doodle");if(!b)return;const m=+S.ym.slice(5)-1,mood=doodleMood(),k=m+"|"+mood;if(b.dataset.m===k)return;
  const prevM=b.dataset.m?b.dataset.m.split("|")[0]:null,swap=prevM!==null&&prevM!==String(m)&&!matchMedia("(prefers-reduced-motion:reduce)").matches;b.dataset.m=k;const [t,svg]=DOODLES[m];
  /* month change: the old doodle waves goodbye and the new one drops in. First open in a new calendar month also says hello. */
  if(swap){const old=b.querySelector("svg");if(old){const g=old.cloneNode(true);g.classList.add("dbye");b.appendChild(g);setTimeout(()=>g.remove(),520)}}
  {const cur=ymOf(today());if(S.ym===cur&&localStorage.getItem("pb.seenYm")!==cur){const first=localStorage.getItem("pb.seenYm");localStorage.setItem("pb.seenYm",cur);if(first)setTimeout(()=>{toast("Hello "+MONTHS[m]+"! "+t+".");try{hapticN(2,120)}catch(_){}},900)}}
  const extra=mood==="warn"?'<path class="dsweat"'+(m===10?' transform="translate(-5.5 5.5)"':'')+' d="M28.5 3.5c0 1.6-1 2.6-2.1 2.6s-2.1-1-2.1-2.6S26.4 0 26.4 0s2.1 1.9 2.1 3.5z" fill="#4285f4"/>':
    mood==="over"?'<g class="dsmoke" fill="#80868b"><circle cx="12" cy="6" r="2.4"/><circle cx="17" cy="4" r="2.8"/><circle cx="22" cy="6.5" r="2.2"/></g>':'';
  b.className="doodle"+(mood?" m-"+mood:"");
  const bye=b.querySelector(".dbye");b.innerHTML='<svg viewBox="0 0 32 32" aria-hidden="true"'+(swap?' class="dhi"':'')+'><g class="dbody">'+svg+'</g>'+extra+'</svg>';if(bye)b.appendChild(bye);
  const msg=mood?MOOD_MSG[mood][m===10?1:0]:"";b.dataset.msg=msg;b.setAttribute("aria-label",t+(msg?". "+msg:""));b.title=t}
/* Long-press a transaction to peek at it (details + little map) without opening it; let go to close. */
const PEEK={t:0,x:0,y:0,row:null,el:null,eat:false,map:null};
function peekClose(){clearTimeout(PEEK.t);PEEK.row=null;const el=PEEK.el;PEEK.el=null;if(PEEK.map){try{PEEK.map.remove()}catch(_){}PEEK.map=null}if(!el)return;el.classList.remove("on");setTimeout(()=>el.remove(),220)}
function peekOpen(row){const id=row.dataset.tx,t=S.tx.find(x=>x.id===id)||txPool().find(x=>x.id===id);if(!t)return;PEEK.eat=true;haptic();
  const groups=groupsFor(ymOf(t.date)||S.ym),l=t.loc,sign=t.type==="income"||t.type==="refund"?"+":"";
  const el=document.createElement("div");el.className="txpeek";el.setAttribute("role","dialog");el.setAttribute("aria-label","Preview of "+(t.merchant||"purchase"));
  el.innerHTML='<div class="pk"><div class="pkh"><div><div class="pkm">'+esc(t.merchant||"Purchase")+'</div><div class="pkc">'+esc(txLabel(t,groups))+'</div></div><div class="pka num'+(sign?" pos":"")+'">'+sign+money(sAmt(t)||+t.amount||0)+'</div></div>'+
    '<div class="pkd">'+esc(fmtLong(t.date))+(t.person?" · "+esc(t.person):"")+'</div>'+(t.note?'<div class="pkn">'+esc(t.note)+'</div>':'')+
    (l?'<div class="pkl">'+esc(addrDedupe(locText(l)))+'</div>'+(l.lat!=null?'<div class="pkmap"></div>':''):'')+'</div>';
  document.body.appendChild(el);PEEK.el=el;requestAnimationFrame(()=>el.classList.add("on"));
  if(l&&l.lat!=null)loadLeaflet().then(()=>{if(PEEK.el!==el)return;const box=el.querySelector(".pkmap");const mp=L.map(box,{zoomControl:false,attributionControl:false,dragging:false,scrollWheelZoom:false,doubleClickZoom:false,boxZoom:false,keyboard:false,touchZoom:false,tap:false}).setView([l.lat,l.lng],16);
    L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19}).addTo(mp);L.circleMarker([l.lat,l.lng],{radius:8,color:"#fff",weight:3,fillColor:"#ea4335",fillOpacity:1}).addTo(mp);PEEK.map=mp}).catch(()=>{const b=el.querySelector(".pkmap");if(b)b.remove()})}
document.addEventListener("touchstart",e=>{if(e.touches.length!==1)return;const row=e.target.closest&&e.target.closest("#main .txrow[data-tx]");if(!row)return;const p=e.touches[0];PEEK.x=p.clientX;PEEK.y=p.clientY;PEEK.row=row;clearTimeout(PEEK.t);PEEK.t=setTimeout(()=>{if(PEEK.row===row)peekOpen(row)},430)},{passive:true});
document.addEventListener("touchmove",e=>{if(!PEEK.row||PEEK.el)return;const p=e.touches[0];if(Math.abs(p.clientX-PEEK.x)>8||Math.abs(p.clientY-PEEK.y)>8){clearTimeout(PEEK.t);PEEK.row=null}},{passive:true});
["touchend","touchcancel"].forEach(ev=>document.addEventListener(ev,()=>{clearTimeout(PEEK.t);if(PEEK.el)peekClose();PEEK.row=null},{passive:true}));
document.addEventListener("click",e=>{if(PEEK.eat){PEEK.eat=false;if(e.target.closest&&e.target.closest(".txrow")){e.preventDefault();e.stopPropagation()}}},true);
document.addEventListener("contextmenu",e=>{if(e.target.closest&&e.target.closest("#main .txrow"))e.preventDefault()});
$("#nowBar").addEventListener("click",()=>{S.ym=ymOf(today());S.upcoming=false;IS.calSel=null;S.flash=null;try{haptic()}catch(_){}subscribeTx();render();window.scrollTo(0,0)});
$("#doodle").addEventListener("click",e=>{e.stopPropagation();const b=e.currentTarget;b.classList.remove("wig");void b.offsetWidth;b.classList.add("wig");try{haptic()}catch(_){};toast(b.title+"!"+(b.dataset.msg?" "+b.dataset.msg+".":""))});
/* ---------- swipe left on a transaction to reveal Delete ---------- */
const SW={row:null,x0:0,y0:0,dx:0,mode:0,openRow:null,justSwiped:false};
const SWW=96;
function swClose(row,anim=true){if(!row)return;row.classList.toggle("anim",anim);row.style.transform="";if(SW.openRow===row)SW.openRow=null;const w=row.parentNode;setTimeout(()=>{if(SW.openRow!==row&&SW.row!==row)w.classList.remove("on")},anim?320:0)}
$("#main").addEventListener("touchstart",e=>{if(e.target.closest("[data-del]"))return;const row=e.target.closest(".swr .txrow");if(SW.openRow&&SW.openRow!==row)swClose(SW.openRow);if(!row||e.touches.length!==1)return;
  SW.row=row;SW.x0=e.touches[0].clientX;SW.y0=e.touches[0].clientY;SW.dx=0;SW.mode=0;SW.base=SW.openRow===row?-SWW:0;row.classList.remove("anim")},{passive:true});
$("#main").addEventListener("touchmove",e=>{const row=SW.row;if(!row)return;const t=e.touches[0],dx=t.clientX-SW.x0,dy=t.clientY-SW.y0;
  if(SW.mode===0){if(Math.abs(dx)>8&&Math.abs(dx)>Math.abs(dy)*1.2){if(dx>0&&SW.base===0){SW.row=null;return}SW.mode=1}else if(Math.abs(dy)>8){SW.mode=-1;return}else return}
  if(SW.mode!==1)return;e.preventDefault();row.parentNode.classList.add("on");let x=SW.base+dx;if(x>0)x=x/4;if(x<-SWW)x=-SWW+(x+SWW)/3;SW.dx=dx;row.style.transform="translateX("+x+"px)"},{passive:false});
function swEnd(){const row=SW.row;SW.row=null;if(!row||SW.mode!==1)return;SW.justSwiped=true;setTimeout(()=>SW.justSwiped=false,350);
  const x=SW.base+SW.dx;row.classList.add("anim");
  if(x<-SWW/2){row.style.transform="translateX(-"+SWW+"px)";if(SW.openRow&&SW.openRow!==row)swClose(SW.openRow);SW.openRow=row;try{haptic()}catch(_){}}else swClose(row)}
$("#main").addEventListener("touchend",swEnd);$("#main").addEventListener("touchcancel",swEnd);
// taps: a swipe never opens the row; tapping an open row just closes it
$("#main").addEventListener("click",e=>{const del=e.target.closest("[data-del]");
  if(del){e.stopPropagation();e.preventDefault();confirmDelete(del.dataset.del);return}
  if(SW.justSwiped&&e.target.closest(".swr")){e.stopPropagation();e.preventDefault();return}
  if(SW.openRow){e.stopPropagation();e.preventDefault();swClose(SW.openRow)}},true);
document.addEventListener("scroll",()=>{if(SW.openRow)swClose(SW.openRow)},{passive:true});
/* Fitts: the + tucks away while you scroll down so it doesn't sit on top of rows and menus; it comes back on any scroll up, or once scrolling stops */
(()=>{let y0=scrollY,idle=0;addEventListener("scroll",()=>{const y=scrollY,f=document.getElementById("fab");if(!f)return;
  if(y>y0+6&&y>120)f.classList.add("tuck");else if(y<y0-6||y<120)f.classList.remove("tuck");if(Math.abs(y-y0)>6||y<120)y0=y;
  clearTimeout(idle);if(f.classList.contains("tuck"))idle=setTimeout(()=>f.classList.remove("tuck"),550)},{passive:true})})();
function confirmDelete(id){
  const t=S.tx.find(x=>x.id===id);if(!t)return;
  const synced=t.sheet==="synced";
  const root=document.createElement("div");root.className="alrt";root.setAttribute("role","alertdialog");root.setAttribute("aria-modal","true");
  root.innerHTML='<div class="abox"><h3>Delete transaction?</h3><p>Do you want to delete <b>'+esc(t.merchant||"Purchase")+'</b> for <b class="num">'+money(+t.amount||0)+'</b>?</p>'+(synced?'<p class="anote">It\'s already in your Finance Tracker, so remove that row from the sheet too.</p>':'<p class="anote">This can\'t be undone.</p>')+
    '<div class="abtns"><button id="dk">Cancel</button><button id="dy" class="adel">Delete</button></div></div>';
  document.body.appendChild(root);requestAnimationFrame(()=>root.classList.add("in"));
  const done=()=>{root.classList.remove("in");setTimeout(()=>root.remove(),200)};
  root.addEventListener("click",e=>{if(e.target===root){done();if(SW.openRow)swClose(SW.openRow)}});
  root.querySelector("#dk").onclick=()=>{done();if(SW.openRow)swClose(SW.openRow)};
  root.querySelector("#dy").onclick=async()=>{const b=root.querySelector("#dy");b.disabled=true;
    if(!S.db||S.readOnly){toast("Saving isn't available here");b.disabled=false;return}
    Promise.resolve(S.db.doc("tx/"+id).delete()).catch(()=>toast("Couldn't delete. Try again."));SW.openRow=null;done();SND.play("swish");toast("Deleted")};
  root.querySelector("#dy").focus();
  return;
  openSheet('<h3>Delete transaction?</h3><p style="margin:0 0 6px;font-size:17px">Do you want to delete <b>'+esc(t.merchant||"Purchase")+'</b> for <b class="num">'+money(+t.amount||0)+'</b> on '+esc(fmtLong(t.date))+'?</p>'+
    '<p class="note" style="margin:0 0 16px">This can\'t be undone.'+(synced?" It's already in your Finance Tracker, so remove that row from the sheet too.":"")+'</p>'+
    '<div class="btnrow"><button class="btn sec" id="dk">Cancel</button><button class="btn" style="background:var(--over)" id="dy">Delete</button></div>',
    s=>{s.querySelector("#dk").onclick=()=>{closeSheet();if(SW.openRow)swClose(SW.openRow)};
      s.querySelector("#dy").onclick=async()=>{const b=s.querySelector("#dy");b.disabled=true;
        if(!S.db||S.readOnly){toast("Saving isn't available here");b.disabled=false;return}
        Promise.resolve(S.db.doc("tx/"+id).delete()).catch(()=>toast("Couldn't delete. Try again."));SW.openRow=null;closeSheet();SND.play("swish");toast("Deleted")}});
}
const ISUBS=[["totals","Totals"],["cal","Calendar"],["pace","Pace"]].concat(window.top===window?[["map","Map"]]:[]);
function goMonth(ym,flashId,quiet){
  S.ym=ym;S.upcoming=false;S.q="";IS.calSel=null;S.tab="tx";S.flash=flashId||null;subscribeTx();render();window.scrollTo(0,0);
  if(!quiet)toast("Moved to "+MONTHS[+ym.slice(5)-1]);else setTimeout(()=>toast("Filed under "+MONTHS[+ym.slice(5)-1]),1900);
  if(flashId){let n=0;const seek=()=>{const r=document.querySelector('.txrow[data-tx="'+flashId+'"]');if(r){r.scrollIntoView({block:"center",behavior:"smooth"});setTimeout(()=>{if(S.flash===flashId)S.flash=null},2600);return}if(++n<30)setTimeout(seek,100)};setTimeout(seek,250)}
}
function renderNowBar(){
  const b=$("#nowBar");if(!b)return;const cur=ymOf(today());
  if(S.ym===cur){b.hidden=true;return}
  const fut=S.ym>cur;b.hidden=false;b.className="nowbar"+(fut?" fut":" past");
  b.innerHTML='<span><b>'+(fut?"Future month":"Past month")+'</b> · not '+MONTHS[+cur.slice(5)-1]+'</span><span class="nbk">Back to '+MONTHS[+cur.slice(5)-1]+' ›</span>';
}
function renderHeader(){
  renderDoodle();renderNowBar();
  const [y,m]=S.ym.split("-");$("#mName").textContent=MONTHS[+m-1];$("#mYear").textContent=y;
  document.querySelectorAll("#seg button").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.v===S.view)));
  $("#seg").hidden=COMBINED||S.tab!=="budget";
  const onTx=S.tab==="tx";
  $("header .hrow").hidden=false;$("#banner").hidden=false;$("#hsearch").hidden=!onTx;
  const hs=$("#hisub");hs.hidden=S.tab!=="insights";hs.style.setProperty("--nsub",ISUBS.length);
  if(!hs.hidden){const want=ISUBS.map(([k,l])=>'<button data-isub="'+k+'" aria-pressed="'+(IS.sub===k)+'">'+l+'</button>').join("");if(hs._want!==want){hs._want=want;hs.innerHTML=want}}
  if(onTx){const i=$("#txq");i.placeholder="Search "+MONTHS[+S.ym.slice(5)-1]+" transactions";if(document.activeElement!==i&&i.value!==(S.q||""))i.value=S.q||"";$("#txqClear").hidden=!(S.q||"").trim()}
  document.querySelectorAll("nav.tabs button").forEach(b=>{if(b.dataset.tab===S.tab)b.setAttribute("aria-current","page");else b.removeAttribute("aria-current")});moveTabInd();
}
function totals(groups,sm){let p=0,s=0,a=0;allItems(groups).forEach(({g,it})=>{p+=+it.planned||0;s+=sm[it.id]||0;if(g.aside)a+=Math.max(0,(+it.planned||0)-(sm[it.id]||0))});const known=new Set(allItems(groups).map(x=>x.it.id));S.tx.forEach(t=>{if(!known.has(t.itemId))s+=sAmt(t)});return{p:round2(p),s:round2(s),r:round2(p-s),a:round2(a)}}
/* The moment every dollar has a job: confetti from the banner, a little pop, a haptic. Only on the change, never on load. */
const ZB={};
function zeroParty(b){if(matchMedia("(prefers-reduced-motion:reduce)").matches)return;try{haptic()}catch(_){}
  b.animate([{transform:"scale(1)"},{transform:"scale(1.06)"},{transform:"scale(1)"}],{duration:520,easing:"cubic-bezier(.3,1.5,.5,1)"});
  const r=b.getBoundingClientRect(),cols=["#34a853","#1a73e8","#fbbc04","#ea4335","#a142f4"],box=document.createElement("div");box.className="zconf";document.body.appendChild(box);
  for(let i=0;i<36;i++){const c=document.createElement("i"),x=r.left+r.width*(.15+Math.random()*.7),dx=(Math.random()-.5)*220,up=60+Math.random()*90,fall=260+Math.random()*260,rot=(Math.random()-.5)*900;
    c.style.cssText="left:"+x+"px;top:"+(r.top+r.height/2)+"px;background:"+cols[i%5]+";width:"+(5+Math.random()*4)+"px;height:"+(8+Math.random()*6)+"px";box.appendChild(c);
    c.animate([{transform:"translate(0,0) rotate(0)",opacity:1},{transform:"translate("+dx*.6+"px,"+(-up)+"px) rotate("+rot*.4+"deg)",opacity:1,offset:.3},{transform:"translate("+dx+"px,"+fall+"px) rotate("+rot+"deg)",opacity:0}],{duration:1300+Math.random()*700,easing:"cubic-bezier(.2,.6,.4,1)",delay:Math.random()*120})}
  setTimeout(()=>box.remove(),2300)}
function renderBanner(groups,sm){
  if(PAD){const P=PAD;PAD=null;try{renderBanner(groupsFor(S.ym),sm)}finally{PAD=P}return}
  const b=$("#banner");
  if(S.dbState==="none"){b.className="banner over";b.innerHTML="<span>Sign in to save entries.</span>";return}
  if(!S.budgetsLoaded){b.className="banner";b.innerHTML="<span>Loading your budget…</span>";return}
  const t=totals(groups,sm);
  const inc=incomeFor(S.ym);
  if(inc.length){
    const left=round2(incomeTotal(inc)-t.p);
    b.className="banner"+(left<0?" over":"");
    const zb=ZB[S.ym];ZB[S.ym]=left;if(left===0&&zb!=null&&zb!==0)setTimeout(()=>zeroParty(b),60);
    if(left===0){b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg><span>It\'s a zero-based budget! 🎉</span>';return}
    b.innerHTML=left>0?'<span><b class="num" style="font-weight:700">'+money(left)+'</b> <span style="color:var(--fg);font-weight:500">left to budget</span></span>':'<span><b class="num" style="font-weight:700">'+money(-left)+'</b> <span style="color:var(--fg);font-weight:500">over your income</span></span>';return;
  }
  const over=t.r<0;
  b.className="banner"+(over?" over":"");
  const ic=over?'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v6M12 16.5v.5"/></svg>':'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M7.5 12.5l3 3 6-6.5"/></svg>';
  b.innerHTML=ic+'<span class="num">'+(over?money(-t.r)+" over budget":money(t.r)+" left of "+money(t.p))+"</span>";
}
/* One combined Budget view (Remaining + "spent of planned" caption). Set false to bring back the Planned/Spent/Remaining switch. */
const COMBINED=true;
function itemHTML(it,sm,solo){
  if(COMBINED)return itemComboHTML(it,sm,solo);
  const planned=+it.planned||0, spent=round2(sm[it.id]||0), rem=round2(planned-spent);
  const val=S.view==="planned"?planned:S.view==="spent"?spent:rem;
  const pct=planned>0?Math.min(100,spent/planned*100):(spent>0?100:0);
  const over=spent>planned&&spent>0;
  const green=S.view!=="remaining";
  let barHTML;
  const segs=green&&it.id===MISC_ID?(p=>miscSegs(p)):null;
  if(over){
    const okPct=spent>0?planned/spent*100:0, ovPct=100-okPct;
    barHTML=green
      ?'<div class="track fill">'+((segs&&segs(okPct))||'<i style="width:'+okPct.toFixed(1)+'%"></i>')+'<i class="ov" style="width:'+ovPct.toFixed(1)+'%"></i></div>'
      :'<div class="track"><i class="ov" style="width:'+ovPct.toFixed(1)+'%"></i></div>';
  }else{
    const bpct=green?pct:(planned>0?Math.max(0,rem)/planned*100:0);
    barHTML='<div class="track'+(green?" fill":"")+'">'+((segs&&segs(bpct))||'<i style="width:'+bpct.toFixed(1)+'%"></i>')+'</div>';
  }
  const vcls=(val<0||(green&&over))?" neg":(S.view==="planned"?" inc":"");
  if(S.view==="planned"){const ed=PAD&&PAD.kind==="item"&&PAD.id===it.id;
    return '<div class="item"><div class="irow"><button class="nm nmb" data-item="'+esc(it.id)+'">'+itemNmHTML(it)+'</button><button class="v num vbtn'+vcls+(ed?" editing":"")+'" data-plan="'+esc(it.id)+'" aria-label="Planned for '+esc(it.name)+', '+money(val)+'. Tap to change">'+money(val)+'</button></div><button class="tapbar" data-item="'+esc(it.id)+'" tabindex="-1" aria-hidden="true">'+barHTML+'</button></div>'}
  return '<button class="item" data-item="'+esc(it.id)+'"><div class="irow"><span class="nm">'+itemNmHTML(it)+'</span><span class="v num'+vcls+'">'+money(val)+'</span></div>'+barHTML+'</button>';
}
/* ---------- Category card with expandable subcategories (adapted from category-card.html renderCategoryCard) ---------- */
function catCardMiscHTML(it,sm,solo){
  const planned=+it.planned||0,spent=round2(sm[it.id]||0),left=round2(planned-spent),pct=left<0?(planned>0?Math.min(100,-left/planned*100):100):(planned>0?Math.max(0,left/planned*100):0);
  const {ks,by}=miscBreakdown(),subs=ks.filter(k=>by[k]>=.005).map(k=>({name:k,spent:by[k]})).sort((a,b)=>b.spent-a.spent),tot=subs.reduce((a,x)=>a+x.spent,0);
  const open=subs.length&&ls.get("pb.msubOpen")==="1",ed=PAD&&PAD.kind==="item"&&PAD.id===it.id,n=subs.length;
  const rows=subs.map((x,i)=>'<li class="pb-row" style="--i:'+i+'"><button data-item="'+MISC_ID+'" data-msub="'+esc(x.name)+'"><span class="pb-row-top"><span>'+esc(x.name)+'</span><span class="num">'+money(x.spent)+'</span></span><span class="pb-mini"><i style="--w:'+(tot>0?x.spent/tot*100:0).toFixed(1)+'%"></i></span></button></li>').join("");
  return '<div class="item citem pb-card'+(open?" is-open":"")+'" data-sc="'+esc(it.id)+'">'+
    '<button class="irow cirow" data-item="'+esc(it.id)+'"><span class="nm'+(solo?" solo":"")+'">'+(solo?(left<0?"Over":"Left"):esc(it.name))+'</span><span class="v num'+(left<0?" neg":"")+'">'+money(left)+'</span></button>'+
    '<div class="pb-bar'+(left<0?" over":"")+'"'+(n?' data-mtog="1"':'')+' aria-hidden="true"><span style="width:'+(left<0?Math.max(4,pct):pct).toFixed(1)+'%"></span></div>'+
    '<div class="pb-toggle"'+(n?' data-mtog="1" role="button" tabindex="0" aria-expanded="'+!!open+'" aria-label="Show '+n+' subcategories"':'')+'><span class="num">'+money(spent)+' of <button class="capb pb-budget num'+(ed?" editing":"")+'" data-plan="'+esc(it.id)+'" aria-label="Planned for '+esc(it.name)+', '+money(planned)+'. Tap to change">'+money(planned)+'</button></span>'+
      (n?'<span class="pb-toggle-label">'+n+'<span class="pb-word"> subcategor'+(n===1?'y':'ies')+'</span><svg class="pb-chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></span>':'')+'</div>'+
    '<div class="pb-panel"><div><ul class="pb-list">'+rows+'</ul></div></div></div>';
}
function itemComboHTML(it,sm,solo){
  if(it.id===MISC_ID)return catCardMiscHTML(it,sm,solo);
  const planned=+it.planned||0, spent=round2(sm[it.id]||0), rem=round2(planned-spent), over=rem<0;
  const pct=planned>0?Math.min(100,spent/planned*100):(spent>0?100:0);
  const segs=null;
  // bar shows what's LEFT (full = untouched); over budget shows red, sized by how far over
  const lp=planned>0?Math.max(0,Math.min(100,rem/planned*100)):0,op=over?(planned>0?Math.min(100,-rem/planned*100):100):0;
  const low=!over&&planned>0&&spent>0&&lp<=15;
  const bar=over?'<div class="track fill cb"><i class="ov" style="width:'+Math.max(4,op).toFixed(1)+'%;margin-left:0"></i></div>':'<div class="track fill cb"><i'+(low?' class="low"':'')+' style="width:'+lp.toFixed(1)+'%"></i></div>';
  const ed=PAD&&PAD.kind==="item"&&PAD.id===it.id;
  return '<div class="item citem"><button class="irow cirow" data-item="'+esc(it.id)+'"><span class="nm'+(solo?" solo":"")+'">'+(solo&&!it.ahead&&!it.from?(over?"Over":"Left"):itemNmHTML(it))+'</span><span class="v num'+(over?" neg":"")+'"><span data-roll="it:'+esc(it.id)+'" data-v="'+rem+'">'+money(rem)+'</span></span></button><button class="tapbar" data-item="'+esc(it.id)+'" tabindex="-1" aria-hidden="true">'+bar+'</button>'+
    '<div class="icap"><span class="num'+(over?" neg":"")+'">'+money(spent)+' spent</span><span>of</span><button class="capb num'+(ed?" editing":"")+'" data-plan="'+esc(it.id)+'" aria-label="Planned for '+esc(it.name)+', '+money(planned)+'. Tap to change">'+money(planned)+PENCIL+'</button></div></div>';
}
/* little Google-palette illustrations for empty screens */
const EMPTY_ART={
 receipt:'<svg class="eart" viewBox="0 0 64 64" aria-hidden="true"><path d="M17 8h30v48l-5-3.5-5 3.5-5-3.5-5 3.5-5-3.5-5 3.5z" fill="#fff" stroke="#dadce0" stroke-width="2" stroke-linejoin="round"/><path d="M23 19h18M23 26h12M23 33h15" stroke="#4285f4" stroke-width="3" stroke-linecap="round"/><path d="M23 43h8" stroke="#34a853" stroke-width="3" stroke-linecap="round"/><circle cx="48" cy="14" r="8" fill="#fbbc04"/><path d="M48 10v8M44 14h8" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>',
 cal:'<svg class="eart" viewBox="0 0 64 64" aria-hidden="true"><rect x="10" y="13" width="44" height="40" rx="7" fill="#fff" stroke="#dadce0" stroke-width="2"/><path d="M10 20a7 7 0 017-7h30a7 7 0 017 7v5H10z" fill="#ea4335"/><path d="M22 8v9M42 8v9" stroke="#5f6368" stroke-width="3" stroke-linecap="round"/><g fill="#e8eaed"><rect x="17" y="31" width="7" height="6" rx="1.5"/><rect x="28.5" y="31" width="7" height="6" rx="1.5"/><rect x="17" y="41" width="7" height="6" rx="1.5"/><rect x="28.5" y="41" width="7" height="6" rx="1.5"/></g><rect x="40" y="31" width="7" height="6" rx="1.5" fill="#34a853"/></svg>',
 piggy:'<svg class="eart" viewBox="0 0 64 64" aria-hidden="true"><ellipse cx="31" cy="36" rx="19" ry="15" fill="#f6aea9"/><circle cx="48" cy="34" r="6" fill="#f28b82"/><circle cx="47" cy="33" r="1.1" fill="#202124"/><circle cx="50" cy="33" r="1.1" fill="#202124"/><path d="M20 24l-2-7 8 4" fill="#f28b82"/><circle cx="38" cy="30" r="1.6" fill="#202124"/><path d="M22 49v5M38 49v5" stroke="#f28b82" stroke-width="5" stroke-linecap="round"/><rect x="26" y="20" width="10" height="3" rx="1.5" fill="#202124" opacity=".55"/><circle cx="31" cy="11" r="6" fill="#fbbc04"/><path d="M31 8v6" stroke="#e37400" stroke-width="2" stroke-linecap="round"/></svg>'};
const PENCIL='<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20h4L19 9l-4-4L4 16z"/></svg>';
function daysLeftAfterToday(ym){
  const [y,m]=ym.split("-").map(Number);const dim=new Date(y,m,0).getDate();
  const cur=ymOf(today());if(ym<cur)return null;if(ym>cur)return dim;
  return dim-new Date().getDate()+1;
}
function perDayHTML(rem){
  if(!COMBINED&&S.view!=="remaining")return "";
  const d=daysLeftAfterToday(S.ym);
  let val,sub;
  if(d===null){val="—";sub="Month is over"}
  else{val=money(round2(rem/d));sub=d===1?(COMBINED?"Last day":"Last day of the month"):d+(COMBINED?" days left":" days left incl. today")}
  return '<div class="pday"><small>'+(COMBINED?"Per day":"Leftover per Day")+'</small><b class="num"'+(rem<0?' style="color:var(--over)"':'')+'>'+val+'</b><span>'+sub+'</span></div>';
}
// Planned view: what's still coming this month — transactions dated after today, expenses minus refunds
function upcomingHTML(){
  if(!COMBINED&&S.view!=="planned")return "";
  const td=today(),fut=S.tx.filter(t=>t.type!=="income"&&!isHist(t)&&t.date>td);
  const net=round2(fut.reduce((a,t)=>a+sAmt(t),0));
  const sub=S.ym<ymOf(td)?"Month is over":fut.length?'<span class="go">'+fut.length+' scheduled'+CHEV+'</span>':"Nothing scheduled";
  return '<button class="pday" data-upcoming="1" aria-label="Upcoming '+money(net)+', show these transactions"><small>Upcoming</small><b class="num"'+(net>0?' style="color:var(--over)"':'')+'>'+money(net)+'</b><span>'+sub+'</span></button>';
}
const FIXED_GROUP=/housing|utilit|insurance|debt|bill|subscription/i;
const FIXED_ITEM=/mortgage|\brent\b|lease|insurance|loan|car payment|internet|phone|cell|electric|water|sewer|trash|hoa|subscription|tuition|daycare|consumers/i;
function isFixed(it,g){if(typeof it.fixed==="boolean")return it.fixed;return FIXED_GROUP.test(g.name)||FIXED_ITEM.test(it.name)}
// Today tile: spent so far today vs today's allowance (what was left this morning ÷ days left, incl. today)
// Top card: day + date, total remaining, leftover per day
function dateCardHTML(itot,t0){
  const aside=t0.a||0,rem=round2(itot-t0.s-aside),td=today(),cur=ymOf(td),[y,m]=S.ym.split("-").map(Number),dim=new Date(y,m,0).getDate(),d=daysLeftAfterToday(S.ym);
  const isCur=S.ym===cur,past=S.ym<cur,over=rem<0;
  const title=isCur?(n=>dfmt({weekday:"long"}).format(new Date(td+"T12:00:00"))+" the "+n+(n%100>=11&&n%100<=13?"th":["th","st","nd","rd"][n%10]||"th"))(+td.slice(8)):MONTHS[m-1]+" "+y;
  const side=isCur?"":past?"Month is over":"Starts "+MONTHS[m-1].slice(0,3)+" 1";
  const inc=incomeFor(S.ym),ed=PAD&&PAD.kind==="income"&&inc.length===1&&PAD.id===inc[0].id;
  const plan=inc.length===1?'<button class="eqpl num'+(ed?" editing":"")+'" data-iplan="'+esc(inc[0].id)+'" aria-label="Planned '+money(itot)+'. Tap to change">'+money(itot)+PENCIL+'</button>':inc.length?'<span class="eqpl num">'+money(itot)+'</span>':'<button class="eqpl" id="addIncome">Set amount'+PENCIL+'</button>';
  const days=isCur?d:dim,pdv=rem>0&&days?round2(rem/days):0,pd='<span data-roll="pd" data-v="'+pdv+'">'+money(pdv)+'</span>';
  const pct=over?100:(itot>0?Math.min(100,Math.max(0,rem/itot*100)):0); // bar = what's left, matching the item bars
  return '<section class="card eqcard"><div class="chead"><h2>'+title+'</h2>'+(side?'<span class="lbl">'+side+'</span>':'')+'</div>'+
    '<div class="eq-big num'+(over?" neg":"")+'"><span data-roll="rem" data-v="'+Math.abs(rem)+'">'+money(Math.abs(rem))+'</span></div>'+
    '<div class="eq-sub">'+(over?"over budget":past?"left over":"remaining of ")+plan+'</div>'+
    (past?'':'<div class="eq-meter'+(over?" over":"")+'"><i style="width:'+pct.toFixed(1)+'%"></i></div>'+
    '<div class="eq-details"><div class="eq-cell"><small>'+(isCur?(d===1?"Last day":"Days left"):"Days")+'</small><b class="num">'+days+'</b></div>'+
    '<div class="eq-cell"><small>Per day</small><b class="num ok">'+pd+'</b></div></div>')+'</section>';
}
function todayTileHTML(itot,t0){
  const td=today(),d=daysLeftAfterToday(S.ym);
  if(S.ym!==ymOf(td)||!d)return '<div class="pday"><small>Today</small><b class="num">—</b><span>'+(S.ym<ymOf(td)?"Month is over":"Not started")+'</span></div>';
  const st=round2(S.tx.filter(t=>t.date===td&&t.type!=="income").reduce((a,t)=>a+sAmt(t),0));
  const allow=round2(Math.max(0,(itot-(t0.a||0)-(t0.s-st))/d)),over=st>allow+.004,pc=allow>0?Math.max(0,Math.min(100,st/allow*100)):(st>0?100:0);
  return '<div class="pday ptoday"><small>Today</small><b class="num"'+(over?' style="color:var(--over)"':'')+'>'+money(st)+'</b><span class="num">of '+money(allow)+'</span><i class="ptb"><i style="width:'+pc.toFixed(1)+'%'+(over?';background:var(--over)':'')+'"></i></i></div>';
}
function avgDailyHTML(groups){
  if(!COMBINED&&S.view!=="spent")return "";
  const fixedIds=new Set();groups.forEach(g=>g.items.forEach(it=>{if(isFixed(it,g))fixedIds.add(it.id)}));
  const varSpent=round2(S.tx.filter(t=>t.type!=="income"&&!fixedIds.has(t.itemId)).reduce((a,t)=>a+sAmt(t),0));
  const [y,m]=S.ym.split("-").map(Number);const dim=new Date(y,m,0).getDate();const cur=ymOf(today());
  const days=S.ym<cur?dim:S.ym>cur?0:new Date().getDate();
  const val=days?money(round2(varSpent/days)):"—";
  return '<div class="pday"><small>'+(COMBINED?"Avg daily":"Avg Daily Spend")+'</small><b class="num">'+val+'</b><span>'+(COMBINED?"":"Variable only · ")+(days?days+" day"+(days===1?"":"s"):"not started")+'</span></div>';
}
// Misc subcategories listed under the Misc line: spent per tag this month, tap to open Misc filtered to it
// Fixed color per Misc subcategory so it reads the same every month
const SUB_COLORS={"Pokémon & Cards":"#fbbc04","Hobbies & Music":"#7986cb","Household & Shopping":"#4285f4","Thrift & Secondhand":"#8d6e63","Home Repair":"#fa7b17","Clothing":"#f538a0","Health & Personal Care":"#24c1e0","Gifts & Celebrations":"#a142f4","Travel":"#34a853","Parking & Rides":"#185abc","Entertainment & Events":"#e37400","Tech & Subscriptions":"#00897b","Auto":"#3c4043","Pets":"#c58af9","Fees & Taxes":"#607d8b","Other":"#9aa0a6","No subcategory":"#dadce0"};
const SUB_EXTRA=["#1e8e3e","#d01884","#129eaf","#b06000","#7627bb","#5e97f6","#e8710a","#9e9d24"];
function subColor(k){if(SUB_COLORS[k])return SUB_COLORS[k];let h=0;for(const c of String(k))h=(h*31+c.charCodeAt(0))>>>0;return SUB_EXTRA[h%SUB_EXTRA.length]}
function miscBreakdown(){
  const NOSUB="No subcategory",by={};
  S.tx.forEach(t=>{if(!isMisc(t)||t.type==="income")return;const k=t.sub||NOSUB;by[k]=round2((by[k]||0)+sAmt(t))});
  const ks=Object.keys(by).sort((a,b)=>(a===NOSUB)-(b===NOSUB)||by[b]-by[a]);
  return {ks,by};
}
// The filled part of the Misc bar, split into one colored segment per subcategory
function miscSegs(fillPct){
  const {ks,by}=miscBreakdown();const pos=ks.filter(k=>by[k]>0);const tot=pos.reduce((a,k)=>a+by[k],0);
  if(!tot||fillPct<=0)return null;
  return pos.map(k=>'<i class="sg" style="width:'+(fillPct*by[k]/tot).toFixed(2)+'%;background:'+subColor(k)+'" title="'+esc(k)+'"></i>').join("");
}
function miscSubsHTML(){
  const {ks,by}=miscBreakdown();
  const pos=ks.filter(k=>by[k]>=.005);if(!pos.length)return "";
  const tot=pos.reduce((a,k)=>a+by[k],0)||1,mx=Math.max(...pos.map(k=>by[k]))||1,top=pos[0],open=ls.get("pb.msubOpen")==="1",pc=Math.round(by[top]/tot*100);
  const PER=3,RH=44,gs=[];for(let i=0;i<pos.length;i+=PER)gs.push(pos.slice(i,i+PER));
  let inner="";for(let i=gs.length-1;i>=0;i--){const h=gs[i].length*RH;
    inner='<div class="mfp'+(i===gs.length-1?" last":"")+'" data-h="'+h+'"><div class="mff">'+gs[i].map(k=>'<button class="mfr" data-item="'+MISC_ID+'" data-msub="'+esc(k)+'"><span class="mfn">'+esc(k)+'<i style="width:'+Math.max(3,by[k]/mx*100).toFixed(1)+'%"></i></span><span class="num">'+money(by[k])+'</span></button>').join("")+'<span class="mfsh"></span></div>'+inner+'</div>'}
  const total=gs.reduce((a,g)=>a+g.length*RH,0);
  return '<div class="mfold'+(open?' op':'')+'"><button class="mfh" id="msTog" aria-expanded="'+open+'"><span class="mft">Subcategories</span><span class="mfs2">· mostly '+esc(top)+', '+pc+'%</span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="mfst" style="height:'+(open?total:0)+'px'+(open?'':';visibility:hidden')+'">'+inner+'</div></div>';
}
// paper fold: panels hinged to each other; each has its own angle so the fold ripples down (or up) like a wave
function msToggle(btn){
  const w=btn.parentNode,st=w.querySelector(".mfst"),pns=[...st.querySelectorAll(".mfp")];if(!pns.length)return;
  const open=!w.classList.contains("op");w.classList.toggle("op",open);btn.setAttribute("aria-expanded",String(open));ls.set("pb.msubOpen",open?"1":"0");try{haptic()}catch(_){}
  const MAXA=88,n=pns.length,reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
  const A=w._ang||pns.map(()=>open?MAXA:0),V=w._vel||pns.map(()=>0);w._ang=A;w._vel=V;
  const tgt=open?0:MAXA,t0=performance.now(),delay=i=>(open?i:(n-1-i))*95;
  const paint=()=>{let h=0;pns.forEach((pn,i)=>{const abs=(i%2?1:-1)*A[i],prev=i?(((i-1)%2?1:-1)*A[i-1]):0,rel=abs-prev;pn.style.transform="rotateX("+rel.toFixed(2)+"deg)";
      const r=A[i]*Math.PI/180,sn=Math.sin(r);pn.querySelector(".mfsh").style.background=i%2?"linear-gradient(rgba(0,0,0,"+(.34*sn).toFixed(3)+"),rgba(0,0,0,"+(.12*sn).toFixed(3)+"))":"linear-gradient(rgba(0,0,0,"+(.04*sn).toFixed(3)+"),rgba(0,0,0,"+(.16*sn).toFixed(3)+"))";
      h+=(+pn.dataset.h)*Math.cos(r)});st.style.height=Math.max(0,h).toFixed(1)+"px";const shut=A.every(a=>a>MAXA-.5);st.style.visibility=shut?"hidden":"visible";w.classList.toggle("shut",shut)};
  if(reduce){A.fill(tgt);paint();return}
  cancelAnimationFrame(w._raf);
  const step=now=>{let moving=false;pns.forEach((_,i)=>{if(now-t0<delay(i)){moving=true;return}V[i]+=(tgt-A[i])*.085;V[i]*=.8;A[i]+=V[i];if(A[i]<0){A[i]=0;V[i]*=-.3}if(A[i]>MAXA){A[i]=MAXA;V[i]=0}
      if(Math.abs(tgt-A[i])>.05||Math.abs(V[i])>.05)moving=true;else{A[i]=tgt;V[i]=0}});paint();if(moving&&w.isConnected)w._raf=requestAnimationFrame(step)};
  if(open){st.style.visibility="visible"}w._raf=requestAnimationFrame(step);
}

/* ---------- Plan next month: banner from the 25th, review sheet with 3-month averages ---------- */
function nextYmOf(ym){const [y,m]=ym.split("-").map(Number),d=new Date(y,m,1);return d.getFullYear()+"-"+pad(d.getMonth()+1)}
function planBannerHTML(){const td=today();if(S.ym!==ymOf(td)||+td.slice(8)<25||!S.db||S.readOnly||!S.budgetsLoaded)return "";const nx=nextYmOf(S.ym);if(S.budgets[nx])return "";
  return '<button class="card pnban" data-plannext="1"><span class="pnic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15" rx="2.5"/><path d="M3.5 10h17M8 3v4M16 3v4M12 13v5M9.5 15.5h5"/></svg></span><span class="pnt"><b>Plan '+MONTHS[+nx.slice(5)-1]+'</b><small>2 minutes · suggestions from your last 3 months</small></span>'+CHEV+'</button>';}
function txForMonth(ym){
  if(ym===S.ym)return Promise.resolve(S.tx);if(IS.fresh[ym]||(IS.hist[ym]&&!S.db))return Promise.resolve(IS.hist[ym]||[]);
  if(!S.db)return Promise.resolve([]);return fetchMonth(ym);
}
async function planNextSheet(){
  const cur=S.ym,nx=nextYmOf(cur),[y,m]=cur.split("-").map(Number),mons=[2,1,0].map(k=>{const d=new Date(y,m-1-k,1);return d.getFullYear()+"-"+pad(d.getMonth()+1)});
  openSheet('<h3>Plan '+MONTHS[+nx.slice(5)-1]+'</h3><p class="note">Looking at your last 3 months…</p>');
  const txs=await Promise.all(mons.map(txForMonth));
  const groups=JSON.parse(JSON.stringify(groupsFor(nx))),inc=JSON.parse(JSON.stringify(incomeFor(cur)));
  /* bills set aside this month arrive next month already paid for: count them as starting money */
  const fwT=round2(asideFor(nx).reduce((a,z)=>a+(+z.it.planned||0),0));
  if(inc[0]){const pt=inc[0].parts||{};inc[0].planned=round2((+inc[0].planned||0)-(+pt.fwm||0)-(+pt.fwd||0)+fwT);if(inc[0].parts)inc[0].parts=Object.assign({},pt,{fwd:fwT,fwm:0})}
  const INC=incomeTotal(inc);
  const spentBy=(list,id)=>round2(list.filter(t=>t.itemId===id&&t.type!=="income").reduce((a,t)=>a+sAmt(t),0));
  const rows=[];groups.forEach(g=>g.items.forEach(it=>{
    const sp=txs.map(l=>spentBy(l,it.id)),pl=mons.map(ym=>{const f=findItem(groupsFor(ym),it.id);return f?(+f.it.planned||0):0});
    const used=sp.filter((v,i)=>v>0||pl[i]>0),avg=Math.round(used.length?used.reduce((a,v)=>a+v,0)/used.length:0),keep=+it.planned||0,fixed=isFixed(it,g);
    const over=pl.every((p,i)=>p>0&&sp[i]>p+.5);
    const curList=txs[2].filter(t=>t.itemId===it.id&&t.type!=="income"),big=curList.reduce((b,t)=>(+t.amount||0)>(b?+b.amount:0)?t:b,null);
    const prevAvg=(sp[0]+sp[1])/2,spike=big&&+big.amount>200&&sp[2]>2*Math.max(prevAvg,1)&&+big.amount>sp[2]*.4;
    let note=fixed?"Fixed: same every month":spike?MONTHS[m-1]+" had a one-time "+money(+big.amount).replace(/\.00$/,"")+(big.merchant?" ("+big.merchant+")":""):over?"Over plan 3 months in a row":"";
    if(g.aside)note="Set aside for "+nextMonthName(nx);
    rows.push({id:it.id,name:it.name,keep,avg,over,fixed,note,half:over?Math.round(keep+(avg-keep)/2):null,v:keep})}));
  const sav=rows.find(r=>/saving/i.test(r.name));
  const chip=(r,label,val)=>'<button class="pnc'+(Math.round(r.v)===Math.round(val)?" on":"")+'" data-pk="'+esc(r.id)+'" data-pv="'+val+'">'+label+' '+money(val).replace(/\.00$/,"")+'</button>';
  const body=rows.map(r=>'<div class="pnr" data-row="'+esc(r.id)+'"><div class="pnrt"><span>'+esc(r.name)+(r.over?'<span class="pnf">always over</span>':'')+'</span><input class="pnv num" inputmode="decimal" data-pid="'+esc(r.id)+'" value="'+Math.round(r.v)+'" aria-label="'+esc(r.name)+' for '+MONTHS[+nx.slice(5)-1]+'"></div>'+(r.note?'<div class="pnn">'+esc(r.note)+'</div>':'')+
    (!r.fixed&&Math.abs(r.avg-r.keep)>=1?'<div class="pnch">'+chip(r,"Keep",r.keep)+chip(r,"3-mo avg",r.avg)+(r.half!=null&&Math.abs(r.half-r.keep)>=1&&Math.abs(r.half-r.avg)>=1?chip(r,"Meet halfway",r.half):"")+'</div>':'')+'</div>').join("");
  openSheet('<h3>Plan '+MONTHS[+nx.slice(5)-1]+'</h3><p class="note" style="margin:-6px 0 6px">Starting from '+MONTHS[m-1]+'. Change only what you want.</p>'+
    '<div class="pntot"><div class="pntr"><span>Planned <b class="num">'+money(INC)+'</b></span><span id="pnLeft"></span></div><div class="pnbar"><i id="pnBar"></i></div></div>'+body+
    '<button class="btn" id="pnGo" style="width:100%;margin-top:14px">Start '+MONTHS[+nx.slice(5)-1]+'</button><p class="note" style="text-align:center;margin:8px 0 0">You can still edit anything afterward.</p>',
  sh=>{const val=id=>{const r=rows.find(x=>x.id===id);return r};
    const recalc=()=>{const sum=round2(rows.reduce((a,r)=>a+(+r.v||0),0)),d=round2(INC-sum),b=sh.querySelector("#pnBar");b.style.width=Math.min(100,INC>0?sum/INC*100:0)+"%";b.style.background=d<-.004?"var(--over)":"var(--prog)";
      sh.querySelector("#pnLeft").innerHTML=Math.abs(d)<.005?'<b style="color:var(--ok)">Zero-based ✓</b>':d>0?'<b class="num" style="color:var(--link)">'+money(d)+'</b> left to plan':'<b class="num" style="color:var(--over)">'+money(-d)+'</b> over';
      sh.querySelector("#pnGo").textContent="Start "+MONTHS[+nx.slice(5)-1]+(d>.004&&sav?" · put "+money(d)+" in "+sav.name:"");return d};
    sh.addEventListener("click",e=>{const c=e.target.closest("[data-pk]");if(!c)return;const r=val(c.dataset.pk);r.v=+c.dataset.pv;const row=sh.querySelector('[data-row="'+CSS.escape(r.id)+'"]');
      row.querySelector(".pnv").value=Math.round(r.v);row.querySelectorAll(".pnc").forEach(x=>x.classList.toggle("on",x===c));try{haptic()}catch(_){}recalc()});
    sh.addEventListener("input",e=>{const i=e.target.closest(".pnv");if(!i)return;const r=val(i.dataset.pid),v=parseFloat(i.value.replace(/[^0-9.]/g,""));r.v=isNaN(v)?0:v;
      i.closest(".pnr").querySelectorAll(".pnc").forEach(x=>x.classList.toggle("on",Math.round(+x.dataset.pv)===Math.round(r.v)));recalc()});
    recalc();
    sh.querySelector("#pnGo").onclick=async e=>{const b=e.currentTarget;let d=recalc();if(d>.004&&sav)sav.v=round2(sav.v+d);
      const gs=JSON.parse(JSON.stringify(groups));gs.forEach(g=>g.items.forEach(it=>{const r=rows.find(x=>x.id===it.id);if(r)it.planned=round2(+r.v||0)}));
      b.disabled=true;b.textContent="Saving…";
      try{await S.db.doc("budgets/"+nx).set({groups:gs,income:inc,updatedAt:new Date().toISOString()});S.budgets[nx]={groups:gs,income:inc};closeSheet();try{haptic()}catch(_){}
        toast(MONTHS[+nx.slice(5)-1]+" is set");S.ym=nx;S.upcoming=false;subscribeTx();render();window.scrollTo(0,0)}
      catch(x){b.disabled=false;b.textContent="Start "+MONTHS[+nx.slice(5)-1];toast("Couldn't save. Check your connection.")}};
  });
}
/* Greeting line at the top of Budget (this month only): "Good morning, Martin · $43 for today" */
function myName(){const n=(localStorage.getItem("pb.name")||"").trim();if(n)return n;try{const u=window.firebase&&firebase.auth&&firebase.auth().currentUser;return u&&u.displayName?u.displayName.split(" ")[0]:""}catch(_){return""}}
function greetHTML(itot,t0){if(S.ym!==ymOf(today())||!itot)return"";const hr=new Date().getHours(),nm=myName();
  const hi=hr<4?"Up late":hr<12?"Good morning":hr<17?"Good afternoon":hr<22?"Good evening":"Up late";
  const rem=round2(itot-t0.s-(t0.a||0)),d=daysLeftAfterToday(S.ym),pd=rem>0&&d?round2(rem/d):0;
  const tail=rem<0?'<span class="neg">'+money(-rem)+'</span> over this month':pd>0?'<b>'+money(pd)+'</b> for today':'Nothing left to spend this month';
  return '<p class="greet">'+hi+(nm?", "+esc(nm):"")+' · <span class="num">'+tail+'</span></p>'}
function renderBudget(groups,sm){
  if(!S.budgetsLoaded&&S.dbState!=="none")return '<div class="empty">Loading…</div>';
  let h=historyCardHTML()+planBannerHTML();
  const inc=incomeFor(S.ym), itot=incomeTotal(inc), t0=totals(groups,sm), rm=receivedMap();
  h+=greetHTML(itot,t0);
  const v=COMBINED?"remaining":S.view;
  const sumLabel=v==="planned"?"Planned Income":v==="spent"?"Spent So Far":"Remaining to Spend";
  const sumVal=v==="planned"?itot:v==="spent"?t0.s:round2(itot-t0.s-(t0.a||0));
  const frac=itot>0?Math.max(0,Math.min(1,(v==="planned"?t0.p:v==="spent"?t0.s:itot-t0.s)/itot)):0;
  const arcCol=v==="spent"?"var(--ok)":v==="remaining"?"var(--bar)":(round2(itot-t0.p)===0&&inc.length?"var(--ok)":"var(--bar)");
  const C=2*Math.PI*26;
  if(COMBINED)h+=dateCardHTML(itot,t0);else{h+='<section class="card pinc"><div class="ring"><svg class="arc" viewBox="0 0 62 62"><circle cx="31" cy="31" r="26" fill="none" stroke="var(--line)" stroke-width="7"/>'+(frac>0?'<circle cx="31" cy="31" r="26" fill="none" stroke="'+arcCol+'" stroke-width="7" stroke-linecap="round" stroke-dasharray="'+(C*frac).toFixed(1)+' '+C.toFixed(1)+'"/>':'')+'</svg><svg class="ic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3" y="6" width="18" height="12" rx="2"/><circle cx="12" cy="12" r="2.5"/><path d="M6.5 9.5h.01M17.5 14.5h.01"/></svg></div><div><small>'+sumLabel+'</small><b class="num'+(sumVal<0?" neg":"")+'"'+(sumVal<0?' style="color:var(--over)"':'')+'>'+money(sumVal)+'</b>'+(COMBINED?'<span class="pcap num">'+money(t0.s)+' spent of '+money(itot)+'</span>':'')+'</div>'+(COMBINED?'</section><section class="card ptiles">':'')+perDayHTML(sumVal)+avgDailyHTML(groups)+(COMBINED?todayTileHTML(itot,t0):upcomingHTML())+'</section>';}
  if(!COMBINED||inc.length>1){h+='<section class="card"><div class="chead"><h2>Income</h2><span class="lbl">'+(COMBINED?(inc.length>1?money(itot):""):v==="planned"?"Planned":v==="spent"?"Received":"Remaining")+'</span></div>';
  if(!inc.length)h+='<p class="note" style="margin:6px 0 0">Add your paychecks so you can see how much is left to budget.</p>';
  inc.forEach(x=>{const pl=+x.planned||0, rc=round2(rm[x.id]||0), left=round2(pl-rc);
    if(COMBINED){const ed=PAD&&PAD.kind==="income"&&PAD.id===x.id;
      h+='<div class="item iplain"><div class="irow"><button class="nm nmb" data-income="'+esc(x.id)+'">'+esc(x.name)+'</button><button class="v num vbtn'+(ed?" editing":"")+'" data-iplan="'+esc(x.id)+'" aria-label="'+esc(x.name)+', '+money(pl)+'. Tap to change">'+money(pl)+PENCIL+'</button></div></div>';return}
    const val=v==="planned"?pl:v==="spent"?rc:left;
    const pct=pl>0?Math.max(0,Math.min(100,(v==="remaining"?left:rc)/pl*100)):0;
    const bar=v==="planned"?'':'<i style="width:'+pct.toFixed(1)+'%"></i>';
    if(v==="planned"){const ed=PAD&&PAD.kind==="income"&&PAD.id===x.id;h+='<div class="item"><div class="irow"><button class="nm nmb" data-income="'+esc(x.id)+'">'+esc(x.name)+'</button><button class="v num vbtn inc'+(ed?" editing":"")+'" data-iplan="'+esc(x.id)+'" aria-label="Planned for '+esc(x.name)+', '+money(val)+'. Tap to change">'+money(val)+'</button></div><div class="track" style="justify-content:flex-start"></div></div>';return}
    h+='<button class="item" data-income="'+esc(x.id)+'"><div class="irow"><span class="nm">'+esc(x.name)+'</span><span class="v num'+(v==="planned"?" inc":"")+'">'+money(val)+'</span></div><div class="track" style="justify-content:flex-start">'+bar+'</div></button>'});
  h+='<button class="addlink" id="addIncome">Add Income</button></section>';}
  if(!groups.length)h+='<div class="card empty"><h3>No categories yet</h3>Add a group like Food, then items like Groceries and Restaurants.</div>';
  /* Groups fold to one summary line (Miller's law: chunk the long list); tap to open. Open groups are remembered. */
  let gopen={};try{gopen=JSON.parse(ls.get("pb.gopen")||"{}")||{}}catch(_){}
  groups.forEach(g=>{
    const editing=PAD&&PAD.kind==="item"&&g.items.some(it=>it.id===PAD.id),open=!!gopen[g.id]||editing;
    const gp=round2(g.items.reduce((a,it)=>a+(+it.planned||0),0)),gs=round2(g.items.reduce((a,it)=>a+(sm[it.id]||0),0)),gl=round2(gp-gs),gov=gl<0;
    const glp=gov?Math.min(100,gp>0?-gl/gp*100:100):(gp>0?Math.max(0,gl/gp*100):0),glow=!gov&&gp>0&&gs>0&&glp<=15;
    const gsum=g.aside?money(gp):(gov?money(-gl)+' over':money(gl)+' left');
    h+='<section class="card gcard'+(open?' open':'')+(g.aside?' ascard':'')+'"><div class="chead"><button class="gtog" data-gtog="'+esc(g.id)+'" aria-expanded="'+open+'"><h2>'+esc(groupLbl(g))+'</h2><span class="gsum num'+(gov?' neg':'')+'">'+gsum+'</span><svg class="gchev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg></button><button class="dots" data-gmenu="'+esc(g.id)+'" aria-label="Options for '+esc(groupLbl(g))+'"><svg width="26" height="8" viewBox="0 0 26 8" fill="currentColor"><circle cx="4" cy="4" r="3"/><circle cx="13" cy="4" r="3"/><circle cx="22" cy="4" r="3"/></svg></button></div>';
    if(!open){h+='<button class="gmini" data-gtog="'+esc(g.id)+'" tabindex="-1" aria-hidden="true">'+(g.aside?'':'<div class="track fill cb"><i class="'+(gov?'ov':glow?'low':'')+'" style="width:'+(gov?Math.max(4,glp):glp).toFixed(1)+'%;margin-left:0"></i></div>')+'<span class="num">'+(g.aside?'Setting aside for '+esc(nextMonthName()):money(gs)+' spent of '+money(gp))+' · '+g.items.length+' item'+(g.items.length===1?'':'s')+'</span></button></section>';return}
    const solo=g.items.length===1&&g.items[0].name.trim().toLowerCase()===g.name.trim().toLowerCase();
    if(g.aside)h+='<p class="ashint">Saved from '+MONTHS[+S.ym.slice(5)-1]+'\'s money, paid in '+nextMonthName()+'. Not counted as spending. It carries into '+nextMonthName()+' as starting money.</p>';
    g.items.forEach(it=>{h+=itemHTML(it,sm,solo)});
    h+='<button class="addlink quiet" data-additem="'+esc(g.id)+'">Add item</button></section>';
  });
  const known=new Set(allItems(groups).map(x=>x.it.id));
  const orphan=round2(S.tx.filter(t=>!known.has(t.itemId)).reduce((a,t)=>a+sAmt(t),0));
  if(orphan)h+='<section class="card"><div class="chead"><h2>Uncategorized</h2></div><button class="item" data-tab-go="tx"><div class="irow"><span class="nm">Needs a category</span><span class="v num">'+money(orphan)+'</span></div></button></section>';
  h+='<button class="ghost" id="addGroup">+ Add Group</button>';
  if(!groups.some(g=>g.aside))h+='<button class="ghost" id="addAside">+ Set aside for '+esc(nextMonthName())+'</button>';
  return h;
}
function txLabel(t,groups){if(t.type==="income"){const x=incomeFor(S.ym).find(i=>i.id===t.itemId);return"Income · "+(x?x.name:(t.itemName||"Income"))}const f=findItem(groups,t.itemId);const nm=f?itemLbl(f.it):(t.itemName?t.itemName+" (removed)":"Uncategorized");return isMisc(t)&&t.sub?nm+" · "+t.sub:nm}
const FD={td:"",m:{}};
function fmtDay(d){const td=today();if(FD.td!==td){FD.td=td;FD.m={}}const c=FD.m[d];if(c!==undefined)return c;let r;const dt=new Date(d+"T12:00:00");if(d===td)r="Today";else{const y=new Date();y.setDate(y.getDate()-1);r=d===y.getFullYear()+"-"+pad(y.getMonth()+1)+"-"+pad(y.getDate())?"Yesterday":dfmt({weekday:"short",month:"short",day:"numeric"}).format(dt)}return FD.m[d]=r}
function sortedTx(){return S.tx.slice().sort((a,b)=>a.date<b.date?1:a.date>b.date?-1:(b.createdAt||"").localeCompare(a.createdAt||""))}
function renderTx(groups){
  if(!S.txLoaded&&S.dbState!=="none")return '<div class="empty">Loading…</div>';
  const all=sortedTx();
  const pending=all.filter(t=>t.sheet!=="synced");
  const q=(S.q||"").trim().toLowerCase();
  let list=q?all.filter(t=>{const hay=[t.merchant,txLabel(t,groups),t.note,t.groupName,(+t.amount||0).toFixed(2),fmtDay(t.date)].join(" ").toLowerCase();return q.split(/\s+/).every(w=>hay.includes(w.replace(/^\$/,"")))}):all;
  let h=historyCardHTML();
  if(S.upcoming){const td=today();list=list.filter(t=>t.date>td&&t.type!=="income"&&!isHist(t)).reverse();
    h+='<div class="fchip"><span>Upcoming after today · <b class="num">'+money(round2(list.reduce((a,t)=>a+sAmt(t),0)))+'</b></span><button id="clrUp">Show all</button></div>';
    if(!list.length)return h+'<div class="card empty">'+EMPTY_ART.cal+'<h3>Nothing scheduled</h3>No transactions are dated after today this month.</div>'}
  if(q)h+='<p class="note" style="margin:-6px 4px 0">'+list.length+' match'+(list.length===1?"":"es")+' · '+money(round2(list.reduce((a,t)=>a+sAmt(t),0)))+' spent</p>';
  h+='<div class="qlinks"><a href="'+SHEET_URL+'" target="_blank" rel="noopener"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="4" y="3.5" width="16" height="17" rx="2.5"/><path d="M4 9h16M4 14.5h16M10 9v11.5"/></svg>Finance Tracker</a><a href="venmo://" id="openVenmo" aria-label="Open Venmo"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 8h13l-3-3M20 16H7l3 3"/></svg>Venmo</a></div>';
  const stuck=pending.length&&(AS.fail||AS.auto===false);
  if(stuck)h+='<div class="card" style="padding:14px 18px"><div class="irow" style="font-size:16px"><span class="nm"><b>'+(AS.fail?'Couldn\'t send '+pending.length+' to your sheet':pending.length+' not in your sheet yet')+'</b></span><button class="addlink" style="padding:0" id="syncAll">'+(AS.fail?'Try again':'Send to sheet')+'</button></div><p class="note" style="margin:6px 0 0">'+esc(AS.fail||(pending.find(t=>t.sheetMsg)||{}).sheetMsg||"")+'</p></div>';
  if(q&&!list.length)return h+'<div class="card empty"><h3>No matches</h3>Try a merchant, category, note or amount.</div>';
  if(!list.length)return h+'<div class="card empty">'+EMPTY_ART.receipt+'<h3>No transactions this month</h3>Tap + to log a purchase. It takes about five seconds.</div>';
  const td0=today();
  /* a future month is all "upcoming", so its transactions are listed by day right away instead of inside the collapsible Upcoming bar */
  const fut=(!q&&!S.upcoming&&S.ym<=ymOf(td0))?list.filter(t=>t.date>td0):[];
  if(fut.length){
    const rest=list.filter(t=>t.date<=td0);
    const hid=ls.get("pb.futHide")==="1";
    const fsum=round2(fut.reduce((a,t)=>a+sAmt(t),0));
    h+='<div class="futw'+(hid?' shut':'')+'"><button class="futh" id="futTog" aria-expanded="'+(!hid)+'"><span>Upcoming · '+fut.length+' · <span class="num">'+money(fsum)+'</span></span><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg></button><div class="futb"><div class="futi"><div class="futc">'+txDays(fut,groups)+'</div></div></div></div>';
    return h+txDays(rest,groups);
  }
  return h+txDays(list,groups);
}
function txDays(list,groups){
  let h="",day=null,open=false;
  list.forEach(t=>{
    if(t.date!==day){if(open)h+="</section>";day=t.date;const dsum=round2(list.filter(x=>x.date===day).reduce((a,x)=>a+sAmt(x),0));h+='<div class="daylabel num">'+esc(fmtDay(day))+' · '+money(dsum)+'</div><section class="card" style="padding-block:4px">';open=true}
    const ref=t.type==="refund"||t.type==="income";
    const sw=!isHist(t);
    if(sw)h+='<div class="swr"><button class="swdel" data-del="'+esc(t.id)+'" tabindex="-1" aria-label="Delete '+esc(t.merchant||"Purchase")+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M10 11v6M14 11v6M6 7l1 12a2 2 0 002 2h6a2 2 0 002-2l1-12M9 7V4h6v3"/></svg>Delete</button>';
    h+='<button class="txrow'+(S.flash===t.id?' flash':'')+'" data-tx="'+esc(t.id)+'"><div class="l"><div class="m">'+esc(t.merchant||"Purchase")+'</div><div class="c">'+esc(txLabel(t,groups))+(t.person?" · "+(t.type==="refund"||t.type==="income"?"from ":"to ")+esc(t.person):"")+(t.note?" · "+esc(t.note):"")+(t.loc&&locShort(t.loc)?'<span class="tloc"> · '+PIN_SVG+esc(locShort(t.loc))+'</span>':'')+(t.sheet!=="synced"?' · <span class="nsync">not synced</span>':'')+'</div></div><div class="a num"'+(ref?' style="color:var(--ok)"':'')+'>'+(ref?"+":"")+money(+t.amount||0)+'</div></button>'+(sw?'</div>':'');
  });
  if(open)h+="</section>";
  return h;
}
