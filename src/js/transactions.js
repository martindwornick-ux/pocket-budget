/* ---------- receipt scanning (on the phone, with Tesseract.js; nothing is uploaded) ---------- */
let TESS=null;
function loadTess(){if(window.Tesseract)return Promise.resolve();if(TESS)return TESS;
  TESS=new Promise((ok,no)=>{const sc=document.createElement("script");sc.src=VEND+"tesseract.js-5.1.1/tesseract.min.js";sc.onload=ok;sc.onerror=()=>{TESS=null;no(new Error("load"))};document.head.appendChild(sc)});return TESS}
function receiptCanvas(file){return new Promise((ok,no)=>{const u=URL.createObjectURL(file),im=new Image();im.onload=()=>{const k=Math.min(1,1700/Math.max(im.width,im.height)),c=document.createElement("canvas");c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);
  const x=c.getContext("2d");x.drawImage(im,0,0,c.width,c.height);const d=x.getImageData(0,0,c.width,c.height),a=d.data;
  for(let i=0;i<a.length;i+=4){let g=.299*a[i]+.587*a[i+1]+.114*a[i+2];g=Math.max(0,Math.min(255,(g-128)*1.5+140));a[i]=a[i+1]=a[i+2]=g}x.putImageData(d,0,0);URL.revokeObjectURL(u);ok(c)};im.onerror=()=>{URL.revokeObjectURL(u);no(new Error("image"))};im.src=u})}
