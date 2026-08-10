/* ============================================================
   PHANTOM WALLET — main app
   DATA is driven from here, edited via Settings sheet (drawer →
   Help & Support), applied on Save. Live prices via CoinGecko.
   ============================================================ */
const ICONS = {
  ETH:  `<span class="ico" style="background:#fff"><svg viewBox="0 0 32 32" width="28" height="28"><polygon points="16,4 16,13 23,16.5" fill="#343434"/><polygon points="16,4 9,16.5 16,13" fill="#8c8c8c"/><polygon points="16,21 16,28 23,17.9" fill="#343434"/><polygon points="16,28 16,21 9,17.9" fill="#8c8c8c"/><polygon points="16,19.7 23,16.5 16,13" fill="#131313"/><polygon points="16,13 9,16.5 16,19.7" fill="#393939"/></svg></span>`,
  SOL:  `<span class="ico"><img src="assets/coins/sol.png" alt="" draggable="false"></span>`,
  USDT: `<span class="ico"><img src="assets/coins/usdt.png" alt="" draggable="false"><span class="badge"><svg viewBox="0 0 24 24" width="11" height="11"><path d="M12 2.5L18 12l-6 3.5L6 12z" fill="#dcdce0"/><path d="M12 16.7L18 13l-6 8.3L6 13z" fill="#b4b4ba"/></svg></span></span>`,
  USDC: `<span class="ico"><img src="assets/coins/usdc.png" alt="" draggable="false"><span class="badge"><svg viewBox="0 0 24 24" width="11" height="11"><path d="M12 2.5L18 12l-6 3.5L6 12z" fill="#dcdce0"/><path d="M12 16.7L18 13l-6 8.3L6 13z" fill="#b4b4ba"/></svg></span></span>`,
  DOGE: `<span class="ico" style="background:#111;color:#fff;font-size:11px">DOGE<span class="badge"><svg viewBox="0 0 24 24" width="11" height="11"><path d="M12 2.5L18 12l-6 3.5L6 12z" fill="#dcdce0"/><path d="M12 16.7L18 13l-6 8.3L6 13z" fill="#b4b4ba"/></svg></span></span>`,
  HAT:  `<span class="ico" style="background:#111;color:#fff;font-size:12px">HAT<span class="badge"><svg viewBox="0 0 24 24" width="11" height="11"><path d="M12 2.5L18 12l-6 3.5L6 12z" fill="#dcdce0"/><path d="M12 16.7L18 13l-6 8.3L6 13z" fill="#b4b4ba"/></svg></span></span>`,
};
const PERP_ICON = {
  BTC:  `<span class="pico" style="background:#f7931a;color:#fff;font-size:24px;font-weight:800">&#8383;</span>`,
  ETH:  `<span class="pico" style="background:#23242a"><svg viewBox="0 0 32 32" width="26" height="26"><polygon points="16,4 16,13 23,16.5" fill="#c9c9d0"/><polygon points="16,4 9,16.5 16,13" fill="#8c8c96"/><polygon points="16,21 16,28 23,17.9" fill="#c9c9d0"/><polygon points="16,28 16,21 9,17.9" fill="#8c8c96"/><polygon points="16,19.7 23,16.5 16,13" fill="#6f6f79"/><polygon points="16,13 9,16.5 16,19.7" fill="#a2a2ac"/></svg></span>`,
  SOL:  `<span class="pico" style="background:#000"><img src="assets/coins/sol.png" alt="" draggable="false"></span>`,
};
const PRED_TILE = {
  f1:     `<span class="ptile" style="background:#12b39a"><svg viewBox="0 0 32 32" width="30" height="30" fill="#fff"><path d="M16 6a10 10 0 0 0-9.8 12H18a6 6 0 0 0 6-5.2A8 8 0 0 0 16 6z"/><rect x="6.4" y="18.4" width="12.2" height="3.6" rx="1.8"/></svg></span>`,
  astros: `<span class="ptile" style="background:linear-gradient(135deg,#0b5cff 50%,#f7c948 50%)"><svg viewBox="0 0 32 32" width="26" height="26"><circle cx="16" cy="16" r="12" fill="#fff"/><path d="M9 8c3 4 3 12 0 16M23 8c-3 4-3 12 0 16" stroke="#d33" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg></span>`,
};
const CURRENCIES={USD:"$",EUR:"€",GBP:"£",JPY:"¥",AUD:"A$",CAD:"C$"};
function curSym(){return CURRENCIES[DATA.currency]||"$";}

