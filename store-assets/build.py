#!/usr/bin/env python3
"""Generate Chrome Web Store + README marketing assets as HTML.

Renders the real monkbrowse popup design (light theme) with realistic baked
data, on a branded frame. Rendered to PNG by render.sh (headless Chrome @2x).
"""
import pathlib

OUT = pathlib.Path(__file__).parent

MARK = '''<svg width="26" height="26" viewBox="0 0 128 128" fill="none" xmlns="http://www.w3.org/2000/svg">
<defs><linearGradient id="mb" x1="14" y1="64" x2="116" y2="64" gradientUnits="userSpaceOnUse">
<stop offset="0" stop-color="#E9A294"/><stop offset="0.42" stop-color="#C2A4CD"/><stop offset="0.72" stop-color="#A2ABDE"/><stop offset="1" stop-color="#88B2EC"/></linearGradient></defs>
<rect x="54" y="20" width="60" height="46" rx="11" stroke="url(#mb)" stroke-width="8" fill="none" stroke-opacity="0.5"/>
<rect x="16" y="42" width="72" height="58" rx="14" stroke="url(#mb)" stroke-width="9" fill="none"/>
<path d="M16 61 H88" stroke="url(#mb)" stroke-width="8" stroke-linecap="round"/>
<circle cx="30" cy="52" r="3.2" fill="url(#mb)"/><circle cx="42" cy="52" r="3.2" fill="url(#mb)"/><circle cx="54" cy="52" r="3.2" fill="url(#mb)"/></svg>'''

GLOBE = '<svg class="favimg" viewBox="0 0 24 24" fill="none"><circle cx="12" cy="12" r="9" stroke="#aeb2bd" stroke-width="1.6"/><path d="M3 12h18M12 3c2.5 2.4 2.5 15.6 0 18M12 3c-2.5 2.4-2.5 15.6 0 18" stroke="#aeb2bd" stroke-width="1.6"/></svg>'

