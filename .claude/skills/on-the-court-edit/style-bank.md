# On The Court style bank

A running list of video styles for Jaiye's clips and videos. Remi asked for this on 2026-11-10 so the clips have variety and "don't all look and sound the same".

## How to use this

Every time Remi asks for a video or a clip:

1. **Read this file.** Look at what we have used lately (the log at the bottom).
2. **Do a short research pass.** Search what is working right now on YouTube, Shorts, TikTok, and Reels for the kind of video being made. A few searches, not a report, unless Remi asks for deep research.
3. **Pick or design the style.** Say in one line which style it is and why. Do not default to the last clip's layout.
4. **After Remi or Jaiye likes a clip, add it here** under "Our styles" with its recipe and plan file, and add a line to the log.

Variety rules:

- In a batch of clips, no two in a row use the same style.
- Change at least two of these from the last clip: where the title sits, how the captions look, how many sounds, how it opens, how it ends.
- The show's look stays: near-black, bone, one red, Fraunces titles, mono labels. His face is never covered. Sounds never cover his words.

## Our styles (made and liked)

### 1. Episode clip, title band
- **What it is:** a 25 to 40 second cut from a podcast episode. Title band on top, his picture in the middle, captions two or three words at a time, jaiyesobo.com at the bottom. Freeze and zoom on his face for each sound.
- **Best for:** a funny run from an episode that needs no setup. Dad getting roasted. Jaiye admitting something.
- **Liked:** Remi, 2026-11-10 ("these are great"). Do not rebuild the first three without asking.
- **Plan:** `podcast/episodes/episode-03/transcript/shorts.json` (dont-tell-my-dad, negative-nine, zero-votes-for-dad).

### 2. Episode clip with a stat strip
- **What it is:** style 1 plus a card under the picture showing the pick, both picks, and the final. The card flips to the result when he says it.
- **Best for:** any clip about a pick, a score, or a stat.
- **Liked:** Remi, 2026-11-10.
- **Plan:** same file (dumb-dums, that-was-luck, i-believe-in-portland).

### 3. Hot Seat
- **What it is:** phone video. Dad asks one question from off camera, Jaiye answers. The question is the title. Dad's words are small grey captions, Jaiye's are big with red punch words. Ends on a verdict card.
- **Best for:** one question, one strong answer. 15 to 26 seconds.
- **Liked:** Remi put all three on the site, 2026-11-10.
- **Plan:** `podcast/episodes/shorts-2026-11-10/transcript/shorts.json`.

### 4. Story edit (Dame Time)
- **What it is:** phone video with little talking. The words on screen are written for the edit. A photo to open, a slow-motion walk-up with one sound, the moment at real speed with real sound and no jokes over it, Dad's real words quoted, freeze on his smile, a closing card. Show theme quietly underneath.
- **Best for:** a real-life moment. Meeting someone, a game night, a big day. Funny on the way in, sweet at the moment.
- **Liked:** Remi confirmed and put all three on the site, 2026-11-10.
- **Plan:** `podcast/episodes/shorts-2026-11-10-blazers-game/transcript/shorts.json`.

## Reference styles (researched, not tried yet)

Each one says what it is, who it comes from, how it could fit Jaiye, and what we would need. The descriptions of other creators come from articles about them, not from watching their videos, so treat the details as a starting point.

### A. One place, one take
- **From:** SubwayTakes (Kareem Rahma). A guest gives one take, the host answers "100% agree" or "100% disagree", and they argue it out briefly. Same place and same setup every time, which is the brand. Short vertical clips. Cheap to make.
- **For Jaiye:** a fixed spot that is his (the driveway hoop, the bleachers, the back seat). Dad or a guest gives a take. Jaiye says "100% agree" or "100% disagree" and why. The repeat is the point.
- **Needs:** one recurring location, one mic passed back and forth, takes written ahead.