const DEFAULT_DATA = {
  emoji:"👻", username:"sample", name:"Main", currency:"USD",
  cash:"0.00", balanceVisible:true, bio:"", cgKey:"",
  tokens:[
    {sym:"ETH",  name:"Ethereum", cgId:"ethereum",              amount:"0", v:true, autoAmount:"0", autoEvery:1, autoProgress:0},
    {sym:"BTC",  name:"Bitcoin",  cgId:"bitcoin",               amount:"0", v:true, autoAmount:"0", autoEvery:1, autoProgress:0},
    {sym:"SOL",  name:"Solana",   cgId:"solana",                amount:"0", v:true, autoAmount:"0", autoEvery:1, autoProgress:0},
    {sym:"MON",  name:"Monad",    cgId:null,        price:1,    amount:"0", v:true, autoAmount:"0", autoEvery:1, autoProgress:0},
    {sym:"POL",  name:"Polygon",  cgId:"matic-network",         amount:"0", v:true, autoAmount:"0", autoEvery:1, autoProgress:0},
    {sym:"USDT", name:"Tether",   cgId:"tether",                amount:"0", v:true, autoAmount:"0", autoEvery:1, autoProgress:0},
    {sym:"USDC", name:"USDC",     cgId:"usd-coin",              amount:"0", v:true, autoAmount:"0", autoEvery:1, autoProgress:0},
  ],
  perps:[
    {sym:"BTC", lev:"40x", chg:"+0.25%", dir:"up"},
    {sym:"ETH", lev:"25x", chg:"+0.30%", dir:"up"},
    {sym:"SOL", lev:"20x", chg:"+0.15%", dir:"up"},
  ],
  predictions:[
    {ic:"f1",     title:"Formula 1 2026 Drivers' Championship", when:"in 122d"},
    {ic:"astros", title:"Houston Astros to win the World Series", when:"in 2d"},
  ],
  markets:[
    {q:"Will BTC close above $100k in 2026?", vol:"$2.4M Vol.", yes:"64", no:"36"},
    {q:"Will ETH flip $5,000 this quarter?",  vol:"$880K Vol.", yes:"41", no:"59"},
    {q:"Will Solana hit a new all-time high?", vol:"$1.1M Vol.", yes:"57", no:"43"},
    {q:"Fed rate cut at the next meeting?",   vol:"$3.9M Vol.", yes:"72", no:"28"},
  ],
  trending:[
    {sym:"SOL",  name:"Solana",   sub:"SOL",  price:"$77.42",  chg:"+4.8%",  dir:"up"},
    {sym:"ETH",  name:"Ethereum", sub:"ETH",  price:"$1,894",  chg:"+2.1%",  dir:"up"},
    {sym:"USDC", name:"USD Coin", sub:"USDC", price:"$1.00",   chg:"0.0%",   dir:"up"},
    {sym:"USDT", name:"Tether",   sub:"USDT", price:"$1.00",   chg:"0.0%",   dir:"up"},
  ]
};

const STORE_KEY="phantom-dash-v2";
const PRICE_KEY="phantom-prices-v1";
let DATA=load();
let PRICES={}, FIAT=1;
function load(){try{const s=localStorage.getItem(STORE_KEY);if(s)return{...structuredClone(DEFAULT_DATA),...JSON.parse(s)};}catch(e){}return structuredClone(DEFAULT_DATA);}
function save(){localStorage.setItem(STORE_KEY,JSON.stringify(DATA));}
function cachePrices(){try{localStorage.setItem(PRICE_KEY,JSON.stringify({cur:DATA.currency,FIAT,PRICES,ts:Date.now()}));}catch(e){}}
function loadPriceCache(){try{const s=JSON.parse(localStorage.getItem(PRICE_KEY));if(s&&s.cur===DATA.currency){PRICES=s.PRICES||{};FIAT=s.FIAT||1;return true;}}catch(e){}return false;}

