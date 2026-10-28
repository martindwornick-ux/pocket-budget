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
.pbx-gate{position:fixed;inset:0;z-index:100;background:#fff;display:flex;align-items:flex-start;justify-content:center;overflow:auto;padding:calc(env(safe-area-inset-top,0px) + 48px) 20px calc(env(safe-area-inset-bottom,0px) + 32px);font-family:"Figtree",-apple-system,system-ui,sans-serif;color:#202124}
.pbx-gate::before{content:"";position:fixed;inset:0;z-index:-1;background:radial-gradient(38% 28% at 8% 6%,rgba(66,133,244,.20),transparent 70%),radial-gradient(34% 26% at 96% 18%,rgba(234,67,53,.12),transparent 70%),radial-gradient(40% 30% at 88% 82%,rgba(52,168,83,.14),transparent 70%),radial-gradient(36% 26% at 6% 70%,rgba(251,188,4,.14),transparent 70%),#fff}
.pbx-box{width:100%;max-width:420px}
.pbx-logo{width:64px;height:64px;border-radius:16px;display:block;margin:0 0 18px;box-shadow:0 8px 24px rgba(26,115,232,.3)}
.pbx-box h1{font-family:"Bricolage Grotesque","Avenir Next",system-ui,sans-serif;font-weight:800;font-size:30px;margin:0 0 6px;letter-spacing:-.01em}
.pbx-box p{margin:0 0 16px;font-size:16px;line-height:1.45;color:#5f6368}
.pbx-f{display:flex;flex-direction:column;gap:6px;margin:0 0 14px}
.pbx-f label{font-size:13px;text-transform:uppercase;letter-spacing:.06em;color:#5f6368;font-weight:600}
.pbx-f input,.pbx-f textarea{font:inherit;font-size:17px;padding:13px 14px;border-radius:12px;border:1px solid rgba(60,64,67,.2);background:rgba(255,255,255,.85);color:#202124;width:100%;min-width:0}
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
.pbx-scrim{position:fixed;inset:0;z-index:90;background:rgba(32,33,36,.28);display:flex;align-items:flex-end;justify-content:center;font-family:"Figtree",-apple-system,system-ui,sans-serif;color:#202124}
.pbx-sheet{width:100%;max-width:640px;max-height:calc(100% - 40px);overflow:auto;background:rgba(255,255,255,.96);-webkit-backdrop-filter:saturate(180%) blur(30px);backdrop-filter:saturate(180%) blur(30px);border-radius:24px 24px 0 0;padding:12px 20px calc(24px + env(safe-area-inset-bottom,0px));box-shadow:0 -10px 40px rgba(0,0,0,.18);animation:pbxup .32s cubic-bezier(.32,.72,0,1)}
@keyframes pbxup{from{transform:translateY(100%)}}
@media (prefers-reduced-motion:reduce){.pbx-sheet{animation:none}}
.pbx-grab{width:42px;height:5px;border-radius:3px;background:rgba(60,64,67,.18);margin:0 auto 12px}
.pbx-sheet h2{font-family:"Bricolage Grotesque","Avenir Next",system-ui,sans-serif;font-weight:800;font-size:22px;margin:0 0 14px}
.pbx-sec{background:#fff;border:1px solid rgba(60,64,67,.1);border-radius:18px;padding:16px;margin:0 0 12px;box-shadow:0 1px 2px rgba(60,64,67,.08)}
.pbx-sec h3{margin:0 0 4px;font-size:17px}
.pbx-sec>p{margin:0 0 12px;font-size:14px;color:#5f6368;line-height:1.45}
.pbx-pill{display:inline-block;font-size:12px;font-weight:700;padding:3px 9px;border-radius:999px;margin-left:6px;vertical-align:2px}
.pbx-pill.on{background:rgba(24,128,56,.12);color:#188038}.pbx-pill.off{background:rgba(60,64,67,.08);color:#5f6368}
.pbx-prog{height:6px;border-radius:6px;background:rgba(60,64,67,.1);overflow:hidden;margin:10px 0 0}
.pbx-prog i{display:block;height:100%;width:0;background:#1a73e8;transition:width .2s}
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
async function exportBackup(){
  const B=base(),out={};
  for(const c of COLLS){const s=await B.collection(c).get();out[c]={};s.docs.forEach(d=>out[c][d.id]=d.data())}
  const d=new Date(),stamp=d.getFullYear()+"-"+String(d.getMonth()+1).padStart(2,"0")+"-"+String(d.getDate()).padStart(2,"0");
  await saveFile("pocket-budget-backup-"+stamp+".json",JSON.stringify({app:"pocket-budget",version:2,exported:stamp,collections:out}),"application/json");
}
function importUI(root,{onDone}){
  root.querySelector("[data-pbx-file]").addEventListener("change",async e=>{
    const f=e.target.files&&e.target.files[0];if(!f)return;
    const st=root.querySelector("[data-pbx-status]"),pr=root.querySelector("[data-pbx-prog]"),btn=root.querySelector("[data-pbx-pick]");
    btn.disabled=true;st.className="pbx-note";st.textContent="Reading "+f.name+"…";pr.hidden=false;
    try{const n=await importBackup(f,(d,t)=>{pr.firstChild.style.width=(d/t*100).toFixed(0)+"%";st.textContent="Copied "+d+" of "+t+" records…"});
      st.className="pbx-ok";st.textContent="Brought in "+n+" records.";onDone&&onDone(n)}
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
    '<section class="pbx-sec"><h3>Backup</h3><p>Save a copy of everything, or bring in a backup file. Importing replaces records with the same month or ID and keeps the rest.</p>'+
      '<button class="pbx-btn sec" id="pbx-exp">Save a backup</button><div style="height:10px"></div>'+importBlock+'</section>'+
    '<section class="pbx-sec"><h3>Notifications <span class="pbx-pill" data-pbx-npill></span></h3><p>Check that Pocket Budget can show notifications on this phone.</p>'+
      '<p data-pbx-nstat class="pbx-note" style="margin:0 0 10px"></p>'+
      '<div class="pbx-row" style="margin-top:0"><button class="pbx-btn sec" id="pbx-ntest">Send test now</button><button class="pbx-btn sec" id="pbx-nlater">Test in 10 sec</button></div></section>'+
    '<section class="pbx-sec"><h3>Account</h3><p>Signed in as <b>'+esc(P.user&&P.user.email)+'</b></p><button class="pbx-btn danger" id="pbx-out">Sign out</button></section>'+
    '<p class="pbx-note" style="text-align:center;margin:0 0 12px">App version: '+esc(window.PB_BUILD||"unknown")+'</p><button class="pbx-btn sec" id="pbx-close">Done</button></div>';
  document.body.appendChild(sc);document.body.style.overflow="hidden";
  sc.addEventListener("click",e=>{if(e.target===sc)closeSettings()});
  const st=sc.querySelector("[data-pbx-sstat]"),val=()=>({url:sc.querySelector("#pbx-url").value.trim(),key:sc.querySelector("#pbx-key").value.trim()});
  const say=(t,ok)=>{st.className=ok===true?"pbx-ok":ok===false?"pbx-err":"pbx-note";st.style.margin="0 0 10px";st.textContent=t};
  sc.querySelector("#pbx-test").onclick=async()=>{const v=val();if(!/^https:\/\/script\.google(usercontent)?\.com\//.test(v.url)){say("Paste the Web app URL from Apps Script. It starts with https://script.google.com and ends in /exec.",false);return}
    say("Testing…");try{const j=await callScript({action:"ping"},v);say("Connected to "+(j.spreadsheet||"your sheet")+" · Transactions tab found.",true)}
    catch(x){say(x.code==="wrong_key"?"Wrong key. Copy the value in quotes on the KEY line of apps-script.gs.":x.code==="network"?"Couldn't reach the script. Check the URL and your connection.":x.message,false)}};
  sc.querySelector("#pbx-save").onclick=()=>{const v=val();LS.set("pb.sheetUrl",v.url||null);LS.set("pb.sheetKey",v.key||null);closeSettings();toast(v.url&&v.key?"Sheet sync saved":"Sheet sync turned off")};
  sc.querySelector("#pbx-exp").onclick=async e=>{const b=e.currentTarget;b.disabled=true;b.textContent="Preparing…";try{await exportBackup()}catch(x){toast("Couldn't make a backup")}b.disabled=false;b.textContent="Save a backup"};
  importUI(sc,{});
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
function toast(msg){const t=document.createElement("div");t.className="toast";t.setAttribute("role","status");t.textContent=msg;document.body.appendChild(t);setTimeout(()=>t.remove(),2200)}
function addGear(){
  const row=document.querySelector("header .hrow"),plus=document.getElementById("addBtnTop");if(!row||!plus||document.getElementById("pbx-gear"))return;
  const b=document.createElement("button");b.className="iconbtn";b.id="pbx-gear";b.setAttribute("aria-label","Settings");
  b.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg>';
  b.onclick=e=>{e.stopPropagation();openSettings()};
  row.insertBefore(b,plus);
}

/* ---------- start ---------- */
let started=false;
async function start(){
  const cfg=storedConfig();
  if(!cfg){setupScreen();return}
  showGate('<h1>Pocket Budget</h1><p>Loading…</p>');
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
    // first run: offer the backup if this account has no budgets yet
    let empty=false;
    try{const s=await base().collection("budgets").limit(1).get();empty=s.empty}
    catch(e){const c=e&&e.code;showGate('<h1>Almost there</h1><p class="pbx-err">'+(c==="permission-denied"?"Your database refused access. In Firebase, open Firestore → Rules, paste firestore.rules and Publish.":"Couldn't reach your database: "+esc(e.message||c))+'</p><button class="pbx-btn" onclick="location.reload()">Try again</button>');return}
    hideGate();addGear();dbResolve(DB);
    if(empty&&!LS.get("pb.firstRunDone:"+u.uid))firstRunScreen();
  });
}
document.addEventListener("DOMContentLoaded",()=>{addStyle();start()});
if("serviceWorker" in navigator&&location.protocol==="https:")addEventListener("load",()=>navigator.serviceWorker.register("sw.js").catch(()=>{}));
})();
