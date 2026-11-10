#!/usr/bin/env python3
"""Render an On The Court episode from its approved cut list.

Usage (from the repo root):
  python3 .claude/skills/on-the-court-edit/scripts/build_cut.py podcast/episodes/episode-03 v1 [--plan] [--sfx] [--gfx] [--until N]

--sfx adds the sound effects in transcript/sfx-cues.json.
--gfx adds the on-screen graphics in transcript/graphics-cues.json (draw them first with build_cards.py).

Reads   <episode>/transcript/cut-list.json   (must have "status": "approved")
        <episode>/transcript/pauses.json, words.json
        <skill>/style.json
Writes  <episode>/output/<slug>-<version>.mp4
        <episode>/output/<slug>-<version>.srt        captions retimed to the edit
        <episode>/output/<slug>-<version>.edit.json  which raw seconds were kept, and where they land

--plan prints the numbers and writes the edit.json without rendering.
The raw file is only read. Every cut lands on a video frame so sound and picture stay in sync.
"""
import array
import json
import re
import subprocess
import sys
import wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_transcript import build_captions, srt_time  # noqa: E402

SKILL = Path(__file__).resolve().parent.parent
REPO = SKILL.parent.parent.parent


def merge(ranges):
    out = []
    for a, b in sorted(ranges):
        if out and a <= out[-1][1]:
            out[-1][1] = max(out[-1][1], b)
        else:
            out.append([a, b])
    return out


def prepare_sound(src, dst):
    """Trim silence off both ends, bring the peak to -1 dB, and save as 48k stereo. Returns seconds."""
    trim = "silenceremove=start_periods=1:start_threshold=-45dB"
    chain = f"{trim},areverse,{trim},areverse"
    log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(src), "-af", f"{chain},volumedetect",
                          "-f", "null", "-"], capture_output=True, text=True).stderr
    peak = float(re.search(r"max_volume: ([-\d.]+)", log).group(1))
    subprocess.run(["ffmpeg", "-hide_banner", "-loglevel", "error", "-y", "-i", str(src), "-af",
                    f"{chain},volume={-1 - peak:.1f}dB", "-ar", "48000", "-ac", "2", "-c:a", "pcm_s16le", str(dst)],
                   check=True)
    with wave.open(str(dst)) as w:
        return w.getnframes() / 48000


def load_cues(ep, style):
    """Read the cue sheet and get each sound ready. Returns cues with 'cap' (seconds used) and 'pcm'."""
    path = ep / "transcript" / "sfx-cues.json"
    if "--sfx" not in sys.argv or not path.exists():
        return []
    kit_dir = REPO / "podcast" / "sfx"
    kit = json.loads((kit_dir / "kit.json").read_text())["sounds"]
    work = ep / "work" / "sfx"
    work.mkdir(parents=True, exist_ok=True)
    log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(ep / "work" / "audio-16k.wav"), "-af",
                          "silencedetect=noise=-50dB:d=0.3", "-f", "null", "-"], capture_output=True, text=True).stderr
    gaps = list(zip([float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)],
                    [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]))
    lengths, cues = {}, []
    for c in json.loads(path.read_text())["cues"]:
        if c.get("off"):
            continue
        name = c["sound"]
        if name not in lengths:
            src = kit_dir / kit[name]["file"]
            if not src.exists():
                src = kit_dir / "custom" / kit[name]["file"]
            lengths[name] = prepare_sound(src, work / f"{name}.wav")
        near = [g for g in gaps if abs(g[0] - c["raw_gap"]) < 0.4]
        if not near:
            print(f"SKIPPED cue at {c['raw_gap']}: no silence there, it would cover his words."); continue
        g = near[0]
        cap = min(lengths[name], kit[name].get("max_seconds", 99), c.get("max_seconds", 99))
        room = g[1] - g[0] - 0.2
        if room < cap:
            if room < 0.6 * cap:
                print(f"SKIPPED {name} at {c['raw_gap']}: the gap is {g[1] - g[0]:.1f}s and the sound needs {cap:.1f}s."); continue
            cap = room
        gain = style["sfx"]["gain"] * kit[name].get("gain", 1.0) * c.get("gain", 1.0)
        cues.append({**c, "gap": g, "cap": cap, "gain": gain, "wav": work / f"{name}.wav"})
    return cues