const verify=`<svg class="verify" viewBox="0 0 24 24"><path d="M12 2l2.2 1.5 2.6-.4 1.3 2.3 2.3 1.3-.4 2.6L23 12l-1.5 2.2.4 2.6-2.3 1.3-1.3 2.3-2.6-.4L12 22l-2.2-1.5-2.6.4-1.3-2.3-2.3-1.3.4-2.6L1 12l1.5-2.2-.4-2.6 2.3-1.3 1.3-2.3 2.6.4z" fill="#ab9ff2"/><path d="M8.4 12l2.4 2.3 4.6-4.8" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

function iconFor(sym){return ICONS[sym]||`<span class="ico" style="background:#333">${sym}</span>`;}
function tokenIcon(t){
  if(t.img) return `<span class="ico"><img src="${t.img}" alt="" referrerpolicy="no-referrer" draggable="false"></span>`;
  if(ICONS[t.sym]) return ICONS[t.sym];
  return `<span class="ico" style="background:#2a2a2e;color:#fff;font-size:11px">${(t.sym||"?").slice(0,4)}</span>`;
}

/* ---- money helpers ---- */
function fmt(v){
  v=Number(v)||0;const a=Math.abs(v);
  if(a===0) return "0.00";
  if(a>=1) return v.toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
  if(a>=0.01) return v.toFixed(4);
  let s=v.toFixed(10).replace(/0+$/,"").replace(/\.$/,"");
  return (s===""||s==="-")?"0.00":s;
}
function fmtQty(v){
  v=Number(v)||0;const a=Math.abs(v);
  if(a>=1000) return v.toLocaleString(undefined,{maximumFractionDigits:2});
  if(a>=1) return v.toLocaleString(undefined,{maximumFractionDigits:5});
  if(a===0) return "0";
  let s=v.toFixed(10).replace(/0+$/,"").replace(/\.$/,"");
  return s||"0";
}
function fmtQtyShort(v){
  v=Number(v)||0;const a=Math.abs(v);
  if(a>=1e6) return (v/1e6).toFixed(2).replace(/\.?0+$/,"")+"M";
  if(a>=1e3) return (v/1e3).toFixed(2).replace(/\.?0+$/,"")+"K";
  return fmtQty(v);
}
function tokenPrice(t){
  if(t.cgId&&PRICES[t.cgId]!=null) return PRICES[t.cgId].price;
  if(t.price!=null) return t.price*FIAT;
  return 0;
}
function tokenValue(t){return (Number(t.amount)||0)*tokenPrice(t);}
function tokenChg(t){return (t.cgId&&PRICES[t.cgId]!=null)?PRICES[t.cgId].chg:0;}

/* ---- renderers ---- */
function renderTokens(){
  const list=document.getElementById("tokenList");list.innerHTML="";
  DATA.tokens.forEach((t,i)=>{
    const val=tokenValue(t), dv=val*(tokenChg(t)/100);
    const dir=dv>=0?"up":"down";
    const row=document.createElement("div");row.className="token";row.style.animationDelay=(i*65)+"ms";
    row.innerHTML=`${tokenIcon(t)}
      <div class="mid"><div class="name"><span>${t.name}</span>${t.v?verify:""}</div>
      <div class="qty">${(t.amount!=null?t.amount:0)} ${t.sym}</div></div>
      <div class="rt"><div class="val">${curSym()}${fmt(val)}</div>
      <div class="delta ${dir}">${dv>=0?"+":"-"}${curSym()}${fmt(Math.abs(dv))}</div></div>`;
    row.addEventListener("click",()=>{
      pulse(row);
      if(window.TokenDetail) window.TokenDetail.open(i);
    });
    list.appendChild(row);
  });
  const a=document.getElementById("swapIcoA");if(a)a.outerHTML=ICONS.SOL;
  const b=document.getElementById("swapIcoB");if(b)b.outerHTML=ICONS.USDC;
}
function renderBalance(){
  let total=Number(DATA.cash)||0, dvTotal=0;
  DATA.tokens.forEach(t=>{const v=tokenValue(t);total+=v;dvTotal+=v*(tokenChg(t)/100);});
  document.getElementById("cashVal").textContent=fmt(Number(DATA.cash)||0);
  document.getElementById("balance").textContent=fmt(total);
  const prev=total-dvTotal, pct=prev?(dvTotal/prev)*100:0, up=dvTotal>=0;
  const abs=document.getElementById("changeAbs");
  abs.innerHTML=`${up?"+":"-"}<span class="cur">${curSym()}</span>${fmt(Math.abs(dvTotal))}`;
  abs.className="abs "+(up?"up":"down");
  const pctEl=document.getElementById("changePct");
  pctEl.textContent=`${up?"+":"-"}${Math.abs(pct).toFixed(2)}%`;
  pctEl.className="pct "+(up?"up":"down");
  fitBalance();
}
function fitBalance(){
  const el=document.querySelector(".balance");if(!el)return;
  el.style.fontSize="";let size=62;
  while(el.scrollWidth>el.clientWidth&&size>18){size-=2;el.style.fontSize=size+"px";}
}
function renderPerps(){
  const el=document.getElementById("perpList");el.innerHTML="";
  DATA.perps.forEach(p=>{const c=document.createElement("div");c.className="perp";
    c.innerHTML=`${PERP_ICON[p.sym]||`<span class="pico" style="background:#333">${p.sym}</span>`}
      <div class="psym"><span>${p.sym}</span><span class="lev">${p.lev}</span></div>
      <div class="pchg ${p.dir}">${p.chg}</div>`;el.appendChild(c);});
}
function renderPredictions(){
  const el=document.getElementById("predList");el.innerHTML="";
  DATA.predictions.forEach(p=>{const c=document.createElement("div");c.className="pred";
    c.innerHTML=`${PRED_TILE[p.ic]||`<span class="ptile" style="background:#333"></span>`}
      <div class="pt">${p.title}</div><div class="pw">${p.when}</div>`;el.appendChild(c);});
}
function renderMarkets(){
  const el=document.getElementById("marketList");el.innerHTML="";
  DATA.markets.forEach((m,i)=>{const c=document.createElement("div");c.className="market";c.style.animationDelay=(i*65)+"ms";
    c.innerHTML=`<div class="q">${m.q}</div><div class="vol">${m.vol}</div>
      <div class="odds"><button class="yes">Yes ${m.yes}&#162;</button><button class="no">No ${m.no}&#162;</button></div>`;el.appendChild(c);});
}
function renderTrending(){
  const el=document.getElementById("trendList");el.innerHTML="";
  DATA.trending.forEach((t,i)=>{const r=document.createElement("div");r.className="trend";r.style.animationDelay=(i*55)+"ms";
    r.innerHTML=`<span class="rank">${i+1}</span>${iconFor(t.sym)}
      <div class="mid"><div class="tn">${t.name}</div><div class="ts">${t.sub}</div></div>
      <div class="rt"><div class="tp">${t.price}</div><div class="tc ${t.dir}">${t.chg}</div></div>`;el.appendChild(r);});
}
function pulse(el){el.animate([{transform:"scale(1)"},{transform:"scale(1.03)"},{transform:"scale(1)"}],{duration:220,easing:"ease"});}

