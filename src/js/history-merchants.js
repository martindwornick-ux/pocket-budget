/* ---------- insights ---------- */
/* skeleton placeholders: soft shimmering shapes while earlier months load */
const SKEL='<div class="skel sk-line" role="status" aria-label="Loading earlier months"></div>';
const SKEL_BARS='<div class="skbars" role="status" aria-label="Loading earlier months">'+[62,88,45,74,30,55].map((v,i)=>'<i class="skel" style="height:'+v+'%;--d:'+(i*.08).toFixed(2)+'s"></i>').join("")+'</div>';
const PAL=["#4285f4","#ea4335","#fbbc04","#34a853","#a142f4","#24c1e0","#f538a0","#fa7b17","#1e8e3e","#185abc","#c5221f","#80868b"];
const IS={sub:ls.get("pb.isub")||"totals",range:+(ls.get("pb.irange")||6),group:"",item:"",hist:{},loading:{}};
function monthsBack(n){const [y,m]=S.ym.split("-").map(Number);const out=[];for(let i=n-1;i>=0;i--){const d=new Date(y,m-1-i,1);out.push(d.getFullYear()+"-"+pad(d.getMonth()+1))}return out}
function txOf(ym){return ym===S.ym?S.tx:(IS.hist[ym]||[])}
/* Past months are kept on the phone (IndexedDB "pb-hist") so Insights opens with them right away;
   each month is still re-checked once per launch in the background (IS.fresh). */
IS.fresh={};
const HDB={p:null,
  db(){if(!this.p)this.p=new Promise((ok,no)=>{try{const r=indexedDB.open("pb-hist",1);r.onupgradeneeded=()=>r.result.createObjectStore("m");r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)}catch(e){no(e)}});return this.p},
  put(ym,tx){this.db().then(d=>{try{d.transaction("m","readwrite").objectStore("m").put({tx,at:Date.now()},ym)}catch(_){}}).catch(()=>{})},
  all(){return this.db().then(d=>new Promise(ok=>{const out={};try{const st=d.transaction("m").objectStore("m"),r=st.openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return ok(out);out[c.key]=c.value&&c.value.tx||[];c.continue()};r.onerror=()=>ok(out)}catch(_){ok(out)}})).catch(()=>({}))}};
HDB.all().then(m=>{let n=0;Object.keys(m).forEach(ym=>{if(ym!==S.ym&&!IS.hist[ym]){IS.hist[ym]=m[ym];n++}});if(n){MV.ver++;if(MV.cb)MV.cb();if(S.tab==="insights")render()}});
function fetchMonth(ym){
  return Promise.all([S.db.collection("tx").where("date",">=",ym+"-01").where("date","<=",ym+"-31").limit(1000).get(),ym<HIST_BEFORE?S.db.doc("hist/"+ym).get().catch(()=>null):Promise.resolve(null),hlLoad(ym)])
    .then(([snap,hs])=>{const a=snap.docs.map(d=>Object.assign({id:d.id},d.data())).concat(hs&&hs.exists?histToTx(ym,hs.data()):[]);IS.hist[ym]=a;IS.fresh[ym]=true;HDB.put(ym,a);return a})
    .catch(()=>{IS.hist[ym]=IS.hist[ym]||[];return IS.hist[ym]})}
function loadHist(){
  if(!S.db)return;
  monthsBack(IS.range).forEach(ym=>{
    if(ym===S.ym||IS.fresh[ym]||IS.loading[ym])return;
    IS.loading[ym]=true;
    fetchMonth(ym).finally(()=>{IS.loading[ym]=false;if(S.tab==="insights")render()});
  });
}
function groupNameOf(t,ym){const f=findItem(groupsFor(ym),t.itemId);return f?f.g.name:(t.groupName||"Uncategorized")}
function itemNameOf(t,ym){if(isMisc(t)&&t.sub)return t.sub;const f=findItem(groupsFor(ym),t.itemId);return f?f.it.name:(t.itemName||"Uncategorized")}
/* ---------- Misc subcategories ---------- */
const MISC_ID="i-misc";
const SUB={list:["Pokémon & Cards","Hobbies & Music","Household & Shopping","Thrift & Secondhand","Home Repair","Clothing","Health & Personal Care","Gifts & Celebrations","Travel","Parking & Rides","Entertainment & Events","Tech & Subscriptions","Auto","Pets","Fees & Taxes","Other"],merchants:{}};
function isMisc(t){return t&&t.itemId===MISC_ID}
const merchKey=m=>String(m||"").toLowerCase().replace(/^\s*venmo\s*:\s*/,"").replace(/^\s*apple pay\s*:\s*/,"").trim();
function suggestSub(merchant){const k=merchKey(merchant);if(!k)return"";
  const mine=sortedTx().find(t=>isMisc(t)&&t.sub&&merchKey(t.merchant)===k);if(mine)return mine.sub;
  return SUB.merchants[k]||""}
/* ---------- merchant suggestions: past merchants from the last 12 months ---------- */
const MV={ver:0,cb:null};
function merchLoad(){
  if(!S.db)return;
  const [y,m]=today().split("-").map(Number);
  for(let i=0;i<12;i++){const d=new Date(y,m-1-i,1),ym=d.getFullYear()+"-"+pad(d.getMonth()+1);
    if(ym===S.ym||IS.fresh[ym]||IS.loading[ym])continue;IS.loading[ym]=true;
    fetchMonth(ym).finally(()=>{IS.loading[ym]=false;MV.ver++;if(MV.cb)MV.cb()});
  }
}
function merchIndex(){
  const seen=new Map();Object.values(IS.hist).forEach(a=>(a||[]).forEach(t=>seen.set(t.id,t)));S.tx.forEach(t=>seen.set(t.id,t));
  const by={},VPX=/^\s*venmo\s*:\s*/i;
  seen.forEach(t=>{const raw=String(t.merchant||"");const name=raw.replace(VPX,"").replace(/\s+/g," ").trim();
    {const nl=name.toLowerCase();if(nl&&(nl===String(t.itemName||"").trim().toLowerCase()||nl===String(t.sub||"").trim().toLowerCase()))return} /* saved with no merchant: not a real merchant */const k=name.toLowerCase();if(!k)return;
    const e=by[k]||(by[k]={name,n:0,d:""});e.n++;
    if((t.date||"")>=e.d){e.d=t.date||"";e.name=name;e.venmo=VPX.test(raw);e.itemId=t.itemId||"";e.itemName=t.itemName||"";e.sub=t.sub||""}});
  return Object.values(by);
}
function merchMatches(q){
  q=q.replace(/\s+/g," ").trim().toLowerCase();if(!q)return[];
  const now=Date.now();
  const out=merchIndex().map(e=>{const nm=e.name.toLowerCase();
    const r=nm.startsWith(q)?0:nm.split(/[^a-z0-9]+/).some(w=>w&&w.startsWith(q))?1:nm.includes(q)?2:-1;if(r<0)return null;
    const age=Math.max(0,(now-new Date((e.d||"2000-01-01")+"T12:00:00"))/864e5);
    return {e,r,score:e.n/(1+age/45)}}).filter(Boolean).sort((a,b)=>a.r-b.r||b.score-a.score).slice(0,5).map(x=>x.e);
  if(out.length===1&&out[0].name.toLowerCase()===q)return[];
  return out;
}