CARD_CSS = '''
.card{width:400px;background:#fff;border-radius:20px;box-shadow:0 30px 70px rgba(23,24,43,.22),0 4px 12px rgba(23,24,43,.08);overflow:hidden;font:13px/1.5 -apple-system,"Segoe UI",Roboto,system-ui,sans-serif;color:#17182b}
.ph{display:flex;align-items:center;gap:9px;padding:15px 16px 10px}
.pbrand{font-size:15px;font-weight:650;letter-spacing:-.01em;flex:1}
.pstat{display:inline-flex;align-items:center;gap:6px;font-size:12px;color:#1a8f3c;font-weight:500}
.pstat .d{width:8px;height:8px;border-radius:50%;background:#1a8f3c;box-shadow:0 0 0 3px rgba(26,143,60,.15)}
.ptabs{display:flex;gap:20px;padding:0 16px;border-bottom:1px solid #ececf1}
.ptab{font-size:13px;font-weight:600;color:#6b7280;padding:9px 1px 10px;position:relative}
.ptab.on{color:#4b57c4}
.ptab.on::after{content:"";position:absolute;left:0;right:0;bottom:-1px;height:2px;background:#4b57c4;border-radius:2px 2px 0 0}
.phd{display:flex;align-items:center;gap:6px;padding:12px 16px 8px}
.phd .t{font-size:13px;font-weight:650}
.phd .i{width:15px;height:15px;border-radius:50%;border:1.3px solid #aeb2bd;color:#aeb2bd;display:grid;place-items:center;font-size:10px;font-style:italic;font-weight:700}
.phd .c{margin-left:auto;font-size:12px;color:#6b7280}
.psearch{margin:0 16px 8px;display:flex;align-items:center;gap:7px;background:#f6f6fa;border:1px solid #ececf1;border-radius:9px;padding:9px 10px;color:#aeb2bd}
.psearch svg{flex:none}
.psearch .ph2{color:#aeb2bd;flex:1}
.pshareall{padding:0 16px 8px;text-align:right;margin-top:-4px}
.pshareall span{color:#4b57c4;font-weight:600;font-size:12px}
.phint{margin:0 16px 10px;font-size:11.5px;color:#aeb2bd}
.pctx{margin:0 16px 12px;padding:9px 11px;border-radius:9px;background:#eef1fd;color:#17182b;font-size:12px;display:flex;align-items:center;gap:8px}
.pctx .pulse{width:8px;height:8px;border-radius:50%;background:#1a8f3c;flex:none}
.pctx b{font-weight:650}
.plist{padding:2px 8px 12px}
.pgroup{padding:10px 8px 4px;font-size:11px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#aeb2bd}
.prow{display:grid;grid-template-columns:24px 1fr auto;align-items:center;gap:11px;padding:10px 8px;border-radius:11px}
.prow.acting{background:#eef1fd;box-shadow:inset 0 0 0 1.5px #4b57c4}
.fav{width:18px;height:18px;justify-self:center;border-radius:5px;display:grid;place-items:center;font-size:10px;font-weight:800;color:#fff;overflow:hidden}
.favimg{width:18px;height:18px}
.meta{min-width:0}
.title{font-size:13px;font-weight:450;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sub{display:flex;align-items:center;gap:6px;font-size:12px;color:#6b7280}
.livedot{width:6px;height:6px;border-radius:50%;background:#1a8f3c}
.end{display:flex;align-items:center;gap:7px}
.num{font:700 11px ui-monospace,SFMono-Regular,Menlo,monospace;color:#3a3f9e;background:#ecedfb;border-radius:6px;padding:2px 5px}
.sw{position:relative;width:34px;height:20px;border-radius:999px;background:#e3e4e9;flex:none}
.sw.on{background:linear-gradient(90deg,#e9a294,#a2abde 68%,#88b2ec)}
.sw::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:50%;background:#fff;box-shadow:0 1px 2px rgba(20,16,28,.22)}
.sw.on::after{transform:translateX(14px)}
'''

def fav(bg, letter, img=None):
    if img == "globe":
        return f'<span class="fav" style="background:transparent">{GLOBE}</span>'
    return f'<span class="fav" style="background:{bg}">{letter}</span>'

def row(favbg, favletter, title, host, shared=False, slot=None, active=False, acting=False, img=None):
    dot = '<span class="livedot"></span>' if active else ''
    num = f'<span class="num">#{slot}</span>' if shared else ''
    sw = 'sw on' if shared else 'sw'
    cls = 'prow acting' if acting else 'prow'
    return f'''<div class="{cls}">{fav(favbg,favletter,img)}
<span class="meta"><div class="title">{title}</div><div class="sub"><span>{host}</span>{dot}</div></span>
<span class="end">{num}<span class="{sw}"></span></span></div>'''

SEARCH = '''<div class="psearch"><svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="5" stroke="currentColor" stroke-width="1.6"/><path d="M11 11l3.5 3.5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><span class="ph2">Search tabs</span></div>'''

def card(count, body, ctx='', hint='', shareall=True):
    sa = '<div class="pshareall"><span>Share all</span></div>' if shareall else ''
    return f'''<div class="card">
<div class="ph">{MARK}<span class="pbrand">monkbrowse</span><span class="pstat"><span class="d"></span>Connected</span></div>
<div class="ptabs"><span class="ptab on">Tabs</span><span class="ptab">Settings</span><span class="ptab">Help</span></div>
<div class="phd"><span class="t">Tabs the AI can use</span><span class="i">i</span><span class="c">{count}</span></div>
{SEARCH}{sa}{ctx}{hint}
<div class="plist">{body}</div>
</div>'''

# Real-ish favicons via colored tiles
LI = ("#0A66C2", "in")
GH = ("#181717", "")  # use globe-ish dark
NOTION = ("#111", "N")
GM = ("#EA4335", "M")
FIG = ("#1E1E1E", "F")
YT = ("#FF0000", "▶")
DOCS = ("#4285F4", "D")

