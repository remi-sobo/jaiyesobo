# jaiyesobo.com / games — Architecture Doc

**Status:** v0.1 — for review with Remi
**Last updated:** April 25, 2026
**Owner:** Remi (build), Jaiye (curator)

---

## 1. What this is

`/games` is a public NBA games platform on jaiyesobo.com. Three games at launch: Top 5 [Blank], NBA Trivia, NBA All-Time Draft. Anonymous play by default, optional accounts to save results and earn streaks. Every result is shareable as a generated image card. Jaiye is the curator — he adds new questions, prompts, and game variants over time without engineering involvement.

This is a separate **product** from `/me` and from the public brand site. It shares a domain, a brand, and design tokens. It doesn't share data, auth, or routes.

**Audience:** NBA fans. Mostly kids and young adults. People come from social shares, search, and Jaiye's own promotion.

**Why it matters:** The personal site is a portfolio. The games platform is a destination. Friends bring friends. Jaiye's brand grows beyond people who already know him.

---

## 2. Brand positioning

Every game says somewhere visible:

> *Curated by Jaiye Sobo, age 8 · A father-son project from East Palo Alto*

That single line is the most important UX element in the whole platform.

(Full doc preserved in repo — see Slack canvas for live updates.)
