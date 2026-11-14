/* Pocket Budget: standalone platform layer.
   Provides window.claude.use("db" | "user" | "mcp" | "downloads") on top of
   Firebase (your private database + email sign-in) and a Google Apps Script
   web app (your Finance Tracker sheet), so index.html runs unchanged. */
(function(){
"use strict";
const FB_VER="10.12.2";
const FB_SRC=["app","auth","firestore"].map(m=>"https://www.gstatic.com/firebasejs/"+FB_VER+"/firebase-"+m+"-compat.js");
const LS={get(k){try{return localStorage.getItem(k)}catch(e){return null}},set(k,v){try{v==null?localStorage.removeItem(k):localStorage.setItem(k,v)}catch(e){}}};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));

/* ---------- styles for the setup, sign-in and settings screens ---------- */
const css=`
.pbx-gate{position:fixed;inset:0;z-index:100;background:#fff;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:calc(env(safe-area-inset-top,0px) + 48px) 20px calc(env(safe-area-inset-bottom,0px) + 32px);font-family:"Hanken Grotesk",-apple-system,system-ui,sans-serif;color:#202124}
.pbx-gate::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(38% 28% at 8% 6%,rgba(66,133,244,.20),transparent 70%),radial-gradient(34% 26% at 96% 18%,rgba(234,67,53,.12),transparent 70%),radial-gradient(40% 30% at 88% 82%,rgba(52,168,83,.14),transparent 70%),radial-gradient(36% 26% at 6% 70%,rgba(251,188,4,.14),transparent 70%),#fff}
.pbx-box{width:100%;max-width:420px}
.pbx-logo{width:64px;height:64px;border-radius:16px;display:block;margin:0 0 18px;box-shadow:0 8px 24px rgba(26,115,232,.3)}
.pbx-box h1{font-family:"Hanken Grotesk","Avenir Next",system-ui,sans-serif;font-weight:800;font-size:30px;margin:0 0 6px;letter-spacing:-.01em}
.pbx-box p{margin:0 0 16px;font-size:16px;line-height:1.45;color:#5f6368}
.pbx-f{display:flex;flex-direction:column;gap:6px;margin:0 0 14px}
.pbx-f label{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#5f6368;font-weight:600}
.pbx-f input,.pbx-f textarea,.pbx-f select{font:inherit;font-size:17px;padding:13px 14px;border-radius:12px;border:1px solid rgba(60,64,67,.2);background:rgba(255,255,255,.85);color:#202124;width:100%;min-width:0}
.pbx-f textarea{font-family:ui-monospace,Menlo,monospace;font-size:13px;min-height:150px;resize:vertical}
.pbx-f input:focus,.pbx-f textarea:focus{outline:none;border-color:#1a73e8;box-shadow:0 0 0 3px rgba(26,115,232,.18)}
.pbx-btn{display:block;width:100%;padding:14px 16px;border-radius:14px;border:0;font:inherit;font-size:17px;font-weight:600;background:linear-gradient(150deg,#4285f4,#1a73e8);color:#fff;cursor:pointer;box-shadow:0 6px 18px rgba(26,115,232,.28)}
.pbx-btn:disabled{opacity:.55}
.pbx-btn.sec{background:rgba(60,64,67,.07);color:#202124;box-shadow:none}
.pbx-btn.danger{background:none;color:#d93025;border:1px solid rgba(60,64,67,.18);box-shadow:none}
.pbx-row{display:flex;gap:10px;margin-top:10px}.pbx-row>*{flex:1}
.pbx-link{background:none;border:0;font:inherit;font-size:16px;color:#1a73e8;font-weight:600;padding:12px 0;cursor:pointer}
.pbx-err{color:#d93025;font-size:15px;line-height:1.4;margin:0 0 12px;min-height:0}
.pbx-ok{color:#188038;font-size:15px;line-height:1.4;margin:0 0 12px}
.pbx-note{font-size:14px;color:#5f6368;line-height:1.45;margin:10px 0 0}
.pbx-scrim{position:fixed;inset:0;z-index:90;background:rgba(32,33,36,.28);display:flex;align-items:flex-end;justify-content:center;font-family:"Hanken Grotesk",-apple-system,system-ui,sans-serif;color:#202124}
.pbx-sheet{width:100%;max-width:640px;max-height:calc(100% - 40px);overflow:auto;background:rgba(255,255,255,.96);-webkit-backdrop-filter:saturate(180%) blur(30px);backdrop-filter:saturate(180%) blur(30px);border-radius:24px 24px 0 0;padding:12px 20px calc(24px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 40px rgba(0,0,0,.18);animation:pbxup .32s cubic-bezier(.32,.72,0,1)}
@keyframes pbxup{from{transform:translateY(100%)}}
@media (prefers-reduced-motion:reduce){.pbx-sheet{animation:none}}
.pbx-grab{width:42px;height:5px;border-radius:3px;background:rgba(60,64,67,.18);margin:0 auto 12px}
.pbx-sheet h2{font-family:"Hanken Grotesk","Avenir Next",system-ui,sans-serif;font-weight:800;font-size:22px;margin:0 0 14px}
.pbx-sec{background:#fff;border:1px solid rgba(60,64,67,.1);border-radius:18px;padding:16px;margin:0 0 12px;box-shadow:0 1px 2px rgba(60,64,67,.08)}
.pbx-sec h3{margin:0 0 4px;font-size:17px}
.pbx-sec>p{margin:0 0 12px;font-size:14px;color:#5f6368;line-height:1.45}
.pbx-pill{display:inline-block;font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px;margin-left:6px;vertical-align:2px}
.pbx-pill.on{background:rgba(24,128,56,.12);color:#188038}.pbx-pill.off{background:rgba(60,64,67,.08);color:#5f6368}
.pbx-prog{height:6px;border-radius:6px;background:rgba(60,64,67,.1);overflow:hidden;margin:10px 0 0}
.pbx-prog i{display:block;height:100%;width:0;background:#1a73e8;transition:width .2s}
.pbx-snap{display:flex;align-items:center;gap:8px;padding:9px 0;border-top:1px solid rgba(60,64,67,.1)}.pbx-snap:first-child{border-top:0}
.pbx-snapl{flex:1;min-width:0}.pbx-snapl b{display:block;font-size:15px}.pbx-snapl span{display:block;font-size:13px;color:#5f6368}
.pbx-mini{flex:none;min-height:36px;padding:0 12px;border-radius:10px;border:0;font:inherit;font-size:14px;font-weight:600;background:rgba(60,64,67,.07);color:#202124;cursor:pointer}
.pbx-mini.warn{color:#c5221f}.pbx-mini.warn[data-armed]{background:#c5221f;color:#fff}.pbx-mini:disabled{opacity:.5}
`;
function addStyle(){const s=document.createElement("style");s.textContent=css;document.head.appendChild(s)}

