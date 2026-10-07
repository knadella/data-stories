"""
Statcast pulls for the 2026 Blue Jays story: Vladimir Guerrero Jr.'s pitch-level
data (2024-2026), every ball in play at Rogers Centre (2024-2026), and the team's
hitter lines. Writes the JSON the story charts read into public/data/.

Usage: python3 scripts/jays-run-differential/statcast.py
Raw CSVs are cached in scripts/output/ (ignored by git).
"""
import json
import ssl
import urllib.request
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[2]
RAW = ROOT / "scripts" / "output"
OUT = ROOT / "public" / "data"
VLAD = 665489
ROGERS = 14
TEAM = 141
SEASONS = [2024, 2025, 2026]
SWING = {"foul", "hit_into_play", "swinging_strike", "foul_tip", "swinging_strike_blocked", "foul_bunt", "missed_bunt", "bunt_foul_tip"}

try:
    import certifi
    CTX = ssl.create_default_context(cafile=certifi.where())
except ImportError:
    CTX = ssl.create_default_context()


def get(url: str, dest: Path) -> Path:
    if not dest.exists():
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=120, context=CTX) as r:
            dest.write_bytes(r.read())
    return dest


def savant(season: int, extra: str, name: str) -> pd.DataFrame:
    url = (
        "https://baseballsavant.mlb.com/statcast_search/csv?all=true&hfGT=R%7C"
        f"&hfSea={season}%7C&player_type=batter&group_by=name&min_pitches=0&min_results=0"
        f"&min_pas=0&sort_col=pitches&player_event_sort=api_p_release_speed&sort_order=desc&type=details{extra}"
    )
    return pd.read_csv(get(url, RAW / f"{name}_{season}.csv"), low_memory=False)


def prep(d: pd.DataFrame) -> pd.DataFrame:
    d = d.copy()
    d["swing"] = d["description"].isin(SWING)
    d["in_play"] = d["description"] == "hit_into_play"
    d["in_zone"] = d["zone"].between(1, 9)
    # Elevated over the plate: above the batter's own zone top, within the plate's width
    d["above"] = (d["plate_z"] > d["sz_top"]) & (d["plate_x"].abs() < 1.1)
    d["month"] = pd.to_datetime(d["game_date"]).dt.month
    return d


OLD_BOX = (1.65, 3.68)  # average Statcast zone top/bottom for Guerrero through 2025 (feet)
ABS_BOX = (1.62, 3.21)  # the 2026 ABS challenge zone for him: 27% and 53.5% of height
HALF_PLATE = 0.83       # half the plate width plus a ball, in feet


def over_plate(d):
    return d["plate_x"].abs() <= HALF_PLATE


def contact(bip: pd.DataFrame) -> dict:
    return {
        "bip": int(len(bip)),
        "barrels": int((bip["launch_speed_angle"] == 6).sum()),
        "homeRuns": int((bip["events"] == "home_run").sum()),
        "exitVelo": round(float(bip["launch_speed"].mean()), 1) if len(bip) else None,
    }


def vlad_summary(d: pd.DataFrame) -> dict:
    bip = d[d["in_play"] & d["launch_speed"].notna()]
    comp = d[d["swing"] & d["bat_speed"].notna()]
    pa = d["woba_denom"].notna().sum()
    old_in = over_plate(d) & d["plate_z"].between(*OLD_BOX)
    abs_in = over_plate(d) & d["plate_z"].between(*ABS_BOX)
    strip = d[d["swing"] & over_plate(d) & d["plate_z"].between(ABS_BOX[1], OLD_BOX[1])]
    strip_bip = strip[strip["in_play"]]
    upper = bip[over_plate(bip) & bip["plate_z"].between(2.5, 3.5)]
    lower = bip[over_plate(bip) & bip["plate_z"].between(1.6, 2.5)]
    hard = bip[bip["launch_speed"] >= 95]
    sq = bip[bip["bat_speed"].notna()]
    max_ev = 1.23 * sq["bat_speed"] + 0.23 * (sq["release_speed"] * 0.92)
    first = d[(d["balls"] == 0) & (d["strikes"] == 0)]
    return {
        "pa": int(pa),
        "szTop": round(float(d["sz_top"].mean()), 2),
        "szBot": round(float(d["sz_bot"].mean()), 2),
        "homeRuns": int((bip["events"] == "home_run").sum()),
        "strikeoutPct": round(float((d["events"].isin(["strikeout", "strikeout_double_play"])).sum() / pa * 100), 1),
        "walkPct": round(float((d["events"] == "walk").sum() / pa * 100), 1),
        "batSpeed": round(float(comp["bat_speed"].mean()), 1),
        "swingLength": round(float(comp["swing_length"].mean()), 2),
        "attackAngle": round(float(comp["attack_angle"].mean()), 1) if comp["attack_angle"].notna().any() else None,
        "exitVelo": round(float(bip["launch_speed"].mean()), 1),
        "hardHitPct": round(float((bip["launch_speed"] >= 95).mean() * 100), 1),
        "barrelPct": round(float((bip["launch_speed_angle"] == 6).mean() * 100), 1),
        "flyBallDistance": round(float(bip.loc[bip["bb_type"] == "fly_ball", "hit_distance_sc"].mean()), 0),
        "chaseOldBox": round(float(d.loc[~old_in, "swing"].mean() * 100), 1),
        "chaseAbsBox": round(float(d.loc[~abs_in, "swing"].mean() * 100), 1),
        "chaseOwnZone": round(float(d.loc[~(over_plate(d) & d["plate_z"].between(d["sz_bot"], d["sz_top"])), "swing"].mean() * 100), 1),
        "zoneSwingOldBox": round(float(d.loc[old_in, "swing"].mean() * 100), 1),
        "firstPitchSwingPct": round(float(first["swing"].mean() * 100), 1),
        "squaredUpPct": round(float((sq["launch_speed"] / max_ev >= 0.8).mean() * 100), 1),
        "strip": {"swings": int(len(strip)), "ofSwings": int(d["swing"].sum()), **contact(strip_bip)},
        "upperHalf": contact(upper),
        "lowerHalf": contact(lower),
        "hardHit": {
            "n": int(len(hard)),
            "launchAngle": round(float(hard["launch_angle"].mean()), 1),
            "shareInWindow": round(float(hard["launch_angle"].between(8, 32).mean() * 100), 1),
            "angles": [round(float(a), 1) for a in hard["launch_angle"].dropna()],
        },
        "monthly": [
            {
                "month": int(m),
                "barrelPct": round(float((g[g["in_play"]]["launch_speed_angle"] == 6).mean() * 100), 1),
                "homeRuns": int((g["events"] == "home_run").sum()),
                "xwoba": round(float(g["estimated_woba_using_speedangle"].mean()), 3),
            }
            for m, g in d.groupby("month")
            if m >= 4
        ],
    }


