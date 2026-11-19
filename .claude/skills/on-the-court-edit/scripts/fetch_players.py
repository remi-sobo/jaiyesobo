#!/usr/bin/env python3
"""Download NBA player cutouts (head and shoulders, clear background) for the on-screen pop-ups.

Usage (from the repo root):
  python3 .claude/skills/on-the-court-edit/scripts/fetch_players.py [--refresh]

Writes  podcast/players/players.json   the index: id, name, team, picture file. Committed.
        podcast/players/img/<id>.png   the pictures. Gitignored: they belong to the NBA and this repo is public.

Who is included: every active NBA player, plus the "legends" listed in <skill>/player-aliases.json.
Where it looks:
  names and NBA ids   the nba_api project's player list on GitHub
  teams               ESPN's public roster pages
  pictures            cdn.nba.com headshots (1040x760), then ESPN's headshot when the NBA has none

Run it again any time (new season, a trade, a new legend). Pictures already on disk are kept unless
--refresh is given. Only public pages are read. Nothing about the show is sent anywhere.
"""
import ast
import json
import re
import sys
import unicodedata
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
REPO = SKILL.parent.parent.parent
OUT = REPO / "podcast" / "players"
IMG = OUT / "img"

NAMES_URL = "https://raw.githubusercontent.com/swar/nba_api/master/src/nba_api/stats/library/data.py"
ESPN_TEAMS = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams?limit=40"
ESPN_ROSTER = "https://site.api.espn.com/apis/site/v2/sports/basketball/nba/teams/{}/roster"
NBA_IMG = "https://cdn.nba.com/headshots/nba/latest/1040x760/{}.png"
MIN_BYTES = 20000  # the NBA serves a small grey silhouette when it has no picture of a player


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urllib.request.urlopen(req, timeout=30) as r:
        return r.read()


def key(name):
    """'Luka Dončić Jr.' -> 'luka doncic'. Used to match the same person across the two sources."""
    s = unicodedata.normalize("NFKD", name).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"\b(jr|sr|ii|iii|iv)\b\.?", "", s)
    return " ".join(re.sub(r"[^a-z ]", "", s.replace("-", " ")).split())


def nba_names():
    """The `players = [...]` list from nba_api, read as data. The file is never run."""
    src = get(NAMES_URL).decode()
    start = src.index("\nplayers = [") + len("\nplayers = ")
    rows = ast.literal_eval(src[start:src.index("\n]", start) + 2])
    return [{"id": r[0], "last": r[1], "first": r[2], "name": r[3], "active": bool(r[4])} for r in rows]


def espn_rosters():
    """name key -> team short name and ESPN picture, for everyone on a roster today."""
    teams = json.loads(get(ESPN_TEAMS))["sports"][0]["leagues"][0]["teams"]
    found, failed = {}, []

    def one(t):
        t = t["team"]
        try:
            return t, json.loads(get(ESPN_ROSTER.format(t["id"]))).get("athletes", [])
        except Exception as err:
            failed.append(f"{t['displayName']} ({err})")
            return t, []

    with ThreadPoolExecutor(8) as pool:
        for t, athletes in pool.map(one, teams):
            for a in athletes:
                found[key(a["fullName"])] = {"team": t["abbreviation"], "team_name": t["displayName"],
                                             "espn_img": (a.get("headshot") or {}).get("href")}
    if failed:
        sys.exit("Stopped, nothing written. Could not read these rosters, so their players would lose "
                 "their team: " + "; ".join(failed) + ". Try again in a minute.")
    return found


def picture(p, refresh):
    path = IMG / f"{p['id']}.png"
    if path.exists() and not refresh:
        return "kept"
    for source, url in (("nba", NBA_IMG.format(p["id"])), ("espn", p.get("espn_img"))):
        if not url:
            continue
        try:
            data = get(url)
        except Exception:
            continue
        if data[:8] == b"\x89PNG\r\n\x1a\n" and len(data) >= MIN_BYTES:
            path.write_bytes(data)
            return source
    return None


def main():
    refresh = "--refresh" in sys.argv
    IMG.mkdir(parents=True, exist_ok=True)
    legends = {key(n) for n in json.loads((SKILL / "player-aliases.json").read_text()).get("legends", [])}

    print("Reading the player list and the 30 rosters...")
    everyone, rosters = nba_names(), espn_rosters()
    chosen, seen = [], set()
    # Newest id first, so when two players share a name the current one wins.
    for p in sorted(everyone, key=lambda p: -p["id"]):
        k = key(p["name"])
        if k in seen or not (p["active"] or k in legends or k in rosters):
            continue
        seen.add(k)
        chosen.append({**p, **rosters.get(k, {}), "legend": k in legends and not p["active"]})
    for miss in sorted(legends - seen):
        print(f"  legend not found in the NBA list, check the spelling: {miss}")

    print(f"Getting pictures for {len(chosen)} players...")
    with ThreadPoolExecutor(12) as pool:
        got = list(pool.map(lambda p: picture(p, refresh), chosen))

    index, missing = [], []
    for p, src in zip(chosen, got):
        if not src:
            missing.append(p["name"])
        index.append({"id": p["id"], "name": p["name"], "first": p["first"], "last": p["last"],
                      "team": "" if p["legend"] else p.get("team", ""),
                      "team_name": "" if p["legend"] else p.get("team_name", ""),
                      "legend": p["legend"], "img": f"img/{p['id']}.png" if src else None})
    index.sort(key=lambda p: (p["last"].lower(), p["first"].lower()))
    (OUT / "players.json").write_text(json.dumps({
        "note": "Built by fetch_players.py. Do not edit by hand. Run the script again to update. "
                "Pictures live in img/ next to this file and are not in git.",
        "players": index}, indent=1, ensure_ascii=False) + "\n")

    new = sum(1 for s in got if s in ("nba", "espn"))
    print(f"{len(index)} players in the index. {new} pictures downloaded, {got.count('kept')} already here, "
          f"{len(missing)} with no picture.")
    if missing:
        print("No picture for: " + ", ".join(sorted(missing)))


if __name__ == "__main__":
    main()
