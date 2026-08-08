/* ============================================================
   krypt-app.js — the controls layer on every screen.

   DESKTOP: a dim dot in the corner that expands into a pill
   (Gallery / Fullscreen / Install). The dashboard's own Edit and
   Reset buttons stay where they are, top of the page.

   PHONE: none of that. The Edit/Reset toolbar and the Collection
   link float on top of the mock and ruin it at phone size, so
   phone.css hides them and everything moves into one panel in the
   middle of the screen — opened by tapping three times anywhere.
   Nothing is visible until you ask for it.

   Keyboard: F toggles fullscreen, H hides the corner dot, Esc closes.

   Configured from its own <script> tag:
     data-root    path prefix back to the project root
     data-label   what this screen is called
     data-gallery present on the gallery page itself
   ============================================================ */

(function () {
  'use strict';

  var S = document.currentScript;
  var ROOT = (S && S.getAttribute('data-root')) || '../../';
  var LABEL = (S && S.getAttribute('data-label')) || 'this';
  var IS_GALLERY = !!(S && S.hasAttribute('data-gallery'));

  var ua = navigator.userAgent;
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
              (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/.test(ua);
  // On iOS every browser is WebKit, but only real Safari can add to the
  // Home Screen — Chrome/Firefox/Edge for iOS cannot.
  var isIOSSafari = isIOS && !/CriOS|FxiOS|EdgiOS|OPiOS/.test(ua);
  var standalone = window.matchMedia('(display-mode: standalone)').matches ||
                   window.matchMedia('(display-mode: fullscreen)').matches ||
                   navigator.standalone === true;

  var canFullscreen = !!(document.fullscreenEnabled || document.webkitFullscreenEnabled);
  var phoneMQ = window.matchMedia('(max-width: 560px)');
  function isPhone() { return phoneMQ.matches; }

  /* The dashboards all drive editing off body.editing and expose the
     same two button ids, so the panel can just forward to them. */
  function pageEditing() { return document.body.classList.contains('editing'); }
  function pageBtn(id) { return document.getElementById(id); }

  /* ---------------- styles ---------------- */

  var css = document.createElement('style');
  css.textContent = [
    '.krypt-ui{position:fixed;left:max(12px,env(safe-area-inset-left));',
    '  bottom:max(12px,env(safe-area-inset-bottom));z-index:2147483000;',
    '  font:600 13px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  display:flex;align-items:center;gap:6px;',
    '  -webkit-tap-highlight-color:transparent;}',
    '.krypt-ui *{box-sizing:border-box;}',

    '.krypt-dot{width:30px;height:30px;border-radius:999px;border:1px solid rgba(255,255,255,.16);',
    '  background:rgba(18,18,22,.6);-webkit-backdrop-filter:blur(14px) saturate(180%);',
    '  backdrop-filter:blur(14px) saturate(180%);color:#fff;cursor:pointer;',
    '  display:flex;align-items:center;justify-content:center;gap:2.5px;padding:0;',
    '  opacity:.34;transition:opacity .2s ease,transform .2s ease;}',
    '.krypt-dot i{width:3px;height:3px;border-radius:50%;background:currentColor;display:block;}',
    '.krypt-ui:hover .krypt-dot,.krypt-ui.open .krypt-dot{opacity:.95;}',
    '.krypt-ui.open .krypt-dot{transform:rotate(90deg);}',
    /* On the desktop dashboards this control is the only way to reach Edit,
       so it sits brighter than the version that is merely a shortcut. */
    '.krypt-ui.krypt-holds-edit .krypt-dot{opacity:.72;border-color:rgba(255,255,255,.28);',
    '  background:rgba(28,28,34,.82);}',

    '.krypt-pill{display:flex;align-items:center;gap:2px;padding:4px;border-radius:999px;',
    '  border:1px solid rgba(255,255,255,.14);background:rgba(18,18,22,.72);',
    '  -webkit-backdrop-filter:blur(16px) saturate(180%);',
    '  backdrop-filter:blur(16px) saturate(180%);',
    '  box-shadow:0 8px 26px rgba(0,0,0,.45);',
    '  opacity:0;transform:translateX(-8px) scale(.94);transform-origin:left center;',
    '  pointer-events:none;transition:opacity .18s ease,transform .18s cubic-bezier(.2,.8,.3,1);}',
    '.krypt-ui.open .krypt-pill{opacity:1;transform:none;pointer-events:auto;}',

    '.krypt-btn{display:flex;align-items:center;gap:6px;padding:7px 12px;border:0;',
    '  border-radius:999px;background:transparent;color:#fff;cursor:pointer;',
    '  font:inherit;white-space:nowrap;text-decoration:none;}',
    '.krypt-btn:hover{background:rgba(255,255,255,.12);}',
    '.krypt-btn:active{background:rgba(255,255,255,.2);}',
    '.krypt-btn svg{flex:none;}',
    /* the adopted Edit/Reset icons are drawn at panel size — bring them
       down to match the rest of the pill */
    '.krypt-pill .krypt-btn svg{width:14px;height:14px;}',
    '.krypt-pill .krypt-btn.on{color:#FFD400;}',

    /* the corner control is desktop-only — on a phone the panel replaces it */
    '@media (max-width:560px){.krypt-ui{display:none !important;}}',

    /* ---- shared overlay ---- */
    '.krypt-sheet{position:fixed;inset:0;z-index:2147483001;display:none;',
    '  align-items:center;justify-content:center;padding:24px;',
    '  background:rgba(0,0,0,.62);-webkit-backdrop-filter:blur(5px);backdrop-filter:blur(5px);',
    '  -webkit-tap-highlight-color:transparent;}',
    '.krypt-sheet.open{display:flex;animation:kryptFade .18s ease;}',
    '@keyframes kryptFade{from{opacity:0}to{opacity:1}}',
    '@keyframes kryptRise{from{opacity:0;transform:translateY(14px) scale(.96)}to{opacity:1;transform:none}}',

    '.krypt-sheet-card{width:100%;max-width:360px;background:#17171C;color:#ECECF1;',
    '  border:1px solid #2C2C35;border-radius:20px;padding:24px 22px 18px;text-align:left;',
    '  font:400 14px/1.55 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  box-shadow:0 30px 70px rgba(0,0,0,.6);animation:kryptRise .22s cubic-bezier(.2,.8,.3,1);}',
    '.krypt-sheet-card h3{margin:0 0 10px;font-size:17px;font-weight:700;letter-spacing:-.01em;}',
    '.krypt-sheet-card p{margin:0 0 10px;color:#A9A9B8;}',
    '.krypt-sheet-card ol{margin:0 0 4px;padding-left:20px;color:#C9C9D6;}',
    '.krypt-sheet-card li{margin-bottom:7px;}',
    '.krypt-sheet-card b{color:#fff;font-weight:650;}',
    '.krypt-sheet-close{display:block;width:100%;margin-top:14px;padding:11px;border:0;',
    '  border-radius:12px;background:#2A2A34;color:#fff;font:600 14px/1 inherit;cursor:pointer;}',
    '.krypt-sheet-close:hover{background:#343440;}',

    /* ---- the phone panel ---- */
    '.krypt-panel{width:100%;max-width:300px;background:#17171C;color:#ECECF1;',
    '  border:1px solid #2C2C35;border-radius:22px;overflow:hidden;',
    '  font:400 15px/1.3 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  box-shadow:0 30px 80px rgba(0,0,0,.65);animation:kryptRise .22s cubic-bezier(.2,.8,.3,1);}',
    '.krypt-panel .ph{padding:18px 20px 14px;text-align:center;border-bottom:1px solid #26262F;}',
    '.krypt-panel .ph .t{font-size:16px;font-weight:700;letter-spacing:-.01em;}',
    '.krypt-panel .ph .s{font-size:12px;color:#8A8A98;margin-top:3px;}',
    '.krypt-panel .row{display:flex;align-items:center;gap:12px;width:100%;padding:15px 20px;',
    '  border:0;border-bottom:1px solid #23232B;background:transparent;color:#ECECF1;',
    '  font:inherit;text-align:left;cursor:pointer;text-decoration:none;',
    '  -webkit-tap-highlight-color:transparent;}',
    '.krypt-panel .row:active{background:#22222B;}',
    '.krypt-panel .row svg{flex:none;opacity:.85;}',
    '.krypt-panel .row .lbl{flex:1;min-width:0;}',
    '.krypt-panel .row.on{color:#FFD400;}',
    '.krypt-panel .row.danger{color:#FF6B6B;}',
    '.krypt-panel .row.done{border-bottom:0;color:#8A8A98;justify-content:center;font-weight:600;}',

    /* ---- editing indicator (the page\'s own Edit button is hidden here) ---- */
    '.krypt-editing{position:fixed;left:50%;transform:translateX(-50%);',
    '  bottom:calc(10px + env(safe-area-inset-bottom));z-index:2147482999;',
    '  display:none;align-items:center;gap:7px;padding:7px 14px;border-radius:999px;',
    '  background:rgba(255,212,0,.94);color:#3A2E00;pointer-events:none;',
    '  font:700 11px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  letter-spacing:.6px;box-shadow:0 6px 20px rgba(0,0,0,.4);}',
    '@media (max-width:560px){body.editing .krypt-editing{display:flex;}}',

    /* ---- one-time discovery hint ---- */
    '.krypt-hint{position:fixed;left:50%;transform:translateX(-50%);',
    '  bottom:calc(10px + env(safe-area-inset-bottom));z-index:2147482998;',
    '  padding:9px 16px;border-radius:999px;background:rgba(18,18,22,.86);color:#fff;',
    '  -webkit-backdrop-filter:blur(14px);backdrop-filter:blur(14px);',
    '  border:1px solid rgba(255,255,255,.14);pointer-events:none;',
    '  font:600 12px/1 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;',
    '  opacity:0;transition:opacity .4s ease;}',
    '.krypt-hint.show{opacity:1;}',
  ].join('');
  document.head.appendChild(css);

  /* ---------------- icons ---------------- */

  function svg(d, size) {
    return '<svg width="' + (size || 14) + '" height="' + (size || 14) + '" viewBox="0 0 24 24" ' +
      'fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" ' +
      'stroke-linejoin="round" aria-hidden="true">' + d + '</svg>';
  }
  var ICON = {
    back:   svg('<path d="M15 18l-6-6 6-6"/>'),
    expand: svg('<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3' +
                'M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>'),
    shrink: svg('<path d="M8 3v3a2 2 0 0 1-2 2H3M16 3v3a2 2 0 0 0 2 2h3' +
                'M8 21v-3a2 2 0 0 0-2-2H3M16 21v-3a2 2 0 0 1 2-2h3"/>'),
    add:    svg('<path d="M12 5v14M5 12h14"/>'),
    pencil: svg('<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="M14.5 5.5l4 4"/>', 17),
    check:  svg('<path d="M4 12.5l5 5L20 6.5"/>', 17),
    undo:   svg('<path d="M4 5v6h6"/><path d="M4.6 14a8 8 0 1 0 1.9-8.3L4 8"/>', 17),
    grid:   svg('<rect x="3.5" y="3.5" width="7" height="7" rx="2"/>' +
                '<rect x="13.5" y="3.5" width="7" height="7" rx="2"/>' +
                '<rect x="3.5" y="13.5" width="7" height="7" rx="2"/>' +
                '<rect x="13.5" y="13.5" width="7" height="7" rx="2"/>', 17),
    full:   svg('<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3' +
                'M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"/>', 17),
    down:   svg('<path d="M12 4v11m0 0l-4-4m4 4l4-4"/><path d="M5 19h14"/>', 17),
  };

  /* ---------------- desktop corner control ---------------- */

  var ui = document.createElement('div');
  ui.className = 'krypt-ui';

  var dot = document.createElement('button');
  dot.className = 'krypt-dot';
  dot.type = 'button';
  dot.setAttribute('aria-label', 'Krypt LARP controls');
  dot.innerHTML = '<i></i><i></i><i></i>';

  var pill = document.createElement('div');
  pill.className = 'krypt-pill';

  var fsBtn = null;
  if (canFullscreen) {
    fsBtn = document.createElement('button');
    fsBtn.className = 'krypt-btn';
    fsBtn.type = 'button';
    fsBtn.innerHTML = ICON.expand + '<span>Fullscreen</span>';
    fsBtn.addEventListener('click', toggleFullscreen);
    pill.appendChild(fsBtn);
  }

  if (!standalone) {
    var addBtn = document.createElement('button');
    addBtn.className = 'krypt-btn';
    addBtn.type = 'button';
    addBtn.innerHTML = ICON.add + 'Install';
    addBtn.addEventListener('click', function () { openSheet(); });
    pill.appendChild(addBtn);
  }

  /* On the desktop dashboards, desktop.css hides the page's own
     Edit/Reset toolbar — full-bleed leaves no margin for it to sit in.
     When that has happened, adopt the two buttons into the pill so the
     controls don't just vanish. Measured rather than assumed: an element
     hidden with display:none reports no client rects, while a visible
     position:fixed toolbar reports one. */
  function pageControlsHidden() {
    var b = pageBtn('editBtn');
    return !!b && b.getClientRects().length === 0;
  }

  var editBtn = null;

  function syncEditBtn() {
    if (!editBtn) return;
    var on = pageEditing();
    editBtn.innerHTML = (on ? ICON.check : ICON.pencil) +
      '<span>' + (on ? 'Done' : 'Edit') + '</span>';
    editBtn.classList.toggle('on', on);
  }

  function adoptPageControls() {
    if (editBtn || !pageControlsHidden()) return;

    editBtn = document.createElement('button');
    editBtn.className = 'krypt-btn';
    editBtn.type = 'button';
    editBtn.addEventListener('click', function () {
      pageBtn('editBtn').click();
      syncEditBtn();
    });
    pill.insertBefore(editBtn, pill.firstChild);
    syncEditBtn();

    if (pageBtn('resetBtn')) {
      var r = document.createElement('button');
      r.className = 'krypt-btn';
      r.type = 'button';
      r.innerHTML = ICON.undo + '<span>Reset</span>';
      r.addEventListener('click', function () {
        pageBtn('resetBtn').click();
        syncEditBtn();
      });
      pill.insertBefore(r, editBtn.nextSibling);
    }

    // Editing is now *only* reachable through this control, so make it
    // findable: brighter at rest, a tooltip, and it introduces itself once.
    ui.classList.add('krypt-holds-edit');
    dot.title = 'Edit values, reset, gallery, fullscreen';
    var seen;
    try { seen = localStorage.getItem('krypt-pill-hint'); } catch (e) { seen = '1'; }
    if (!seen) {
      try { localStorage.setItem('krypt-pill-hint', '1'); } catch (e) { /* private mode */ }
      setTimeout(function () { open(); }, 600);
    }
  }

  ui.appendChild(dot);
  ui.appendChild(pill);

  var closeTimer = null;
  function open() {
    ui.classList.add('open');
    clearTimeout(closeTimer);
    closeTimer = setTimeout(close, 6000);
  }
  function close() { ui.classList.remove('open'); clearTimeout(closeTimer); }

  dot.addEventListener('click', function (e) {
    e.stopPropagation();
    if (ui.classList.contains('open')) close(); else open();
  });
  pill.addEventListener('click', open);
  document.addEventListener('click', function (e) {
    if (!ui.contains(e.target)) close();
  });

  /* ---------------- fullscreen ---------------- */

  function fsElement() {
    return document.fullscreenElement || document.webkitFullscreenElement || null;
  }

  function toggleFullscreen() {
    var el = document.documentElement;
    if (fsElement()) {
      (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    } else {
      var req = el.requestFullscreen || el.webkitRequestFullscreen;
      if (req) {
        var p = req.call(el, { navigationUI: 'hide' });
        if (p && p.catch) p.catch(function () { /* gesture lost, ignore */ });
      }
    }
  }

  function syncFullscreenBtn() {
    if (!fsBtn) return;
    var on = !!fsElement();
    fsBtn.innerHTML = (on ? ICON.shrink : ICON.expand) +
      '<span>' + (on ? 'Exit fullscreen' : 'Fullscreen') + '</span>';
  }
  document.addEventListener('fullscreenchange', syncFullscreenBtn);
  document.addEventListener('webkitfullscreenchange', syncFullscreenBtn);

  /* ---------------- the phone panel ---------------- */

  var panelWrap = null;

  function buildPanel() {
    panelWrap = document.createElement('div');
    panelWrap.className = 'krypt-sheet';

    var card = document.createElement('div');
    card.className = 'krypt-panel';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-modal', 'true');
    panelWrap.appendChild(card);

    panelWrap.addEventListener('click', function (e) {
      if (e.target === panelWrap) closePanel();
    });
    document.body.appendChild(panelWrap);
  }

  function row(icon, label, cls) {
    return '<button class="row ' + (cls || '') + '" type="button">' + icon +
      '<span class="lbl">' + label + '</span></button>';
  }

  function openPanel() {
    if (!panelWrap) buildPanel();
    var card = panelWrap.firstChild;
    var editing = pageEditing();
    var hasEdit = !!pageBtn('editBtn');
    var hasReset = !!pageBtn('resetBtn');

    var html = '<div class="ph"><div class="t">' + esc(LABEL) +
      '</div><div class="s">' + (editing ? 'Editing — tap a value to change it'
                                         : 'Tap 3× anywhere to reopen this') + '</div></div>';

    if (hasEdit) {
      html += row(editing ? ICON.check : ICON.pencil,
        editing ? 'Done editing' : 'Edit values', editing ? 'on' : '');
    }
    if (hasReset) html += row(ICON.undo, 'Reset to defaults', 'danger');
    if (canFullscreen) html += row(ICON.full, fsElement() ? 'Exit fullscreen' : 'Fullscreen');
    if (!standalone) html += row(ICON.down, 'Add to Home Screen');
    html += '<button class="row done" type="button">Close</button>';

    card.innerHTML = html;

    var rows = card.querySelectorAll('.row');
    var i = 0;
    if (hasEdit)  wire(rows[i++], function () { closePanel(); pageBtn('editBtn').click(); });
    if (hasReset) wire(rows[i++], function () { closePanel(); pageBtn('resetBtn').click(); });
    if (canFullscreen) wire(rows[i++], function () { closePanel(); toggleFullscreen(); });
    if (!standalone) wire(rows[i++], function () { closePanel(); openSheet(); });
    wire(rows[i], closePanel);

    panelWrap.classList.add('open');
  }

  function wire(el, fn) { if (el) el.addEventListener('click', fn); }
  function closePanel() { if (panelWrap) panelWrap.classList.remove('open'); }
  function panelOpen() { return !!panelWrap && panelWrap.classList.contains('open'); }

  /* ---------------- triple tap ---------------- */

  var taps = [];
  var TAP_WINDOW = 600;   // ms between taps
  var TAP_RADIUS = 44;    // px — the taps have to be the same spot, not three
                          // different buttons being hit quickly

  document.addEventListener('pointerup', function (e) {
    if (!isPhone() || panelOpen() || sheetOpen()) return;

    // In edit mode a triple-tap is how you select a value's text, so leave
    // taps on editable things alone.
    if (pageEditing() && e.target.closest &&
        e.target.closest('[data-edit],[contenteditable="true"],input,textarea')) {
      taps = [];
      return;
    }

    var now = e.timeStamp;
    taps = taps.filter(function (t) { return now - t.t < TAP_WINDOW; });
    if (taps.length && Math.hypot(e.clientX - taps[0].x, e.clientY - taps[0].y) > TAP_RADIUS) {
      taps = [];
    }
    taps.push({ t: now, x: e.clientX, y: e.clientY });

    if (taps.length >= 3) {
      taps = [];
      swallowClick = true;
      openPanel();
    }
  }, true);

  /* The third tap still produces a click on whatever was under the finger.
     Eat it, so opening the panel doesn't also switch a tab behind it. */
  var swallowClick = false;
  document.addEventListener('click', function (e) {
    if (!swallowClick) return;
    swallowClick = false;
    e.stopPropagation();
    e.preventDefault();
  }, true);

  /* ---------------- install instructions ---------------- */

  var sheet = null;
  function sheetOpen() { return !!sheet && sheet.classList.contains('open'); }

  function instructions() {
    var name = LABEL;
    if (isIOSSafari) {
      return '<h3>Add ' + esc(name) + ' to your Home Screen</h3>' +
        '<ol>' +
        '<li>Tap the <b>Share</b> button — the square with an arrow, in Safari’s ' +
          'bottom bar.</li>' +
        '<li>Scroll down and tap <b>Add to Home Screen</b>.</li>' +
        '<li>Tap <b>Add</b>.</li>' +
        '</ol>' +
        '<p>It gets its own icon and opens fullscreen with no Safari bars.</p>';
    }
    if (isIOS) {
      return '<h3>Open this in Safari first</h3>' +
        '<p>Only Safari can add pages to the iPhone Home Screen — Chrome and the ' +
        'others can’t. Copy the address, open <b>Safari</b>, paste it, then use ' +
        '<b>Share → Add to Home Screen</b>.</p>';
    }
    if (isAndroid) {
      return '<h3>Add ' + esc(name) + ' to your Home Screen</h3>' +
        '<ol>' +
        '<li>Tap the <b>⋮</b> menu, top-right in Chrome.</li>' +
        '<li>Tap <b>Add to Home screen</b> (sometimes under <b>Install app</b>).</li>' +
        '<li>Tap <b>Add</b>.</li>' +
        '</ol>' +
        '<p>It gets its own icon and opens fullscreen with no browser bars.</p>';
    }
    return '<h3>Fullscreen &amp; install</h3>' +
      '<p>Press <b>F</b> for fullscreen, or use the install icon in your browser’s ' +
      'address bar.</p>' +
      '<p>The home-screen icon is really meant for a phone — open this page on your ' +
      'phone and use its browser’s <b>Add to Home Screen</b>.</p>';
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  function openSheet() {
    if (!sheet) {
      sheet = document.createElement('div');
      sheet.className = 'krypt-sheet';
      sheet.innerHTML = '<div class="krypt-sheet-card" role="dialog" aria-modal="true">' +
        instructions() +
        '<button class="krypt-sheet-close" type="button">Got it</button></div>';
      sheet.addEventListener('click', function (e) {
        if (e.target === sheet || e.target.classList.contains('krypt-sheet-close')) closeSheet();
      });
      document.body.appendChild(sheet);
    }
    sheet.classList.add('open');
  }
  function closeSheet() { if (sheet) sheet.classList.remove('open'); }

  /* ---------------- keyboard ---------------- */

  document.addEventListener('keydown', function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;

    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    else if (e.key === 'h' || e.key === 'H') ui.style.display = ui.style.display ? '' : 'none';
    else if (e.key === 'Escape') { closeSheet(); closePanel(); close(); }
  });

  /* ---------------- editing indicator + first-run hint ---------------- */

  function mountExtras() {
    var badge = document.createElement('div');
    badge.className = 'krypt-editing';
    badge.textContent = 'EDITING · TAP 3× WHEN DONE';
    document.body.appendChild(badge);

    if (!isPhone()) return;
    var seen;
    try { seen = localStorage.getItem('krypt-tap-hint'); } catch (e) { seen = '1'; }
    if (seen) return;

    var hint = document.createElement('div');
    hint.className = 'krypt-hint';
    hint.textContent = 'Tap 3× anywhere for settings';
    document.body.appendChild(hint);
    setTimeout(function () { hint.classList.add('show'); }, 700);
    setTimeout(function () { hint.classList.remove('show'); }, 5200);
    setTimeout(function () { hint.remove(); }, 6000);
    try { localStorage.setItem('krypt-tap-hint', '1'); } catch (e) {}
  }

  /* ---------------- go ---------------- */

  function mount() {
    document.body.appendChild(ui);
    syncFullscreenBtn();
    adoptPageControls();
    mountExtras();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
