# Testing Checklist

Smoke-test pass for the latest deploy. Run through this on the Vercel preview URL after each push.

## Recent commits live

```
1328de2  feat: replace WhatsApp pin with multi-platform share dock
82cbc15  feat: gate intro video to once per browser session
40c2e97  feat: rename sub-nav links and add Home
33a71c1  feat: sticky sub-nav + dedicated /gallery route with ad panel
e1c64e5  feat: notify-me email capture on Coming Soon gallery card
5b506da  feat: floating WhatsApp button + site-wide metadata
de217ef  feat: dynamic OG/Twitter card with painted-bag hero
```

## What to eyeball

### Intro video — `/`
- First visit in a fresh browser session: intro plays.
- Navigate to `/gallery` and back to `/`: no intro.
- Open in a new private/incognito window: intro plays again.

### Sub-nav (sticky under logo, every page)
- Labels read: **Home · Lookbook · Customize · Shop**.
- Active tab gets the white underline; Home only highlights on `/` (not on nested routes).
- On narrow phones the bar scrolls horizontally instead of wrapping.

### `/gallery`
- Advertisement panel (`Test.png`) renders above the photo carousel.
- Carousel still snaps between bag photos; size visualizer updates when an image is selected.
- Drop more PNGs into `public/advertisement/` and add their filenames to `AD_IMAGES` in `src/app/gallery/page.tsx` to enable carousel dots.

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
- `npm run lint` reports 4 errors + 1 warning, all in pre-existing files (`PngOverlayLayer.tsx`, `SizeVisualizer.tsx`, `customize/page.tsx`, `invoice/page.tsx`). New code should not add to this count.
