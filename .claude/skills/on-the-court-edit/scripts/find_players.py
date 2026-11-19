#!/usr/bin/env python3
"""Find every NBA player Jaiye names in an episode and write the pop-up cue list.

Usage (from the repo root):
  python3 .claude/skills/on-the-court-edit/scripts/find_players.py podcast/episodes/episode-03

Reads   <episode>/transcript/words.json
        podcast/players/players.json        (run fetch_players.py first)
        <skill>/player-aliases.json         nicknames, legends, last names that never count alone
        <skill>/style.json                  "players" section: how long a pop-up stays, and so on
Writes  <episode>/transcript/player-cues.json   one cue per pop-up, plus the names it was not sure about

What counts as a mention: a full name, a nickname from player-aliases.json, or a last name that only
one player has and that is not an everyday word. A last name shared by several players is not guessed.
It goes in "not_sure" for a person to settle.

Running it again keeps any cue a person turned off ("off": true) or pointed at a different player.
It prints a cue sheet. Read it against the transcript before any render.
"""
import json
import re
import sys
import unicodedata
from pathlib import Path

SKILL = Path(__file__).resolve().parent.parent
REPO = SKILL.parent.parent.parent
SUFFIX = {"jr", "sr", "ii", "iii", "iv"}


def toks(s):
    """'Dončić's' -> ['doncic'].  'Karl-Anthony Towns' -> ['karl', 'anthony', 'towns']."""
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode().lower()
    s = re.sub(r"['’]s\b", "", s).replace("-", " ")
    return [t for t in re.sub(r"[^a-z0-9 ]", "", s).split() if t]


def name_toks(s):
    return [t for t in toks(s) if t not in SUFFIX]


def build_table(players, rules):
    """Phrase (a tuple of words) -> list of player ids that phrase could mean."""
    by_name = {" ".join(name_toks(p["name"])): p for p in players}
    table, first_names = {}, {name_toks(p["first"])[0] for p in players if name_toks(p["first"])}
    never = {t for n in rules["never_alone"] for t in toks(n)} | first_names

    def add(words, pid):
        if words:
            table.setdefault(tuple(words), [])
            if pid not in table[tuple(words)]:
                table[tuple(words)].append(pid)

    for p in players:
        full = name_toks(p["name"])
        add(full, p["id"])
        add(["".join(full[:-1]), full[-1]] if len(full) > 2 else None, p["id"])
        last = name_toks(p["last"])
        if len(last) == 1 and last[0] not in never and len(last[0]) >= 4:
            add(last, p["id"])
        elif len(last) > 1:
            add(last, p["id"])
    # A nickname always wins, even over a last name two players share ("Curry" is Steph).
    for alias, name in rules["aliases"].items():
        p = by_name.get(" ".join(name_toks(name)))
        if not p:
            print(f"  alias '{alias}' points at '{name}', who is not in players.json. Skipped.")
            continue
        table[tuple(toks(alias))] = [p["id"]]
        table[(("".join(toks(alias))),)] = [p["id"]] if len(toks(alias)) > 1 else table[tuple(toks(alias))]
    return table