/* ---- apply DATA to DOM ---- */
function applyIdentity(){
  document.querySelectorAll(".js-emoji").forEach(e=>e.textContent=DATA.emoji||"👻");
  document.querySelectorAll(".js-username").forEach(e=>e.textContent="@"+(DATA.username||"sample"));
  document.querySelectorAll(".js-name").forEach(e=>e.textContent=DATA.name||"Main");
  document.querySelectorAll(".js-bio").forEach(e=>e.textContent=DATA.bio||"");
}
function applyCurrency(){document.querySelectorAll(".js-cur").forEach(e=>e.textContent=curSym());}
function applyVisibility(){document.getElementById("phone").classList.toggle("balances-hidden",!DATA.balanceVisible);}
function refreshUI(){applyIdentity();applyCurrency();applyVisibility();renderTokens();renderBalance();}

/* ---- live prices ---- */
async function fetchPrices(){
  const cur=DATA.currency.toLowerCase();
  const ids=[...new Set(DATA.tokens.filter(t=>t.cgId).map(t=>t.cgId))];
  if(!ids.length) ids.push("bitcoin");
  const url=`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(ids.join(","))}&vs_currencies=usd,${cur}&include_24hr_change=true`;
  const headers=DATA.cgKey?{"x-cg-demo-api-key":DATA.cgKey}:{};
  const r=await fetch(url,{headers});
  if(!r.ok) throw new Error("prices "+r.status);
  const data=await r.json();
  FIAT=1;
  for(const id in data){if(data[id][cur]!=null&&data[id].usd){FIAT=data[id][cur]/data[id].usd;break;}}
  if(cur==="usd")FIAT=1;
  const next={};
  for(const id in data){
    const price=(data[id][cur]!=null)?data[id][cur]:((data[id].usd!=null)?data[id].usd*FIAT:0);
    const chg=(data[id][cur+"_24h_change"]!=null)?data[id][cur+"_24h_change"]:(data[id].usd_24h_change||0);
    next[id]={price,chg};
  }
  PRICES=next;cachePrices();
  renderTokens();renderBalance();
}
function safeFetchPrices(){return fetchPrices().catch(e=>{/* keep last known prices */});}

