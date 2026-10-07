import * as d3 from "d3";
import { mountScrolly } from "../../lib/scrolly.js";
import { imageFigure } from "../../lib/media.js";

/**
 * Demo story. It exists to prove the pipeline: scroll-driven D3 transitions,
 * a prose section, a media figure, and a method note. Replace it with the
 * first real story and keep it around as a template if useful.
 */

// Synthetic data: twelve months of two series so the demo needs no data pull.
const months = d3.range(12).map((i) => new Date(2025, i, 1));
const series = {
  plan: months.map((d, i) => ({ date: d, value: 100 + i * 4 })),
  actual: months.map((d, i) => ({ date: d, value: 100 + i * 4 + 14 * Math.sin(i / 1.7) - (i > 7 ? 10 : 0) })),
};

const steps = [
  {
    id: "start",
    html: `<p>Every story on this site opens with the question a decision depends on. Here the question is simple: <strong>did the plan hold?</strong></p><p>The chart to the right starts with the plan alone.</p>`,
  },
  {
    id: "actual",
    html: `<p>Scroll, and the actuals draw in. The reader sees the gap appear rather than being told about it.</p>`,
  },
  {
    id: "gap",
    html: `<p>The point that matters gets the only colour on the page. From August onward the actuals sit below plan, and the story turns on why.</p>`,
  },
  {
    id: "so-what",
    html: `<p>The last step is the so-what. The chart simplifies to the one number a CEO would act on, and the prose below explains what to do about it.</p>`,
  },
];

function graphic(el) {
  el.innerHTML = `<p class="chart-title">Plan versus actual, 2025</p><p class="chart-note">Index, January = 100. Synthetic data.</p>`;
  const margin = { top: 12, right: 72, bottom: 32, left: 40 };
  let width = 640;
  const height = 400;

  const svg = d3.select(el).append("svg").attr("viewBox", `0 0 ${width} ${height}`);
  const g = svg.append("g").attr("transform", `translate(${margin.left},${margin.top})`);
  const innerW = () => width - margin.left - margin.right;
  const innerH = height - margin.top - margin.bottom;

  const x = d3.scaleTime().domain(d3.extent(months)).range([0, innerW()]);
  const y = d3.scaleLinear().domain([80, 160]).range([innerH, 0]);
  const line = d3.line().x((d) => x(d.date)).y((d) => y(d.value)).curve(d3.curveMonotoneX);

  g.append("g").attr("class", "grid").call(d3.axisLeft(y).ticks(5).tickSize(-innerW()).tickFormat(""));
  g.append("g").attr("class", "axis").attr("transform", `translate(0,${innerH})`).call(d3.axisBottom(x).ticks(6).tickFormat(d3.timeFormat("%b")));
  g.append("g").attr("class", "axis").call(d3.axisLeft(y).ticks(5));

  const planPath = g.append("path").datum(series.plan).attr("class", "series").attr("d", line);
  const actualPath = g.append("path").datum(series.actual).attr("class", "series is-accent").attr("d", line).attr("opacity", 0);
  const gapBand = g.append("rect").attr("class", "gap").attr("fill", "var(--accent-soft)").attr("opacity", 0);
  const planLabel = g.append("text").attr("class", "label").attr("x", innerW() + 8).attr("y", y(series.plan.at(-1).value)).attr("dy", "0.35em").text("Plan");
  const actualLabel = g.append("text").attr("class", "label is-accent").attr("x", innerW() + 8).attr("y", y(series.actual.at(-1).value)).attr("dy", "0.35em").text("Actual").attr("opacity", 0);
  const bigNumber = g.append("text").attr("class", "big-number").attr("x", innerW() / 2).attr("y", innerH / 2).attr("dy", "0.35em").attr("text-anchor", "middle").attr("opacity", 0);

  const gapPct = ((series.actual.at(-1).value / series.plan.at(-1).value - 1) * 100).toFixed(0);

  // Draw a path progressively by animating its dash offset.
  function reveal(path, dur = 1200) {
    const len = path.node().getTotalLength();
    path.attr("stroke-dasharray", `${len} ${len}`).attr("stroke-dashoffset", len).attr("opacity", 1)
      .transition().duration(dur).ease(d3.easeCubicInOut).attr("stroke-dashoffset", 0);
  }

  // Every step sets every element, so a skipped step never leaves stale state.
  const states = [
    { axes: 1, plan: 1, actual: "hidden", label: 0, band: 0, number: 0 },
    { axes: 1, plan: 1, actual: "reveal", label: 1, band: 0, number: 0 },
    { axes: 1, plan: 1, actual: 1, label: 1, band: 1, number: 0 },
    { axes: 0.15, plan: 0.2, actual: 0.2, label: 0, band: 0, number: 1 },
  ];

  const onStep = (i) => {
    const s = states[Math.min(i, states.length - 1)];
    const t = d3.transition().duration(600);
    g.selectAll(".axis, .grid").transition(t).attr("opacity", s.axes);
    planPath.transition(t).attr("opacity", s.plan);
    if (s.actual === "hidden") {
      actualPath.interrupt().attr("stroke-dasharray", null).attr("opacity", 0);
    } else if (s.actual === "reveal") {
      if (+actualPath.attr("opacity") === 0) reveal(actualPath);
      else actualPath.interrupt().attr("stroke-dasharray", null).attr("opacity", 1);
    } else {
      actualPath.interrupt().attr("stroke-dasharray", null).transition(t).attr("opacity", s.actual);
    }
    actualLabel.transition(t).attr("opacity", s.label);
    gapBand.attr("x", x(months[7])).attr("y", 0).attr("width", innerW() - x(months[7])).attr("height", innerH).transition(t).attr("opacity", s.band);
    bigNumber.text(`${gapPct}%`).transition(t).attr("opacity", s.number);
  };

  return { onStep };
}

export default {
  slug: "how-this-site-works",
  kicker: "Template",
  title: "How a story on this site is told",
  dek: "A demo of the scrollytelling pattern: the chart moves as you read, the colour marks the one thing that matters, and the ending is a decision.",
  date: "2026-10-06",
  readingTime: 3,
  draft: true,

  mount(root) {
    const scrollyRoot = document.createElement("div");
    root.appendChild(scrollyRoot);
    const scrolly = mountScrolly(scrollyRoot, { steps, graphic });

    const prose = document.createElement("div");
    prose.className = "prose";
    prose.innerHTML = `
      <h2>What to do about it</h2>
      <p>This is where the recommendation goes, written for the person who has to act on it. One or two paragraphs, plain words, the number from the chart repeated once.</p>
      ${imageFigure({ src: "demo-reveal.gif", alt: "A line being drawn across a chart", caption: "GIFs and short looping videos go in figures like this one. Prefer MP4 over GIF for anything longer than a few seconds." })}
      <aside class="method">
        <h2>Method</h2>
        <p>The appendix names the method, links the code, and says what would change the answer. This demo uses synthetic data generated in <code>story.js</code>. Real stories load from <code>public/data/</code> and link to the fetch script that produced the file.</p>
      </aside>
    `;
    root.appendChild(prose);

    return {
      destroy() {
        scrolly.destroy();
      },
    };
  },
};
