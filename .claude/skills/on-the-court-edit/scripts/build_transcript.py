#!/usr/bin/env python3
"""Turn Parakeet's raw JSON into the three transcript files for an On The Court episode.

Usage:
  python3 build_transcript.py <episode-dir> [--speaker JAIYE]

Reads:
  <episode-dir>/work/parakeet-raw.json        (from parakeet-mlx --output-format json)
  <episode-dir>/transcript/corrections.json   (optional, per-episode spelling fixes)
  <skill>/names.json                          (show-wide spelling fixes)

Writes into <episode-dir>/transcript/:
  words.json       every word with start and end time (plus the raw word when corrected)
  transcript.txt   readable, speaker-labeled blocks with a timestamp per block
  captions.srt     short caption lines
  pauses.json      every gap between words longer than 2 seconds

Corrections only fix spelling of what was said (names, teams, the show's own words).
They never remove or reword anything. Each rule is {"from": "...", "to": "..."} matched
on whole words, ignoring case and edge punctuation. Add "at" (seconds, within 3s of the
first word) to pin a rule to one spot.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

PAUSE_SECONDS = 2.0      # gaps longer than this get listed as likely trims
SILENCE_DB = -35         # quieter than this counts as silence (raise toward -30 for a noisy room)
BLOCK_GAP = 2.0         # a pause this long starts a new transcript block
BLOCK_MAX_SECONDS = 35   # or a block this long, at the next sentence end
CAPTION_MAX_CHARS = 42
CAPTION_MAX_SECONDS = 4.0
EDGE = ".,?!;:\"'()"


def load_words(raw):
    """Merge Parakeet's sub-word tokens into words. A token starting with a space opens a new word."""
    words = []
    for si, sentence in enumerate(raw["sentences"]):
        for tok in sentence["tokens"]:
            text = tok["text"]
            if text.startswith(" ") or not words or words[-1]["sentence"] != si:
                words.append({"word": text.strip(), "start": tok["start"], "end": tok["end"],
                              "conf": [tok.get("confidence", 1.0)], "sentence": si})
            else:
                words[-1]["word"] += text
                words[-1]["end"] = tok["end"]
                words[-1]["conf"].append(tok.get("confidence", 1.0))
    for w in words:
        w["confidence"] = round(min(w.pop("conf")), 3)
        w["start"], w["end"] = round(w["start"], 2), round(w["end"], 2)
    return [w for w in words if w["word"]]


def norm(s):
    return s.strip(EDGE).lower()


def apply_rules(words, rules):
    for rule in rules:
        src = [norm(x) for x in rule["from"].split()]
        dst = rule["to"].split()
        i = 0
        while i <= len(words) - len(src):
            span = words[i:i + len(src)]
            hit = [norm(w["word"]) for w in span] == src
            if hit and "at" in rule and abs(span[0]["start"] - rule["at"]) > 3:
                hit = False
            if not hit:
                i += 1
                continue
            lead = span[0]["word"][:len(span[0]["word"]) - len(span[0]["word"].lstrip(EDGE))]
            trail = span[-1]["word"][len(span[-1]["word"].rstrip(EDGE)):]
            start, end = span[0]["start"], span[-1]["end"]
            step = (end - start) / len(dst)
            raw_text = " ".join(w.get("raw", w["word"]) for w in span)
            new = []
            for k, text in enumerate(dst):
                new.append({"word": text, "start": round(start + k * step, 2),
                            "end": round(start + (k + 1) * step, 2),
                            "confidence": min(w["confidence"] for w in span),
                            "sentence": span[0]["sentence"], "raw": raw_text})
            new[0]["word"] = lead + new[0]["word"]
            new[-1]["word"] = new[-1]["word"] + trail
            words[i:i + len(src)] = new
            i += len(dst)
    return words


def stamp(t):
    t = int(t)
    return f"{t // 60:02d}:{t % 60:02d}"


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


