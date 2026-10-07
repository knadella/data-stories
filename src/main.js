import "./styles.css";
import { onRouteChange, storyHref } from "./lib/router.js";
import { stories, findStory } from "./stories/index.js";

const app = document.getElementById("app");
let activeStory = null;

const fmtDate = (iso) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });

function header() {
  return `<header class="site-header">
    <a class="brand" href="#/">Data Stories</a>
    <span>by <a href="https://karthiknadella.com">Karthik Nadella</a></span>
  </header>`;
}

function footer() {
  return `<footer class="site-footer">
    Charts built with D3. Data sources and code are linked at the end of each story.
  </footer>`;
}

function renderHome() {
  const items = stories
    .filter((s) => !s.draft)
    .map(
      (s) => `<li>
        <div class="kicker">${s.kicker} · ${fmtDate(s.date)}</div>
        <h2><a href="${storyHref(s.slug)}">${s.title}</a></h2>
        <p class="dek">${s.dek}</p>
      </li>`
    )
    .join("");

  app.innerHTML = `${header()}
    <main class="home">
      <h1>Data Stories</h1>
      <p class="lede">Questions an operator would ask, answered with public data, and ending in a decision. The charts move as you read.</p>
      <ul class="story-list">${items}</ul>
    </main>
    ${footer()}`;
  document.title = "Data Stories · Karthik Nadella";
}

function renderStory(slug) {
  const story = findStory(slug);
  if (!story) {
    app.innerHTML = `${header()}<main class="home"><h1>Not found</h1><p>No story at <code>${slug}</code>. <a href="#/">Back to all stories.</a></p></main>`;
    return;
  }

  app.innerHTML = `${header()}
    <main class="story">
      <div class="story-head">
        <div class="kicker">${story.kicker}</div>
        <h1>${story.title}</h1>
        <p class="dek">${story.dek}</p>
        <p class="byline">${fmtDate(story.date)}${story.readingTime ? ` · ${story.readingTime} min read` : ""}</p>
      </div>
      <div id="story-body"></div>
    </main>
    ${footer()}`;
  document.title = `${story.title} · Data Stories`;

  activeStory = story.mount(document.getElementById("story-body"));
  window.scrollTo(0, 0);
}

onRouteChange((route) => {
  activeStory?.destroy?.();
  activeStory = null;
  if (route.name === "story") renderStory(route.slug);
  else renderHome();
});
