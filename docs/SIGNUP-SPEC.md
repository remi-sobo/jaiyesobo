# Run It Back sign-up and sign-in spec

Status: built on branch `site/signup-email`. Migration 031 is applied to the live database. The iPhone app's screens are not updated yet (its API is).

## How the build differs from the first draft

- **Email is not a new column.** Main already had `sb_subscribers` (migration 030). Login codes go to a player's own confirmed subscriber address (`relation = 'self'`), so there is no separate email field or confirm step to build.
- **Migration is 031** (`031_sb_names_and_email_login.sql`), since 030 was taken. It adds the name columns, `sb_login_codes`, and `login` to `sb_email_log.kind`.
- **From address** is the existing `Jaiye at Run It Back <picks@jaiyesobo.com>` in `lib/email/send.ts`.
- **No nudge** for existing players: 13+ players see "Add your real name (private)" on the play page, and the email prompt already exists.
- **Jaiye sees real names in a separate "Who's who" list** on `/me/pod`, never inside the pod prep text, which is read on air.
- **Every email** now uses the Run It Back Picks look (`lib/email/templates.ts`).

## Goal

1. Sign-up asks for a **nickname** (required) and, for players 13 and older, an optional **first and last name**.
2. A player who switches phones or clears their browser can get back in **without their player code**, by asking for a login code sent to their email.

## How it works today

- Web: `JoinForm` in `components/sportsbook/public/challenger-play.tsx` posts `join { name, age_band }` to `/api/sportsbook`. The server checks the name with `checkDisplayName`, makes an `sb_players` row with a player code (like HOOP-1234), and sets a signed `sb_player` cookie for a year.
- iPhone app: `mobile/app/join.tsx` calls `/api/app/v1`, which returns a bearer session token (`lib/sportsbook/sessions.ts`).
- On a new device, the player types their code (`restore { code }`).
- The privacy page (`/runitback/privacy`) promises we keep only a display name and a 13+ yes or no. It says we collect "No email, phone number, birthday, location or contacts."

## Decisions