def write_sfx_track(path, cues, seconds):
    """One stereo track, silent except where a sound goes. Sounds never overlap each other."""
    track = array.array("h", bytes(int(seconds * 48000) * 4))
    for c in cues:
        with wave.open(str(c["wav"])) as w:
            pcm = array.array("h", w.readframes(int(c["cap"] * 48000)))
        n, fade = len(pcm) // 2, int(0.12 * 48000)
        for i in range(len(pcm)):
            k = i // 2
            f = min(1.0, (n - k) / fade) if n - k < fade else 1.0
            pcm[i] = int(pcm[i] * c["gain"] * f)
        at = int(c["edit_time"] * 48000) * 2
        track[at:at + len(pcm)] = pcm[:max(0, len(track) - at)]
    with wave.open(str(path), "wb") as w:
        w.setnchannels(2); w.setsampwidth(2); w.setframerate(48000)
        w.writeframes(track.tobytes())


def main():
    args, skip = [], False
    for a in sys.argv[1:]:
        if skip:
            skip = False
        elif a == "--until":
            skip = True
        elif not a.startswith("--"):
            args.append(a)
    until = float(sys.argv[sys.argv.index("--until") + 1]) if "--until" in sys.argv else None
    ep, version = Path(args[0]), args[1]
    slug = ep.name
    style = json.loads((SKILL / "style.json").read_text())
    cut = json.loads((ep / "transcript" / "cut-list.json").read_text())
    if cut.get("status") != "approved":
        sys.exit("Cut list is not approved. Stop and ask Remi.")
    pauses = json.loads((ep / "transcript" / "pauses.json").read_text())
    words = json.loads((ep / "transcript" / "words.json").read_text())["words"]
    fps = style["video"]["fps"]
    total = cut["source_runtime_seconds"]
    leave = style["pauses"]["leave_seconds"]

    # 1. Everything that comes out: approved removals, plus the middle of each long pause.
    drop = [r for c in cut["cuts"] if c["action"] == "remove" for r in c["ranges"]]
    tighten = [r for c in cut["cuts"] if c["action"] == "tighten" for r in c["ranges"]]
    if style["pauses"]["tighten_every_pause_over_2s"]:
        tighten += [[p["start"], p["end"]] for p in pauses]
    cues = load_cues(ep, style)

    def keep_for(s):
        """A pause that hosts a sound keeps enough silence for the sound to finish before he talks."""
        host = [c for c in cues if abs(c["gap"][0] - s) < 0.5]
        return max([leave] + [c["cap"] + 0.35 for c in host])

    for s, e in tighten:
        k = keep_for(s)
        if e - s > k:
            drop.append([s + k - leave / 2, e - leave / 2])
    drop = merge(drop)

    # 2. What stays, snapped to whole frames.
    keep, t = [], 0.0
    for a, b in drop + [[total, total]]:
        fa, fb = round(t * fps), round(min(a, total) * fps)
        if fb - fa >= 2:
            keep.append((fa, fb))
        t = b
    main_frames = sum(b - a for a, b in keep)
    main_dur = main_frames / fps
    m = style["music"]
    intro, outro = m["open_alone_seconds"], m["close_alone_seconds"]
    full_dur = intro + main_dur + outro

    # 3. Map raw time to edited time, and retime the captions.
    segs, at = [], intro
    for a, b in keep:
        segs.append({"raw_start": round(a / fps, 3), "raw_end": round(b / fps, 3), "edit_start": round(at, 3)})
        at += (b - a) / fps
    kept_words = []
    for w in words:
        for s in segs:
            if s["raw_start"] <= w["start"] < s["raw_end"]:
                shift = s["edit_start"] - s["raw_start"]
                kept_words.append({**w, "start": w["start"] + shift,
                                   "end": min(w["end"], s["raw_end"]) + shift, "sentence": 0})
                break
    for c in cues:
        t = c["gap"][0] + 0.12
        seg = [s for s in segs if s["raw_start"] <= t < s["raw_end"]]
        c["edit_time"] = round(seg[0]["edit_start"] + t - seg[0]["raw_start"], 2) if seg else None
    cues = [c for c in cues if c["edit_time"] is not None]
    def to_edit(t):
        """Raw second to edited second. A moment that was cut lands at the start of the next kept part."""
        for s in segs:
            if t < s["raw_end"]:
                return s["edit_start"] + max(0.0, t - s["raw_start"])
        return intro + main_dur

    gfx = []
    gpath = ep / "transcript" / "graphics-cues.json"
    if "--gfx" in sys.argv and gpath.exists():
        for c in json.loads(gpath.read_text())["cues"]:
            png = ep / "work" / "cards" / f"{c['id']}.png"
            if c.get("off"):
                continue
            if not png.exists():
                sys.exit(f"Card {c['id']} is not drawn yet. Run build_cards.py first.")
            a, b = round(to_edit(c["raw_from"]), 2), round(to_edit(c["raw_to"]), 2)
            if b - a >= 1.0:
                gfx.append({"id": c["id"], "layout": c["layout"], "from": a, "to": b, "png": png})
            else:
                print(f"SKIPPED card {c['id']}: its moment was cut.")
        for x, y in zip(gfx, gfx[1:]):
            x["to"] = min(x["to"], y["from"])
    out = ep / "output"
    out.mkdir(exist_ok=True)
    stem = out / f"{slug}-{version}"
    Path(f"{stem}.edit.json").write_text(json.dumps({
        "version": version, "style": style, "raw_runtime": total, "edit_runtime": round(full_dur, 2),
        "show_starts_at": intro, "segments": segs,
        "sfx": [{"at": c["edit_time"], "sound": c["sound"], "seconds": round(c["cap"], 2), "gain": round(c["gain"], 3),
                 "line": c.get("line", "")} for c in cues],
        "graphics": [{"id": x["id"], "layout": x["layout"], "from": x["from"], "to": x["to"]} for x in gfx]}, indent=1))
    srt = []
    for n, cap in enumerate(build_captions(kept_words), 1):
        end = min(cap[-1]["end"] + 0.15, cap[0]["start"] + 7)
        srt += [str(n), f"{srt_time(cap[0]['start'])} --> {srt_time(end)}", " ".join(w["word"] for w in cap), ""]
    Path(f"{stem}.srt").write_text("\n".join(srt))

    print(f"{len(keep)} kept segments. Raw {total / 60:.2f} min, show {main_dur / 60:.2f} min, "
          f"with open and close {full_dur / 60:.2f} min. {len(words) - len(kept_words)} of {len(words)} words cut.")
    if "--plan" in sys.argv:
        return

    # 4. The filter graph.
    v, a = style["video"], style["audio"]
    W, H, fade = v["width"], v["height"], a["cut_fade_seconds"]
    sel = "+".join(f"between(n,{x},{y - 1})" for x, y in keep)
    g = [f"[0:v]select='{sel}',setpts=N/{fps}/TB,fps={fps},format=yuv420p,"
         f"fade=t=in:st=0:d=0.3,fade=t=out:st={main_dur - 0.3:.3f}:d=0.3[main]"]
    card = (f"scale=-2:{style['cards']['image_height']},pad={W}:{H}:(ow-iw)/2:(oh-ih)/2:color={style['cards']['background']},"
            f"setsar=1,fps={fps},format=yuv420p")
    g.append(f"[2:v]{card},fade=t=in:st=0:d=0.5,fade=t=out:st={intro - 0.3}:d=0.3[open]")
    g.append(f"[3:v]{card},fade=t=in:st=0:d=0.5,fade=t=out:st={outro - 1.5}:d=1.5[close]")
    first_card = 5 + (1 if cues else 0)
    g.append("[open][main][close]concat=n=3:v=1:a=0" + ("[v0]" if gfx else "[vout]"))
    for i, x in enumerate(gfx):
        last = "[vout]" if i == len(gfx) - 1 else f"[v{i + 1}]"
        g.append(f"[v{i}][{first_card + i}:v]overlay=0:0:enable='between(t,{x['from']},{x['to'] - 0.001:.3f})'{last}")

    n = len(keep)
    g.append(f"[0:a]asplit={n}" + "".join(f"[s{i}]" for i in range(n)))
    for i, (x, y) in enumerate(keep):
        d = (y - x) / fps
        g.append(f"[s{i}]atrim=start={x / fps:.5f}:end={y / fps:.5f},asetpts=PTS-STARTPTS,"
                 f"afade=t=in:st=0:d={fade},afade=t=out:st={d - fade:.5f}:d={fade}[a{i}]")
    g.append("".join(f"[a{i}]" for i in range(n)) + f"concat=n={n}:v=0:a=1,highpass=f={a['highpass_hz']},"
             f"loudnorm=I={a['voice_loudness_lufs']}:TP={a['true_peak_db']}:LRA=11,aresample=48000,"
             f"aformat=channel_layouts=stereo[voicecore]")
    # Lead-in silence is real samples joined on with concat. adelay moved the whole mix's start
    # time instead, which dropped the music-only open.
    g.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{intro}[vsil];[vsil][voicecore]concat=n=2:v=0:a=1[voice]")

    G, D = m["full_gain"], m["ducked_gain"]
    under, fo = intro + m["open_under_voice_until_seconds"] - intro, m["open_fade_out_seconds"]
    open_len = under + fo
    g.append(f"[1:a]atrim=0:{open_len},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,"
             f"volume=eval=frame:volume='if(lt(t,{intro - 0.5}),{G},if(lt(t,{intro + 1}),{G}+({D}-{G})*(t-{intro - 0.5})/1.5,"
             f"if(lt(t,{under}),{D},max(0,{D}*({open_len}-t)/{fo}))))'[mopen]")
    pre = m["close_starts_before_end_seconds"]
    close_len = pre + outro
    start = 61.59 - close_len
    g.append(f"[4:a]atrim=start={start:.2f},asetpts=PTS-STARTPTS,aresample=48000,aformat=channel_layouts=stereo,"
             f"volume=eval=frame:volume='if(lt(t,3),{D}*t/3,if(lt(t,{pre - 0.6}),{D},if(lt(t,{pre + 1}),"
             f"{D}+({G}-{D})*(t-{pre - 0.6})/1.6,if(lt(t,{close_len - 2.5}),{G},max(0,{G}*({close_len}-t)/2.5)))))',"
             f"asetpts=N/SR/TB[mclosecore]")
    g.append(f"anullsrc=r=48000:cl=stereo,atrim=0:{intro + main_dur - pre:.3f}[msil];"
             f"[msil][mclosecore]concat=n=2:v=0:a=1[mclose]")
    mix_in, n_mix = "[mopen][voice][mclose]", 3
    if cues:
        write_sfx_track(ep / "work" / f"{slug}-{version}-sfx.wav", cues, full_dur)
        mix_in, n_mix = mix_in + "[5:a]", 4
        print(f"{len(cues)} sounds placed.")
    g.append(f"{mix_in}amix=inputs={n_mix}:normalize=0:duration=longest,atrim=0:{full_dur:.3f},"
             f"alimiter=limit=0.89[aout]")

    script = ep / "work" / f"{slug}-{version}.filter"
    script.write_text(";\n".join(g))
    cover = REPO / style["cards"]["image"]
    music = ep / m["file"]
    cmd = ["ffmpeg", "-hide_banner", "-loglevel", "error", "-stats", "-y",
           "-i", str(ep / cut["source"]), "-i", str(music),
           "-loop", "1", "-framerate", str(fps), "-t", str(intro), "-i", str(cover),
           "-loop", "1", "-framerate", str(fps), "-t", str(outro), "-i", str(cover),
           "-i", str(music)]
    if cues:
        cmd += ["-i", str(ep / "work" / f"{slug}-{version}-sfx.wav")]
    for x in gfx:
        cmd += ["-i", str(x["png"])]
    if gfx:
        print(f"{len(gfx)} graphics placed.")
    if until:
        cmd += ["-t", str(until)]
    cmd += ["-/filter_complex", str(script), "-map", "[vout]", "-map", "[aout]",
           "-c:v", "libx264", "-preset", v["preset"], "-crf", str(v["crf"]), "-r", str(fps),
           "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", f"{stem}.mp4"]
    subprocess.run(cmd, check=True)
    print(f"Rendered {stem}.mp4")


if __name__ == "__main__":
    main()
