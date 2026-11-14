/* ---------- budget item suggestions ----------
   Ideas for categories you don't have yet, with words that hint at them and the group they usually sit in. */
const CAT_IDEAS=[
 ["Coffee",["starbucks","dunkin","coffee","cafe","biggby","tim hortons","espresso","latte","peet"],["food","dining"]],
 ["Restaurants",["restaurant","grill","kitchen","diner","bistro","sushi","thai","pizza","taco","burger","bbq","steakhouse","cantina","eatery"],["food","dining"]],
 ["Fast Food",["mcdonald","wendy","burger king","taco bell","chick-fil","chipotle","subway","kfc","popeyes","culver","five guys","panera","arby","jimmy john","domino"],["food","dining"]],
 ["Groceries",["meijer","kroger","aldi","costco","trader joe","whole foods","grocery","market","spartan","sam's club","safeway","publix","fresh thyme"],["food"]],
 ["Alcohol & Bars",["liquor","wine","brewery","brewing","taproom","pub","bar ","tavern","beer"],["food","fun","entertainment"]],
 ["Gas",["shell","speedway","bp","marathon","exxon","mobil","sunoco","citgo","chevron","circle k","wawa","sheetz","gas station","fuel"],["transport","auto","car"]],
 ["Car Maintenance",["autozone","jiffy","oil change","valvoline","tire","firestone","discount tire","advance auto","o'reilly","napa","car wash","mechanic","midas"],["transport","auto","car"]],
 ["Car Insurance",["progressive","geico","state farm","allstate","auto insurance"],["transport","insurance","bills"]],
 ["Parking & Tolls",["parking","toll","park mobile","parkmobile","spothero"],["transport"]],
 ["Rideshare",["uber","lyft","taxi","cab "],["transport"]],
 ["Public Transit",["transit","metro","bus ","train","amtrak"],["transport"]],
 ["Flights",["airline","airlines","delta","united","southwest","american air","spirit","frontier","jetblue","alaska air","flight"],["travel","fun"]],
 ["Hotels",["hotel","marriott","hilton","hyatt","airbnb","vrbo","inn ","resort","motel","holiday inn"],["travel","fun"]],
 ["Streaming",["netflix","hulu","disney","hbo","max ","peacock","paramount","spotify","youtube","apple tv","sling"],["bills","subscriptions","fun"]],
 ["Phone",["verizon","t-mobile","at&t","mint mobile","visible","cricket"],["bills","utilities","housing"]],
 ["Internet",["comcast","xfinity","spectrum","internet","wifi","starlink"],["bills","utilities","housing"]],
 ["Electric",["consumers energy","dte","electric","power"],["utilities","housing","bills"]],
 ["Water",["water","sewer"],["utilities","housing","bills"]],
 ["Gym",["planet fitness","gym","fitness","ymca","crossfit","orangetheory","la fitness","anytime fitness"],["health","personal"]],
 ["Haircuts",["barber","salon","great clips","supercuts","sport clips","haircut"],["personal","health"]],
 ["Pharmacy",["cvs","walgreens","rite aid","pharmacy"],["health"]],
 ["Doctor",["clinic","hospital","medical","urgent care","physician","doctor","copay"],["health"]],
 ["Dentist",["dental","dentist","orthodont"],["health"]],
 ["Vet",["vet","animal hospital","banfield"],["pets","health"]],
 ["Pet Supplies",["petco","petsmart","chewy","pet supplies","tractor supply"],["pets","household"]],
 ["Home Improvement",["home depot","lowe","menards","ace hardware","hardware","true value"],["housing","home","household"]],
 ["Furniture",["ikea","wayfair","ashley","furniture","pottery barn","crate & barrel"],["housing","home","household"]],
 ["Electronics",["best buy","apple store","micro center","newegg","electronics"],["shopping","household"]],
 ["Amazon",["amazon","amzn"],["shopping","household"]],
 ["Books",["barnes","book","kindle","audible"],["fun","personal"]],
 ["Movies",["amc","cinema","theater","theatre","regal","celebration cinema","fandango"],["fun","entertainment"]],
 ["Concerts & Tickets",["ticketmaster","stubhub","seatgeek","live nation","eventbrite","tickets"],["fun","entertainment"]],
 ["Video Games",["steam","playstation","xbox","nintendo","epic games","gamestop"],["fun","entertainment"]],
 ["Golf",["golf","topgolf"],["fun","entertainment"]],
 ["Charity",["donation","church","gofundme","charity","foundation","tithe"],["giving","gifts"]],
 ["Laundry & Dry Cleaning",["laundry","dry clean","cleaners","laundromat"],["household","personal"]],
 ["Childcare",["daycare","childcare","babysit","nanny"],["family","kids"]],
 ["Education",["tuition","university","college","course","udemy","coursera","school"],["education","personal"]],
 ["Bank Fees",["fee","overdraft","atm"],["fees","bills"]],
 ["Renters Insurance",["lemonade","renters insurance"],["insurance","housing"]],
 ["Investments",["fidelity","vanguard","schwab","robinhood","brokerage","etrade"],["savings"]],
];
const catNorm=s=>String(s||"").toLowerCase().replace(/&/g," and ").replace(/[^a-z0-9]+/g," ").trim();
const catWords=s=>catNorm(s).split(" ").filter(w=>w&&w!=="and"&&w!=="the").map(w=>w.length>3?w.replace(/s$/,""):w);
function catExisting(groups,kind){
  const out=[];
  if(kind==="refund")incomeFor(S.ym).forEach(x=>out.push({kind:"item",id:x.id,name:x.name,group:"Income"}));
  groups.forEach(g=>{if(!g.aside)g.items.forEach(it=>{if(it.id!==MISC_ID)out.push({kind:"item",id:it.id,name:it.name,group:g.name})})});
  const mg=groups.find(g=>g.items.some(it=>it.id===MISC_ID));
  if(mg){out.push({kind:"item",id:MISC_ID,name:(mg.items.find(it=>it.id===MISC_ID)||{}).name||"Misc",group:mg.name});SUB.list.forEach(n=>out.push({kind:"sub",name:n,group:mg.name}))}
  return out;
}
// an idea "exists" when every word of it shows up in one of your names (Gas → Auto Gas & Oil)
function ideaTwin(name,ex){const w=catWords(name);return ex.find(e=>{const ew=catWords(e.name);return w.every(x=>ew.includes(x))})||(w[0]&&w[0].length>=4?ex.find(e=>catWords(e.name)[0]===w[0]):null)}
const GW_STOP=new Set(["the","and","inc","llc","ltd","corp","company","store","shop","online","payment","purchase","pay","com","www","usa","venmo","apple","square","sq","tst","pos","llc","of","for","at","in","on","to","a","co"]);
const gWords=s=>[...new Set(catNorm(merchKey(s)).split(" ").filter(w=>w.length>=3&&!GW_STOP.has(w)&&!/^\d+$/.test(w)).map(w=>w.length>3?w.replace(/s$/,""):w))];
function txPool(){const seen=new Map();Object.values(IS.hist).forEach(a=>(a||[]).forEach(t=>seen.set(t.id,t)));S.tx.forEach(t=>seen.set(t.id,t));return[...seen.values()]}
const exKey=e=>e.kind==="sub"?MISC_ID+"|"+e.name:e.id;
/* "Hood River Parking" → your past merchants with "parking" in the name were mostly Parking & Rides.
   Each word votes for the categories of past merchants that contain it (weighted by how consistent
   and how common that is); a word that's in a category's own name gets an extra vote. */