def build_blocks(words):
    blocks, cur = [], []
    for i, w in enumerate(words):
        if cur:
            gap = w["start"] - cur[-1]["end"]
            new_sentence = w["sentence"] != cur[-1]["sentence"]
            too_long = new_sentence and w["start"] - cur[0]["start"] > BLOCK_MAX_SECONDS
            if gap > BLOCK_GAP or too_long:
                blocks.append((cur, gap if gap > BLOCK_GAP else 0))
                cur = []
        cur.append(w)
    if cur:
        blocks.append((cur, 0))
    return blocks


def build_captions(words):
    caps, cur = [], []
    for w in words:
        if cur:
            text = " ".join(x["word"] for x in cur)
            ended = cur[-1]["word"][-1:] in ".?!"
            if (len(text) + 1 + len(w["word"]) > CAPTION_MAX_CHARS
                    or w["end"] - cur[0]["start"] > CAPTION_MAX_SECONDS
                    or w["start"] - cur[-1]["end"] > 1.0 or ended):
                caps.append(cur)
                cur = []
        cur.append(w)
    if cur:
        caps.append(cur)
    return caps


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    speaker = "JAIYE"
    if "--speaker" in sys.argv:
        speaker = sys.argv[sys.argv.index("--speaker") + 1]
    ep = Path(args[0])
    out = ep / "transcript"
    out.mkdir(exist_ok=True)

    words = load_words(json.loads((ep / "work" / "parakeet-raw.json").read_text()))
    rules = []
    for path in (Path(__file__).resolve().parent.parent / "names.json", out / "corrections.json"):
        if path.exists():
            rules += json.loads(path.read_text())["rules"]
    words = apply_rules(words, rules)

    # Pauses come from the audio itself, not the word times: Parakeet stretches a word's
    # end time across a silence, so word gaps miss most long pauses.
    wav = ep / "work" / "audio-16k.wav"
    log = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", str(wav), "-af",
                          f"silencedetect=noise={SILENCE_DB}dB:d={PAUSE_SECONDS}", "-f", "null", "-"],
                         capture_output=True, text=True).stderr
    starts = [float(x) for x in re.findall(r"silence_start: ([\d.]+)", log)]
    ends = [float(x) for x in re.findall(r"silence_end: ([\d.]+)", log)]
    pauses = []
    for s, e in zip(starts, ends):
        before = [w for w in words if w["start"] <= s]
        after = [w for w in words if w["start"] >= e - 0.4]
        pauses.append({"start": round(s, 2), "end": round(e, 2), "seconds": round(e - s, 2),
                       "after_words": " ".join(w["word"] for w in before[-4:]),
                       "before_words": " ".join(w["word"] for w in after[:4])})

    for w in words:
        w["speaker"] = speaker
    public = [{k: w[k] for k in ("word", "start", "end", "confidence", "speaker", "raw") if k in w}
              for w in words]
    (out / "words.json").write_text(json.dumps({"speaker": speaker, "words": public}, indent=1))
    (out / "pauses.json").write_text(json.dumps(pauses, indent=1))

    lines = []
    for block, gap_after in build_blocks(words):
        lines.append(f"[{stamp(block[0]['start'])}] {speaker}: " + " ".join(w["word"] for w in block))
        if gap_after:
            lines.append(f"        (pause {gap_after:.1f}s)")
        lines.append("")
    (out / "transcript.txt").write_text("\n".join(lines).rstrip() + "\n")

    srt = []
    for n, cap in enumerate(build_captions(words), 1):
        end = min(cap[-1]["end"] + 0.15, cap[0]["start"] + 7)
        srt += [str(n), f"{srt_time(cap[0]['start'])} --> {srt_time(end)}",
                " ".join(w["word"] for w in cap), ""]
    (out / "captions.srt").write_text("\n".join(srt))

    print(f"{len(words)} words, {len(pauses)} pauses over {PAUSE_SECONDS}s, "
          f"last word ends at {stamp(words[-1]['end'])}")


if __name__ == "__main__":
    main()
