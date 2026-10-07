import * as d3 from "d3";
import { mountScrolly } from "../../lib/scrolly.js";
import { dataUrl } from "../../lib/media.js";

/**
 * Week 1: the 2026 Blue Jays season wrap. Run differential frames the season,
 * the regulars' OPS shows the missing stars, and Statcast pitch-level data gives
 * a fresh read on Vladimir Guerrero Jr.'s missing home runs.
 * Data: public/data/jays-*.json, jays-hitters.json, vlad-summary.json,
 * vlad-swings.json, produced by scripts/jays-run-differential/.
 */

const REPO = "https://github.com/knadella/data-stories";
const SEASONS = [2025, 2026];
const ACCENT = "var(--accent)";
const INK2 = "var(--ink-2)";
const INK3 = "var(--ink-3)";

const steps = [
  {
    id: "intro",
    html: `<p>In 2025 the Blue Jays won 94 games and came within a game of a World Series title. In 2026 they won 79 and finished fifth in the division.</p><p>The line on the right is the running run differential, runs scored minus runs allowed, from game one to game 162 of each season. It is the honest version of the standings.</p>`,
  },
  {
    id: "same-start",
    html: `<p>The two seasons began almost identically. After 30 games both teams were 14 and 16, and the 2025 team had actually been outscored by more runs.</p><p>Nobody looking at the standings in late April could have told these seasons apart. That is where the hope came from.</p>`,
  },
  {
    id: "no-fire",
    html: `<p>The 2025 team caught fire after game 81. It went 50 and 31 the rest of the way, outscored opponents by 69 runs, won ten in a row at one point and had a 23 and 7 stretch.</p><p>The 2026 team was waiting for the same thing to happen. It went 40 and 41 after game 81 and never won more than four games in a row all season.</p>`,
  },
  {
    id: "stars",
    html: `<p>A second-half surge needs stars, and this time there were none. In 2025 three regulars posted an OPS above .840: George Springer, Vladimir Guerrero Jr. and Bo Bichette.</p><p>Bichette left for the Mets in January. Springer, at 36, fell from .959 to .726. Kazuma Okamoto hit 33 home runs but reached base at a .310 clip. In 2026 no regular cleared .770.</p>`,
  },
  {
    id: "vladdy-unchanged",
    html: `<p>Guerrero is the one everyone is arguing about. Nine home runs, in the first full season of a 14-year contract, after 23 and 30 the two years before.</p><p>Here is what did not change. His bat speed, his swing length, his attack angle and his strikeout rate are all within a rounding error of 2025. This is not a broken swing or a slower bat.</p>`,
  },
  {
    id: "zone-moved",
    html: `<p>The popular explanation is that he started chasing. The widely quoted number is that his out-of-zone swing rate jumped about nine points.</p><p>Part of that jump is the ruler, not the hitter. In 2026 MLB introduced the ABS challenge zone, set at 53.5 percent of a batter's height. For Guerrero that moved the top of the measured zone from 3.68 feet to 3.21 feet, about five and a half inches lower. The dots are every swing he took in 2026. The shaded strip holds 89 swings that were strikes in 2025's data and chases in 2026's. Measured against a fixed box, his chase rate rose from 23 to 28 percent, a real change but half the quoted one.</p>`,
  },
  {
    id: "upper-half",
    html: `<p>The home runs disappeared from one place: the upper half of the strike zone, which had been his best zone.</p><p>He put 168 balls in play from pitches between 2.5 and 3.5 feet high over the plate and hit zero home runs. In 2025 the same zone produced 14 home runs and 34 barrels. The lower half of the zone held up almost unchanged.</p>`,
  },
  {
    id: "trajectory",
    html: `<p>He was still hitting the ball hard. What changed was the angle it left the bat.</p><p>On balls hit 95 miles an hour or harder, his average launch angle fell from 7.5 degrees to 4.7, and the share leaving in the home run window of 8 to 32 degrees dropped from 44 percent to 34. The same bat speed, a fraction late or over the ball, turns a home run into a hard ground ball. That is consistent with a hitter pressing: he swung at the first pitch 32 percent of the time, up from 24.</p>`,
  },
  {
    id: "never-arrived",
    html: `<p>April looked like 2025. His barrel rate that month was 14.5 percent, right at his old level.</p><p>Then it collapsed in May and never recovered. In June an analyst wrote that the rolling numbers showed a clear recovery trend. It never arrived, which makes him the season in miniature.</p>`,
  },
];

