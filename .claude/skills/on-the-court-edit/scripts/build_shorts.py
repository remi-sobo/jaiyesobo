#!/usr/bin/env python3
"""Build vertical clips (YouTube Shorts) from an On The Court episode.

Usage (from the repo root):
  python3 .claude/skills/on-the-court-edit/scripts/build_shorts.py podcast/episodes/episode-03 [short-id]

Reads   <episode>/transcript/shorts.json, words.json, cut-list.json (for the raw file's path)
        <skill>/style.json ("shorts" block), podcast/sfx/kit.json, podcast/sfx/memes/
Writes  <episode>/output/shorts/<id>.mp4   1080x1920, 24 fps

Each short is cut straight from the raw file, which is only read. A 'hold' freezes on
Jaiye's face while a sound plays, so a sound never covers his words. Captions and the
title band are drawn with headless Chrome (fonts from Google Fonts, so it needs the internet).
"""
import html
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_cut import prepare_sound  # noqa: E402

SKILL = Path(__file__).resolve().parent.parent
REPO = SKILL.parent.parent.parent
CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
FONTS = ('<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,900;1,9..144,900'
         '&family=Inter:wght@800;900&family=JetBrains+Mono:wght@500&display=swap" rel="stylesheet">')


def shot(page_html, png, w, h, work):
    page = work / (png.stem + ".html")
    page.write_text(f'<!doctype html><html><head><meta charset="utf-8">{FONTS}<style>*{{box-sizing:border-box;margin:0}}'
                    f'html,body{{width:{w}px;height:{h}px;overflow:hidden;background:transparent;color:#F5F1EA}}'
                    f'.mono{{font-family:"JetBrains Mono",monospace;letter-spacing:.16em;text-transform:uppercase}}'
                    f'.disp{{font-family:Fraunces,serif;font-weight:900;line-height:.98}}</style></head><body>{page_html}</body></html>')
    png.unlink(missing_ok=True)
    for _ in range(3):  # headless Chrome sometimes hangs, so give it a time limit and try again
        try:
            subprocess.run([CHROME, "--headless=new", "--disable-gpu", "--hide-scrollbars", f"--window-size={w},{h}",
                            f"--user-data-dir={work / 'chrome-profile'}",
                            "--default-background-color=00000000", "--virtual-time-budget=6000",
                            f"--screenshot={png}", page.as_uri()], capture_output=True, timeout=60)
        except subprocess.TimeoutExpired:
            subprocess.run(["pkill", "-f", str(work / "chrome-profile")])
        if png.exists():
            break
    if not png.exists():
        sys.exit(f"Could not draw {png.name}. Is Google Chrome installed and is the internet on?")
    return png


def caption_chunks(words, a, b, shift):
    """Words spoken in [a, b] of the raw file, grouped two or three at a time, in clip time."""
    inside = [w for w in words if a - 0.05 <= w["start"] < b]
    out, cur = [], []
    for w in inside:
        cur.append(w)
        text = " ".join(x["word"] for x in cur)
        if len(cur) == 3 or len(text) > 13 or re.search(r"[.?!,]$", w["word"]):
            out.append(cur); cur = []
    if cur:
        out.append(cur)
    res = []
    for i, c in enumerate(out):
        s = max(c[0]["start"], a) - a + shift
        e = (out[i + 1][0]["start"] if i + 1 < len(out) else min(c[-1]["end"] + 0.25, b)) - a + shift
        res.append({"text": " ".join(x["word"] for x in c), "from": round(s, 3), "to": round(max(e, s + 0.25), 3)})
    return res


