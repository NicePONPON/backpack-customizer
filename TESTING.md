# Testing Checklist

Smoke-test pass for the latest deploy. Run through this on the Vercel preview URL after each push.

## Recent commits live

```
69e8b1d  feat(i18n): translate customize tool (colors, embroidery, intro, CTA)
943037b  feat(i18n): translate shop page (heading, taglines, CTA)
4dd0b54  feat(i18n): auto-discover ad images from public/advertisement/ by locale prefix
1328de2  feat: replace WhatsApp pin with multi-platform share dock
82cbc15  feat: gate intro video to once per browser session
40c2e97  feat: rename sub-nav links and add Home
33a71c1  feat: sticky sub-nav + dedicated /gallery route with ad panel
e1c64e5  feat: notify-me email capture on Coming Soon gallery card
5b506da  feat: floating WhatsApp button + site-wide metadata
de217ef  feat: dynamic OG/Twitter card with painted-bag hero
```

## What to eyeball

### Language toggle (every page except `/invoice`)
- Top-right pill in the header reads `EN` (active) and `中`.
- Click `中`: page reloads. Site chrome (sub-nav, footer, share dock toast), home copy, gallery section, customize tool, and shop page all render in Traditional Chinese.
- Click `EN`: returns to English.
- Cookie `NEXT_LOCALE` persists across browser sessions.
- `/gallery` ad rail in EN shows `EN-*.png` files; in 中 shows `TW-*.png` files. Drop a new `EN-/TW-` pair into `public/advertisement/` to add a slide — no code change needed.
- `/invoice` always renders English regardless of cookie value (out of scope for this delivery).
- Mobile (375px): toggle is reachable, doesn't overlap the centered logo or safe-area chrome.

### Intro video — `/`
- First visit in a fresh browser session: intro plays.
- Navigate to `/gallery` and back to `/`: no intro.
- Open in a new private/incognito window: intro plays again.

### Sub-nav (sticky under logo, every page)
- Labels read: **Home · Lookbook · Customize · Shop**.
- Active tab gets the white underline; Home only highlights on `/` (not on nested routes).
- On narrow phones the bar scrolls horizontally instead of wrapping.

### `/gallery`
- Advertisement panel renders above the photo carousel, populated from `public/advertisement/` by locale prefix (`EN-*.png` / `TW-*.png`).
- Carousel still snaps between bag photos; size visualizer updates when an image is selected.
- Drop a new `EN-Foo.png` / `TW-Foo.png` pair into `public/advertisement/` and the slide appears on next reload — no code change needed.

### Share dock (bottom-right, every page except `/invoice`)
- Tap once → six platform icons rise vertically with a ~45ms stagger.
- Tap outside / press Esc → dock closes.
- WhatsApp / Facebook / X / Reddit: open real share endpoints in a new tab with the page URL pre-filled.
- Instagram / TikTok: copy the page URL to clipboard, open the platform homepage, show a toast confirming the copy.
- On `/invoice` the dock is hidden so it doesn't crowd the export bar.

### Open Graph / Twitter card
- Paste the site URL into Slack, iMessage, WhatsApp, or Twitter. The unfurl should show the painted bag (five touching color bands) on a dark gradient with brand text.
- If the painted bag looks gray / missing bands, re-run `npm run build:og` and redeploy.

### Notify-me (Coming Soon card on `/gallery`)
- Click the placeholder card; the email field fades in.
- Submit a valid email → success state; an email lands in the ops inbox via Resend.
- Submit an invalid email → inline error, no network call.

## Known good baseline

- `npx tsc --noEmit` exits 0.
- `npm run lint` reports 4 errors + 1 warning, all in pre-existing files (`PngOverlayLayer.tsx`, `SizeVisualizer.tsx`, `customize/page.tsx`, `invoice/page.tsx`, `opengraph-image.tsx`). New code should not add to this count.