def vlad_swings(d: pd.DataFrame) -> list[dict]:
    s = d[d["swing"] & d["plate_x"].notna()]
    return [
        {
            "x": round(float(r.plate_x), 2),
            "z": round(float(r.plate_z), 2),
            "result": "hr" if r.events == "home_run" else ("play" if r.in_play else ("whiff" if "swinging" in str(r.description) else "foul")),
        }
        for r in s.itertuples()
    ]


def rogers(season: int) -> dict:
    d = savant(season, f"&hfStadium={ROGERS}%7C&hfPR=hit%5C.%5C.into%5C.%5C.play%7C", "rogers")
    d = d[d["description"] == "hit_into_play"]
    fb = d[d["bb_type"] == "fly_ball"]
    well = fb[fb["launch_speed"].between(98, 106) & fb["launch_angle"].between(24, 34)]
    return {
        "season": season,
        "homeRuns": int((d["events"] == "home_run").sum()),
        "flyBallDistance": round(float(fb["hit_distance_sc"].mean()), 1),
        "hardHitPct": round(float((d["launch_speed"] >= 95).mean() * 100), 1),
        "wellHitFlies": int(len(well)),
        "wellHitDistance": round(float(well["hit_distance_sc"].mean()), 1),
        "wellHitHrPct": round(float((well["events"] == "home_run").mean() * 100), 1),
    }


def hitters(season: int) -> list[dict]:
    url = (
        f"https://statsapi.mlb.com/api/v1/teams/{TEAM}/roster?season={season}&rosterType=fullSeason"
        f"&hydrate=person(stats(type=season,season={season},group=hitting,gameType=R))"
    )
    data = json.loads(get(url, RAW / f"roster_{season}.json").read_text())
    rows = []
    for p in data["roster"]:
        if p["position"]["abbreviation"] == "P":
            continue
        for st in p["person"].get("stats", []):
            for sp in st.get("splits", []):
                if sp.get("team", {}).get("id") != TEAM:
                    continue
                s = sp["stat"]
                if s.get("plateAppearances", 0) >= 300:
                    rows.append({"name": p["person"]["fullName"], "pa": s["plateAppearances"], "hr": s["homeRuns"], "ops": float(s["ops"]), "obp": float(s["obp"]), "slg": float(s["slg"])})
    rows.sort(key=lambda r: -r["ops"])
    return rows


def main() -> None:
    RAW.mkdir(parents=True, exist_ok=True)
    OUT.mkdir(parents=True, exist_ok=True)
    vlad = {s: prep(savant(s, f"&batters_lookup%5B%5D={VLAD}", "vlad")) for s in SEASONS}
    summary = {str(s): vlad_summary(d) for s, d in vlad.items()}
    summary["boxes"] = {"old": OLD_BOX, "abs": ABS_BOX, "halfPlate": HALF_PLATE}
    (OUT / "vlad-summary.json").write_text(json.dumps(summary, indent=1))
    (OUT / "vlad-swings.json").write_text(json.dumps({str(s): vlad_swings(vlad[s]) for s in (2025, 2026)}))
    (OUT / "rogers-centre.json").write_text(json.dumps([rogers(s) for s in SEASONS], indent=1))
    (OUT / "jays-hitters.json").write_text(json.dumps({str(s): hitters(s) for s in (2025, 2026)}, indent=1))
    for s in SEASONS:
        v = summary[str(s)]
        print(f"{s}: HR {v['homeRuns']} K% {v['strikeoutPct']} bat speed {v['batSpeed']} barrel% {v['barrelPct']} | chase old box {v['chaseOldBox']} own zone {v['chaseOwnZone']} | upper half {v['upperHalf']} | hard-hit LA {v['hardHit']['launchAngle']} window {v['hardHit']['shareInWindow']}%")
    for r in json.loads((OUT / "rogers-centre.json").read_text()):
        print("Rogers", r)
    for s in (2025, 2026):
        print(s, [(h["name"], h["ops"]) for h in json.loads((OUT / "jays-hitters.json").read_text())[str(s)][:6]])


if __name__ == "__main__":
    main()
