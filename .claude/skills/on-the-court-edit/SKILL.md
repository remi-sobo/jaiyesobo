---
name: on-the-court-edit
description: Editing workflow for On The Court, Jaiye's podcast on jaiyesobo.com. Use when Remi says to start, bring in, transcribe, or edit an On The Court episode, or names a new raw recording for the show.
---

# On The Court: episode workflow

On The Court is Jaiye's podcast on jaiyesobo.com. Jaiye is 9 and he is the host. Remi (Dad) produces. The system is being built in stages. Only the stages marked DONE below exist. Do not improvise the later ones.

- Stage 1, intake and transcript: DONE (this file)
- Stage 2, the cut, pause tightening, and theme music: DONE (see "Building the cut")
- Stage 3, funny sound effects: DONE. Jaiye approved the first cue sheet and level on 2026-11-10 (see "Sound effects")
- Stage 4, on-screen graphics: BUILT for episode 03 on 2026-11-10, waiting on notes from Remi and Jaiye (see "On-screen graphics")
- Stage 5, vertical clips for YouTube Shorts: BUILT for episode 03 on 2026-11-10, waiting on notes (see "Shorts")
- Publishing: episode 03 went up by hand on 2026-11-10. Remi drags the file into YouTube Studio (the Chrome extension cannot upload files over 10 MB), then the title, description, and settings can be filled in through Chrome. The site entry is in `lib/content/episodes.ts`.
- Branded open and close cards for the full episode: NOT WRITTEN YET.

Start an episode from one sentence, for example: "New On The Court episode, ~/Downloads/ep4.mp4, Jaiye solo."
If the file path or who is speaking is missing, ask once. Everything else follows this file.

## Hard rules

- Never modify, move, or delete the original recording. Copy it, then make the copy read-only.
- Nothing is uploaded to an outside service. Transcription runs on this Mac.
- Transcribe exactly what was said. Fix spelling of names only. Never clean up Jaiye's words, grammar, false starts, or "um"s in the transcript.
- Stage 1 ends with a report. Do not build an edit until Remi approves a cut list.
- Jaiye is the director for sound effects. Show him a cue sheet and a 60 second preview before building the full episode.
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
- `pauses.json`: every silence over 2 seconds from FFmpeg `silencedetect` at -50 dB, with the words on each side. Do not raise the threshold. Riverside exports gate room noise to digital silence, so Jaiye's quiet words sit around -45 dB, and -35 dB counted them as silence and cut them.

- `cut-list.json`: written only after Remi approves the trims. Times are seconds in the raw file. Each cut is `remove` (words and silence go) or `tighten` (words stay, only the silence shrinks). See `podcast/episodes/episode-03/transcript/cut-list.json` for the shape. `build_cut.py` refuses to run unless `status` is `approved`.

Known limit: Parakeet stretches a word's end time across a silence that follows it. For anything that needs a precise cut point next to a pause, use `pauses.json` (measured from the audio), not the word end time.

## Building the cut

```bash
python3 .claude/skills/on-the-court-edit/scripts/build_cut.py podcast/episodes/<slug> v1 --plan   # numbers only
python3 .claude/skills/on-the-court-edit/scripts/build_cut.py podcast/episodes/<slug> v1          # render
```

It reads the approved `cut-list.json`, `pauses.json`, and `style.json` in this skill, and writes `output/<slug>-v1.mp4`, a retimed `.srt`, and an `.edit.json` that maps raw time to edited time. A 12 minute render takes about 3 minutes, so run it in the background.

The style Remi chose on 2026-11-10 (all of it lives in `style.json`):
- Every pause over 2 seconds is tightened to 0.6 seconds. Words are never touched by tightening.
- Voice is leveled to -16 LUFS.
- Music is "short sting, then duck": 6 seconds of the theme alone over the show cover, then it fades under his first lines. It comes back under his last 20 seconds and plays out 8 seconds after "Peace."
- Open and close cards are the show cover (`public/on-the-court-cover.png`) on near-black. This is a placeholder until the branded card stage.

Check every render before showing it: audio and video streams both start at 0 and have the same length, loudness is near -18 LUFS overall, and a few frames look right. This FFmpeg build has no `drawtext` and no `-filter_complex_script` (use `-/filter_complex`). Do not use `adelay` to position audio in a mix. It shifted the whole mix and dropped the opening music. Join real silence on with `concat` instead.

