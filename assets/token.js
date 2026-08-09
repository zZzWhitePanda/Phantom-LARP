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
    chartWrap:$("tkChartWrap"), chart:$("tkChart"), empty:$("tkChartEmpty"),
    pills:$("tkPills"),
    posIco:$("tkPosIco"), posSym:$("tkPosSym"), posName:$("tkPosName"),
    posQty:$("tkPosQty"), posVal:$("tkPosVal"), posDelta:$("tkPosDelta"),
    chatHere:$("tkChatHere"),
    cap:$("tkCap"), trade:$("tkTrade"),
  };

  /* CoinGecko timeframe → days argument. All timeframes use the raw
     resolution CoinGecko returns for that window; we don't sub-slice
     LIVE anymore so scrubbing has the same fine granularity as 1D. */
  const TIMEFRAMES = {
    live:{days:1,   fmt:t=>fmtTime(t)},
    "1d":{days:1,   fmt:t=>fmtTime(t)},
    "1w":{days:7,   fmt:t=>fmtDateTime(t)},
    "1m":{days:30,  fmt:t=>fmtDate(t)},
    "1y":{days:365, fmt:t=>fmtDate(t)},
    all:{days:"max",fmt:t=>fmtDate(t)},
  };

  const state={
    tokenIdx:-1,
    token:null,
    tf:"1w",
    series:[],        /* [{t,p}] */
    scrubI:-1,        /* -1 means "not scrubbing" */
    marketCap:null,
  };

  const chartCache=new Map();  /* `${cgId}|${days}` → series */

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
  async function loadChart(){
    const t=state.token;
    if(!t.cgId){
      els.empty.style.display="flex";
      els.chart.style.display="none";
      els.cap.textContent="Market cap unavailable";
      return;
    }
    els.empty.style.display="none";
    els.chart.style.display="";
    const cfg=TIMEFRAMES[state.tf];
    const cacheKey=`${t.cgId}|${cfg.days}`;
    if(chartCache.has(cacheKey)){
      state.series = sliceForTF(chartCache.get(cacheKey));
      drawChart();
    }else{
      /* Show existing while fetching (chart may look empty on first open). */
      drawChart();
    }
    try{
      const cur=(App.DATA.currency||"USD").toLowerCase();
      const url=`https://api.coingecko.com/api/v3/coins/${encodeURIComponent(t.cgId)}/market_chart?vs_currency=${cur}&days=${cfg.days}`;
      const headers=App.DATA.cgKey?{"x-cg-demo-api-key":App.DATA.cgKey}:{};
      const r=await fetch(url,{headers});
      if(!r.ok) throw new Error("chart "+r.status);
      const d=await r.json();
      const series=(d.prices||[]).map(p=>({t:p[0],p:p[1]}));
      chartCache.set(cacheKey,series);
      state.series = sliceForTF(series);
      drawChart();
    }catch(e){
      if(!state.series.length){
        els.empty.style.display="flex";
        els.chart.style.display="none";
      }
    }
    /* Market cap in a separate call (small, cached). */
    loadMarketCap(t.cgId);
  }
  function sliceForTF(series){return series;}
  async function loadMarketCap(id){
    try{
      const cur=(App.DATA.currency||"USD").toLowerCase();
      const url=`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=${cur}&include_market_cap=true`;
      const headers=App.DATA.cgKey?{"x-cg-demo-api-key":App.DATA.cgKey}:{};
      const r=await fetch(url,{headers});
      if(!r.ok) throw 0;
      const d=await r.json();
      const cap=d[id] && d[id][cur+"_market_cap"];
      if(cap){
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
  function drawChart(){
    const svg=els.chart;
    const {pts,min,max,open}=project(state.series);
    if(!pts.length){svg.innerHTML="";return;}
    /* The chart line stays green everywhere — direction only affects
       the header's change label. */
    const curI = state.scrubI>=0 ? state.scrubI : pts.length-1;
    const dot = pts[curI];
    const openY = PAD_Y + (1-(open-min)/(max-min))*(VB_H-PAD_Y*2);
    const past = pts.slice(0, curI+1);
    const future = pts.slice(curI);
    let scrubLine="";
    if(state.scrubI>=0){
      scrubLine=`<line class="tk-chart-scrub" x1="${dot.x.toFixed(2)}" y1="${PAD_Y}" x2="${dot.x.toFixed(2)}" y2="${VB_H-PAD_Y}"/>`;
    }
    svg.innerHTML =
      `<line class="tk-chart-open" x1="${PAD_X}" y1="${openY.toFixed(2)}" x2="${VB_W-PAD_X}" y2="${openY.toFixed(2)}"/>`+
      `<path class="tk-chart-line future" d="${smoothPath(future)}"/>`+
      `<path class="tk-chart-line past" d="${smoothPath(past)}"/>`+
      scrubLine+
      `<circle class="tk-chart-dot" cx="${dot.x.toFixed(2)}" cy="${dot.y.toFixed(2)}" r="5"/>`;

    /* Header: current or scrubbed price against the period open. */
    const pct = open>0 ? ((dot.p-open)/open)*100 : 0;
    updatePriceHeader(dot.p, pct);

    /* Floating scrub label above the vertical line. Only visible while
       scrubbing. Position uses the SVG's proportional x → wrap pixels. */
    if(state.scrubI>=0){
      const wrapW = els.chartWrap.clientWidth;
      const px = (dot.x/VB_W)*wrapW;
      const cfg=TIMEFRAMES[state.tf]||TIMEFRAMES["1w"];
      els.scrubLabel.textContent = cfg.fmt(new Date(dot.t));
      els.scrubLabel.classList.add("on");
      /* Clamp so the label stays fully inside the wrap. */
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
    const n=state.series.length;
    if(!n) return;
    state.scrubI = Math.round(frac*(n-1));
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
    state.scrubI=-1;
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
