import * as d3 from "d3";
import { mountScrolly } from "../../lib/scrolly.js";
import { dataUrl, mediaUrl, videoFigure } from "../../lib/media.js";

/**
 * Vladimir Guerrero Jr.: the career arc, and where 2026 is an anomaly.
 * Data: public/data/vlad-career.json, vlad-summary.json, vlad-swings.json,
 * vlad-clips.json, produced by scripts/vladimir-guerrero-jr/statcast.py from
 * Baseball Savant and the MLB Stats API.
 */

const REPO = "https://github.com/knadella/data-stories";
const ACCENT = "var(--accent)";
const INK2 = "var(--ink-2)";
const INK3 = "var(--ink-3)";
const SEASONS = [2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026];

const steps = [
  {
    id: "arc",
    html: `<p>Vladimir Guerrero Jr. reached the majors at 20, hit 48 home runs at 22 and finished second in the MVP vote, then settled into a run of 26, 30 and 23. In October 2025 he was the ALCS MVP, six months after signing a 14-year, $500 million extension.</p><p>In 2026 he hit nine. This story is about where those home runs went, measured against the only baseline that matters for him, which is himself.</p>`,
  },
  {
    id: "cold",
    html: `<p>He has had cold stretches before. The line is his barrel rate over a rolling 30-game window across every one of his 1,091 career games.</p><p>In 2023, the last season people called a down year, the rate dipped under 8 percent for 28 games before recovering. In 2026 it stayed under 8 percent for 52 straight games, from the second week of May into July, the longest cold stretch of his career by a wide margin.</p>`,
  },
  {
    id: "anomaly",
    html: `<p>To see what actually changed, score each 2026 number against his own 2019 to 2025 seasons. The dots show how many standard deviations each one sits from his career average, with the shaded band marking the range of ordinary year-to-year variation.</p><p>The approach is normal Vladdy. His chase rate, measured against a fixed strike zone, is at his career average. His first-pitch swing rate is below it. His pull rate, ground ball rate and swing rate in the zone are all within range. The extreme values are all on the output side: how far his fly balls carried and how often they left the park.</p>`,
  },
  {
    id: "upper",
    html: `<p>The power left from one place. As a rookie he hit almost everything out of the lower half of the zone: one home run from the upper half in 2019, two in 2020. Then he lost 42 pounds over the winter of 2020 and the top of the zone opened up. From 2021 to 2025 he hit between 12 and 30 home runs a year from pitches above the midpoint of the zone.</p><p>In 2026 he put 168 balls in play from that zone and hit zero home runs. The lower half held up almost unchanged. His profile reverted to his 20-year-old self.</p>`,
  },
  {
    id: "quality",
    html: `<p>The cleanest single measure of a power hitter is how often a ball in play is both hard hit and in the air at a home run angle. For Guerrero that share was 14 percent as a rookie, 25 percent in his 48-homer year, and between 20 and 25 percent every year since.</p><p>In 2026 it was 15 percent, back to the rookie level. That is the anomaly in one number: the same number of balls in play, a third fewer of them struck well in the air.</p>`,
  },
  {
    id: "angle",
    html: `<p>Where did the well-struck balls go? Into the ground. On balls hit 95 miles an hour or harder, his launch angle averaged 4.7 degrees in 2026, the lowest of his career, and 59 percent of them were on the ground, the highest.</p><p>His bat speed was 74.8 miles an hour, within half a mile an hour of the three seasons Statcast has tracked it. The bat is as fast as ever. It is arriving a fraction late, or a fraction high, on the pitches he used to lift.</p>`,
  },
  {
    id: "fly",
    html: `<p>The fly balls he did hit were the mishits. His average fly ball travelled 295 feet in 2026 against a career norm of about 324, more than four standard deviations below his own baseline and the most anomalous number of the season. Fly balls left his bat at 89 miles an hour, five slower than the year before.</p><p>The Rogers Centre is not the reason. Well-struck fly balls by every hitter carried the same distance there in 2026 as in 2025, and left the park more often.</p>`,
  },
  {
    id: "zone",
    html: `<p>One thing the discourse got wrong. The widely quoted number is that his out-of-zone swing rate jumped about nine points, which reads as a hitter who lost his discipline.</p><p>In 2026 MLB introduced the ABS challenge zone, set at 53.5 percent of a batter's height. For a listed six-footer that moved the top of his measured zone from 3.68 feet to 3.21 feet. The dots are every swing he took in 2026. The shaded strip holds 89 swings that were strikes in 2025's data and chases in 2026's. Against a fixed box, his chase rate rose from 23 to 28 percent, which is his career average.</p>`,
  },
  {
    id: "months",
    html: `<p>April looked like the player of the previous five seasons. His barrel rate that month was 14.5 percent. It fell to 1.1 percent in May and never got back above 10.</p><p>In 2023, the comparison year, the slump came in late summer and the recovery came in September. In 2026 he was named an All-Star on July 4 but sat out with lower back discomfort, and the recovery never came. His bat speed was flat every month, which argues against a simple physical decline and leaves timing and health as the open questions for 2027.</p>`,
  },
];

