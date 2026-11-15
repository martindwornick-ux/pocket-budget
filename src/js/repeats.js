/* ---------- Repeating transactions (Transactions tab → "Repeats") ----------
   Looks through the last REP_MONTHS finished months (plus this month so far) for expenses that come back every month:
   same merchant, at most once a month, in at least 3 of the last 4 months, still seen in the last 2, on about the same
   day (days within 6 of each other). You review the list, pick how far ahead, and it adds them as future transactions.
   Added ones carry sched:true and rep:<merchant key>. sched ones dated after today wait: they aren't auto-sent to the
   Finance Tracker sheet, aren't counted as "not in your sheet", and show "scheduled" (see waitSheet in core.js).
   "Remove filled-in" deletes future transactions that have rep set. Nothing is written until you tap Add. */
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
/* future dates for one repeat, from tomorrow through the end of month cur+ahead, skipping months that already have it */
function repDates(r,cur,ahead,have){const td=today(),out=[];
  for(let i=0;i<=ahead;i++){const ym=ymAdd(cur,i),d=ym+"-"+pad(Math.min(r.day,dimYm(ym)));if(d<=td)continue;if(have.has(ym+"|"+r.k))continue;out.push(d)}return out}
async function repLoad(){
  const cur=ymOf(today()),months=[];for(let i=REP_MONTHS;i>=1;i--)months.push(ymAdd(cur,-i));
  await Promise.all(months.map(ym=>IS.fresh[ym]?null:fetchMonth(ym)));
  const past=[];months.forEach(ym=>(IS.hist[ym]||[]).forEach(t=>past.push(t)));
  /* this month and everything after it, to know what's already there */
  const snap=await S.db.collection("tx").where("date",">=",cur+"-01").limit(3000).get();
  const ahead=snap.docs.map(d=>Object.assign({id:d.id},d.data()));
  const td=today(),reps=findRepeats(past,months);
  const have=new Set();ahead.forEach(t=>have.add(t.date.slice(0,7)+"|"+repKey(t)));
  const filled=ahead.filter(t=>t.rep&&t.date>td);
  return{cur,months,reps,have,filled};
}
function repeatsSheet(){
  if(!S.db||S.readOnly){toast("Sign in to fill in repeating transactions");return}
  let st=null,ahead=+(ls.get("pb.repAhead")||6),off=new Set(),busy=false;
  const draw=s=>{
    if(!st){s.innerHTML='<div class="grab"></div><h3>Repeating transactions</h3><p class="note">Looking through your last '+REP_MONTHS+' months…</p>'+SKEL;return}
    const {reps,filled,cur,have}=st;
    let n=0;reps.forEach(r=>{if(!off.has(r.k))n+=repDates(r,cur,ahead,have).length});
    let h='<div class="grab"></div><h3>Repeating transactions</h3>';
    if(!reps.length)h+='<p class="note">Nothing in your last '+REP_MONTHS+' months repeats on a steady monthly schedule yet.</p>';
    else{
      h+='<p class="note" style="margin:0 0 10px">Found '+reps.length+' that come back every month. Untick any you don\'t want, then pick how far ahead. They go to your Finance Tracker sheet on their date, not before.</p>';
      h+='<div class="seg" id="repAhead" style="margin:0 0 12px;grid-template-columns:repeat(3,1fr)">'+[3,6,12].map(k=>'<button data-ahead="'+k+'" aria-pressed="'+(k===ahead)+'">'+k+' months</button>').join("")+'</div>';
      h+='<div class="replist">'+reps.map(r=>{const c=repDates(r,cur,ahead,have).length;return '<label class="reprow"><input type="checkbox" data-rk="'+esc(r.k)+'"'+(off.has(r.k)?"":" checked")+'><span class="rl"><b>'+esc(r.merchant)+'</b><small>'+esc(r.itemName||"Uncategorized")+' · around the '+ordinal(r.day)+' · seen '+r.hits+' of '+r.of+' months'+(r.stable?'':' · amount varies, using the average')+(c?'':' · already filled in')+'</small></span><span class="ra num">'+money(r.amount)+'</span></label>'}).join("")+'</div>';
      h+='<button class="btn" id="repAdd" style="margin-top:14px;width:100%"'+(n&&!busy?'':' disabled')+'>'+(busy?'Adding…':n?'Add '+n+' upcoming transaction'+(n===1?'':'s'):'Nothing new to add')+'</button>';
    }
    if(filled.length)h+='<button class="addlink" id="repDel" style="margin:14px auto 0;display:block;color:var(--over)">Remove '+filled.length+' filled-in transaction'+(filled.length===1?'':'s')+'</button>';
    s.innerHTML=h;
    s.querySelectorAll("[data-ahead]").forEach(b=>b.onclick=()=>{ahead=+b.dataset.ahead;ls.set("pb.repAhead",String(ahead));draw(s)});
    s.querySelectorAll("[data-rk]").forEach(c=>c.onchange=()=>{if(c.checked)off.delete(c.dataset.rk);else off.add(c.dataset.rk);draw(s)});
    const add=s.querySelector("#repAdd");if(add)add.onclick=async()=>{if(busy)return;busy=true;draw(s);
      const txc=S.db.collection("tx"),now=new Date().toISOString(),jobs=[];
      reps.forEach(r=>{if(off.has(r.k))return;repDates(r,cur,ahead,have).forEach(d=>{
        const body={amount:r.amount,type:"expense",merchant:r.merchant,itemId:r.itemId,itemName:r.itemName,groupName:r.groupName,sub:r.sub,date:d,note:"",createdAt:now,sched:true,rep:r.k};
        jobs.push(txc.newId?S.db.doc("tx/"+txc.newId()).set(body):txc.add(body))})});
      try{await Promise.all(jobs);closeSheet();toast("Added "+jobs.length+" upcoming transaction"+(jobs.length===1?"":"s"));render()}
      catch(e){busy=false;draw(s);toast("Couldn't add them. Check your connection and try again.")}};
    const del=s.querySelector("#repDel");if(del)del.onclick=async()=>{if(del.dataset.sure!=="1"){del.dataset.sure="1";del.textContent="Tap again to remove "+filled.length;return}
      try{await Promise.all(filled.map(t=>S.db.doc("tx/"+t.id).delete()));closeSheet();toast("Removed "+filled.length+" filled-in transaction"+(filled.length===1?"":"s"));render()}
      catch(e){toast("Couldn't remove them. Try again.")}};
  };
  openSheet('',s=>{draw(s);repLoad().then(r=>{st=r;if(s.isConnected)draw(s)}).catch(()=>{if(s.isConnected){s.innerHTML='<div class="grab"></div><h3>Repeating transactions</h3><p class="note">Couldn\'t read your history. Check your connection and try again.</p>'}})});
}
function ordinal(n){const s=["th","st","nd","rd"],v=n%100;return n+(s[(v-20)%10]||s[v]||s[0])}