const fmtMonth = (m) => ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"][m - 1];

function graphic(el, data) {
  el.innerHTML = `<p class="chart-title"></p><p class="chart-note"></p>`;
  const titleEl = el.querySelector(".chart-title");
  const noteEl = el.querySelector(".chart-note");

  const width = 640;
  const height = 420;
  const margin = { top: 20, right: 72, bottom: 40, left: 48 };
  const innerW = width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;
  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const root = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const views = {};
  const view = (name) => (views[name] ||= root.append("g").attr("class", `view-${name}`).attr("opacity", 0));

  // ---------- View: run differential lines ----------
  const games = Object.fromEntries(SEASONS.map((s) => [s, data.games[s].games]));
  {
    const g = view("line");
    const x = d3.scaleLinear().domain([1, 162]).range([0, innerW]);
    const y = d3.scaleLinear().domain([-80, 100]).range([innerH, 0]);
    const line = d3.line().x((d) => x(d.game)).y((d) => y(d.cumDiff));
    g.append("rect").attr("class", "half-band").attr("x", x(82)).attr("y", 0).attr("width", x(162) - x(82)).attr("height", innerH).attr("fill", "var(--accent-soft)").attr("opacity", 0);
    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(6).tickSize(-innerW).tickFormat(""));
    g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", y(0)).attr("y2", y(0)).attr("stroke", INK3);
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).tickValues([1, 30, 60, 81, 100, 130, 162]));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(6).tickFormat(d3.format("+d")));
    g.append("text").attr("class", "label").attr("x", innerW).attr("y", innerH + 34).attr("text-anchor", "end").text("Game number");
    g.append("path").datum(games[2025]).attr("class", "series line-2025").attr("d", line);
    g.append("path").datum(games[2026]).attr("class", "series is-accent").attr("d", line);
    for (const s of SEASONS) {
      const last = games[s].at(-1);
      g.append("text").attr("class", `label ${s === 2026 ? "is-accent" : ""}`).attr("x", x(162) + 6).attr("y", y(last.cumDiff)).attr("dy", "0.35em").text(`${s} ${d3.format("+d")(last.cumDiff)}`);
    }
    const marks = g.append("g").attr("class", "marks").attr("opacity", 0);
    for (const s of SEASONS) {
      const d = games[s][29];
      marks.append("circle").attr("cx", x(30)).attr("cy", y(d.cumDiff)).attr("r", 5).attr("fill", s === 2026 ? ACCENT : INK2).attr("stroke", "#fff").attr("stroke-width", 2);
    }
    marks.append("text").attr("class", "label").attr("x", x(30)).attr("y", innerH - 10).attr("text-anchor", "middle").text("Game 30: both 14-16");
    const halfLabel = g.append("text").attr("class", "label").attr("x", x(122)).attr("y", 12).attr("text-anchor", "middle").attr("opacity", 0).text("After game 81: 2025 went 50-31, 2026 went 40-41");
    g.update = (st) => {
      const t = d3.transition().duration(500);
      marks.transition(t).attr("opacity", st.marks ? 1 : 0);
      g.select(".half-band").transition(t).attr("opacity", st.half ? 1 : 0);
      halfLabel.transition(t).attr("opacity", st.half ? 1 : 0);
    };
  }

  // ---------- View: OPS slope chart ----------
  {
    const g = view("slope");
    const h = data.hitters;
    const names = new Set([...h[2025].map((d) => d.name), ...h[2026].map((d) => d.name)]);
    const rows = [...names].map((name) => ({ name, a: h[2025].find((d) => d.name === name)?.ops ?? null, b: h[2026].find((d) => d.name === name)?.ops ?? null }));
    const y = d3.scaleLinear().domain([0.58, 0.98]).range([innerH, 0]);
    const xa = 150, xb = innerW - 150;
    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-innerW).tickFormat(""));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5).tickFormat(d3.format(".3f")));
    g.append("text").attr("class", "label").attr("x", xa).attr("y", -6).attr("text-anchor", "middle").text("2025");
    g.append("text").attr("class", "label").attr("x", xb).attr("y", -6).attr("text-anchor", "middle").text("2026");
    g.append("line").attr("x1", 0).attr("x2", innerW).attr("y1", y(0.77)).attr("y2", y(0.77)).attr("stroke", ACCENT).attr("stroke-dasharray", "4 4");
    g.append("text").attr("class", "label is-accent").attr("x", innerW).attr("y", y(0.77) - 6).attr("text-anchor", "end").text("Nobody above .770 in 2026");
    const short = (n) => n.replace("Vladimir Guerrero Jr.", "Guerrero").replace("George Springer", "Springer").replace("Bo Bichette", "Bichette").replace("Alejandro Kirk", "Kirk").replace("Kazuma Okamoto", "Okamoto").replace("Addison Barger", "Barger").replace("Nathan Lukes", "Lukes").replace("Daulton Varsho", "Varsho").replace("Ernie Clement", "Clement").replace("Andrés Giménez", "Giménez").replace("Myles Straw", "Straw").replace("Isiah Kiner-Falefa", "Kiner-Falefa").replace("Ty France", "France").replace("Jesús Sánchez", "Sánchez").replace("Davis Schneider", "Schneider");
    const isStar = (r) => r.name === "Vladimir Guerrero Jr.";
    const lanes = { 2025: [], 2026: [] };
    const place = (season, val) => {
      // nudge labels apart so they do not overlap
      let v = y(val);
      const arr = lanes[season];
      for (const used of arr) if (Math.abs(used - v) < 13) v = used + 13;
      arr.push(v);
      return v;
    };
    rows.sort((p, q) => (q.a ?? q.b) - (p.a ?? p.b));
    for (const r of rows) {
      const color = isStar(r) ? ACCENT : INK3;
      if (r.a != null && r.b != null) g.append("line").attr("x1", xa).attr("x2", xb).attr("y1", y(r.a)).attr("y2", y(r.b)).attr("stroke", color).attr("stroke-width", isStar(r) ? 2.5 : 1.25);
      if (r.a != null) {
        g.append("circle").attr("cx", xa).attr("cy", y(r.a)).attr("r", 4).attr("fill", color);
        g.append("text").attr("class", `label ${isStar(r) ? "is-accent" : ""}`).attr("x", xa - 10).attr("y", place(2025, r.a)).attr("dy", "0.35em").attr("text-anchor", "end").text(`${short(r.name)} ${d3.format(".3f")(r.a)}${r.name === "Bo Bichette" ? " (to Mets)" : ""}`);
      }
      if (r.b != null) {
        g.append("circle").attr("cx", xb).attr("cy", y(r.b)).attr("r", 4).attr("fill", color);
        g.append("text").attr("class", `label ${isStar(r) ? "is-accent" : ""}`).attr("x", xb + 10).attr("y", place(2026, r.b)).attr("dy", "0.35em").text(`${d3.format(".3f")(r.b)} ${short(r.name)}${r.name === "Kazuma Okamoto" ? " (new)" : ""}`);
      }
    }
    g.update = () => {};
  }

  // ---------- View: unchanged stat tiles ----------
  {
    const g = view("tiles");
    const v = data.vlad;
    const tiles = [
      { label: "Home runs", a: v[2025].homeRuns, b: v[2026].homeRuns, fmt: d3.format("d"), changed: true },
      { label: "Bat speed (mph)", a: v[2025].batSpeed, b: v[2026].batSpeed, fmt: d3.format(".1f") },
      { label: "Swing length (ft)", a: v[2025].swingLength, b: v[2026].swingLength, fmt: d3.format(".2f") },
      { label: "Attack angle (°)", a: v[2025].attackAngle, b: v[2026].attackAngle, fmt: d3.format(".1f") },
      { label: "Strikeout rate", a: v[2025].strikeoutPct, b: v[2026].strikeoutPct, fmt: (d) => `${d3.format(".1f")(d)}%` },
      { label: "Exit velocity (mph)", a: v[2025].exitVelo, b: v[2026].exitVelo, fmt: d3.format(".1f") },
    ];
    const cols = 3, tw = innerW / cols, th = innerH / 2;
    tiles.forEach((tile, i) => {
      const tx = (i % cols) * tw, ty = Math.floor(i / cols) * th;
      const t = g.append("g").attr("transform", `translate(${tx + 8},${ty + 8})`);
      t.append("rect").attr("width", tw - 16).attr("height", th - 16).attr("rx", 8).attr("fill", "#fff").attr("stroke", tile.changed ? ACCENT : "var(--rule)").attr("stroke-width", tile.changed ? 2 : 1);
      t.append("text").attr("class", "label").attr("x", 14).attr("y", 24).text(tile.label);
      t.append("text").attr("x", 14).attr("y", 72).attr("font-family", "var(--serif)").attr("font-weight", 700).attr("font-size", 30).attr("fill", tile.changed ? ACCENT : "var(--ink)").text(tile.fmt(tile.b));
      t.append("text").attr("class", "label").attr("x", 14).attr("y", 96).text(`2025: ${tile.fmt(tile.a)}`);
      t.append("text").attr("class", `label ${tile.changed ? "is-accent" : ""}`).attr("x", tw - 30).attr("y", 96).attr("text-anchor", "end").text(tile.changed ? "changed" : "unchanged");
    });
    g.update = () => {};
  }

  // ---------- View: strike-zone swing map ----------
  {
    const g = view("zone");
    const boxes = data.vlad.boxes;
    const swings = data.swings[2026];
    const x = d3.scaleLinear().domain([-2, 2]).range([innerW / 2 - innerH * 0.4, innerW / 2 + innerH * 0.4]);
    const z = d3.scaleLinear().domain([0, 5]).range([innerH, 0]);
    g.append("line").attr("x1", x(-0.71)).attr("x2", x(0.71)).attr("y1", z(0.1)).attr("y2", z(0.1)).attr("stroke", INK3).attr("stroke-width", 3);
    g.append("text").attr("class", "label").attr("x", x(0)).attr("y", innerH + 20).attr("text-anchor", "middle").text("Catcher's view. Every swing, 2026.");
    const dots = g.append("g");
    dots.selectAll("circle").data(swings).join("circle")
      .attr("cx", (d) => x(d.x)).attr("cy", (d) => z(d.z)).attr("r", 2.6)
      .attr("fill", (d) => (d.result === "hr" ? ACCENT : INK3)).attr("opacity", (d) => (d.result === "hr" ? 1 : 0.35));
    const bw = boxes.halfPlate;
    const strip = g.append("rect").attr("x", x(-bw)).attr("y", z(boxes.old[1])).attr("width", x(bw) - x(-bw)).attr("height", z(boxes.abs[1]) - z(boxes.old[1])).attr("fill", ACCENT).attr("opacity", 0);
    const oldBox = g.append("rect").attr("x", x(-bw)).attr("y", z(boxes.old[1])).attr("width", x(bw) - x(-bw)).attr("height", z(boxes.old[0]) - z(boxes.old[1])).attr("fill", "none").attr("stroke", INK2).attr("stroke-width", 1.5).attr("stroke-dasharray", "5 4");
    const absBox = g.append("rect").attr("x", x(-bw)).attr("y", z(boxes.abs[1])).attr("width", x(bw) - x(-bw)).attr("height", z(boxes.abs[0]) - z(boxes.abs[1])).attr("fill", "none").attr("stroke", ACCENT).attr("stroke-width", 2).attr("opacity", 0);
    g.append("text").attr("class", "label").attr("x", x(bw) + 8).attr("y", z(boxes.old[1])).attr("dy", "0.35em").text(`Zone top through 2025: ${boxes.old[1]} ft`);
    const absLabel = g.append("text").attr("class", "label is-accent").attr("x", x(bw) + 8).attr("y", z(boxes.abs[1])).attr("dy", "0.35em").attr("opacity", 0).text(`ABS zone top, 2026: ${boxes.abs[1]} ft`);
    const stripLabel = g.append("text").attr("class", "label is-accent").attr("x", x(-bw) - 8).attr("y", (z(boxes.old[1]) + z(boxes.abs[1])) / 2).attr("dy", "0.35em").attr("text-anchor", "end").attr("opacity", 0).text(`${data.vlad[2026].strip.swings} swings relabelled as chases`);
    g.update = (st) => {
      const t = d3.transition().duration(700);
      absBox.transition(t).attr("opacity", st.abs ? 1 : 0);
      absLabel.transition(t).attr("opacity", st.abs ? 1 : 0);
      strip.transition(t).attr("opacity", st.abs ? 0.18 : 0);
      stripLabel.transition(t).attr("opacity", st.abs ? 1 : 0);
    };
  }

  // ---------- View: home runs by zone half ----------
  {
    const g = view("halves");
    const v = data.vlad;
    const seasons = [2024, 2025, 2026];
    const rows = seasons.flatMap((s) => [
      { season: s, half: "upper", value: v[s].upperHalf.homeRuns },
      { season: s, half: "lower", value: v[s].lowerHalf.homeRuns },
    ]);
    const x0 = d3.scaleBand().domain(seasons).range([0, innerW]).paddingInner(0.35).paddingOuter(0.2);
    const x1 = d3.scaleBand().domain(["upper", "lower"]).range([0, x0.bandwidth()]).padding(0.15);
    const y = d3.scaleLinear().domain([0, 16]).range([innerH, 0]);
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x0).tickFormat(String));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4));
    g.append("text").attr("class", "label").attr("x", 0).attr("y", -6).text("Home runs on pitches over the plate, by height");
    g.selectAll("rect.bar").data(rows).join("rect").attr("class", "bar")
      .attr("x", (d) => x0(d.season) + x1(d.half)).attr("width", x1.bandwidth())
      .attr("y", (d) => y(d.value)).attr("height", (d) => innerH - y(d.value))
      .attr("fill", (d) => (d.half === "upper" ? ACCENT : INK3));
    g.selectAll("text.val").data(rows).join("text").attr("class", "label val")
      .attr("x", (d) => x0(d.season) + x1(d.half) + x1.bandwidth() / 2).attr("y", (d) => y(d.value) - 6).attr("text-anchor", "middle").text((d) => d.value);
    const legend = g.append("g").attr("transform", `translate(${innerW - 250},-10)`);
    [["upper", "Upper half (2.5 to 3.5 ft)", ACCENT], ["lower", "Lower half (1.6 to 2.5 ft)", INK3]].forEach(([k, label, c], i) => {
      const li = legend.append("g").attr("transform", `translate(0,${i * 16})`);
      li.append("rect").attr("width", 12).attr("height", 12).attr("rx", 2).attr("fill", c);
      li.append("text").attr("class", "label").attr("x", 16).attr("y", 10).text(label);
    });
    g.update = () => {};
  }

  // ---------- View: hard-hit launch angle density ----------
  {
    const g = view("angles");
    const v = data.vlad;
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
    g.append("text").attr("class", "label").attr("x", x(v[2025].hardHit.launchAngle)).attr("y", innerH - 60).attr("text-anchor", "middle").text(`2025 avg ${v[2025].hardHit.launchAngle}°, ${v[2025].hardHit.shareInWindow}% in window`);
    g.append("text").attr("class", "label is-accent").attr("x", x(v[2026].hardHit.launchAngle)).attr("y", innerH - 40).attr("text-anchor", "middle").text(`2026 avg ${v[2026].hardHit.launchAngle}°, ${v[2026].hardHit.shareInWindow}% in window`);
    g.update = () => {};
  }

  // ---------- View: monthly barrel rate ----------
  {
    const g = view("monthly");
    const v = data.vlad;
    const x = d3.scalePoint().domain([4, 5, 6, 7, 8, 9]).range([0, innerW]).padding(0.5);
    const y = d3.scaleLinear().domain([0, 20]).range([innerH, 0]);
    g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(4).tickSize(-innerW).tickFormat(""));
    g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).tickFormat(fmtMonth));
    g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(4).tickFormat((d) => `${d}%`));
    g.append("text").attr("class", "label").attr("x", 0).attr("y", -6).text("Barrel rate by month");
    const line = d3.line().x((d) => x(d.month)).y((d) => y(d.barrelPct));
    for (const s of SEASONS) {
      const m = v[s].monthly;
      g.append("path").datum(m).attr("class", `series ${s === 2026 ? "is-accent" : ""}`).attr("d", line);
      g.selectAll(`circle.m${s}`).data(m).join("circle").attr("class", `m${s}`).attr("cx", (d) => x(d.month)).attr("cy", (d) => y(d.barrelPct)).attr("r", 4).attr("fill", s === 2026 ? ACCENT : INK2);
      g.append("text").attr("class", `label ${s === 2026 ? "is-accent" : ""}`).attr("x", x(9) + 10).attr("y", y(m.at(-1).barrelPct)).attr("dy", "0.35em").text(String(s));
    }
    const apr = v[2026].monthly[0];
    g.append("text").attr("class", "label is-accent").attr("x", x(4)).attr("y", y(apr.barrelPct) - 12).attr("text-anchor", "middle").text(`April ${apr.barrelPct}%`);
    g.update = () => {};
  }

  const states = [
    { view: "line", title: "Running run differential, 2025 and 2026", note: "Runs scored minus runs allowed, cumulative by game. Source: MLB Stats API.", marks: 0, half: 0 },
    { view: "line", title: "Both seasons were 14-16 after 30 games", note: "The 2025 team was 34 runs under water at that point. The 2026 team was 18 under.", marks: 1, half: 0 },
    { view: "line", title: "One team caught fire after game 81. The other waited for it.", note: "2025: 50-31 and +69 runs after game 81. 2026: 40-41 and -18.", marks: 0, half: 1 },
    { view: "slope", title: "Three regulars above .840 became none above .770", note: "OPS for Blue Jays hitters with 300 or more plate appearances. Source: MLB Stats API." },
    { view: "tiles", title: "The swing that produced nine home runs is the same swing", note: "Statcast swing tracking and outcomes, 2025 versus 2026. Source: Baseball Savant." },
    { view: "zone", title: "The strike zone moved more than the hitter did", note: "Every 2026 swing, catcher's view. Dashed box: the zone used in his data through 2025. Solid box: the 2026 ABS zone.", abs: 1 },
    { view: "halves", title: "Zero home runs from the upper half of the zone", note: "Balls in play on pitches over the plate, split at 2.5 feet. Source: Baseball Savant." },
    { view: "angles", title: "The hard contact is still there. It leaves the bat three degrees lower.", note: "Distribution of launch angles on balls hit 95 mph or harder. Source: Baseball Savant." },
    { view: "monthly", title: "April looked like 2025. Nothing after it did.", note: "Share of balls in play that were barrels, by month. Source: Baseball Savant." },
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
  slug: "jays-2026-the-hope-that-never-arrived",
  kicker: "Blue Jays",
  title: "The hope that never arrived",
  dek: "The 2025 Blue Jays caught fire after the break. The 2026 team never won five in a row, its stars never became superstars, and the reason Vladimir Guerrero Jr. stopped hitting home runs is not the one everyone is quoting.",
  date: "2026-10-09",
  readingTime: 7,
  draft: false,

  mount(root) {
    let scrolly = null;
    let cancelled = false;

    const scrollyRoot = document.createElement("div");
    scrollyRoot.innerHTML = `<p class="prose" style="color: var(--ink-3)">Loading two seasons of box scores and 7,000 pitches…</p>`;
    root.appendChild(scrollyRoot);

    const prose = document.createElement("div");
    prose.className = "prose";
    prose.innerHTML = `
      <h2>What to do about it</h2>
      <p>The decline was real. Expected wins from run differential fell from 88 to 76, so there is no luck story to wait out. The question for the front office is which inputs moved, and the answer is narrower than the discourse suggests. The lineup lost its three best hitters to free agency, age and a slump, and the slump has a specific shape.</p>
      <p>Guerrero's problem is not plate discipline, or at least not mostly. Half of the chase-rate jump everyone cites is a change in how the zone is measured. The rest of the story lives inside the zone, on the pitches he used to hit out of the park, where the same bat speed is now producing hard ground balls. That points at timing and intent, which is coachable, rather than at bat speed or age, which is not.</p>
      <p>The lesson travels. When a number jumps between two periods, the first question is whether the ruler changed. The second is which specific input moved, because an outcome like home runs or revenue rarely falls everywhere at once. It falls in one place, and finding that place is the whole job.</p>
      <h2>Watch the evidence</h2>
      <p>Every pitch in the charts has an MLB video clip. These are the ones behind the upper-half finding: the same height, the same bat speed, and a different angle off the bat.</p>
      <ul id="clip-list" class="clip-list"></ul>
      <aside class="method">
        <h2>Method</h2>
        <p>Game results come from the MLB Stats API schedule endpoint, pulled by <a href="${REPO}/blob/main/scripts/jays-run-differential/fetch.py">fetch.py</a>. Expected wins use the Pythagorean formula with exponent 1.83. Pitch-level data for Guerrero (2024 to 2026) and every ball in play at Rogers Centre come from Baseball Savant, pulled and summarized by <a href="${REPO}/blob/main/scripts/jays-run-differential/statcast.py">statcast.py</a>.</p>
        <p>Zone boxes: the "through 2025" box uses his average Statcast zone top and bottom from 2025 (3.68 and 1.65 feet); the 2026 box uses the ABS values in the 2026 data (3.21 and 1.62 feet). Chase rate is swings on pitches outside a box 0.83 feet either side of the plate centre. The upper and lower halves of the zone are split at 2.5 feet. The Rogers Centre check found no park effect: well-hit fly balls (98 to 106 mph, 24 to 34 degrees) carried 384 feet there in 2026 against 382 in 2025, and left the park more often. The sample for the upper-half zero is 168 balls in play, so one or two home runs would not change the shape of the finding, but a month of them would.</p>
      </aside>
    `;

    Promise.all([
      ...SEASONS.map((s) => d3.json(dataUrl(`jays-${s}.json`))),
      d3.json(dataUrl("jays-hitters.json")),
      d3.json(dataUrl("vlad-summary.json")),
      d3.json(dataUrl("vlad-swings.json")),
      d3.json(dataUrl("vlad-clips.json")),
    ])
      .then(([g25, g26, hitters, vlad, swings, clips]) => {
        if (cancelled) return;
        const data = { games: { 2025: g25, 2026: g26 }, hitters, vlad, swings };
        scrollyRoot.innerHTML = "";
        scrolly = mountScrolly(scrollyRoot, { steps, graphic: (el) => graphic(el, data) });
        prose.querySelector("#clip-list").innerHTML = clips
          .map((c) => `<li><span class="kicker ${c.season === "2026" ? "is-accent" : ""}">${c.season}</span> <a href="${c.url}" target="_blank" rel="noopener">${c.caption}</a></li>`)
          .join("");
        root.appendChild(prose);
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
