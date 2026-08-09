/* ============================================================
   SEND FLOW — Select Token → To Address → Enter Amount →
                Summary → Sending → Sent
   Pulls balances/prices from PhantomApp. Solana address is
   validated (base58, 32–44 chars). On confirmation the sent
   amount is deducted from the wallet and the UI refreshes.
   ============================================================ */
(function(){
  const App = window.PhantomApp;
  if(!App){console.warn("SendFlow: PhantomApp not ready");return;}

  const sheet   = document.getElementById("sendSheet");
  const pages   = () => sheet.querySelectorAll(".send-page");
  const goto    = name => { pages().forEach(p=>p.classList.toggle("active",p.dataset.page===name)); state.page=name; };

  const state = {
    page:"select",
    tokenIdx:-1,
    address:"",
    amount:"",          /* string being built, e.g. "1000" or "0.25" */
    inUsd:false,        /* false: input is in token units, true: in currency */
  };

  /* ---- Solana public key validation ----
     Solana addresses are base58-encoded Ed25519 public keys. They use
     the Bitcoin base58 alphabet (no 0, O, I, l) and, when encoded, are
     always 32–44 characters long. */
  const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
  function isValidSolAddress(s){
    if(!s||typeof s!=="string") return false;
    s=s.trim();
    return B58.test(s);
  }

  /* ---- Ethereum-ish check (0x + 40 hex) — used if user picks an ETH token ---- */
  const ETH_RE = /^0x[a-fA-F0-9]{40}$/;
  function isValidEthAddress(s){return ETH_RE.test((s||"").trim());}

  function currentToken(){return App.DATA.tokens[state.tokenIdx];}
  function isEthLike(t){
    if(!t) return false;
    const eth=new Set(["ETH","USDT","USDC","DAI","WETH","LINK","UNI","AAVE","MATIC","SHIB","PEPE"]);
    return eth.has((t.sym||"").toUpperCase());
  }
  function validateAddress(t,addr){
    if(!addr) return {ok:false,msg:""};
    if(isEthLike(t)){
      if(isValidEthAddress(addr)) return {ok:true};
      return {ok:false,msg:"Not a valid Ethereum address (must be 0x + 40 hex chars)."};
    }
    if(isValidSolAddress(addr)) return {ok:true};
    return {ok:false,msg:"Not a valid Solana address (32–44 base58 chars)."};
  }

  function shortAddr(a){
    if(!a) return "";
    return a.slice(0,4)+"…"+a.slice(-4);
  }

  /* ============ PUBLIC ENTRY ============ */
  function open(){
    state.tokenIdx=-1;state.address="";state.amount="";state.inUsd=false;
    renderTokenList();
    sheet.classList.add("open");
    goto("select");
  }
  function close(){
    sheet.classList.remove("open");
  }
  window.SendFlow = {open,close};

  /* ============ PAGE 1: SELECT TOKEN ============ */
  const tokListEl = document.getElementById("sendTokenList");
  const searchEl  = document.getElementById("sendSearch");

  function renderTokenList(){
    const q=(searchEl.value||"").trim().toLowerCase();
    tokListEl.innerHTML="";
    App.DATA.tokens.forEach((t,i)=>{
      if(q && !((t.name||"").toLowerCase().includes(q)||(t.sym||"").toLowerCase().includes(q))) return;
      const row=document.createElement("div");
      row.className="send-tok";
      row.innerHTML=`${App.tokenIcon(t)}
        <div class="mid">
          <div class="name"><span>${t.name}</span></div>
          <div class="qty">${App.fmtQtyShort(Number(t.amount)||0)} ${t.sym}</div>
        </div>`;
      row.addEventListener("click",()=>{
        state.tokenIdx=i;state.address="";state.amount="";state.inUsd=false;
        renderAddressPage();
        goto("address");
      });
      tokListEl.appendChild(row);
    });
    if(!tokListEl.children.length){
      tokListEl.innerHTML=`<div style="color:#8a8a8e;padding:20px 4px;text-align:center;font-size:14px;">No tokens match "${q}".</div>`;
    }
  }
  searchEl.addEventListener("input",renderTokenList);

  /* ============ PAGE 2: TO ADDRESS ============ */
  const addrTitle = document.getElementById("addrTitle");
  const addrInput = document.getElementById("addrInput");
  const addrErr   = document.getElementById("addrErr");
  const addrNext  = document.getElementById("addrNext");

  function renderAddressPage(){
    const t=currentToken();
    addrTitle.textContent = t ? t.sym : "";
    addrInput.value = state.address || "";
    /* Same placeholder for every token — validation is still per-network. */
    addrInput.placeholder = "username or address";
    addrErr.textContent="";
    /* If we came back from Amount with a valid address, keep Next enabled. */
    const v=state.address ? validateAddress(t,state.address) : {ok:false};
    addrNext.classList.toggle("on", !!v.ok);
    setTimeout(()=>addrInput.focus(),120);
  }
  addrInput.addEventListener("input",()=>{
    state.address = addrInput.value.trim();
    const t=currentToken();
    if(!state.address){addrErr.textContent="";addrNext.classList.remove("on");return;}
    const v=validateAddress(t,state.address);
    if(v.ok){addrErr.textContent="";addrNext.classList.add("on");}
    else{addrErr.textContent=state.address.length>=32?v.msg:"";addrNext.classList.remove("on");}
  });
  addrNext.addEventListener("click",()=>{
    if(!addrNext.classList.contains("on")) return;
    renderAmountPage();
    goto("amount");
  });

  /* ============ PAGE 3: ENTER AMOUNT ============ */
  const amtToEl    = document.getElementById("amtTo");
  const amtInput   = document.getElementById("amtInput");
  const amtDisplay = document.getElementById("amtDisplay");
  const amtSymEl   = document.getElementById("amtSym");
  const amtUsdEl   = document.getElementById("amtUsd");
  const amtAvailEl = document.getElementById("amtAvail");
  const amtSwapEl  = document.getElementById("amtSwap");
  const amtMaxEl   = document.getElementById("amtMax");
  const amtNextEl  = document.getElementById("amtNext");

  function renderAmountPage(){
    amtToEl.innerHTML = `To: <b>${shortAddr(state.address)}</b>`;
    /* Set the input to the current amount (or 0). We keep state.amount as
       the string source of truth so back-navigation preserves it. */
    amtInput.value = state.amount || "0";
    updateAmountDisplay();
    /* Deliberately do NOT auto-focus — user must tap the amount to open
       their phone's native numeric keypad. */
    amtInput.blur();
  }

  function sanitizeAmount(raw){
    /* Digits + at most one dot. Strip everything else so a paste can't
       inject letters/symbols. */
    let s=(raw||"").replace(/[^0-9.]/g,"");
    const firstDot=s.indexOf(".");
    if(firstDot!==-1){
      s = s.slice(0,firstDot+1) + s.slice(firstDot+1).replace(/\./g,"");
    }
    /* Trim leading zeros unless it's "0" or "0." */
    if(s.length>1 && s[0]==="0" && s[1]!==".") s=s.replace(/^0+/,"")||"0";
    if(s.length>16) s=s.slice(0,16);
    return s;
  }

  function amountAsTokens(){
    const t=currentToken();if(!t) return 0;
    const raw=parseFloat(state.amount||"0")||0;
    if(!state.inUsd) return raw;
    const price=App.tokenPrice(t)||0;
    return price>0 ? raw/price : 0;
  }
  function amountAsUsd(){
    const t=currentToken();if(!t) return 0;
    const raw=parseFloat(state.amount||"0")||0;
    const price=App.tokenPrice(t)||0;
    if(state.inUsd) return raw;
    return raw*price;
  }
  function updateAmountDisplay(){
    const t=currentToken();
    /* Grow the input to fit its content so the SOL/USD label sits right
       next to the number instead of miles to the right. */
    amtInput.size = Math.max(1,(amtInput.value||"0").length);
    if(state.inUsd){
      amtSymEl.textContent = "USD";
      amtUsdEl.textContent = `~${App.fmtQty(amountAsTokens())} ${t.sym}`;
    }else{
      amtSymEl.textContent = t.sym;
      amtUsdEl.textContent = `~${App.curSym()}${App.fmt(amountAsUsd())}`;
    }
    const bal=Number(t.amount)||0;
    amtAvailEl.textContent = `${App.fmtQtyShort(bal)} ${t.sym}`;
    const tokAmt=amountAsTokens();
    const ok = tokAmt>0 && tokAmt<=bal+1e-12;
    amtNextEl.classList.toggle("on",ok);
  }

  /* Tap anywhere on the big "1000 SOL" row to focus the input and open
     the native numeric keyboard. iOS/Android will show its own pad. */
  amtDisplay.addEventListener("click",e=>{
    if(e.target===amtSwapEl||amtSwapEl.contains(e.target)) return;
    amtInput.focus();
    /* Move caret to end so typing appends. */
    const v=amtInput.value;amtInput.setSelectionRange(v.length,v.length);
  });
  amtInput.addEventListener("input",()=>{
    const cleaned=sanitizeAmount(amtInput.value);
    if(cleaned!==amtInput.value) amtInput.value=cleaned;
    state.amount = (cleaned==="0"||cleaned==="") ? "" : cleaned;
    /* Ensure the field always shows something visible. */
    if(!amtInput.value) amtInput.value="0";
    updateAmountDisplay();
  });
  amtInput.addEventListener("focus",()=>{
    /* On focus, if it's just "0" clear it so the user can type freely. */
    if(amtInput.value==="0") amtInput.value="";
    updateAmountDisplay();
  });
  amtInput.addEventListener("blur",()=>{
    if(!amtInput.value) amtInput.value="0";
    updateAmountDisplay();
  });

  amtSwapEl.addEventListener("click",e=>{
    e.stopPropagation();
    state.inUsd=!state.inUsd;
    state.amount="";
    amtInput.value="0";
    updateAmountDisplay();
  });
  amtMaxEl.addEventListener("click",()=>{
    const t=currentToken();const bal=Number(t.amount)||0;
    state.inUsd=false;
    state.amount = bal>0 ? trimFloat(bal) : "";
    amtInput.value = state.amount || "0";
    updateAmountDisplay();
  });

  amtNextEl.addEventListener("click",()=>{
    if(!amtNextEl.classList.contains("on")) return;
    /* Dismiss the native keyboard, then advance. */
    amtInput.blur();
    renderSummaryPage();
    goto("summary");
  });

  /* ============ PAGE 4: SUMMARY ============ */
  const sumAmtEl   = document.getElementById("sumAmt");
  const sumUsdEl   = document.getElementById("sumUsd");
  const sumToEl    = document.getElementById("sumTo");
  const sumNetEl   = document.getElementById("sumNet");
  const sumSendEl  = document.getElementById("sumSend");

  function renderSummaryPage(){
    const t=currentToken();
    const tok=amountAsTokens();
    const usd=amountAsUsd();
    sumAmtEl.textContent = `${App.fmtQty(tok)} ${t.sym}`;
    sumUsdEl.textContent = `~${App.curSym()}${App.fmt(usd)}`;
    sumToEl.textContent = shortAddr(state.address);
    sumNetEl.textContent = isEthLike(t) ? "Ethereum" : "Solana";
  }
  sumSendEl.addEventListener("click",()=>{
    renderSendingPage();
    goto("sending");
    /* Simulate broadcast */
    setTimeout(()=>{
      /* Deduct amount from balance */
      const t=currentToken();
      const tokAmt=amountAsTokens();
      const bal=Number(t.amount)||0;
      const next=Math.max(0,bal-tokAmt);
      /* Preserve original precision-ish */
      App.DATA.tokens[state.tokenIdx].amount = trimFloat(next);
      App.save();
      App.refreshUI();
      renderSentPage();
      goto("sent");
    },2200);
  });
  function trimFloat(n){
    if(!isFinite(n)) return "0";
    if(n===0) return "0";
    let s=n.toFixed(10).replace(/0+$/,"").replace(/\.$/,"");
    return s||"0";
  }

  /* ============ PAGE 5: SENDING ============ */
  const sendingToEl = document.getElementById("sendingTo");
  function renderSendingPage(){
    const t=currentToken();
    sendingToEl.innerHTML = `<b class="nowrap">${App.fmtQty(amountAsTokens())} ${t.sym}</b> to <b class="nowrap">${shortAddr(state.address)}</b>`;
  }

  /* ============ PAGE 6: SENT ============ */
  const sentToEl = document.getElementById("sentTo");
  function renderSentPage(){
    const t=currentToken();
    /* Break line before the address so it never splits mid-key. */
    sentToEl.innerHTML = `<b class="nowrap">${App.fmtQty(amountAsTokens())} ${t.sym}</b> was successfully sent to<br><b class="nowrap">${shortAddr(state.address)}</b>`;
    /* trigger a home refresh so the new balance animates in */
    setTimeout(()=>{try{App.doRefresh&&App.doRefresh();}catch(e){}},50);
  }

  /* ---- back / close wiring ---- */
  sheet.addEventListener("click",e=>{
    const back=e.target.closest("[data-send-back]");
    const closeBtn=e.target.closest("[data-send-close]");
    if(closeBtn){close();return;}
    if(!back) return;
    const target=back.getAttribute("data-send-back");
    if(target==="close"){close();return;}
    goto(target);
  });
})();
