"""
Pull every completed Blue Jays regular-season game for the given seasons from the
MLB Stats API and write one JSON per season to public/data/.

Usage: python3 scripts/jays-run-differential/fetch.py 2025 2026

Each game record: date, opponent, home, rs, ra, win, and the running totals the
story charts: cumulative run differential, wins, losses, and Pythagorean expected
wins (exponent 1.83) through that game.
"""
import json
import ssl
import sys
import urllib.request
from pathlib import Path

TEAM_ID = 141  # Toronto Blue Jays
EXP = 1.83
OUT = Path(__file__).resolve().parents[2] / "public" / "data"


def fetch(season: int) -> list[dict]:
    url = (
        "https://statsapi.mlb.com/api/v1/schedule"
        f"?sportId=1&teamId={TEAM_ID}&season={season}&gameType=R"
    )
    try:
        import certifi

        ctx = ssl.create_default_context(cafile=certifi.where())
    except ImportError:  # fall back to the system trust store
        ctx = ssl.create_default_context()
    with urllib.request.urlopen(url, timeout=30, context=ctx) as r:
        payload = json.load(r)
    games = []
    for day in payload["dates"]:
        for g in day["games"]:
            if g["status"]["abstractGameState"] != "Final":
                continue
            home, away = g["teams"]["home"], g["teams"]["away"]
            jays, opp = (home, away) if home["team"]["id"] == TEAM_ID else (away, home)
            if "score" not in jays or "score" not in opp:
                continue  # postponed or cancelled games carry Final with no score
            games.append(
                {
                    "date": day["date"],
                    "gamePk": g["gamePk"],
                    "opponent": opp["team"]["name"],
                    "home": jays is home,
                    "rs": jays["score"],
                    "ra": opp["score"],
                    "win": bool(jays.get("isWinner", False)),
                }
            )
    games.sort(key=lambda x: (x["date"], x["gamePk"]))
    return games


def enrich(games: list[dict]) -> list[dict]:
    rs = ra = w = l = 0
    for i, g in enumerate(games, start=1):
        rs += g["rs"]
        ra += g["ra"]
        w += g["win"]
        l += not g["win"]
        pyth = rs**EXP / (rs**EXP + ra**EXP) if rs + ra else 0.5
        g.update(
            {
                "game": i,
                "cumRs": rs,
                "cumRa": ra,
                "cumDiff": rs - ra,
                "wins": w,
                "losses": l,
                "pythWinPct": round(pyth, 4),
                "pythWins": round(pyth * i, 2),
            }
        )
    return games


def main() -> None:
    seasons = [int(s) for s in sys.argv[1:]] or [2026]
    OUT.mkdir(parents=True, exist_ok=True)
    for season in seasons:
        games = enrich(fetch(season))
        out = OUT / f"jays-{season}.json"
        out.write_text(json.dumps({"season": season, "team": "Toronto Blue Jays", "games": games}, indent=1))
        last = games[-1]
        print(
            f"{season}: {len(games)} games, {last['wins']}-{last['losses']}, "
            f"RS {last['cumRs']} RA {last['cumRa']} diff {last['cumDiff']:+}, "
            f"pythagorean {last['pythWins']:.1f} wins"
        )


if __name__ == "__main__":
    main()