### B. Kid reporter with a mic
- **From:** Jeremiah Fennell, who went viral as a young sports reporter interviewing pro athletes. He researches guests and writes questions he actually wants answered.
- **For Jaiye:** at games and events, a handheld mic with an On The Court flag, two or three questions he wrote himself. The backstage clips showed players will stop for him.
- **Needs:** a mic flag, his own questions on a card, Dad filming at chest height.

### C. Ask more than tell, leave the banter in
- **From:** Recess Therapy (Julian Shapiro-Barnum). Kids answer big questions. Positive but honest, always funny, and loose: on-set banter is sometimes left in the cut.
- **For Jaiye:** a looser Hot Seat. Keep the laugh, the false start, Dad cracking up. Less polish on purpose.
- **Needs:** nothing new. It is an editing choice: stop trimming every pause.

### D. Feels like a friend sent it
- **From:** Overtime, whose president describes the goal as content that feels approachable and like it comes from a friend. House of Highlights leans on creators and viral moments.
- **For Jaiye:** a no-frame version. Full-screen video, one line of plain text at the top like a text message, no title band, no closing card. Good for quick reactions the day something happens.
- **Needs:** nothing new. Fastest style to make.

### E. Challenge video
- **From:** Jesser, the biggest basketball creator on YouTube: "Make the shot", "Last to leave", overnight challenges, and videos with NBA players.
- **For Jaiye:** a long-form YouTube idea. "Every shot I miss, Dad picks one of my Run It Back picks." A clear rule in the title, a counter on screen, a payoff at the end.
- **Needs:** a court, a tripod, a simple rule, 8 to 12 minutes of footage.

### F. Ranking on screen
- **From:** tier lists (from gaming, now used for sports teams and everything else) and blind ranking, a TikTok-driven format where you place each item without knowing what comes next. Both start arguments in the comments.
- **For Jaiye:** the site already has Blind Rank as a segment. Show the five slots on screen and fill them as he places each player. The board filling up is the hook.
- **Needs:** a ranking board graphic (new), a list he has not seen.

### G. Split screen argument
- **From:** podcast clip practice. Split screen suits back-and-forth; single-speaker framing suits a story. The cost is smaller faces and less room for text.
- **For Jaiye:** episodes with Dad on camera. Jaiye on top, Dad on the bottom, only for a real disagreement.
- **Needs:** two camera angles or a two-shot wide enough to crop twice.

### H. Speaker plus the thing he is talking about
- **From:** podcast clip practice: speaker with b-roll or screen content when explaining something visual.
- **For Jaiye:** his face on the bottom half, the leaderboard, a box score, or his column headline on the top half.
- **Needs:** graphics we draw ourselves. Do not use NBA game footage. We do not have the rights.

### I. One word at a time
- **From:** podcast clip guides say word-by-word animated captions are the dominant caption style in 2026, in bold sans-serif with high contrast.
- **For Jaiye:** swap our two-or-three-word chunks for single words that pop, for a fast clip. Keep chunks for calmer ones.
- **Needs:** a caption option in `build_shorts.py` (not built yet).

### J. Slow it down for the long videos
- **From:** 2026 YouTube commentary describes creators moving away from heavy editing toward a less produced look, with clarity and story over constant cuts, and videos getting longer. Other guides still argue for fast cuts, so this is a lean, not a rule.
- **For Jaiye:** main YouTube videos (a game-night vlog, a full episode) with fewer cuts, a clear beginning, middle, and end, and sounds used sparingly.
- **Needs:** more footage per outing: getting there, the seats, the moment, the ride home.

### K. Open on motion
- **From:** platform guides: Reels viewers expect polish and respond to opening on motion instead of a talking head; Shorts viewers respond to clarity; TikTok rewards trying things.
- **For Jaiye:** start a clip on him walking, shooting, or reacting, then cut to him talking.
- **Needs:** two seconds of movement shot before each talk.

## What the numbers say (as of 2026-11-10)

