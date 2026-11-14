/* ---------- Totals: this month vs your average month, compared at the same day ---------- */
function avgViewHTML(months,pending){
  const ym=S.ym,[y,m]=ym.split("-").map(Number),dim=new Date(y,m,0).getDate(),td=today(),cur=ym===ymOf(td);
  const dayNow=cur?+td.slice(8,10):ym<ymOf(td)?dim:0,full=dayNow>=dim,mname=MONTHS[m-1].slice(0,3);
  const R=IS.avr,rsel='<label class="isel avrange"><select id="i-avr" aria-label="Average over">'+AVR.map(([v,l])=>'<option value="'+v+'"'+(+v===R?" selected":"")+'>'+l+'</option>').join("")+'</select><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M6 9l6 6 6-6"/></svg></label>';
  let h='<div class="chead avhead"><h2>'+(IS.group?esc(IS.group)+" vs avg":"Vs your average")+'</h2>'+rsel+'</div>';
  // the mortgage dwarfs everything else on a dollar axis, so it's left out unless you turn it back on
  const hideM=ls.get("pb.avmort")!=="show",isM=(t,mo)=>/mortgage/i.test(itemNameOf(t,mo)||"")||/mortgage/i.test(t.merchant||"");
  let hadM=false;
  const keyOf=t=>{const mo=ymOf(t.date||ym+"-01"),g=groupNameOf(t,mo);if(IS.group&&g!==IS.group)return null;if(isM(t,mo)){hadM=true;if(hideM)return null}return IS.group?itemNameOf(t,mo):g};
  const sumOf=(mo,cut)=>{const o={};txOf(mo).forEach(t=>{if(t.type==="income")return;const d=+String(t.date||"").slice(8,10)||1;if(cut&&d>cut)return;const k=keyOf(t);if(k==null)return;o[k]=(o[k]||0)+sAmt(t)});return o};
  const tot=o=>Object.values(o).reduce((a,b)=>a+Math.max(0,b),0);
  const past=months.filter(mo=>mo<ym&&txOf(mo).some(t=>t.type!=="income"));
  if(!dayNow)return h+'<p class="note" style="text-align:center;margin:18px 0">This month hasn\'t started yet.</p>';
  if(!past.length)return h+'<p class="note" style="text-align:center;margin:18px 0">'+(pending?"":"No earlier months logged to compare with yet.")+'</p>'+(pending?SKEL_BARS:'');
  const now=sumOf(ym,full?0:dayNow),soFar={},whole={};
  past.forEach(mo=>{const [py,pm]=mo.split("-").map(Number),pdim=new Date(py,pm,0).getDate();
    const a=sumOf(mo,full?0:Math.min(dayNow,pdim)),b=sumOf(mo,0);
    Object.keys(a).forEach(k=>soFar[k]=(soFar[k]||0)+a[k]/past.length);Object.keys(b).forEach(k=>whole[k]=(whole[k]||0)+b[k]/past.length)});
  const keys=Array.from(new Set(Object.keys(now).concat(Object.keys(whole)))).filter(k=>(now[k]||0)>.5||(whole[k]||0)>.5);
  keys.sort((a,b)=>(whole[b]||0)-(whole[a]||0)||(now[b]||0)-(now[a]||0));
  const cm=colorMap(keys);
  const N=round2(tot(now)),A=round2(tot(soFar)),W=round2(tot(whole)),D=round2(N-A),pct=A>0?Math.round(D/A*100):0;
  const band=Math.max(15,A*0.05),st=D>band?"over":D<-band?"under":"even",f0=v=>money(v).replace(/\.\d\d$/,"");
  if(pending)h+=SKEL;
  if(hadM)h+='<button class="avmort" data-avmort aria-pressed="'+!hideM+'">'+(hideM?'Mortgage hidden · <u>Show</u>':'Mortgage shown · <u>Hide</u>')+'</button>';
  h+='<div class="avsum"><span class="avpill '+st+'">'+(st==="even"?"Right about average":(st==="under"?"↓ ":"↑ ")+f0(Math.abs(D))+(st==="under"?" under":" over")+" usual"+(A>0?" ("+Math.abs(pct)+"%)":""))+'</span>'+
    '<span class="note">'+(full?"for the whole month":"by "+mname+" "+dayNow)+'</span></div>';
  // one bar per category on a dollar scale: the outlined tank is that category's usual whole month,
  // the fill is spent so far, anything past the tank is striped
  const n=keys.length,L=40,Rr=6,T=36,B=58,H=270,ph=H-T-B,step=Math.max(36,Math.min(80,(340-L-Rr)/Math.max(1,n))),Wd=Math.max(340,L+Rr+step*n),bw=Math.min(40,step*0.66);
  const top0=Math.max(1,...keys.map(k=>Math.max(now[k]||0,whole[k]||0)));
  // tightest nice step that covers the tallest bar in 3–5 gridlines
  let stp=1;{const p=Math.pow(10,Math.floor(Math.log10(top0/4)));for(const f of [1,2,2.5,5,10])if(top0/(f*p)<=5){stp=f*p;break}}
  const nt=Math.max(1,Math.ceil(top0/stp*1.04)),max=stp*nt,yOf=v=>T+ph-ph*Math.max(0,v)/max;
  let g='<defs><pattern id="avst" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="var(--over)"/><rect width="2.6" height="6" fill="#fff" fill-opacity=".45"/></pattern></defs>';
  for(let i=0;i<=nt;i++){const yy=yOf(stp*i);g+='<line x1="'+L+'" x2="'+(Wd-Rr)+'" y1="'+yy+'" y2="'+yy+'" class="grid"/><text x="'+(L-5)+'" y="'+(yy+4)+'" class="ax" text-anchor="end">'+kfmt(stp*i)+'</text>'}
  keys.forEach((k,i)=>{const x=L+step*i+(step-bw)/2,cx0=x+bw/2,c=cm[k],nv=Math.max(0,now[k]||0),wv=Math.max(0,whole[k]||0),av=Math.max(0,soFar[k]||0);
    const base=T+ph,y1=yOf(wv),yr=yOf(nv),top=Math.min(y1,yr);let b='';
    if(wv>0)b+='<path d="'+barPath(x,y1,bw,base-y1,6)+'" fill="'+c+'" fill-opacity=".14" stroke="'+c+'" stroke-opacity=".6" stroke-width="1.5" stroke-dasharray="3 2.5"/>';
    if(nv>0){const yin=wv>0?Math.max(yr,y1):yr,r=wv>0?nv/wv:2;b+='<path class="avfill" style="--d:'+(i*0.04).toFixed(2)+'s" d="'+barPath(x,yin,bw,base-yin,r>=.97&&r<=1?6:(r>1?0:3))+'" fill="'+c+'"/>';
      if(r>1&&wv>0)b+='<path class="avfill" style="--d:'+(i*0.04+.3).toFixed(2)+'s" d="'+barPath(x,yr,bw,y1-yr,6)+'" fill="url(#avst)"/>'}
    if(!full&&av>0&&wv>0){const ty=yOf(av);b+='<line x1="'+(x-4)+'" x2="'+(x+bw+4)+'" y1="'+ty+'" y2="'+ty+'" class="avtick"/>'}
    const ov=wv>0&&nv>wv+.5;
    b+='<text x="'+cx0+'" y="'+(top-17)+'" class="avtv'+(ov?' over':'')+'" text-anchor="middle">'+kfmt(nv)+'</text><text x="'+cx0+'" y="'+(top-5)+'" class="avtw" text-anchor="middle">/'+kfmt(wv).slice(1)+'</text>';
    const nm=k.length>11?k.slice(0,10)+"…":k;
    b+='<text class="ax avxl" text-anchor="end" transform="translate('+(cx0+4)+','+(base+14)+') rotate(-38)">'+esc(nm)+'</text>';
    g+='<g class="avbar"'+(IS.group?'':' data-ddrill="'+esc(k)+'"')+'><rect x="'+(L+step*i)+'" y="0" width="'+step+'" height="'+H+'" fill="transparent"/>'+b+'</g>'});
  h+='<div class="avscroll"><svg class="chart avchart" viewBox="0 0 '+Wd+' '+H+'" style="width:'+(Wd>340?Wd+'px':'100%')+'" role="img" aria-label="Each category: spent so far against its average month">'+g+'</svg></div>';
  h+='<div class="avkey"><span><i class="k1"></i>Usual month</span><span><i class="k2"></i>Spent so far</span><span><i class="k4"></i>Over</span>'+(!full?'<span><i class="k3"></i>Usual by '+mname+' '+dayNow+'</span>':'')+'</div>';
  // category rows: spent so far vs the average whole month, tick where the average is by today
  h+='<div class="avlist"><h4>'+(IS.group?"Items":"Categories")+' <span>· so far vs avg month · '+(IS.group?"this month":"tap for items")+'</span></h4>';
  h+=keys.map((k,i)=>{const n=round2(now[k]||0),w=round2(whole[k]||0),a=round2(soFar[k]||0),mx2=Math.max(n,w,1),bd=Math.max(5,a*0.1),s2=n-a>bd?"over":n-a<-bd?"under":"even";
    return (IS.group?'<div class="avr">':'<button class="avr" data-ddrill="'+esc(k)+'">')+'<div class="top"><span class="nm"><i style="background:'+cm[k]+'"></i>'+esc(k)+'</span><span class="dl num"><b>'+f0(n)+'</b> / '+f0(w)+'</span></div>'+
      '<div class="bar"><i class="'+s2+'" style="--c:'+cm[k]+';width:'+(Math.max(0,n)/mx2*100).toFixed(1)+'%;animation-delay:'+(i*0.03).toFixed(2)+'s"></i><s style="left:'+(w/mx2*100).toFixed(1)+'%"></s>'+(!full&&a>0?'<u style="left:'+(a/mx2*100).toFixed(1)+'%"></u>':'')+'</div>'+
      '<div class="sub">'+(w>0?Math.round(n/w*100)+'% of a usual month':'Not usually spent')+(!full&&a>0?' · '+(s2==="even"?"on track":s2==="over"?'<em class="over">'+f0(n-a)+' ahead of usual</em>':'<em class="under">'+f0(a-n)+' behind usual</em>'):'')+'</div>'+(IS.group?'</div>':'</button>')}).join("")+'</div>';
  h+='<p class="note" style="margin:12px 2px 0">Average of '+past.length+' month'+(past.length===1?"":"s")+' ('+shortM(past[0])+" ’"+past[0].slice(2,4)+(past.length>1?" – "+shortM(past[past.length-1])+" ’"+past[past.length-1].slice(2,4):"")+'). '+(full?"":'The small tick on each bar is where you usually are by '+mname+' '+dayNow+'; the end mark is a usual whole month.')+'</p>';
  return h;
}
const AVR=[["1","Last month"],["3","3 months"],["6","6 months"],["12","Year"],["36","3 years"],["120","All time"]];
function renderInsights(groups,sm){
  IS.ranges=IS.ranges||{};
  if(!IS.ranges[IS.sub])IS.ranges[IS.sub]=+(ls.get("pb.irange."+IS.sub)||ls.get("pb.irange")||6);
  IS.range=IS.ranges[IS.sub];
  IS.tview="avg";const AVGV=IS.sub==="totals";
  if(AVGV){if(!IS.avr)IS.avr=+(ls.get("pb.avr")||6);IS.range=IS.avr+1}
  loadHist();
  const months=monthsBack(IS.range);
  const pending=months.some(ym=>ym!==S.ym&&!IS.hist[ym]);
  if(IS.sub==="details"){IS.sub="totals"}
  if(!ISUBS.some(x=>x[0]===IS.sub))IS.sub="totals";
  const BYM=IS.sub==="totals"&&IS.tview==="months";
  let h='';
  const rangeSel=selHTML("i-range",[["1","This Month"],["3","Past 3 Months"],["6","Past 6 Months"],["12","Past 12 Months"]],String(IS.range));
  const gnames=allGroupNames(months);
  if(IS.group&&!gnames.includes(IS.group))IS.group="";
  const groupSel=selHTML("i-group",[["","All Groups"]].concat(gnames.map(n=>[n,n])),IS.group);
  let fh='<div class="ifilters">';
  fh+=groupSel;
  if(IS.sub!=="cal"&&IS.sub!=="pace"&&!AVGV)fh+=rangeSel;
  fh+='</div>';
  if(!IS.group)IS.item="";
  if((BYM||IS.sub==="cal"||IS.sub==="pace"||IS.sub==="wd"||IS.sub==="map")&&IS.group){
    const items=[];months.forEach(ym=>spendRows(ym).forEach(r=>{if(r.g===IS.group&&!items.includes(r.i))items.push(r.i)}));
    groupsFor(S.ym).filter(g=>g.name===IS.group).forEach(g=>g.items.forEach(it=>{if(!items.includes(it.name))items.push(it.name)}));
    if(IS.item&&!items.includes(IS.item))IS.item="";
    fh+='<div class="ifilters">'+selHTML("i-item",[["","All Items"]].concat(items.map(n=>[n,n])),IS.item)+'</div>';
  }
  if(IS.sub==="cal")return h+calendarCard(fh);
  if(IS.sub==="pace")return h+paceCard(fh);
  if(IS.sub==="wd")return h+weekdayCard(fh,months,pending);
  if(IS.sub==="map")return h+mapCard(fh,months,pending);
  h+='<section class="card">'+fh;
  if(pending&&!AVGV)h+=SKEL;
  // aggregate
  const byKey={},byMonth={};
  const keyOf=r=>IS.group?r.i:r.g;
  months.forEach(ym=>{byMonth[ym]={};spendRows(ym).forEach(r=>{if(IS.group&&r.g!==IS.group)return;if(BYM&&IS.item&&r.i!==IS.item)return;const k=keyOf(r);byKey[k]=(byKey[k]||0)+r.a;byMonth[ym][k]=(byMonth[ym][k]||0)+r.a})});
  const keys=Object.keys(byKey).filter(k=>byKey[k]>0).sort((a,b)=>byKey[b]-byKey[a]);
  const order=IS.group?keys:gnames.filter(n=>keys.includes(n)).concat(keys.filter(k=>!gnames.includes(k)));
  const cm=colorMap(IS.group?keys:gnames.concat(keys.filter(k=>!gnames.includes(k))));
  const total=round2(keys.reduce((a,k)=>a+byKey[k],0));
  if(IS.sub==="totals"){
    const AVG=!BYM&&IS.tview!=="wheel";
    if(AVG){if(IS.group)h+='<button class="dback" data-dback>‹ All groups</button>';return h+avgViewHTML(months,pending)+'</section>'}
    if(BYM){
      if(!order.length)return h+'<p class="note" style="text-align:center;margin:18px 0">No spending logged for this period yet.</p></section>';
      h+=barChartI(months,byMonth,order,cm,(IS.item||IS.group||"All spending"));
      h+=legendHTML(order,cm);
      return h+'</section>';
    }
    if(IS.group)h+='<button class="dback" data-dback>‹ All groups</button>';
    if(!keys.length)return h+donutI([],{},cm,0,false)+'<p class="note" style="text-align:center">No spending logged for this period yet.</p></section>';
    const akey=[IS.range,IS.group,Math.round(total),keys.join("|")].join("~");
    const anim=!pending&&IS.donutKey!==akey;if(!pending)IS.donutKey=akey;
    if(IS.sel&&!keys.includes(IS.sel)){IS.sel=null;IS.rot=0}
    IS.dd=donutDetails(keys,byKey,byMonth,months,cm,total);
    h+='<div class="dwrap"><div class="dbub">'+donutI(keys,byKey,cm,total,anim)+'</div></div>';
    h+='<div class="dlegend'+(anim?' anim':'')+'">'+keys.map((k,i)=>'<button class="drow'+(IS.sel?(IS.sel===k?' on':' dim'):'')+'" data-dkey="'+esc(k)+'" style="--d:'+(0.25+i*0.05).toFixed(2)+'s"><i style="background:'+cm[k]+'"></i><span class="dn">'+esc(k)+'</span><span class="dpct num">'+IS.dd[k].pct+'%</span><b class="num">'+money(round2(byKey[k]))+'</b></button>').join("")+'</div>';
    h+='<div id="dpanel" data-k="'+esc(String(IS.sel))+'">'+(IS.sel?dPanelHTML(IS.sel):DHINT)+'</div>';
    if(anim)setTimeout(dCountUp,60);
    setTimeout(()=>{syncMini();dock()},0);
    return h+'</section>';
  }
  if(IS.sub==="details"){
    h+=barChart(months,byMonth,order,cm,{avg:true,label:"Spending by month"});
    h+=order.length?legendHTML(order,cm):'<p class="note" style="text-align:center">No spending logged for this period yet.</p>';
    return h+'</section>';
  }
  const inc={},sp={};
  months.forEach(ym=>{inc[ym]=round2(txOf(ym).filter(t=>t.type==="income").reduce((a,t)=>a+(+t.amount||0),0));sp[ym]=round2(spendRows(ym).reduce((a,r)=>a+r.a,0))});
  if(IS.sub==="income"){
    const s={};months.forEach(ym=>s[ym]={Income:inc[ym]});
    const tI=round2(months.reduce((a,m)=>a+inc[m],0));
    h+=barChart(months,s,["Income"],{Income:"var(--prog)"},{avg:true,label:"Income received by month"});
    h+='<div class="isum"><span>Total received</span><b class="num">'+money(tI)+'</b></div>';
    h+='<p class="note" style="margin:6px 0 0">Counts paychecks you\'ve logged as received. Tap a paycheck on the Budget tab, then Log received.</p>';
    return h+'</section>';
  }
  const tI=round2(months.reduce((a,m)=>a+inc[m],0)),tS=round2(months.reduce((a,m)=>a+sp[m],0)),net=round2(tI-tS);
  h+=groupedChart(months,inc,sp,"var(--prog)","var(--bar)");
  h+='<div class="legend"><span><i style="background:var(--prog)"></i>Income</span><span><i style="background:var(--bar)"></i>Spent</span></div>';
  h+='<div class="isum"><span>Income</span><b class="num">'+money(tI)+'</b></div><div class="isum"><span>Spent</span><b class="num">'+money(tS)+'</b></div><div class="isum"><span>'+(net>=0?"Saved":"Overspent")+'</span><b class="num" style="color:'+(net>=0?"var(--ok)":"var(--over)")+'">'+money(Math.abs(net))+'</b></div>';
  return h+'</section>';
}
/* Redraw only the cards that changed: build the new page off-screen, then swap just the top-level
   blocks whose HTML differs. Unchanged cards stay put (no flicker, open states and animations survive).
   Insights (charts, map) always redraws fully. */