## Sound effects

Jaiye wants the episode funny, with the meme sounds YouTubers use, all the way through.

**The kit** is `podcast/sfx/` with `kit.json` listing each file, the meme it stands in for, its Epidemic Sound title and id, and what kind of moment it is for. Only use sounds from Epidemic Sound (through the connector) or Jaiye's own files in `podcast/sfx/custom/`. Never download meme clips from YouTube, TikTok, or soundboard sites. Epidemic has a set titled "Meme Redesign" that is the best place to look for a new one. It had nothing close to the Roblox "oof", so `bonk` stands in.

**Which sound for which moment:**
- A bad take or a wrong prediction: wrong-buzzer, sad-trombone, goat-baa, or fart-short
- A big claim or a hot take: boom
- A sudden change of subject or "wait, what?": record-scratch
- A joke that needs a beat of silence: crickets
- A great point or a win: airhorn, crowd-cheer, or ding
- Someone gets roasted: bruh, scream, or metal-pipe
- A silly moment: bonk

**Rules:**
- A sound goes in the silence right after the line. It never covers his words. The build enforces this: it finds the real silence, keeps enough of it for the sound, and skips a cue that will not fit.
- Sounds sit clearly under his voice.
- About one every 20 to 40 seconds, more in funny stretches, none while he is making a serious argument.
- Never the same sound twice in a row. No sound more than 4 times an episode. The fart stays rare.
- Keep it clean. His grandparents listen.

**Steps:**
1. Write `transcript/sfx-cues.json` (see episode 03 for the shape). `raw_gap` is the raw-file second where the silence after the line starts.
2. `build_cut.py <episode> v2 --sfx --plan` to see where each sound lands.
3. Write `transcript/sfx-cue-sheet.md` for Jaiye: time, his line, the sound, and why, in words a 9 year old would use.
4. Render only the first 60 seconds: `build_cut.py <episode> v2-preview --sfx --until 60`. Stop and wait for his notes. He can say "more," "less," "louder," or "not that one."
5. After he approves, render the full episode with `--sfx` and record his notes below.

**Level:** `style.json` `sfx.gain` is 0.25, which puts sound peaks about 12 dB under his voice peaks. Jaiye approved this level on 2026-11-10 from the episode 03 preview.

**Jaiye's notes** (add every note he gives, with the date and the episode, so the next episode starts from his taste):
- 2026-11-10, episode 03: approved the 60 second preview and the 28 cue sheet with no changes. Relayed by Remi as "He approves it." He heard only the boom and the wrong-answer buzzer in the preview, so the other 12 sounds are approved on paper, not by ear. Ask again after he hears the full episode.
- What that sheet looked like, as the starting point for next time: 28 sounds in 12:46, about one every 27 seconds. Boom, buzzer, and record scratch 3 times each. Goat, scream, bruh, airhorn, metal pipe, sad trombone, crickets, and fart twice each. Bonk, ding, and crowd cheer once. No sounds while he argues a pick.

## On-screen graphics

Remi asked for these on 2026-11-10: when Jaiye says certain things, put a card on screen "like they do on YouTube". He picked a mix: full screen for the matchup, cards by Jaiye's head for everything else.