/* ---------- Firebase config ---------- */
const CFG_KEYS=["apiKey","authDomain","projectId","storageBucket","messagingSenderId","appId","measurementId"];
function parseConfig(text){
  const out={};const t=String(text||"");
  CFG_KEYS.forEach(k=>{const m=t.match(new RegExp('["\']?'+k+'["\']?\\s*:\\s*["\']([^"\']+)["\']'));if(m)out[k]=m[1].trim()});
  return out.apiKey&&out.projectId&&out.appId?out:null;
}
function storedConfig(){
  const c=window.PB_FIREBASE_CONFIG;if(c&&c.apiKey&&c.projectId)return c;
  try{const j=JSON.parse(LS.get("pb.fbconfig")||"null");if(j&&j.apiKey)return j}catch(e){}
  return null;
}

/* ---------- loading Firebase ---------- */
let fbP=null;
function loadScript(src){return new Promise((res,rej)=>{const s=document.createElement("script");s.src=src;s.onload=res;s.onerror=()=>rej(new Error("Couldn't load "+src));document.head.appendChild(s)})}
function loadFirebase(){return fbP||(fbP=FB_SRC.reduce((p,src)=>p.then(()=>loadScript(src)),Promise.resolve()).catch(e=>{fbP=null;throw e}))}

/* ---------- db adapter: same shape the app already uses, scoped to users/<uid>/ ---------- */
const P={app:null,auth:null,fs:null,user:null};
let dbResolve;const dbReady=new Promise(r=>dbResolve=r);
function wrapErr(e){const c=String(e&&e.code||"").replace(/^firestore\//,"");
  const err=new Error(e&&e.message||"Database error");
  err.code=c==="resource-exhausted"?"quota_exceeded":c==="unavailable"||c==="deadline-exceeded"?"unavailable":c||"unknown";return err}
const snapDoc=d=>({id:d.id,exists:d.exists,data:()=>d.data()||{}});
const snapQ=s=>({docs:s.docs.map(snapDoc),size:s.size,empty:s.empty});
function base(){return P.fs.collection("users").doc(P.user.uid)}
function query(ref){return{
  where(f,op,v){return query(ref.where(f,op,v))},
  orderBy(f,d){return query(ref.orderBy(f,d))},
  limit(n){return query(ref.limit(n))},
  get(){return ref.get().then(snapQ,e=>{throw wrapErr(e)})},
  onSnapshot(cb,err){return ref.onSnapshot(s=>cb(snapQ(s)),e=>err&&err(wrapErr(e)))},
}}
function docAPI(path){const [c,id]=String(path).split("/");const ref=base().collection(c).doc(id);return{
  id,
  get(){return ref.get().then(snapDoc,e=>{throw wrapErr(e)})},
  set(v){return ref.set(v).catch(e=>{throw wrapErr(e)})},
  update(v){return ref.update(v).catch(e=>{throw wrapErr(e)})},
  delete(){return ref.delete().catch(e=>{throw wrapErr(e)})},
  onSnapshot(cb,err){return ref.onSnapshot(d=>cb(snapDoc(d)),e=>err&&err(wrapErr(e)))},
}}
function collAPI(c){const ref=base().collection(c);return Object.assign(query(ref),{
  doc(id){return docAPI(c+"/"+id)},
  add(v){return ref.add(v).then(r=>({id:r.id}),e=>{throw wrapErr(e)})},
  newId(){return ref.doc().id}, /* id made on the phone, so a save can show up before the server answers */
})}
const DB={collection:collAPI,doc:docAPI};

/* ---------- Google Sheet link (Apps Script web app) ---------- */
const sheetCfg=()=>({url:LS.get("pb.sheetUrl")||"",key:LS.get("pb.sheetKey")||""});
async function callScript(body,cfg){
  cfg=cfg||sheetCfg();
  if(!cfg.url||!cfg.key){const e=new Error("Sheet sync isn't set up");e.code="not_configured";throw e}
  let r;
  try{r=await fetch(cfg.url,{method:"POST",body:JSON.stringify(Object.assign({key:cfg.key},body)),redirect:"follow"})}
  catch(x){const e=new Error("Network");e.code="network";throw e}
  let j=null;try{j=await r.json()}catch(x){}
  if(!j){const e=new Error("Your script didn't answer. Check the URL ends in /exec and access is Anyone.");e.code="tool_error";e.noAnswer=true;throw e}
  if(!j.ok){const e=new Error(j.error||"Refused");e.code=j.error==="wrong_key"?"wrong_key":"tool_error";
    if(j.error==="no_sheet")e.message="No tab named Transactions in that spreadsheet";throw e}
  return j;
}
const MCP={
  // append with the transaction id so a retry never adds the same row twice;
  // if the answer gets lost, ask the sheet whether the row made it before calling it a failure
  async pbAppend(id,row){
    try{return await callScript({action:"append",id,row})}
    catch(e){
      if(e.code!=="network"&&!e.noAnswer)throw e;
      await new Promise(r=>setTimeout(r,2500));
      try{const j=await callScript({action:"check",items:[{id,row}]});if((j.found||[]).includes(id))return{ok:true}}catch(_){}
      throw e;
    }
  },
  async pbCheck(items){try{const j=await callScript({action:"check",items});return j.found||[]}catch(e){return[]}},
  async callTool(server,tool,args){
  if(tool==="insert_dimension")return{ok:true};            // the script inserts and fills in one step
  if(tool==="update_values")return callScript({action:"append",row:(args.values||[])[0]||[]});
  if(tool==="get_values"){const j=await callScript({action:"get",range:args.range});return{structuredContent:{values:j.values||[]}}}
  const e=new Error("Unknown tool "+tool);e.code="tool_error";throw e;
}};

/* ---------- downloads ---------- */
function saveFile(name,data,type){
  const blob=new Blob([data],{type:type||"text/plain"});
  if(navigator.canShare&&navigator.share){try{const f=new File([blob],name,{type:blob.type});if(navigator.canShare({files:[f]}))return navigator.share({files:[f]}).catch(()=>{})}catch(e){}}
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=name;document.body.appendChild(a);a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);return Promise.resolve();
}
const DOWNLOADS={save({filename,data,mimeType}){return saveFile(filename,data,mimeType||(/\.csv$/i.test(filename)?"text/csv":"application/json"))}};

/* ---------- what the app asks for ---------- */
window.claude={use(k){
  if(k==="db")return dbReady;
  if(k==="user")return dbReady.then(()=>({isOwner:()=>Promise.resolve(true),profile:()=>Promise.resolve({name:P.user&&P.user.email})}));
  if(k==="mcp")return dbReady.then(()=>MCP);
  if(k==="downloads")return Promise.resolve(DOWNLOADS);
  return Promise.reject(Object.assign(new Error("Not available"),{code:"unavailable"}));
}};

