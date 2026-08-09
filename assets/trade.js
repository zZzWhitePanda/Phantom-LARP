/* ============================================================
   TRADE / SWAP
   - Interactive Swap view (You Pay / You Receive).
   - Shared token picker sheet with chain filters
     (All | Solana | Ethereum | Bitcoin | Robinhood Chain).
   - Default You Receive = Cash Balance.
   - Swaps actually move value: pay side is deducted from the
     wallet, receive side is added (creating the entry if the
     user didn't own that token yet). Cash Balance credits/
     debits DATA.cash directly.
   - Persisted balance changes only show on the home screen
     after the user pulls to refresh — same as the Send flow.
   ============================================================ */
(function(){
  const App = window.PhantomApp;
  if(!App){console.warn("Trade: PhantomApp not ready");return;}

  /* ---------- Token catalog ----------
     Master list of tokens the picker can offer. Anything held by the
     user with a matching (sym,chain) is merged in with its live price
     via cgId. Unknown tokens get a fallback USD price (defaults to 1
     for stables, small nonzero for the rest so swaps still resolve). */
  const CASH_ICON = `<span class="picker-cash-ico">👻</span>`;
  const ICO_BTC   = `<span class="ico" style="background:#f7931a;color:#fff;font-size:20px;font-weight:800;display:flex;align-items:center;justify-content:center;">₿</span>`;
  const ICO_LINK  = `<span class="ico" style="background:#fff;display:flex;align-items:center;justify-content:center;"><svg viewBox="0 0 32 32" width="26" height="26"><polygon points="16,4 26,10 26,22 16,28 6,22 6,10" fill="#2a5ada"/><polygon points="16,9 21.5,12.2 21.5,19.8 16,23 10.5,19.8 10.5,12.2" fill="#fff"/></svg></span>`;
  const ICO_ENA   = `<span class="ico" style="background:#000;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;"><svg viewBox="0 0 32 32" width="22" height="22"><polygon points="16,4 26,10 26,22 16,28 6,22 6,10" fill="none" stroke="#fff" stroke-width="2"/><path d="M12 12h8M12 16h8M12 20h8" stroke="#fff" stroke-width="1.5"/></svg></span>`;
  const ICO_UP    = `<span class="ico" style="background:#111;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;"><svg viewBox="0 0 32 32" width="20" height="20" fill="#fff"><path d="M12 4L20 4L18 12L24 12L10 28L14 18L8 18Z"/></svg></span>`;
  const ICO_USD1  = `<span class="ico" style="background:#e6a821;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:14px;">1</span>`;
  const ICO_WETH  = `<span class="ico" style="background:#fff;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:800;color:#111;">WETH</span>`;
  const ICO_KITE  = `<span class="ico" style="background:#fff;color:#111;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;">KITE</span>`;
  const ICO_USDG  = `<span class="ico" style="background:#8bc34a;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:16px;">G</span>`;
  const ICO_AAVE  = `<span class="ico" style="background:#b6509e;color:#fff;display:flex;align-items:center;justify-content:center;font-weight:800;font-size:11px;">AAVE</span>`;
  const ICO_CASH_TOK = `<span class="ico" style="background:#fff;color:#111;display:flex;align-items:center;justify-content:center;font-weight:800;">$</span>`;

  /* Each catalog entry has: id (unique), name, sym, chain, cgId (for
     price if available), price (USD fallback), tag (optional badge),
     iconHtml (inline SVG span). */
  const CATALOG = [
    /* Solana */
    {id:"sol-sol",   name:"Solana",         sym:"SOL",  chain:"solana",    cgId:"solana",    v:true},
    {id:"sol-cash",  name:"Cash Balance",   sym:"CASH", chain:"solana",    cash:true, v:false, iconHtml:CASH_ICON, hideVerify:true},
    {id:"sol-cashtok",name:"CASH",          sym:"CASH", chain:"solana",    price:1,   v:true, iconHtml:ICO_CASH_TOK},
    {id:"sol-usdc",  name:"USDC",           sym:"USDC", chain:"solana",    cgId:"usd-coin",  v:true},
    {id:"sol-link",  name:"Chainlink Token",sym:"LINK", chain:"solana",    cgId:"chainlink", v:true, iconHtml:ICO_LINK},
    {id:"sol-usdt",  name:"USDT",           sym:"USDT", chain:"solana",    cgId:"tether",    v:true},
    {id:"sol-ena",   name:"Ethena",         sym:"ENA",  chain:"solana",    cgId:"ethena-2",  v:true, iconHtml:ICO_ENA},
    {id:"sol-up",    name:"Unitas",         sym:"UP",   chain:"solana",    price:1,          v:true, iconHtml:ICO_UP},

    /* Ethereum */
    {id:"eth-eth",   name:"Ethereum",       sym:"ETH",  chain:"ethereum",  cgId:"ethereum",  v:true},
    {id:"eth-usdt",  name:"Tether",         sym:"USDT", chain:"ethereum",  cgId:"tether",    v:true},
    {id:"eth-usdc",  name:"USDC",           sym:"USDC", chain:"ethereum",  cgId:"usd-coin",  v:true},
    {id:"eth-usd1",  name:"USD1",           sym:"USD1", chain:"ethereum",  price:1,          v:true, iconHtml:ICO_USD1},
    {id:"eth-weth",  name:"WETH",           sym:"WETH", chain:"ethereum",  cgId:"weth",      v:true, iconHtml:ICO_WETH},
    {id:"eth-kite",  name:"Kite",           sym:"KITE", chain:"ethereum",  price:0.5,        v:true, iconHtml:ICO_KITE},
    {id:"eth-usdg",  name:"Global Dollar",  sym:"USDG", chain:"ethereum",  price:1,          v:true, iconHtml:ICO_USDG},
    {id:"eth-link",  name:"Chainlink",      sym:"LINK", chain:"ethereum",  cgId:"chainlink", v:true, iconHtml:ICO_LINK},
    {id:"eth-aave",  name:"Aave",           sym:"AAVE", chain:"ethereum",  cgId:"aave",      v:true, iconHtml:ICO_AAVE},

    /* Bitcoin */
    {id:"btc-taproot",name:"Bitcoin",       sym:"BTC",  chain:"bitcoin",   cgId:"bitcoin",   v:true, tag:"Taproot", iconHtml:ICO_BTC},
    {id:"btc-segwit", name:"Bitcoin",       sym:"BTC",  chain:"bitcoin",   cgId:"bitcoin",   v:true, tag:"Native Segwit", iconHtml:ICO_BTC},

    /* Robinhood Chain */
    {id:"rh-usdg",   name:"Global Dollar",  sym:"USDG", chain:"robinhood", price:1,          v:true, iconHtml:ICO_USDG},
    {id:"rh-weth",   name:"Robinhood Wrapped WETH", sym:"WETH", chain:"robinhood", cgId:"weth", v:true, iconHtml:ICO_WETH},
  ];
  const CHAINS = [
    {id:"solana",   name:"Solana"},
    {id:"ethereum", name:"Ethereum"},
    {id:"bitcoin",  name:"Bitcoin"},
    {id:"robinhood",name:"Robinhood Chain"},
  ];

  function catalogById(id){return CATALOG.find(c=>c.id===id);}
  function catalogPrice(c){
    if(!c) return 0;
    if(c.cash) return 1;
    if(c.cgId && App.PRICES[c.cgId]!=null) return App.PRICES[c.cgId].price||0;
    if(c.price!=null) return c.price;
    return 0;
  }
  function catalogIcon(c){
    if(!c) return "";
    if(c.iconHtml) return c.iconHtml;
    return App.iconFor(c.sym);
  }

  /* Map a catalog entry to (or add) a wallet token so amounts persist.
     Cash entries live in DATA.cash instead of DATA.tokens. */
  function walletHoldingFor(c){
    if(!c) return null;
    if(c.cash) return {isCash:true, amount:Number(App.DATA.cash)||0};
    /* Match by cgId when available, otherwise by unique sym+chain. */
    const tokens=App.DATA.tokens;
    let idx=-1;
    if(c.cgId) idx=tokens.findIndex(t=>t.cgId===c.cgId);
    if(idx===-1) idx=tokens.findIndex(t=>t.sym===c.sym && (t.chain||"")=== (c.chain==="solana"?"":c.chain||""));
    if(idx===-1) idx=tokens.findIndex(t=>t.sym===c.sym && !t.chain);
    return idx===-1 ? {idx:-1, amount:0} : {idx, amount:Number(tokens[idx].amount)||0, token:tokens[idx]};
  }

  /* Ensure a wallet slot exists for a catalog entry and return its index. */
  function ensureWalletSlot(c){
    if(c.cash) return {isCash:true};
    const held=walletHoldingFor(c);
    if(held.idx!==-1) return {idx:held.idx};
    /* Not held — create it with amount 0 and the catalog's price info. */
    const t={sym:c.sym, name:c.name, amount:"0", v:!!c.v};
    if(c.cgId) t.cgId=c.cgId;
    if(c.price!=null && !c.cgId) t.price=c.price;
    if(c.chain) t.chain=c.chain;
    App.DATA.tokens.push(t);
    return {idx: App.DATA.tokens.length-1};
  }

  /* ---------- Swap state ---------- */
  const state = {
    payId:"sol-sol",           /* start on SOL to pay */
    recvId:"sol-cash",         /* default You Receive = Cash Balance */
    payAmt:"",                 /* string source of truth */
    recvAmt:"",
    lastEdited:"pay",          /* which side the user typed on */
    pickerSide:"pay",
    pickerChain:"all",
  };
  /* If SOL isn't held, drop to the first token the user has. */
  (function pickInitialPay(){
    const sol=catalogById("sol-sol");
    if(walletHoldingFor(sol).amount>0) return;
    const firstHeld=CATALOG.find(c=>{const h=walletHoldingFor(c); return h && h.amount>0 && !c.cash;});
    if(firstHeld) state.payId=firstHeld.id;
  })();

  /* ---------- DOM refs ----------
     Icons are replaced by outerHTML each render so we re-query them
     rather than caching the node. */
  const $ = id => document.getElementById(id);
  const payAmtEl  = $("swapPayAmt");
  const payUsdEl  = $("swapPayUsd");
  const paySymEl  = $("swapPaySym");
  const recvAmtEl = $("swapRecvAmt");
  const recvUsdEl = $("swapRecvUsd");
  const recvSymEl = $("swapRecvSym");
  const rateEl    = $("swapRate");
  const flipEl    = $("swapFlip");
  const reviewEl  = $("swapReview");

  const pickerEl     = $("swapPicker");
  const pickerTitle  = $("pickerTitle");
  const pickerChips  = $("pickerChips");
  const pickerList   = $("pickerList");
  const pickerSearch = $("pickerSearch");

  /* ---------- Rendering ---------- */
  function sanitize(raw){
    let s=(raw||"").replace(/[^0-9.]/g,"");
    const d=s.indexOf(".");
    if(d!==-1) s = s.slice(0,d+1) + s.slice(d+1).replace(/\./g,"");
    if(s.length>1 && s[0]==="0" && s[1]!==".") s=s.replace(/^0+/,"")||"0";
    return s.slice(0,18);
  }

  function renderChips(){
    const showAll = state.pickerSide==="pay";
    const chips=[];
    if(showAll) chips.push({id:"all",name:"All"});
    CHAINS.forEach(c=>chips.push(c));
    pickerChips.innerHTML="";
    chips.forEach(c=>{
      const b=document.createElement("button");
      b.type="button";b.className="picker-chip"+(state.pickerChain===c.id?" on":"");
      b.textContent=c.name;
      b.addEventListener("click",()=>{state.pickerChain=c.id;renderChips();renderPickerList();});
      pickerChips.appendChild(b);
    });
  }

  function renderPickerList(){
    const q=(pickerSearch.value||"").trim().toLowerCase();
    /* Pool of candidates */
    let items = CATALOG.slice();
    /* You Pay: only tokens with a positive balance (Cash included when
       user has cash). Chain filter still applies (with "All" showing all). */
    if(state.pickerSide==="pay"){
      items = items.filter(c=>{
        const h=walletHoldingFor(c);
        return h && h.amount>0;
      });
    }
    /* Chain filter */
    if(state.pickerChain!=="all"){
      items = items.filter(c=>c.chain===state.pickerChain);
    }
    /* You Receive on Solana tab: pin Cash Balance to the very top with
       a divider under it. On other tabs it's hidden. On the Pay side we
       let the balance filter handle it (cash still shows if $>0). */
    let cashItem=null;
    if(state.pickerSide==="receive"){
      const cashIdx=items.findIndex(c=>c.cash);
      if(cashIdx!==-1) cashItem = items.splice(cashIdx,1)[0];
    }
    /* Search filter */
    if(q){
      items = items.filter(c=>(c.name||"").toLowerCase().includes(q)||(c.sym||"").toLowerCase().includes(q));
      if(cashItem && !((cashItem.name||"").toLowerCase().includes(q))) cashItem=null;
    }

    pickerList.innerHTML="";
    if(cashItem){
      pickerList.appendChild(makePickerRow(cashItem));
      const div=document.createElement("div");div.className="picker-cash-divider";
      pickerList.appendChild(div);
    }
    items.forEach(c=>pickerList.appendChild(makePickerRow(c)));
    if(!items.length && !cashItem){
      const empty=document.createElement("div");
      empty.style.cssText="color:#8a8a8e;padding:20px 4px;text-align:center;font-size:14px;";
      empty.textContent=q?`No tokens match "${q}".`:"Nothing here.";
      pickerList.appendChild(empty);
    }
  }
  function verifyBadge(){
    return `<svg class="verify" viewBox="0 0 24 24"><path d="M12 2l2.2 1.5 2.6-.4 1.3 2.3 2.3 1.3-.4 2.6L23 12l-1.5 2.2.4 2.6-2.3 1.3-1.3 2.3-2.6-.4L12 22l-2.2-1.5-2.6.4-1.3-2.3-2.3-1.3.4-2.6L1 12l1.5-2.2-.4-2.6 2.3-1.3 1.3-2.3 2.6.4z" fill="#ab9ff2"/><path d="M8.4 12l2.4 2.3 4.6-4.8" fill="none" stroke="#fff" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
  }
  function makePickerRow(c){
    const row=document.createElement("div");
    row.className="picker-item";
    const held=walletHoldingFor(c);
    const amt = held ? held.amount : 0;
    const qtyText = c.cash
      ? `${App.curSym()}${App.fmt(amt)}`
      : `${App.fmtQtyShort(amt)} ${c.sym}`;
    const tag = c.tag?`<span class="tag">${c.tag}</span>`:"";
    const verify = (c.v && !c.hideVerify)?verifyBadge():"";
    row.innerHTML=`${catalogIcon(c)}
      <div class="mid">
        <div class="name"><span>${c.name}</span>${verify}${tag}</div>
        <div class="qty">${qtyText}</div>
      </div>
      <div class="picker-info">i</div>`;
    row.addEventListener("click",e=>{
      /* i info button is a no-op stub. */
      if(e.target.closest(".picker-info")){e.stopPropagation();return;}
      pickToken(c);
    });
    return row;
  }

  function pickToken(c){
    if(state.pickerSide==="pay") state.payId=c.id;
    else state.recvId=c.id;
    /* If both sides ended up the same, flip the other one to something else. */
    if(state.payId===state.recvId){
      const other = CATALOG.find(x=>x.id!==c.id && x.chain===c.chain) || CATALOG[0];
      if(state.pickerSide==="pay") state.recvId=other.id; else state.payId=other.id;
    }
    closePicker();
    renderSwap();
  }

  function openPicker(side){
    state.pickerSide=side;
    state.pickerChain = side==="pay" ? "all" : "solana";
    pickerTitle.textContent = side==="pay" ? "You Pay" : "You Receive";
    pickerSearch.value="";
    renderChips();
    renderPickerList();
    pickerEl.classList.add("open");
  }
  function closePicker(){pickerEl.classList.remove("open");}
  pickerSearch.addEventListener("input",renderPickerList);
  pickerEl.addEventListener("click",e=>{
    if(e.target.closest("[data-picker-close]")) closePicker();
  });
  document.querySelectorAll('[data-picker]').forEach(btn=>{
    btn.addEventListener("click",()=>openPicker(btn.getAttribute("data-picker")));
  });

  /* ---------- Swap view rendering ---------- */
  function renderSwap(){
    const pay=catalogById(state.payId), recv=catalogById(state.recvId);
    /* Re-query icon anchors each render — outerHTML would detach cached
       references. We swap the span in-place while preserving the id. */
    const payIco=$("swapPayIco"), recvIco=$("swapRecvIco");
    if(payIco)  payIco.outerHTML  = tagWithId(catalogIcon(pay),  "swapPayIco");
    if(recvIco) recvIco.outerHTML = tagWithId(catalogIcon(recv), "swapRecvIco");
    paySymEl.textContent  = pay ? pay.sym  : "";
    recvSymEl.textContent = recv? (recv.cash?"Cash":recv.sym) : "";

    updateAmounts();
    updateRate();
    updateReview();
  }
  function tagWithId(html,id){
    /* Inject the id into the first <span so we can find the icon slot
       again on the next render. */
    return html.replace(/<span/,'<span id="'+id+'"');
  }
  function payPrice(){return catalogPrice(catalogById(state.payId));}
  function recvPrice(){return catalogPrice(catalogById(state.recvId));}

  function recalcFromPay(){
    const pp=payPrice(), rp=recvPrice();
    const p=parseFloat(state.payAmt||"0")||0;
    if(pp<=0||rp<=0){state.recvAmt="";return;}
    const usd=p*pp;
    state.recvAmt = usd>0 ? trim(usd/rp) : "";
  }
  function recalcFromRecv(){
    const pp=payPrice(), rp=recvPrice();
    const r=parseFloat(state.recvAmt||"0")||0;
    if(pp<=0||rp<=0){state.payAmt="";return;}
    const usd=r*rp;
    state.payAmt = usd>0 ? trim(usd/pp) : "";
  }
  function updateAmounts(){
    if(state.lastEdited==="pay") recalcFromPay(); else recalcFromRecv();
    const pay=catalogById(state.payId), recv=catalogById(state.recvId);
    if(document.activeElement!==payAmtEl)  payAmtEl.value  = state.payAmt;
    if(document.activeElement!==recvAmtEl) recvAmtEl.value = state.recvAmt;
    const payUsd  = (parseFloat(state.payAmt)||0)*payPrice();
    const recvUsd = (parseFloat(state.recvAmt)||0)*recvPrice();
    payUsdEl.textContent  = `~ ${App.curSym()}${App.fmt(payUsd)}`;
    recvUsdEl.textContent = `~ ${App.curSym()}${App.fmt(recvUsd)}`;
  }
  function updateRate(){
    const pp=payPrice(), rp=recvPrice();
    const pay=catalogById(state.payId), recv=catalogById(state.recvId);
    if(!pay||!recv||pp<=0||rp<=0){rateEl.textContent="—";return;}
    const rate=pp/rp;
    rateEl.textContent = `1 ${pay.sym} ≈ ${App.fmtQty(rate)} ${recv.cash?"USD":recv.sym}`;
  }
  function updateReview(){
    const pay=catalogById(state.payId);
    const held=walletHoldingFor(pay);
    const p=parseFloat(state.payAmt||"0")||0;
    const ok = p>0 && held && p<=held.amount+1e-12 && state.payId!==state.recvId;
    reviewEl.disabled=!ok;
    reviewEl.style.opacity = ok? "1":".45";
    reviewEl.style.cursor  = ok? "pointer":"not-allowed";
  }
  function trim(n){
    if(!isFinite(n)) return "";
    if(n===0) return "";
    if(n>=1) return n.toFixed(6).replace(/0+$/,"").replace(/\.$/,"");
    let s=n.toFixed(10).replace(/0+$/,"").replace(/\.$/,"");
    return s;
  }

  /* ---------- Input wiring ---------- */
  payAmtEl.addEventListener("input",()=>{
    const c=sanitize(payAmtEl.value);
    if(c!==payAmtEl.value) payAmtEl.value=c;
    state.payAmt=c;state.lastEdited="pay";
    updateAmounts();updateReview();
  });
  recvAmtEl.addEventListener("input",()=>{
    const c=sanitize(recvAmtEl.value);
    if(c!==recvAmtEl.value) recvAmtEl.value=c;
    state.recvAmt=c;state.lastEdited="recv";
    updateAmounts();updateReview();
  });
  flipEl.addEventListener("click",()=>{
    const p=state.payId; state.payId=state.recvId; state.recvId=p;
    /* When flipping, treat the new pay side amount as authoritative. */
    const pa=state.payAmt, ra=state.recvAmt;
    state.payAmt=ra; state.recvAmt=pa;
    state.lastEdited="pay";
    renderSwap();
  });

  /* ---------- Execute swap ---------- */
  reviewEl.addEventListener("click",()=>{
    if(reviewEl.disabled) return;
    const pay=catalogById(state.payId), recv=catalogById(state.recvId);
    const p=parseFloat(state.payAmt||"0")||0;
    const r=parseFloat(state.recvAmt||"0")||0;
    if(p<=0||r<=0) return;

    /* Deduct from Pay */
    if(pay.cash){
      App.DATA.cash = String(Math.max(0,(Number(App.DATA.cash)||0)-p));
    }else{
      const held=walletHoldingFor(pay);
      if(!held || held.idx===undefined || held.idx===-1) return;
      const cur=Number(App.DATA.tokens[held.idx].amount)||0;
      App.DATA.tokens[held.idx].amount = trimFloat(Math.max(0,cur-p));
    }
    /* Credit Receive */
    if(recv.cash){
      App.DATA.cash = String((Number(App.DATA.cash)||0)+r);
    }else{
      const slot=ensureWalletSlot(recv);
      const cur=Number(App.DATA.tokens[slot.idx].amount)||0;
      App.DATA.tokens[slot.idx].amount = trimFloat(cur+r);
    }
    App.save();

    /* Reset the form and give the button a quick confirmation flash. */
    state.payAmt="";state.recvAmt="";
    payAmtEl.value="";recvAmtEl.value="";
    updateAmounts();updateReview();
    const label=reviewEl.textContent;
    reviewEl.textContent="Swapped ✓";
    reviewEl.disabled=true;reviewEl.style.opacity=".8";
    setTimeout(()=>{reviewEl.textContent=label;updateReview();},1400);
  });
  function trimFloat(n){
    if(!isFinite(n)||n===0) return "0";
    let s=n.toFixed(10).replace(/0+$/,"").replace(/\.$/,"");
    return s||"0";
  }

  /* ---------- Init ---------- */
  renderSwap();
})();
