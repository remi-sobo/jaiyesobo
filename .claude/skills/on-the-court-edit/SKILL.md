---
name: on-the-court-edit
description: Editing workflow for On The Court, Jaiye's podcast on jaiyesobo.com. Use when Remi says to start, bring in, transcribe, or edit an On The Court episode, or names a new raw recording for the show.
---

# On The Court: episode workflow

On The Court is Jaiye's podcast on jaiyesobo.com. Jaiye is 9 and he is the host. Remi (Dad) produces. The system is being built in stages. Only the stages marked DONE below exist. Do not improvise the later ones.

- Stage 1, intake and transcript: DONE (this file)
- Stage 2, Jaiye's editing style and the cut: NOT WRITTEN YET. Do not cut, edit, or render anything until Remi adds it here.
- Stage 3+, graphics, captions on video, publishing: NOT WRITTEN YET.

Start an episode from one sentence, for example: "New On The Court episode, ~/Downloads/ep4.mp4, Jaiye solo."
If the file path or who is speaking is missing, ask once. Everything else follows this file.

## Hard rules

- Never modify, move, or delete the original recording. Copy it, then make the copy read-only.
- Nothing is uploaded to an outside service. Transcription runs on this Mac.
- Transcribe exactly what was said. Fix spelling of names only. Never clean up Jaiye's words, grammar, false starts, or "um"s in the transcript.
- Stage 1 ends with a report. Do not build an edit. Wait for Remi to approve a cut list.
- Nothing is published without a clear yes from Remi.

## Tools (all local)

| Tool | What for | Check it runs |
|---|---|---|
| FFmpeg / ffprobe | probe, extract audio, find silences | `ffmpeg -version` |
| uv | installs the transcriber with a native arm64 Python | `~/.local/bin/uv --version` |
| parakeet-mlx | word-level transcript on Apple Silicon | `~/.local/bin/parakeet-mlx --help` |

Setup notes for this Mac, learned the hard way:
- Homebrew and the system `python3` here are Intel builds running under Rosetta. MLX needs native arm64, so do not `pip install` the transcriber into system Python and do not `brew install uv` (it tries to compile from source for a very long time).
- Install uv with its official installer, then `uv tool install --python 3.12 parakeet-mlx`. Both land in `~/.local/bin`, which may not be on PATH. Call them by full path.
- Model is `mlx-community/parakeet-tdt-0.6b-v3`, downloaded once to the Hugging Face cache. A 17 minute episode takes about 90 seconds.
- If Parakeet cannot run on a machine, fall back to Whisper with word timestamps (mlx-whisper or whisper.cpp), still local.

## Folder structure

```
podcast/episodes/<episode-slug>/      slug is episode-NN, e.g. episode-03
  raw/          read-only copies of the originals. Gitignored.
    <slug>-raw.mp4
    on-the-court-intro.mp3            theme music, when supplied
  work/         scratch: 16k wav, Parakeet's raw JSON, frames. Gitignored.
  transcript/   words.json, transcript.txt, captions.srt, pauses.json, corrections.json
  output/       renders, later stages. Gitignored.
```

## Steps

1. **Check tools.** Run the three checks in the table. Install what is missing. Tell Remi what was installed.
2. **Bring in the recording.**
   - Make the folders. `cp -n` the raw file to `raw/<slug>-raw.<ext>`, `chmod a-w` it, and confirm the checksum matches the original.
   - Probe with ffprobe. Report duration, resolution, frame rate, audio channels, and whether it is one file or separate tracks per speaker.
   - If there are separate tracks per speaker, cross-correlate the audio, confirm sync, and report the offset. One file with one audio stream needs no sync check. Say so.
   - Grab a few frames into `work/` and look at them to confirm who is on camera.
3. **Transcribe.**
   ```bash
   ffmpeg -y -i raw/<slug>-raw.mp4 -vn -ac 1 -ar 16000 work/audio-16k.wav
   ~/.local/bin/parakeet-mlx work/audio-16k.wav --output-dir work --output-format json --output-template parakeet-raw
   ```
