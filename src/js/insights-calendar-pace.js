/* ---------- Calendar: heatmap, streaks, tap a day ---------- */
const CALHINT='<p class="note dhint">Tap a day to see what you bought.</p>';
// flame colors for spending days: pale yellow → orange → red → deep red
const FLAME=[[0,[255,241,196]],[.22,[255,214,102]],[.45,[255,159,67]],[.66,[255,107,53]],[.84,[229,57,53]],[1,[160,20,30]]];
function flame(x){x=Math.max(0,Math.min(1,x));for(let i=1;i<FLAME.length;i++)if(x<=FLAME[i][0]){const [a,ca]=FLAME[i-1],[b,cb]=FLAME[i],t=(x-a)/(b-a);return"rgb("+ca.map((c,k)=>Math.round(c+(cb[k]-c)*t)).join(",")+")"}return"rgb(160,20,30)"}
function calendarCard(fh){
  const ym=S.ym,[y,m]=ym.split("-").map(Number),td=today(),cur=ymOf(td);
  const fx=fixedSkip(ym),match=t=>t.type!=="income"&&!(fx&&fx.has(t.itemId))&&(!IS.group||groupNameOf(t,ym)===IS.group)&&(!IS.item||itemNameOf(t,ym)===IS.item);
  const day={},cnt={};txOf(ym).forEach(t=>{if(!match(t))return;const k=+String(t.date).slice(8,10);if(!k)return;day[k]=(day[k]||0)+sAmt(t);if(t.type!=="refund")cnt[k]=(cnt[k]||0)+1});
  const first=new Date(y,m-1,1).getDay(),dim=new Date(y,m,0).getDate();
  const lastDay=ym<cur?dim:ym===cur?+td.slice(8,10):0;
  const max=Math.max(0,...Object.values(day)),tot=round2(Object.keys(day).filter(k=>+k<=lastDay).reduce((a,k)=>a+day[k],0));
  let ns=0,run=0,best=0;for(let d=1;d<=lastDay;d++){if(!(day[d]>0)){ns++;run++;best=Math.max(best,run)}else run=0}
  let big=0;for(let d=1;d<=dim;d++)if((day[d]||0)>(day[big]||0))big=d;
  const key=[ym,IS.group,IS.item,Math.round(tot)].join("~"),anim=IS.calKey!==key;IS.calKey=key;
  if(IS.calSel&&ymOf(IS.calSel)!==ym)IS.calSel=null;
  const nextYm=lastYm();
  const vals=Object.values(day).filter(x=>x>0).sort((a,b)=>a-b),lmax=Math.log(1+max);
  const heatOf=v=>{if(vals.length<2)return .5;let lo=0,hi=vals.length;while(lo<hi){const m=(lo+hi)>>1;if(vals[m]<v)lo=m+1;else hi=m}const rank=lo/(vals.length-1);return Math.min(1,.65*rank+.35*Math.log(1+v)/lmax)};
  let g='<div class="cal2'+(anim?' anim':'')+'">'+["S","M","T","W","T","F","S"].map(d=>'<div class="dow">'+d+'</div>').join("");
  const cells=Math.ceil((first+dim)/7)*7;
  for(let c=0;c<cells;c++){const n=c-first+1;
    if(n<1||n>dim){g+='<div class="cd out"></div>';continue}
    const v=day[n]||0,iso=ym+"-"+pad(n),fut=n>lastDay,hh=v>0?heatOf(v):0;
    const cls=["cd"];if(iso===td)cls.push("today");if(fut)cls.push("fut");const gain=!fut&&v<-.005;if(gain)cls.push("gain");else if(!fut&&!(v>0))cls.push("zero");if(n===big&&v>0)cls.push("big");if(IS.calSel===iso)cls.push("sel");if(v>0&&!fut&&hh>.6)cls.push("dark");
    g+='<button class="'+cls.join(" ")+'" data-cday="'+iso+'" style="--h:'+hh.toFixed(3)+';--i:'+c+(v>0&&!fut?';--bg:'+flame(hh):'')+'" aria-label="'+esc(fmtLong(iso))+(v>0?", "+money(round2(v)):gain?", came out ahead "+money(round2(-v)):fut?"":", no spending")+'"><span class="n">'+n+'</span>'+(v>0?'<b class="num">'+kfmt(v)+'</b>':gain?'<b class="num">+'+kfmt(-v)+'</b>':(!fut?'<em aria-hidden="true">✓</em>':''))+'</button>'}
  g+='</div>';
  let h='<section class="card calcard"><div class="chead"><h2>Daily spending</h2><div class="cnav"><button data-cmon="-1" aria-label="Previous month">‹</button><span class="lbl">'+MONTHS[m-1].slice(0,3)+' '+y+'</span><button data-cmon="1" aria-label="Next month"'+(ym>=nextYm?" disabled":"")+'>›</button></div></div>'+fh+fixedChip(ym,fx);
  h+='<div class="cchips'+(anim?' anim':'')+'"><div><small>Per day</small><b class="num">'+(lastDay?money(round2(tot/lastDay)):"—")+'</b></div><div><small>$0 days</small><b class="num">'+(lastDay?ns:"—")+'</b></div><div><small>Streak</small><b class="num">'+(lastDay?best+" day"+(best===1?"":"s"):"—")+'</b></div>'+
    (big&&day[big]>0?'<button data-cday="'+ym+'-'+pad(big)+'"><small>Top day</small><b class="num">'+money(round2(day[big])).replace(/\.\d\d$/,"")+'</b><span>'+MONTHS[m-1].slice(0,3)+' '+big+'</span></button>':'')+'</div>';
  h+=g;
  h+='<div class="calleg"><span>'+money(tot)+' this month</span><span class="scale"><i style="--bg:#17885c" title="Came out ahead"></i><i style="--bg:#cfeed6" title="No spending"></i>&nbsp;Less<i style="--bg:'+flame(.08)+'"></i><i style="--bg:'+flame(.35)+'"></i><i style="--bg:'+flame(.62)+'"></i><i style="--bg:'+flame(.85)+'"></i><i style="--bg:'+flame(1)+'"></i>More</span></div>';
  h+='<div id="calpanel">'+(IS.calSel?calPanelHTML(IS.calSel):CALHINT)+'</div>';
  return h+'</section>';
}
function calPanelHTML(iso){
  const ym=ymOf(iso),groups=groupsFor(ym),td=today();
  const fx=fixedSkip(ym),all0=txOf(ym).filter(t=>t.date===iso&&t.type!=="income"&&(!IS.group||groupNameOf(t,ym)===IS.group)&&(!IS.item||itemNameOf(t,ym)===IS.item));
  const all=all0.filter(t=>!(fx&&fx.has(t.itemId))),bills=round2(all0.filter(t=>fx&&fx.has(t.itemId)).reduce((a,t)=>a+sAmt(t),0));
  const spent=round2(all.reduce((a,t)=>a+sAmt(t),0));
  let h='<div class="calp"><div class="calph"><b>'+esc(dfmt({weekday:"long",month:"long",day:"numeric"}).format(new Date(iso+"T12:00:00")))+'</b><b class="num"'+(spent<0?' style="color:var(--ok)"':'')+'>'+(spent<0?"+"+money(-spent):money(spent))+'</b></div>';
  if(!all.length)h+='<p class="calnone">'+(iso>td?"Nothing scheduled yet.":"No spending — nice! 🎉")+'</p>';
  else h+=all.map((t,i)=>{const ref=t.type==="refund";return '<button class="txrow" data-ctx="'+esc(t.id)+'" style="--d:'+(i*0.04).toFixed(2)+'s"><div class="l"><div class="m">'+esc(t.merchant||"Purchase")+'</div><div class="c">'+esc(txLabel(t,groups))+(t.note?" · "+esc(t.note):"")+'</div></div><div class="a num"'+(ref?' style="color:var(--ok)"':'')+'>'+(ref?"+":"")+money(+t.amount||0)+'</div></button>'}).join("");
  if(bills>0)h+='<p class="note" style="margin:8px 0 0">Plus '+money(bills)+' in bills, left out above.</p>';
  return h+'</div>';
}
$("#main").addEventListener("click",e=>{
  const nf=e.target.closest("[data-nofixed]");if(nf){IS.noFixed=!IS.noFixed;ls.set("pb.nofixed",IS.noFixed?"1":"0");IS.paceKey=null;IS.calKey=null;try{haptic()}catch(_){}render();return}
  const d=e.target.closest("[data-cday]");if(d){const iso=d.dataset.cday;IS.calSel=IS.calSel===iso?null:iso;try{haptic()}catch(_){}
    document.querySelectorAll("#main .cd.sel").forEach(x=>x.classList.remove("sel"));
    if(IS.calSel){const c=document.querySelector('#main .cd[data-cday="'+iso+'"]');if(c)c.classList.add("sel")}
    const p=$("#calpanel");if(p)p.innerHTML=IS.calSel?calPanelHTML(IS.calSel):CALHINT;return}
  const t=e.target.closest("[data-ctx]");if(t){const x=txOf(ymOf(IS.calSel||S.ym)).find(y=>y.id===t.dataset.ctx);if(x)isHist(x)?histSheet(x):txSheet(x);return}
  const mo=e.target.closest("[data-cmon]");if(mo&&!mo.disabled){const [yy,mm]=S.ym.split("-").map(Number),dt=new Date(yy,mm-1+(+mo.dataset.cmon),1);
    S.ym=dt.getFullYear()+"-"+pad(dt.getMonth()+1);S.upcoming=false;IS.calSel=null;try{haptic()}catch(_){}subscribeTx();render();return}
  const bm=e.target.closest("[data-bm]");if(bm){IS.bmSel=IS.bmSel===bm.dataset.bm?null:bm.dataset.bm;try{haptic()}catch(_){}
    document.querySelectorAll("#main .bcol").forEach(c=>{c.classList.toggle("on",c.dataset.bm===IS.bmSel);c.classList.toggle("dim",!!IS.bmSel&&c.dataset.bm!==IS.bmSel)});
    const r=$("#bmread");if(r)r.innerHTML=bmReadHTML();return}
  const pg=e.target.closest("[data-pgo]");if(pg){if(IS.group)IS.item=pg.dataset.pgo;else{IS.group=pg.dataset.pgo;IS.item=""}try{haptic()}catch(_){}IS.paceKey=null;render();
    const c=document.querySelector("#main .pace");if(c)window.scrollTo({top:Math.max(0,scrollY+c.getBoundingClientRect().top-(parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--hh"))||120)-12),behavior:"smooth"});return}
  const wm=e.target.closest("[data-wdm]");if(wm){IS.wdMetric=wm.dataset.wdm;ls.set("pb.wdm",IS.wdMetric);try{haptic()}catch(_){}wdApplyMetric();return}
  const wd=e.target.closest("[data-wd]");if(wd){const w=+wd.dataset.wd;IS.wdSel=IS.wdSel===w?null:w;try{haptic()}catch(_){}
    document.querySelectorAll("#main .wdb").forEach(b=>{const k=+b.dataset.wd;b.classList.toggle("sel",k===IS.wdSel);b.classList.toggle("dim",IS.wdSel!=null&&k!==IS.wdSel)});
    const p=$("#wdpanel");if(p)p.innerHTML=IS.wdSel!=null?wdPanelHTML(IS.wdSel):WDHINT;return}
});

/* ---------- Pace extras: budget-vs-month rings, how each group is pacing ---------- */
function paceRings(spentNow,planned,dayNow,dim,cur,noBills){
  const mp=dayNow/dim,sp=planned>0?spentNow/planned:0,over=sp>mp+.005,bust=sp>1.0001;
  const ring=(r,f,col,cls)=>{const C=2*Math.PI*r;return '<circle cx="60" cy="60" r="'+r+'" fill="none" stroke="var(--trk)" stroke-width="11"/><circle class="garc '+cls+'" cx="60" cy="60" r="'+r+'" fill="none" stroke="'+col+'" stroke-width="11" stroke-linecap="round" stroke-dasharray="'+(C*Math.min(1,f)).toFixed(1)+' '+C.toFixed(1)+'" style="--C:'+C.toFixed(1)+'" transform="rotate(-90 60 60)"/>'};
  return '<div class="prings"><svg viewBox="0 0 120 120" aria-hidden="true">'+ring(50,mp,"#9aa0a6","g1")+ring(34,sp,bust?"var(--over)":over?"#f9ab00":"var(--ok)","g2")+
    '<text x="60" y="58" text-anchor="middle" class="gv num">'+Math.round(sp*100)+'%</text><text x="60" y="74" text-anchor="middle" class="gl">of budget</text></svg>'+
    '<div class="pringt"><div><i style="background:'+(bust?"var(--over)":over?"#f9ab00":"var(--ok)")+'"></i><b class="num">'+Math.round(sp*100)+'%</b> of the budget used</div><div><i style="background:#9aa0a6"></i><b class="num">'+Math.round(mp*100)+'%</b> of the month '+(cur?"gone":"")+'</div>'+
    '<p class="'+(bust?"bad":over?"warn":"ok")+'">'+(cur?(bust?"Already past the plan for the month.":over?"Ahead of the calendar"+(noBills?".":" — bills paid early count here too."):"You're spending slower than the month is passing."):(sp>1?"Went over plan.":"Stayed within plan."))+'</p></div></div>';
}
function paceGroupsHTML(ym,dayNow,dim){
  if(IS.item||!dayNow)return"";
  const td=today(),mp=dayNow/dim,groups=groupsFor(ym),rows=[],fx=fixedSkip(ym);
  const spent={};txOf(ym).forEach(t=>{if(t.type==="income"||t.date>td)return;if(fx&&fx.has(t.itemId))return;const g=groupNameOf(t,ym);if(IS.group&&g!==IS.group)return;const k=IS.group?itemNameOf(t,ym):g;spent[k]=(spent[k]||0)+sAmt(t)});
  if(IS.group){groups.filter(g=>g.name===IS.group).forEach(g=>g.items.forEach(it=>{if(+it.planned>0&&!(fx&&fx.has(it.id)))rows.push([it.name,+it.planned])}))}
  else groups.forEach(g=>{const p=g.items.reduce((a,it)=>a+(fx&&fx.has(it.id)?0:(+it.planned||0)),0);if(p>0)rows.push([g.name,p])});
  if(!rows.length)return"";
  rows.forEach(r=>r.push(round2(spent[r[0]]||0)));rows.sort((a,b)=>(b[2]/b[1]-mp)-(a[2]/a[1]-mp));
  return '<div class="pgroups"><h4>How each '+(IS.group?"item":"group")+' is pacing <span>· tap to focus</span></h4>'+rows.map(([n,p,s],i)=>{const f=s/p,over=s>p+.5,done=!over&&s>=p-.5,ahead=!over&&!done&&f>mp+.02;
    return '<button class="pgr" data-pgo="'+esc(n)+'" style="--d:'+(i*0.05).toFixed(2)+'s"><div class="pgt"><span class="pn">'+esc(n)+'</span><span class="num">'+(done?'<em class="pdone">✓ </em>':'')+'<b>'+money(round2(s)).replace(/\.\d\d$/,"")+'</b> / '+money(p).replace(/\.\d\d$/,"")+'</span></div><div class="pgb"><i class="'+(over?"over":done?"done":ahead?"ahead":"")+'" style="width:'+Math.min(100,f*100).toFixed(1)+'%"></i><u style="left:'+(mp*100).toFixed(1)+'%"></u></div></button>'}).join("")+'</div>';
}

/* ---------- Weekday: metric switch, tap a day ---------- */
IS.wdMetric=ls.get("pb.wdm")||"avg";
const WDHINT='<p class="note dhint">Tap a day to see what drives it.</p>';
function wdVals(m){const D=IS.wdData;return WD_ORDER.map(w=>m==="total"?D.sum[w]:m==="count"?(D.days[w]?D.cnt[w]/D.days[w]:0):(D.days[w]?D.sum[w]/D.days[w]:0))}
const wdFmt=(m,v)=>m==="count"?v.toFixed(1):kfmt(v);
function wdApplyMetric(){
  const m=IS.wdMetric,v=wdVals(m),mx=Math.max(...v,.0001),D=IS.wdData;
  document.querySelectorAll("#main [data-wdm]").forEach(b=>b.setAttribute("aria-pressed",String(b.dataset.wdm===m)));
  document.querySelectorAll("#main .wdb").forEach((b,i)=>{b.querySelector(".wbar i").style.height=Math.max(v[i]>0?3:0,v[i]/mx*100).toFixed(1)+"%";b.querySelector(".wv").textContent=wdFmt(m,v[i])});
  const al=document.querySelector("#main .wdavg");if(al){const a=m==="total"?0:(m==="count"?D.cntAll/D.totDays:D.totSum/D.totDays);al.style.bottom=(a/mx*100).toFixed(1)+"%";al.style.opacity=a?"1":"0";al.querySelector("span").textContent=a?(m==="count"?a.toFixed(1)+" avg":kfmt(a)+" avg"):""}
}
function weekdayCard(fh,months,pending){
  const td=today(),cur=ymOf(td);
  const days=Array(7).fill(0),sum=Array(7).fill(0),cnt=Array(7).fill(0),cat=Array.from({length:7},()=>({})),mer=Array.from({length:7},()=>({})),dayTot={};
  months.forEach(ym=>{
    if(ym>cur)return;
    const [y,m]=ym.split("-").map(Number),dim=new Date(y,m,0).getDate(),last=ym<cur?dim:+td.slice(8,10);
    for(let d=1;d<=last;d++)days[new Date(y,m-1,d).getDay()]++;
    const fixed=new Set();if(IS.wdVar)groupsFor(ym).forEach(g=>g.items.forEach(it=>{if(isFixed(it,g))fixed.add(it.id)}));
    txOf(ym).forEach(t=>{
      if(t.type==="income"||!t.date||t.date>td||fixed.has(t.itemId))return;
      const g=groupNameOf(t,ym),it=itemNameOf(t,ym);
      if(IS.group&&g!==IS.group)return;if(IS.item&&it!==IS.item)return;
      const [yy,mm,dd]=t.date.split("-").map(Number),w=new Date(yy,mm-1,dd).getDay(),a=sAmt(t);
      sum[w]+=a;if(t.type!=="refund")cnt[w]++;
      const ck=IS.group?it:g;cat[w][ck]=(cat[w][ck]||0)+a;
      const mk=String(t.merchant||"Purchase").replace(/^\s*venmo\s*:\s*/i,"").trim()||"Purchase";mer[w][mk]=(mer[w][mk]||0)+a;
      dayTot[t.date]=(dayTot[t.date]||0)+a});
  });
  const totDays=days.reduce((a,b)=>a+b,0),totSum=sum.reduce((a,b)=>a+b,0),cntAll=cnt.reduce((a,b)=>a+b,0);
  const big=Array(7).fill(null);Object.entries(dayTot).forEach(([d,v])=>{const [yy,mm,dd]=d.split("-").map(Number),w=new Date(yy,mm-1,dd).getDay();if(!big[w]||v>big[w][1])big[w]=[d,v]});
  IS.wdData={days,sum,cnt,cat,mer,big,totDays,totSum,cntAll};
  const label=IS.item||IS.group||"All spending";
  let h='<section class="card wd"><div class="chead"><h2>Spending by weekday</h2></div>'+fh;
  h+='<label class="chk" style="margin:4px 0 10px"><input type="checkbox" id="wd-var"'+(IS.wdVar?" checked":"")+'><span>Leave out fixed bills<br><span class="note">Mortgage, insurance and other bills land on set dates and would skew the days they fall on.</span></span></label>';
  if(pending)h+=SKEL;
  if(!totDays||totSum<=0)return h+'<p class="note" style="text-align:center;margin:18px 0 6px">No spending logged for '+esc(label)+' in this period yet.</p></section>';
  const key=[months.join(),IS.group,IS.item,IS.wdVar,Math.round(totSum)].join("~"),anim=IS.wdKey!==key;IS.wdKey=key;
  const m=IS.wdMetric,v=wdVals(m),mx=Math.max(...v,.0001);
  const topW=WD_ORDER.reduce((b,w)=>sum[w]/Math.max(1,days[w])>sum[b]/Math.max(1,days[b])?w:b,WD_ORDER[0]);
  h+='<div class="seg2 wdm" role="group" aria-label="Measure"><button data-wdm="avg" aria-pressed="'+(m==="avg")+'">Avg / day</button><button data-wdm="total" aria-pressed="'+(m==="total")+'">Total</button><button data-wdm="count" aria-pressed="'+(m==="count")+'">Purchases</button></div>';
  h+='<div class="wdbars'+(anim?' anim':'')+'"><div class="wdavg"><span></span></div>'+WD_ORDER.map((w,i)=>{const we=w===0||w===6;
    return '<button class="wdb'+(we?' we':'')+(w===topW?' top':'')+(IS.wdSel===w?' sel':'')+(IS.wdSel!=null&&IS.wdSel!==w?' dim':'')+'" data-wd="'+w+'" style="--d:'+(i*0.06).toFixed(2)+'s" aria-label="'+WD_LONG[w]+'"><span class="wv num">'+wdFmt(m,v[i])+'</span><span class="wbar"><i style="height:'+Math.max(v[i]>0?3:0,v[i]/mx*100).toFixed(1)+'%"></i></span><span class="wl">'+WD_SHORT[w]+'</span></button>'}).join("")+'</div>';
  const sumOf=ws=>ws.reduce((a,w)=>a+sum[w],0),daysOf=ws=>ws.reduce((a,w)=>a+days[w],0);
  const wkAvg=daysOf([1,2,3,4,5])?sumOf([1,2,3,4,5])/daysOf([1,2,3,4,5]):0,weAvg=daysOf([0,6])?sumOf([0,6])/daysOf([0,6]):0;
  const weShare=totSum>0?Math.round(sumOf([0,6])/totSum*100):0;
  h+='<div class="pstat"><div><small>Weekday</small><b class="num">'+money(round2(wkAvg))+'</b></div><div><small>Weekend</small><b class="num">'+money(round2(weAvg))+'</b></div><div><small>Wknd share</small><b class="num">'+weShare+'%</b></div></div>';
  let verd;if(wkAvg>0&&weAvg>0){const r=weAvg/wkAvg;verd=r>=1.05?'You spend '+Math.round((r-1)*100)+'% more per day on weekends':r<=0.95?'You spend '+Math.round((1/r-1)*100)+'% more per day on weekdays':'Weekends and weekdays are about even'}else verd='Not enough days yet to compare weekends and weekdays';
  h+='<p class="pverd" style="background:var(--sel);color:var(--fg)">'+esc(verd+' · '+WD_LONG[topW]+' is your biggest day')+'</p>';
  h+='<div id="wdpanel">'+(IS.wdSel!=null?wdPanelHTML(IS.wdSel):WDHINT)+'</div>';
  setTimeout(()=>{if(IS.wdData)wdApplyMetric()},0);
  return h+'</section>';
}
function wdPanelHTML(w){
  const D=IS.wdData;if(!D)return WDHINT;const we=w===0||w===6,col=we?WD_COL.we:WD_COL.wk;
  const avg=D.days[w]?D.sum[w]/D.days[w]:0,per=D.days[w]?D.cnt[w]/D.days[w]:0,share=D.totSum>0?Math.round(D.sum[w]/D.totSum*100):0;
  const top=(o,n)=>Object.entries(o).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]).slice(0,n);
  const bars=(arr)=>{const mx=arr.length?arr[0][1]:1;return arr.map(([k,v],i)=>'<div class="dpart"><span class="pn">'+esc(k)+'</span><span class="pb"><i style="width:'+Math.max(3,v/mx*100).toFixed(1)+'%;--d:'+(0.08+i*0.05).toFixed(2)+'s"></i></span><b class="num">'+money(round2(v))+'</b></div>').join("")};
  const c=top(D.cat[w],4),mm=top(D.mer[w],4),b=D.big[w];
  let h='<div class="dpanel" style="--c:'+col+'"><div class="dph"><i></i><b>'+WD_LONG[w]+'s</b><span class="num">'+share+'% of spending</span></div>';
  h+='<div class="dstats"><div><small>Avg / day</small><b class="num">'+money(round2(avg))+'</b></div><div><small>Purchases</small><b class="num">'+per.toFixed(1)+'</b><span>per '+WD_SHORT[w]+'</span></div><div><small>'+WD_SHORT[w]+'s counted</small><b class="num">'+D.days[w]+'</b></div></div>';
  if(c.length)h+='<div class="dparts"><h5>Top '+(IS.group?"items":"categories")+'</h5>'+bars(c)+'</div>';
  if(mm.length)h+='<div class="dparts"><h5>Top merchants</h5>'+bars(mm)+'</div>';
  if(b)h+='<p class="dbig">Biggest '+WD_LONG[w]+': <b class="num">'+money(round2(b[1]))+'</b> on '+esc(dfmt({month:"short",day:"numeric",year:"numeric"}).format(new Date(b[0]+"T12:00:00")))+'</p>';
  return h+'</div>';
}