/* ---------- screens ---------- */
let gate=null;
function showGate(html,bind){
  if(!gate){gate=document.createElement("div");gate.className="pbx-gate";gate.setAttribute("role","dialog");gate.setAttribute("aria-modal","true");document.body.appendChild(gate)}
  gate.innerHTML='<div class="pbx-box"><img class="pbx-logo" src="icon-192.png" alt="">'+html+'</div>';
  bind&&bind(gate);
}
function hideGate(){if(gate){gate.remove();gate=null}}
const authMsg=e=>{const c=e&&e.code||"";
  if(c==="auth/operation-not-allowed")return"Turn on Email/Password sign-in in Firebase (Authentication → Sign-in method).";
  if(c==="auth/invalid-credential"||c==="auth/wrong-password"||c==="auth/user-not-found"||c==="auth/invalid-login-credentials")return"That email and password don't match.";
  if(c==="auth/email-already-in-use")return"There's already an account with that email. Sign in instead.";
  if(c==="auth/weak-password")return"Use a password with at least 6 characters.";
  if(c==="auth/invalid-email")return"That doesn't look like an email address.";
  if(c==="auth/admin-restricted-operation")return"New accounts are turned off for this project.";
  if(c==="auth/network-request-failed")return"No connection. Check your internet and try again.";
  if(c==="auth/too-many-requests")return"Too many tries. Wait a minute and try again.";
  if(c==="auth/unauthorized-domain")return"Add this site's domain in Firebase → Authentication → Settings → Authorized domains.";
  if(c==="auth/api-key-not-valid.-please-pass-a-valid-api-key."||/api-key/.test(c))return"That Firebase config doesn't look right. Paste it again.";
  return(e&&e.message)||"Something went wrong.";};

function setupScreen(err){
  showGate('<h1>Set up Pocket Budget</h1><p>Paste the <b>firebaseConfig</b> block from your Firebase project settings. You only do this once on each device.</p>'+
    (err?'<p class="pbx-err">'+esc(err)+'</p>':'')+
    '<div class="pbx-f"><label for="pbx-cfg">Firebase config</label><textarea id="pbx-cfg" spellcheck="false" autocapitalize="off" autocorrect="off" placeholder="const firebaseConfig = {&#10;  apiKey: &quot;…&quot;,&#10;  authDomain: &quot;…&quot;,&#10;  projectId: &quot;…&quot;,&#10;  …&#10;};"></textarea></div>'+
    '<button class="pbx-btn" id="pbx-go">Continue</button>',
    g=>{g.querySelector("#pbx-go").onclick=()=>{const c=parseConfig(g.querySelector("#pbx-cfg").value);
      if(!c){setupScreen("Couldn't find apiKey, projectId and appId in that. Copy the whole block and try again.");return}
      LS.set("pb.fbconfig",JSON.stringify(c));start()}});
}
function loginScreen(mode,msg,isErr){
  const signup=mode==="signup";
  showGate('<h1>'+(signup?"Create your account":"Sign in")+'</h1><p>'+(signup?"This is your Pocket Budget login on any device. Only you can see your budget.":"Your budget is waiting.")+'</p>'+
    (msg?'<p class="'+(isErr===false?"pbx-ok":"pbx-err")+'" role="status">'+esc(msg)+'</p>':'')+
    '<form id="pbx-form"><div class="pbx-f"><label for="pbx-em">Email</label><input id="pbx-em" type="email" autocomplete="username" autocapitalize="off" inputmode="email" required></div>'+
    '<div class="pbx-f"><label for="pbx-pw">Password</label><input id="pbx-pw" type="password" autocomplete="'+(signup?"new-password":"current-password")+'" minlength="6" required></div>'+
    '<button class="pbx-btn" id="pbx-sub" type="submit">'+(signup?"Create account":"Sign in")+'</button></form>'+
    '<button class="pbx-link" id="pbx-sw">'+(signup?"Have an account? Sign in":"First time? Create an account")+'</button>'+
    (signup?'':'<br><button class="pbx-link" id="pbx-fp" style="padding-top:0">Forgot password?</button>')+
    '<p class="pbx-note">Wrong project? <button class="pbx-link" id="pbx-reset" style="padding:0;font-size:14px">Paste a different Firebase config</button></p>',
    g=>{
      const em=g.querySelector("#pbx-em"),pw=g.querySelector("#pbx-pw"),sub=g.querySelector("#pbx-sub");
      const last=LS.get("pb.lastEmail");if(last)em.value=last;setTimeout(()=>(em.value?pw:em).focus(),50);
      g.querySelector("#pbx-form").onsubmit=async e=>{e.preventDefault();sub.disabled=true;sub.textContent=signup?"Creating…":"Signing in…";
        LS.set("pb.lastEmail",em.value.trim());
        try{if(signup)await P.auth.createUserWithEmailAndPassword(em.value.trim(),pw.value);else await P.auth.signInWithEmailAndPassword(em.value.trim(),pw.value)}
        catch(x){loginScreen(mode,authMsg(x))}};
      g.querySelector("#pbx-sw").onclick=()=>loginScreen(signup?"signin":"signup");
      const fp=g.querySelector("#pbx-fp");if(fp)fp.onclick=async()=>{const v=em.value.trim();if(!v){loginScreen("signin","Type your email first, then tap Forgot password.");return}
        try{await P.auth.sendPasswordResetEmail(v);loginScreen("signin","Check "+v+" for a link to reset your password.",false)}catch(x){loginScreen("signin",authMsg(x))}};
      g.querySelector("#pbx-reset").onclick=()=>{LS.set("pb.fbconfig",null);location.reload()};
    });
}

/* ---------- backup import / export ---------- */
const COLLS=["budgets","tx","hist","meta"];
async function importBackup(file,onProgress){
  const text=await file.text();let j;
  try{j=JSON.parse(text)}catch(e){throw new Error("That file isn't a Pocket Budget backup.")}
  const cols=j&&j.collections;if(!cols||typeof cols!=="object")throw new Error("That file isn't a Pocket Budget backup.");
  const writes=[];COLLS.forEach(c=>Object.entries(cols[c]||{}).forEach(([id,data])=>{if(id&&data&&typeof data==="object")writes.push([c,id,data])}));
  if(!writes.length)throw new Error("That backup is empty.");
  let done=0;const B=base();
  for(let i=0;i<writes.length;i+=200){
    const batch=P.fs.batch();
    writes.slice(i,i+200).forEach(([c,id,data])=>batch.set(B.collection(c).doc(id),data));
    await batch.commit().catch(e=>{throw wrapErr(e)});
    done=Math.min(writes.length,i+200);onProgress&&onProgress(done,writes.length);
  }
  return writes.length;
}
async function buildBackup(){
  const B=base(),out={};
  for(const c of COLLS){const s=await B.collection(c).get();out[c]={};s.docs.forEach(d=>out[c][d.id]=d.data())}
  const d=new Date(),stamp=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  const count=COLLS.reduce((a,c)=>a+Object.keys(out[c]).length,0);
  return {name:"pocket-budget-backup-"+stamp+".json",json:JSON.stringify({app:"pocket-budget",version:2,exported:stamp,collections:out}),count};
}
async function exportBackup(){const b=await buildBackup();await saveFile(b.name,b.json,"application/json")}
/* ---------- weekly backup to Google Drive, through the same Apps Script as sheet sync ---------- */
const DRIVE_EVERY=7*864e5;
async function driveBackup(pre){const b=pre||await buildBackup();const j=await callScript({action:"backup",name:b.name,data:b.json});
  LS.set("pb.driveAt",String(Date.now()));LS.set("pb.driveUrl",j.url||"");LS.set("pb.driveErr",null);return j}