/* ---- drawer + sheets + veils ---- */
const phone=document.getElementById("phone");
function openDrawer(){phone.classList.add("drawer-open");}
function closeDrawer(){phone.classList.remove("drawer-open");}
document.getElementById("openDrawer").addEventListener("click",openDrawer);
document.getElementById("scrim").addEventListener("click",closeDrawer);
const sheets={profile:document.getElementById("profileSheet"),manage:document.getElementById("manageSheet")};
const veils={settings:document.getElementById("settingsVeil"),emoji:document.getElementById("emojiVeil")};
function openSheet(n){applyIdentity();sheets[n].classList.add("open");}
function closeSheet(n){sheets[n].classList.remove("open");}
function openVeil(n){veils[n].classList.add("open");}
function closeVeil(n){veils[n].classList.remove("open");}
document.querySelectorAll("[data-nav]").forEach(b=>b.addEventListener("click",()=>{
  const n=b.getAttribute("data-nav");
  if(n==="profile"){closeDrawer();openSheet("profile");}else if(n==="manage"){openSheet("manage");}
}));
document.querySelectorAll("[data-close]").forEach(b=>b.addEventListener("click",()=>{
  const c=b.getAttribute("data-close");
  if(c==="profile"||c==="manage")closeSheet(c);else closeVeil(c);
}));

/* ---- Settings (draft; applied on Save) ---- */
let draft=null;
function openSettings(){
  draft=structuredClone(DATA);
  document.getElementById("emojiChip").textContent=draft.emoji;
  document.getElementById("setUsername").value=draft.username||"";
  document.getElementById("setName").value=draft.name||"";
  document.getElementById("setCurrency").value=draft.currency||"USD";
  document.getElementById("setCash").value=draft.cash||"";
  document.getElementById("setVisible").checked=!!draft.balanceVisible;
  document.getElementById("setKey").value=draft.cgKey||"";
  document.getElementById("addSol").value="";document.getElementById("addEth").value="";
  renderTokenSettings();
  openVeil("settings");
}
document.getElementById("openSettings").addEventListener("click",()=>{closeDrawer();openSettings();});
document.querySelectorAll('[data-open="settings"]').forEach(el=>el.addEventListener("click",()=>{closeSheet("manage");openSettings();}));

document.getElementById("setUsername").addEventListener("input",function(){draft.username=this.value.replace(/^@+/,"");});
document.getElementById("setName").addEventListener("input",function(){draft.name=this.value;});
document.getElementById("setCurrency").addEventListener("change",function(){draft.currency=this.value;renderTokenSettings();});
document.getElementById("setCash").addEventListener("input",function(){draft.cash=this.value;});
document.getElementById("setVisible").addEventListener("change",function(){draft.balanceVisible=this.checked;});
document.getElementById("setKey").addEventListener("input",function(){draft.cgKey=this.value.trim();});

document.getElementById("setReset").addEventListener("click",()=>{
  if(confirm("Reset the whole wallet to its default values?")){
    localStorage.removeItem(STORE_KEY);localStorage.removeItem(PRICE_KEY);
    DATA=structuredClone(DEFAULT_DATA);PRICES={};FIAT=1;
    refreshUI();safeFetchPrices();openSettings();
  }
});
document.getElementById("setSave").addEventListener("click",()=>{
  /* Preserve live autoProgress values so opening Settings mid-cycle
     and saving doesn't reset a partially-elapsed counter. */
  const next=structuredClone(draft);
  next.tokens.forEach((nt,i)=>{
    const cur=DATA.tokens[i];
    if(cur && (cur.cgId===nt.cgId || cur.sym===nt.sym)){
      nt.autoProgress = cur.autoProgress || 0;
    }else{
      nt.autoProgress = 0;
    }
  });
  DATA=next;save();
  refreshUI();safeFetchPrices();closeVeil("settings");
});

