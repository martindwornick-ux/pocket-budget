/* Appearance (Settings → Personal touches): light (default), dark, or match the iPhone ("auto") */
(function(){const m=localStorage.getItem("pb.theme")||"light",q=matchMedia("(prefers-color-scheme:dark)"),set=()=>{const d=m==="dark"||(m==="auto"&&q.matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");const mt=document.querySelector('meta[name="theme-color"]');if(mt)mt.setAttribute("content",d?"#000000":mt.dataset.light||mt.getAttribute("content"))};
  const mt=document.querySelector('meta[name="theme-color"]');if(mt&&!mt.dataset.light)mt.dataset.light=mt.getAttribute("content");set();if(m==="auto")q.addEventListener("change",set)})();
(function(){
const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
/* perf: formatters are expensive to create, so each one is built once and reused (same output as toLocaleString) */
const NF2=new Intl.NumberFormat("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}),NF0=new Intl.NumberFormat("en-US");
const DFC={};function dfmt(o){const k=JSON.stringify(o);return DFC[k]||(DFC[k]=new Intl.DateTimeFormat("en-US",o))}
const money=n=>(n<0?"-":"")+"$"+NF2.format(Math.abs(n));
const pad=n=>String(n).padStart(2,"0");
const today=()=>{const d=new Date();return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())};
const ymOf=d=>d.slice(0,7);
const uid=()=>Math.random().toString(36).slice(2,10)+Date.now().toString(36).slice(-4);
const round2=n=>Math.round(n*100)/100;
const parseAmt=s=>{const n=parseFloat(String(s).replace(/[^0-9.\-]/g,""));return isFinite(n)?round2(n):NaN};
const ls={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};

const S={ym:ymOf(today()),view:ls.get("pb.view")||"remaining",tab:"budget",budgets:{},budgetsLoaded:false,tx:[],txLoaded:false,db:null,dbState:"loading",readOnly:false};
let txUnsub=null, toastT=null;

function toast(msg){let t=$(".toast");if(!t){t=document.createElement("div");t.className="toast";t.setAttribute("role","status");document.body.appendChild(t)}t.textContent=msg;clearTimeout(toastT);toastT=setTimeout(()=>t.remove(),2200)}

/* ---------- budget model ---------- */
function templateFor(ym){
  const ids=Object.keys(S.budgets).sort();
  let prior=ids.filter(i=>i<ym).pop()||ids.filter(i=>i>ym)[0];
  return prior?JSON.parse(JSON.stringify(S.budgets[prior].groups||[])):null;
}
let PAD=null;
function incomeFor(ym){const inc=incomeForBase(ym);if(PAD&&PAD.kind==="income"&&PAD.ym===ym)return inc.map(x=>x.id===PAD.id?Object.assign({},x,{planned:padValue()/100}):x);return inc}
function incomeForBase(ym){const b=S.budgets[ym];if(b&&Array.isArray(b.income))return b.income;
  const ids=Object.keys(S.budgets).filter(i=>Array.isArray(S.budgets[i].income)).sort();
  const prior=ids.filter(i=>i<ym).pop()||ids.filter(i=>i>ym)[0];
  return prior?JSON.parse(JSON.stringify(S.budgets[prior].income)):[]}
const incomeTotal=inc=>round2(inc.reduce((a,x)=>a+(+x.planned||0),0));
function groupsFor(ym){const b=S.budgets[ym];const g=withCarry(b?(b.groups||[]):(templateFor(ym)||[]),ym);
  if(PAD&&PAD.kind==="item"&&PAD.ym===ym)return g.map(x=>Object.assign({},x,{items:x.items.map(it=>it.id===PAD.id?Object.assign({},it,{planned:padValue()/100}):it)}));
  return g}
/* Set aside for next month. One group (aside:true, shown as "Set aside for December") holds money planned from this
   month that's paid next month. It isn't spending this month (Remaining and $/day leave it out) and next month's
   Planned counts it as starting money (parts.fwd). In the first month, parts.fwm ("Already in bank") labels money that
   was already there for this month's bills. */
function asideItems(groups){const o=[];(groups||[]).forEach(g=>{if(g.aside)(g.items||[]).forEach(it=>o.push({g,it}))});return o}
function asideFor(ym){const b=S.budgets[ymAdd(ym,-1)];return b&&Array.isArray(b.groups)?asideItems(b.groups):[]}
function withCarry(groups,ym){
  /* move items from the short-lived per-item switch (ahead/once/from) into the group */
  if(!groups.some(g=>(g.items||[]).some(it=>it.ahead||it.once||it.from)))return groups;
  const ah=[],out=groups.map(g=>Object.assign({},g,{items:(g.items||[]).filter(it=>{if(it.from)return false;if(it.ahead){const c=Object.assign({},it);delete c.ahead;ah.push(c);return false}return true}).map(it=>{if(!it.once)return it;const c=Object.assign({},it);delete c.once;return c})}));
  if(ah.length){let a=out.find(g=>g.aside);if(!a){a={id:"g-aside",name:"Set aside",aside:true,items:[]};out.push(a)}a.items=a.items.concat(ah)}
  return out}
const nextMonthName=ym=>MONTHS[+ymAdd(ym||S.ym,1).slice(5)-1];
const groupLbl=(g,ym)=>g.aside?"Set aside for "+nextMonthName(ym):g.name;
const itemLbl=it=>it?it.name:"";
const itemNmHTML=it=>esc(it.name);
/* Optimistic writes: the database applies a write on the phone right away (and tells the listeners),
   then syncs it in the background. So sheets close at once and a failure shows up as a toast. */
const saveFail=e=>toast(e&&e.code==="quota_exceeded"?"Storage is full":"Couldn't save. Check your connection.");
function bgWrite(p){Promise.resolve(p).catch(saveFail)}
async function saveGroups(groups,income){
  if(!S.db||S.readOnly){toast("Saving isn't available here");return false}
  const body={groups,income:income||incomeFor(S.ym),updatedAt:new Date().toISOString()};
  S.budgets[S.ym]=Object.assign({},S.budgets[S.ym]||{},body);setTimeout(render,0);
  try{bgWrite(S.db.doc("budgets/"+S.ym).set(body));return true}catch(e){saveFail(e);return false}
}
function allItems(groups){const out=[];groups.forEach(g=>g.items.forEach(it=>out.push({g,it})));return out}
const sAmt=t=>t.type==="income"?0:(t.type==="refund"?-1:1)*(+t.amount||0);
function receivedMap(){const m={};S.tx.forEach(t=>{if(t.type==="income")m[t.itemId]=(m[t.itemId]||0)+(+t.amount||0)});return m}
function spentMap(){const m={};S.tx.forEach(t=>{m[t.itemId]=(m[t.itemId]||0)+sAmt(t)});return m}

/* ---------- Google Sheets link ---------- */
const SHEET={id:"1Mym1STy0HBwhCcBAao_-awzpPA4J9f5_QgrHN8pXFTQ",tabId:2026001,tab:"Transactions",row:11};
const SHEET_URL="https://docs.google.com/spreadsheets/d/"+SHEET.id+"/edit#gid="+SHEET.tabId;
let mcpP=null;const getMcp=()=>mcpP||(mcpP=(window.claude?.use?.("mcp")||Promise.resolve(null)).catch(()=>null));
const serial=d=>{const [y,m,dd]=d.split("-").map(Number);return Math.round((Date.UTC(y,m-1,dd)-Date.UTC(1899,11,30))/864e5)};
function sheetErrMsg(e){const c=e&&e.code;
  if(c==="not_configured")return"Set up Google Sheet sync (gear icon at the top), then tap Send to sheet.";
  if(c==="wrong_key")return"Your sheet script refused the key. Check Script key under gear icon → Google Sheet sync.";
  if(c==="tool_error")return"Google Sheets refused the row: "+(e.message||"").slice(0,120);
  return"Couldn't reach Google Sheets. Tap Send to sheet to try again.";}
async function pushToSheet(id,t,quiet){
  const mcp=await getMcp();
  if(!mcp){await markSheet(id,"failed","Google Sheets isn't available in this view.");return false}
  const row=sheetRow(t);
  if(mcp.pbAppend){ // standalone app: one call that won't double-add a row it already wrote
    try{await mcp.pbAppend(id,row);await markSheet(id,"synced","");return true}
    catch(e){await markSheet(id,"failed",sheetErrMsg(e));if(!quiet)toast("Saved here, not in your sheet yet");return false}
  }
  let inserted=false;
  try{
    await mcp.callTool("Google Sheets","insert_dimension",{spreadsheetId:SHEET.id,sheetId:SHEET.tabId,dimension:"ROWS",startIndex:SHEET.row-1,endIndex:SHEET.row,inheritFromBefore:false});
    inserted=true;
    await mcp.callTool("Google Sheets","update_values",{spreadsheetId:SHEET.id,range:SHEET.tab+"!A"+SHEET.row+":E"+SHEET.row,values:[row]});
    await markSheet(id,"synced","");return true;
  }catch(e){
    const msg=sheetErrMsg(e);
    await markSheet(id,"failed",msg);if(!quiet)toast("Saved here, not in your sheet yet");return false;
  }
}
function sheetRow(t){const inc=t.type==="refund"||t.type==="income",amt=round2((inc?1:-1)*(+t.amount||0));
  const who=t.person?(inc?"from ":"to ")+t.person:"";return[serial(t.date),t.merchant||"Purchase",t.itemName||"Misc",amt,[who,t.note||""].filter(Boolean).join(" · ")]}
function venmoPeople(){const seen={};txPool().forEach(t=>{[t.person,t.reimbFrom].forEach(p=>{if(p)seen[p]=(seen[p]||0)+1})});return Object.keys(seen).sort((a,b)=>seen[b]-seen[a]).slice(0,15)}
/* A row can land in the sheet even when the phone never hears back (signal drops,
   app goes to the background). Ask the sheet which "not in sheet" rows it already has. */
const RC=new Set();let rcBusy=false;
async function reconcileSheet(){
  if(rcBusy||S.readOnly||!S.db)return;const mcp=await getMcp();if(!mcp||!mcp.pbCheck)return;
  const list=S.tx.filter(t=>t.sheet!=="synced"&&!isHist(t)&&!RC.has(t.id));if(!list.length)return;
  rcBusy=true;list.forEach(t=>RC.add(t.id));
  try{const found=await mcp.pbCheck(list.map(t=>({id:t.id,row:sheetRow(t)})));for(const id of found||[])await markSheet(id,"synced","")}catch(e){}
  rcBusy=false;
}
/* Tesler's law: the app handles the sheet, not you. Unsent rows go up quietly in the background
   (on load, when the app comes back to the front, and when the phone gets signal back).
   Only the standalone app's append is safe to retry (it never adds a row twice), so only that path auto-sends.
   If a send fails, it stops and the Transactions tab shows one card with the reason and a Try again button. */
const AS={busy:false,last:0,fail:""};
async function autoSync(force){
  if(AS.busy||S.readOnly||!S.db||!S.txLoaded||S.fromCache)return;if(navigator.onLine===false)return;
  if(!force&&Date.now()-AS.last<60000)return;
  const mcp=await getMcp();const was0=AS.auto;AS.auto=!!(mcp&&mcp.pbAppend);if(was0!==AS.auto&&S.tab==="tx")render();if(!AS.auto)return;
  const list=S.tx.filter(t=>t.sheet!=="synced"&&!isHist(t)).sort((a,b)=>(a.date+(a.createdAt||"")).localeCompare(b.date+(b.createdAt||"")));if(!list.length){AS.fail="";return}
  AS.busy=true;AS.last=Date.now();
  try{await reconcileSheet()}catch(_){}
  let fail="";for(const t of list){const cur=S.tx.find(x=>x.id===t.id);if(!cur||cur.sheet==="synced")continue;
    if(!(await pushToSheet(t.id,cur,true))){const f=S.tx.find(x=>x.id===t.id);fail=(f&&f.sheetMsg)||"Couldn't reach your sheet.";break}}
  AS.busy=false;const was=AS.fail;AS.fail=fail;if(was!==fail&&S.tab==="tx")render();
}
addEventListener("online",()=>autoSync(true));
document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(()=>autoSync(),1500)});
async function markSheet(id,state,msg){try{await S.db.doc("tx/"+id).update({sheet:state,sheetMsg:msg})}catch(e){}}
function findItem(groups,id){for(const g of groups)for(const it of g.items)if(it.id===id)return{g,it};return null}

/* ---------- history from the Finance Tracker ----------
   Months before HIST_BEFORE come from the Transactions tab. They are stored one
   document per month (hist/YYYY-MM) and shown read-only; the sheet stays the record. */
const HIST_BEFORE="2026-10";
const EXTRA_G={id:"g-sheet-extra",name:"Other categories"};
const H={meta:null,metaLoaded:false,running:false,progress:"",err:""};
const MIDX={january:1,february:2,march:3,april:4,may:5,june:6,july:7,august:8,september:9,october:10,november:11,december:12,jan:1,feb:2,mar:3,apr:4,jun:6,jul:7,aug:8,sep:9,sept:9,oct:10,nov:11,dec:12};
function validYmd(y,m,d){return y>=1990&&y<=2100&&m>=1&&m<=12&&d>=1&&d<=31?y+"-"+pad(m)+"-"+pad(d):null}
function parseSheetDate(v){
  if(typeof v==="number"&&v>20000&&v<80000){const d=new Date(Date.UTC(1899,11,30)+Math.round(v)*864e5);return validYmd(d.getUTCFullYear(),d.getUTCMonth()+1,d.getUTCDate())}
  const s=String(v??"").trim();let m;
  if((m=s.match(/^(?:[A-Za-z]+,\s*)?([A-Za-z]+)\.?\s+(\d{1,2}),?\s+(\d{4})$/))){const mo=MIDX[m[1].toLowerCase()];return mo?validYmd(+m[3],mo,+m[2]):null}
  if((m=s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/))){let y=+m[3];if(y<100)y+=2000;return validYmd(y,+m[1],+m[2])}
  if((m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/)))return validYmd(+m[1],+m[2],+m[3]);
  if(/^\d{5}(\.\d+)?$/.test(s))return parseSheetDate(+s);
  return null}