function parseReceipt(text,known){
  const lines=String(text||"").split(/\n/).map(l=>l.replace(/\s+/g," ").trim()).filter(Boolean),MON=/(\d{1,4}(?:,\d{3})*[.,]\d{2})(?!\d)/g;
  const nums=l=>[...l.matchAll(MON)].map(m=>parseFloat(m[1].replace(/,(?=\d{3})/g,"").replace(",",".")));
  let amount=0;const tot=lines.filter(l=>/(grand\s*total|total\s*due|amount\s*due|balance\s*due|\btotal\b|amount\s*paid|\bpaid\b)/i.test(l)&&!/(sub\s*-?\s*total|tax|sav|discount|tip|change|items?\s*sold|you\s*saved)/i.test(l));
  for(const l of tot.reverse()){const v=nums(l).filter(v=>v>0&&v<20000);if(v.length){amount=v[v.length-1];break}}
  if(!amount){const all=lines.flatMap(nums).filter(v=>v>0&&v<5000);if(all.length)amount=Math.max(...all)}
  let date="";const now=new Date(),okD=(y,m,d)=>{if(y<100)y+=2000;const dt=new Date(y,m-1,d);if(dt.getMonth()!==m-1||dt>new Date(now.getTime()+864e5)||now-dt>400*864e5)return"";return y+"-"+pad(m)+"-"+pad(d)};
  const MN={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
  for(const l of lines){let m;
    if((m=l.match(/\b(20\d{2})[-\/.](\d{1,2})[-\/.](\d{1,2})\b/))&&(date=okD(+m[1],+m[2],+m[3])))break;
    if((m=l.match(/\b(\d{1,2})[-\/.](\d{1,2})[-\/.](\d{2,4})\b/))&&(date=okD(+m[3],+m[1],+m[2])))break;
    if((m=l.match(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2}),?\s+(20\d{2})\b/i))&&(date=okD(+m[3],MN[m[1].toLowerCase()],+m[2])))break}
  let merchant="";const low=lines.join(" ").toLowerCase();
  const hit=(known||[]).filter(k=>k&&k.length>=4&&low.includes(k.toLowerCase())).sort((a,b)=>b.length-a.length)[0];
  if(hit)merchant=hit;else{for(const l of lines.slice(0,6)){const letters=(l.match(/[a-z]/gi)||[]).length;
    if(letters<3||letters<l.length*.5||/(receipt|welcome|thank|store\s*#|tel|phone|www|\.com|http|cashier|order)/i.test(l)||/^\d/.test(l))continue;
    merchant=l.replace(/[^a-z0-9&' .-]/gi,"").trim().toLowerCase().replace(/(^|[\s&.-])([a-z])/g,(m,p,c)=>p+c.toUpperCase()).slice(0,40);break}}
  return {amount:Math.round(amount*100)/100,date,merchant};
}
async function scanReceipt(file,sheet){
  const ov=document.createElement("div");ov.className="rscan";ov.innerHTML='<div class="rsc"><div class="rsb"><i></i></div><b>Reading receipt…</b><span>Stays on your phone. First scan downloads the reader.</span></div>';sheet.appendChild(ov);
  const bar=ov.querySelector(".rsb i"),lab=ov.querySelector("b");
  try{const [c]=await Promise.all([receiptCanvas(file),loadTess()]);
    const res=await Tesseract.recognize(c,"eng",{workerPath:VEND+"tesseract.js-5.1.1/worker.min.js",workerBlobURL:false,corePath:VEND+"tesseract.js-core-5.1.1",langPath:VEND+"tesseract-eng-4.0.0_best_int",logger:m=>{if(m&&m.status==="recognizing text"){bar.style.width=Math.round(m.progress*100)+"%";lab.textContent="Reading receipt… "+Math.round(m.progress*100)+"%"}else if(m&&m.status){lab.textContent=/load|init/i.test(m.status)?"Getting the reader ready…":"Reading receipt…"}}});
    return parseReceipt(res&&res.data&&res.data.text,merchIndex().map(e=>e.name))}
  catch(e){toast(e&&e.message==="load"?"Couldn't load the receipt reader. Check your connection":"Couldn't read that photo");return null}
  finally{ov.classList.add("out");setTimeout(()=>ov.remove(),250)}
}
/* Quick actions: txSheet(null,{kind:"refund"}) / {venmo:true} / {scan:true} open the add sheet pre-set. */
/* Add Transaction, layout A: amount → budget item (+ usual-items chips) → merchant (+ nearby) → pills for the extras.
   The original rows are moved, not rebuilt, so every id and handler keeps working; each pill opens its row inline. */
function txLayoutA(s,existing){try{
  const q=x=>s.querySelector(x),body=q(".tbody"),dateRow=q("#f-date").closest(".trow"),firstCard=dateRow.closest(".tcard");
  const merRow=q("#f-mer").closest(".trow"),msug=q("#f-msug"),vrow=q("#f-vrow"),prow=q("#f-prow"),locRow=q("#f-loc").closest(".trow"),lsug=q("#f-lsug"),near=q("#f-near");
  const catCard=q(".crow").closest(".tcard"),chips=q("#f-cchips"),rcard=q("#f-rcard"),noteCard=q("#f-note").closest(".tcard");
  // 1) budget item right under the amount, chips under it
  firstCard.before(catCard);catCard.after(chips);
  // 2) merchant card (merchant, suggestions, nearby places, Venmo person)
  const mc=document.createElement("div");mc.className="tcard";mc.append(dateRow,merRow,msug);if(near)mc.append(near);mc.append(prow,locRow,lsug,vrow);vrow.hidden=true;vrow.classList.add("vhide");
  catCard.before(mc); /* merchant first, then budget item */
  // 3) pills + inline panels
  const pills=document.createElement("div");pills.className="txpills";
  const P=[["v","venmo"],["r","back"],["n","note"]];
  const ICON={calendar:'<rect x="4" y="5" width="16" height="15" rx="2.5"/><path d="M4 10h16M9 3v4M15 3v4"/>',pin:'<path d="M12 21s-6.5-6.2-6.5-11a6.5 6.5 0 0 1 13 0C18.5 14.8 12 21 12 21z"/><circle cx="12" cy="10" r="2.3"/>',venmo:'<path d="M4 8h13l-3-3M20 16H7l3 3"/>',back:'<path d="M9 14l-4-4 4-4"/><path d="M5 10h9a5 5 0 0 1 0 10h-2"/>',note:'<path d="M5 4h10l4 4v12H5z"/><path d="M9 12h6M9 16h4"/>'};
  pills.innerHTML=P.map(([k,ic])=>'<button type="button" class="txpill" data-px="'+k+'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">'+ICON[ic]+'</svg><span></span></button>').join("");
  chips.after(pills);
  const panels=document.createElement("div");panels.className="txpanels";pills.after(panels);
  const mk=(k,...nodes)=>{const d=document.createElement("div");d.className="txpanel";d.dataset.pp=k;d.hidden=true;const c=document.createElement("div");c.className="tcard";c.append(...nodes.filter(Boolean));d.append(c);panels.append(d);return d};
  const pr=document.createElement("div");pr.className="txpanel";pr.dataset.pp="r";pr.hidden=true;if(rcard)pr.append(rcard);panels.append(pr);
  const pn=document.createElement("div");pn.className="txpanel";pn.dataset.pp="n";pn.hidden=true;pn.append(noteCard);panels.append(pn);
  firstCard.remove();
  const rb=q("#f-rb"),ven=q("#f-venmo"),note=q("#f-note"),dIn=q("#f-date"),loc=q("#f-loc");
  const short=d=>{const td=today();if(d===td)return"Today";const y=new Date(td+"T12:00:00");y.setDate(y.getDate()-1);const ys=y.getFullYear()+"-"+pad(y.getMonth()+1)+"-"+pad(y.getDate());if(d===ys)return"Yesterday";return dfmt({month:"short",day:"numeric"}).format(new Date(d+"T12:00:00"))};
  function refresh(){const lv=(loc.value||"").trim();
    const L={d:short(dIn.value||today()),v:"Venmo",r:"Paid back",n:note.value.trim()?"Note ✓":"Note"};

    pills.querySelectorAll("[data-px]").forEach(b=>{const k=b.dataset.px,pp=panels.querySelector('[data-pp="'+k+'"]');b.querySelector("span").textContent=L[k];
      const set=k==="d"?true:k==="v"?ven.checked:k==="r"?!!(rb&&rb.checked):!!note.value.trim();b.classList.toggle("set",set);b.classList.toggle("open",!!(pp&&!pp.hidden));
      if(k==="r")b.hidden=!rcard||rcard.hidden})}
  pills.addEventListener("click",e=>{const b=e.target.closest("[data-px]");if(!b)return;const k=b.dataset.px;try{haptic()}catch(_){}
    if(k==="v"){ven.checked=!ven.checked;ven.dispatchEvent(new Event("change",{bubbles:true}));refresh();return}
    const pp=panels.querySelector('[data-pp="'+k+'"]'),was=!pp.hidden;panels.querySelectorAll(".txpanel").forEach(p=>p.hidden=true);
    if(k==="r"&&rb){if(!rb.checked){rb.checked=true;rb.dispatchEvent(new Event("change",{bubbles:true}));pp.hidden=false}
      else if(was){rb.checked=false;rb.dispatchEvent(new Event("change",{bubbles:true}));pp.hidden=true}else pp.hidden=false}
    else pp.hidden=was;
    if(!pp.hidden){if(k==="n")setTimeout(()=>note.focus(),40);if(k==="l"&&!loc.value)setTimeout(()=>loc.focus(),40);requestAnimationFrame(()=>pp.scrollIntoView({block:"nearest",behavior:"smooth"}))}
    refresh()});
  s.addEventListener("input",refresh);s.addEventListener("change",refresh);
  loc.addEventListener("change",()=>{const v=loc.value.trim(),fx=LOC.last;if(/^\d+\s+\S/.test(v)&&fx&&Date.now()-LOC.lastAt<15*60e3&&(fx.acc||0)<200&&(dIn.value||today())===today())LOC.learn(v,fx)});
  loc.addEventListener("blur",()=>loc.dispatchEvent(new Event("change")));s.addEventListener("click",()=>setTimeout(refresh,0));
  const iv=setInterval(()=>{if(!s.isConnected){clearInterval(iv);return}refresh()},700);
  // editing: open the panels that already have something in them? keep closed, the pills show the values
  refresh();
}catch(e){console.warn("layout A",e)}}
function txSheet(existing,opts){txSheetCore(existing);if(!opts||existing)return;const sh=$("#sheetRoot .sheet");if(!sh)return;
  if(opts.kind==="refund"){const b=sh.querySelector('[data-k="refund"]');b&&b.click()}
  if(opts.venmo){const v=sh.querySelector("#f-venmo");if(v){v.checked=true;v.dispatchEvent(new Event("change",{bubbles:true}))}}
  if(opts.scan){const c=sh.querySelector("#f-cam");c&&c.click()}}
function txSheetCore(existing){
  const d=existing?existing.date:(S.ym===ymOf(today())?today():S.ym+"-01");
  const groups=groupsFor(ymOf(d));
  if(!allItems(groups).length){openSheet('<h3>Add a category first</h3><p class="note">Transactions go into budget items like Groceries or Auto Gas &amp; Oil. Add a group and an item on the Budget tab, then log purchases here.</p><div class="btnrow" style="margin-top:14px"><button class="btn" id="okc">Got it</button></div>',s=>s.querySelector("#okc").onclick=closeSheet);return}
  const last=ls.get("pb.lastItem")||"";
  const sel=existing?existing.itemId:""; // no automatic default: start empty unless the merchant suggests one
  let kind=existing&&(existing.type==="refund"||existing.type==="income")?"refund":"expense";
  const VP=/^\s*venmo\s*:\s*/i;const mRaw=existing?(existing.merchant||""):"";const venmo0=VP.test(mRaw);const merch0=mRaw.replace(VP,"");
  const T={cur:existing?String(Math.round(+existing.amount*100)):"",ops:[],fresh:!!existing,calc:ls.get("pb.calc")==="1"};
  const X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M5 5l14 14M19 5L5 19"/></svg>';
  openSheet(
    '<div class="thead">'+(existing?'':'<button class="tx-cam" id="f-cam" aria-label="Scan a receipt"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 8h3l1.6-2.2h6.8L17 8h3v11H4z"/><circle cx="12" cy="13.2" r="3.4"/></svg></button><input type="file" accept="image/*" id="f-camin" hidden>')+'<h3 style="grid-column:2">'+(existing?"Edit Transaction":"Add Transaction")+'</h3><button class="tx-x" id="f-x" aria-label="Close">'+X+'</button></div>'+
    '<div class="tseg" id="f-kind" role="group" aria-label="Type"><button data-k="expense" aria-pressed="'+(kind==="expense")+'">- Expense</button><button data-k="refund" aria-pressed="'+(kind==="refund")+'">+ Income</button></div>'+
    '<div class="tbody">'+
      '<button class="tamt num" id="f-amt" aria-label="Amount, tap to edit"></button>'+
      (existing&&(existing.pair?(()=>{const pr=txPool().find(t=>t.id===existing.pair),isR=existing.type==="refund";
          return '<button type="button" class="rlinkbtn" id="f-pair"><span class="ri">'+(isR?"↩︎":"↪︎")+'</span><span class="rt"><small>'+(isR?"Reimbursement for":"Paid back by")+'</small><b>'+(pr?esc(pr.merchant||"Purchase")+' · '+(pr.type==="refund"?"+":"")+money(+pr.amount||0):(isR?"the original purchase":"the reimbursement"))+'</b>'+(pr?'<span>'+esc(fmtLong(pr.date))+'</span>':'')+'</span>'+CHEV+'</button>'})():'')||'')+
      '<div class="tcard">'+
        '<div class="trow"><span>Date</span><span class="tv"><span class="mpill fut" id="f-mpill"'+(ymOf(d)===S.ym?' hidden':'')+'>→ '+MONTHS[+d.slice(5,7)-1]+'</span><span id="f-dtxt">'+esc(fmtLong(d))+'</span></span><input class="ovl" id="f-date" type="date" value="'+esc(d)+'" aria-label="Date"></div>'+
        '<label class="trow"><span>Merchant</span><input class="tin" id="f-mer" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" role="combobox" aria-autocomplete="list" aria-controls="f-msug" aria-expanded="false" placeholder="Name" value="'+esc(merch0)+'"></label>'+
        '<div class="msug" id="f-msug" role="listbox" aria-label="Past merchants" hidden></div>'+
        '<label class="trow" id="f-vrow"><span>Venmo</span><input type="checkbox" class="tchk" id="f-venmo"'+(venmo0?" checked":"")+'></label>'+
        '<label class="trow" id="f-prow"'+(venmo0?'':' hidden')+'><span id="f-plbl">'+(kind==="expense"?"Paid to":"From")+'</span><input class="tin" id="f-person" autocomplete="off" autocapitalize="words" enterkeyhint="done" list="f-pl" placeholder="Name" value="'+esc(existing&&existing.person||"")+'" aria-label="Person"><datalist id="f-pl">'+venmoPeople().map(x=>'<option value="'+esc(x)+'">').join("")+'</datalist></label>'+
        '<div class="trow lrow"><span>Location</span><input class="tin" id="f-loc" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" role="combobox" aria-autocomplete="list" aria-controls="f-lsug" aria-expanded="false" placeholder="Business, city" value="'+esc(locText(existing&&existing.loc))+'">'+
          (LOC.ok()?'<button type="button" class="lgps" id="f-gps" aria-label="Use my current location">'+GPS_SVG+'</button>':'')+'</div>'+
        '<div class="msug lsug" id="f-lsug" role="listbox" aria-label="Location suggestions" hidden></div>'+
        (existing?'':'<div class="near" id="f-near" hidden></div>')+
      '</div>'+
      '<div class="cchips" id="f-cchips" aria-label="Your usual budget items"></div><div class="tcard"><div class="trow crow"><span id="f-clab">'+(kind==="refund"?"Add to":"Budget Item")+'</span><input class="tin" id="f-cq" autocomplete="off" autocorrect="off" autocapitalize="words" spellcheck="false" enterkeyhint="done" role="combobox" aria-autocomplete="list" aria-controls="f-csug" aria-expanded="false" placeholder="Type or pick" aria-label="Budget item"><span class="cauto" title="Suggested from past merchants" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.5l1.9 5.6 5.6 1.9-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.9zM18.5 15l.9 2.6 2.6.9-2.6.9-.9 2.6-.9-2.6-2.6-.9 2.6-.9z"/></svg></span><span class="cbrowse" id="f-ctxt" aria-hidden="true">'+CHEV+'<select class="ovl" id="f-cat" aria-label="Browse budget items"><option value="">Select</option>'+categoryOptions(groups,sel,ymOf(d))+'</select></span></div>'+
        '<div class="msug csug" id="f-csug" role="listbox" aria-label="Budget item suggestions" hidden></div><div class="cplace" id="f-cplace" hidden></div><div class="trow" id="f-subrow" hidden><span>Subcategory</span><span class="tv" id="f-stxt"></span><select class="ovl" id="f-sub" aria-label="Misc subcategory"><option value="">Select</option>'+SUB.list.map(x=>'<option'+(existing&&existing.sub===x?" selected":"")+'>'+esc(x)+'</option>').join("")+'<option value="__new">+ New subcategory…</option></select></div><div class="trow" id="f-newsub" hidden><input class="tin" id="f-newsubin" autocomplete="off" maxlength="40" enterkeyhint="done" placeholder="New subcategory name" aria-label="New subcategory name" style="text-align:left"><button class="addlink" id="f-newsubok" style="padding:0 0 0 8px">Add</button></div><div class="cleft" id="f-cleft" hidden></div></div>'+
      (existing?''
        :'<div class="tcard rcard" id="f-rcard"><label class="trow"><span>Reimbursed</span><label class="tgl tglsm"><input type="checkbox" id="f-rb" role="switch" aria-label="Getting money back"><span class="sw"></span></label></label>'+
          '<div class="rbody" id="f-rbody" hidden>'+
            '<div class="trow"><span>Amount back</span><div class="rchips"><button type="button" data-rq="1">Full</button><button type="button" data-rq=".5">Half</button></div><input class="tin num" id="f-ramt" inputmode="decimal" autocomplete="off" placeholder="$0.00" aria-label="Amount reimbursed"></div>'+
            '<div class="trow rmrow"><span>Paid back by</span><div class="rmeth" id="f-rmeth" role="radiogroup" aria-label="How you get paid back">'+["Venmo","Cash","Check","Apple Pay","Zelle","PayPal"].map((m,i)=>'<button type="button" role="radio" data-rm="'+m+'" aria-checked="'+(i===0)+'">'+m+'</button>').join("")+'</div></div>'+
            '<label class="trow"><span>From</span><input class="tin" id="f-rfrom" autocomplete="off" autocapitalize="words" list="f-rfl" placeholder="Who pays you back" aria-label="Who reimburses you"><datalist id="f-rfl">'+reimbFroms().map(x=>'<option value="'+esc(x)+'">').join("")+'</datalist></label>'+
            '<div class="trow"><span>Date back</span><span class="tv" id="f-rdtxt">Same day</span><input class="ovl" id="f-rdate" type="date" aria-label="Date reimbursed"></div>'+
            '<p class="rsum" id="f-rsum"></p>'+
          '</div></div>')+
      '<div class="tcard"><input class="tnote" id="f-note" autocomplete="off" placeholder="Add a Note" value="'+esc(existing?existing.note:"")+'"></div>'+
      (existing?'<div class="textra">'+(existing.sheet!=="synced"?'<div class="btnrow" style="margin-bottom:10px"><button class="btn sec" id="f-sync">Send to sheet</button></div>':'')+
        '<p class="note" style="margin:0 4px 10px">'+(existing.sheet==="synced"?"This is already in your Finance Tracker. Changes or a delete here won't update that row, so fix it in the sheet too.":esc(existing.sheetMsg||"Not in your Finance Tracker yet."))+'</p>'+
        '<div class="btnrow"><button class="btn danger" id="f-del">Delete transaction</button></div><div id="f-conf"></div></div>':'')+
    '</div>'+
    '<div class="tpad" id="f-pad"></div>'+
    '<div class="tsave"><button class="btn" id="f-save2">'+(existing?"Save":"Done")+'</button></div>',
    s=>{
      s.classList.add("txs");txLayoutA(s,existing);
      {const amt0=tVal(T);let touched=false;const mark=e=>{if(e.isTrusted)touched=true};
        s.addEventListener("input",mark,true);s.addEventListener("change",mark,true);
        s.addEventListener("click",e=>{if(e.target.closest("#f-cchips,#f-kind,#f-csug,#f-msug,#f-lsug,#f-rcard"))mark(e)},true);
        s._dirty=()=>touched||tVal(T)!==amt0}
      const amtB=s.querySelector("#f-amt"),padEl=s.querySelector("#f-pad"),cat=s.querySelector("#f-cat"),ctxt=s.querySelector("#f-ctxt");
      const drawAmt=()=>{const v=tVal(T);amtB.textContent=(kind==="refund"?"+":"")+money(v/100);amtB.className="tamt num"+(kind==="refund"?" inc":"")+(v?"":" zero")+(s.classList.contains("kboff")?"":" on");try{updLeft()}catch(_){}};
      const drawKeys=()=>{const c=T.calc;
        const keys=c?["1","2","3","÷","4","5","6","×","7","8","9","−","C","0","⌫","+"]:["1","2","3","4","5","6","7","8","9","","0","⌫"];
        const expr=c&&T.ops.length?T.ops.map(([v,o])=>money(v/100)+" "+o).join(" ")+(T.cur!==""?" "+money(+T.cur/100):""):"";
        padEl.innerHTML='<div>'+(c?'<div class="texpr num">'+esc(expr)+'</div>':'')+'<div class="keys'+(c?" calc":"")+'">'+keys.map(k=>k?'<button class="key'+(OPS[k]?" op":"")+'" data-k="'+k+'"'+(KEY_LABEL[k]?' aria-label="'+KEY_LABEL[k]+'"':'')+'>'+(k==="⌫"?BACK_SVG:k)+'</button>':'<span></span>').join("")+'</div>'+
          '<div class="padfoot"><label class="tgl"><input type="checkbox" id="f-calc" role="switch"'+(c?" checked":"")+'><span class="sw"></span><b>Calculator</b></label>'+(c?'<button class="btn sec padEq" data-k="=" aria-label="Equals">=</button>':'')+'<button class="btn padDone" id="f-save">'+(existing?"Save":"Done")+'</button></div></div>'};
      const subSel=s.querySelector("#f-sub"),subRow=s.querySelector("#f-subrow"),stxt=s.querySelector("#f-stxt"),merIn=s.querySelector("#f-mer");let subTouched=!!(existing&&existing.sub);
      const drawSub=()=>{subRow.hidden=cat.value!==MISC_ID;if(subRow.hidden)nsRow.hidden=true;stxt.innerHTML=(subSel.value?esc(subSel.value):"Select")+CHEV;try{merIn.placeholder=catLabel()||"Name"}catch(_){}};
      const autoSub=()=>{if(subTouched||cat.value!==MISC_ID)return;const g=suggestSub((s.querySelector("#f-venmo").checked?"Venmo: ":"")+merIn.value);if(g&&SUB.list.includes(g))subSel.value=g;drawSub()};
      const cq=s.querySelector("#f-cq");
      const catLabel=()=>{if(!cat.value)return"";const o=cat.options[cat.selectedIndex];const nm=o?o.textContent:"";return cat.value===MISC_ID&&subSel.value&&subSel.value!=="__new"?subSel.value:nm};
      const drawCat=()=>{drawSub();autoSub();if(document.activeElement!==cq)cq.value=catLabel();try{updLeft()}catch(_){}try{drawChips()}catch(_){}};
      /* Swipeable chips of the items you use most (recent use counts more); tap one to pick it */
      function drawChips(){const box=s.querySelector("#f-cchips");if(!box)return;const opts=[...cat.options].filter(o=>o.value),ids=new Set(opts.map(o=>o.value));
        const sc={},pool=txPool().filter(t=>t.itemId&&ids.has(t.itemId)).sort((a,b)=>String(b.date).localeCompare(String(a.date))).slice(0,150);
        pool.forEach((t,i)=>{sc[t.itemId]=(sc[t.itemId]||0)+1+Math.max(0,(40-i))/40});
        let list=opts.map((o,i)=>({id:o.value,nm:o.textContent.trim(),sc:(sc[o.value]||0)-i/1000})).sort((a,b)=>b.sc-a.sc).slice(0,10);
        if(cat.value&&!list.some(x=>x.id===cat.value)){const o=opts.find(x=>x.value===cat.value);if(o)list.unshift({id:o.value,nm:o.textContent.trim()})}
        const html=list.map(x=>'<button type="button" class="cchip'+(x.id===cat.value?" on":"")+'" data-cc="'+esc(x.id)+'">'+esc(x.nm)+'</button>').join("");
        if(box._h!==html){box._h=html;box.innerHTML=html}}
      s.querySelector("#f-cchips").addEventListener("click",e=>{const b=e.target.closest("[data-cc]");if(!b)return;if(selectItem(b.dataset.cc)){try{finishPick()}catch(_){}drawChips()}});drawChips();
      // live "left in this item" line under Budget Item
      function updLeft(){const el=s.querySelector("#f-cleft");if(!el)return;const id=cat.value,dv=(s.querySelector("#f-date")||{}).value||d,ym=ymOf(dv);
        const f=id&&findItem(groupsFor(ym),id);if(!f){el.hidden=true;return}
        const pool=ym===S.ym?S.tx:IS.hist[ym];if(!pool){el.hidden=false;el.className="cleft";el.innerHTML='<span>'+esc(f.it.name)+'</span><span class="num">'+money(+f.it.planned||0)+' planned</span>';return}
        const spent=round2(pool.filter(t=>t.itemId===id&&!(existing&&t.id===existing.id)).reduce((a,t)=>a+sAmt(t),0)),planned=+f.it.planned||0,left=round2(planned-spent);
        const a=round2(tVal(T)/100),after=round2(left+(kind==="refund"?a:-a)),pc=planned>0?Math.max(0,Math.min(100,(planned-after)/planned*100)):(after<0?100:0),pc0=planned>0?Math.max(0,Math.min(100,spent/planned*100)):0;
        el.hidden=false;el.className="cleft"+(after<0?" over":left<0?" over":"");
        el.innerHTML='<div class="clt"><span class="cln">Left'+(ym!==S.ym?" in "+MONTHS[+ym.slice(5)-1]:"")+'</span><span class="num"><b'+(left<0?' class="neg"':'')+'>'+money(left)+'</b>'+(a?'<span class="cla"> → </span><b class="'+(after<0?"neg":"ok")+'">'+money(after)+'</b>':'')+'</span></div><div class="clb"><i style="width:'+pc0.toFixed(1)+'%"></i><i class="nw'+(after<0?" ov":"")+'" style="width:'+Math.max(0,pc-pc0).toFixed(1)+'%"></i></div>'+(a&&after<0?'<div class="clw">Over by '+money(-after)+' after this</div>':'')}
      const nsRow=s.querySelector("#f-newsub"),nsIn=s.querySelector("#f-newsubin");let subPrev=subSel.value;
      subSel.addEventListener("change",()=>{
        if(subSel.value==="__new"){subSel.value=subPrev;drawSub();nsRow.hidden=false;nsIn.value="";nsIn.focus();return}
        subPrev=subSel.value;subTouched=true;catTouched=true;s.querySelector(".crow").classList.remove("auto");nsRow.hidden=true;drawSub();if(document.activeElement!==cq)cq.value=catLabel()});
      const ensureSub=n=>{let name=SUB.list.find(x=>x.toLowerCase()===n.toLowerCase());
        if(!name){name=n;const oi=SUB.list.indexOf("Other");if(oi>=0)SUB.list.splice(oi,0,name);else SUB.list.push(name);
          const o=document.createElement("option");o.textContent=name;subSel.insertBefore(o,subSel.querySelector('option[value="__new"]'));
          if(S.db&&!S.readOnly)S.db.doc("meta/subs").set({list:SUB.list,merchants:SUB.merchants||{}}).then(()=>toast("Added "+name)).catch(()=>toast("Added for now, but couldn't save it for next time"));}
        return name};
      const addSub=()=>{const n=nsIn.value.replace(/\s+/g," ").trim();if(!n){toast("Type a name for the subcategory");nsIn.focus();return}
        const name=ensureSub(n);subSel.value=name;subPrev=name;subTouched=true;nsRow.hidden=true;nsIn.blur();drawSub();cq.value=catLabel();showPad(true)};
      s.querySelector("#f-newsubok").onclick=addSub;
      nsIn.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();e.stopImmediatePropagation();addSub()}});merIn.addEventListener("input",autoSub);merIn.addEventListener("change",autoSub);
      // merchant suggestions: tap one to fill the name, Venmo flag and the budget item you last used for it
      const sugEl=s.querySelector("#f-msug");let sugList=[],sugHi=-1,catTouched=false;
      cat.addEventListener("change",()=>{catTouched=true});
      const hl=t=>{const q=merIn.value.replace(/\s+/g," ").trim();const i=q?t.toLowerCase().indexOf(q.toLowerCase()):-1;return i<0?esc(t):esc(t.slice(0,i))+"<b>"+esc(t.slice(i,i+q.length))+"</b>"+esc(t.slice(i+q.length))};
      const catName=e=>{if(!e.itemId)return"";const f=findItem(groupsFor(ymOf(dIn.value||today())),e.itemId)||findItem(groups,e.itemId);if(f)return f.it.name;const x=incomeFor(S.ym).find(i=>i.id===e.itemId);return x?x.name:(e.itemName||"")};
      const hideSug=()=>{sugList=[];sugHi=-1;sugEl.hidden=true;sugEl.innerHTML="";merIn.setAttribute("aria-expanded","false")};
      const drawSug=()=>{
        if(document.activeElement!==merIn){hideSug();return}
        sugList=merchMatches(merIn.value);if(sugHi>=sugList.length)sugHi=-1;
        if(!sugList.length){hideSug();return}
        sugEl.innerHTML=sugList.map((e,i)=>{const c=catName(e);return '<button type="button" role="option" data-mi="'+i+'" aria-selected="'+(i===sugHi)+'"'+(i===sugHi?' class="hl"':'')+'><span class="mn">'+(e.venmo?"Venmo · ":"")+hl(e.name)+'</span>'+(c?'<span class="mc">'+esc(c)+'</span>':'')+'</button>'}).join("");
        sugEl.hidden=false;merIn.setAttribute("aria-expanded","true")};
      const pickSug=e=>{
        merIn.value=e.name;s.querySelector("#f-venmo").checked=!!e.venmo;
        let miss="";
        if(!existing&&!catTouched){const opts=[...cat.options],nm=String(e.itemName||"").trim().toLowerCase();
          if(e.itemId&&opts.some(o=>o.value===e.itemId))cat.value=e.itemId;
          else{const byName=nm&&opts.find(o=>o.value&&o.textContent.trim().toLowerCase()===nm);
            if(byName)cat.value=byName.value;
            else{const sub=nm&&SUB.list.find(x=>x.toLowerCase()===nm);
              if(sub&&opts.some(o=>o.value===MISC_ID)){cat.value=MISC_ID;e=Object.assign({},e,{sub})}
              else if(e.itemName){cat.value="";miss=e.itemName}}}}
        drawCat();
        if(cat.value===MISC_ID&&!subTouched&&e.sub&&SUB.list.includes(e.sub)){subSel.value=e.sub;subPrev=e.sub;drawSub()}
        if(miss){hideSug();merIn.blur();s.querySelector(".crow").classList.remove("auto");setTimeout(()=>{cq.focus();cq.value=miss;cq.dispatchEvent(new Event("input",{bubbles:true}))},60);
          toast("“"+miss+"” isn't in "+MONTHS[+((s.querySelector("#f-date")||{}).value||d).slice(5,7)-1]+"'s budget. Pick one or create it");return}
        hideSug();merIn.blur();try{haptic()}catch(_){}
        LF.merchantChanged();showPad(true)};
      sugEl.addEventListener("pointerdown",e=>{if(e.target.closest("[data-mi]"))e.preventDefault()});
      sugEl.addEventListener("mousedown",e=>e.preventDefault());
      sugEl.addEventListener("click",e=>{const b=e.target.closest("[data-mi]");if(!b)return;e.preventDefault();e.stopPropagation();const x=sugList[+b.dataset.mi];if(x)pickSug(x)});
      merIn.addEventListener("input",()=>{sugHi=-1;drawSug()});
      merIn.addEventListener("focus",()=>{merchLoad();drawSug()});
      merIn.addEventListener("blur",()=>setTimeout(()=>{if(document.activeElement!==merIn)hideSug()},120));
      merIn.addEventListener("keydown",e=>{
        if(sugEl.hidden||!sugList.length)return;
        if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();const n=sugList.length;sugHi=e.key==="ArrowDown"?(sugHi+1)%n:(sugHi<=0?n-1:sugHi-1);drawSug()}
        else if(e.key==="Enter"&&sugHi>=0){e.preventDefault();e.stopImmediatePropagation();pickSug(sugList[sugHi])}
        else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();hideSug()}});
      MV.cb=()=>{if(!s.isConnected){MV.cb=null;return}drawSug();autoSoon()};
      // budget item search: existing items, Misc subcategories, and ideas for new ones
      const csug=s.querySelector("#f-csug"),cplace=s.querySelector("#f-cplace");let cList=[],cHi=-1;
      const hideC=()=>{cList=[];cHi=-1;csug.hidden=true;csug.innerHTML="";cq.setAttribute("aria-expanded","false")};
      const chl=t=>{const q=cq.value.replace(/\s+/g," ").trim();const i=q?t.toLowerCase().indexOf(q.toLowerCase()):-1;return i<0?esc(t):esc(t.slice(0,i))+"<b>"+esc(t.slice(i,i+q.length))+"</b>"+esc(t.slice(i+q.length))};
      const drawC=()=>{
        if(document.activeElement!==cq){hideC();return}
        const q=cq.value.trim(),ym=ymOf(dIn.value||today());
        cList=catSuggest(q,groupsFor(ym),ym,(s.querySelector("#f-venmo").checked?"Venmo: ":"")+merIn.value,kind);if(cHi>=cList.length)cHi=-1;
        if(!cList.length){hideC();return}
        let lastHead=null;
        csug.innerHTML=cList.map((e,i)=>{const head=e.head&&e.head!==lastHead?'<div class="chead2">'+esc(e.head)+'</div>':'';lastHead=e.head||lastHead;
          return head+'<button type="button" role="option" data-ci="'+i+'" aria-selected="'+(i===cHi)+'"'+(i===cHi?' class="hl"':'')+'><span class="mn">'+(e.kind==="create"?'<span class="cplus">+</span>Create “'+esc(e.name)+'”':chl(e.name))+'</span>'+
            (e.kind==="idea"||e.kind==="create"?'<span class="cnew">New</span>':'<span class="mc">'+esc(e.group||"")+'</span>')+'</button>'}).join("");
        csug.classList.toggle("noq",!q);csug.hidden=false;cplace.hidden=true;cq.setAttribute("aria-expanded","true")};
      const selectItem=(id,sub)=>{if(![...cat.options].some(o=>o.value===id))return false;cat.value=id;catTouched=true;s.querySelector(".crow").classList.remove("auto");
        if(id===MISC_ID&&sub){subSel.value=sub;subPrev=sub;subTouched=true}drawCat();cq.value=catLabel();return true};
      const finishPick=()=>{hideC();cq.blur();try{haptic()}catch(_){}showPad(true)};
      const crow=s.querySelector(".crow");let autoT=0;
      // location: an editable field with suggestions; new transactions fill in where you are
      const nearEl=s.querySelector("#f-near");
      const LF=locField(s,{input:s.querySelector("#f-loc"),sug:s.querySelector("#f-lsug"),gps:s.querySelector("#f-gps"),
        merchant:()=>(s.querySelector("#f-venmo").checked?"Venmo: ":"")+merIn.value,date:()=>s.querySelector("#f-date").value||today(),selfId:existing&&existing.id,
        initial:existing?existing.loc:null,auto:!existing,onFix:()=>drawNear(),
        setMerchant:n=>{if(s.querySelector("#f-venmo").checked)return;merIn.value=n;merIn.dispatchEvent(new Event("input",{bubbles:true}));merIn.dispatchEvent(new Event("change",{bubbles:true}))},onFocus:()=>showPad(false),onDone:()=>showPad(true)});
      const drawNear=()=>{if(!nearEl)return;const v=LOC.last;const names=v?LOC.nearby(v):[];if(!names.length||merIn.value.trim()){nearEl.hidden=true;return}
        nearEl.innerHTML='<span>Nearby</span>'+names.map(n=>'<button type="button" data-near="'+esc(n.name)+'">'+(n.poi?'📍 ':'')+esc(n.name)+'</button>').join("");nearEl.hidden=false};
      if(nearEl)nearEl.addEventListener("click",e=>{const b=e.target.closest("[data-near]");if(!b)return;merIn.value=b.dataset.near;nearEl.hidden=true;
        const past=merchIndex().find(x=>x.name.toLowerCase()===b.dataset.near.toLowerCase());if(past)s.querySelector("#f-venmo").checked=!!past.venmo;
        autoCat();LF.merchantChanged();try{haptic()}catch(_){}});
      merIn.addEventListener("input",()=>{drawNear();LF.merchantChanged()});
      const autoCat=()=>{
        if(existing||catTouched)return;
        const ym=ymOf(dIn.value||today()),ex=catExisting(groupsFor(ym),kind),m=(s.querySelector("#f-venmo").checked?"Venmo: ":"")+merIn.value;
        if(!merchKey(m))return;
        let pick=null;const past=merchIndex().find(e=>e.name.toLowerCase()===merchKey(m));
        if(past&&past.itemId)pick=past.itemId===MISC_ID&&past.sub?ex.find(e=>e.kind==="sub"&&e.name===past.sub):ex.find(e=>e.kind==="item"&&e.id===past.itemId);
        if(!pick){const g=catGuess(m,ex)[0];if(g)pick=g.e}
        if(!pick)return;
        const id=pick.kind==="sub"?MISC_ID:pick.id;if(![...cat.options].some(o=>o.value===id))return;
        const same=cat.value===id&&(pick.kind!=="sub"||subSel.value===pick.name);
        cat.value=id;if(pick.kind==="sub"){subSel.value=pick.name;subPrev=pick.name}
        drawCat();if(document.activeElement!==cq)cq.value=catLabel();
        if(!same){crow.classList.remove("auto");void crow.offsetWidth}crow.classList.add("auto")};
      const autoSoon=()=>{clearTimeout(autoT);autoT=setTimeout(autoCat,220)};
      merIn.addEventListener("input",autoSoon);merIn.addEventListener("change",autoCat);s.querySelector("#f-venmo").addEventListener("change",autoCat);
      const askPlace=name=>{ // where should a brand-new category live?
        const ym=ymOf(dIn.value||today()),gs=groupsFor(ym),hint=catHintGroup(name,gs);
        const chips=gs.map(g=>{const misc=g.items.some(it=>it.id===MISC_ID);return{gid:g.id,label:misc?g.name+" subcategory":g.name,misc}});
        chips.sort((a,b)=>(b.gid===hint)-(a.gid===hint));
        cplace.innerHTML='<p>Add “<b>'+esc(name)+'</b>” to</p><div class="cchips2">'+chips.map(c=>'<button type="button" data-cpg="'+esc(c.gid)+'" class="'+(c.gid===hint?"sug":"")+'">'+esc(c.label)+'</button>').join("")+'</div><button type="button" class="ccancel" data-cpx>Cancel</button>';
        cplace.dataset.name=name;cplace.hidden=false;hideC();cq.blur();cq.value=name;showPad(false);
        requestAnimationFrame(()=>cplace.scrollIntoView({block:"nearest",behavior:"smooth"}))};
      cplace.addEventListener("click",async e=>{
        if(e.target.closest("[data-cpx]")){cplace.hidden=true;cq.value=catLabel();showPad(true);return}
        const b=e.target.closest("[data-cpg]");if(!b)return;const name=cplace.dataset.name,ym=ymOf(dIn.value||today());
        const groupsNow=JSON.parse(JSON.stringify(groupsFor(ym))),g=groupsNow.find(x=>x.id===b.dataset.cpg);if(!g)return;
        if(g.items.some(it=>it.id===MISC_ID)){const nm=ensureSub(name);selectItem(MISC_ID,nm);cplace.hidden=true;try{haptic()}catch(_){}showPad(true);return}
        if(!S.db||S.readOnly){toast("Saving isn't available here");return}
        const dup=g.items.find(it=>it.name.toLowerCase()===name.toLowerCase());
        let id=dup&&dup.id;
        if(!id){id=uid();g.items.push({id,name,planned:0});b.disabled=true;
          try{await S.db.doc("budgets/"+ym).set({groups:groupsNow,income:incomeFor(ym),updatedAt:new Date().toISOString()});S.budgets[ym]=Object.assign({},S.budgets[ym]||{},{groups:groupsNow});toast("Added "+name+" to "+g.name)}
          catch(err){b.disabled=false;toast("Couldn't add it. Check your connection.");return}
          let og=[...cat.querySelectorAll("optgroup")].find(x=>x.label===g.name);if(!og){og=document.createElement("optgroup");og.label=g.name;cat.appendChild(og)}
          const o=document.createElement("option");o.value=id;o.textContent=name;og.appendChild(o)}
        selectItem(id);cplace.hidden=true;try{haptic()}catch(_){}showPad(true)});
      const pickC=e=>{
        if(e.kind==="item"){selectItem(e.id);finishPick();return}
        if(e.kind==="sub"){selectItem(MISC_ID,e.name);finishPick();return}
        askPlace(e.name)};
      csug.addEventListener("pointerdown",e=>{if(e.target.closest("[data-ci]"))e.preventDefault()});
      csug.addEventListener("mousedown",e=>e.preventDefault());
      csug.addEventListener("click",e=>{const b=e.target.closest("[data-ci]");if(!b)return;e.preventDefault();e.stopPropagation();const x=cList[+b.dataset.ci];if(x)pickC(x)});
      cq.addEventListener("input",()=>{cHi=-1;drawC()});
      cq.addEventListener("focus",()=>{cplace.hidden=true;cq.placeholder=catLabel()||"Type or pick";cq.value="";drawC()});
      cq.addEventListener("blur",()=>setTimeout(()=>{if(document.activeElement!==cq){hideC();cq.placeholder="Type or pick";if(cplace.hidden)cq.value=catLabel()}},120));
      cq.addEventListener("keydown",e=>{
        if(e.key==="Enter"){e.preventDefault();e.stopImmediatePropagation();const x=cHi>=0?cList[cHi]:cList.find(c=>c.kind!=="create"&&c.name.toLowerCase()===cq.value.trim().toLowerCase())||(cq.value.trim()?cList[0]:null);if(x)pickC(x);else{hideC();cq.blur();showPad(true)}return}
        if(csug.hidden||!cList.length)return;
        if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();const n=cList.length;cHi=e.key==="ArrowDown"?(cHi+1)%n:(cHi<=0?n-1:cHi-1);drawC()}
        else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();hideC()}});
      drawAmt();drawKeys();drawCat();
      let press=k=>{tKey(T,k);drawAmt();if(T.calc)drawKeys()};
      padEl.addEventListener("click",e=>{const k=e.target.closest("[data-k]");if(k){press(k.dataset.k);return}if(e.target.closest("#f-save"))save()});
      padEl.addEventListener("change",e=>{if(e.target.id==="f-calc"){T.calc=e.target.checked;ls.set("pb.calc",T.calc?"1":"0");if(!T.calc&&T.ops.length){const v=tVal(T);T.ops=[];T.cur=v?String(v):""}drawKeys();drawAmt()}});
      const showPad=on=>{s.classList.toggle("kboff",!on);drawAmt()};
      amtB.onclick=()=>{if(document.activeElement&&document.activeElement.blur)document.activeElement.blur();showPad(true)};
      s.querySelectorAll(".tin,.tnote").forEach(i=>{i.addEventListener("focus",()=>showPad(false));i.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();i.blur();showPad(true)}})});
      s.querySelector("#f-x").onclick=closeSheet;
      s.querySelector("#f-save2").onclick=()=>save();
      s.querySelector("#f-kind").onclick=e=>{const b=e.target.closest("button");if(!b)return;kind=b.dataset.k;setTimeout(()=>{try{drawChips()}catch(_){}},0);s.querySelectorAll("#f-kind button").forEach(x=>x.setAttribute("aria-pressed",String(x.dataset.k===kind)));const cl=s.querySelector("#f-clab");if(cl)cl.textContent=kind==="refund"?"Add to":"Budget Item";drawAmt()};
      const dIn=s.querySelector("#f-date");let dYm=ymOf(d);
      {const cam=s.querySelector("#f-cam"),cin=s.querySelector("#f-camin");if(cam&&cin){cam.onclick=()=>cin.click();cin.onchange=async()=>{const f=cin.files&&cin.files[0];cin.value="";if(!f)return;
        const r=await scanReceipt(f,s);if(!r)return;let n=0;
        if(r.amount>0){T.cur=String(Math.round(r.amount*100));T.ops=[];T.fresh=false;drawAmt();n++}
        if(r.merchant){const mi=s.querySelector("#f-mer");mi.value=r.merchant;mi.dispatchEvent(new Event("input",{bubbles:true}));mi.dispatchEvent(new Event("change",{bubbles:true}));n++}
        if(r.date&&r.date!==dIn.value){dIn.value=r.date;dIn.dispatchEvent(new Event("change",{bubbles:true}));n++}
        try{haptic()}catch(_){}toast(n?"Filled from the receipt. Give it a quick check":"Couldn't read that receipt. Try a flatter, brighter photo")}}}dIn.addEventListener("change",()=>{if(!dIn.value)return;try{setTimeout(updLeft,0)}catch(_){}s.querySelector("#f-dtxt").textContent=fmtLong(dIn.value);
        const ym=ymOf(dIn.value),mp=s.querySelector("#f-mpill");mp.textContent="→ "+MONTHS[+dIn.value.slice(5,7)-1];if(ym!==S.ym&&mp.hidden){mp.hidden=false;mp.classList.remove("pop");void mp.offsetWidth;mp.classList.add("pop")}else if(ym===S.ym)mp.hidden=true;
        if(ym!==dYm){dYm=ym;const prev=cat.value,gs=groupsFor(ym),ok=!prev||findItem(gs,prev)||incomeFor(ym).some(x=>x.id===prev);
          cat.innerHTML='<option value="">Select</option>'+categoryOptions(gs,ok?prev:"",ym);cat.value=ok?prev:"";drawCat();
          if(!ok){cq.value="";toast("Pick a "+MONTHS[+ym.slice(5,7)-1]+" budget item")}}});
      cat.addEventListener("change",()=>{drawCat();cq.value=catLabel();cplace.hidden=true;s.querySelector(".crow").classList.remove("auto")});
      s.addEventListener("keydown",e=>{if(e.target.closest("input,select,textarea")||s.classList.contains("kboff"))return;
        const m={"Backspace":"⌫","Delete":"⌫","+":"+","-":"−","*":"×","/":"÷","=":"="};
        if(/^\d$/.test(e.key)){press(e.key);e.preventDefault()}else if(e.key==="Enter"){save();e.preventDefault()}else if(m[e.key]&&(T.calc||m[e.key]==="⌫")){press(m[e.key]);e.preventDefault()}});
      const syncBtn=s.querySelector("#f-sync");
      if(syncBtn)syncBtn.onclick=async()=>{syncBtn.disabled=true;syncBtn.textContent="Sending…";const ok=await pushToSheet(existing.id,existing);if(ok){closeSheet();toast("Added to your sheet")}else{syncBtn.disabled=false;syncBtn.textContent="Send to sheet"}};
      // reimbursement: one entry here becomes the purchase plus a separate "money back" transaction
      const rb=s.querySelector("#f-rb"),rbody=s.querySelector("#f-rbody"),ramt=s.querySelector("#f-ramt"),rsum=s.querySelector("#f-rsum"),rdate=s.querySelector("#f-rdate");let rTouched=false;
      const rVal=()=>{const v=parseFloat(String(ramt&&ramt.value||"").replace(/[^0-9.]/g,""));return isNaN(v)?0:round2(v)};
      const drawR=()=>{if(!rb)return;const on=rb.checked&&kind==="expense";rbody.hidden=!on;if(!on)return;const a=round2(tVal(T)/100);
        if(!rTouched)ramt.value=a?money(a):"";const r=rVal();
        rsum.innerHTML=a?(r>a+.004?'<b class="bad">That’s more than the purchase.</b>':'Logs <b>'+money(a)+'</b> spent and <b class="ok">+'+money(r)+'</b> back · you’re out <b>'+money(round2(a-r))+'</b>'):'Enter the purchase amount first.'};
      if(rb){rb.addEventListener("change",()=>{drawR();if(rb.checked)setTimeout(()=>rbody.scrollIntoView({block:"nearest",behavior:"smooth"}),60)});
        ramt.addEventListener("input",()=>{rTouched=true;drawR()});
        ramt.addEventListener("focus",()=>{showPad(false);ramt.select&&ramt.select()});ramt.addEventListener("blur",()=>{const r=rVal();if(r)ramt.value=money(r);drawR()});
        ramt.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();ramt.blur();showPad(true)}});
        s.querySelectorAll("[data-rq]").forEach(b=>b.addEventListener("click",()=>{const a=round2(tVal(T)/100);ramt.value=money(round2(a*(+b.dataset.rq)));rTouched=true;drawR();try{haptic()}catch(_){}}));
        s.querySelector("#f-rfrom").addEventListener("focus",()=>showPad(false));
        rdate.addEventListener("change",()=>{s.querySelector("#f-rdtxt").textContent=rdate.value?fmtLong(rdate.value):"Same day"});
        const pa=press;press=k=>{pa(k);drawR()}; // keep "Full" in step with the amount pad
        s.querySelector("#f-kind").addEventListener("click",()=>setTimeout(drawR,0))}
      // jump between a purchase and its reimbursement
      const pairB=s.querySelector("#f-pair");
      if(pairB)pairB.onclick=async()=>{let pr=txPool().find(t=>t.id===existing.pair);
        if(!pr&&S.db){try{const d=await S.db.doc("tx/"+existing.pair).get();if(d&&d.exists)pr=Object.assign({id:existing.pair},d.data())}catch(_){}}
        if(!pr){toast("Couldn't find the linked transaction. It may have been deleted.");return}
        try{haptic()}catch(_){}txSheet(pr)};
      let rMeth="Venmo";
      s.querySelectorAll("[data-rm]").forEach(b=>b.addEventListener("click",()=>{rMeth=b.dataset.rm;s.querySelectorAll("[data-rm]").forEach(x=>x.setAttribute("aria-checked",String(x===b)));try{haptic()}catch(_){}}));
      const vrow=s.querySelector("#f-vrow"),rcard=s.querySelector("#f-rcard");
      const syncKind=()=>{const exp=kind==="expense";if(rcard){rcard.hidden=!exp;if(!exp&&rb.checked){rb.checked=false;drawR()}}
        if(vrow)vrow.hidden=false;}; // Venmo box on both tabs (paying someone or getting paid)
      syncKind();s.querySelector("#f-kind").addEventListener("click",()=>setTimeout(syncKind,0));
      // Venmo transactions get a person: who you paid, or who paid you
      const prow=s.querySelector("#f-prow"),venB=s.querySelector("#f-venmo"),plbl=s.querySelector("#f-plbl");
      const syncPerson=()=>{prow.hidden=!venB.checked;plbl.textContent=kind==="expense"?"Paid to":"From"};
      venB.addEventListener("change",()=>{syncPerson();if(venB.checked&&!s.querySelector("#f-person").value)setTimeout(()=>s.querySelector("#f-person").focus(),50)});
      s.querySelector("#f-kind").addEventListener("click",()=>setTimeout(syncPerson,0));
      s.querySelector("#f-person").addEventListener("focus",()=>showPad(false));
      let busy=false;
      async function save(){
        if(busy)return;
        const a=round2(tVal(T)/100);
        if(!(a>0)){toast("Enter an amount above $0");showPad(true);shake(amtB);return}
        const itemId=cat.value;if(!itemId){toast("Pick a budget item");shake(s.querySelector(".crow"));return}
        const date=dIn.value||today();
        const g2=groupsFor(ymOf(date)); const f=findItem(g2,itemId)||findItem(groups,itemId);
        const incSrc=incomeFor(ymOf(date)).find(x=>x.id===itemId)||incomeFor(S.ym).find(x=>x.id===itemId);
        const locNow=LF.value();
        const body={amount:a,type:incSrc?"income":kind,merchant:(()=>{const nm=s.querySelector("#f-mer").value.replace(VP,"").trim()||catLabel()||(incSrc?incSrc.name:(f?f.it.name:""));return s.querySelector("#f-venmo").checked&&!(vrow&&vrow.hidden)?("Venmo: "+nm).trim():nm})(),itemId,itemName:incSrc?incSrc.name:(f?f.it.name:""),groupName:incSrc?"Income":(f?f.g.name:""),sub:itemId===MISC_ID?subSel.value:"",date,note:s.querySelector("#f-note").value.trim(),createdAt:existing?existing.createdAt:new Date().toISOString(),sheet:existing?(existing.sheet||"failed"):"sending",sheetMsg:existing?(existing.sheetMsg||""):""};
        if(!body.merchant.replace(VP,"").trim()){const nm=itemId===MISC_ID&&body.sub?body.sub:(body.itemName||"");if(nm)body.merchant=(s.querySelector("#f-venmo").checked&&!(vrow&&vrow.hidden)?"Venmo: ":"")+nm}
        if(locNow)body.loc=locNow;
        if(existing&&existing.sched){body.sched=true;if(existing.rep)body.rep=existing.rep}
        /* you typed or picked a different spot while standing there: remember it for next time (only spots without a business name) */
        try{const fx=LOC.last;if(locNow&&locNow.src!=="gps"&&!locNow.name&&fx&&Date.now()-LOC.lastAt<15*60e3&&(fx.acc||0)<200&&date===today())LOC.learn(locNow.label,fx)}catch(_){}
        {const who=s.querySelector("#f-person").value.trim();if(s.querySelector("#f-venmo").checked&&who)body.person=who}
        const rOn=!existing&&rb&&rb.checked&&body.type==="expense",rAmt=rOn?rVal():0;
        if(rOn&&!(rAmt>0)){toast("Enter how much you're getting back");ramt.focus();return}
        if(rOn&&rAmt>a+.004){toast("The amount back is more than the purchase");ramt.focus();return}
        if(!S.db||S.readOnly){toast("Saving isn't available here");return}
        busy=true;
        try{
          let ref;const txc=S.db.collection("tx"),addFast=async v=>{if(txc.newId){const id=txc.newId();bgWrite(S.db.doc("tx/"+id).set(v));return{id}}return txc.add(v)};
          if(existing)bgWrite(S.db.doc("tx/"+existing.id).set(body));
          else ref=await addFast(body);
          ls.set("pb.lastItem",itemId);closeSheet();
          const moved=ymOf(date)!==S.ym;
          if(!existing){let left=null;try{if(body.type!=="income"&&ymOf(body.date)===S.ym){const f=findItem(groupsFor(S.ym),itemId);if(f&&+f.it.planned>0){const sp=S.tx.filter(t=>t.itemId===itemId&&!(ref&&t.id===ref.id)).reduce((x,t)=>x+sAmt(t),0)+sAmt(body);left={n:f.it.name,v:round2(+f.it.planned-sp)}}}}catch(_){}
            FLY={item:body.type==="income"?null:itemId,amt:rOn?round2(a-rAmt):a,kind:body.type,over:!!(left&&left.v<0)};
            setTimeout(()=>celebrate(rOn?round2(a-rAmt):a,body.merchant,body.type,left),180)}else if(!moved)toast("Saved");
          if(moved)goMonth(ymOf(date),existing?existing.id:ref.id,!existing);
          let rref=null,rbodyDoc=null;
          if(ref&&rOn){const from=s.querySelector("#f-rfrom").value.trim(),nm=body.merchant.replace(VP,"");
            rbodyDoc=Object.assign({},body,{person:undefined,amount:rAmt,type:"refund",merchant:rMeth+": "+(from?from+" reimbursement":"Reimbursement for "+nm),reimbMethod:rMeth,date:rdate.value||date,note:"For "+nm+(rAmt<a-.004?" ("+money(rAmt)+" of "+money(a)+")":"")+(body.note?" · "+body.note:""),
              pair:ref.id,reimbFrom:from,person:from||undefined,createdAt:new Date(Date.now()+1).toISOString(),sheet:"sending",sheetMsg:""});delete rbodyDoc.loc;delete rbodyDoc.vpaid;delete rbodyDoc.vdone;delete rbodyDoc.vstate;
            if(!rbodyDoc.person)delete rbodyDoc.person;try{rref=await addFast(rbodyDoc);bgWrite(S.db.doc("tx/"+ref.id).update({pair:rref.id}))}catch(_){toast("Saved the purchase, but not the reimbursement. Add it as income.")}}
          if(ref){pushToSheet(ref.id,body).then(ok=>{if(rref)return pushToSheet(rref.id,rbodyDoc).then(ok2=>{if(ok&&ok2)toast("Added both to your sheet")});if(ok)toast("Added "+money(a)+" to your sheet")})}
          // a fix that was still on its way when you tapped Done lands a moment later
          if(ref&&!locNow&&LF.pending()){const id=ref.id;LF.pending().then(l=>{if(l)S.db.doc("tx/"+id).update({loc:l}).catch(()=>{})})}
        }catch(e){busy=false;toast(e&&e.code==="quota_exceeded"?"Storage is full":"Couldn't save. Check your connection.")}
      }
      if(existing)s.querySelector("#f-del").onclick=()=>{
        const c=s.querySelector("#f-conf");c.innerHTML='<div class="confirm">Delete this '+money(+existing.amount)+' transaction? This can\'t be undone.<div class="btnrow" style="margin-top:10px"><button class="btn sec" id="cn">Keep it</button><button class="btn" style="background:var(--over)" id="cy">Delete</button></div></div>';
        c.querySelector("#cn").onclick=()=>c.innerHTML="";
        c.querySelector("#cy").onclick=()=>{Promise.resolve(S.db.doc("tx/"+existing.id).delete()).catch(()=>toast("Couldn't delete. Try again."));closeSheet();toast("Deleted")};
      };
    });
}
// Just the transactions in one Misc subcategory this month
function subSheet(sub){
  const NOSUB="No subcategory",list=sortedTx().filter(t=>t.itemId===MISC_ID&&(t.sub||NOSUB)===sub),tot=round2(list.reduce((a,t)=>a+sAmt(t),0));
  const rows=list.map(t=>{const back=t.type==="refund"||t.type==="income";return '<button class="txrow" data-tx="'+esc(t.id)+'"><div class="l"><div class="m">'+esc(t.merchant||"Purchase")+'</div><div class="c">'+esc(fmtDay(t.date))+(t.note?" · "+esc(t.note):"")+'</div></div><div class="a num"'+(back?' style="color:var(--ok)">+':'>')+money(+t.amount)+'</div></button>'}).join("");
  openSheet('<h3>'+esc(sub)+'</h3><p class="note num" style="margin:-4px 0 12px">'+money(tot)+' · '+list.length+' transaction'+(list.length===1?"":"s")+' in '+MONTHS[+S.ym.slice(5)-1]+'</p>'+
    (rows?'<div class="sublist">'+rows+'</div>':'<p class="note">Nothing in '+esc(sub)+' this month.</p>')+'<div class="btnrow" style="margin-top:14px"><button class="btn sec" id="ss-done">Done</button></div>',
    sh=>{sh.querySelector("#ss-done").onclick=closeSheet;sh.querySelectorAll("[data-tx]").forEach(b=>b.onclick=()=>{const t=S.tx.find(x=>x.id===b.dataset.tx);if(t)isHist(t)?histSheet(t):txSheet(t)})});
}
function itemSheet(id,preSub){
  const groups=JSON.parse(JSON.stringify(groupsFor(S.ym)));const f=findItem(groups,id);if(!f)return;
  const list=sortedTx().filter(t=>t.itemId===id);const spent=round2(list.reduce((a,t)=>a+sAmt(t),0)),back=round2(list.filter(t=>t.type==="refund"||t.type==="income").reduce((a,t)=>a+(+t.amount||0),0));
  const isM=id===MISC_ID,NOSUB="No subcategory",subOf=t=>t.sub||NOSUB;
  let subsH="";
  if(isM&&list.length){const by={},cnt={};list.forEach(t=>{const k=subOf(t);by[k]=round2((by[k]||0)+sAmt(t));cnt[k]=(cnt[k]||0)+1});
    const ks=Object.keys(by).sort((a,b)=>(a===NOSUB)-(b===NOSUB)||by[b]-by[a]);const mx=Math.max(...ks.map(k=>by[k]),0.01);
    subsH='<div class="subs" role="group" aria-label="Spending by subcategory"><h4>By subcategory <span>· tap to filter</span></h4>'+ks.map(k=>'<button class="subr" data-subf="'+esc(k)+'" aria-pressed="false"><div class="irow"><span class="nm">'+esc(k)+' <span class="cnt">'+cnt[k]+'</span></span><span class="v num">'+money(by[k])+'</span></div><div class="track fill"><i style="width:'+Math.max(2,by[k]/mx*100).toFixed(1)+'%;background:'+subColor(k)+'"></i></div></button>').join("")+'</div>'}
  /* rows are divs so the amount can be its own tap target: tap the amount to type a new one right there */
  let tx=list.map(t=>'<div class="txrow" role="button" tabindex="0" data-tx="'+esc(t.id)+'"'+(isM?' data-sub="'+esc(subOf(t))+'"':'')+'><div class="l"><div class="m">'+esc(t.merchant||"Purchase")+'</div><div class="c">'+esc(fmtDay(t.date))+(isM?' · '+esc(subOf(t)):'')+'</div></div>'+
    (isHist(t)?'<div class="a num"'+(t.type==="refund"||t.type==="income"?' style="color:var(--ok)">+':'>')+money(+t.amount)+'</div>':'<button type="button" class="a num iamt" data-amt="'+esc(t.id)+'"'+(t.type==="refund"||t.type==="income"?' style="color:var(--ok)">+':'>')+money(+t.amount)+'</button>')+'</div>').join("");
  const NX=nextMonthName(),isAs=!!f.g.aside;
  const asH=isAs?'<div class="ahbox"><b>Set aside for '+NX+'</b><span>Saved from '+MONTHS[+S.ym.slice(5)-1]+'\'s money. It isn\'t counted as spending here and shows up in '+NX+'\'s Planned as starting money. Log the real payment in '+NX+' on its regular item.</span></div>':'';
  openSheet('<h3>'+esc(f.it.name)+'</h3>'+
    '<div class="two"><div class="field"><label for="i-name">Name</label><input id="i-name" value="'+esc(f.it.name)+'"></div><div class="field"><label for="i-plan">Planned</label><input id="i-plan" inputmode="decimal" value="'+(+f.it.planned||0).toFixed(2)+'"></div></div>'+
    asH+'<div class="ltb" id="i-ltb"></div>'+

    '<p class="note num" style="margin:0 0 14px">'+money(spent)+' spent in '+MONTHS[+S.ym.slice(5)-1]+(back?' (after '+money(back)+' back)':'')+'. Planned amounts carry into new months until you change them.</p>'+
    '<div class="btnrow"><button class="btn" id="i-save">Save</button><button class="btn sec" id="i-add">Log purchase</button></div>'+
    (subsH?'<div style="margin-top:16px">'+subsH+'</div>':'')+
    (tx?'<div style="margin-top:'+(subsH?4:16)+'px" id="i-txs">'+tx+'</div>':'')+
    '<div class="btnrow" style="margin-top:16px"><button class="btn danger" id="i-del">Remove item</button></div><div id="i-conf"></div>',
    s=>{
      const others=round2(allItems(groups).reduce((a,x)=>a+(x.it.id===id?0:(+x.it.planned||0)),0));
      const incT=incomeTotal(incomeFor(S.ym)), planIn=s.querySelector("#i-plan"), ltb=s.querySelector("#i-ltb");
      const upd=()=>{
        if(!incomeFor(S.ym).length){ltb.innerHTML='<span class="note">Add income on the Budget tab to see what\'s left to budget.</span>';return}
        const cur=parseAmt(planIn.value||"0");const left=round2(incT-others-(isNaN(cur)?0:cur));
        ltb.className="ltb"+(left<0?" over":left===0?" zero":"");
        ltb.innerHTML=left===0?'<b>It\'s a zero-based budget! 🎉</b>':'<span><b class="num">'+money(Math.abs(left))+'</b> '+(left>0?"left to budget":"over your income")+'</span>'+(left!==0?'<button class="addlink" id="i-fill" style="padding:0">'+(left>0?"Add to this item":"Take from this item")+'</button>':'');
        const fb=ltb.querySelector("#i-fill");if(fb)fb.onclick=()=>{const c=parseAmt(planIn.value||"0");planIn.value=Math.max(0,round2((isNaN(c)?0:c)+left)).toFixed(2);upd()};
      };
      planIn.addEventListener("input",upd);upd();
      s.querySelector("#i-save").onclick=async()=>{const p=parseAmt(s.querySelector("#i-plan").value);const n=s.querySelector("#i-name").value.trim();if(!n){toast("Give the item a name");shake(s.querySelector("#i-name"));return}if(isNaN(p)||p<0){toast("Planned must be $0 or more");shake(s.querySelector("#i-plan"));return}f.it.name=n;f.it.planned=p;if(await saveGroups(groups)){closeSheet();toast("Saved")}};
      s.querySelector("#i-add").onclick=()=>{ls.set("pb.lastItem",id);txSheet()};
      s.querySelectorAll("[data-tx]").forEach(b=>b.onclick=e=>{if(e.target.closest(".iamt"))return;const t=S.tx.find(x=>x.id===b.dataset.tx);if(t)isHist(t)?histSheet(t):txSheet(t)});
      const gp=sheetPad(s);
      s.querySelectorAll("[data-amt]").forEach(b=>b.onclick=e=>{e.stopPropagation();const t=S.tx.find(x=>x.id===b.dataset.amt);if(!t)return;if(gp.active()===b){gp.finish(true);return}
        const back=t.type==="refund"||t.type==="income",show=a=>{b.textContent=(back?"+":"")+money(a)};
        gp.open(b,+t.amount,v=>show(v),async v=>{if(v==null||!(v>0)||Math.abs(v-(+t.amount))<.005){if(v!=null&&!(v>0))toast("Enter an amount above $0");show(+t.amount);return}
          const old=+t.amount;t.amount=v;show(v);try{haptic()}catch(_){}render();
          try{await S.db.doc("tx/"+t.id).update({amount:v});toast(t.sheet==="synced"?"Updated. Fix the row in your Finance Tracker too.":"Updated to "+money(v))}catch(_){t.amount=old;show(old);render();toast("Couldn't save that. Check your connection.")}})});
      s.querySelectorAll("[data-subf]").forEach(b=>b.onclick=()=>{const on=b.getAttribute("aria-pressed")!=="true",k=b.dataset.subf;
        s.querySelectorAll("[data-subf]").forEach(x=>x.setAttribute("aria-pressed",String(on&&x===b)));
        s.querySelectorAll("#i-txs [data-sub]").forEach(r=>r.hidden=on&&r.dataset.sub!==k);try{haptic()}catch(_){}});
      if(preSub){const pb=[...s.querySelectorAll("[data-subf]")].find(x=>x.dataset.subf===preSub);if(pb){pb.setAttribute("aria-pressed","true");s.querySelectorAll("#i-txs [data-sub]").forEach(r=>r.hidden=r.dataset.sub!==preSub)}}
      s.querySelector("#i-del").onclick=()=>{const c=s.querySelector("#i-conf");c.innerHTML='<div class="confirm">Remove '+esc(f.it.name)+' from '+MONTHS[+S.ym.slice(5)-1]+'? Its '+list.length+' transaction'+(list.length===1?"":"s")+' will show as uncategorized.<div class="btnrow" style="margin-top:10px"><button class="btn sec" id="cn">Keep it</button><button class="btn" style="background:var(--over)" id="cy">Remove</button></div></div>';
        c.querySelector("#cn").onclick=()=>c.innerHTML="";
        c.querySelector("#cy").onclick=async()=>{f.g.items=f.g.items.filter(x=>x.id!==id);if(await saveGroups(groups)){closeSheet();toast("Removed")}}};
    });
}
function newItemSheet(gid){
  const groups=JSON.parse(JSON.stringify(groupsFor(S.ym)));const g=groups.find(x=>x.id===gid);if(!g)return;
  openSheet('<h3>Add item to '+esc(groupLbl(g))+'</h3><div class="two"><div class="field"><label for="n-name">Name</label><input id="n-name" placeholder="e.g. Coffee"></div><div class="field"><label for="n-plan">Planned</label><input id="n-plan" inputmode="decimal" placeholder="0.00"></div></div><div class="btnrow"><button class="btn" id="n-save">Add item</button></div>',
    s=>{setTimeout(()=>s.querySelector("#n-name").focus(),60);s.querySelector("#n-save").onclick=async()=>{const n=s.querySelector("#n-name").value.trim();const p=parseAmt(s.querySelector("#n-plan").value||"0");if(!n){toast("Give the item a name");return}g.items.push({id:uid(),name:n,planned:isNaN(p)?0:p});if(await saveGroups(groups)){closeSheet();toast("Added "+n)}}});
}
function groupSheet(gid){
  const groups=JSON.parse(JSON.stringify(groupsFor(S.ym)));const isNew=!gid;const g=isNew?{id:uid(),name:"",items:[]}:groups.find(x=>x.id===gid);if(!g)return;
  const idx=groups.indexOf(g);
  openSheet('<h3>'+(isNew?"New group":esc(groupLbl(g)))+'</h3>'+(g.aside?'<p class="note" style="margin:-4px 0 12px">Its name follows the month: next month it reads Set aside for '+esc(nextMonthName(ymAdd(S.ym,1)))+'.</p>':'')+'<div class="field"'+(g.aside?" hidden":"")+'><label for="g-name">Group name</label><input id="g-name" placeholder="e.g. Giving" value="'+esc(g.name)+'"></div><div class="btnrow"'+(g.aside?" hidden":"")+'><button class="btn" id="g-save">'+(isNew?"Add group":"Rename")+'</button></div>'+
    (isNew?'':'<div class="btnrow" style="margin-top:10px"><button class="btn sec" id="g-up"'+(idx===0?" disabled":"")+'>Move up</button><button class="btn sec" id="g-down"'+(idx===groups.length-1?" disabled":"")+'>Move down</button></div><div class="btnrow" style="margin-top:10px"><button class="btn danger" id="g-del">Remove group</button></div><div id="g-conf"></div>'),
    s=>{
      if(isNew)setTimeout(()=>s.querySelector("#g-name").focus(),60);
      s.querySelector("#g-save").onclick=async()=>{const n=s.querySelector("#g-name").value.trim();if(!n){toast("Give the group a name");return}g.name=n;if(isNew)groups.push(g);if(await saveGroups(groups)){closeSheet();toast("Saved")}};
      if(isNew)return;
      const mv=async d=>{groups.splice(idx,1);groups.splice(idx+d,0,g);if(await saveGroups(groups))closeSheet()};
      s.querySelector("#g-up").onclick=()=>mv(-1);s.querySelector("#g-down").onclick=()=>mv(1);
      s.querySelector("#g-del").onclick=()=>{const c=s.querySelector("#g-conf");c.innerHTML='<div class="confirm">Remove '+esc(g.name)+' and its '+g.items.length+' item'+(g.items.length===1?"":"s")+' from this month? Transactions stay, marked uncategorized.<div class="btnrow" style="margin-top:10px"><button class="btn sec" id="cn">Keep it</button><button class="btn" style="background:var(--over)" id="cy">Remove</button></div></div>';
        c.querySelector("#cn").onclick=()=>c.innerHTML="";c.querySelector("#cy").onclick=async()=>{groups.splice(idx,1);if(await saveGroups(groups)){closeSheet();toast("Removed")}}};
    });
}
/* Planned breakdown: carryover + paychecks + adjustment = planned total.
   Paychecks repeat every 14 days: a month with no saved paychecks gets dates counted forward from the last known payday. */