function renderTokenSettings(){
  const el=document.getElementById("setTokens");el.innerHTML="";
  draft.tokens.forEach((t,i)=>{
    /* Ensure auto-balance fields exist on older wallets. */
    if(t.autoAmount==null) t.autoAmount="0";
    if(t.autoEvery==null)  t.autoEvery=1;
    if(t.autoProgress==null) t.autoProgress=0;
    const d=document.createElement("div");d.className="s-tok";
    d.innerHTML=`<div class="s-tok-head">${tokenIcon(t)}<span>${t.name} (${t.sym})</span><button class="s-tok-x" data-rm="${i}" type="button" aria-label="Remove">&#10005;</button></div>
      <label class="s-tok-amt">Amount<input class="s-in" data-tok="${i}" inputmode="decimal" autocomplete="off"></label>
      <div class="s-tok-auto">
        <div class="s-tok-auto-label">Auto Balance on Refresh</div>
        <div class="s-tok-auto-row"><span class="k">${t.sym} +</span><input data-auto-amt="${i}" inputmode="decimal" autocomplete="off"></div>
        <div class="s-tok-auto-row"><span class="k">Every</span><input data-auto-every="${i}" inputmode="numeric" autocomplete="off"><span class="k-right">refresh(es)</span></div>
        <div class="s-tok-auto-progress">Progress<b>${t.autoProgress||0} / ${Math.max(1,parseInt(t.autoEvery)||1)}</b></div>
        <button class="s-tok-auto-reset" data-auto-reset="${i}" type="button">Reset Counter &amp; Clear</button>
      </div>`;
    el.appendChild(d);
  });
  el.querySelectorAll("input[data-tok]").forEach(inp=>{
    const i=+inp.dataset.tok;inp.value=(draft.tokens[i].amount!=null)?draft.tokens[i].amount:"";
    inp.addEventListener("input",()=>{draft.tokens[i].amount=inp.value;});
  });
  el.querySelectorAll("input[data-auto-amt]").forEach(inp=>{
    const i=+inp.dataset.autoAmt;inp.value=draft.tokens[i].autoAmount||"0";
    inp.addEventListener("input",()=>{draft.tokens[i].autoAmount=inp.value;});
  });
  el.querySelectorAll("input[data-auto-every]").forEach(inp=>{
    const i=+inp.dataset.autoEvery;inp.value=draft.tokens[i].autoEvery||1;
    inp.addEventListener("input",()=>{
      const v=Math.max(1, parseInt(inp.value)||1);
      draft.tokens[i].autoEvery=v;
      /* Live-update the Progress "X / Y" label without a full re-render. */
      const wrap=inp.closest(".s-tok").querySelector(".s-tok-auto-progress b");
      if(wrap) wrap.textContent = (draft.tokens[i].autoProgress||0)+" / "+v;
    });
  });
  el.querySelectorAll("[data-auto-reset]").forEach(b=>b.addEventListener("click",()=>{
    const i=+b.dataset.autoReset;
    draft.tokens[i].autoProgress=0;
    draft.tokens[i].autoAmount="0";
    /* Also apply immediately to live DATA so the reset takes effect
       without waiting for Save. */
    if(DATA.tokens[i]){
      DATA.tokens[i].autoProgress=0;
      DATA.tokens[i].autoAmount="0";
      save();
    }
    renderTokenSettings();
  }));
  el.querySelectorAll("[data-rm]").forEach(b=>b.addEventListener("click",()=>{draft.tokens.splice(+b.dataset.rm,1);renderTokenSettings();}));
}

/* ---- add custom token by contract address ---- */
async function addToken(platform,btn){
  const inp=document.getElementById(platform==="solana"?"addSol":"addEth");
  const addr=inp.value.trim();if(!addr)return;
  btn.disabled=true;const label=btn.textContent;btn.textContent="…";
  try{
    const headers=draft.cgKey?{"x-cg-demo-api-key":draft.cgKey}:{};
    const r=await fetch(`https://api.coingecko.com/api/v3/coins/${platform}/contract/${encodeURIComponent(addr)}?localization=false&tickers=false&market_data=false&community_data=false&developer_data=false&sparkline=false`,{headers});
    if(!r.ok) throw new Error("not found");
    const d=await r.json();
    if(!d.id) throw new Error("not found");
    if(draft.tokens.some(t=>t.cgId===d.id)){alert(d.name+" is already in your list.");return;}
    draft.tokens.push({sym:(d.symbol||"?").toUpperCase(),name:d.name||"Token",cgId:d.id,amount:"0",v:false,custom:true,img:(d.image&&(d.image.small||d.image.thumb))||""});
    inp.value="";renderTokenSettings();
  }catch(e){alert("Couldn't find a token at that contract address on "+(platform==="solana"?"Solana":"Ethereum")+".");}
  finally{btn.disabled=false;btn.textContent=label;}
}
document.querySelectorAll("[data-add]").forEach(b=>b.addEventListener("click",()=>addToken(b.getAttribute("data-add"),b)));

