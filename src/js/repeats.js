/* ---------- Repeating transactions (Transactions tab → "Repeats") ----------
   Looks through the last REP_MONTHS finished months (plus this month so far) for expenses that come back every month:
   same merchant, at most once a month, in at least 3 of the last 4 months, still seen in the last 2, on about the same
   day (days within 6 of each other). It works one month at a time: the month you're looking at (or this month, if you're
   looking at a past one). You review the list and it adds that month's dates, skipping ones already past or already there.
   Added ones carry sched:true and rep:<merchant key>. sched ones dated after today wait: they aren't auto-sent to the
   Finance Tracker sheet, aren't counted as "not in your sheet", and show "scheduled" (see waitSheet in core.js).
   "Remove" deletes that month's future transactions that have rep set. Nothing is written until you tap Add. */
const REP_MONTHS=6;
function repKey(t){return String(t.merchant||"").toLowerCase().replace(/^venmo:\s*/,"venmo ").replace(/[^a-z0-9 ]+/g," ").replace(/\s+/g," ").trim()}
function ymAdd(ym,k){const [y,m]=ym.split("-").map(Number),d=new Date(y,m-1+k,1);return d.getFullYear()+"-"+pad(d.getMonth()+1)}
function dimYm(ym){const [y,m]=ym.split("-").map(Number);return new Date(y,m,0).getDate()}
/* the pure part: txs = past transactions, months = the finished months looked at (oldest first) */
function findRepeats(txs,months){
  const by=new Map(),recent=months.slice(-4),last2=months.slice(-2);
  txs.forEach(t=>{if(t.type!=="expense"||t.sched||!(+t.amount>0)||!t.date)return;const k=repKey(t);if(!k)return;let a=by.get(k);if(!a)by.set(k,a=[]);a.push(t)});
  const out=[];
  by.forEach((arr,k)=>{
    const perM={};arr.forEach(t=>{const ym=t.date.slice(0,7);(perM[ym]=perM[ym]||[]).push(t)});
    const hits=recent.filter(ym=>perM[ym]).length;if(hits<3)return;
    if(!last2.some(ym=>perM[ym]))return;
    if(recent.filter(ym=>perM[ym]&&perM[ym].length>1).length>1)return; /* more than once a month (groceries, coffee…) */
    const seen=months.filter(ym=>perM[ym]).map(ym=>perM[ym].slice().sort((a,b)=>a.date<b.date?1:-1)[0]);
    const days=seen.map(t=>+t.date.slice(8,10)).sort((a,b)=>a-b);if(days[days.length-1]-days[0]>6)return;
    const day=days[Math.floor(days.length/2)];
    const amts=seen.map(t=>+t.amount);const lo=Math.min(...amts),hi=Math.max(...amts),stable=hi<=lo*1.1+0.01;
    const lastT=seen[seen.length-1],last3=amts.slice(-3);
    const amount=stable?round2(+lastT.amount):round2(last3.reduce((a,x)=>a+x,0)/last3.length);
    out.push({k,merchant:lastT.merchant,itemId:lastT.itemId||"",itemName:lastT.itemName||"",groupName:lastT.groupName||"",sub:lastT.sub||"",amount,day,stable,hits,of:recent.length});
  });
  return out.sort((a,b)=>a.day-b.day||a.merchant.localeCompare(b.merchant));
}
/* the date for one repeat in month ym, or none if it's already past or that month already has it */
/* Yearly: charges that happened in this same month 1 or 2 years ago (a Ring or Amazon Prime renewal…).
   Skipped: merchants already on the monthly list, merchants seen in 2+ of the recent months (regular shopping),
   more than one charge that month, under $1. Seen in both earlier years = ticked; seen once = suggested, unticked. */