def build(ep, short, style, words, raw, kit):
    FPS = short.get("fps", 24)
    S = {**style["shorts"], **short.get("layout", {})}  # a short can override the layout, e.g. for phone video
    W, H, vy, vh = 1080, 1920, S["video_top"], S["video_height"]
    cw, ch, cx, cy = S["crop"]["width"], S["crop"].get("height", 1080), S["crop"]["x"], S["crop"].get("y", 0)
    z = S["hold_zoom"]
    work = ep / "work" / "shorts" / short["id"]
    work.mkdir(parents=True, exist_ok=True)
    out = ep / "output" / "shorts"
    out.mkdir(parents=True, exist_ok=True)

    def sound(name, cap):
        src = REPO / "podcast" / "sfx" / kit[name]["file"] if name in kit else None
        if not src or not src.exists():
            hits = list((REPO / "podcast" / "sfx" / "memes").glob(name + ".*")) + list((REPO / "podcast" / "sfx" / "custom").glob(name + ".*"))
            if not hits:
                sys.exit(f"No sound named {name} in the kit, memes/, or custom/.")
            src = hits[0]
        dst = work / f"{name}.wav"
        length = prepare_sound(src, dst)
        return dst, min(length, cap, kit.get(name, {}).get("max_seconds", 99))

    inputs, g, vlabels, alabels, sfx, caps, t = [], [], [], [], [], [], 0.0
    last_end, strips, card_now = None, [], None
    for p in short["pieces"]:
        i = len(vlabels)
        if "clip" in p:
            a, b = p["clip"]
            d = round((b - a) * FPS) / FPS
            n = len(inputs)
            inputs.append(["-ss", f"{a:.3f}", "-t", f"{d:.4f}", "-i", str(raw)])
            g.append(f"[{n}:v]crop={cw}:{ch}:{cx}:{cy},scale={W}:{vh},setsar=1,fps={FPS},format=yuv420p,"
                     f"trim=duration={d:.4f},setpts=PTS-STARTPTS[v{i}]")
            g.append(f"[{n}:a:0]aresample=48000,aformat=channel_layouts=stereo,atrim=duration={d:.4f},asetpts=PTS-STARTPTS,"
                     f"afade=t=in:st=0:d=0.012,afade=t=out:st={d - 0.012:.4f}:d=0.012[a{i}]")
            caps += [{**c, "voice": p.get("voice", "jaiye")} for c in caption_chunks(words, a, b, t)]
            card_now = p.get("card")
            if card_now:
                strips.append({"card": card_now, "from": t, "to": t + d})
            last_end, t = b, t + d
        elif "hold" in p:
            wav, length = sound(p["hold"], p.get("max", 99))
            d = round((length + 0.2) * FPS) / FPS
            n = len(inputs)
            inputs.append(["-ss", f"{last_end - 2 / FPS:.3f}", "-t", "0.2", "-i", str(raw)])
            zw, zh = int(cw / z) // 2 * 2, int(ch / z) // 2 * 2
            zx = min(max(S["face"]["x"] - zw // 2, cx), cx + cw - zw)
            zy = min(max(S["face"]["y"] - zh // 2, cy), cy + ch - zh)
            g.append(f"[{n}:v]trim=end_frame=1,crop={zw}:{zh}:{zx}:{zy},scale={W}:{vh},setsar=1,"
                     f"tpad=stop_mode=clone:stop_duration={d + 1:.3f},fps={FPS},trim=duration={d:.4f},"
                     f"setpts=PTS-STARTPTS,format=yuv420p[v{i}]")
            g.append(f"anullsrc=r=48000:cl=stereo,atrim=duration={d:.4f}[a{i}]")
            sfx.append({"wav": wav, "at": t + 0.05, "len": length, "name": p["hold"]})
            if card_now:
                strips[-1]["to"] = t + d
            t += d
        else:
            continue
        vlabels.append(f"[v{i}]"); alabels.append(f"[a{i}]")
    body = t
    end = [p for p in short["pieces"] if "end" in p]
    end_len = S["end_card_seconds"]
    if end and end[0]["end"]:
        wav, length = sound(end[0]["end"], end_len - 0.2)
        sfx.append({"wav": wav, "at": body + 0.1, "len": length, "name": end[0]["end"]})
    total = body + end_len

    # Pictures: the title band, the closing card, and one picture per caption.
    hook = "<br>".join(html.escape(x) for x in short["hook"])
    frame = shot(
        f'<div style="position:absolute;left:0;top:0;width:{W}px;height:{vy}px;background:#0a0a0a;padding:44px 60px 0">'
        f'<div class="mono" style="font-size:30px;color:#E63946">{html.escape(short["kicker"])}</div>'
        f'<div class="disp" style="font-size:{S["hook_size"]}px;margin-top:14px">{hook}</div></div>'
        f'<div style="position:absolute;left:0;top:{vy + vh}px;width:{W}px;height:{H - vy - vh}px;background:#0a0a0a;'
        f'display:flex;align-items:center;justify-content:space-between;padding:0 60px 30px">'
        f'<div style="width:120px;height:8px;background:#E63946"></div>'
        f'<div class="mono" style="font-size:30px;color:#8a8a8a">jaiyesobo.com</div></div>',
        work / "frame.png", W, H, work)
    card = shot(
        f'<div style="position:absolute;inset:0;background:radial-gradient(ellipse at 50% 42%,#1a1a1a 0%,#0a0a0a 70%);'
        f'display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center">'
        + ("".join([f'<div class="mono" style="font-size:34px;color:#E63946">{html.escape(short.get("verdict_label", "The verdict"))}</div>',
                    f'<div class="disp" style="font-size:150px;margin:26px 50px 70px;font-style:italic">' + "<br>".join(html.escape(x) for x in short["verdict"]) + "</div>"])
           if short.get("verdict") else "") +
        f'<div class="mono" style="font-size:34px;color:#8a8a8a">{"More on" if short.get("verdict") else "Full episode"}</div>'
        f'<div class="disp" style="font-size:{90 if short.get("verdict") else 170}px;margin-top:30px">On The{" " if short.get("verdict") else "<br>"}Court</div>'
        f'<div style="width:200px;height:10px;background:#E63946;margin-top:50px"></div>'
        f'<div class="mono" style="font-size:38px;margin-top:46px">jaiyesobo.com</div></div>',
        work / "card.png", W, H, work)
    cap_h = 300

    # All captions are drawn on one tall sheet in a single Chrome run, then sliced.
    punch = {re.sub(r"[^a-z0-9]", "", w.lower()) for w in short.get("punch", [])}

    def cap_html(c):
        if c["voice"] != "jaiye":  # the person asking, off camera
            return (f'<span style="font-size:{int(S["caption_size"] * 0.62)}px;font-weight:800;color:#d8d3ca;'
                    f'-webkit-text-stroke:10px #0a0a0a;paint-order:stroke fill">{html.escape(c["text"])}</span>')
        out = []
        for w in c["text"].split():
            hot = re.sub(r"[^a-z0-9]", "", w.lower()) in punch
            out.append(f'<span style="color:{"#FF2D3D" if hot else "#F5F1EA"}">{html.escape(w)}</span>')
        return " ".join(out)

    rows = "".join(
        f'<div style="height:{cap_h}px;display:flex;align-items:center;justify-content:center;text-align:center;'
        f'font-family:Inter,sans-serif;font-weight:900;font-size:{S["caption_size"]}px;line-height:1.05;text-transform:uppercase;'
        f'-webkit-text-stroke:14px #0a0a0a;paint-order:stroke fill;padding:0 50px"><div>{cap_html(c)}</div></div>'
        for c in caps)
    sheet = shot(rows, work / "captions.png", W, cap_h * len(caps), work)
    cap_pngs = []
    for k in range(len(caps)):
        png = work / f"cap{k:03d}.png"
        subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(sheet), "-vf",
                        f"crop={W}:{cap_h}:0:{k * cap_h}", str(png)], check=True)
        cap_pngs.append(png)

    sh = H - vy - vh

    def strip_html(c):
        tag = lambda r: (f'<span style="font-family:\'JetBrains Mono\',monospace;font-size:20px;letter-spacing:.1em;margin-left:12px;'
                         f'padding:2px 8px;border:2px solid;color:{"#E63946" if r[2] == "miss" else "#F5F1EA"}">{html.escape(r[2].upper())}</span>'
                         if len(r) > 2 and r[2] else "")
        h = [f'<div style="position:absolute;inset:0;background:#0a0a0a;border-left:14px solid #E63946;padding:26px 50px 0 46px;font-family:Inter,sans-serif">',
             f'<div class="mono" style="font-size:24px;color:#8a8a8a">{html.escape(c["kicker"])}</div>',
             f'<div class="disp" style="font-size:58px;margin-top:8px;white-space:nowrap">{html.escape(c["title"])}</div>',
             '<div style="display:flex;gap:44px;margin-top:14px;align-items:flex-end">']
        for r in c.get("rows", []):
            h.append(f'<div><div class="mono" style="font-size:24px;color:#8a8a8a">{html.escape(r[0])}</div>'
                     f'<div style="font-size:48px;font-weight:800;margin-top:2px;white-space:nowrap">{html.escape(r[1])}{tag(r)}</div></div>')
        for name, num in c.get("big", []):
            col = "#E63946" if str(num).startswith("-") else "#F5F1EA"
            h.append(f'<div><div class="mono" style="font-size:20px;color:#8a8a8a">{html.escape(name)}</div>'
                     f'<div style="font-family:\'JetBrains Mono\',monospace;font-size:92px;line-height:1;color:{col}">{html.escape(str(num))}</div></div>')
        h.append("</div>")
        if c.get("result"):
            h.append(f'<div style="margin-top:12px;font-family:\'JetBrains Mono\',monospace;font-size:40px">'
                     f'<span style="color:#8a8a8a;font-size:20px;letter-spacing:.14em;text-transform:uppercase">{html.escape(c["result"][0])}</span>'
                     f' &nbsp;<span style="color:#E63946">{html.escape(c["result"][1])}</span> &nbsp;{html.escape(c["result"][2])}</div>')
        return "".join(h) + "</div>"

    for j, st in enumerate(strips):
        st["png"] = shot(strip_html(st["card"]), work / f"strip{j:02d}.png", W, sh, work)

    n_body = len(vlabels)
    g.append("".join(vlabels) + f"concat=n={n_body}:v=1:a=0,pad={W}:{H}:0:{vy}:color=0x0a0a0a[bodyv]")
    k = len(inputs)
    inputs.append(["-i", str(frame)])
    g.append(f"[bodyv][{k}:v]overlay=0:0[framed]")
    prev = "[framed]"
    for j, st in enumerate(strips):
        n = len(inputs)
        inputs.append(["-i", str(st["png"])])
        g.append(f"{prev}[{n}:v]overlay=0:{vy + vh}:enable='between(t,{st['from']:.3f},{st['to'] - 0.001:.3f})'[s{j}]")
        prev = f"[s{j}]"
    cap_y = vy + vh - cap_h - S["caption_bottom_margin"]
    for j, (c, png) in enumerate(zip(caps, cap_pngs)):
        n = len(inputs)
        inputs.append(["-i", str(png)])
        g.append(f"{prev}[{n}:v]overlay=0:{cap_y}:enable='between(t,{c['from']},{c['to'] - 0.001:.3f})'[c{j}]")
        prev = f"[c{j}]"
    n = len(inputs)
    inputs.append(["-loop", "1", "-framerate", str(FPS), "-t", str(end_len), "-i", str(card)])
    g.append(f"[{n}:v]fps={FPS},format=yuv420p,setsar=1,fade=t=in:st=0:d=0.2[cardv]")
    g.append(f"{prev}[cardv]concat=n=2:v=1:a=0[vout]")

    a = style["audio"]
    g.append("".join(alabels) + f"concat=n={n_body}:v=0:a=1,highpass=f={a['highpass_hz']},"
             f"loudnorm=I={S['voice_loudness_lufs']}:TP={a['true_peak_db']}:LRA=11,aresample=48000,"
             f"aformat=channel_layouts=stereo,apad=pad_dur={end_len}[voice]")
    mix = "[voice]"
    for j, s in enumerate(sfx):
        n = len(inputs)
        inputs.append(["-i", str(s["wav"])])
        ms = int(s["at"] * 1000)
        gain = S["sfx_gain"] * kit.get(s["name"], {}).get("gain", 1.0)
        g.append(f"[{n}:a]atrim=duration={s['len']:.3f},afade=t=out:st={max(0, s['len'] - 0.15):.3f}:d=0.15,"
                 f"volume={gain:.3f},adelay={ms}|{ms}[x{j}]")
        mix += f"[x{j}]"
    g.append(f"{mix}amix=inputs={len(sfx) + 1}:normalize=0:duration=first,atrim=duration={total:.3f},alimiter=limit=0.89[aout]")

    script = work / "graph.filter"
    script.write_text(";\n".join(g))
    dst = out / f"{short['id']}.mp4"
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-y"]
    for x in inputs:
        cmd += x
    cmd += ["-/filter_complex", str(script), "-map", "[vout]", "-map", "[aout]", "-t", f"{total:.3f}",
            "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-r", str(FPS), "-pix_fmt", "yuv420p",
            "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", str(dst)]
    subprocess.run(cmd, check=True)
    (out / f"{short['id']}.json").write_text(json.dumps({
        "id": short["id"], "seconds": round(total, 2), "youtube_title": short.get("youtube_title", ""),
        "sounds": [{"at": round(s["at"], 2), "sound": s["name"], "seconds": round(s["len"], 2)} for s in sfx],
        "captions": caps}, indent=1))
    print(f"{dst.name}: {total:.1f}s, {len(caps)} captions, sounds: " + ", ".join(f"{s['name']}@{s['at']:.1f}" for s in sfx))


def main():
    ep = Path(sys.argv[1]).resolve()
    only = sys.argv[2] if len(sys.argv) > 2 else None
    style = json.loads((SKILL / "style.json").read_text())
    default_words = ep / "transcript" / "words.json"
    cut = ep / "transcript" / "cut-list.json"
    kit = json.loads((REPO / "podcast" / "sfx" / "kit.json").read_text())["sounds"]
    for s in json.loads((ep / "transcript" / "shorts.json").read_text())["shorts"]:
        if not only or s["id"] == only:
            words = json.loads((ep / s["words"] if "words" in s else default_words).read_text())["words"]
            raw = ep / (s["source"] if "source" in s else json.loads(cut.read_text())["source"])
            build(ep, s, style, words, raw, kit)


if __name__ == "__main__":
    main()