function catGuess(merchant,ex){
  const qw=gWords(merchant);if(!qw.length)return[];
  const key=merchKey(merchant),mcat={};
  txPool().forEach(t=>{if(t.type==="income"||!t.itemId)return;const mk=merchKey(t.merchant);if(!mk||mk===key)return;
    const ck=t.itemId===MISC_ID&&t.sub?MISC_ID+"|"+t.sub:t.itemId;const o=mcat[mk]||(mcat[mk]={});o[ck]=(o[ck]||0)+1});
  const byWord={};
  Object.entries(mcat).forEach(([mk,o])=>{const ck=Object.keys(o).sort((a,b)=>o[b]-o[a])[0];const ws=gWords(mk);
    qw.forEach(w=>{if(ws.includes(w)){const bw=byWord[w]||(byWord[w]={});bw[ck]=(bw[ck]||0)+1}})});
  const score={};
  Object.values(byWord).forEach(bw=>{const tot=Object.values(bw).reduce((a,b)=>a+b,0);Object.entries(bw).forEach(([ck,c])=>{score[ck]=(score[ck]||0)+(c/tot)*Math.log2(1+c)})});
  ex.forEach(e=>{const ew=catWords(e.name);if(qw.some(w=>ew.includes(w)))score[exKey(e)]=(score[exKey(e)]||0)+2.5});
  return Object.entries(score).filter(([,v])=>v>=1).sort((a,b)=>b[1]-a[1]).map(([ck,v])=>({e:ex.find(e=>exKey(e)===ck),v})).filter(x=>x.e);
}
function catHintGroup(name,groups){
  const idea=CAT_IDEAS.find(i=>catNorm(i[0])===catNorm(name));const hints=idea?idea[2]:[];
  for(const h of hints){const g=groups.find(g=>catNorm(g.name).includes(h));if(g)return g.id}
  const mg=groups.find(g=>g.items.some(it=>it.id===MISC_ID));return mg?mg.id:(groups[0]&&groups[0].id)}