def main():
    ep = Path(sys.argv[1]).resolve()
    index = REPO / "podcast" / "players" / "players.json"
    if not index.exists():
        sys.exit("No player list yet. Run fetch_players.py first.")
    players = json.loads(index.read_text())["players"]
    by_id = {p["id"]: p for p in players}
    rules = json.loads((SKILL / "player-aliases.json").read_text())
    st = json.loads((SKILL / "style.json").read_text())["players"]
    words = json.loads((ep / "transcript" / "words.json").read_text())["words"]
    table = build_table(players, rules)
    longest = max(len(k) for k in table)

    # One entry per transcript word, split further when a word holds two ("Gilgeous-Alexander").
    flat = [(t, i) for i, w in enumerate(words) for t in toks(w["word"])]
    hits, i = [], 0
    while i < len(flat):
        for n in range(min(longest, len(flat) - i), 0, -1):
            ids = table.get(tuple(t for t, _ in flat[i:i + n]))
            if ids:
                a, b = flat[i][1], flat[i + n - 1][1]
                hits.append({"ids": ids, "first_word": a, "last_word": b, "at": words[a]["start"],
                             "said": " ".join(w["word"] for w in words[a:b + 1]),
                             "line": " ".join(w["word"] for w in words[max(0, a - 6):b + 7])})
                i += n
                break
        else:
            i += 1

    old_path = ep / "transcript" / "player-cues.json"
    old = {c["id"]: c for c in json.loads(old_path.read_text())["cues"]} if old_path.exists() else {}
    cues, not_sure, last_shown = [], [], {}
    for h in hits:
        if len(h["ids"]) > 1:
            not_sure.append({"at": h["at"], "said": h["said"], "line": h["line"],
                             "could_be": [by_id[x]["name"] for x in h["ids"]]})
            continue
        p = by_id[h["ids"][0]]
        slug = "-".join(name_toks(p["name"]))
        cue = {"id": f"player-{slug}-{int(h['at'] * 10):05d}", "layout": "player", "player_id": p["id"],
               "name": p["name"], "team": p["team"], "said": h["said"], "line": h["line"],
               "raw_from": round(max(0, h["at"] - st["lead_in_seconds"]), 2)}
        if not p["img"]:
            not_sure.append({"at": h["at"], "said": h["said"], "line": h["line"], "could_be": [p["name"]],
                             "why": "no picture on file"})
            continue
        if h["at"] - last_shown.get(p["id"], -1e9) < st["repeat_gap_seconds"]:
            continue
        last_shown[p["id"]] = h["at"]
        cues.append(cue)

    # Two names close together: each gets at least min_seconds, the later one waits its turn.
    for x, y in zip(cues, cues[1:]):
        if y["raw_from"] - x["raw_from"] < st["min_seconds"]:
            y["raw_from"] = round(x["raw_from"] + st["min_seconds"], 2)
    for k, c in enumerate(cues):
        end = c["raw_from"] + st["hold_seconds"]
        if k + 1 < len(cues):
            end = min(end, cues[k + 1]["raw_from"])
        c["raw_to"] = round(end, 2)
        kept = old.get(c["id"], {})
        if kept.get("off"):
            c["off"] = True
        if kept.get("player_id") and kept["player_id"] != c["player_id"] and kept["player_id"] in by_id:
            c.update(player_id=kept["player_id"], name=by_id[kept["player_id"]]["name"],
                     team=by_id[kept["player_id"]]["team"])

    old_path.write_text(json.dumps({
        "episode": ep.name, "status": "draft",
        "note": "Built by find_players.py. One cue is one player cutout popping up from raw_from to raw_to "
                "(raw seconds). Set \"off\": true to drop one, or change player_id to fix a wrong face; both "
                "survive a rebuild. 'not_sure' are names the script would not guess. To show one, add a "
                "nickname to player-aliases.json and run this again.",
        "cues": cues, "not_sure": not_sure}, indent=1, ensure_ascii=False) + "\n")

    def clock(t):
        return f"{int(t // 60)}:{t % 60:04.1f}"

    print(f"\n{len(cues)} pop-ups, {len({c['player_id'] for c in cues})} different players. "
          f"{len(hits) - len(cues) - len(not_sure)} repeat mentions left out.\n")
    for c in cues:
        print(f"  {clock(c['raw_from']):>7}  {c['name']:<26} {c['team']:<4} \"{c['line']}\"")
    if not_sure:
        print("\nNot sure, no pop-up:")
        for n in not_sure:
            print(f"  {clock(n['at']):>7}  \"{n['said']}\" could be {', '.join(n['could_be'][:5])}"
                  f"{'  (' + n['why'] + ')' if n.get('why') else ''}   \"{n['line']}\"")


if __name__ == "__main__":
    main()
