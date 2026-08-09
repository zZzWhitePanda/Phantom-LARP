/* ============================================================
   TOKEN DETAIL SHEET
   - Opens over the app when a token on the home screen is tapped.
   - Header shows icon, name, current price, and 24h/period change.
   - SVG price chart pulled from CoinGecko's /market_chart endpoint,
     rendered as two paths: past (green/red) and future (grey), split
     at the scrub position.
   - Pointer/touch scrub: hold and drag the chart to see the price
     at that timestamp; the header price and change update to reflect
     that point. Release to return to live.
   - Dashed horizontal line marks the opening price of the current
     period. When the current/scrubbed price is below that line the
     header + line color flip to red.
   - Positions row reflects the user's wallet holding for this token.
   - Trade button jumps to the Swap view.
   ============================================================ */
(function(){
  const App=window.PhantomApp;
  if(!App){console.warn("TokenDetail: PhantomApp missing");return;}

  const sheet=document.getElementById("tokenSheet");
  const $=id=>document.getElementById(id);

  const els={
    icon:$("tkIcon"), name:$("tkName"), price:$("tkPrice"),
    change:$("tkChange"), scrubLabel:$("tkScrubLabel"),
    chartWrap:$("tkChartWrap"), chart:$("tkChart"),
    empty:$("tkChartEmpty"), loading:$("tkChartLoading"),
    pills:$("tkPills"),
    posIco:$("tkPosIco"), posSym:$("tkPosSym"), posName:$("tkPosName"),
    posQty:$("tkPosQty"), posVal:$("tkPosVal"), posDelta:$("tkPosDelta"),
    chatHere:$("tkChatHere"),
    cap:$("tkCap"), trade:$("tkTrade"),
  };

  /* CoinGecko timeframe → days argument.
     `interval` is how granular the displayed price/timestamp is while
     scrubbing: the dot follows your finger smoothly, but the price
     shown at the top only advances when you cross an interval bucket
     boundary. This matches how the real app "sticks" between updates. */
  const MIN=60*1000, HR=60*MIN, DAY=24*HR;
  const TIMEFRAMES = {
    live:{days:1,   interval:1*MIN,   fmt:t=>fmtTime(t)},
    "1d":{days:1,   interval:15*MIN,  fmt:t=>fmtTime(t)},
    "1w":{days:7,   interval:4*HR,    fmt:t=>fmtDateTime(t)},
    "1m":{days:30,  interval:1*DAY,   fmt:t=>fmtDate(t)},
    "1y":{days:365, interval:7*DAY,   fmt:t=>fmtDate(t)},
    all:{days:"max",interval:28*DAY,  fmt:t=>fmtDate(t)},
  };

  const state={
    tokenIdx:-1,
    token:null,
    tf:"1w",
    series:[],          /* [{t,p}] */
    scrubFrac:-1,       /* -1 = not scrubbing, else 0..1 across the chart */
    marketCap:null,
  };

  /* ---------- cache + rate-limit guard ----------
     CoinGecko's public free tier throttles hard (~10-30 req/min).
     - In-memory chart cache survives timeframe switches within a
       session; localStorage cache with a 20-minute TTL survives page
       reloads so LO doesn't have to re-fetch everything after F5.
     - inflight dedupes concurrent requests for the same URL so
       spamming the same pill doesn't stack requests.
     - cooldownUntil holds a wall-clock time after which we're
       allowed to hit the network again after a 429. Chart requests
       are skipped entirely while a cooldown is active. */
  const chartCache=new Map();
  const inflight=new Map();
  let cooldownUntil=0;
  const CHART_TTL_MS=20*60*1000;
  const CHART_LS_PREFIX="phantom-chart-";

  function loadLocal(key){
    try{
      const raw=localStorage.getItem(CHART_LS_PREFIX+key);
      if(!raw) return null;
      const {ts,data}=JSON.parse(raw);
      if(Date.now()-ts>CHART_TTL_MS) return null;
      return data;
    }catch(e){return null;}
  }
  function saveLocal(key,data){
    try{localStorage.setItem(CHART_LS_PREFIX+key,JSON.stringify({ts:Date.now(),data}));}catch(e){}
  }

  /* ---------- open / close ---------- */
  function open(idx){
    state.tokenIdx=idx;
    state.token=App.DATA.tokens[idx];
    if(!state.token) return;
    state.tf="1w";
    highlightPill();
    fillHeader();
    fillPositions();
    els.scrubLabel.classList.remove("on");
    state.scrubFrac=-1;
    sheet.classList.add("open");
    loadChart();
  }
  function close(){sheet.classList.remove("open");}
  window.TokenDetail={open,close};

  sheet.addEventListener("click",e=>{
    if(e.target.closest("[data-tk-close]")) close();
  });
  els.trade.addEventListener("click",()=>{
    close();
    if(App.showView) App.showView("trade");
  });

  /* ---------- header + positions ---------- */
  function fillHeader(){
    const t=state.token;
    els.icon.innerHTML = App.tokenIcon(t);
    els.name.textContent = t.name || t.sym;
    /* Live price + 24h change from PhantomApp's price cache. */
    const price = App.tokenPrice(t);
    const chg   = App.PRICES && t.cgId && App.PRICES[t.cgId] ? App.PRICES[t.cgId].chg : 0;
    updatePriceHeader(price, chg);
  }
  function updatePriceHeader(price, chgPct){
    /* Price stays white regardless of direction; only the change line
       flips red/green. Timestamp label is handled separately as a
       floating tag above the scrub line. */
    els.price.textContent = `${App.curSym()}${App.fmt(price)}`;
    const up = chgPct>=0;
    const absChange = Math.abs(price*(chgPct/100));
    els.change.textContent = `${up?"+":"-"}${App.curSym()}${App.fmt(absChange)} (${up?"+":"-"}${Math.abs(chgPct).toFixed(2)}%)`;
    els.change.className = "tk-change "+(up?"up":"down");
  }
  function fillPositions(){
    const t=state.token;
    const price=App.tokenPrice(t);
    const chg=App.PRICES && t.cgId && App.PRICES[t.cgId] ? App.PRICES[t.cgId].chg : 0;
    const val=(Number(t.amount)||0)*price;
    const dv=val*(chg/100);
    els.posIco.outerHTML = App.tokenIcon(t).replace(/<span/, '<span id="tkPosIco"');
    els.posSym.textContent = t.sym;
    els.posName.textContent = t.name || "";
    els.posQty.textContent = `${(t.amount!=null?t.amount:0)} ${t.sym}`;
    els.posVal.textContent = `${App.curSym()}${App.fmt(val)}`;
    els.posDelta.textContent = `${dv>=0?"+":"-"}${App.curSym()}${App.fmt(Math.abs(dv))}`;
    els.posDelta.className = "delta "+(dv>=0?"up":"down");
    /* Random 'here' count per open so it feels alive. */
    els.chatHere.textContent = (2+Math.floor(Math.random()*15))+" here";
  }

  /* ---------- chart data ---------- */
  /* Bump a request id every time a fetch kicks off so late responses
     from a previous timeframe can't overwrite the current one. */
  let fetchId=0;

  async function fetchOnce(cgId, days){
    const key=cgId+"|"+days;
    if(inflight.has(key)) return inflight.get(key);
    if(Date.now()<cooldownUntil){
      const wait=Math.ceil((cooldownUntil-Date.now())/1000);
      const err=new Error("cooldown"); err.cooldown=wait; throw err;
    }
    const cur=(App.DATA.currency||"USD").toLowerCase();
    const url=`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(cgId)}/market_chart?vs_currency=${cur}&days=${days}`;
    const headers=App.DATA.cgKey?{"x-cg-demo-api-key":App.DATA.cgKey}:{};
    const p=(async()=>{
      const r=await fetch(url,{headers});
      if(r.status===429){
        cooldownUntil=Date.now()+60*1000;    /* park for a minute */
        const err=new Error("rate-limited"); err.cooldown=60; throw err;
      }
      if(!r.ok) throw new Error("HTTP "+r.status);
      const d=await r.json();
      return (d.prices||[]).map(x=>({t:x[0],p:x[1]}));
    })();
    inflight.set(key,p);
    p.finally(()=>setTimeout(()=>inflight.delete(key),200));
    return p;
  }

  async function loadChart(){
    const t=state.token;
    const myId=++fetchId;
    if(!t.cgId){
      state.series=[];
      els.empty.textContent="Chart data unavailable for this token.";
      els.empty.style.display="flex";
      els.chart.style.display="none";
      els.loading.style.display="none";
      els.cap.textContent="Market cap unavailable";
      drawChart();
      return;
    }
    els.empty.style.display="none";
    els.chart.style.display="";
    const cfg=TIMEFRAMES[state.tf];
    const cacheKey=`${t.cgId}|${cfg.days}`;

    /* Warm from the in-memory cache first, then the persisted cache. */
    let cached = chartCache.get(cacheKey) || loadLocal(cacheKey);
    if(cached){
      chartCache.set(cacheKey,cached);
      state.series = cached;
      els.loading.style.display="none";
      drawChart();
    }else{
      state.series=[];
      drawChart();
      els.loading.style.display="flex";
    }

    /* Single attempt — no fallback ladder. Aggressive retries were
       burning through the rate limit and leaving every tab broken. */
    try{
      const series = await fetchOnce(t.cgId, cfg.days);
      if(myId!==fetchId) return;
      if(series && series.length){
        chartCache.set(cacheKey,series);
        saveLocal(cacheKey,series);
        state.series = series;
      }
      els.loading.style.display="none";
      drawChart();
    }catch(e){
      if(myId!==fetchId) return;
      els.loading.style.display="none";
      /* Only surface an error if we don't already have SOMETHING to
         show. If cache warmed us up, keep displaying it silently. */
      if(!state.series.length){
        if(e && e.cooldown){
          els.empty.textContent=`Rate limit hit — retry in ~${e.cooldown}s.`;
        }else{
          els.empty.textContent="Couldn't load chart data — try again in a moment.";
        }
        els.empty.style.display="flex";
        els.chart.style.display="none";
      }
    }
    loadMarketCap(t.cgId);
  }
  function sliceForTF(series){return series;}
  const capCache=new Map();
  async function loadMarketCap(id){
    if(Date.now()<cooldownUntil) return;      /* don't stack requests when cooling */
    const cached=capCache.get(id);
    if(cached && Date.now()-cached.ts < 5*60*1000){
      els.cap.textContent = `${App.curSym()}${fmtCap(cached.cap)} market cap`;
      return;
    }
    try{
      const cur=(App.DATA.currency||"USD").toLowerCase();
      const url=`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=${cur}&include_market_cap=true`;
      const headers=App.DATA.cgKey?{"x-cg-demo-api-key":App.DATA.cgKey}:{};
      const r=await fetch(url,{headers});
      if(r.status===429){cooldownUntil=Date.now()+60*1000;return;}
      if(!r.ok) return;
      const d=await r.json();
      const cap=d[id] && d[id][cur+"_market_cap"];
      if(cap){
        capCache.set(id,{cap,ts:Date.now()});
        els.cap.textContent = `${App.curSym()}${fmtCap(cap)} market cap`;
      }
    }catch(e){}
  }
  function fmtCap(n){
    if(n>=1e12) return (n/1e12).toFixed(2).replace(/\.?0+$/,"")+"T";
    if(n>=1e9)  return (n/1e9 ).toFixed(1).replace(/\.?0+$/,"")+"B";
    if(n>=1e6)  return (n/1e6 ).toFixed(1).replace(/\.?0+$/,"")+"M";
    if(n>=1e3)  return (n/1e3 ).toFixed(1).replace(/\.?0+$/,"")+"K";
    return String(Math.round(n));
  }

  /* ---------- chart drawing ---------- */
  const VB_W=400, VB_H=260, PAD_X=6, PAD_Y=16;
  function project(series){
    if(!series.length) return {pts:[],min:0,max:0,open:0};
    let min=Infinity,max=-Infinity;
    series.forEach(p=>{if(p.p<min)min=p.p;if(p.p>max)max=p.p;});
    if(min===max){min-=1;max+=1;}
    const open=series[0].p;
    const n=series.length;
    const pts=series.map((p,i)=>{
      const x=PAD_X + (n<=1?0:(i/(n-1))*(VB_W-PAD_X*2));
      const y=PAD_Y + (1-(p.p-min)/(max-min))*(VB_H-PAD_Y*2);
      return {x,y,p:p.p,t:p.t};
    });
    return {pts,min,max,open};
  }
  /* Smooth path via Catmull-Rom to Bezier conversion. Tension keeps
     it close to the data (0 = straight lines, 1 = very loose). */
  function smoothPath(pts, tension){
    if(!pts.length) return "";
    if(pts.length===1) return `M${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    const t = tension==null?0.5:tension;
    let d=`M${pts[0].x.toFixed(2)} ${pts[0].y.toFixed(2)}`;
    for(let i=0;i<pts.length-1;i++){
      const p0=pts[i-1]||pts[i];
      const p1=pts[i];
      const p2=pts[i+1];
      const p3=pts[i+2]||pts[i+1];
      const cp1x=p1.x + (p2.x - p0.x) * t / 6;
      const cp1y=p1.y + (p2.y - p0.y) * t / 6;
      const cp2x=p2.x - (p3.x - p1.x) * t / 6;
      const cp2y=p2.y - (p3.y - p1.y) * t / 6;
      d+=`C${cp1x.toFixed(2)} ${cp1y.toFixed(2)},${cp2x.toFixed(2)} ${cp2y.toFixed(2)},${p2.x.toFixed(2)} ${p2.y.toFixed(2)}`;
    }
    return d;
  }
  /* Linear interpolation between two projected points at fraction fr. */
  function lerpPt(a,b,fr){
    return {
      x:a.x+(b.x-a.x)*fr,
      y:a.y+(b.y-a.y)*fr,
      t:a.t+(b.t-a.t)*fr,
      p:a.p+(b.p-a.p)*fr,
    };
  }
  /* Interpolate a price value from the raw series at time T (ms). */
  function priceAtTime(t){
    const s=state.series;
    if(!s.length) return 0;
    if(t<=s[0].t) return s[0].p;
    if(t>=s[s.length-1].t) return s[s.length-1].p;
    /* Binary search for the neighbours. */
    let lo=0, hi=s.length-1;
    while(hi-lo>1){
      const m=(lo+hi)>>1;
      if(s[m].t<=t) lo=m; else hi=m;
    }
    const a=s[lo], b=s[hi];
    const fr = (t-a.t)/(b.t-a.t);
    return a.p+(b.p-a.p)*fr;
  }

  function drawChart(){
    const svg=els.chart;
    const {pts,min,max,open}=project(state.series);
    if(!pts.length){svg.innerHTML="";return;}
    const openY = PAD_Y + (1-(open-min)/(max-min))*(VB_H-PAD_Y*2);

    let dot, past, future, scrubbing = state.scrubFrac>=0;

    if(!scrubbing){
      /* Not scrubbing: dot sits at the latest point. */
      dot = pts[pts.length-1];
      past = pts;
      future = [];
    }else{
      /* Scrubbing: dot follows the finger smoothly. We interpolate
         between the two adjacent data points to get a fractional
         position — no snapping means no flicker as it crosses points. */
      const exactI = state.scrubFrac*(pts.length-1);
      const i0 = Math.max(0,Math.floor(exactI));
      const i1 = Math.min(pts.length-1,i0+1);
      const fr = exactI-i0;
      dot = i0===i1 ? pts[i0] : lerpPt(pts[i0],pts[i1],fr);
      past = pts.slice(0,i0+1);
      if(i0!==i1) past.push(dot);
      future = [dot].concat(pts.slice(i1));
    }

    let scrubLine="";
    if(scrubbing){
      /* Scrub line drops from the top of the chart and stops at the
         dot on the green price line — never continues past it. */
      scrubLine=`<line class="tk-chart-scrub" x1="${dot.x.toFixed(2)}" y1="${PAD_Y}" x2="${dot.x.toFixed(2)}" y2="${dot.y.toFixed(2)}"/>`;
    }
    svg.innerHTML =
      `<line class="tk-chart-open" x1="${PAD_X}" y1="${openY.toFixed(2)}" x2="${VB_W-PAD_X}" y2="${openY.toFixed(2)}"/>`+
      (future.length>1?`<path class="tk-chart-line future" d="${smoothPath(future)}"/>`:"")+
      `<path class="tk-chart-line past" d="${smoothPath(past)}"/>`+
      scrubLine+
      `<circle class="tk-chart-dot" cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="5"/>`;

    /* Snap the DISPLAYED price + timestamp to the timeframe's interval
       bucket. The dot itself is drawn at the smooth position above,
       but what the user reads stays put until they cross the next
       interval boundary. */
    const cfg=TIMEFRAMES[state.tf]||TIMEFRAMES["1w"];
    let showP, showT;
    if(!scrubbing){
      showP = dot.p; showT = dot.t;
    }else{
      const snappedT = Math.floor(dot.t/cfg.interval)*cfg.interval;
      showT = snappedT;
      showP = priceAtTime(snappedT);
    }
    const pct = open>0 ? ((showP-open)/open)*100 : 0;
    updatePriceHeader(showP, pct);

    /* Floating scrub label above the vertical line. Its horizontal
       position tracks the dot but is clamped to the chart width. */
    if(scrubbing){
      const wrapW = els.chartWrap.clientWidth;
      const px = (dot.x/VB_W)*wrapW;
      els.scrubLabel.textContent = cfg.fmt(new Date(showT));
      els.scrubLabel.classList.add("on");
      const halfW = els.scrubLabel.offsetWidth/2;
      const left = Math.max(halfW+4, Math.min(wrapW - halfW - 4, px));
      els.scrubLabel.style.left = left + "px";
    }else{
      els.scrubLabel.classList.remove("on");
    }
  }

  /* ---------- scrub interaction ---------- */
  const wrap=els.chartWrap;
  let scrubbing=false;
  function scrubFromEvent(e){
    const rect=wrap.getBoundingClientRect();
    const clientX = (e.touches?e.touches[0].clientX:e.clientX);
    const localX = clientX-rect.left;
    const frac = Math.max(0,Math.min(1, localX/rect.width));
    if(!state.series.length) return;
    state.scrubFrac = frac;
    drawChart();
  }
  wrap.addEventListener("pointerdown",e=>{
    if(!state.series.length) return;
    scrubbing=true;wrap.setPointerCapture(e.pointerId);
    scrubFromEvent(e);
  });
  wrap.addEventListener("pointermove",e=>{if(scrubbing) scrubFromEvent(e);});
  function endScrub(){
    if(!scrubbing) return;
    scrubbing=false;
    state.scrubFrac=-1;
    drawChart();
    els.scrubLabel.classList.remove("on");
  }
  wrap.addEventListener("pointerup",endScrub);
  wrap.addEventListener("pointercancel",endScrub);
  wrap.addEventListener("pointerleave",endScrub);

  /* ---------- timeframe pills ---------- */
  function highlightPill(){
    els.pills.querySelectorAll(".tk-pill").forEach(p=>{
      p.classList.toggle("on", p.dataset.tf===state.tf);
    });
  }
  els.pills.addEventListener("click",e=>{
    const b=e.target.closest(".tk-pill");if(!b) return;
    state.tf = b.dataset.tf;
    highlightPill();
    loadChart();
  });

  /* ---------- date formatters ---------- */
  function fmtTime(d){
    return d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}).toUpperCase().replace(/\s/g,"")+
      ", "+d.toLocaleDateString(undefined,{month:"short",day:"2-digit"});
  }
  function fmtDateTime(d){
    return d.toLocaleTimeString(undefined,{hour:"numeric",minute:"2-digit"}).toUpperCase().replace(/\s/g,"")+
      ", "+d.toLocaleDateString(undefined,{month:"short",day:"2-digit"});
  }
  function fmtDate(d){
    return d.toLocaleDateString(undefined,{month:"short",day:"2-digit",year:"numeric"});
  }
})();