function driveStatus(){const at=+LS.get("pb.driveAt")||0,err=LS.get("pb.driveErr");
  if(err==="script")return "Your sheet script needs the backup update (see the note from Claude).";
  if(err)return "Last try didn't work. It'll try again tomorrow.";
  if(!at)return "No Drive backup yet.";
  const d=new Date(at);return "Last backup "+d.toLocaleDateString("en-US",{month:"short",day:"numeric"})+" · next one about "+new Date(at+DRIVE_EVERY).toLocaleDateString("en-US",{month:"short",day:"numeric"})}
/* ---------- copies kept on this phone (IndexedDB "pb-backups"), independent of Google ----------
   A full copy is saved about once a day when the app opens (the last 7 are kept), and a safety copy
   is saved before every restore (the last 3 are kept). Stored gzipped. Restore uses the same import
   as a backup file: records in the copy are put back, anything added since stays. */
const SNAP_EVERY=20*36e5,SNAP_KEEP={daily:7,"before-restore":3},STALE_DRIVE=14*864e5;
function snapDB(){return new Promise((ok,no)=>{if(!window.indexedDB){no(new Error("This browser can't keep copies."));return}
  const r=indexedDB.open("pb-backups",1);r.onupgradeneeded=()=>{const s=r.result.createObjectStore("snaps",{keyPath:"id"});s.createIndex("uid","uid")};
  r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error||new Error("Couldn't open the phone's storage."))})}
function snapReq(mode,fn){return snapDB().then(db=>new Promise((ok,no)=>{const t=db.transaction("snaps",mode);let out;
  const r=fn(t.objectStore("snaps"));if(r)r.onsuccess=()=>{out=r.result};
  t.oncomplete=()=>{db.close();ok(out)};t.onerror=t.onabort=()=>{db.close();no(t.error||new Error("The phone's storage refused the copy (it may be full)."))}}))}
async function packJSON(s){
  if(window.CompressionStream)try{const ab=await new Response(new Blob([s]).stream().pipeThrough(new CompressionStream("gzip"))).arrayBuffer();return{gz:true,data:ab}}catch(e){}
  return{gz:false,data:s}}
async function unpackJSON(rec){return rec.gz?new Response(new Blob([rec.data]).stream().pipeThrough(new DecompressionStream("gzip"))).text():rec.data}
async function snapList(){if(!P.user)return[];const all=await snapReq("readonly",st=>st.index("uid").getAll(P.user.uid));return(all||[]).sort((a,b)=>b.at-a.at||(b.kind==="before-restore")-(a.kind==="before-restore"))}
async function snapSave(kind,b){
  const uid=P.user.uid,at=Date.now(),pk=await packJSON(b.json);
  await snapReq("readwrite",st=>st.put({id:uid+":"+at+":"+Math.random().toString(36).slice(2,8),uid,kind,at,count:b.count,bytes:b.json.length,gz:pk.gz,data:pk.data}));
  const old=(await snapList()).filter(s=>s.kind===kind).slice(SNAP_KEEP[kind]||7);
  if(old.length)await snapReq("readwrite",st=>{old.forEach(s=>st.delete(s.id))});
}
// Every restore makes a safety copy of what's in the account first. If that copy can't be made (offline, storage full), nothing is changed.
async function restoreFrom(text,onProgress){
  let safe;try{safe=await buildBackup()}catch(e){throw new Error("Couldn't make a safety copy first, so nothing was changed. Check your connection and try again.")}
  try{await snapSave("before-restore",safe)}catch(e){throw new Error("Couldn't save a safety copy on this phone first, so nothing was changed. ("+(e.message||e)+")")}
  return importBackup({text:async()=>text},onProgress);
}
// Runs when the app opens or comes back to the screen. Reads the account once and uses it for both the phone copy and the weekly Drive copy.
let backupBusy=false;
async function autoBackup(){
  if(!P.user||backupBusy||navigator.onLine===false)return;
  const uid=P.user.uid,now=Date.now(),c=sheetCfg();
  const snapDue=now-(+LS.get("pb.snapAt:"+uid)||0)>=SNAP_EVERY;
  const driveDue=!!(c.url&&c.key)&&now-(+LS.get("pb.driveAt")||0)>=DRIVE_EVERY&&now-(+LS.get("pb.driveTry")||0)>=864e5;
  if(snapDue||driveDue){backupBusy=true;try{
    const b=await buildBackup();
    if(snapDue)try{await snapSave("daily",b);LS.set("pb.snapAt:"+uid,String(now));LS.set("pb.snapErr",null)}catch(e){LS.set("pb.snapErr",String(e&&e.message||e))}
    if(driveDue){LS.set("pb.driveTry",String(now));try{await driveBackup(b)}catch(e){LS.set("pb.driveErr",e&&e.message==="unknown_action"?"script":"fail")}}
  }catch(e){}finally{backupBusy=false}}
  staleWarn();
}
// Drive backups fail quietly (an old sheet script, an expired Google login). Say so on screen, at most every 3 days.
function staleWarn(){const c=sheetCfg();if(!(c.url&&c.key))return;
  const at=+LS.get("pb.driveAt")||0,since=+LS.get("pb.driveSince")||0,now=Date.now();
  if(!since)LS.set("pb.driveSince",String(now));            // when Drive backup was first expected on this phone
  const ref=at||since||now;if(now-ref<STALE_DRIVE||now-(+LS.get("pb.staleWarnAt")||0)<3*864e5)return;
  LS.set("pb.staleWarnAt",String(now));
  toast(at?"Google Drive backup hasn't worked since "+new Date(at).toLocaleDateString("en-US",{month:"short",day:"numeric"})+". Copies on this phone are still kept. See Settings → Backup.":"Google Drive backup hasn't worked yet. Copies on this phone are still kept. See Settings → Backup.",6500)}
function fmtWhen(at){const d=new Date(at),td=new Date();const day=d.toDateString()===td.toDateString()?"Today":d.toDateString()===new Date(td-864e5).toDateString()?"Yesterday":d.toLocaleDateString("en-US",{weekday:"short",month:"short",day:"numeric"});
  return day+", "+d.toLocaleTimeString("en-US",{hour:"numeric",minute:"2-digit"})}
