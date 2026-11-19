# Instagram reply picker spec

Status: draft, waiting on Remi's approval. No code written.

## Problem statement

People comment on Jaiye's reels on @onthecourt_pod, and a fast, funny reply from Jaiye is what keeps them commenting. Today the only way to reply is for Remi to sit with Claude in Chrome, read drafts, approve them in chat, and wait while they post. That doesn't happen every day, so comments sit unanswered. Kendra wants to handle it from her phone in a minute or two each morning: see each new comment, tap the reply she likes (or write her own), and be done.

## Who it's for

- **Kendra**, who picks the replies every morning.
- **Remi**, who sets it up once and can use the same page.
- **Jaiye's commenters**, who get answered within a day.

## Current behavior

No system. Remi signs in to Instagram in Chrome, Claude reads comments and drafts replies, Remi approves in chat, Claude posts by clicking through the page. It only works while Remi's Mac is on and he's in the chat.

## Desired behavior

1. Every morning at 7:00am Pacific, the site checks @onthecourt_pod for comments it hasn't seen.
2. For each one, Claude writes 3 reply options in Jaiye's voice (see Voice below).
3. If there's at least one comment, Kendra gets an email at kendrasobo@gmail.com: "4 new comments for Jaiye." One button opens the picker.
4. The picker is a phone-friendly page. For each comment it shows the reel thumbnail, the comment, and 3 option buttons. Below them are "Write my own" and "Skip."
5. Tapping an option or sending her own reply posts it to Instagram right away. The card turns into "Posted" with a link to the comment.
6. Comments that need a parent get no options. Instead the card says why it was flagged and offers "Hide on Instagram" or "Leave it."
7. Kendra's picks and the replies she writes herself are saved. Each morning's drafts use her most recent ones as examples, so the options start to sound like her.

Nothing is posted without Kendra's (or Remi's) tap. No reply is ever posted by the cron on its own.

## Voice

Written as Jaiye, age 9. Funny and witty, stands ground on some takes and is humble on others, and ends in a way that invites another comment. Never mean or antagonistic. One emoji at most, often none. No inside jokes that need explaining. No em dashes. The 3 options should be clearly different: one that holds his ground, one that gives a little, one that's a question back.

## Flag rules (no options, Kendra decides)

- Crude, sexual or hateful text, or a crude username
- Anyone asking Jaiye to DM, meet, or share where he lives, goes to school, or plays
- Anything that reads as an adult being overly familiar with a kid
- Spam or links

Claude flags these. On top of that, a simple word list catches obvious ones even if the model misses them.

## Scope

**In:**
- Connect @onthecourt_pod to the site with Instagram's official API, once, from `/admin/setup`
- Daily cron that fetches new comments, drafts options, and emails Kendra
- Picker page at `/admin/replies`, reachable from the email without the admin password
- Posting replies and hiding flagged comments through the API
- Saving picks and custom replies, and using them as examples in the prompt
- "Replies" link in the admin sidebar with a count of open comments

**Out:**
- Direct messages
- Replying to replies (threads deeper than one level), at first
- Comments on other people's posts, mentions, and tags
- Auto-posting without a tap
- Any other Instagram account
- Push notifications (email only for now)
- Liking comments

## Architecture sketch

```
Vercel Cron 15:00 UTC (7am PST)
  -> GET /api/cron/instagram  (CRON_SECRET, same check as sportsbook)
       1. refresh the Instagram token if it expires within 10 days
       2. Instagram API: list recent media, then comments on each
       3. drop comments already in ig_comments, our own comments, and ones we've replied to
       4. word-list check, then Claude (generateObject, zod schema):
            { flagged: bool, reason?: string, options: [string, string, string] }
          prompt includes the voice rules + Kendra's last ~20 picks and custom replies
       5. insert into ig_comments (status: open | flagged)
       6. if any new: create a signed picker link, send email via lib/email/send.ts

Kendra taps the email link
  -> /admin/replies?t=<token>
       token: signed with SESSION_SECRET (same style as lib/email/tokens.ts),
       purpose "replies", expires in 72 hours, grants only this page and its actions
  -> server action: post(commentId, choice | customText)
       Instagram API POST /{comment-id}/replies
       update ig_comments: status posted, posted_text, chosen_index or custom, reply id
  -> server action: hide(commentId)  ->  POST /{comment-id}?hide=true
```