function catSuggest(q,groups,ym,merchant,kind){
  const ex=catExisting(groups,kind),key=String(merchant||"").toLowerCase().replace(/^\s*venmo\s*:\s*/,"").trim();
  const keyOf=e=>e.kind+":"+(e.id||"")+":"+e.name.toLowerCase();
  q=String(q||"").replace(/\s+/g," ").trim();
  if(!q){ // nothing typed yet: what the merchant hints at, then what you've used lately
    const out=[],seen=new Set(),add=(e,head)=>{const k=keyOf(e);if(seen.has(k))return;seen.add(k);out.push(Object.assign({head},e))};
    if(key){
      const past=merchIndex().find(m=>m.name.toLowerCase()===key);
      if(past&&past.itemId){const it=past.itemId===MISC_ID&&past.sub?ex.find(e=>e.kind==="sub"&&e.name===past.sub):ex.find(e=>e.kind==="item"&&e.id===past.itemId);if(it)add(it,"Suggested")}
      const sg=suggestSub(merchant);if(sg){const it=ex.find(e=>e.kind==="sub"&&e.name===sg);if(it)add(it,"Suggested")}
      catGuess(merchant,ex).slice(0,3).forEach(x=>add(x.e,"Suggested"));
      CAT_IDEAS.forEach(([n,kw])=>{if(kw.some(w=>(" "+key+" ").includes(w)||key.startsWith(w.trim()))){const tw=ideaTwin(n,ex);add(tw||{kind:"idea",name:n},"Suggested")}});
    }
    const rec=sortedTx().filter(t=>t.itemId&&t.type!=="income");
    for(const t of rec){if(out.length>=7)break;const it=t.itemId===MISC_ID&&t.sub?ex.find(e=>e.kind==="sub"&&e.name===t.sub):ex.find(e=>e.kind==="item"&&e.id===t.itemId);if(it)add(it,"Recent")}
    return out.slice(0,7);
  }
  const ql=q.toLowerCase(),rank=n=>{n=n.toLowerCase();return n.startsWith(ql)?0:n.split(/[^a-z0-9]+/).some(w=>w&&w.startsWith(ql))?1:n.includes(ql)?2:-1};
  const res=[],seen=new Set();
  ex.forEach(e=>{const r=rank(e.name);if(r>=0){res.push({e,r,o:0});seen.add(keyOf(e))}});
  CAT_IDEAS.forEach(([n,kw])=>{let r=rank(n);if(r<0&&ql.length>=3&&kw.some(w=>w.trim().startsWith(ql)||ql.startsWith(w.trim())))r=3;if(r<0)return;
    const tw=ideaTwin(n,ex);const e=tw||{kind:"idea",name:n};const k=keyOf(e);if(seen.has(k))return;seen.add(k);res.push({e,r,o:tw?0:1})});
  res.sort((a,b)=>a.r-b.r||a.o-b.o||a.e.name.length-b.e.name.length);
  const out=res.slice(0,7).map(x=>x.e);
  const nice=q.replace(/\b\w/g,c=>c.toUpperCase());
  const starts=res.some(x=>x.r===0);
  if(!starts&&!out.some(e=>catNorm(e.name)===catNorm(q))&&!ex.some(e=>catNorm(e.name)===catNorm(q)))out.push({kind:"create",name:nice});
  return out;
}
function loadSubs(){if(!S.db)return;S.db.doc("meta/subs").get().then(d=>{if(d&&d.exists){const v=d.data();if(Array.isArray(v.list)&&v.list.length)SUB.list=v.list;if(v.merchants)SUB.merchants=v.merchants}}).catch(()=>{})}
function spendRows(ym){return txOf(ym).filter(t=>t.type!=="income").map(t=>({g:groupNameOf(t,ym),i:itemNameOf(t,ym),a:sAmt(t)}))}
function shortM(ym){return MONTHS[+ym.slice(5)-1].slice(0,3)}
function niceMax(v){if(v<=0)return 100;const st=v/4;const p=Math.pow(10,Math.floor(Math.log10(st)));const f=st/p;return 4*(f<=1?1:f<=2?2:f<=2.5?2.5:f<=5?5:10)*p}
function kfmt(v){return v>=1000?"$"+(Math.round(v/100)/10).toString().replace(/\.0$/,"")+"K":"$"+Math.round(v)}
function colorMap(keys){const m={};keys.forEach((k,i)=>m[k]=PAL[i%PAL.length]);return m}
function legendHTML(keys,cm,vals){return '<div class="legend'+(vals?' one':'')+'">'+keys.map(k=>'<span><i style="background:'+cm[k]+'"></i>'+esc(k)+(vals?' <b class="num">'+money(round2(vals[k]))+'</b>':'')+'</span>').join("")+'</div>'}
function allGroupNames(months){const set=[];months.forEach(ym=>{groupsFor(ym).forEach(g=>{if(!set.includes(g.name))set.push(g.name)});spendRows(ym).forEach(r=>{if(!set.includes(r.g))set.push(r.g)})});return set}