function patchMain(m,html,key){
  if(m.dataset.pk!==key||S.tab==="insights"){m.innerHTML=html;m.dataset.pk=key;if(S.tab!=="insights")[...m.children].forEach(c=>c._h=c.outerHTML);return}
  const t=document.createElement("template");t.innerHTML=html;const nw=[...t.content.children],old=[...m.children];
  if(nw.length!==old.length){m.innerHTML=html;[...m.children].forEach(c=>c._h=c.outerHTML);return}
  nw.forEach((n,i)=>{const h=n.outerHTML,o=old[i];if(o._h===h)return;n._h=h;m.replaceChild(n,o)})}
/* Gentle shake + haptic when something's missing */
function shake(el){if(!el||matchMedia("(prefers-reduced-motion:reduce)").matches)return;try{haptic()}catch(_){}
  el.animate([{transform:"translateX(0)"},{transform:"translateX(-8px)"},{transform:"translateX(7px)"},{transform:"translateX(-5px)"},{transform:"translateX(3px)"},{transform:"translateX(0)"}],{duration:420,easing:"ease-out"})}
/* Soft press depth: a card tips a few degrees toward your finger while pressed, then eases back.
   Cancels the moment the touch turns into a scroll or swipe. */
(()=>{const M=$("#main");let card=null,x0=0,y0=0;
  const reset=()=>{if(!card)return;const c=card;card=null;if(!c._tilt)return;c._tilt=false;c.style.transition="transform .45s cubic-bezier(.3,.8,.3,1)";c.style.transform="";setTimeout(()=>{if(!c._tilt)c.style.transition=""},480)};
  M.addEventListener("touchstart",e=>{reset();if(e.touches.length!==1)return;const c=e.target.closest("#main > .card");if(!c||c.closest(".peek")||c.classList.contains("mlcard")||e.target.closest("select,input,textarea,.isel,.seg,.imap,.pscrub,svg.di")||matchMedia("(prefers-reduced-motion:reduce)").matches)return;
    const t=e.touches[0],r=c.getBoundingClientRect();x0=t.clientX;y0=t.clientY;card=c;
    const dx=((t.clientX-r.left)/r.width-.5)*2,dy=((t.clientY-r.top)/r.height-.5)*2,ang=Math.min(4,1600/Math.max(r.height,200));
    c._tilt=true;c.style.transition="transform .14s ease-out";c.style.transform="perspective(900px) rotateX("+(-dy*ang).toFixed(2)+"deg) rotateY("+(dx*ang*.8).toFixed(2)+"deg) scale(.985)"},{passive:true});
  M.addEventListener("touchmove",e=>{if(!card)return;const t=e.touches[0];if(Math.abs(t.clientX-x0)>6||Math.abs(t.clientY-y0)>6)reset()},{passive:true});
  ["touchend","touchcancel"].forEach(ev=>M.addEventListener(ev,reset,{passive:true}));
})();
/* Sliding highlight behind the active tab: one pill that glides between tabs */
let TABIND=null;
function moveTabInd(){const nav=document.querySelector("nav.tabs");if(!nav)return;const b=nav.querySelector('button[aria-current="page"]');if(!b)return;
  const first=!TABIND;if(first){TABIND=document.createElement("span");TABIND.className="tabind";TABIND.setAttribute("aria-hidden","true");nav.insertBefore(TABIND,nav.firstChild);nav.classList.add("hasind")}
  const go=()=>{TABIND.style.width=b.offsetWidth+"px";TABIND.style.height=b.offsetHeight+"px";TABIND.style.transform="translate3d("+b.offsetLeft+"px,"+b.offsetTop+"px,0)"};
  if(first){TABIND.style.transition="none";go();requestAnimationFrame(()=>{TABIND.style.transition=""})}else go()}