**New tables (migration 034):**
- `ig_token`: one row, like `drive_tokens` (access token, expiry, IG user id)
- `ig_comments`: comment id, media id and permalink, username, text, created time, status, flag reason, the 3 options, chosen index, custom text, posted text, reply id, who picked, timestamps

**New env vars:** `INSTAGRAM_APP_ID`, `INSTAGRAM_APP_SECRET`, `KENDRA_REPLY_EMAIL`. Resend and Anthropic keys already exist.

**Files (list before editing, per CLAUDE.md):**
- `supabase/migrations/034_instagram_replies.sql`: the two tables
- `lib/instagram/api.ts`: token refresh, list media and comments, reply, hide
- `lib/instagram/draft.ts`: flag check and option drafting with Claude, learning examples
- `lib/instagram/tokens.ts`: signed picker links
- `app/api/auth/instagram/start/route.ts` and `callback/route.ts`: one-time connect, modeled on the Google Drive ones
- `app/api/cron/instagram/route.ts`: the daily job
- `app/admin/replies/page.tsx` and `actions.ts`: the picker
- `lib/email/templates.ts`: the morning email
- `components/admin/sidebar.tsx`: the Replies link and count
- `app/admin/setup/page.tsx`: the "Connect Instagram" button
- `vercel.json`: the new cron
- `tests/instagram-*.test.ts`: drafting schema, flag rules, token checks

## Staged build order

**Phase 0: Meta setup (Remi, with Claude walking through it).** Switch @onthecourt_pod to a Creator account. Create a Meta developer app with Instagram Login, add the account to the app, and set the redirect URL. Commit point: none (no code).

**Phase 1: Connect and read.** Migration, the connect flow, `lib/instagram/api.ts` reading comments. Done when `/admin/setup` shows "Connected as @onthecourt_pod" and a test route lists real comments. Commit point.

**Phase 2: Draft.** `lib/instagram/draft.ts` with the voice, flag rules, and zod schema. Run it against the comments from this week's test run and show Remi the output before going further. Commit point.

**Phase 3: Picker.** `/admin/replies` with tap-to-post, write-your-own, skip, and hide. Remi posts one real reply from it. Commit point.

**Phase 4: Cron and email.** The daily job, signed link, and morning email. Do one run by hand, sent to Remi first, then switch the address to Kendra. Commit point.

**Phase 5: Learning.** Feed Kendra's recent picks and custom replies into the prompt. Commit point, then PR.

## Definition of done

- Kendra gets one email on mornings with new comments and none on mornings without.
- From her phone, without signing in, she can post a reply in one tap from the email.
- A posted reply shows up under the right comment on Instagram and matches what she picked character for character.
- Flagged comments never show reply options.
- Running the cron twice in one morning drafts nothing new and sends no second email.
- An expired or tampered picker link shows "This link expired" and can't post.
- `ig_comments` shows every pick, who made it, and when.
- Lint, types, tests and build pass (checker agent).

## Failure modes to watch for

1. **Instagram token expires.** Long-lived tokens last 60 days. If the refresh fails, the cron finds nothing and Kendra gets no email, which looks like "no comments." Fix: on refresh failure, email Remi "Reconnect Instagram" and show a banner on `/admin/setup`.
2. **Double posting.** Kendra taps twice, or opens the email on two devices. Fix: the post action checks and sets status in one database update, and the button disables after a tap.
3. **A bad draft slips through.** The model writes something off-voice or not kid-appropriate. Kendra is the backstop, since nothing posts without her tap, but the zod schema also caps length, and a post-check rejects options with banned words or more than one emoji.
4. **The picker link gets forwarded.** Anyone with it could post as Jaiye for 72 hours. Fix: the link only works for that batch's comments, expires, and every post records which link was used. Remi can kill all links from `/admin/setup`.
5. **Meta access changes.** Meta's docs say an app used only on accounts you own needs no App Review at Standard Access, but one page also mentions Business Verification. If that's required, Phase 0 takes longer. Confirm before starting Phase 1.
6. **Comment volume jumps.** A reel takes off and gets 300 comments. Fix: draft at most 25 per morning, newest first, and show "plus 275 more" with a link to the reel.

## Open questions for Remi

1. Should the email go to both of you, or Kendra only with you on the picker as backup?
2. Is 7am Pacific the right time?
3. Do you want Jaiye to see or pick replies too, or keep it parents only?