function findYearly(byYear,recent,monthlyKeys){
  const freq=new Map();recent.forEach(t=>{if(t.type!=="expense")return;const k=repKey(t);if(!k)return;const m=freq.get(k)||new Set();m.add(t.date.slice(0,7));freq.set(k,m)});
  const found=new Map();
  byYear.forEach(({ym,tx})=>{const per=new Map();tx.forEach(t=>{if(t.type!=="expense"||t.sched||!(+t.amount>=1)||!t.date)return;const k=repKey(t);if(!k)return;let a=per.get(k);if(!a)per.set(k,a=[]);a.push(t)});
    per.forEach((a,k)=>{if(a.length>1||monthlyKeys.has(k)||(freq.get(k)||new Set()).size>=2)return;const f=found.get(k)||{k,seen:[]};f.seen.push(a[0]);found.set(k,f)})});
  const out=[];found.forEach(f=>{const t=f.seen.slice().sort((a,b)=>a.date<b.date?1:-1)[0];
    out.push({k:f.k,merchant:t.merchant,itemId:t.itemId||"",itemName:t.itemName||"",groupName:t.groupName||"",sub:t.sub||"",amount:round2(+t.amount),day:+t.date.slice(8,10),stable:true,yearly:true,
      years:f.seen.map(x=>+x.date.slice(0,4)).sort(),sure:f.seen.length>=2,last:t.date})});
  return out.sort((a,b)=>b.sure-a.sure||a.day-b.day||a.merchant.localeCompare(b.merchant));
}
function repDates(r,ym,have){const d=ym+"-"+pad(Math.min(r.day,dimYm(ym)));return d<=today()||have.has(ym+"|"+r.k)?[]:[d]}
async function repLoad(){
  const cur=ymOf(today()),months=[];for(let i=REP_MONTHS;i>=1;i--)months.push(ymAdd(cur,-i));
  await Promise.all(months.map(ym=>IS.fresh[ym]?null:fetchMonth(ym)));
  const past=[];months.forEach(ym=>(IS.hist[ym]||[]).forEach(t=>past.push(t)));
  /* this month and everything after it, to know what's already there */
  const snap=await S.db.collection("tx").where("date",">=",cur+"-01").limit(3000).get();
  const ahead=snap.docs.map(d=>Object.assign({id:d.id},d.data()));
  const td=today(),reps=findRepeats(past,months);
  const have=new Set();ahead.forEach(t=>have.add(t.date.slice(0,7)+"|"+repKey(t)));
  const tgt=S.ym>cur?S.ym:cur,filled=ahead.filter(t=>t.rep&&t.date>td&&t.date.slice(0,7)===tgt);
  /* the same month one and two years back, for yearly charges */
  const yms=[ymAdd(tgt,-12),ymAdd(tgt,-24)].filter(ym=>ym<cur);
  await Promise.all(yms.map(ym=>IS.fresh[ym]?null:fetchMonth(ym).catch(()=>null)));
  const yearly=findYearly(yms.map(ym=>({ym,tx:IS.hist[ym]||[]})),past,new Set(reps.map(r=>r.k)));
  return{cur,tgt,months,reps:reps.concat(yearly),have,filled};
}
function repeatsSheet(){
  if(!S.db||S.readOnly){toast("Sign in to fill in repeating transactions");return}
  let st=null,off=new Set(),busy=false;
  let offInit=false;
  const draw=s=>{
    if(!st){s.innerHTML='<div class="grab"></div><h3>Repeating transactions</h3><p class="note">Looking through your last '+REP_MONTHS+' months…</p>'+SKEL;return}
    const {reps,filled,tgt,have}=st,mName=MONTHS[+tgt.slice(5)-1];
    if(!offInit){offInit=true;reps.forEach(r=>{if(r.yearly&&!r.sure)off.add(r.k)})}
    const nM=reps.filter(r=>!r.yearly).length,nY=reps.length-nM;
    let n=0;reps.forEach(r=>{if(!off.has(r.k))n+=repDates(r,tgt,have).length});
    let h='<div class="grab"></div><h3>Repeating transactions</h3>';
    if(!reps.length)h+='<p class="note">Nothing in your last '+REP_MONTHS+' months repeats on a steady monthly schedule, and nothing once-a-year turned up for '+mName+'.</p>';
    else{
      h+='<p class="note" style="margin:0 0 10px">Found '+(nM?nM+' that come back every month':'')+(nM&&nY?' and ':'')+(nY?nY+' that came in '+mName+' in an earlier year':'')+'. Untick any you don\'t want to add to '+mName+'. They go to your Finance Tracker sheet on their date, not before.</p>';
      h+='<div class="replist">'+reps.map((r,i)=>{const c=repDates(r,tgt,have).length;const yh=r.yearly&&!(i&&reps[i-1].yearly)?'<div class="rephd">Once a year</div>':'';
        const why=r.yearly?(r.sure?'every '+mName+' ('+r.years.join(', ')+')':'once, in '+mName+' '+r.years[0]+'. Tick if it renews yearly'):'seen '+r.hits+' of '+r.of+' months'+(r.stable?'':' · amount varies, using the average');
        return yh+'<label class="reprow'+(r.yearly?' yr':'')+'"><input type="checkbox" data-rk="'+esc(r.k)+'"'+(off.has(r.k)?"":" checked")+'><span class="rl"><b>'+esc(r.merchant)+'</b><small>'+esc(r.itemName||"Uncategorized")+' · around the '+ordinal(r.day)+' · '+why+(c?'':have.has(tgt+"|"+r.k)?' · already in '+mName:' · already past this month')+'</small></span><span class="ra num">'+money(r.amount)+'</span></label>'}).join("")+'</div>';
      h+='<button class="btn" id="repAdd" style="margin-top:14px;width:100%"'+(n&&!busy?'':' disabled')+'>'+(busy?'Adding…':n?'Add '+n+' bill'+(n===1?'':'s')+' to '+mName:'Nothing new to add to '+mName)+'</button>';
    }
    if(filled.length)h+='<button class="addlink" id="repDel" style="margin:14px auto 0;display:block;color:var(--over)">Remove the '+filled.length+' filled in for '+mName+'</button>';
    s.innerHTML=h;
    s.querySelectorAll("[data-rk]").forEach(c=>c.onchange=()=>{if(c.checked)off.delete(c.dataset.rk);else off.add(c.dataset.rk);draw(s)});
    const add=s.querySelector("#repAdd");if(add)add.onclick=async()=>{if(busy)return;busy=true;draw(s);
      const txc=S.db.collection("tx"),now=new Date().toISOString(),jobs=[];
      reps.forEach(r=>{if(off.has(r.k))return;repDates(r,tgt,have).forEach(d=>{
        const body={amount:r.amount,type:"expense",merchant:r.merchant,itemId:r.itemId,itemName:r.itemName,groupName:r.groupName,sub:r.sub,date:d,note:"",createdAt:now,sched:true,rep:r.k};
        jobs.push(txc.newId?S.db.doc("tx/"+txc.newId()).set(body):txc.add(body))})});
      try{await Promise.all(jobs);closeSheet();toast("Added "+jobs.length+" bill"+(jobs.length===1?"":"s")+" to "+mName);render()}
      catch(e){busy=false;draw(s);toast("Couldn't add them. Check your connection and try again.")}};
    const del=s.querySelector("#repDel");if(del)del.onclick=async()=>{if(del.dataset.sure!=="1"){del.dataset.sure="1";del.textContent="Tap again to remove "+filled.length;return}
      try{await Promise.all(filled.map(t=>S.db.doc("tx/"+t.id).delete()));closeSheet();toast("Removed "+filled.length+" from "+mName);render()}
      catch(e){toast("Couldn't remove them. Try again.")}};
  };
  openSheet('',s=>{draw(s);repLoad().then(r=>{st=r;if(s.isConnected)draw(s)}).catch(()=>{if(s.isConnected){s.innerHTML='<div class="grab"></div><h3>Repeating transactions</h3><p class="note">Couldn\'t read your history. Check your connection and try again.</p>'}})});
}
function ordinal(n){const s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}