- Cue list: `<episode>/transcript/graphics-cues.json`. One cue is one picture, on screen from `raw_from` to `raw_to` (raw seconds). `layout` is `full` or `side`. A reveal is a second cue that starts where the first ends.
- Draw: `python3 .claude/skills/on-the-court-edit/scripts/build_cards.py podcast/episodes/<slug>` writes `work/cards/<id>.png`. It uses headless Google Chrome and loads the fonts from Google Fonts, so it needs the internet. No episode content is sent anywhere.
- Render: add `--gfx` to `build_cut.py`. A card whose moment was cut is skipped. Cards never overlap each other.
- Look: brand colors from `app/globals.css` (black #0a0a0a, bone #F5F1EA, red #E63946, mute #8a8a8a). Fraunces titles, JetBrains Mono labels and scores, Inter values. Side card is top left, 640 wide, red bar on its left edge. Jaiye sits center right, so top left is clear most of the time.

What gets a card:
- The matchup line: full screen.
- Each pick as he reads it: question, his pick, Dad's pick. Then a result version at the moment he says the result.
- Standings, the leaderboard he reads out, and any big reveal (two accounts, Dad's lock).

Rules:
- Take questions, options, picks, and finals from the Run It Back data (see "Name spellings" for the lookup; picks are in `sb_picks`, hosts are `sb_players.kind` 'jaiye' and 'remi'). Do not type them from what he said.
- Never show a result before he says it. Never show a result he did not know when he recorded, even if the data has it now. In episode 03 that meant no result on picks 2, 5, and 10.
- Standings and week totals at recording time are not in the data. Use what he says and mark the card "as recorded" or "so far".
- He calls Remi "my dad", so cards say "Dad". The matchup card says "Remi" because that is the game's name for it.

## Shorts

Remi asked on 2026-11-10 for three vertical clips per episode "that could go viral on YouTube", with good footage and good sound clips.

- Plan: `<episode>/transcript/shorts.json`. Each short is a list of pieces: `clip` (raw start and end), `hold` (freeze on his face, zoomed in, while a sound plays), and `end` (closing card with an optional sound).
- Build: `python3 .claude/skills/on-the-court-edit/scripts/build_shorts.py podcast/episodes/<slug> [short-id]` writes `output/shorts/<id>.mp4` (1080x1920) and a `.json` with the caption and sound times. About 30 seconds per clip to build.
- Look and levels are in `style.json` under `shorts`: hook title band on top, his picture in the middle, big captions two or three words at a time, jaiyesobo.com at the bottom. Voice at -14 LUFS, sounds at 0.5 (louder than the full episode on purpose).
- Picking moments: 25 to 40 seconds, one idea, a line that works with no setup, and a payoff. Dad getting roasted and Jaiye admitting something are the best ones so far.
- A sound only plays on a `hold` or the end card, so it never covers his words.
- Remi's direction (2026-11-10): think about the sounds, the words on screen, and the stat screens together, and keep his face visible the whole time. So a clip can carry a `card` (the pick, both picks, the final) that shows in a strip under the picture. Nothing is ever drawn over his face. A result card only appears on the clip where he says the result.
- Three is not a limit. Make as many clips as there are good moments. Episode 03 has six.
- The first three episode 03 clips (dont-tell-my-dad, negative-nine, zero-votes-for-dad) were built with the earlier layout, before the card strip. Remi said they are great as they are. Do not rebuild them without asking.

Sound sources for Shorts:
- The Epidemic kit in `podcast/sfx/`.
- `podcast/sfx/memes/`: meme clips Remi hands over himself. On 2026-11-10 he supplied `spongebob-fail`, `you-are-an-idiot`, `rizz`, `aww`, `yeah-boiii`, `huh`, `bruh-meme`, and `faaah` (his pick for the FAHHH). He also approved downloading `fahhh.mp3` (the trending FAHHH, from myinstants.com) that day. This loosens his earlier "Epidemic only" rule for files he provides. These are not licensed, so YouTube may put a claim on a video that uses them. The folder is gitignored.
- Trending list: myinstants.com/en/index/us/ shows what is trending. Do not download from it without Remi saying which sounds, each time.

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

`Jai_s On The Court_Intro.mp3` is the show's theme (about 62 seconds, stereo). Remi wants it at the start and at the finish of each episode. Copy it into `raw/` as `on-the-court-intro.mp3`. How it is mixed is in "Building the cut".

## Brand (saved for later stages. Do not use yet.)

- Colors: near-black background, off-white text, one strong red accent, muted grey for secondary text.
- Type: Fraunces for headlines, Inter for body, JetBrains Mono for labels and stats.
- Feel: a late-night sports studio show, not a kids' site.

## Episode log

| Episode | Recorded as | Speakers | Runtime | Notes |
|---|---|---|---|---|
| episode-03 | Riverside, 1080p 24fps, one mono track | Jaiye solo | 17:00 raw, 12:25 cut | Week two picks recap. Jaiye reads picks off a screen that is not in the video. With 28 sound effects: `episode-03-v2.mp4`, 12:46. With sounds and 25 graphics: `episode-03-v3.mp4`, 12:46, not yet reviewed. |
