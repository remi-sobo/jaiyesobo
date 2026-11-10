#!/usr/bin/env python3
"""Draw the on-screen graphics for an On The Court episode.

Usage (from the repo root):
  python3 .claude/skills/on-the-court-edit/scripts/build_cards.py podcast/episodes/episode-03

Reads   <episode>/transcript/graphics-cues.json
Writes  <episode>/work/cards/<id>.png   one 1920x1080 picture per cue. Side cards have a clear background.

Uses Google Chrome (headless) to draw, and loads the show fonts (Fraunces, Inter, JetBrains Mono)
from Google Fonts, so it needs the internet. No episode content leaves the Mac.
"""
import html
import json
import subprocess
import sys
from pathlib import Path

CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
BONE, RED, MUTE, BLACK = "#F5F1EA", "#E63946", "#8a8a8a", "#0a0a0a"

HEAD = f"""<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,600;0,9..144,900;1,9..144,600;1,9..144,900&family=Inter:wght@400;600&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
*{{box-sizing:border-box;margin:0}}
html,body{{width:1920px;height:1080px;overflow:hidden;background:transparent;color:{BONE};font-family:Inter,sans-serif}}
.mono{{font-family:"JetBrains Mono",monospace;letter-spacing:.14em;text-transform:uppercase;color:{MUTE}}}
.disp{{font-family:Fraunces,serif;font-weight:900;line-height:.98}}
.red{{color:{RED}}}
.card{{position:absolute;left:70px;top:80px;width:640px;background:rgba(10,10,10,.94);border-left:10px solid {RED};
  padding:36px 42px 38px;box-shadow:0 30px 80px rgba(0,0,0,.55)}}
.rule{{height:1px;background:rgba(245,241,234,.15);margin:26px 0 8px}}
.row{{display:flex;justify-content:space-between;align-items:baseline;margin-top:16px;gap:20px}}
.row .v{{font-size:31px;font-weight:600;text-align:right}}
.tag{{font-family:"JetBrains Mono",monospace;font-size:17px;letter-spacing:.12em;margin-left:14px;padding:3px 9px;border:1px solid}}
.opt{{font-size:29px;font-weight:600;margin-top:13px}}
.big{{display:flex;gap:40px;margin-top:20px}}
.big .n{{font-family:"JetBrains Mono",monospace;font-size:96px;font-weight:500;line-height:1.05}}
</style></head><body>"""


def e(s):
    return html.escape(str(s))


def kicker(s, size=21):
    return f'<div class="mono" style="font-size:{size}px">' + f' <span class="red">/</span> '.join(e(p.strip()) for p in s.split("/")) + "</div>"


def title_line(s):
    if s.startswith("or "):
        return f'<span style="font-style:italic;font-weight:600;color:{MUTE};font-size:.68em">or</span> {e(s[3:])}'
    return e(s)


def side(c):
    size = 62 if max(len(t) for t in c["title"]) <= 15 else 54
    h = [f'<div class="card">', kicker(c["kicker"]),
         f'<div class="disp" style="font-size:{size}px;margin-top:16px">' + "<br>".join(title_line(t) for t in c["title"]) + "</div>"]
    if c.get("sub"):
        h.append(f'<div style="font-size:25px;color:{MUTE};margin-top:12px">{e(c["sub"])}</div>')
    h.append('<div class="rule"></div>')
    for o in c.get("options", []):
        h.append(f'<div class="opt">{e(o)}</div>')
    for r in c.get("rows", []):
        tag = ""
        if len(r) > 2 and r[2]:
            col = RED if r[2] == "miss" else BONE
            tag = f'<span class="tag" style="color:{col};border-color:{col}">{e(r[2].upper())}</span>'
        h.append(f'<div class="row"><div class="mono" style="font-size:20px">{e(r[0])}</div><div class="v">{e(r[1])}{tag}</div></div>')
    if c.get("big"):
        h.append('<div class="big">')
        for name, num, note in c["big"]:
            col = RED if str(num).startswith("-") else BONE
            h.append(f'<div style="flex:1"><div class="mono" style="font-size:20px">{e(name)}</div>'
                     f'<div class="n" style="color:{col}">{e(num)}</div>'
                     f'<div style="font-size:22px;color:{MUTE}">{e(note)}</div></div>')
        h.append("</div>")
    if c.get("result"):
        lab, a, b = c["result"]
        h.append(f'<div class="rule" style="margin-top:22px"></div><div class="row"><div class="mono" style="font-size:20px">{e(lab)}</div>'
                 f'<div style="font-family:\'JetBrains Mono\',monospace;font-size:31px;text-align:right"><span class="red">{e(a)}</span>'
                 f' &nbsp;{e(b)}</div></div>')
    h.append("</div>")
    return "".join(h)


def full(c):
    return (f'<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;'
            f'background:radial-gradient(ellipse at 50% 40%,#1a1a1a 0%,{BLACK} 70%)">'
            + kicker(c["kicker"], 28) +
            f'<div style="display:flex;align-items:center;gap:70px;margin-top:50px">'
            f'<div class="disp" style="font-size:230px">{e(c["left"])}</div>'
            f'<div class="disp red" style="font-size:90px;font-style:italic">vs</div>'
            f'<div class="disp" style="font-size:230px">{e(c["right"])}</div></div>'
            f'<div style="width:220px;height:8px;background:{RED};margin-top:60px"></div>'
            f'<div style="margin-top:40px">' + kicker(c["footer"], 24) + "</div></div>")


def main():
    ep = Path(sys.argv[1]).resolve()
    cues = json.loads((ep / "transcript" / "graphics-cues.json").read_text())["cues"]
    out = ep / "work" / "cards"
    out.mkdir(parents=True, exist_ok=True)
    for c in cues:
        if c.get("off"):
            continue
        page = out / f"{c['id']}.html"
        page.write_text(HEAD + (full(c) if c["layout"] == "full" else side(c)) + "</body></html>")
        png = out / f"{c['id']}.png"
        subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", "--window-size=1920,1080",
                        "--default-background-color=00000000", "--virtual-time-budget=8000",
                        f"--screenshot={png}", page.as_uri()], capture_output=True)
        if not png.exists():
            sys.exit(f"Could not draw {c['id']}. Is Google Chrome installed and is the internet on?")
        print("drew", png.name)


if __name__ == "__main__":
    main()
