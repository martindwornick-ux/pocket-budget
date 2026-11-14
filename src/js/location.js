/* ---------- location ----------
   Saved with new transactions (lat/lng, accuracy, and a readable place from OpenStreetMap).
   It stays in the app's own storage; the sheet row is unchanged. */
const LOC={
  ok(){return !!(navigator.geolocation&&window.isSecureContext)},
  on(){return true},
  setOn(v){ls.set("pb.loc",v?"1":"0")},
  get(){return new Promise((res,rej)=>{let done=false;const t=setTimeout(()=>{if(!done){done=true;rej({code:3})}},15000);
    try{navigator.geolocation.getCurrentPosition(p=>{if(done)return;done=true;clearTimeout(t);res({lat:+p.coords.latitude.toFixed(6),lng:+p.coords.longitude.toFixed(6),acc:Math.round(p.coords.accuracy||0),at:new Date().toISOString()})},
      e=>{if(done)return;done=true;clearTimeout(t);rej(e)},{enableHighAccuracy:true,timeout:12000,maximumAge:60000})}catch(e){done=true;clearTimeout(t);rej(e)}})},
  cache:{},scache:{},last:null,lastAt:0,
  async place(v){if(!v)return null;const k=v.lat.toFixed(4)+","+v.lng.toFixed(4);if(this.cache[k])return this.cache[k];
    try{const ctl=new AbortController();const tm=setTimeout(()=>ctl.abort(),6000);
      const r=await fetch("https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1&lat="+v.lat+"&lon="+v.lng,{signal:ctl.signal,headers:{"Accept-Language":"en-US"}});clearTimeout(tm);
      if(!r.ok)return null;const j=await r.json(),a=j.address||{};
      const city=a.city||a.town||a.village||a.hamlet||a.suburb||a.county||"",st=(a["ISO3166-2-lvl4"]||"").split("-")[1]||a.state||"";
      const poi=j.name&&j.name!==a.road&&!/^\d/.test(j.name)?j.name:"";
      return this.cache[k]={place:[city,st].filter(Boolean).join(", "),poi,road:[a.house_number,a.road].filter(Boolean).join(" ")}}catch(e){return null}},
  /* Named businesses within ~150 m of a fix (OpenStreetMap via Overpass), closest first, with their street address */
  pcache:{},
  pois(v){const k=v.lat.toFixed(4)+","+v.lng.toFixed(4);if(this.pcache[k])return this.pcache[k];
    const SKIP=/^(parking|parking_entrance|parking_space|bench|waste_basket|waste_disposal|toilets|bicycle_parking|post_box|drinking_water|shelter|telephone|vending_machine|fountain|recycling|clock|grit_bin|motorcycle_parking|loading_dock|hunting_stand|bbq|letter_box|atm)$/;
    const qy='[out:json][timeout:8];nwr(around:150,'+v.lat+','+v.lng+')[name][~"^(shop|amenity|leisure|office|healthcare|craft|tourism|club)$"~"."];out center tags 60;';
    return this.pcache[k]=(async()=>{try{const ctl=new AbortController(),tm=setTimeout(()=>ctl.abort(),9000);
      const r=await fetch("https://overpass-api.de/api/interpreter?data="+encodeURIComponent(qy),{signal:ctl.signal});clearTimeout(tm);if(!r.ok)return[];
      const j=await r.json();return(j.elements||[]).map(e=>{const t=e.tags||{},lat=e.lat??(e.center&&e.center.lat),lng=e.lon??(e.center&&e.center.lon);if(lat==null||SKIP.test(t.amenity||""))return null;
        return{name:t.name,lat:+lat,lng:+lng,d:locDist(v,{lat:+lat,lng:+lng}),addr:[t["addr:housenumber"],t["addr:street"]].filter(Boolean).join(" ")}}).filter(Boolean).sort((a,b)=>a.d-b.d)}
      catch(e){return[]}})()},
  /* Places you've corrected by hand (e.g. your real home address). Kept only on this phone. When you're back within
     ~80 m, that address is used instead of the map's nearest-house guess. */
  spots(){try{return JSON.parse(ls.get("pb.mySpots")||"[]")}catch(e){return[]}},
  learn(label,fix){if(!label||!fix||fix.lat==null)return;const L=this.spots().filter(x=>locDist(x,fix)>60&&x.label!==label);
    L.unshift({label,lat:+fix.lat.toFixed(6),lng:+fix.lng.toFixed(6),at:today()});ls.set("pb.mySpots",JSON.stringify(L.slice(0,40)))},
  mySpot(fix){const r=Math.max(120,Math.min(220,(fix.acc||0)+80));let best=null;this.spots().forEach(x=>{const d=locDist(x,fix);if(d<=r&&(!best||d<best.d))best={d,x}});return best&&best.x||this.pastSpot(fix)},
  /* A street address you typed or picked yourself on earlier purchases near here (e.g. "2944 Gerald Ave NE" at home).
     Comes from your saved transactions, so it works on every device. Wins over the map's nearest-house guess, which drifts indoors. */
  pastSpot(fix){if(!fix||fix.lat==null)return null;const r=Math.max(120,Math.min(220,(fix.acc||0)+80)),by={};
    try{txPool().forEach(t=>{const l=t.loc;if(!l||l.lat==null||l.src==="gps"||l.name)return;const lab=addrDedupe(locText(l));if(!/^\d+\s+\S/.test(lab))return;
      const d=locDist(l,fix);if(d>r)return;const k=addrKey(lab.split(",")[0]);const e=by[k]||(by[k]={n:0,d:1e9,label:lab,lat:l.lat,lng:l.lng,at:""});e.n++;
      if((t.date||"")>=e.at){e.at=t.date||"";e.label=lab}if(d<e.d)e.d=d})}catch(_){return null}
    const best=Object.values(by).sort((a,b)=>b.n-a.n||a.d-b.d)[0];return best?{label:best.label,lat:best.lat,lng:best.lng}:null},
  pack(v){const o={lat:v.lat,lng:v.lng,acc:v.acc||0,at:v.at||new Date().toISOString()};if(v.place)o.place=v.place;if(v.poi)o.poi=v.poi;if(v.road)o.road=v.road;return o},
  // past merchants logged within ~200 m, closest and most used first, plus the place you're standing in
  nearby(v){
    const dist=(a,b)=>{const R=6371e3,r=Math.PI/180,dl=(b.lat-a.lat)*r,dg=(b.lng-a.lng)*r,x=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
    const by={};txPool().forEach(t=>{if(!t.loc||t.loc.lat==null||!t.merchant)return;const d=dist(v,t.loc);if(d>200+Math.min(150,(v.acc||0)))return;
      const name=String(t.merchant).replace(/^\s*venmo\s*:\s*/i,"").trim(),k=name.toLowerCase();if(k===String(t.itemName||"").trim().toLowerCase()||k===String(t.sub||"").trim().toLowerCase())return;const e=by[k]||(by[k]={name,n:0,d});e.n++;e.d=Math.min(e.d,d)});
    const out=Object.values(by).sort((a,b)=>a.d/(1+a.n)-b.d/(1+b.n)).slice(0,3);
    if(v.poi&&!out.some(e=>e.name.toLowerCase()===v.poi.toLowerCase()))out.push({name:v.poi,poi:true});
    return out.slice(0,4)}
};
/* A location is {label, name?, place?, lat?, lng?, src}. label is what you see ("Dog River Coffee, Hood River, OR"
   or just "Hood River, OR"); name is the business, place is the town. Older saves without a label still read fine. */
/* Aesthetic-usability: drop repeated pieces of an address ("2944 Gerald Ave NE, 2944 Gerald Ave NE, …"), ignoring case, dots and Northeast/NE spellings */
const AKC=new Map();function addrKey(x){const k=String(x);let v=AKC.get(k);if(v===undefined){if(AKC.size>4000)AKC.clear();v=addrKey0(k);AKC.set(k,v)}return v}
function addrKey0(x){return String(x).toLowerCase().replace(/[.#]/g,"").replace(/\b(north|south)(east|west)\b/g,(m,a,b)=>a[0]+b[0]).replace(/\b(north|south|east|west)\b/g,m=>m[0]).replace(/\bavenue\b/g,"ave").replace(/\bstreet\b/g,"st").replace(/\broad\b/g,"rd").replace(/\bdrive\b/g,"dr").replace(/\s+/g," ").trim()}
function addrDedupe(str){const seen=new Set();return String(str||"").split(",").map(x=>x.trim()).filter(x=>{const k=addrKey(x);if(!k||seen.has(k))return false;seen.add(k);return true}).join(", ")}
function locText(l){if(!l)return"";if(l.label)return addrDedupe(l.label);return l.place||l.road||(l.lat!=null?l.lat.toFixed(4)+", "+l.lng.toFixed(4):"")}
function locShort(l){if(!l)return"";if(l.name)return l.name;const t=locText(l);return l.place&&t===l.place?l.place.replace(/,\s*[A-Z]{2}$/,""):t.split(",")[0]}
const GPS_SVG='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.6 3.4a.9.9 0 0 0-1-.2L3.9 9.9a.9.9 0 0 0 .1 1.7l6.6 1.8 1.8 6.6a.9.9 0 0 0 1.7.1l6.7-15.7a.9.9 0 0 0-.2-1z"/></svg>';
const PIN_SVG='<svg class="pin" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7zm0 9.5A2.5 2.5 0 1 1 12 6.5a2.5 2.5 0 0 1 0 5z"/></svg>';
const locDist=(a,b)=>{const R=6371e3,r=Math.PI/180,dl=(b.lat-a.lat)*r,dg=(b.lng-a.lng)*r,x=Math.sin(dl/2)**2+Math.cos(a.lat*r)*Math.cos(b.lat*r)*Math.sin(dg/2)**2;return 2*R*Math.asin(Math.sqrt(x))};
const locKey=l=>locText(l).toLowerCase().replace(/\s+/g," ").trim();
/* Place search, nearby first (closer to how Google Maps feels):
   - Photon: type-ahead search ranked by distance from where you are / the map center
   - Overpass: any business within ~40 km whose name contains what you typed
   - Nominatim only as a last resort. Results are merged, de-duplicated and sorted by distance. */
/* Mapbox Search Box (when a token is saved in Settings): businesses and addresses, ranked near you */
const mbxToken=()=>ls.get("pb.mapboxToken")||"";
async function mbxSearch(q,near,limit){const tok=mbxToken();if(!tok)return null;
  try{let u="https://api.mapbox.com/search/searchbox/v1/forward?q="+encodeURIComponent(q)+"&limit="+(limit||8)+"&language=en&country=us,ca&access_token="+encodeURIComponent(tok);
    if(near)u+="&proximity="+near.lng+","+near.lat;
    const c=new AbortController();setTimeout(()=>c.abort(),6000);const r=await fetch(u,{signal:c.signal});if(!r.ok)return null;const j=await r.json();
    return(j.features||[]).map(f=>{const p=f.properties||{},g=f.geometry&&f.geometry.coordinates,co=p.coordinates||{};const lat=co.latitude??(g&&g[1]),lng=co.longitude??(g&&g[0]);if(lat==null)return null;
      const cx=p.context||{},city=(cx.place&&cx.place.name)||(cx.locality&&cx.locality.name)||"",st=(cx.region&&(cx.region.region_code||cx.region.name))||"";
      const place=[city,st].filter(Boolean).join(", "),isPoi=p.feature_type==="poi",town=["place","locality","region","district","neighborhood"].includes(p.feature_type);
      const name=isPoi?p.name:"",street=isPoi?(p.address||""):(town?"":(p.address||p.name||""));
      const l={label:town?[p.name,st].filter(Boolean).join(", "):[name,street,place].filter(Boolean).join(", "),place:town?[p.name,st].filter(Boolean).join(", "):place,lat:+(+lat).toFixed(6),lng:+(+lng).toFixed(6),src:"search"};
      if(name)l.name=name;l.far=near?locDist(near,l):null;return l}).filter(Boolean)}catch(e){return null}}
/* Google Places (New) Text Search when a key is saved in Settings. Capped in the app at pb.gplacesDaily per day (default 100),
   on top of whatever quota you set in Google Cloud. Results are cached so retyping the same search costs nothing. */
const gpKey=()=>ls.get("pb.gplacesKey")||"";
function gpBudget(){const d=today(),c=JSON.parse(ls.get("pb.gplacesUse")||"{}");if(c.d!==d){c.d=d;c.n=0}const max=+(ls.get("pb.gplacesDaily")||100);return{ok:c.n<max,use(){c.n++;ls.set("pb.gplacesUse",JSON.stringify(c))}}}
async function gpSearch(q,near,limit){const key=gpKey();if(!key)return null;const b=gpBudget();if(!b.ok)return null;b.use();
  try{const body={textQuery:q,pageSize:limit||8,languageCode:"en",regionCode:"US"};if(near)body.locationBias={circle:{center:{latitude:near.lat,longitude:near.lng},radius:40000}};
    const c=new AbortController();setTimeout(()=>c.abort(),7000);
    const r=await fetch("https://places.googleapis.com/v1/places:searchText",{method:"POST",signal:c.signal,headers:{"Content-Type":"application/json","X-Goog-Api-Key":key,"X-Goog-FieldMask":"places.displayName,places.formattedAddress,places.location,places.types"},body:JSON.stringify(body)});
    if(!r.ok)return null;const j=await r.json();
    return(j.places||[]).map(p=>{if(!p.location)return null;const fa=String(p.formattedAddress||"").replace(/,\s*(USA|United States|Canada)$/,""),parts=fa.split(",").map(x=>x.trim());
      const stz=parts.length>=2?parts[parts.length-1]:"",st=(stz.match(/^([A-Z]{2})\b/)||[])[1]||stz,city=parts.length>=3?parts[parts.length-2]:(parts.length===2?parts[0]:""),street=parts.length>=3?parts.slice(0,parts.length-2).join(", "):"";
      const nm=p.displayName&&p.displayName.text||"",town=(p.types||[]).some(t=>/^(locality|administrative_area|political|postal_code|country)/.test(t))&&!street;
      const place=[city,st].filter(Boolean).join(", ");const l={label:town?fa:[nm,street,place].filter(Boolean).join(", "),place:town?fa:place,lat:+p.location.latitude.toFixed(6),lng:+p.location.longitude.toFixed(6),src:"search"};
      if(nm&&!town)l.name=nm;l.far=near?locDist(near,l):null;return l}).filter(Boolean)}catch(e){return null}}
async function locSearch(q,near){
  q=q.trim();if(q.length<3)return[];const k=q.toLowerCase()+"|"+(near?near.lat.toFixed(2)+","+near.lng.toFixed(2):"");if(LOC.scache[k])return LOC.scache[k];
  {const g=await gpSearch(q,near,8);if(g&&g.length)return LOC.scache[k]=g}
  {const m=await mbxSearch(q,near,8);if(m&&m.length)return LOC.scache[k]=m}
  const ST={"Michigan":"MI","Ohio":"OH","Indiana":"IN","Illinois":"IL","Wisconsin":"WI","Maryland":"MD","California":"CA","New York":"NY","Florida":"FL","Texas":"TX","Oregon":"OR","Washington":"WA","Minnesota":"MN","Pennsylvania":"PA","Colorado":"CO"};
  const tm=ms=>{const c=new AbortController();setTimeout(()=>c.abort(),ms);return c.signal};
  const mk=(name,street,city,st,lat,lng)=>{const place=[city,ST[st]||st].filter(Boolean).join(", ");const l={label:[name,street,place].filter(Boolean).join(", "),place,lat:+(+lat).toFixed(6),lng:+(+lng).toFixed(6),src:"search"};if(name)l.name=name;l.far=near?locDist(near,l):null;return l};
  const photon=(async()=>{try{let u="https://photon.komoot.io/api/?limit=10&lang=en&q="+encodeURIComponent(q);if(near)u+="&lat="+near.lat+"&lon="+near.lng+"&zoom=12&location_bias_scale=0.2";
    const r=await fetch(u,{signal:tm(6000)});if(!r.ok)return[];const j=await r.json();
    return(j.features||[]).map(f=>{const p=f.properties||{},c=f.geometry&&f.geometry.coordinates;if(!c)return null;const town=["city","town","village","district","county","state"].includes(p.type);
      return mk(town?"":p.name,town?"":[p.housenumber,p.street].filter(Boolean).join(" "),town?p.name:(p.city||p.town||p.village||p.district||p.county||""),p.state,c[1],c[0])}).filter(Boolean)}catch(e){return[]}})();
  const overpass=(async()=>{if(!near)return[];try{const rx=q.replace(/[^\w\s'&-]/g,"").replace(/\s+/g,".*");
    const qy='[out:json][timeout:8];nwr(around:40000,'+near.lat+','+near.lng+')["name"~"'+rx+'",i][~"^(shop|amenity|leisure|office|healthcare|craft|tourism)$"~"."];out center tags 25;';
    const r=await fetch("https://overpass-api.de/api/interpreter?data="+encodeURIComponent(qy),{signal:tm(9000)});if(!r.ok)return[];const j=await r.json();
    return(j.elements||[]).map(e=>{const t=e.tags||{},lat=e.lat??(e.center&&e.center.lat),lng=e.lon??(e.center&&e.center.lon);if(lat==null)return null;
      return mk(t.name,[t["addr:housenumber"],t["addr:street"]].filter(Boolean).join(" "),t["addr:city"]||"",t["addr:state"]||"",lat,lng)}).filter(Boolean)}catch(e){return[]}})();
  let out=[].concat(await overpass,await photon);
  if(!out.length){try{let u="https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=6&countrycodes=us,ca&q="+encodeURIComponent(q);
    if(near)u+="&viewbox="+(near.lng-0.6)+","+(near.lat+0.45)+","+(near.lng+0.6)+","+(near.lat-0.45)+"&bounded=1";
    const r=await fetch(u,{signal:tm(6000),headers:{"Accept-Language":"en-US"}});if(r.ok)out=(await r.json()).map(j=>{const a=j.address||{};return mk(j.name,[a.house_number,a.road].filter(Boolean).join(" "),a.city||a.town||a.village||a.county||"",(a["ISO3166-2-lvl4"]||"").split("-")[1]||a.state||"",j.lat,j.lon)})}catch(e){}}
  // fill in a missing town from the nearest result that has one
  const res=[];out.sort((a,b)=>(a.far??0)-(b.far??0)).forEach(l=>{const n=(l.name||l.label).toLowerCase();if(res.some(x=>(x.name||x.label).toLowerCase()===n&&locDist(x,l)<200))return;res.push(l)});
  const close=res.filter(l=>l.far==null||l.far<240000);const final=(close.length?close:res).slice(0,8);
  return LOC.scache[k]=final}
function locCandidates(merchant,date,selfId){
  const mk=merchKey(merchant),pool=txPool().filter(t=>t.loc&&t.id!==selfId&&locText(t.loc)),dnum=s=>Date.parse((s||"2000-01-01")+"T12:00:00")/864e5;
  const d0=dnum(date),out=[],seen=new Set(),add=(l,head)=>{const k=locKey(l);if(!k||seen.has(k))return;seen.add(k);out.push(Object.assign({},l,{head}))};
  const strip=l=>{const o={label:locText(l),src:"past"};["name","place","lat","lng"].forEach(f=>{if(l[f]!=null&&l[f]!=="")o[f]=l[f]});return o};
  const fix=LOC.last,fixFresh=fix&&Date.now()-LOC.lastAt<10*60e3,recentDay=Math.abs(d0-dnum(today()))<=1;
  const gps=()=>{if(!fixFresh||!fix.place)return;
    pool.filter(t=>t.loc.lat!=null&&t.loc.name&&locDist(fix,t.loc)<150).slice(0,2).forEach(t=>add(strip(t.loc),"Where you are"));
    if(fix.poi)add({label:fix.poi+", "+fix.place,name:fix.poi,place:fix.place,lat:fix.lat,lng:fix.lng,src:"gps"},"Where you are");
    add({label:fix.place,place:fix.place,lat:fix.lat,lng:fix.lng,src:"gps"},"Where you are")};
  if(recentDay)gps();
  if(mk)pool.filter(t=>merchKey(t.merchant)===mk).sort((a,b)=>(b.date||"").localeCompare(a.date||"")).forEach(t=>add(strip(t.loc),"This merchant before"));
  pool.filter(t=>Math.abs(dnum(t.date)-d0)<=1).sort((a,b)=>Math.abs(dnum(a.date)-d0)-Math.abs(dnum(b.date)-d0)).forEach(t=>{const l=strip(t.loc);
    add(l,"Same day");if(l.name&&l.place)add({label:l.place,place:l.place,lat:l.lat,lng:l.lng,src:"past"},"Same day")});
  if(!recentDay)gps();
  pool.slice().sort((a,b)=>(b.date||"").localeCompare(a.date||"")).slice(0,60).forEach(t=>add(strip(t.loc),"Recent"));
  return out;
}
/* ---------- pick a location on a map ----------
   Leaflet + OpenStreetMap tiles, loaded the first time the map opens. Drag the map under the pin;
   the spot is looked up (business + town) and you choose the business or just the town. */
// Map and receipt-scan libraries are hosted with the app (vendor/, exact pinned versions; see vendor/README.md).
const VEND=new URL((/\/preview\//.test(location.pathname)?"../":"")+"vendor/",location.href).href;
const MAPLIB={p:null};
function loadLeaflet(){if(window.L&&window.L.map)return Promise.resolve();
  return MAPLIB.p||(MAPLIB.p=new Promise((res,rej)=>{const s=document.createElement("script");s.src=VEND+"leaflet-1.9.4/leaflet.js";s.onload=()=>res();s.onerror=()=>{MAPLIB.p=null;rej(new Error("map"))};document.head.appendChild(s)}))}
const MAP_SVG='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linejoin="round"><path d="M9 4L3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/></svg>';
function mapPicker(start,onPick,preQ){
  const ov=document.createElement("div");ov.className="mpk";ov.setAttribute("role","dialog");ov.setAttribute("aria-modal","true");ov.setAttribute("aria-label","Pick a location on the map");
  ov.innerHTML='<div class="mpk-top"><button class="mpk-x" data-mx>Cancel</button><b>Pick a location</b><span></span></div>'+
    '<div class="mpk-sw"><input class="mpk-q" placeholder="Search a place or town" autocomplete="off" autocorrect="off" enterkeyhint="search" aria-label="Search the map"><div class="mpk-res" hidden></div></div>'+
    '<div class="mpk-map"><div class="mpk-canvas"></div><div class="mpk-pin" aria-hidden="true">'+PIN_SVG+'<i></i></div>'+(LOC.ok()?'<button class="mpk-me" aria-label="Go to my location">'+GPS_SVG+'</button>':'')+'<div class="mpk-msg" hidden></div></div>'+
    '<div class="mpk-card"><div class="mpk-l"><b class="mpk-name">Finding this spot…</b><span class="mpk-sub"></span></div><div class="mpk-btns"></div></div>';
  document.body.appendChild(ov);document.body.classList.add("mpk-open");requestAnimationFrame(()=>ov.classList.add("on"));
  let map=null,look=0,picked=null,hold=null;
  const nameEl=ov.querySelector(".mpk-name"),subEl=ov.querySelector(".mpk-sub"),btns=ov.querySelector(".mpk-btns"),pin=ov.querySelector(".mpk-pin");
  const close=()=>{ov.classList.remove("on");document.body.classList.remove("mpk-open");setTimeout(()=>{try{map&&map.remove()}catch(_){}ov.remove()},260)};
  const choose=l=>{try{haptic()}catch(_){}close();onPick(l)};
  const showSpot=(c,info)=>{ // info: {place, poi, road} or a search hit
    const place=info&&info.place||"",poi=info&&(info.name||info.poi)||"";
    const base={lat:+c.lat.toFixed(6),lng:+c.lng.toFixed(6),src:"map"};
    nameEl.textContent=poi||place||"Dropped pin";subEl.textContent=poi?[info.road,place].filter(Boolean).join(" · "):(info&&info.road)||(place?"":c.lat.toFixed(4)+", "+c.lng.toFixed(4));
    const opts=[];
    if(poi&&place)opts.push(Object.assign({label:poi+", "+place,name:poi,place},base));
    if(place)opts.push(Object.assign({label:place,place},base));
    if(!opts.length)opts.push(Object.assign({label:c.lat.toFixed(4)+", "+c.lng.toFixed(4)},base));
    btns.innerHTML=opts.map((o,i)=>'<button class="btn'+(i?' sec':'')+'" data-mp="'+i+'">'+(i===0&&opts.length>1?'Use business':opts.length>1?'Town only':'Use this spot')+'<small>'+esc(o.label)+'</small></button>').join("");
    picked=opts};
  const lookup=()=>{if(!map)return;const c=map.getCenter(),my=++look;nameEl.textContent="Finding this spot…";subEl.textContent="";btns.innerHTML="";
    LOC.place({lat:+c.lat.toFixed(6),lng:+c.lng.toFixed(6)}).then(info=>{if(my!==look||!ov.isConnected)return;showSpot(c,info||{})})};
  let lt=0;const lookupSoon=()=>{clearTimeout(lt);lt=setTimeout(lookup,450)};
  ov.addEventListener("click",e=>{
    if(e.target.closest("[data-mx]")){close();return}
    const b=e.target.closest("[data-mp]");if(b&&picked){choose(picked[+b.dataset.mp]);return}
    const r=e.target.closest("[data-mr]");if(r&&ov._res){const l=ov._res[+r.dataset.mr];ov.querySelector(".mpk-res").hidden=true;ov.querySelector(".mpk-q").blur();
      const o={label:l.label,lat:l.lat,lng:l.lng,src:"search"};if(l.name)o.name=l.name;if(l.place)o.place=l.place;choose(o);return}
    if(e.target.closest(".mpk-me")){const me=ov.querySelector(".mpk-me");me.classList.add("busy");
      LOC.get().then(v=>{LOC.last=Object.assign(LOC.last||{},v);LOC.lastAt=Date.now();me.classList.remove("busy");map&&map.setView([v.lat,v.lng],17,{animate:true})}).catch(()=>{me.classList.remove("busy");toast("Couldn't find your location")})}
  });
  // search box
  const q=ov.querySelector(".mpk-q"),res=ov.querySelector(".mpk-res");let qt=0;
  const runQ=()=>{const v=q.value.trim();if(v.length<3){res.hidden=true;return}
    locSearch(v,map?map.getCenter():start).then(list=>{if(q.value.trim()!==v)return;ov._res=list;
      res.innerHTML=list.length?list.map((l,i)=>'<button data-mr="'+i+'"><span>'+esc(l.label)+'</span>'+(l.far!=null&&l.far>1500?'<small>'+(l.far/1609).toFixed(l.far<16000?1:0)+' mi</small>':'')+'</button>').join(""):'<p>No matches nearby</p>';res.hidden=false})};
  q.addEventListener("input",()=>{clearTimeout(qt);qt=setTimeout(runQ,450)});
  q.addEventListener("keydown",e=>{if(e.key==="Enter"){e.preventDefault();clearTimeout(qt);runQ()}});
  /* opened from a transaction: search the merchant right away, and jump to the closest match */
  if(preQ&&preQ.trim().length>=3){q.value=preQ.trim();const v=q.value;
    locSearch(v,start).then(list=>{if(!ov.isConnected||q.value!==v)return;ov._res=list;
      res.innerHTML=list.length?list.map((l,i)=>'<button data-mr="'+i+'"><span>'+esc(l.label)+'</span>'+(l.far!=null&&l.far>1500?'<small>'+(l.far/1609).toFixed(l.far<16000?1:0)+' mi</small>':'')+'</button>').join(""):'<p>No matches nearby</p>';res.hidden=false})}
  // the map
  loadLeaflet().then(()=>{if(!ov.isConnected)return;const L=window.L;
    map=L.map(ov.querySelector(".mpk-canvas"),{zoomControl:false,attributionControl:true,center:[start.lat,start.lng],zoom:start.zoom||16});
    const tl=L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>'}).addTo(map);
    let ok=0,bad=0;tl.on("tileload",()=>{ok++;ov.querySelector(".mpk-msg").hidden=true});
    tl.on("tileerror",()=>{if(++bad>=4&&!ok){const m=ov.querySelector(".mpk-msg");m.textContent="Map pictures aren't loading. Check your connection, or search above.";m.hidden=false}});
    map.attributionControl.setPrefix(false);
    map.on("movestart",()=>{pin.classList.add("up");if(hold)return;look++;nameEl.textContent="…";subEl.textContent="";btns.innerHTML=""});
    map.on("moveend",()=>{pin.classList.remove("up");const c=map.getCenter();
      if(hold&&locDist(hold,{lat:c.lat,lng:c.lng})<40){look++;showSpot({lat:hold.lat,lng:hold.lng},{name:hold.name,place:hold.place,road:""});return} // a search pick keeps its own name
      hold=null;lookupSoon()});
    map.on("click",e=>map.panTo(e.latlng,{animate:true}));
    setTimeout(()=>{map.invalidateSize();lookup()},280);
  }).catch(()=>{const m=ov.querySelector(".mpk-msg");m.textContent="The map couldn't load here. Search above, or type the place in the Location field.";m.hidden=false;nameEl.textContent="Map unavailable"});
}
// the location field used on the add/edit form and on history rows
function locField(s,o){
  const inp=o.input,sug=o.sug,gpsB=o.gps,row=inp.closest(".lrow");let typed=false,cur=o.initial?Object.assign({},o.initial):null,list=[],hi=-1,auto=!!o.auto,touched=false,pend=null,remote=[],rq="",rT=0;
  if(cur&&!cur.label)cur.label=locText(cur);
  const clean=v=>v.replace(/\s+/g," ").trim();
  const near=()=>{if(LOC.last&&Date.now()-LOC.lastAt<10*60e3)return LOC.last;if(cur&&cur.lat!=null)return cur;const c=locCandidates(o.merchant(),o.date(),o.selfId).find(x=>x.lat!=null);return c||null};
  const hide=()=>{list=[];hi=-1;sug.hidden=true;sug.innerHTML="";inp.setAttribute("aria-expanded","false")};
  const hl=t=>{const q=typed?clean(inp.value):"";const i=q?t.toLowerCase().indexOf(q.toLowerCase()):-1;return i<0?esc(t):esc(t.slice(0,i))+"<b>"+esc(t.slice(i,i+q.length))+"</b>"+esc(t.slice(i+q.length))};
  const draw=()=>{
    if(document.activeElement!==inp){hide();return}
    const q=typed?clean(inp.value):"",ql=q.toLowerCase();let c=locCandidates(o.merchant(),o.date(),o.selfId);
    if(q){c=c.filter(x=>x.label.toLowerCase().split(/[^a-z0-9]+/).some(w=>w&&w.startsWith(ql))||x.label.toLowerCase().includes(ql));
      const seen=new Set(c.map(locKey));if(rq===q)remote.forEach(r=>{if(!seen.has(locKey(r))){seen.add(locKey(r));c.push(Object.assign({},r,{head:"Search"}))}});
      if(!c.some(x=>x.label.toLowerCase()===ql))c.push({label:q,src:"manual",head:"",manual:true})}
    list=c.slice(0,9);if(hi>=list.length)hi=-1;
    if(!list.length){hide();return}
    let last=null;
    sug.innerHTML=list.map((e,i)=>{const head=e.head&&e.head!==last?'<div class="chead2">'+esc(e.head)+'</div>':'';last=e.head;
      const tag=e.far!=null&&e.far>1500?'<span class="mc">'+(e.far/1609).toFixed(e.far<16000?1:0)+' mi</span>':(e.src==="gps"?'<span class="mc">'+GPS_SVG+'</span>':'');
      return head+'<button type="button" role="option" data-li="'+i+'"'+(i===hi?' class="hl"':'')+'><span class="mn">'+(e.manual?'<span class="cplus">+</span>Use “'+esc(e.label)+'”':hl(e.label))+'</span>'+tag+'</button>'}).join("");
    sug.classList.toggle("noq",!q);sug.hidden=false;inp.setAttribute("aria-expanded","true")};
  const remoteSoon=()=>{clearTimeout(rT);const q=clean(inp.value);if(q.length<3){remote=[];return}
    rT=setTimeout(()=>{locSearch(q,near()).then(r=>{if(clean(inp.value)!==q)return;rq=q;remote=r;draw()})},450)};
  const pick=e=>{cur={label:e.label,src:e.src||"manual"};["name","place","lat","lng"].forEach(f=>{if(e[f]!=null&&e[f]!=="")cur[f]=e[f]});
    inp.value=cur.label;touched=true;auto=false;row.classList.remove("auto");hide();inp.blur();try{haptic()}catch(_){}o.onDone&&o.onDone()};
  sug.addEventListener("pointerdown",e=>{if(e.target.closest("[data-li]"))e.preventDefault()});
  sug.addEventListener("mousedown",e=>e.preventDefault());
  sug.addEventListener("click",e=>{const b=e.target.closest("[data-li]");if(!b)return;e.preventDefault();e.stopPropagation();const x=list[+b.dataset.li];if(x)pick(x)});
  inp.addEventListener("focus",()=>{typed=false;o.onFocus&&o.onFocus();draw();if(inp.value)setTimeout(()=>{try{inp.setSelectionRange(0,inp.value.length)}catch(_){}},60)});
  inp.addEventListener("input",()=>{typed=true;hi=-1;touched=true;auto=false;row.classList.remove("auto");draw();remoteSoon()});
  inp.addEventListener("blur",()=>setTimeout(()=>{if(document.activeElement===inp)return;hide();
    const v=clean(inp.value);if(!v)cur=null;else if(!cur||v!==cur.label)cur={label:v,src:"manual"};inp.value=cur?cur.label:""},140));
  inp.addEventListener("keydown",e=>{
    if(e.key==="Enter"){e.preventDefault();e.stopImmediatePropagation();if(hi>=0&&list[hi])pick(list[hi]);else{hide();inp.blur();o.onDone&&o.onDone()}return}
    if(sug.hidden||!list.length)return;
    if(e.key==="ArrowDown"||e.key==="ArrowUp"){e.preventDefault();const n=list.length;hi=e.key==="ArrowDown"?(hi+1)%n:(hi<=0?n-1:hi-1);draw()}
    else if(e.key==="Escape"){e.preventDefault();e.stopPropagation();hide()}});
  // fill in where you are (new transactions only, until you type or pick something yourself)
  /* Smart spot for new transactions:
     1) you've bought from this merchant near here before → that saved spot
     2) a nearby business matches the merchant you typed → "Business, 123 Street, Town"
     3) no merchant yet → the business you're standing in (closest, within ~60 m)
     4) otherwise (online, bills, nothing close) → your street address, not just the town */
  const applyAuto=()=>{if(!auto||touched)return;const f=LOC.last;if(!f)return;if(!f.place){if(!clean(inp.value)){cur={label:"Current location",lat:f.lat,lng:f.lng,acc:f.acc,src:"gps"};inp.value=cur.label}return}
    const mraw=o.merchant(),mk=merchKey(mraw),venmo=/^\s*venmo\s*:/i.test(mraw||"");let l=null;
    if(mk&&!venmo){const m=txPool().find(t=>t.loc&&t.loc.lat!=null&&merchKey(t.merchant)===mk&&locDist(f,t.loc)<400);
      if(m)l={label:locText(m.loc),place:m.loc.place||f.place,lat:m.loc.lat,lng:m.loc.lng,acc:f.acc,src:"gps"},m.loc.name&&(l.name=m.loc.name)}
    if(!l&&!venmo){const P=LOC.pcache[f.lat.toFixed(4)+","+f.lng.toFixed(4)];
      if(!P||typeof P.then==="function"&&!P._v){LOC.pois(f).then(list=>{(LOC.pcache[f.lat.toFixed(4)+","+f.lng.toFixed(4)]||{})._v=list;if(s.isConnected)applyAuto()})}
      const list=P&&P._v||[];
      const norm=x=>String(x||"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
      let hit=null;if(mk){const n=norm(mraw);hit=list.find(p=>p.d<300&&(norm(p.name).includes(n)||n.includes(norm(p.name))||norm(p.name).split(" ")[0]===n.split(" ")[0]))}
      else if(LOC.mySpot(f)){const m=LOC.mySpot(f);l={label:m.label,lat:m.lat,lng:m.lng,acc:f.acc,src:"gps"}}
      else hit=list.find(p=>p.d<=Math.max(35,Math.min(70,f.acc||40)));
      if(!hit&&mk&&(gpKey()||mbxToken())&&mk.length>=3){const key="ext|"+mk+"|"+f.lat.toFixed(3)+","+f.lng.toFixed(3);const M=LOC.pcache[key];
        if(!M){if(LOC._extK&&LOC.pcache[LOC._extK]&&!LOC.pcache[LOC._extK].v)delete LOC.pcache[LOC._extK];LOC._extK=key;LOC.pcache[key]={};clearTimeout(LOC._extT);LOC._extT=setTimeout(()=>{(gpKey()?gpSearch(mraw,f,3):mbxSearch(mraw,f,3)).then(r=>{LOC.pcache[key].v=r||[];if(s.isConnected)applyAuto()})},900)}
        else if(M.v){const m=M.v.find(x=>x.name&&x.far!=null&&x.far<400);if(m){l=Object.assign({},m,{acc:f.acc,src:"gps"})}}}
      if(!l&&hit){const ad=hit.addr||f.road;l={label:addrDedupe([hit.name,ad,f.place].filter(Boolean).join(", ")),name:hit.name,place:f.place,lat:+hit.lat.toFixed(6),lng:+hit.lng.toFixed(6),acc:f.acc,src:"gps"}}}
    if(!l&&LOC.mySpot(f)){const m=LOC.mySpot(f);l={label:m.label,lat:m.lat,lng:m.lng,acc:f.acc,src:"gps"}}
    if(!l)l={label:[f.road,f.place].filter(Boolean).join(", "),place:f.place,lat:f.lat,lng:f.lng,acc:f.acc,src:"gps"};
    if(cur&&cur.label===l.label)return;cur=l;if(document.activeElement!==inp)inp.value=l.label;row.classList.remove("auto");void row.offsetWidth;row.classList.add("auto")};
  const locate=open=>{if(!LOC.ok())return Promise.resolve(null);gpsB&&gpsB.classList.add("busy");
    pend=LOC.get().then(v=>LOC.place(v).then(pl=>{if(pl)Object.assign(v,pl);LOC.last=v;LOC.lastAt=Date.now();return v})).then(v=>{gpsB&&gpsB.classList.remove("busy");if(!s.isConnected)return v;
        applyAuto();o.onFix&&o.onFix(v);if(open)inp.focus();else if(document.activeElement===inp)draw();return v})
      .catch(err=>{gpsB&&gpsB.classList.remove("busy");if(err&&err.code===1&&window.top!==window){gpsB&&gpsB.remove()}else if(open)toast(err&&err.code===1?"Location is turned off for this app":"Couldn't find your location");return null});
    return pend};
  if(gpsB)gpsB.addEventListener("click",e=>{e.preventDefault();if(LOC.last&&Date.now()-LOC.lastAt<2*60e3){inp.focus();return}locate(true)});
  const mapB=document.createElement("button");mapB.type="button";mapB.className="lgps lmap";mapB.setAttribute("aria-label","Pick on a map");mapB.innerHTML=MAP_SVG;
  if(window.top===window){if(gpsB)row.insertBefore(mapB,gpsB);else row.appendChild(mapB)}
  mapB.addEventListener("click",e=>{e.preventDefault();inp.blur();hide();
    let st=null;if(cur&&cur.lat!=null)st={lat:cur.lat,lng:cur.lng,zoom:17};else if(LOC.last&&Date.now()-LOC.lastAt<30*60e3)st={lat:LOC.last.lat,lng:LOC.last.lng,zoom:17};
    else{const c=locCandidates(o.merchant(),o.date(),o.selfId).find(x=>x.lat!=null);st=c?{lat:c.lat,lng:c.lng,zoom:15}:{lat:42.9634,lng:-85.6681,zoom:11}}
    mapPicker(st,l=>{cur=l;inp.value=l.label;touched=true;auto=false;row.classList.remove("auto");if(l.name&&o.setMerchant)o.setMerchant(l.name);o.onDone&&o.onDone()},String(o.merchant()||"").replace(/^\s*venmo\s*:\s*/i,""))});
  // new transactions assume you're where you are now: use a fresh fix right away, then refine
  if(o.auto&&LOC.ok()){
    if(LOC.last&&Date.now()-LOC.lastAt<5*60e3){applyAuto();o.onFix&&setTimeout(()=>o.onFix(LOC.last),0)}
    if(!clean(inp.value))inp.placeholder="Finding where you are…";
    locate(false).then(v=>{inp.placeholder=v?"Business, city":"Business, city"})}
  return{
    value(){const v=clean(inp.value);if(!v)return null;if(!cur||cur.label!==v)return{label:v,src:"manual",at:new Date().toISOString()};
      const r={label:cur.label,src:cur.src||"manual"};["name","place","lat","lng","acc"].forEach(f=>{if(cur[f]!=null&&cur[f]!=="")r[f]=cur[f]});r.at=cur.at||new Date().toISOString();return r},
    pending(){return auto&&!touched&&!clean(inp.value)&&pend?pend.then(v=>v?{label:v.place||"Current location",place:v.place||undefined,lat:v.lat,lng:v.lng,acc:v.acc,src:"gps",at:new Date().toISOString()}:null).then(l=>{if(l&&!l.place)delete l.place;return l}):null},
    merchantChanged(){applyAuto()}
  };
}
function locLabel(l,merchant){if(!l)return"";if(merchant&&l.poi&&!merchKey(merchant).includes(l.poi.toLowerCase().split(" ")[0]))return[l.road,l.place].filter(Boolean).join(" · ")||l.place||"";return l.poi?(l.poi+(l.place?" · "+l.place:"")):(l.place||(l.road)||(l.lat!=null?l.lat.toFixed(4)+", "+l.lng.toFixed(4):""))}
function locMapUrl(l,name){return"https://maps.apple.com/?ll="+l.lat+","+l.lng+"&q="+encodeURIComponent(String(name||"Purchase").replace(/^\s*venmo\s*:\s*/i,""))}
