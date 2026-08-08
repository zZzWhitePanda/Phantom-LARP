# Phantom LARP

A self-contained, static recreation of the Phantom wallet UI — a **learning/LARP demo**, not the real app and not connected to anything. It's a UI study: all data is fake and editable, nothing leaves your device.

## What's here

```
index.html                 The wallet (Home / Trade / Predict / Explore)
manifest.webmanifest       PWA manifest — installs as "Phantom" with the ghost icon
assets/
  phantom-app.js           Optional controls layer (install help, phone triple-tap settings)
  phone.css                Full-bleed layout + status-bar handling on real phones
  coins/                   sol.png, usdc.png, usdt.png
  icons/                   phantom-wallet-180.png, phantom-wallet-512.png (home-screen icon)
```

## Run locally

It's plain static files — open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy (Vercel)

No build step. Import the repo in Vercel (Framework preset: **Other**), or from the CLI:

```bash
vercel --prod
```

## Add to your Home Screen

Open the deployed URL on your phone:

- **iPhone (Safari):** Share → **Add to Home Screen** → Add
- **Android (Chrome):** ⋮ menu → **Add to Home screen** / Install app

It installs as **Phantom** with the purple ghost icon and opens fullscreen.

## Editing values

On desktop, use the **Edit** button (top-right), click any value, then **Done**. On a phone, tap **three times anywhere** to open the settings panel. Changes are saved to your browser (localStorage); **Reset** restores the defaults.

---

> This is a fan-made UI recreation for demonstration/role-play. It is not affiliated with Phantom and performs no real wallet, financial, or blockchain actions.