function barChart(months,series,keys,cm,opts){
  // series: {ym:{key:val}}; stacked
  const W=340,H=240,L=44,R=8,T=14,B=26,pw=W-L-R,ph=H-T-B;
  const tot=months.map(ym=>keys.reduce((a,k)=>a+Math.max(0,(series[ym]||{})[k]||0),0));
  const used=tot.filter(v=>v>0);const avg=opts&&opts.avg&&used.length?used.reduce((a,b)=>a+b,0)/used.length:null;
  const max=niceMax(Math.max(...tot,avg||0));
  const step=pw/months.length,bw=Math.min(28,step*0.62);
  let g='';
  for(let i=0;i<=4;i++){const y=T+ph-ph*i/4;g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" class="grid"/><text x="'+(L-6)+'" y="'+(y+4)+'" class="ax" text-anchor="end">'+kfmt(max*i/4)+'</text>'}
  months.forEach((ym,mi)=>{
    const x=L+step*mi+(step-bw)/2;let y=T+ph;const parts=keys.map(k=>[k,Math.max(0,(series[ym]||{})[k]||0)]).filter(p=>p[1]>0);
    parts.forEach(([k,v],pi)=>{const h=ph*v/max;y-=h;const top=pi===parts.length-1;g+='<path d="'+barPath(x,y,bw,h,top?4:0)+'" fill="'+cm[k]+'"><title>'+esc(k)+" · "+money(round2(v))+'</title></path>'});
    g+='<text x="'+(x+bw/2)+'" y="'+(H-8)+'" class="ax" text-anchor="middle">'+shortM(ym)+'</text>';
  });
  if(avg){const y=T+ph-ph*avg/max;g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" class="avg"/>'}
  return (avg?'<div class="avgpill num">'+money(Math.round(avg)).replace(/\.00$/,"")+' (avg)</div>':'')+'<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="'+esc(opts&&opts.label||"Chart")+'">'+g+'</svg>';
}
function barPath(x,y,w,h,r){r=Math.min(r,h,w/2);if(r<=0)return"M"+x+" "+y+"h"+w+"v"+h+"h"+(-w)+"z";return"M"+x+" "+(y+h)+"V"+(y+r)+"Q"+x+" "+y+" "+(x+r)+" "+y+"H"+(x+w-r)+"Q"+(x+w)+" "+y+" "+(x+w)+" "+(y+r)+"V"+(y+h)+"z"}
function groupedChart(months,a,b,ca,cb){
  const W=340,H=240,L=44,R=8,T=14,B=26,pw=W-L-R,ph=H-T-B;
  const max=niceMax(Math.max(...months.map(m=>Math.max(a[m]||0,b[m]||0))));
  const step=pw/months.length,bw=Math.min(13,step*0.32);let g='';
  for(let i=0;i<=4;i++){const y=T+ph-ph*i/4;g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+y+'" y2="'+y+'" class="grid"/><text x="'+(L-6)+'" y="'+(y+4)+'" class="ax" text-anchor="end">'+kfmt(max*i/4)+'</text>'}
  months.forEach((ym,mi)=>{const cx=L+step*mi+step/2;
    [[a[ym]||0,ca,"Income",-1],[b[ym]||0,cb,"Spent",1]].forEach(([v,c,n,s])=>{const h=ph*v/max;const x=s<0?cx-bw-1:cx+1;if(h>0)g+='<path d="'+barPath(x,T+ph-h,bw,h,3)+'" fill="'+c+'"><title>'+n+" · "+money(round2(v))+'</title></path>'});
    g+='<text x="'+cx+'" y="'+(H-8)+'" class="ax" text-anchor="middle">'+shortM(ym)+'</text>'});
  return '<svg class="chart" viewBox="0 0 '+W+' '+H+'" role="img" aria-label="Income vs spent by month">'+g+'</svg>';
}