4. **Read the whole raw transcript** and write `transcript/corrections.json` for this episode's misheard names (same format as `names.json` here). If a miss will recur every episode, add it to `names.json` instead.
5. **Build the files.**
   ```bash
   python3 .claude/skills/on-the-court-edit/scripts/build_transcript.py podcast/episodes/<slug> --speaker JAIYE
   ```
   With more than one speaker, the script needs speaker labels added first. That part is not built yet. Say so and ask Remi.
6. **Report back, then stop.** Show:
   - the readable transcript
   - total runtime
   - likely trims with timestamps: false starts, pauses over 2 seconds, repeated takes, off-mic chatter before the show starts or after it ends
   - the 3 strongest moments, quoted, with timestamps: best take, funniest line, best argument
   - every player, team, or person name you were unsure about

## Transcript formats

- `words.json`: `{"speaker": "JAIYE", "words": [{"word", "start", "end", "confidence", "speaker", "raw"?}]}`. Times in seconds. `raw` is present only where a spelling rule changed the word and holds what the transcriber heard.
- `transcript.txt`: blocks like `[04:01] JAIYE: ...`, a new block at each pause over 2 seconds or about every 35 seconds, with `(pause 4.5s)` lines.
- `captions.srt`: lines of 42 characters or less, 4 seconds or less.
- `pauses.json`: every silence over 2 seconds from FFmpeg `silencedetect` at -35 dB, with the words on each side.

- `cut-list.json`: written only after Remi approves the trims. Times are seconds in the raw file. Each cut is `remove` (words and silence go) or `tighten` (words stay, only the silence shrinks). See `podcast/episodes/episode-03/transcript/cut-list.json` for the shape. An approved cut list is not permission to render. The render waits for stage 2.

Known limit: Parakeet stretches a word's end time across a silence that follows it. For anything that needs a precise cut point next to a pause, use `pauses.json` (measured from the audio), not the word end time.

## Name spellings

Always: **Jaiye** (never Jai, Jaye), **On The Court** (capital T), **Remi** (never Remy), **Sobomehin**, **jaiyesobo.com**.
The picks game is **Run It Back Picks**. It was called **Sobo Sportsbook** before week two of the first season.
Jaiye is a Portland fan. Expect Dame (Damian Lillard), Blazers, and Ant (Anthony Edwards).
The full rule list is in `names.json`. Leaderboard nicknames from the picks game are the usual trouble spot. Parakeet cannot guess them, so check them against the real game every time:

- The game's data is in the Supabase project named "Jaiye's Website". Read only.
- Player names: `select kind, display_name from sb_players order by created_at;` Never select the `code` column. It is each player's login.
- That week's questions, options, and results: join `sb_weeks` to `sb_items` on `week_id` and filter by `week_number`. Use the prompts to settle misheard teams, players, and scores.
- Spell a nickname the way the player typed it (for example "LeTwinjamin Taiye", "Kelz", "Reezy animal"). Add recurring ones to `names.json`.
- Anything still unmatched after that goes to Remi as a short list.

## Music

`Jai_s On The Court_Intro.mp3` is the show's theme (about 62 seconds, stereo). Remi wants it at the start and at the finish of each episode. Copy it into `raw/` as `on-the-court-intro.mp3`. How it gets mixed in is a stage 2 decision.

## Brand (saved for later stages. Do not use yet.)

- Colors: near-black background, off-white text, one strong red accent, muted grey for secondary text.
- Type: Fraunces for headlines, Inter for body, JetBrains Mono for labels and stats.
- Feel: a late-night sports studio show, not a kids' site.

## Episode log

| Episode | Recorded as | Speakers | Runtime | Notes |
|---|---|---|---|---|
| episode-03 | Riverside, 1080p 24fps, one mono track | Jaiye solo | 17:00 | Week two picks recap. Jaiye reads picks off a screen that is not in the video. |