/* ---- emoji picker ---- */
const PRESETS=["👻","🐼","🚀","💎","🔥","😎","👽","🤑","🌙","⚡","🦊","🐸","🐵","🤖","🎃","🌈","😀","🥳"];
(function(){const g=document.getElementById("emojiGrid");PRESETS.forEach(e=>{const b=document.createElement("button");b.type="button";b.textContent=e;b.addEventListener("click",()=>{setEmoji(e);closeVeil("emoji");});g.appendChild(b);});})();
function firstEmoji(str){str=(str||"").trim();if(!str)return "";try{if(typeof Intl!=="undefined"&&Intl.Segmenter){const seg=new Intl.Segmenter();for(const s of seg.segment(str))return s.segment;}}catch(e){}return Array.from(str)[0]||str;}
let emojiTarget="live";
function setEmoji(e){const v=firstEmoji(e);if(!v)return;
  if(emojiTarget==="draft"){draft.emoji=v;document.getElementById("emojiChip").textContent=v;}
  else{DATA.emoji=v;applyIdentity();save();}
}
const emojiInput=document.getElementById("emojiInput");
emojiInput.addEventListener("input",()=>{if(firstEmoji(emojiInput.value))setEmoji(emojiInput.value);});
function openEmoji(target){emojiTarget=target;emojiInput.value="";openVeil("emoji");setTimeout(()=>emojiInput.focus(),200);}
document.getElementById("editEmoji").addEventListener("click",()=>openEmoji("live"));
document.getElementById("emojiChip").addEventListener("click",()=>openEmoji("draft"));

/* ---- tabs ---- */
let currentView="home";
function showView(name){
  currentView=name;
  document.querySelectorAll(".pill").forEach(p=>p.classList.toggle("active",p.dataset.view===name));
  document.querySelectorAll(".view").forEach(v=>v.classList.toggle("active",v.id==="view-"+name));
  document.getElementById("searchbar").classList.toggle("hide",name!=="home");
  document.getElementById("screen").scrollTop=0;
  document.querySelectorAll("#view-"+name+" .token,#view-"+name+" .market,#view-"+name+" .trend").forEach((r,i)=>{
    r.style.animation="none";void r.offsetWidth;r.style.animation="";r.style.animationDelay=(i*55)+"ms";
  });
  if(name==="home")fitBalance();
}
document.querySelectorAll(".pill").forEach(p=>p.addEventListener("click",()=>showView(p.dataset.view)));
document.querySelectorAll(".chip2").forEach(c=>c.addEventListener("click",()=>{document.querySelectorAll(".chip2").forEach(x=>x.classList.remove("on"));c.classList.add("on");}));

/* ---- draggable pill row (avatar stays put, springs back) ---- */
const pillsEl=document.getElementById("pills");
let dx0=0,dxActive=false,dxMoved=0;
pillsEl.addEventListener("pointerdown",e=>{dx0=e.clientX;dxActive=true;dxMoved=0;pillsEl.style.transition="none";try{pillsEl.setPointerCapture(e.pointerId);}catch(_){}});
pillsEl.addEventListener("pointermove",e=>{if(!dxActive)return;dxMoved=e.clientX-dx0;pillsEl.style.transform="translateX("+(dxMoved*0.5)+"px)";});
function pillsRelease(){if(!dxActive)return;dxActive=false;pillsEl.style.transition="transform .7s cubic-bezier(.2,1.35,.35,1)";pillsEl.style.transform="translateX(0)";}
pillsEl.addEventListener("pointerup",pillsRelease);
pillsEl.addEventListener("pointercancel",pillsRelease);
pillsEl.addEventListener("click",e=>{if(Math.abs(dxMoved)>8){e.stopPropagation();e.preventDefault();}dxMoved=0;},true);