async function snapUI(sc){
  const box=sc.querySelector("[data-pbx-snaps]");if(!box)return;
  let list;try{list=await snapList()}catch(e){box.innerHTML='<p class="pbx-err">'+esc(e.message||"Couldn't read the copies on this phone.")+'</p>';return}
  const err=LS.get("pb.snapErr");
  if(!list.length){box.innerHTML='<p class="pbx-note" style="margin:0">No copies on this phone yet. The first one is made a few seconds after the app opens online.'+(err?'<br><span class="pbx-err">Last try didn\'t work: '+esc(err)+'</span>':'')+'</p><button class="pbx-btn sec" data-snapnow style="margin-top:10px">Make a copy now</button>';}
  else box.innerHTML=(err?'<p class="pbx-err" style="margin:0 0 8px">Last daily copy didn\'t save: '+esc(err)+'</p>':'')+list.map(s=>'<div class="pbx-snap"><div class="pbx-snapl"><b>'+esc(fmtWhen(s.at))+'</b><span>'+(s.kind==="before-restore"?"Safety copy before a restore · ":"")+(s.count!=null?Number(s.count).toLocaleString("en-US")+" records · ":"")+Math.max(1,Math.round(s.bytes/1024)).toLocaleString("en-US")+' KB</span></div>'+
      '<button class="pbx-mini" data-snapsave="'+esc(s.id)+'">Save file</button><button class="pbx-mini warn" data-snaprest="'+esc(s.id)+'">Restore</button></div>').join("")+
      '<button class="pbx-btn sec" data-snapnow style="margin-top:10px">Make a copy now</button><p class="pbx-note" data-snapstat></p>';
  const say=(t,ok)=>{const st=box.querySelector("[data-snapstat]");if(st){st.className=ok===true?"pbx-ok":ok===false?"pbx-err":"pbx-note";st.textContent=t}else toast(t)};
  const now=box.querySelector("[data-snapnow]");if(now)now.onclick=async()=>{now.disabled=true;now.textContent="Making a copy…";
    try{const b=await buildBackup();await snapSave("daily",b);LS.set("pb.snapAt:"+P.user.uid,String(Date.now()));LS.set("pb.snapErr",null);await snapUI(sc)}
    catch(e){now.disabled=false;now.textContent="Make a copy now";say(navigator.onLine===false?"You're offline. Copies need a connection to read your account.":"Couldn't make a copy: "+(e.message||e),false)}};
  box.querySelectorAll("[data-snapsave]").forEach(b=>b.onclick=async()=>{const s=list.find(x=>x.id===b.dataset.snapsave);if(!s)return;
    try{const d=new Date(s.at),stamp=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");await saveFile("pocket-budget-backup-"+stamp+".json",await unpackJSON(s),"application/json")}
    catch(e){say("Couldn't save that copy: "+(e.message||e),false)}});
  box.querySelectorAll("[data-snaprest]").forEach(b=>b.onclick=async()=>{const s=list.find(x=>x.id===b.dataset.snaprest);if(!s)return;
    // two taps: the first one asks
    if(!b.dataset.armed){box.querySelectorAll("[data-snaprest]").forEach(x=>{delete x.dataset.armed;x.textContent="Restore"});b.dataset.armed="1";b.textContent="Tap to confirm";
      say("Restoring puts back everything in the "+fmtWhen(s.at)+" copy. Anything added since stays. A safety copy of how things are now is saved first.",null);
      setTimeout(()=>{if(b.dataset.armed){delete b.dataset.armed;b.textContent="Restore"}},6000);return}
    delete b.dataset.armed;box.querySelectorAll("button").forEach(x=>x.disabled=true);b.textContent="Restoring…";
    try{const n=await restoreFrom(await unpackJSON(s),(d,t)=>say("Making the safety copy, then putting back "+d+" of "+t+" records…",null));
      await snapUI(sc);say("Put back "+Number(n).toLocaleString("en-US")+" records from the "+fmtWhen(s.at)+" copy. A safety copy of how things were is at the top of this list.",true)}
    catch(e){box.querySelectorAll("button").forEach(x=>x.disabled=false);b.textContent="Restore";say(e.code==="permission-denied"?"Your database refused access.":e.message||"Restore failed.",false)}});
}
function importUI(root,{onDone}){
  root.querySelector("[data-pbx-file]").addEventListener("change",async e=>{
    const f=e.target.files&&e.target.files[0];if(!f)return;
    const st=root.querySelector("[data-pbx-status]"),pr=root.querySelector("[data-pbx-prog]"),btn=root.querySelector("[data-pbx-pick]");
    btn.disabled=true;st.className="pbx-note";st.textContent="Reading "+f.name+"…";pr.hidden=false;
    try{st.textContent="Saving a safety copy of how things are now…";const n=await restoreFrom(await f.text(),(d,t)=>{pr.firstChild.style.width=(d/t*100).toFixed(0)+"%";st.textContent="Copied "+d+" of "+t+" records…"});
      st.className="pbx-ok";st.textContent="Brought in "+n+" records. A safety copy of how things were is under On this phone.";onDone&&onDone(n);const sc2=root.querySelector("[data-pbx-snaps]");if(sc2)snapUI(root)}
    catch(x){st.className="pbx-err";st.textContent=(x.code==="permission-denied"?"Your database refused access. Publish the Firestore rules, then try again.":x.message||"Import failed.");btn.disabled=false;pr.hidden=true}
    e.target.value="";
  });
  root.querySelector("[data-pbx-pick]").onclick=()=>root.querySelector("[data-pbx-file]").click();
}
const importBlock='<input type="file" accept=".json,application/json" data-pbx-file hidden><button class="pbx-btn" data-pbx-pick>Choose backup file</button><div class="pbx-prog" data-pbx-prog hidden><i></i></div><p class="pbx-note" data-pbx-status></p>';

function firstRunScreen(){
  showGate('<h1>Bring in your budget</h1><p>Pick <b>pocket-budget-backup.json</b> from the Files app. It copies your budgets, transactions, history and Misc subcategories into your account.</p>'+importBlock+
    '<button class="pbx-link" id="pbx-skip">Start with an empty budget</button>',
    g=>{importUI(g,{onDone:()=>{LS.set("pb.firstRunDone:"+P.user.uid,"1");setTimeout(hideGate,900)}});
      g.querySelector("#pbx-skip").onclick=()=>{LS.set("pb.firstRunDone:"+P.user.uid,"1");hideGate()}});
}

/* ---------- privacy check: are the Firestore rules really locked to the owner? ----------
   Reads only. Probes a made-up account id ("pb-lock-probe"), which holds no data, so nothing private is ever fetched.
   ok:true = both outsiders refused; ok:false = something was let in; ok:null = couldn't tell (offline etc.). */
async function lockCheck(){
  const cfg=storedConfig(),PROBE="pb-lock-probe";
  if(!P.fs||!P.user||!cfg)return{ok:null,msg:"Sign in first, then run the check."};
  try{await base().collection("tx").limit(1).get({source:"server"})}
  catch(e){return{ok:null,msg:e&&e.code==="permission-denied"?"Your own account was refused, so the rules need attention: paste firestore.rules into Firebase → Firestore → Rules.":"Couldn't reach the database. Check your connection and try again."}}
  let other;                                     // a different signed-in account's area
  try{await P.fs.collection("users").doc(PROBE).collection("tx").limit(1).get({source:"server"});other="open"}
  catch(e){other=e&&e.code==="permission-denied"?"locked":"unknown"}
  let anon;                                      // nobody signed in at all
  try{const r=await fetch("https://firestore.googleapis.com/v1/projects/"+encodeURIComponent(cfg.projectId)+"/databases/(default)/documents/users/"+PROBE+"/tx?pageSize=1&key="+encodeURIComponent(cfg.apiKey));
    anon=r.status===403||r.status===401?"locked":r.ok?"open":"unknown"}
  catch(e){anon="unknown"}
  if(anon==="open")return{ok:false,msg:"Not locked: anyone on the internet can read budgets without signing in. Paste firestore.rules into Firebase → Firestore → Rules and Publish."};
  if(other==="open")return{ok:false,msg:"Not locked: any signed-in account can read other accounts' budgets. Paste firestore.rules into Firebase → Firestore → Rules and Publish."};
  if(anon==="locked"&&other==="locked")return{ok:true,msg:"Locked. A stranger and a different account were both refused; only you can read your budget."};
  return{ok:null,msg:"Partly checked: "+(other==="locked"?"a different account was refused":"the different-account test didn't finish")+"; "+(anon==="locked"?"a stranger was refused":"the signed-out test didn't finish")+". Try again on a good connection."};
}

/* ---------- settings sheet (gear in the header) ---------- */
function closeSettings(){const s=document.querySelector(".pbx-scrim");if(s)s.remove();document.body.style.overflow=""}
function openSettings(){
  closeSettings();const cfg=sheetCfg();const on=!!(cfg.url&&cfg.key);
  const sc=document.createElement("div");sc.className="pbx-scrim";
  sc.innerHTML='<div class="pbx-sheet" role="dialog" aria-modal="true" aria-label="Settings"><div class="pbx-grab"></div><h2>Settings</h2>'+
    '<section class="pbx-sec"><h3>Google Sheet sync <span class="pbx-pill '+(on?"on":"off")+'">'+(on?"On":"Off")+'</span></h3><p>New transactions are added at row 11 of the Transactions tab in your Finance Tracker.</p>'+
      '<div class="pbx-f"><label for="pbx-url">Web app URL</label><input id="pbx-url" type="url" inputmode="url" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="https://script.google.com/macros/s/…/exec" value="'+esc(cfg.url)+'"></div>'+
      '<div class="pbx-f"><label for="pbx-key">Script key</label><input id="pbx-key" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="From the KEY line in apps-script.gs" value="'+esc(cfg.key)+'"></div>'+
      '<p data-pbx-sstat class="pbx-note" style="margin:0 0 10px"></p>'+
      '<div class="pbx-row" style="margin-top:0"><button class="pbx-btn sec" id="pbx-test">Test</button><button class="pbx-btn" id="pbx-save">Save</button></div></section>'+
    '<section class="pbx-sec"><h3>Place search <span class="pbx-pill '+(LS.get("pb.gplacesKey")||LS.get("pb.mapboxToken")?"on":"off")+'">'+(LS.get("pb.gplacesKey")?"Google":LS.get("pb.mapboxToken")?"Mapbox":"Basic")+'</span></h3><p>Paste a Google Places API key for Google Maps–quality business search. It stays on this phone. The app also stops itself at '+(LS.get("pb.gplacesDaily")||"100")+' searches a day.</p>'+
      '<div class="pbx-f"><label for="pbx-gpk">Google Places key</label><input id="pbx-gpk" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="AIza…" value="'+esc(LS.get("pb.gplacesKey")||"")+'"></div>'+
      '<p data-pbx-gstat class="pbx-note" style="margin:0 0 10px"></p><div class="pbx-row" style="margin-top:0;margin-bottom:14px"><button class="pbx-btn" id="pbx-gsave">Save</button></div>'+
      '<p style="margin:0 0 8px;font-size:14px;color:#5f6368">Or a free Mapbox public token (starts with <b>pk.</b>), used when there\'s no Google key.</p>'+
      '<div class="pbx-f"><label for="pbx-mbx">Mapbox token</label><input id="pbx-mbx" autocapitalize="off" autocorrect="off" spellcheck="false" placeholder="pk.eyJ1Ijoi…" value="'+esc(LS.get("pb.mapboxToken")||"")+'"></div>'+
      '<p data-pbx-mstat class="pbx-note" style="margin:0 0 10px"></p><div class="pbx-row" style="margin-top:0"><button class="pbx-btn" id="pbx-msave">Save</button></div></section>'+
    '<section class="pbx-sec"><h3>Backup</h3><p>Save a copy of everything, or bring in a backup file. Importing replaces records with the same month or ID and keeps the rest.</p>'+
      '<button class="pbx-btn sec" id="pbx-exp">Save a backup</button><div style="height:10px"></div>'+importBlock+
      '<h3 style="margin-top:16px">On this phone</h3><p>A full copy is also kept on this phone every day, even without Google. The last 7 are kept, plus a safety copy made before every restore. They stay if the account is changed or emptied, but not if the app is deleted from the phone.</p><div data-pbx-snaps><p class="pbx-note" style="margin:0">Loading…</p></div>'+
      '<h3 style="margin-top:16px">Google Drive</h3><p>Every week a backup is saved automatically to the <b>Pocket Budget Backups</b> folder in your Google Drive. The last 8 are kept.</p><p data-pbx-dstat class="pbx-note" style="margin:0 0 10px">'+esc(driveStatus())+'</p>'+
      '<div class="pbx-row" style="margin-top:0"><button class="pbx-btn sec" id="pbx-drive">Back up to Drive now</button>'+(LS.get("pb.driveUrl")?'<a class="pbx-btn sec" style="text-align:center;text-decoration:none" href="'+esc(LS.get("pb.driveUrl"))+'" target="_blank" rel="noopener">Open latest</a>':'')+'</div></section>'+
    '<section class="pbx-sec"><h3>Notifications <span class="pbx-pill" data-pbx-npill></span></h3><p>Check that Pocket Budget can show notifications on this phone.</p>'+
      '<p data-pbx-nstat class="pbx-note" style="margin:0 0 10px"></p>'+
      '<div class="pbx-row" style="margin-top:0"><button class="pbx-btn sec" id="pbx-ntest">Send test now</button><button class="pbx-btn sec" id="pbx-nlater">Test in 10 sec</button></div></section>'+
    '<section class="pbx-sec"><h3>Personal touches</h3><div class="pbx-f"><label for="pbx-name">Your first name</label><input id="pbx-name" autocomplete="given-name" placeholder="Shown in the greeting" value="'+esc(localStorage.getItem("pb.name")||"")+'"></div>'+
      '<div class="pbx-f"><label for="pbx-theme">Appearance</label><select id="pbx-theme">'+[["light","Light"],["dark","Dark (true black)"],["auto","Match iPhone"]].map(o=>'<option value="'+o[0]+'"'+((localStorage.getItem("pb.theme")||"light")===o[0]?" selected":"")+'>'+o[1]+'</option>').join("")+'</select></div>'+
      '<label style="display:flex;align-items:center;gap:10px;font-size:16px;margin:4px 0 0"><input type="checkbox" id="pbx-snd" style="width:22px;height:22px"'+(localStorage.getItem("pb.sounds")==="1"?" checked":"")+'> Soft sounds when saving and deleting</label></section>'+
    '<section class="pbx-sec"><h3>Privacy check</h3><p>Tests that only your account can read your budget: it tries to read as a stranger and as a different account. Both should be refused.</p><p class="pbx-note" data-pbx-lock style="margin:0 0 10px"></p><button class="pbx-btn sec" id="pbx-lock">Check database lock</button></section>'+
    '<section class="pbx-sec"><h3>Account</h3><p>Signed in as <b>'+esc(P.user&&P.user.email)+'</b></p><button class="pbx-btn danger" id="pbx-out">Sign out</button></section>'+
    '<p class="pbx-note" style="text-align:center;margin:0 0 12px">App version: '+esc(window.PB_BUILD||"unknown")+'</p><button class="pbx-btn sec" id="pbx-close">Done</button></div>';
  document.body.appendChild(sc);document.body.style.overflow="hidden";
  sc.addEventListener("click",e=>{if(e.target===sc)closeSettings()});
  sc.querySelector("#pbx-name").addEventListener("change",e=>{const v=e.target.value.trim();if(v)localStorage.setItem("pb.name",v);else localStorage.removeItem("pb.name");if(window.PB_RENDER)window.PB_RENDER()});
  sc.querySelector("#pbx-theme").addEventListener("change",e=>{const v=e.target.value;localStorage.setItem("pb.theme",v);const d=v==="dark"||(v==="auto"&&matchMedia("(prefers-color-scheme:dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light");const mt=document.querySelector('meta[name="theme-color"]');if(mt&&mt.dataset.light)mt.setAttribute("content",d?"#000000":mt.dataset.light)});
  sc.querySelector("#pbx-snd").addEventListener("change",e=>{localStorage.setItem("pb.sounds",e.target.checked?"1":"0");if(e.target.checked&&window.PB_SND)window.PB_SND.play("coin")});
  sc.querySelector("#pbx-lock").onclick=async e=>{const btn=e.currentTarget,out=sc.querySelector("[data-pbx-lock]"),tell=(t,ok)=>{out.className=ok===true?"pbx-ok":ok===false?"pbx-err":"pbx-note";out.textContent=t};
    btn.disabled=true;tell("Checking…");
    try{const r=await lockCheck();tell(r.msg,r.ok)}catch(err){tell("Couldn't finish the check: "+((err&&err.message)||err),null)}
    btn.disabled=false};
  const st=sc.querySelector("[data-pbx-sstat]"),val=()=>({url:sc.querySelector("#pbx-url").value.trim(),key:sc.querySelector("#pbx-key").value.trim()});
  const say=(t,ok)=>{st.className=ok===true?"pbx-ok":ok===false?"pbx-err":"pbx-note";st.style.margin="0 0 10px";st.textContent=t};
  sc.querySelector("#pbx-test").onclick=async()=>{const v=val();if(!/^https:\/\/script\.google(usercontent)?\.com\//.test(v.url)){say("Paste the Web app URL from Apps Script. It starts with https://script.google.com and ends in /exec.",false);return}
    say("Testing…");try{const j=await callScript({action:"ping"},v);say("Connected to "+(j.spreadsheet||"your sheet")+" · Transactions tab found.",true)}
    catch(x){say(x.code==="wrong_key"?"Wrong key. Copy the value in quotes on the KEY line of apps-script.gs.":x.code==="network"?"Couldn't reach the script. Check the URL and your connection.":x.message,false)}};
  sc.querySelector("#pbx-gsave").onclick=async()=>{const k=sc.querySelector("#pbx-gpk").value.trim(),st=sc.querySelector("[data-pbx-gstat]");
    if(!k){LS.set("pb.gplacesKey",null);st.className="pbx-note";st.textContent="Removed.";return}
    st.className="pbx-note";st.textContent="Checking…";
    try{const r=await fetch("https://places.googleapis.com/v1/places:searchText",{method:"POST",headers:{"Content-Type":"application/json","X-Goog-Api-Key":k,"X-Goog-FieldMask":"places.id"},body:JSON.stringify({textQuery:"coffee",pageSize:1})});
      if(!r.ok){const j=await r.json().catch(()=>({}));st.className="pbx-err";st.textContent="Google refused the key: "+((j.error&&j.error.message)||r.status);return}
      LS.set("pb.gplacesKey",k);st.className="pbx-ok";st.textContent="Saved. Place search now uses Google."}
    catch(e){LS.set("pb.gplacesKey",k);st.className="pbx-note";st.textContent="Saved (couldn't test right now)."}};
  sc.querySelector("#pbx-msave").onclick=async()=>{const t=sc.querySelector("#pbx-mbx").value.trim(),st=sc.querySelector("[data-pbx-mstat]");
    if(!t){LS.set("pb.mapboxToken",null);st.className="pbx-note";st.textContent="Removed. Using basic search.";return}
    if(!/^pk\./.test(t)){st.className="pbx-err";st.textContent="Use the public token that starts with pk. (never an sk. secret token).";return}
    st.className="pbx-note";st.textContent="Checking…";
    try{const r=await fetch("https://api.mapbox.com/search/searchbox/v1/forward?q=coffee&limit=1&access_token="+encodeURIComponent(t));
      if(r.status===401||r.status===403){st.className="pbx-err";st.textContent="Mapbox didn't accept that token. Check it, and its allowed URLs.";return}
      LS.set("pb.mapboxToken",t);st.className="pbx-ok";st.textContent="Saved. Place search now uses Mapbox."}
    catch(e){LS.set("pb.mapboxToken",t);st.className="pbx-note";st.textContent="Saved (couldn't test right now)."}};
  sc.querySelector("#pbx-save").onclick=()=>{const v=val();LS.set("pb.sheetUrl",v.url||null);LS.set("pb.sheetKey",v.key||null);closeSettings();toast(v.url&&v.key?"Sheet sync saved":"Sheet sync turned off")};
  sc.querySelector("#pbx-exp").onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent="Preparing…";try{await exportBackup()}catch(x){toast("Couldn't make a backup")}b.disabled=false;b.textContent="Save a backup"};
  sc.querySelector("#pbx-drive").onclick=async e=>{const b=e.currentTarget,ds=sc.querySelector("[data-pbx-dstat]");b.disabled=true;b.textContent="Backing up…";
    try{await driveBackup();ds.className="pbx-ok";ds.textContent="Saved to Google Drive · "+driveStatus().replace(/^Last backup [^·]+· /,"")}
    catch(x){LS.set("pb.driveErr",x.message==="unknown_action"?"script":x.code==="not_configured"?null:"fail");ds.className="pbx-err";ds.textContent=x.message==="unknown_action"?"Your sheet script needs the backup update first.":x.code==="not_configured"?"Set up Google Sheet sync above first.":x.code==="network"?"Couldn't reach your script. Check your connection.":"Couldn't save: "+x.message}
    b.disabled=false;b.textContent="Back up to Drive now"};
  importUI(sc,{});snapUI(sc);
  sc.querySelector("#pbx-out").onclick=async()=>{closeSettings();await P.auth.signOut();location.reload()};
  sc.querySelector("#pbx-close").onclick=closeSettings;
  notifyUI(sc);
}

/* ---------- notification test ----------
   iPhone shows web-app notifications only for apps opened from the Home Screen (iOS 16.4+),
   and only after you allow them from a tap. These are sent by the app itself, as a check that
   notifications reach the lock screen / Notification Center. */
function notifyState(){
  if(!("Notification" in window)||!("serviceWorker" in navigator)){
    const ios=/iPhone|iPad|iPod/.test(navigator.userAgent),home=window.navigator.standalone||matchMedia("(display-mode: standalone)").matches;
    return{ok:false,msg:ios&&!home?"Open Pocket Budget from its Home Screen icon to use notifications.":"This browser can't show notifications."}}
  const p=Notification.permission;
  return{ok:true,perm:p,msg:p==="granted"?"Allowed. Tap a test button.":p==="denied"?"Turned off. Turn them on in iPhone Settings → Notifications → Pocket Budget (or Budget).":"Not asked yet. The first test will ask you to allow them."}}
async function sendTestNotice(delay){
  const st=notifyState();if(!st.ok)throw new Error(st.msg);
  let p=Notification.permission;if(p==="default")p=await Notification.requestPermission();
  if(p!=="granted")throw new Error(p==="denied"?"Notifications are turned off for Pocket Budget. Turn them on in iPhone Settings → Notifications.":"Notifications weren't allowed.");
  const reg=await Promise.race([navigator.serviceWorker.ready,new Promise(r=>setTimeout(()=>r(null),4000))]);
  if(!reg)throw new Error("The app's background helper isn't running yet. Close Pocket Budget completely, reopen it, and try again.");
  const fire=()=>reg.showNotification("Pocket Budget",{body:delay?"Delayed test notification ✓ It works even after you leave the app.":"Test notification ✓ Notifications are working.",icon:"icon-192.png",badge:"icon-192.png",tag:"pb-test-"+Date.now(),data:{url:"./"}});
  if(!delay)return fire();
  setTimeout(()=>{fire().catch(()=>{})},delay);
}
function notifyUI(sc){
  const pill=sc.querySelector("[data-pbx-npill]"),st=sc.querySelector("[data-pbx-nstat]");
  const draw=(msg,ok)=>{const s=notifyState(),on=s.ok&&s.perm==="granted";pill.className="pbx-pill "+(on?"on":"off");pill.textContent=on?"Allowed":s.ok&&s.perm==="denied"?"Off":s.ok?"Not set":"Unavailable";
    st.className=ok===true?"pbx-ok":ok===false?"pbx-err":"pbx-note";st.style.margin="0 0 10px";st.textContent=msg||s.msg};
  draw();
  sc.querySelector("#pbx-ntest").onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{await sendTestNotice(0);draw("Sent. Look for it at the top of the screen.",true)}catch(x){draw(x.message,false)}b.disabled=false};
  sc.querySelector("#pbx-nlater").onclick=async e=>{const b=e.currentTarget;b.disabled=true;try{await sendTestNotice(10000);draw("Coming in 10 seconds. Go to your Home Screen to see it arrive.",true)}catch(x){draw(x.message,false)}b.disabled=false};
}
function toast(msg,ms){const t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),ms||2200)}
function addGear(){
  // The gear sits at the right end of the header row. (It used to sit beside the header "+", which was removed on Nov 13, so it had stopped appearing.)
  const row=document.querySelector("header .hrow");if(!row||document.getElementById("pbx-gear"))return;
  const b=document.createElement("button");b.className="iconbtn";b.id="pbx-gear";b.setAttribute("aria-label","Settings");
  b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  b.onclick=e=>{e.stopPropagation();openSettings()};
  b.style.marginLeft="auto";b.style.width=b.style.height="44px";row.appendChild(b);
}