1. **Nickname stays the only public name.** Same rules as now (2 to 20 characters, clean, can't pretend to be Remi or Jaiye). The label changes from "Your name or nickname" to "Nickname".
2. **First and last name are optional and 13+ only.** The boxes appear only after the player taps "Yes" to 13 or older. They're private: shown only to the player in their own settings, and to Remi and Jaiye when signed in (see "Where Remi and Jaiye see real names"). They never appear in public leagues, standings, talk, rivals, the analytics dashboard or any public API response about another player.
   - Why 13+ only: a child's full name or email counts as personal information under COPPA, the US children's privacy law. Collecting it from under-13s would mean getting verified parent consent. Under-13s keep playing with a nickname only.
3. **No passwords.** Login is by **email code**: a 6-digit code, plus a tap-to-sign-in link on web. A code works in the iPhone app too, where opening a link is awkward.
4. **Email is optional, 13+ only, and only saved once confirmed.** A player adds it in settings (or at sign-up), we send a code, and the email is saved only after they type that code back. That stops someone attaching another person's email.
5. **The player code stays** for everyone. Under-13s rely on it, and it still works for anyone without an email.
6. **One email, one player.** An email already on another live player can't be added again.

## Sign-up form (web and app)

1. Nickname, required.
2. "Are you 13 or older?" Yes or No, required (unchanged).
3. If Yes:
   - First name, optional, up to 30 characters.
   - Last name, optional, up to 30 characters.
   - Email, optional, with the note "Only used to send you a login code. Never shown to anyone."
4. "I'm in". If an email was entered, the next screen asks for the code we just sent. It has a "Skip for now" link, so a missed email never blocks playing.

## Getting back in on a new device

The "Already playing?" screen gets two choices:

- **Email me a login code** (new). Type your email and we always answer "If that email is on a player, we sent a code", so nobody can check whose email is signed up. Type the 6 digits and you're in. On web, the email also has a link that signs you in with one tap.
- **Use your player code** (as now).

## Where Remi and Jaiye see real names

Goal: from either of their logins, tell who's who.

- **Remi, `/admin/sportsbook`** (admin login): the challengers panel and the board show "Nickname · First Last" when a name was given. Nickname alone otherwise.
- **Jaiye, `/me/pod`** (kid login): the same "Nickname · First Last" wherever challengers are listed.
- Names are loaded only by the server for these two signed-in pages. A separate loader adds them, so the shared week view used by the public site and the app never carries them.
- Email is shown to Remi only, in admin, so he can help someone who's locked out. Jaiye never sees emails.

## Settings

- 13+ players can add, change or remove first name, last name and email. Changing the email sends a new code to the new address.
- Under-13 players see only their nickname and player code.
- **Delete account** also wipes first name, last name and email right away, not just the nickname.

## Data

Migration `030_sb_player_contact.sql`:

- `sb_players`: add `first_name text`, `last_name text`, `email text` (stored lowercased), `email_verified_at timestamptz`. Unique index on `email` where `deleted_at is null`. A check that all three are null unless `age_band = '13_plus'`.
- New table `sb_login_codes`: `id`, `player_id` (null when the email matched no player), `email`, `code_hash`, `purpose` (`login` or `confirm_email`), `expires_at` (15 minutes), `attempts` (locks after 5 wrong tries), `used_at`. Row level security on, no policies, like the other server-only tables.
- Codes are stored only as hashes. Old rows are deleted after a day.

## Server

- `/api/sportsbook` (web) gets new actions:
  - `email_code_request { email, purpose }`
  - `email_code_verify { email, code }`. For login this sets the `sb_player` cookie.
  - `profile_update { first_name, last_name }`
- `/api/app/v1` gets the same three. Login returns a session token instead of setting a cookie.
- `join` accepts optional `first_name`, `last_name`, `email`, and rejects them if the age band isn't `13_plus`.
- Rate limits through `overLimit`: 3 code emails per email address per hour and 10 per network per hour. Code checks share the existing `restore` limit.
- `lib/sportsbook/email.ts` sends through Resend using `RESEND_API_KEY`. From: `Run It Back <play@jaiyesobo.com>`. Plain short email: the code, the link (web only), and "Didn't ask for this? Ignore it."
- The tap link carries a one-time token and lands on `/runitback/login/[token]`. It works once and expires with the code.

## Privacy page and help

Update `/runitback/privacy` before this ships:

- What we keep: the nickname. For 13+, optional first name, last name and email.
- Who sees the real name: only the player, and the two people who run Run It Back. Other players never do.
- What the email is for: login codes only. No newsletters, no marketing, never shared.
- Under 13: nickname only, as now.
- Delete: removes the name and email too.

The parents page (`/runitback/parents`) gets one line: under-13 players are never asked for a real name or email.

## Tests

- 13+ player signs up with names and email, confirms, signs in on a second browser by code and by link.
- Under-13 sign-up sends names or email: rejected by the server, not just hidden in the form.
- Unknown email gets the same answer as a known one and sends nothing.
- Wrong code 5 times locks that code. Expired and reused codes fail.
- Another player's email can't be added.
- Delete account clears names and email.
- No public or app API response about another player includes first name, last name or email.
- `/admin/sportsbook` shows real names and emails. `/me/pod` shows real names but no emails. Signed out, neither page loads.

## Before it ships

- Add `RESEND_API_KEY` to **Preview** in Vercel too (it's Production only right now), so login emails can be tested on preview builds.
- Run migration 030.
- Ship a new iPhone app build for the app-side screens. The web works without it, and older app builds keep working with nickname and player code.

## Open questions for Remi

1. ~~What are the real names for?~~ Answered: so Remi and Jaiye can see who's who from their own logins. Players never see each other's real names.
2. Is `play@jaiyesobo.com` the right "from" address, and should replies go to it or nowhere?
3. Should existing 13+ players get a one-time nudge ("Add your email so you never lose your picks"), or just find it in settings?