SHARED_ROWS = (
    '<div class="pgroup">Shared</div>'
    + row(*LI, "Saved Posts | LinkedIn", "linkedin.com", shared=True, slot=1)
    + row("#0d1117", "GH", "monkfromearth/monkbrowse", "github.com", shared=True, slot=2)
    + '<div class="pgroup">Other tabs</div>'
    + row(*DOCS, "Q3 Roadmap", "docs.google.com", active=True)
    + row(*GM, "Inbox (12)", "mail.google.com")
    + row(*FIG, "monkbrowse — brand", "figma.com")
)

ALL_OFF = (
    row(*LI, "Saved Posts | LinkedIn", "linkedin.com")
    + row("#0d1117", "GH", "monkfromearth/monkbrowse", "github.com", active=True)
    + row(*DOCS, "Q3 Roadmap", "docs.google.com")
    + row(*GM, "Inbox (12)", "mail.google.com")
    + row(*FIG, "monkbrowse — brand", "figma.com")
    + row(*YT, "Build in public", "youtube.com")
)

ACTING_ROWS = (
    '<div class="pgroup">Shared</div>'
    + row(*LI, "Saved Posts | LinkedIn", "linkedin.com", shared=True, slot=1, acting=True)
    + row("#0d1117", "GH", "monkfromearth/monkbrowse", "github.com", shared=True, slot=2)
    + '<div class="pgroup">Other tabs</div>'
    + row(*DOCS, "Q3 Roadmap", "docs.google.com", active=True)
    + row(*GM, "Inbox (12)", "mail.google.com")
)

ACTING_CTX = '<div class="pctx"><span class="pulse"></span>AI is working on <b>#1</b>&nbsp;·&nbsp;linkedin.com</div>'
HINT = '<div class="phint">Flip a tab on to let the AI use it.</div>'

FRAME_CSS = '''
*{margin:0;padding:0;box-sizing:border-box}
html,body{width:1280px;height:800px;overflow:hidden}
body{font-family:-apple-system,"Segoe UI",Roboto,system-ui,sans-serif;
background:radial-gradient(1000px 620px at 88% -12%,rgba(136,178,236,.22),transparent 60%),radial-gradient(880px 620px at -10% 112%,rgba(233,162,148,.20),transparent 55%),#f5f4fb;
color:#17182b;position:relative}
.wrap{display:flex;align-items:center;height:100%;padding:0 84px;gap:60px}
.left{flex:1;max-width:600px}
.eyebrow{display:inline-flex;align-items:center;gap:9px;font-size:15px;font-weight:700;color:#4b57c4;margin-bottom:26px}
h1{font-size:56px;line-height:1.06;letter-spacing:-.03em;font-weight:800;max-width:560px}
h1 .hl{background:linear-gradient(90deg,#e9a294,#a2abde 60%,#88b2ec);-webkit-background-clip:text;background-clip:text;color:transparent}
.lead{margin-top:20px;font-size:21px;line-height:1.5;color:#565a6e;max-width:520px}
.lead b{color:#17182b;font-weight:650}
.chips{display:flex;gap:10px;margin-top:30px;flex-wrap:wrap}
.chip{font-size:14px;font-weight:600;color:#17182b;background:#fff;border:1px solid #e7e6f0;border-radius:10px;padding:9px 15px;display:flex;align-items:center;gap:8px;box-shadow:0 2px 6px rgba(23,24,43,.05)}
.chip .cd{width:8px;height:8px;border-radius:50%}
.right{flex:none;display:flex;justify-content:center;align-items:center;width:520px}
.cardscale{transform:scale(1.18);transform-origin:center}
'''