const fmtMonth = (m) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"][m - 1];

function graphic(el, data) {
  el.innerHTML = `<p class="chart-title"></p><p class="chart-note"></p>`;
  const titleEl = el.querySelector(".chart-title");
  const noteEl = el.querySelector(".chart-note");

  const width = 640;
  const height = 420;
  const margin = { top: 24, right: 72, bottom: 40, left: 52 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const views = {};
  const view = (name) => (views[name] ||= root.append("g").attr("class", `view-${name}`).attr("opacity", 0));

  const seasons = data.career.seasons;
  const bySeason = Object.fromEntries(seasons.map((s) => [s.season, s]));
  const xBand = d3.scaleBand().domain(SEASONS).range([0, innerW]).paddingInner(0.3).paddingOuter(0.15);

  const seasonBars = (g, value, { domain, format = d3.format("d"), note }) => {
    const y = d3.scaleLinear().domain(domain).range([innerH, 0]);
    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(xBand).tickFormat(String));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(format));
    g.selectAll("rect.bar").data(seasons).join("rect").attr("class", "bar")
      .attr("x", (s) => xBand(s.season)).attr("width", xBand.bandwidth())
      .attr("y", (s) => y(value(s))).attr("height", (s) => innerH - y(value(s)))
      .attr("fill", (s) => (s.season === 2026 ? ACCENT : INK3));
    g.selectAll("text.val").data(seasons).join("text").attr("class", (s) => `label val ${s.season === 2026 ? "is-accent" : ""}`)
      .attr("x", (s) => xBand(s.season) + xBand.bandwidth() / 2).attr("y", (s) => y(value(s)) - 6).attr("text-anchor", "middle").text((s) => format(value(s)));
    if (note) g.append("text").attr("class", "label").attr("x", 0).attr("y", -8).text(note);
    return y;
  };

  // ---------- View 1: home runs by season ----------
  {
    const g = view("hr");
    const y = seasonBars(g, (s) => s.homeRuns, { domain: [0, 55], note: "Home runs by season" });
    const s21 = bySeason[2021];
    g.append("text").attr("class", "label").attr("x", xBand(2021) + xBand.bandwidth() / 2).attr("y", y(s21.homeRuns) - 22).attr("text-anchor", "middle").text("MVP runner-up");
    g.append("text").attr("class", "label").attr("x", xBand(2025) + xBand.bandwidth() / 2).attr("y", y(bySeason[2025].homeRuns) - 22).attr("text-anchor", "middle").text("$500M extension");
    g.update = () => {};
  }

  // ---------- View 2: rolling barrel rate across the career ----------
  {
    const g = view("rolling");
    const roll = data.career.rolling.filter((r) => r.barrelPct != null);
    const x = d3.scaleLinear().domain([1, roll.length]).range([0, innerW]);
    const y = d3.scaleLinear().domain([0, 30]).range([innerH, 0]);
    const line = d3.line().x((r) => x(r.game)).y((r) => y(r.barrelPct)).curve(d3.curveMonotoneX);
    // season boundaries
    const starts = SEASONS.map((s) => roll.find((r) => r.season === s)?.game).filter(Boolean);
    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(""));
    starts.forEach((gm, i) => {
      g.append("line").attr("x1", x(gm)).attr("x2", x(gm)).attr("y1", 0).attr("y2", innerH).attr("stroke", "var(--rule)");
      const next = starts[i + 1] ?? roll.length;
      g.append("text").attr("class", "label").attr("x", x((gm + next) / 2)).attr("y", innerH + 16).attr("text-anchor", "middle").attr("font-size", 11).text(SEASONS[i]);
    });
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4).tickFormat((d) => `${d}%`));
    g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", y(8)).attr("y2", y(8)).attr("stroke", INK3).attr("stroke-dasharray", "4 4");
    g.append("text").attr("class", "label").attr("x", innerW).attr("y", y(8) - 6).attr("text-anchor", "end").text("8% barrel rate");
    // longest run under 8% in 2026
    const r26 = roll.filter((r) => r.season === 2026);
    let best = [0, 0], cur = null;
    r26.forEach((r) => { if (r.barrelPct < 8) { cur = cur ?? r.game; if (r.game - cur + 1 > best[1] - best[0] + 1) best = [cur, r.game]; } else cur = null; });
    g.append("rect").attr("x", x(best[0])).attr("y", 0).attr("width", x(best[1]) - x(best[0])).attr("height", innerH).attr("fill", "var(--accent-soft)");
    g.append("text").attr("class", "label is-accent").attr("x", x(best[0]) - 6).attr("y", 14).attr("text-anchor", "end").text(`${best[1] - best[0] + 1} straight games under 8%`);
    g.append("path").datum(roll.filter((r) => r.season < 2026)).attr("class", "series").attr("d", line);
    g.append("path").datum(roll.filter((r) => r.season >= 2026)).attr("class", "series is-accent").attr("d", line);
    g.append("text").attr("class", "label").attr("x", 0).attr("y", -8).text("Barrel rate, rolling 30 games, every career game");
    g.update = () => {};
  }

  // ---------- View 3: z-scores of 2026 against 2019-2025 ----------
  {
    const g = view("z");
    const metrics = [
      ["Chase rate (fixed zone)", "chaseOldBox"],
      ["First-pitch swing rate", "firstPitchSwingPct"],
      ["Swing rate in the zone", "zoneSwingOldBox"],
      ["Pull rate on hard contact", "hardHitPulled"],
      ["Ground ball rate", "groundBallPct"],
      ["Max exit velocity", "maxExitVelo"],
      ["Average exit velocity", "exitVelo"],
      ["Hard-hit rate", "hardHitPct"],
      ["Expected wOBA", "xwoba"],
      ["Barrel rate", "barrelPct"],
      ["Hard contact at HR angles", "hardHitInWindow"],
      ["Home runs per fly ball", "hrPerFlyBall"],
      ["Fly ball distance", "flyBallDistance"],
    ];
    const base = seasons.filter((s) => s.season < 2026);
    const rows = metrics.map(([label, key]) => {
      const vals = base.map((s) => s[key]).filter((v) => v != null);
      const mean = d3.mean(vals), sd = d3.deviation(vals);
      return { label, key, z: (bySeason[2026][key] - mean) / sd, value: bySeason[2026][key], mean };
    });
    rows.sort((a, b) => b.z - a.z);
    const x = d3.scaleLinear().domain([-5, 2]).range([0, innerW]);
    const y = d3.scalePoint().domain(rows.map((r) => r.label)).range([0, innerH]).padding(0.5);
    g.append("rect").attr("x", x(-2)).attr("y", 0).attr("width", x(2) - x(-2)).attr("height", innerH).attr("fill", "var(--rule)").attr("opacity", 0.35);
    g.append("text").attr("class", "label").attr("x", x(0)).attr("y", -8).attr("text-anchor", "middle").text("Within 2 standard deviations of his own average");
    g.append("line").attr("x1", x(0)).attr("x2", x(0)).attr("y1", 0).attr("y2", innerH).attr("stroke", INK3);
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(7).tickFormat((d) => (d > 0 ? `+${d}` : `${d}`)));
    g.append("text").attr("class", "label").attr("x", innerW).attr("y", innerH + 34).attr("text-anchor", "end").text("Standard deviations from his 2019 to 2025 average");
    rows.forEach((r) => {
      const out = Math.abs(r.z) > 2;
      g.append("line").attr("x1", x(0)).attr("x2", x(r.z)).attr("y1", y(r.label)).attr("y2", y(r.label)).attr("stroke", out ? ACCENT : INK3).attr("stroke-width", 1);
      g.append("circle").attr("cx", x(r.z)).attr("cy", y(r.label)).attr("r", 5).attr("fill", out ? ACCENT : INK2);
      g.append("text").attr("class", `label ${out ? "is-accent" : ""}`).attr("x", r.z < 0 ? x(0) + 8 : x(0) - 8).attr("y", y(r.label)).attr("dy", "0.35em").attr("text-anchor", r.z < 0 ? "start" : "end").text(r.label);
    });
    g.update = () => {};
  }

  // ---------- View 4: upper-half vs lower-half home runs by season ----------
  {
    const g = view("upper");
    const x1 = d3.scaleBand().domain(["upper", "lower"]).range([0, xBand.bandwidth()]).padding(0.1);
    const y = d3.scaleLinear().domain([0, 34]).range([innerH, 0]);
    const rows = seasons.flatMap((s) => [{ season: s.season, half: "upper", v: s.upperHalf.homeRuns }, { season: s.season, half: "lower", v: s.lowerHalf.homeRuns }]);
    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(xBand).tickFormat(String));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5));
    g.selectAll("rect.bar").data(rows).join("rect").attr("class", "bar")
      .attr("x", (d) => xBand(d.season) + x1(d.half)).attr("width", x1.bandwidth())
      .attr("y", (d) => y(d.v)).attr("height", (d) => innerH - y(d.v))
      .attr("fill", (d) => (d.half === "upper" ? ACCENT : INK3));
    g.selectAll("text.val").data(rows.filter((d) => d.half === "upper")).join("text").attr("class", "label is-accent")
      .attr("x", (d) => xBand(d.season) + x1("upper") + x1.bandwidth() / 2).attr("y", (d) => y(d.v) - 5).attr("text-anchor", "middle").text((d) => d.v);
    g.append("text").attr("class", "label").attr("x", 0).attr("y", -8).text("Home runs on pitches over the plate, by height");
    const legend = g.append("g").attr("transform", `translate(${innerW - 230},-14)`);
    [["Upper half of the zone", ACCENT], ["Lower half", INK3]].forEach(([label, c], i) => {
      const li = legend.append("g").attr("transform", `translate(${i * 150},0)`);
      li.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", c);
      li.append("text").attr("class", "label").attr("x", 16).attr("y", 10).text(label);
    });
    g.append("text").attr("class", "label").attr("x", xBand(2021) + xBand.bandwidth() / 2).attr("y", y(30) - 20).attr("text-anchor", "middle").text("After losing 42 lb");
    g.update = () => {};
  }

  // ---------- View 5: quality air contact share ----------
  {
    const g = view("quality");
    seasonBars(g, (s) => s.qualityAirPct, { domain: [0, 30], format: (d) => `${d3.format(".0f")(d)}%`, note: "Share of balls in play hit 95+ mph at 8° to 32°" });
    g.update = () => {};
  }

  // ---------- View 6: hard-hit launch angle density, 2025 vs 2026 ----------
  {
    const g = view("angle");
    const v = data.summary;
    const x = d3.scaleLinear().domain([-40, 60]).range([0, innerW]);
    const kde = (vals, bw = 4) => d3.range(-40, 61, 1).map((a) => [a, d3.mean(vals, (val) => Math.exp(-0.5 * ((a - val) / bw) ** 2) / (bw * Math.sqrt(2 * Math.PI)))]);
    const dens = { 2025: kde(v[2025].hardHit.angles), 2026: kde(v[2026].hardHit.angles) };
    const y = d3.scaleLinear().domain([0, d3.max([...dens[2025], ...dens[2026]], (d) => d[1]) * 1.1]).range([innerH, 0]);
    g.append("rect").attr("x", x(8)).attr("y", 0).attr("width", x(32) - x(8)).attr("height", innerH).attr("fill", "var(--accent-soft)");
    g.append("text").attr("class", "label").attr("x", x(20)).attr("y", 12).attr("text-anchor", "middle").text("Home run window, 8° to 32°");
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(10).tickFormat((d) => `${d}°`));
    g.append("text").attr("class", "label").attr("x", innerW).attr("y", innerH + 34).attr("text-anchor", "end").text("Launch angle of balls hit 95 mph or harder");
    const area = d3.area().x((d) => x(d[0])).y0(innerH).y1((d) => y(d[1])).curve(d3.curveBasis);
    g.append("path").datum(dens[2025]).attr("d", area).attr("fill", INK3).attr("opacity", 0.25);
    g.append("path").datum(dens[2026]).attr("d", area).attr("fill", ACCENT).attr("opacity", 0.35);
    g.append("text").attr("class", "label").attr("x", x(v[2025].hardHit.launchAngle)).attr("y", innerH - 60).attr("text-anchor", "middle").text(`2025 avg ${v[2025].hardHit.launchAngle}°`);
    g.append("text").attr("class", "label is-accent").attr("x", x(v[2026].hardHit.launchAngle)).attr("y", innerH - 40).attr("text-anchor", "middle").text(`2026 avg ${v[2026].hardHit.launchAngle}°`);
    g.update = () => {};
  }

  // ---------- View 7: fly ball distance by season ----------
  {
    const g = view("fly");
    const y = seasonBars(g, (s) => s.flyBallDistance, { domain: [250, 350], format: (d) => `${d} ft`, note: "Average fly ball distance" });
    const mean = d3.mean(seasons.filter((s) => s.season < 2026), (s) => s.flyBallDistance);
    g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", y(mean)).attr("y2", y(mean)).attr("stroke", INK2).attr("stroke-dasharray", "4 4");
    g.append("text").attr("class", "label").attr("x", innerW).attr("y", y(mean) - 6).attr("text-anchor", "end").text(`2019 to 2025 average, ${Math.round(mean)} ft`);
    g.update = () => {};
  }

  // ---------- View 8: strike-zone swing map ----------
  {
    const g = view("zone");
    const boxes = data.summary.boxes;
    const swings = data.swings[2026];
    const x = d3.scaleLinear().domain([-2, 2]).range([innerW / 2 - innerH * 0.4, innerW / 2 + innerH * 0.4]);
    const z = d3.scaleLinear().domain([0, 5]).range([innerH, 0]);
    g.append("line").attr("x1", x(-0.71)).attr("x2", x(0.71)).attr("y1", z(0.1)).attr("y2", z(0.1)).attr("stroke", INK3).attr("stroke-width", 3);
    g.append("text").attr("class", "label").attr("x", x(0)).attr("y", innerH + 20).attr("text-anchor", "middle").text("Catcher's view. Every swing, 2026.");
    g.append("g").selectAll("circle").data(swings).join("circle")
      .attr("cx", (d) => x(d.x)).attr("cy", (d) => z(d.z)).attr("r", 2.6)
      .attr("fill", (d) => (d.result === "hr" ? ACCENT : INK3)).attr("opacity", (d) => (d.result === "hr" ? 1 : 0.35));
    const bw = boxes.halfPlate;
    g.append("rect").attr("x", x(-bw)).attr("y", z(boxes.old[1])).attr("width", x(bw) - x(-bw)).attr("height", z(boxes.abs[1]) - z(boxes.old[1])).attr("fill", ACCENT).attr("opacity", 0.18);
    g.append("rect").attr("x", x(-bw)).attr("y", z(boxes.old[1])).attr("width", x(bw) - x(-bw)).attr("height", z(boxes.old[0]) - z(boxes.old[1])).attr("fill", "none").attr("stroke", INK2).attr("stroke-width", 1.5).attr("stroke-dasharray", "5 4");
    g.append("rect").attr("x", x(-bw)).attr("y", z(boxes.abs[1])).attr("width", x(bw) - x(-bw)).attr("height", z(boxes.abs[0]) - z(boxes.abs[1])).attr("fill", "none").attr("stroke", ACCENT).attr("stroke-width", 2);
    g.append("text").attr("class", "label").attr("x", x(bw) + 8).attr("y", z(boxes.old[1])).attr("dy", "0.35em").text(`Zone top through 2025: ${boxes.old[1]} ft`);
    g.append("text").attr("class", "label is-accent").attr("x", x(bw) + 8).attr("y", z(boxes.abs[1])).attr("dy", "0.35em").text(`ABS zone top, 2026: ${boxes.abs[1]} ft`);
    g.append("text").attr("class", "label is-accent").attr("x", x(-bw) - 8).attr("y", (z(boxes.old[1]) + z(boxes.abs[1])) / 2).attr("dy", "0.35em").attr("text-anchor", "end").text(`${data.summary[2026].strip.swings} swings relabelled as chases`);
    g.update = () => {};
  }

  // ---------- View 9: monthly barrel rate, 2026 against 2023 ----------
  {
    const g = view("months");
    const v = data.summary;
    const x = d3.scalePoint().domain([4, 5, 6, 7, 8, 9]).range([0, innerW]).padding(0.5);
    const y = d3.scaleLinear().domain([0, 20]).range([innerH, 0]);
    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).tickFormat(fmtMonth));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4).tickFormat((d) => `${d}%`));
    g.append("text").attr("class", "label").attr("x", 0).attr("y", -8).text("Barrel rate by month");
    const line = d3.line().x((d) => x(d.month)).y((d) => y(d.barrelPct));
    for (const s of [2023, 2026]) {
      const m = v[s].monthly.filter((d) => d.month >= 4 && d.month <= 9);
      g.append("path").datum(m).attr("class", `series ${s === 2026 ? "is-accent" : ""}`).attr("d", line);
      g.selectAll(`circle.m${s}`).data(m).join("circle").attr("class", `m${s}`).attr("cx", (d) => x(d.month)).attr("cy", (d) => y(d.barrelPct)).attr("r", 4).attr("fill", s === 2026 ? ACCENT : INK2);
      g.append("text").attr("class", `label ${s === 2026 ? "is-accent" : ""}`).attr("x", x(9) + 10).attr("y", y(m.at(-1).barrelPct)).attr("dy", "0.35em").text(String(s));
    }
    const apr = v[2026].monthly.find((d) => d.month === 4);
    g.append("text").attr("class", "label is-accent").attr("x", x(4)).attr("y", y(apr.barrelPct) - 12).attr("text-anchor", "middle").text(`April ${apr.barrelPct}%`);
    g.update = () => {};
  }

  const states = [
    { view: "hr", title: "Nine home runs, after seven seasons of at least 15", note: "Regular season home runs, 2019 to 2026. Source: MLB Stats API." },
    { view: "rolling", title: "The longest cold stretch of his career, by far", note: "Barrel rate over a rolling 30-game window across all 1,091 career games. Source: Baseball Savant." },
    { view: "z", title: "The approach is normal. The output is not.", note: "Each 2026 number scored against his own 2019 to 2025 seasons. Chase rate uses a fixed zone. Source: Baseball Savant." },
    { view: "upper", title: "Zero home runs from the upper half of the zone, like his rookie year", note: "Balls in play on pitches over the plate, split at 2.5 feet. Source: Baseball Savant." },
    { view: "quality", title: "Quality air contact fell back to the rookie level", note: "Balls in play that were both hard hit and at a home run angle. Source: Baseball Savant." },
    { view: "angle", title: "The hard contact went into the ground", note: "Distribution of launch angles on balls hit 95 mph or harder, 2025 and 2026. Source: Baseball Savant." },
    { view: "fly", title: "Fly balls carried 29 feet shorter than his norm", note: "Average distance of fly balls by season. Source: Baseball Savant." },
    { view: "zone", title: "The strike zone moved more than the hitter did", note: "Every 2026 swing, catcher's view. Dashed box: the zone used in his data through 2025. Solid box: the 2026 ABS zone." },
    { view: "months", title: "April looked like 2025. Nothing after it did.", note: "Barrel rate by month, 2026 against 2023, his previous down year. Source: Baseball Savant." },
  ];

  const onStep = (i) => {
    const s = states[Math.min(i, states.length - 1)];
    titleEl.textContent = s.title;
    noteEl.textContent = s.note;
    const t = d3.transition().duration(500);
    for (const [name, g] of Object.entries(views)) g.transition(t).attr("opacity", name === s.view ? 1 : 0);
    views[s.view].update(s);
  };

  return { onStep };
}