/* ---- FAB action menu ---- */
const fabVeil=document.getElementById("fabVeil");
document.getElementById("fab").addEventListener("click",()=>fabVeil.classList.add("open"));
document.getElementById("fabClose").addEventListener("click",()=>fabVeil.classList.remove("open"));
fabVeil.addEventListener("click",e=>{if(e.target===fabVeil)fabVeil.classList.remove("open");});
document.querySelectorAll(".fab-act").forEach(b=>b.addEventListener("click",e=>{
  const action=b.getAttribute("data-action");
  fabVeil.classList.remove("open");
  if(action==="send"&&window.SendFlow){window.SendFlow.open();}
  else if(action==="trade"){showView("trade");}
}));

/* ---- pull to refresh (home) — iOS-style, ~2s minimum hold ----
   Behavior:
   - While the finger is dragging, transition is off so the tray tracks
     1:1. The spinner element itself stays hidden (opacity 0) — no faint
     preview during the pull.
   - On release: transition comes back. If the pull passed threshold,
     doRefresh() adds .spin which reveals the spinner and animates the
     tray to its full height. If not, the tray glides back to 0.
   - When the refresh finishes and the min-hold has elapsed, removing
     .spin animates the tray closed instead of snapping. */
const screenEl=document.getElementById("screen"),ptr=document.getElementById("ptr");
let pStartY=null,pDist=0,pActive=false,refreshing=false;
const MIN_REFRESH_MS=2000;
const PULL_THRESHOLD=60;

screenEl.addEventListener("touchstart",e=>{
  if(currentView==="home"&&screenEl.scrollTop<=0&&!refreshing){
    pStartY=e.touches[0].clientY;pActive=true;pDist=0;
    ptr.style.transition="none";
  }
},{passive:true});
screenEl.addEventListener("touchmove",e=>{
  if(!pActive)return;
  pDist=e.touches[0].clientY-pStartY;
  if(pDist>0){
    const d=Math.min(pDist*0.5,110);
    ptr.style.height=d+"px";
  }
},{passive:true});
screenEl.addEventListener("touchend",()=>{
  if(!pActive)return;pActive=false;
  ptr.style.transition="";                    /* re-enable CSS glide */
  if(pDist>PULL_THRESHOLD){doRefresh();}
  else{ptr.style.height="";}                  /* glides back to 0 */
  pDist=0;
});

/* Desktop convenience: press R (outside inputs) to trigger a refresh. */
window.addEventListener("keydown",e=>{if(e.key==="r"&&currentView==="home"&&!refreshing&&!e.target.matches("input,textarea"))doRefresh();});

/* Auto-balance on refresh:
   For each token with autoAmount > 0, increment its progress counter.
   When progress reaches autoEvery, add autoAmount to the token's
   balance and reset the counter. Persists to storage. */
function applyAutoBalances(){
  let bumped=false;
  DATA.tokens.forEach(t=>{
    const add=parseFloat(t.autoAmount)||0;
    const every=Math.max(1, parseInt(t.autoEvery)||1);
    if(add<=0) return;
    const prog=(parseInt(t.autoProgress)||0)+1;
    if(prog>=every){
      const cur=parseFloat(t.amount)||0;
      const next=cur+add;
      /* Trim trailing zeros without losing precision. */
      t.amount = String(+next.toFixed(10)).replace(/(\.\d*?)0+$/,"$1").replace(/\.$/,"");
      t.autoProgress=0;
      bumped=true;
    }else{
      t.autoProgress=prog;
    }
  });
  if(bumped) save();
  return bumped;
}

function doRefresh(){
  if(refreshing)return;refreshing=true;
  ptr.classList.add("spin");
  const bumped=applyAutoBalances();
  const start=Date.now();
  Promise.resolve(safeFetchPrices()).finally(()=>{
    /* fetchPrices already re-renders on success. If prices failed
       but auto-balance moved the needle, re-render manually so the
       new amount still shows up. */
    if(bumped) refreshUI();
    const elapsed=Date.now()-start;
    const wait=Math.max(0,MIN_REFRESH_MS-elapsed);
    setTimeout(()=>{
      ptr.classList.remove("spin");
      ptr.style.height="";
      refreshing=false;
    },wait);
  });
}
window.PhantomApp={doRefresh,refreshUI,save,tokenPrice,fmt,fmtQty,fmtQtyShort,tokenIcon,iconFor,curSym,showView,get DATA(){return DATA;},get PRICES(){return PRICES;}};

/* ---- init ---- */
function renderStatic(){renderPerps();renderPredictions();renderMarkets();renderTrending();}
renderStatic();loadPriceCache();refreshUI();safeFetchPrices();
window.addEventListener("resize",fitBalance);