/* ---------- start ---------- */
let started=false;
async function start(){
  const cfg=storedConfig();
  if(!cfg){setupScreen();return}
  /* returning user with a saved copy: skip the loading screen, the app shows that copy right away */
  const warm=!!(LS.get("pb.cache")&&LS.get("pb.lastUid"));
  if(!warm)showGate('<h1>Pocket Budget</h1><p>Loading…</p>');
  try{await loadFirebase()}catch(e){showGate('<h1>Can\'t load</h1><p>Pocket Budget needs an internet connection the first time it opens.</p><button class="pbx-btn" onclick="location.reload()">Try again</button>');return}
  try{
    P.app=firebase.apps.length?firebase.app():firebase.initializeApp(cfg);
    P.auth=firebase.auth();P.fs=firebase.firestore();
    try{P.fs.settings({ignoreUndefinedProperties:true,merge:true})}catch(e){}
    try{await P.fs.enablePersistence({synchronizeTabs:true})}catch(e){}
  }catch(e){LS.set("pb.fbconfig",null);setupScreen("That Firebase config didn't work: "+(e.message||e));return}
  if(started)return;started=true;
  P.auth.onAuthStateChanged(async u=>{
    if(!u){if(P.user){location.reload();return}loginScreen("signin");return}
    if(P.user)return;P.user=u;
    if(LS.get("pb.lastUid")&&LS.get("pb.lastUid")!==u.uid)LS.set("pb.cache",null);LS.set("pb.lastUid",u.uid);
    // first run: offer the backup if this account has no budgets yet (only asked once, so returning users skip this server round trip)
    let empty=false;
    if(!LS.get("pb.firstRunDone:"+u.uid))try{const s=await base().collection("budgets").limit(1).get();empty=s.empty}
    catch(e){const c=e&&e.code;showGate('<h1>Almost there</h1><p class="pbx-err">'+(c==="permission-denied"?"Your database refused access. In Firebase, open Firestore → Rules, paste firestore.rules and Publish.":"Couldn't reach your database: "+esc(e.message||c))+'</p><button class="pbx-btn" onclick="location.reload()">Try again</button>');return}
    hideGate();addGear();dbResolve(DB);setTimeout(autoBackup,12000);
    document.addEventListener("visibilitychange",()=>{if(document.visibilityState==="visible")setTimeout(autoBackup,4000)});
    if(empty&&!LS.get("pb.firstRunDone:"+u.uid))firstRunScreen();
  });
}
document.addEventListener("DOMContentLoaded",()=>{addStyle();start()});
if("serviceWorker" in navigator&&location.protocol==="https:")addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
})();