- **Keep them short.** A study of 3.3 million videos found median lengths of about 16 seconds on TikTok, 18 on Reels, and 19 on Shorts, with two thirds to three quarters under 30 seconds. Some blogs claim 60 to 90 seconds is winning. The measured data does not back that. Our 15 to 30 second clips are in the right range. Our 35 to 40 second ones are long.
- **Hashtags barely matter now.** Posts with six or more have nearly vanished.
- **Posting more gets more total views** at about the same views per post. More clips beats fewer perfect ones.
- **Caption placement differs by app.** Reels covers the lower part of the frame with its own buttons and text. Keep captions above the bottom fifth.
- Most of these sources are tool makers' blogs. Trust the direction, not the exact figures.

## Sources (2026-11-10 research)

- [Short-form video trends 2026: data from 3.3M videos](https://viral.app/blog/insights/short-form-video-trends)
- [TikTok, Reels and Shorts: the 2026 cross-platform playbook](https://www.markstudios.com/blog/tiktok-reels-shorts-cross-platform-strategy-2026)
- [Short-form video trends in 2026: what's working and what's dead](https://www.mangoagent.ai/blog/short-form-video-trends-2026)
- [A metamodern take on Kareem Rahma's Subway Takes](https://whatismetamodern.com/social-media/subway-takes-kareem-rahma-metamodernism/)
- [NSS Magazine on SubwayTakes](https://www.nssmag.com/en/lifestyle/43777/so-what-s-your-take)
- [Jeremiah Fennell, Fox News](https://www.foxnews.com/media/10-year-olds-impressive-interview-nfl-star-takes-internet-storm-passionate-job.amp)
- [Jeremiah Fennell, CBS News](https://www.cbsnews.com/news/jeremiah-fennell-talks-about-interviewing-big-stars-and-the-11-year-olds-journey-to-journalism)
- [Recess Therapy, Wikipedia](https://en.wikipedia.org/wiki/Recess_Therapy)
- [Why Recess Therapy is an Instagram hit](https://www.aol.com/why-kid-interview-series-recess-130125676.html)
- [How Overtime is building sports media for Gen Z, Digiday](https://digiday.com/media/how-overtime-is-building-sports-media-for-gen-z)
- [How House of Highlights reached 50 million fans on Instagram](https://www.hashtagsports.com/read/hoh-50-million-instagram)
- [Jesser, Wikipedia](https://en.wikipedia.org/wiki/Jesser)
- [Jesser profile, Tubefilter](https://tubefilter.com/2023/05/05/jesser-jesse-riedel-basketball-sports-youtube-videos-nba-marko-rizzo-preocanin/)
- [The tier list phenomenon, YouTube blog](https://blog.youtube/culture-and-trends/tier-list/)
- [Podcast clip vertical video format](https://www.conbersa.ai/learn/podcast-clip-vertical-video-format)
- [How to edit podcast shorts in 2026](https://quso.ai/blog/how-to-edit-podcast-shorts-like-a-pro.html)
- [9 YouTube trends creators need to watch in 2026, vidIQ](https://vidiq.com/ru/blog/post/trending-topics-grow-small-youtube-channel-august)
- [YouTube trends 2026, Mediacube](https://mediacube.io/en/blog/youtube-trends-2026)

## Gaps in this research

- Nothing found on how Overtime or House of Highlights style their captions and text.
- Nothing found on how New Heights or Pat McAfee cut their clips.
- No source newer than about six weeks old, and none that measured what works for kid hosts.
- I could not watch any of these creators' videos. Remi or Jaiye naming three clips they love would sharpen this more than any article.

## Log

| Date | Clip | Style |
|---|---|---|
| 2026-11-10 | Episode 03: dont-tell-my-dad, negative-nine, zero-votes-for-dad | 1 |
| 2026-11-10 | Episode 03: dumb-dums, that-was-luck, i-believe-in-portland | 2 |
| 2026-11-10 | Hot Seat: wemby-or-luka, how-far-blazers, warriors-hot-start | 3 |
| 2026-11-10 | Game night: dame-time, old-folk-high-five, rip-city-backstage | 4 |