function parseSheetAmt(v){if(typeof v==="number")return v;let s=String(v??"").trim();if(!s)return NaN;const neg=/^\(.*\)$/.test(s)||/^-/.test(s)||/^\$\s*-/.test(s);s=s.replace(/[^0-9.]/g,"");if(!s)return NaN;const n=parseFloat(s);return isNaN(n)?NaN:(neg?-n:n)}
const slug=s=>String(s).toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,40)||"misc";
function valuesOf(res){
  let p=res&&res.payload;
  if(typeof p==="string"){try{p=JSON.parse(p)}catch(e){p=null}}
  if(p&&Array.isArray(p.values))return p.values;
  const sc=res&&res.structuredContent;if(sc&&Array.isArray(sc.values))return sc.values;
  const tb=res&&Array.isArray(res.content)&&res.content.find(c=>c.type==="text");
  if(tb){try{const j=JSON.parse(tb.text);if(j&&Array.isArray(j.values))return j.values}catch(e){}}
  if(p&&typeof p==="object"&&"range" in p)return [];
  throw {code:"tool_error",message:"Unexpected reply from Google Sheets"};
}
const HL={}; // saved locations for history rows: HL[ym][rowIndex] = loc
function hlLoad(ym){if(!S.db||ym>=HIST_BEFORE||HL[ym])return Promise.resolve();return S.db.doc("hloc/"+ym).get().then(d=>{HL[ym]=d&&d.exists?(d.data().locs||{}):{}}).catch(()=>{HL[ym]=HL[ym]||{}})}
function histToTx(ym,data){
  const rows=data&&Array.isArray(data.rows)?data.rows:[];
  const L=HL[ym]||{};
  return rows.map((r,i)=>{const t={id:"h:"+ym+":"+i,source:"history",date:r.d,merchant:r.m,itemId:r.i,itemName:r.n,groupName:r.g,sub:r.s||"",amount:+r.a||0,type:r.t==="refund"?"refund":"expense",note:r.o||"",sheet:"synced",createdAt:""};if(L[i])t.loc=L[i];return t});
}
const isHist=t=>t&&t.source==="history";
async function retryOnce(fn){try{return await fn()}catch(e){if(e&&e.code==="unavailable"){await new Promise(r=>setTimeout(r,600+Math.random()*800));return fn()}throw e}}
async function importHistory(){
  if(H.running)return;
  if(!S.db||S.readOnly){toast("Only the owner can bring in history");return}
  const mcp=await getMcp();
  if(!mcp){H.err="Set up Google Sheet sync first (gear icon at the top).";render();return}
  H.running=true;H.err="";H.progress="Reading your Transactions tab…";render();
  try{
    const rows=[];const CH=1500;
    for(let start=11;start<40000;start+=CH){
      const res=await mcp.callTool("Google Sheets","get_values",{spreadsheetId:SHEET.id,range:SHEET.tab+"!A"+start+":E"+(start+CH-1)},{cache:false});
      const vals=valuesOf(res);rows.push(...vals);
      H.progress="Read "+rows.length.toLocaleString()+" rows from your sheet…";render();
      if(vals.length<CH)break;
    }
    const tpl=JSON.parse(JSON.stringify(groupsFor(HIST_BEFORE)));
    const byName={};tpl.forEach(g=>g.items.forEach(it=>{byName[String(it.name).trim().toLowerCase()]={id:it.id,name:it.name,g:g.name}}));
    const months={},extras={};let skipped=0,count=0;
    rows.forEach(r=>{
      r=Array.isArray(r)?r:[];
      const d=parseSheetDate(r[0]),a=parseSheetAmt(r[3]);
      if(!d||isNaN(a)||a===0){if(r.some(x=>String(x??"").trim()))skipped++;return}
      const ym=ymOf(d);if(ym>=HIST_BEFORE)return;
      const cat=String(r[2]??"").trim()||"Misc";
      const it=byName[cat.toLowerCase()]||{id:"x-"+slug(cat),name:cat,g:EXTRA_G.name,extra:true};
      if(it.extra)(extras[ym]=extras[ym]||{})[it.id]=it.name;
      (months[ym]=months[ym]||[]).push({d,m:String(r[1]??"").trim(),i:it.id,n:it.name,g:it.g,a:round2(Math.abs(a)),t:a>0?"refund":"expense",o:String(r[4]??"").trim()});
      count++;
    });
    const yms=Object.keys(months).sort();
    if(!yms.length)throw {code:"empty",message:"No rows before "+MONTHS[+HIST_BEFORE.slice(5)-1]+" "+HIST_BEFORE.slice(0,4)+" were found in your Transactions tab."};
    let done=0;const stamp=new Date().toISOString();
    for(const ym of yms){
      months[ym].sort((x,y)=>x.d<y.d?1:x.d>y.d?-1:0);
      await retryOnce(()=>S.db.doc("hist/"+ym).set({rows:months[ym],importedAt:stamp}));
      const ex=extras[ym]||{},exIds=Object.keys(ex);
      const b=S.budgets[ym];
      if(!b){
        const groups=JSON.parse(JSON.stringify(tpl));
        if(exIds.length)groups.push({id:EXTRA_G.id,name:EXTRA_G.name,items:exIds.map(id=>({id,name:ex[id],planned:0}))});
        await retryOnce(()=>S.db.doc("budgets/"+ym).set({groups,updatedAt:stamp,source:"history"}));
      }else if(exIds.length){
        const groups=JSON.parse(JSON.stringify(b.groups||[]));
        const have=new Set(allItems(groups).map(x=>x.it.id));const add=exIds.filter(id=>!have.has(id));
        if(add.length){let g=groups.find(x=>x.id===EXTRA_G.id);if(!g){g={id:EXTRA_G.id,name:EXTRA_G.name,items:[]};groups.push(g)}
          add.forEach(id=>g.items.push({id,name:ex[id],planned:0}));
          await retryOnce(()=>S.db.doc("budgets/"+ym).update({groups,updatedAt:stamp}))}
      }
      done++;if(done%4===0||done===yms.length){H.progress="Saved "+done+" of "+yms.length+" months…";render()}
    }
    await retryOnce(()=>S.db.doc("meta/history").set({importedAt:stamp,months:yms.length,rows:count,skipped,first:yms[0],last:yms[yms.length-1]}));
    IS.hist={};IS.loading={};
    toast("Brought in "+count.toLocaleString()+" transactions");
  }catch(e){
    const c=e&&e.code;
    H.err=c==="quota_exceeded"?"The app's storage is full, so not every month was saved.":c==="empty"?e.message:(c&&/^(not_configured|wrong_key|tool_error)$/.test(c))?sheetErrMsg(e).replace("tap Send to sheet","tap Bring in history"):"Something interrupted the import. Tap Bring in history to finish; months already saved stay put.";
  }finally{H.running=false;H.progress="";render()}
}
function historyCardHTML(){
  if(S.ym>=HIST_BEFORE||S.dbState!=="ok"||!H.metaLoaded)return "";
  if(H.running)return '<section class="card"><div class="chead"><h2>Bringing in your history</h2></div><p class="note" role="status" style="margin:4px 0 0">'+esc(H.progress)+'</p><p class="note" style="margin:8px 0 0">Keep this page open until it finishes.</p></section>';
  if(H.meta&&!H.err)return "";
  return '<section class="card"><div class="chead"><h2>'+(H.meta?"Finish bringing in history":"See this month from your Finance Tracker")+'</h2></div><p class="note" style="margin:4px 0 12px">Copies every transaction before '+MONTHS[+HIST_BEFORE.slice(5)-1]+' '+HIST_BEFORE.slice(0,4)+' from your Transactions tab into this app, so past months fill in.</p>'+(H.err?'<p class="note" style="color:var(--over);margin:0 0 12px">'+esc(H.err)+'</p>':'')+(S.readOnly?'<p class="note" style="margin:0">Only the owner can do this.</p>':'<div class="btnrow"><button class="btn" id="histImport">Bring in history</button></div>')+'</section>';
}
function histSheet(t){
  openSheet('<h3>'+esc(t.merchant||"Purchase")+'</h3><div class="amt num" style="justify-content:flex-start;font-size:36px">'+(t.type==="refund"?"+":"")+money(+t.amount||0)+'</div>'+
    '<p class="note" style="margin:0 0 6px">'+esc(fmtDay(t.date))+' · '+esc((t.itemName||"Uncategorized")+(t.sub?" · "+t.sub:""))+(t.note?" · "+esc(t.note):"")+'</p>'+
    '<div class="txs hsloc"><div class="tcard"><div class="trow lrow"><span>Location</span><input class="tin" id="h-loc" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" role="combobox" aria-autocomplete="list" aria-controls="h-lsug" aria-expanded="false" placeholder="Business, city" value="'+esc(locText(t.loc))+'">'+(LOC.ok()?'<button type="button" class="lgps" id="h-gps" aria-label="Use my current location">'+GPS_SVG+'</button>':'')+'</div><div class="msug lsug" id="h-lsug" role="listbox" hidden></div></div></div>'+
    '<p class="note" style="margin:10px 0 14px">From your Finance Tracker. To change the amount or category, edit the row in your Transactions tab. The location is kept here in the app.</p>'+
    '<div class="btnrow"><a class="btn sec" style="text-align:center;text-decoration:none" href="'+SHEET_URL+'" target="_blank" rel="noopener">Open Finance Tracker</a><button class="btn" id="hs-ok">Done</button></div>',
    s=>{const LF=locField(s,{input:s.querySelector("#h-loc"),sug:s.querySelector("#h-lsug"),gps:s.querySelector("#h-gps"),merchant:()=>t.merchant||"",date:()=>t.date,selfId:t.id,initial:t.loc,auto:false});
      s.querySelector("#hs-ok").onclick=async()=>{
        const l=LF.value(),before=JSON.stringify(t.loc?locText(t.loc):null),after=JSON.stringify(l?l.label:null);
        if(before!==after&&S.db&&!S.readOnly){const [,ym,ix]=t.id.split(":");
          try{const cur=Object.assign({},HL[ym]||{});if(l)cur[ix]=l;else delete cur[ix];await S.db.doc("hloc/"+ym).set({locs:cur,updatedAt:new Date().toISOString()});HL[ym]=cur;toast(l?"Location saved":"Location removed");if(IS.hist[ym])IS.hist[ym].forEach(x=>{if(x.id===t.id){if(l)x.loc=l;else delete x.loc}});S.tx.forEach(x=>{if(x.id===t.id){if(l)x.loc=l;else delete x.loc}});render()}
          catch(e){toast("Couldn't save the location");return}}
        closeSheet()}});
}