function ymAdd(ym,k){const [y,m]=ym.split("-").map(Number),d=new Date(y,m-1+k,1);return d.getFullYear()+"-"+pad(d.getMonth()+1)}
function partsPays(pt){if(!pt)return null;if(Array.isArray(pt.pays))return pt.pays.map(x=>({d:x.d||"",amt:+x.amt||0}));
  const a=[];if(pt.p1||pt.d1)a.push({d:pt.d1||"",amt:+pt.p1||0});if(pt.p2||pt.d2)a.push({d:pt.d2||"",amt:+pt.p2||0});return a}
function savedPays(ym){const b=S.budgets[ym],x=b&&Array.isArray(b.income)&&b.income[0];return x&&x.parts?partsPays(x.parts):null}
function scheduledPays(ym){
  // latest payday saved in an earlier month, then every 14 days
  let last=null,amt=0;Object.keys(S.budgets).filter(k=>k<ym).sort().forEach(k=>{(savedPays(k)||[]).forEach(p=>{if(p.d&&(!last||p.d>last)){last=p.d;amt=p.amt}})});
  if(!last)return null;const out=[];let d=new Date(last+"T12:00:00");
  for(let n=0;n<80;n++){d.setDate(d.getDate()+14);const iso=d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate());if(iso.slice(0,7)>ym)break;if(iso.slice(0,7)===ym)out.push({d:iso,amt})}
  return out.length?out:null}