addEventListener("resize",()=>moveTabInd());
/* Numbers roll from their old value to the new one instead of snapping (amounts use fixed-width digits). */
const ROLL={};
function rollNumbers(root){const reduce=matchMedia("(prefers-reduced-motion:reduce)").matches;
  root.querySelectorAll("[data-roll]").forEach(el=>{const k=S.ym+":"+el.dataset.roll,v=+el.dataset.v,prev=ROLL[k];ROLL[k]=v;
    if(reduce||prev==null||Math.abs(prev-v)<.005||el._rolling===v)return;el._rolling=v;
    const t0=performance.now(),d=Math.min(900,420+Math.log10(1+Math.abs(v-prev))*120);el.textContent=money(prev);
    const step=n=>{if(!el.isConnected||el._rolling!==v)return;const q=Math.min(1,(n-t0)/d),e=1-Math.pow(1-q,3);el.textContent=money(round2(prev+(v-prev)*e));if(q<1)requestAnimationFrame(step);else el._rolling=null};
    requestAnimationFrame(step)})}
function render(){{const f=document.getElementById("fab");if(f&&scrollY<120)f.classList.remove("tuck")}if(DBAR.el&&!(S.tab==="insights"&&IS.sub==="totals"))DBAR.el.classList.remove("on");
  renderHeader();
  const groups=groupsFor(S.ym), sm=spentMap();
  renderBanner(groups,sm);
  const m=$("#main");
  const ae=document.activeElement, keep=ae&&ae.id==="txq"?[ae.selectionStart,ae.selectionEnd]:null;
  const html=S.tab==="budget"?renderBudget(groups,sm):S.tab==="tx"?renderTx(groups):renderInsights(groups,sm);
  patchMain(m,html,S.tab+"|"+S.ym);rollNumbers(m);
  const snap=S.tab==="insights"&&IS.sub==="map"&&!!m.querySelector(".mlrow");document.documentElement.classList.toggle("mlsnap",snap);if(snap)mlSnapVar();mlStuck();
  if(keep){const i=$("#txq");if(i){i.focus();try{i.setSelectionRange(keep[0],keep[1])}catch(e){}}}
}


