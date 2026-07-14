# Store & marketing assets

Branded PNGs for the Chrome Web Store listing and the READMEs. The screenshots
recreate the **real popup design** (light theme) with realistic data, on a
branded frame — no manual capture needed.

## Regenerate

```bash
bash store-assets/render.sh
```

Renders each HTML with headless Chrome at 2× and downscales to the exact size
(crisp text). Edit `build.py` to change copy/data, then re-run.

| File | Size | Use |
|---|---|---|
| `screenshot-1.png` | 1280×800 | Store screenshot 1 · README hero — drive shared tabs |
| `screenshot-2.png` | 1280×800 | Store screenshot 2 — by default it sees nothing (privacy) |
| `screenshot-3.png` | 1280×800 | Store screenshot 3 — live "AI is working on #1" |
| `tile-small.png` | 440×280 | Small promo tile |
| `tile-marquee.png` | 1400×560 | Marquee promo tile |

Requires a local Chrome at `/Applications/Google Chrome.app` and macOS `sips`.