/* Venmo moves through MSUFCU 1–3 business days after the transaction. A Venmo transaction counts as
   "pending" (not yet in the MSUFCU balance) until 3 business days pass, unless marked: bankCleared true/false. */
const isVenmoTx=t=>/^\s*venmo\s*:/i.test(t.merchant||"");
function addBizDays(iso,n){const d=new Date(iso+"T12:00:00");while(n>0){d.setDate(d.getDate()+1);const w=d.getDay();if(w!==0&&w!==6)n--}return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
/* Venmo tracker. vstate: "req" (requested, waiting on the person) → "xfer" (moving, up to 3 business days) → "done" (checked off as in MSUFCU).
   Nothing clears on its own: past the window it turns red until it's checked off. Venmo older than VEN_START counts as done. */
const VEN_START="2026-10-24",VEN={list:[],unsub:null};
function vst(t){if(t.vstate==="req"||t.vstate==="xfer"||t.vstate==="done")return t.vstate;if(t.bankCleared===true)return "done";if(t.date<VEN_START)return "done";return "xfer"}
const venIn=t=>t.type==="refund"||t.type==="income";
function addDaysISO(iso,n){const d=new Date(iso+"T12:00:00");d.setDate(d.getDate()+n);return d.getFullYear()+"-"+pad(d.getMonth()+1)+"-"+pad(d.getDate())}
const venStart=t=>t.vpaid||t.date,venDue=t=>vst(t)==="req"?addDaysISO(t.date,7):addBizDays(venStart(t),3),venLate=(t,td)=>td>venDue(t);
function venmoPending(t,td){return isVenmoTx(t)&&!isHist(t)&&t.date<=td&&vst(t)!=="done"}
/* Guess only, nothing to mark: a Venmo is "maybe still moving" for 3 business days after its date;
   a Venmo reimbursement (money you asked for) may not even be paid yet, so it's a maybe for 10 days. */
const venUnpaid=t=>!!(t.pair&&venIn(t));
function venMaybe(t,td){if(!isVenmoTx(t)||isHist(t)||t.date>td)return false;return td<=(venUnpaid(t)?addDaysISO(t.date,10):addBizDays(t.date,3))}
const venEff=t=>round2((venIn(t)?-1:1)*(+t.amount||0)); /* how much higher MSUFCU reads while it hasn't moved */
function venMatch(cands,diff){const c=cands.slice(0,14);let best=null;
  for(let m=1;m<(1<<c.length);m++){let s=0,n=0;for(let i=0;i<c.length;i++)if(m&(1<<i)){s+=venEff(c[i]);n++}if(Math.abs(s-diff)<.005&&(!best||n<best.n))best={m,n}}
  return best?c.filter((_,i)=>best.m&(1<<i)):null}
function venWatch(){if(VEN.unsub||!S.db)return;const from=addDaysISO(today(),-75);
  VEN.unsub=S.db.collection("tx").where("date",">=",from).limit(1000).onSnapshot(snap=>{VEN.list=snap.docs.map(x=>Object.assign({id:x.id},x.data())).filter(isVenmoTx);render()},()=>{})}
function venAll(){const m=new Map();VEN.list.forEach(t=>m.set(t.id,t));S.tx.forEach(t=>{if(isVenmoTx(t)&&!isHist(t))m.set(t.id,t)});return [...m.values()]}
async function venSet(id,state){const td=today(),src=venAll().find(x=>x.id===id);if(!src)return;const patch={vstate:state};
  if(state==="xfer"&&vst(src)==="req")patch.vpaid=td;if(state==="done")patch.vdone=td;
  [S.tx,VEN.list].forEach(a=>a.forEach(x=>{if(x.id===id)Object.assign(x,patch)}));try{haptic()}catch(_){}render();
  try{await S.db.doc("tx/"+id).update(patch)}catch(_){toast("Couldn't save that. Check your connection.")}}
const daysAgo=d=>{const n=Math.round((new Date(today()+"T12:00:00")-new Date(d+"T12:00:00"))/864e5);return n<=0?"today":n===1?"yesterday":n+" days ago"};
const venD=d=>MONTHS[+d.slice(5,7)-1].slice(0,3)+" "+(+d.slice(8,10));
function venCap(t,td){const st=vst(t),inn=venIn(t),late=venLate(t,td),who=t.person||String(t.merchant).replace(/^\s*venmo\s*:\s*/i,"");
  if(st==="req")return "Requested "+venD(t.date)+" · "+(late?daysAgo(t.date)+", follow up":daysAgo(t.date));
  if(late)return (inn?"Should have landed":"Should have left MSUFCU")+" by "+venD(venDue(t));
  return (inn?"Paid ":"Sent ")+venD(venStart(t))+" · "+(inn?"lands":"leaves")+" by "+venD(venDue(t))}
function venCardHTML(){const td=today(),open=venAll().filter(t=>venmoPending(t,td));if(!open.length)return "";
  const late=open.filter(t=>venLate(t,td)),req=open.filter(t=>!venLate(t,td)&&vst(t)==="req"),xf=open.filter(t=>!venLate(t,td)&&vst(t)==="xfer");
  const by=(a,b)=>a.date.localeCompare(b.date),net=round2(open.reduce((a,t)=>a+(venIn(t)?1:-1)*(+t.amount||0),0));
  const row=(t,red)=>{const st=vst(t),inn=venIn(t),nm=t.person||String(t.merchant).replace(/^\s*venmo\s*:\s*/i,"")||"Venmo";
    return '<div class="vr'+(red?' red':'')+'"><div class="vn"><b>'+esc(nm)+'</b><small>'+esc(venCap(t,td))+'</small>'+(red?'':'<span class="vdots"><i class="on"></i><i'+(st==="xfer"?' class="on"':'')+'></i><i></i></span>')+'</div>'+
      '<span class="num va'+(inn?' in':'')+'">'+(inn?"+":"−")+money(+t.amount||0)+'</span><button type="button" class="vbt" data-vact="'+(st==="req"?"xfer":"done")+'" data-vid="'+esc(t.id)+'">'+(st==="req"?"They paid":inn?"In MSUFCU":"Left MSUFCU")+'</button></div>'};
  const sec=(lbl,list,red)=>list.length?'<div class="vsec'+(red?' red':'')+'">'+lbl+' · '+list.length+'</div>'+list.sort(by).map(t=>row(t,red)).join(""):"";
  return '<section class="card vcard"><div class="vhd"><b>Venmo</b><span>'+open.length+' open · <span class="num" style="color:'+(net>=0?'var(--ok)':'inherit')+'">'+(net>=0?"+":"−")+money(Math.abs(net))+'</span> net</span></div>'+
    sec("Needs a check",late,true)+sec("Waiting on payment",req)+sec("Transferring",xf)+'</section>'}
function plannedSheet(){
  const ym=S.ym,[y,m]=ym.split("-").map(Number),prev=ymAdd(ym,-1),inc=JSON.parse(JSON.stringify(incomeFor(ym)));
  const x=inc[0]||{id:uid(),name:"Planned",planned:0},total0=round2(incomeTotal(inc)),pt=x.parts||null,saved=partsPays(pt),sched=saved&&saved.length?null:scheduledPays(ym);
  const V={carry:pt?+pt.carry||0:0,rew:pt?+pt.rew||0:0,adj:pt?+pt.adj||0:0,pays:saved&&saved.length?saved:(sched||[{d:"",amt:0},{d:"",amt:0}]),bank:pt&&pt.bank||null};
  V.bankAmt=V.bank&&V.bank.amt!=null?+V.bank.amt:null;
  /* Credit card: available credit entered by hand; owed = limit − available. The payoff view is MSUFCU − (owed − rewards). */
  V.card=pt&&pt.card||null;V.cardAmt=V.card&&V.card.amt!=null?+V.card.amt:null;
  /* Cushion: money kept in MSUFCU but left out of the budget. It carries over from last month (what's left of it);
     "Use cushion" moves some into this month's Planned and onto a budget item. */
  const cSum=a=>round2((Array.isArray(a)?a:[]).reduce((s,u)=>s+(+u.amt||0),0));
  const prevPt=(()=>{const b=S.budgets[prev],z=b&&Array.isArray(b.income)&&b.income[0];return z&&z.parts||null})();
  V.cush=pt&&pt.cush!=null?+pt.cush||0:(prevPt&&prevPt.cush?round2(+prevPt.cush-cSum(prevPt.cushUsed)):0);
  V.cushTarget=pt&&pt.cushTarget!=null?+pt.cushTarget||0:(prevPt?+(prevPt.cushTarget!=null?prevPt.cushTarget:prevPt.cush)||0:0);
  V.cushUsed=pt&&Array.isArray(pt.cushUsed)?pt.cushUsed.map(u=>Object.assign({},u)):[];const uses0=V.cushUsed.map(u=>Object.assign({},u));V.useAmt=0;
  const cLeft=()=>round2(V.cush-cSum(V.cushUsed));
  V.lim=pt&&pt.cardLimit?+pt.cardLimit:(prevPt&&prevPt.cardLimit?+prevPt.cardLimit:10500);
  /* Starting money for bills set aside last month (fwd, automatic), or, in the first month, money already in the bank for them (fwm). */
  const ahIn=asideFor(ym),ahNow=asideItems(groupsFor(ym)),nmList=a=>a.map(z=>z.it.name).filter((v,i,arr)=>arr.indexOf(v)===i).join(", ");
  V.fwd=round2(ahIn.reduce((a,z)=>a+(+z.it.planned||0),0));V.fwm=V.fwd>0?0:(pt&&+pt.fwm||0);const showFwm=!V.fwd&&(ahNow.length||V.fwm);
  const ahNowT=round2(ahNow.reduce((a,z)=>a+(+z.it.planned||0),0)),NXM=MONTHS[+ymAdd(ym,1).slice(5)-1];
  const fresh=!pt&&!sched;let totOverride=fresh&&total0?total0:null;
  const td=today(),fmtD=d=>d?dfmt({month:"short",day:"numeric"}).format(new Date(d+"T12:00:00")):"";
  const vb=(f,l,sub,cls)=>'<div class="plf'+(cls?" "+cls:"")+'"><label>'+l+(sub?'<small>'+sub+'</small>':'')+'</label><button type="button" class="plv num" data-f="'+f+'"></button></div>';
  const payRow=(p,i)=>vb("p"+i,"Paycheck "+(i+1),'<span class="plds"><span class="pldt" data-dt="'+i+'"></span><input type="date" class="pld" data-pd="'+i+'" value="'+esc(p.d)+'" aria-label="Paycheck '+(i+1)+' date"></span>');
  openSheet('<h3>Planned for '+MONTHS[m-1]+'</h3>'+(V.pays.length>=3?'<p class="plbadge">3 paychecks this month</p>':'')+(sched?'<p class="note" style="margin:-4px 0 6px">Paydays filled in from your every-2-weeks schedule.</p>':'')+
    '<h4 class="plst">1 · Money to budget</h4><div class="plgl">Coming in</div>'+
    vb("carry","Carryover",'from '+MONTHS[+prev.slice(5)-1]+'<button class="plsug" id="pl-sug" hidden></button>')+
    (V.fwd?'<div class="plf plfw"><label>Set aside in '+MONTHS[+prev.slice(5)-1]+'<small>for '+esc(nmList(ahIn))+'</small></label><span class="plv num plro">'+money(V.fwd)+'</span></div>':'')+
    (showFwm?vb("fwm","Already in bank",'<span>for '+MONTHS[m-1].slice(0,3)+' bills, from adjustment</span><button type="button" class="plsug" id="pl-fwmv" hidden>Move from adjustment</button>'):'')+
    V.pays.map(payRow).join("")+vb("rew","Card rewards","off your card payment")+
    '<div class="plgl">Held back</div><div class="plrefill" id="pl-refill" hidden></div>'+
    vb("cush","Cushion",'<span id="pl-cusn">set aside · not budgeted</span><button type="button" class="plsug" id="pl-use" hidden>Use cushion</button>',"plcush")+
    '<div class="pluses" id="pl-uses"></div>'+
    '<div class="plusebox" id="pl-usebox" hidden><b>Use cushion</b>'+vb("use","How much","")+
    '<div class="plf"><label>Covers</label><select class="plsel" id="pl-useit">'+groupsFor(ym).map(g=>'<optgroup label="'+esc(g.name)+'">'+g.items.map(it=>'<option value="'+esc(it.id)+'">'+esc(it.name)+'</option>').join("")+'</optgroup>').join("")+'</select></div>'+
    '<p class="note" id="pl-usen" style="margin:4px 0 8px"></p><div class="btnrow"><button type="button" class="btn sec" id="pl-usex">Cancel</button><button type="button" class="btn" id="pl-useok">Use</button></div></div>'+
    vb("adj","Adjustment",'<span id="pl-adjn">difference to reach your total</span>',"pladj")+vb("tot","To budget","","pltot")+
    (ahNow.length?'<p class="plahn"><b class="num">'+money(ahNowT)+'</b> of this is set aside for '+NXM+' ('+esc(nmList(ahNow))+'). It isn\'t spending and carries into '+NXM+'.</p>':'')+
    (fresh&&total0?'<p class="note" style="margin:8px 0 0">Your current total is '+money(total0)+'. Enter your carryover and paychecks to build it up.</p>':'')+
    '<div class="plbal"><h4>2 · Does it match your accounts?</h4><div class="plgl">Enter today\'s numbers</div>'+
    vb("bank","MSUFCU balance",'<span id="pl-bankat">from your MSUFCU app</span>',"plbk")+
    vb("card","Card available",'<span id="pl-cardn"></span><button type="button" class="plsug" id="pl-lim">Edit limit</button>',"plbk plcard")+
    '<div id="pl-limbox" hidden>'+vb("lim","Credit limit","")+'</div>'+
    '<div class="plcmp"><div class="plgl" style="margin-top:0">At the end of '+MONTHS[m-1]+'…</div>'+
      '<div class="plrow"><span>Your budget says you\'ll have</span><b class="num" id="pl-exp"></b></div><button type="button" class="plmt" data-mt="pl-expn">See the math ›</button><div class="plmath" id="pl-expn" hidden></div>'+
      '<div class="plrow" id="pl-pay"><span>Your accounts say you\'ll have</span><b class="num" id="pl-payv"></b></div><button type="button" class="plmt" id="pl-paymt" data-mt="pl-payn">See the math ›</button><div class="plmath" id="pl-payn" hidden></div>'+
      '<div class="pldiff" id="pl-diff" hidden></div><div class="plguess" id="pl-guess" hidden></div><button class="plfix" id="pl-fix" hidden></button></div>'+
    '<button type="button" class="plven" id="pl-ven" hidden></button><div class="pvl" id="pl-venl" hidden></div></div>'+
    '<div class="btnrow" style="margin-top:16px"><button class="btn sec" id="pl-x">Cancel</button><button class="btn" id="pl-ok">Save</button></div><div class="plpad" id="pl-pad" hidden></div>',
  sh=>{const sum=()=>round2(V.carry+V.fwd+V.fwm+V.rew-cLeft()+V.pays.reduce((a,p)=>a+(+p.amt||0),0)),total=()=>totOverride!=null?totOverride:round2(sum()+V.adj);
    const getF=f=>f==="fwm"?V.fwm:f==="carry"?V.carry:f==="rew"?V.rew:f==="cush"?V.cush:f==="use"?V.useAmt:f==="adj"?V.adj:f==="tot"?total():f==="bank"?V.bankAmt:f==="card"?V.cardAmt:f==="lim"?V.lim:V.pays[+f.slice(1)].amt;
    const setF=(f,v)=>{if(f==="card"){V.cardAmt=v;return}if(f==="lim"){V.lim=v;return}if(f!=="tot"&&f!=="bank")totOverride=null;if(f==="fwm")V.fwm=v;else if(f==="carry")V.carry=v;else if(f==="rew")V.rew=v;else if(f==="cush"){V.cush=v;V.cushTarget=v}else if(f==="use")V.useAmt=v;else if(f==="adj")V.adj=v;else if(f==="bank")V.bankAmt=v;else if(f==="tot"){totOverride=null;V.adj=round2(v-sum())}else V.pays[+f.slice(1)].amt=v};
    const spentSoFar=()=>ym>ymOf(td)?0:round2(S.tx.filter(t=>ym===S.ym&&t.date<=td).reduce((a,t)=>a+sAmt(t),0));
    /* Venmo can sit in any month (e.g. Oct 31 Venmo while looking at November), so pull the last 2 weeks straight from the database. */
    let VL=[];
    const venCands=()=>{const m=new Map();VL.forEach(t=>m.set(t.id,t));venAll().forEach(t=>m.set(t.id,t));return [...m.values()].filter(t=>venMaybe(t,td)).sort((a,b)=>b.date.localeCompare(a.date))};
    (async()=>{try{if(!S.db)return;const from=addDaysISO(td,-14);
      const snap=await S.db.collection("tx").where("date",">=",from).where("date","<=",td).limit(500).get();VL=snap.docs.map(x=>Object.assign({id:x.id},x.data())).filter(isVenmoTx);if(sh.isConnected)refresh()}catch(_){}})();
    const vName=t=>t.person||String(t.merchant).replace(/^\s*venmo\s*:\s*(.*?)(\s+reimbursement)?$/i,"$1")||"Venmo";
    const vLine=t=>esc(vName(t))+' <span class="num">'+(venIn(t)?"+":"−")+money(+t.amount||0)+'</span>';
    const drawVen=()=>{const all=venCands(),btn=sh.querySelector("#pl-ven"),lst=sh.querySelector("#pl-venl");
      if(!all.length){btn.hidden=true;lst.hidden=true;return}btn.hidden=false;
      btn.innerHTML='<span>Venmo maybe still moving · '+all.length+'</span>'+CHEV;
      lst.innerHTML=all.map(t=>'<div class="pvr"><span class="pvn"><b>'+esc(vName(t))+'</b><small>'+(venUnpaid(t)?"requested "+fmtD(t.date)+" · may not be paid yet":(venIn(t)?"paid you ":"sent ")+fmtD(t.date)+" · usually lands by "+fmtD(addBizDays(t.date,3)))+'</small></span><span class="num pva"'+(venIn(t)?' style="color:var(--ok)">+':'>−')+money(+t.amount||0)+'</span></div>').join("")};
    sh.addEventListener("click",e=>{if(e.target.closest("#pl-ven")){const l=sh.querySelector("#pl-venl");l.hidden=!l.hidden;sh.querySelector("#pl-ven").classList.toggle("open",!l.hidden)}});
    const MS=MONTHS[m-1].slice(0,3);
    const drawCush=()=>{const used=cSum(V.cushUsed),left=cLeft(),cb=sh.querySelector('[data-f="cush"]');
      if(V.cush)cb.textContent="−"+money(left);
      sh.querySelector("#pl-cusn").textContent=used?money(left)+" of "+money(V.cush)+" · "+money(used)+" used in "+MS:V.cush?"set aside · not budgeted":"money you don't budget";
      const ub=sh.querySelector("#pl-use");ub.hidden=!(left>0.004);ub.textContent=used?"Use more":"Use cushion";
      sh.querySelector("#pl-uses").innerHTML=V.cushUsed.map((u,i)=>'<div class="pluse"><span>From cushion · '+esc(u.name||"")+'</span><span class="num">+'+money(+u.amt||0)+'</span><button type="button" class="plux" data-unuse="'+i+'" aria-label="Undo">×</button></div>').join("");
      const rf=sh.querySelector("#pl-refill"),short=round2(V.cushTarget-V.cush);
      if(short>0.004&&!used){rf.hidden=false;rf.innerHTML='<span>Your cushion is <b>'+money(short)+'</b> short of '+money(V.cushTarget)+'. Refill it from '+MONTHS[m-1]+"'s money?</span><span class=\"btnrow\"><button type=\"button\" class=\"btn sec\" id=\"pl-rfno\">Keep it lower</button><button type=\"button\" class=\"btn\" id=\"pl-rfok\">Refill</button></span>"}else rf.hidden=true;
      const it=findItem(groupsFor(ym),sh.querySelector("#pl-useit").value);sh.querySelector("#pl-usen").textContent=V.useAmt>0?"Adds "+money(V.useAmt)+" to "+MONTHS[m-1]+"'s Planned and to "+(it?it.it.name:"that item")+". Your cushion drops to "+money(round2(left-V.useAmt))+" until you refill it.":"Pick an amount and the budget item it covers."};
    sh.addEventListener("click",e=>{const el=e.target;
      if(el.closest("#pl-use")){e.preventDefault();e.stopPropagation();V.useAmt=0;sh.querySelector("#pl-usebox").hidden=false;refresh();openPad("use");return}
      if(el.closest("#pl-usex")){closePad();sh.querySelector("#pl-usebox").hidden=true;V.useAmt=0;refresh();return}
      if(el.closest("#pl-useok")){closePad();const a=round2(V.useAmt),id=sh.querySelector("#pl-useit").value,f=findItem(groupsFor(ym),id);
        if(!(a>0)){toast("Enter how much to use");shake(sh.querySelector('[data-f="use"]'));return}if(a>cLeft()+.004){toast("That's more than your cushion");shake(sh.querySelector('[data-f="use"]'));return}if(!f){toast("Pick a budget item");return}
        totOverride=null;V.cushUsed.push({amt:a,itemId:id,name:f.it.name});V.useAmt=0;sh.querySelector("#pl-usebox").hidden=true;try{haptic()}catch(_){}refresh();return}
      const ux=el.closest("[data-unuse]");if(ux){totOverride=null;V.cushUsed.splice(+ux.dataset.unuse,1);refresh();return}
      const mt=el.closest("[data-mt]");if(mt){const d=sh.querySelector("#"+mt.dataset.mt);d.hidden=!d.hidden;mt.textContent=d.hidden?"See the math ›":"Hide the math ‹";return}
      if(el.closest("#pl-lim")){e.preventDefault();e.stopPropagation();sh.querySelector("#pl-limbox").hidden=false;openPad("lim");return}
      if(el.closest("#pl-rfok")){totOverride=null;V.cush=V.cushTarget;refresh();return}
      if(el.closest("#pl-rfno")){V.cushTarget=V.cush;refresh();return}});
    const refresh=()=>{drawVen();sh.querySelectorAll("[data-f]").forEach(b=>{const v=getF(b.dataset.f);b.innerHTML=v==null||(!v&&b.dataset.f!=="tot")?'<span class="ph">$0.00</span>':money(v)});
      drawCush();
      const fmv=sh.querySelector("#pl-fwmv");if(fmv){const mv=round2(Math.min(V.adj,ahNowT-V.fwm));fmv.hidden=!(mv>0.004);fmv.textContent="Move "+money(mv)+" here";
        fmv.onclick=e=>{e.preventDefault();e.stopPropagation();totOverride=null;V.fwm=round2(V.fwm+mv);V.adj=round2(V.adj-mv);refresh();try{haptic()}catch(_){}}}
      sh.querySelector("#pl-adjn").textContent=V.adj<0?"lowers your total":V.adj>0?"adds to your total":"difference to reach your total";
      const got=V.pays.filter(p=>p.amt&&(!p.d||p.d<=td)),pend=V.pays.filter(p=>p.amt&&p.d&&p.d>td),useCard=V.cardAmt!=null,exp=round2(V.carry+got.reduce((a,p)=>a+p.amt,0)+(useCard?V.rew:0)+V.adj+V.cush-spentSoFar());
      /* Everything already on the books for the month: paychecks still coming and future-dated transactions. */
      /* Month-end view. Budget side: to-budget + cushion still held (− rewards when there's no card to apply them to) − spent and upcoming.
         Carryover is all the money you bring in, cushion included, so the cushion is only added back once. */
      const pendSum=round2(pend.reduce((a,p)=>a+p.amt,0)),fut=round2(S.tx.filter(t=>ym===S.ym&&t.date>td).reduce((a,t)=>a+sAmt(t),0)),spAll=round2(spentSoFar()+fut),
        held=cLeft(),expEnd=round2(total()+held-(useCard?0:V.rew)-spAll);
      const mrow=(l,v,sg)=>'<div class="plmr"><span>'+(sg||"")+l+'</span><span class="num">'+money(Math.abs(v))+'</span></div>';
      sh.querySelector("#pl-exp").textContent=money(expEnd);
      sh.querySelector("#pl-expn").innerHTML=mrow("To budget",total())+(held?mrow("cushion you're holding",held,"+ "):"")+(!useCard&&V.rew?mrow("rewards (they go to your card)",V.rew,"− "):"")+(spAll?mrow(fut&&spentSoFar()?"spent and upcoming":fut?"upcoming transactions":"spent so far",spAll,"− "):"")+'<div class="plmr mu">if nothing else gets added</div>';
      sh.querySelectorAll("[data-dt]").forEach(el=>{const d=V.pays[+el.dataset.dt].d;el.textContent=d?(d<=td?"received "+fmtD(d):"coming "+fmtD(d)):"add date"});
      const owed=useCard?round2(V.lim-V.cardAmt):0,pay=sh.querySelector("#pl-pay");
      sh.querySelector("#pl-cardn").textContent=(useCard?"you owe "+money(owed)+" · ":"")+money(V.lim)+" limit";
      const have=V.bankAmt==null?null:round2(V.bankAmt-(useCard?owed-V.rew:0));
      const proj=have==null?null:round2(have+pendSum-fut);sh.querySelector("#pl-paymt").hidden=proj==null;
      if(proj!=null){sh.querySelector("#pl-payv").textContent=money(proj);
        sh.querySelector("#pl-payn").innerHTML=mrow("MSUFCU now",V.bankAmt)+(useCard?mrow("card you owe",owed,"− ")+(V.rew?mrow("card rewards",V.rew,"+ "):""):"")+(pendSum?mrow("paychecks coming",pendSum,"+ "):"")+(fut?mrow("upcoming transactions",fut,"− "):"")}
      else{sh.querySelector("#pl-payv").innerHTML='<span class="ph" style="font-size:14px;font-weight:500">enter MSUFCU balance</span>';sh.querySelector("#pl-payn").hidden=true}
      const dv=sh.querySelector("#pl-diff"),fx=sh.querySelector("#pl-fix"),gs=sh.querySelector("#pl-guess");if(have==null){dv.hidden=true;fx.hidden=true;gs.hidden=true;return}
      const diff=round2(proj-expEnd);dv.hidden=false;
      if(Math.abs(diff)<.005){dv.className="pldiff ok";dv.textContent="Matches. You're on track ✓";fx.hidden=true;gs.hidden=true;return}
      dv.className="pldiff bad";dv.textContent="Your accounts come out "+money(Math.abs(diff))+(diff>0?" ahead of":" behind")+" your budget";
      const cands=venCands(),hit=venMatch(cands,diff);gs.hidden=false;
      if(hit){gs.className="plguess ven";gs.innerHTML='<b>Likely Venmo still moving</b>'+hit.map(t=>'<span>'+vLine(t)+' · '+(venUnpaid(t)?"may not be paid yet":(venIn(t)?"paid ":"sent ")+fmtD(t.date))+'</span>').join("")+'<small>That adds up to the difference exactly. It should match once '+(hit.length>1?"they clear":"it clears")+', so nothing to fix.</small>'}
      else{gs.className="plguess other";gs.innerHTML='<b>Probably something else</b><small>'+(cands.length?"No mix of the Venmo that might still be moving adds up to "+money(Math.abs(diff))+". ":"No Venmo should still be moving right now. ")+'Look for a missed or mistyped transaction, or a charge that hasn\'t posted yet.</small>'}
      fx.hidden=false;fx.classList.toggle("quiet",!!hit);fx.textContent=(hit?"Not Venmo? ":"")+(diff>0?"Add ":"Subtract ")+money(Math.abs(diff))+(diff>0?" to":" from")+" adjustment";
      fx.onclick=()=>{setF("adj",round2(V.adj+diff));refresh();try{haptic()}catch(_){}}};
    // in-sheet keypad: digits shift in from the right (moving decimal), optional calculator, ± for adjustment
    const pad=sh.querySelector("#pl-pad");let act=null,T=null;
    const raw=T=>{const cc=()=>T.cur===""?0:+T.cur;if(!T.ops.length)return T.cur===""?0:+T.cur;let acc=T.ops[0][0];for(let i=0;i<T.ops.length;i++){const nx=i+1<T.ops.length?T.ops[i+1][0]:(T.cur===""?null:cc());if(nx===null)break;acc=OPS[T.ops[i][1]](acc,nx)}return acc};
    const val=()=>(T.neg?-1:1)*raw(T)/100;
    const drawPad=()=>{const c=T.calc,sg=act==="adj";const keys=c?["1","2","3","÷","4","5","6","×","7","8","9","−","C","0","⌫","+"]:["1","2","3","4","5","6","7","8","9",sg?"±":"","0","⌫"];
      const expr=c&&T.ops.length?T.ops.map(([v,o])=>money(v/100)+" "+o).join(" ")+(T.cur!==""?" "+money(+T.cur/100):""):"";
      pad.innerHTML=(c?'<div class="texpr num">'+esc(expr)+'</div>':'')+'<div class="keys'+(c?" calc":"")+'">'+keys.map(k=>k?'<button type="button" class="key'+(OPS[k]?" op":"")+'" data-pk="'+k+'"'+(KEY_LABEL[k]?' aria-label="'+KEY_LABEL[k]+'"':'')+'>'+(k==="⌫"?BACK_SVG:k)+'</button>':'<span></span>').join("")+'</div>'+
        '<div class="padfoot"><label class="tgl"><input type="checkbox" id="pl-calc" role="switch"'+(c?" checked":"")+'><span class="sw"></span><b>Calculator</b></label>'+(c?'<button type="button" class="btn sec padEq" data-pk="=" aria-label="Equals">=</button>':'')+'<button type="button" class="btn padDone" id="pl-done">Done</button></div>';
      pad.querySelector("#pl-calc").onchange=e=>{T.calc=e.target.checked;ls.set("pb.calc",T.calc?"1":"0");drawPad()};pad.querySelector("#pl-done").onclick=closePad};
    const openPad=f=>{act=f;const v=getF(f)||0;T={cur:v?String(Math.round(Math.abs(v)*100)):"",ops:[],fresh:true,calc:ls.get("pb.calc")==="1",neg:v<0};
      sh.querySelectorAll("[data-f]").forEach(b=>b.classList.toggle("on",b.dataset.f===f));pad.hidden=false;drawPad();
      const b=sh.querySelector('[data-f="'+f+'"]');requestAnimationFrame(()=>b.scrollIntoView({block:"center",behavior:"smooth"}))};
    const closePad=()=>{if(act&&T&&T.ops.length){const v=val();T.ops=[];T.cur=String(Math.round(Math.abs(v)*100));T.neg=v<0;setF(act,round2(v));refresh()}act=null;pad.hidden=true;sh.querySelectorAll("[data-f]").forEach(b=>b.classList.remove("on"))};
    pad.addEventListener("click",e=>{const b=e.target.closest("[data-pk]");if(!b||!act)return;const k=b.dataset.pk;
      if(k==="±"){T.neg=!T.neg;T.fresh=false}
      else if(k==="="){const v=raw(T);T.ops=[];T.cur=v?String(Math.abs(v)):"";if(v<0)T.neg=!T.neg;T.fresh=false}
      else tKey(T,k);
      try{haptic()}catch(_){}
      if((act==="bank"||act==="card")&&T.cur===""&&!T.ops.length)setF(act,null);else setF(act,round2(val()));refresh();drawPad()});
    sh.addEventListener("click",e=>{const b=e.target.closest("[data-f]");if(b){e.preventDefault();openPad(b.dataset.f)}});
    sh.querySelectorAll(".pld").forEach(i=>i.addEventListener("change",()=>{V.pays[+i.dataset.pd].d=i.value;refresh()}));
    sh.querySelector("#pl-useit").addEventListener("change",refresh);
    if(V.bank&&V.bank.at)sh.querySelector("#pl-bankat").textContent="last entered "+fmtD(V.bank.at);
    pad.addEventListener("click",e=>{if(e.target.closest("#pl-done"))sh.querySelector("#pl-limbox").hidden=true},true);
    refresh();
    txForMonth(prev).then(list=>{const pi=incomeTotal(incomeFor(prev)),left=round2(pi-list.reduce((a,t)=>a+sAmt(t),0)),b=sh.querySelector("#pl-sug");if(!b||!(pi>0))return;
      const pc=prevPt&&prevPt.cush?round2(+prevPt.cush-cSum(prevPt.cushUsed)):0;const all=round2(left+pc-V.fwd);b.hidden=false;b.textContent="Use "+money(all);b.onclick=e=>{e.preventDefault();e.stopPropagation();setF("carry",all);refresh();try{haptic()}catch(_){}}}).catch(()=>{});
    sh.querySelector("#pl-x").onclick=closeSheet;
    sh.querySelector("#pl-ok").onclick=async()=>{closePad();const t=total();
      const nx=Object.assign({},x,{name:x.name||"Planned",planned:t,parts:{carry:round2(V.carry),fwd:round2(V.fwd),fwm:round2(V.fwm),rew:round2(V.rew),cardLimit:round2(V.lim),card:V.cardAmt!=null?{amt:round2(V.cardAmt),at:(V.card&&V.card.amt===V.cardAmt&&V.card.at)||today()}:null,cush:round2(V.cush),cushTarget:round2(V.cushTarget),cushUsed:V.cushUsed.map(u=>({amt:round2(u.amt),itemId:u.itemId,name:u.name||""})),adj:round2(totOverride!=null?round2(totOverride-sum()):V.adj),pays:V.pays.map(p=>({d:p.d||"",amt:round2(+p.amt||0)})),bank:V.bankAmt!=null?{amt:round2(V.bankAmt),at:(V.bank&&V.bank.amt===V.bankAmt&&V.bank.at)||today()}:null}});
      const newInc=[nx].concat(inc.slice(1).map(o=>Object.assign({},o,{planned:0})));
      const gs=JSON.parse(JSON.stringify(groupsFor(ym))),dl={};uses0.forEach(u=>dl[u.itemId]=(dl[u.itemId]||0)-(+u.amt||0));V.cushUsed.forEach(u=>dl[u.itemId]=(dl[u.itemId]||0)+(+u.amt||0));
      Object.keys(dl).forEach(id=>{const f=findItem(gs,id);if(f&&Math.abs(dl[id])>.004)f.it.planned=round2(Math.max(0,(+f.it.planned||0)+dl[id]))});
      if(await saveGroups(gs,newInc)){S.budgets[ym]=Object.assign({},S.budgets[ym]||{},{groups:gs,income:newInc});closeSheet();toast("Planned "+money(t));render()}};
  });
}
function incomeSheet(id){
  const inc=JSON.parse(JSON.stringify(incomeFor(S.ym)));const isNew=!id;
  const x=isNew?{id:uid(),name:"Paycheck "+(inc.length+1),planned:0}:inc.find(i=>i.id===id);if(!x)return;
  openSheet('<h3>'+(isNew?"Add income":esc(x.name))+'</h3><div class="two"><div class="field"><label for="in-name">Name</label><input id="in-name" value="'+esc(x.name)+'"></div><div class="field"><label for="in-plan">Planned</label><input id="in-plan" inputmode="decimal" placeholder="0.00" value="'+(isNew?"":(+x.planned||0).toFixed(2))+'"></div></div>'+
    '<p class="note" style="margin:0 0 14px">Income carries into new months until you change it.</p>'+
    '<div class="btnrow"><button class="btn" id="in-save">'+(isNew?"Add income":"Save")+'</button>'+(isNew?'':'<button class="btn sec" id="in-log">Log received</button>')+'</div>'+
    (isNew?'':'<div class="btnrow" style="margin-top:10px"><button class="btn danger" id="in-del">Remove income</button></div><div id="in-conf"></div>'),
    s=>{
      setTimeout(()=>s.querySelector(isNew?"#in-plan":"#in-name").focus(),60);
      s.querySelector("#in-save").onclick=async()=>{const n=s.querySelector("#in-name").value.trim();const p=parseAmt(s.querySelector("#in-plan").value||"0");if(!n){toast("Give the income a name");return}if(isNaN(p)||p<0){toast("Planned must be $0 or more");return}x.name=n;x.planned=p;if(isNew)inc.push(x);if(await saveGroups(JSON.parse(JSON.stringify(groupsFor(S.ym))),inc)){closeSheet();toast("Saved")}};
      if(isNew)return;
      s.querySelector("#in-log").onclick=()=>{ls.set("pb.lastItem",x.id);txSheet()};
      s.querySelector("#in-del").onclick=()=>{const c=s.querySelector("#in-conf");c.innerHTML='<div class="confirm">Remove '+esc(x.name)+' from '+MONTHS[+S.ym.slice(5)-1]+'?<div class="btnrow" style="margin-top:10px"><button class="btn sec" id="cn">Keep it</button><button class="btn" style="background:var(--over)" id="cy">Remove</button></div></div>';
        c.querySelector("#cn").onclick=()=>c.innerHTML="";c.querySelector("#cy").onclick=async()=>{if(await saveGroups(JSON.parse(JSON.stringify(groupsFor(S.ym))),inc.filter(i=>i.id!==x.id))){closeSheet();toast("Removed")}}};
    });
}
/* How far ahead you can go: the month picker and the Calendar arrows reach December, FUTURE_YEARS years from now */
const FUTURE_YEARS=5;function lastYm(){return (new Date().getFullYear()+FUTURE_YEARS)+"-12"}
function monthSheet(){
  const now=new Date();
  const cur=ymOf(today()),nextYm=lastYm();
  const firstY=Math.min(H.meta&&H.meta.first?+H.meta.first.slice(0,4):now.getFullYear()-8,+S.ym.slice(0,4),...Object.keys(S.budgets).map(k=>+k.slice(0,4)).filter(n=>n>1990));
  const lastY=+nextYm.slice(0,4);let y=+S.ym.slice(0,4);
  const draw=s=>{
    let h='<h3>Choose month</h3><div class="seg" style="margin:0 0 10px;grid-template-columns:44px 1fr 44px;background:var(--bg)"><button id="yPrev" aria-label="Earlier year"'+(y<=firstY?" disabled":"")+' style="color:var(--fg)">‹</button><button aria-pressed="true" style="color:var(--fg);background:var(--card)" tabindex="-1">'+y+'</button><button id="yNext" aria-label="Later year"'+(y>=lastY?" disabled":"")+' style="color:var(--fg)">›</button></div><div class="mlist">';
    for(let m=12;m>=1;m--){const ym=y+"-"+pad(m);if(ym>nextYm)continue;h+='<button data-ym="'+ym+'" aria-current="'+(ym===S.ym)+'">'+MONTHS[m-1]+' '+y+(ym===cur?' <span class="note">· this month</span>':'')+'</button>'}
    s.innerHTML='<div class="grab"></div>'+h+'</div>';
    const pv=s.querySelector("#yPrev"),nx=s.querySelector("#yNext");
    pv.onclick=()=>{if(y>firstY){y--;draw(s)}};nx.onclick=()=>{if(y<lastY){y++;draw(s)}};
    s.querySelectorAll("[data-ym]").forEach(b=>b.onclick=()=>{S.ym=b.dataset.ym;S.upcoming=false;closeSheet();subscribeTx();render()});
  };
  openSheet('',draw);
}
async function exportCsv(){
  const groups=groupsFor(S.ym);
  const q=v=>'"'+String(v??"").replace(/"/g,'""')+'"';
  const rows=[["Date","Merchant","Group","Item","Amount","Note"]].concat(sortedTx().reverse().map(t=>{const f=findItem(groups,t.itemId);return[t.date,t.merchant,f?f.g.name:t.groupName,f?f.it.name:t.itemName,(t.type==="income"?+t.amount:-sAmt(t)).toFixed(2),t.note]}));
  const csv=rows.map(r=>r.map(q).join(",")).join("\n");
  const dl=await window.claude?.use?.("downloads").catch(()=>null);
  if(!dl){toast("Downloads aren't available here");return}
  try{await dl.save({filename:"transactions-"+S.ym+".csv",data:csv})}catch(e){/* viewer declined */}
}