def frame(eyebrow, h1, sub, chips, card_html):
    chip_html = ''.join(
        f'<span class="chip"><span class="cd" style="background:{c[1]}"></span>{c[0]}</span>' for c in chips)
    return f'''<!doctype html><html><head><meta charset="utf-8"><style>{FRAME_CSS}{CARD_CSS}</style></head>
<body><div class="wrap"><div class="left">
<div class="eyebrow">{MARK}&nbsp;monkbrowse</div>
<h1>{h1}</h1><p class="lead">{sub}</p><div class="chips">{chip_html}</div>
</div><div class="right"><div class="cardscale">{card_html}</div></div></div></body></html>'''

# ---- Screenshot 1: core value ----
(OUT / "screenshot-1.html").write_text(frame(
    "monkbrowse",
    'Let your AI drive the <span class="hl">tabs you share</span>.',
    'It runs in your <b>real, logged-in Chrome</b>. You choose which tabs it can touch, and each gets a number.',
    [("Already logged in", "#1a8f3c"), ("100% local", "#4b57c4"), ("Many tabs & profiles", "#e9a294")],
    card("2 of 5 shared", SHARED_ROWS),
))

# ---- Screenshot 2: control / privacy ----
(OUT / "screenshot-2.html").write_text(frame(
    "monkbrowse",
    'By default, it sees <span class="hl">nothing</span>.',
    'Every tab has a share toggle. Only the tabs you flip on become visible to the AI. Your banking tab stays invisible.',
    [("You choose per tab", "#4b57c4"), ("Unshare anytime", "#e9a294")],
    card("0 of 6 shared", ALL_OFF, hint=HINT),
))

# ---- Screenshot 3: live activity ----
(OUT / "screenshot-3.html").write_text(frame(
    "monkbrowse",
    'Watch it work, <span class="hl">tab by tab</span>.',
    'A live indicator shows exactly which tab the AI is acting on, right now. No hidden background automation.',
    [("Live activity", "#1a8f3c"), ("You stay in control", "#4b57c4")],
    card("2 of 4 shared", ACTING_ROWS, ctx=ACTING_CTX),
))

# ---- Marquee tile 1400x560 ----
(OUT / "tile-marquee.html").write_text(f'''<!doctype html><html><head><meta charset="utf-8"><style>{FRAME_CSS}{CARD_CSS}
html,body{{width:1400px;height:560px}}
.mq{{display:flex;align-items:center;justify-content:center;height:100%;padding:0 90px;gap:64px}}
.mqmark svg{{width:120px;height:120px}}
.mqh{{font-size:60px;font-weight:800;letter-spacing:-.03em;line-height:1.05}}
.mqs{{font-size:24px;color:#565a6e;margin-top:16px;max-width:640px;line-height:1.45}}
</style></head><body><div class="mq"><div class="mqmark">{MARK.replace('width="26" height="26"','width="120" height="120"')}</div>
<div><div class="mqh">monkbrowse</div><div class="mqs">Let your AI drive the Chrome tabs you choose to share. Logged in, local, private.</div></div></div></body></html>''')

# ---- Small tile 440x280 ----
(OUT / "tile-small.html").write_text(f'''<!doctype html><html><head><meta charset="utf-8"><style>{FRAME_CSS}
html,body{{width:440px;height:280px}}
.st{{display:flex;flex-direction:column;justify-content:center;height:100%;padding:0 34px}}
.stmark svg{{width:60px;height:60px}}
.sth{{font-size:34px;font-weight:800;letter-spacing:-.02em;margin-top:14px}}
.sts{{font-size:15px;color:#565a6e;margin-top:8px;line-height:1.4}}
</style></head><body><div class="st"><div class="stmark">{MARK.replace('width="26" height="26"','width="60" height="60"')}</div>
<div class="sth">monkbrowse</div><div class="sts">AI drives the Chrome tabs you share.</div></div></body></html>''')

print("wrote:", ", ".join(p.name for p in sorted(OUT.glob("*.html"))))