export default {
  slug: "vladimir-guerrero-jr-2026",
  kicker: "Blue Jays",
  title: "Where Vladdy's power went",
  dek: "Vladimir Guerrero Jr. hit nine home runs in 2026 after seven seasons of at least 15. Measured against his own career, the approach is unchanged and the chase narrative is mostly a measurement artifact. The anomaly is where the ball goes after he hits it.",
  date: "2026-10-09",
  readingTime: 8,
  draft: false,

  mount(root) {
    let scrolly = null;
    let cancelled = false;

    const scrollyRoot = document.createElement("div");
    scrollyRoot.innerHTML = `<p class="prose" style="color: var(--ink-3)">Loading eight seasons of pitches…</p>`;
    root.appendChild(scrollyRoot);

    const prose = document.createElement("div");
    prose.className = "prose";
    prose.innerHTML = `
      <h2>What it means</h2>
      <p>Against his own baseline, 2026 is an anomaly in output and not in approach. The inputs that a hitting coach or a front office would normally reach for, swing decisions, bat speed and raw exit velocity, are all inside his ordinary range. What moved is the angle his hard contact leaves the bat and the quality of the balls he puts in the air, and both moved in May and stayed moved.</p>
      <p>That narrows the question for 2027 to two candidates. One is timing, which is coachable and tends to show up as exactly this pattern: the same bat speed arriving late on elevated pitches and driving them into the ground. The other is health, given the back discomfort that kept him out of the All-Star Game, which would be consistent with the fly balls losing carry while the bat speed held. The tell will come early. If the upper half of the zone produces home runs in April, it was timing.</p>
      <p>The broader lesson is about baselines. Every number in the public discourse compared him to the league or to last year. Compared to himself over eight seasons, most of those numbers are unremarkable, one of them is an artifact of a rule change, and two are the most extreme values of his career. Finding the right baseline is most of the analysis.</p>
      <h2>Watch the evidence</h2>
      <p>Every pitch in the charts has an MLB video clip. The loop below pairs two 2025 home runs with two 2026 ground outs on pitches at the same height, synced at the moment of contact.</p>
      ${videoFigure({ src: "vlad-same-pitch.mp4", poster: "vlad-same-pitch.jpg", alt: "Side by side clips of Guerrero hitting home runs in 2025 and ground outs in 2026 on pitches at the same height", caption: `Left: 2025. Right: 2026. Footage from MLB via Baseball Savant. <a href="${mediaUrl("vlad-same-pitch.gif")}">GIF version</a> for sharing.` })}
      <p>The eight clips behind the upper-half finding, each linked to MLB's video:</p>
      <ul id="clip-list" class="clip-list"></ul>
      <aside class="method">
        <h2>Method</h2>
        <p>Season lines come from the MLB Stats API. Pitch-level data for every season since 2019, and every ball in play at Rogers Centre from 2024 to 2026, come from Baseball Savant, pulled and summarized by <a href="${REPO}/blob/main/scripts/vladimir-guerrero-jr/statcast.py">statcast.py</a>. The video loop is built by <a href="${REPO}/blob/main/scripts/vladimir-guerrero-jr/build_gif.py">build_gif.py</a> from MLB's per-pitch clips.</p>
        <p>The anomaly panel scores each 2026 value as (value minus mean) divided by the standard deviation of his 2019 to 2025 seasons, with the 60-game 2020 season included. Seven seasons is a small baseline, so the panel is a screen for where to look rather than a significance test. Zone boxes: the "through 2025" box uses his average Statcast zone from 2025 (3.68 and 1.65 feet); the 2026 box uses the ABS values in the data (3.21 and 1.62 feet), which match 53.5 and 27 percent of his listed 72 inches. Chase rate uses a box 0.83 feet either side of the plate centre, held fixed across all eight seasons. The upper and lower halves of the zone are split at 2.5 feet. Bat speed has been tracked since 2023. The upper-half zero rests on 168 balls in play, so a couple of home runs would not change the picture but a month of them would.</p>
      </aside>
    `;

    Promise.all([
      d3.json(dataUrl("vlad-career.json")),
      d3.json(dataUrl("vlad-summary.json")),
      d3.json(dataUrl("vlad-swings.json")),
      d3.json(dataUrl("vlad-clips.json")),
    ])
      .then(([career, summary, swings, clips]) => {
        if (cancelled) return;
        const data = { career, summary, swings };
        scrollyRoot.innerHTML = "";
        scrolly = mountScrolly(scrollyRoot, { steps, graphic: (el) => graphic(el, data) });
        prose.querySelector("#clip-list").innerHTML = clips
          .map((c) => `<li><span class="kicker ${c.season === "2026" ? "is-accent" : ""}">${c.season}</span> <a href="${c.url}" target="_blank" rel="noopener">${c.caption}</a></li>`)
          .join("");
        root.appendChild(prose);
        prose.querySelectorAll("video[autoplay]").forEach((v) => v.play().catch(() => {}));
      })
      .catch((err) => {
        scrollyRoot.innerHTML = `<p class="prose">Could not load the data (${err.message}).</p>`;
      });

    return {
      destroy() {
        cancelled = true;
        scrolly?.destroy();
      },
    };
  },
};
