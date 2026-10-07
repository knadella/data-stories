# Data Stories

Narrative data stories built with [D3](https://d3js.org) and [scrollama](https://github.com/russellsamora/scrollama), published to GitHub Pages at `https://knadella.github.io/data-stories/`. The content calendar lives in a Claude doc; this repo holds the site.

## Run it

```bash
npm install
npm run dev
```

`npm run build` writes `dist/`. Pushing to `main` deploys through `.github/workflows/deploy.yml`, the same setup as Project CanViz. Enable Pages with source "GitHub Actions" in the repo settings once.

## How a story is built

Every story has the same shape, so a reader always knows where they are:

1. **Head**: kicker, title, dek, date.
2. **Scrolly**: text steps on the left, a sticky D3 graphic on the right. The graphic changes as each step enters. One colour marks the thing that matters.
3. **Prose**: the so-what, written for the person who has to act on it. GIFs and videos go here as figures.
4. **Method**: a short appendix that names the method, links the code and data, and says what would change the answer.

## Add a story

1. Copy `src/stories/how-this-site-works/` to `src/stories/<slug>/`.
2. Edit `story.js`: metadata at the bottom, `steps` for the text, `graphic()` for the D3. `graphic()` receives the sticky container and returns `{ onStep(index, direction) }`.
3. Put data files in `public/data/` and load them with `dataUrl("file.csv")` from `src/lib/media.js`. Keep the fetch or processing script in `scripts/<slug>/` so the method note can link to it.
4. Register the story in `src/stories/index.js`. Set `draft: true` to keep it off the home page while you work; it stays reachable at `#/story/<slug>`.

## Media

- Prefer short, muted, looping **MP4 or WebM** over GIF. A five second screen recording is around 300 KB as MP4 and several MB as GIF. Use `videoFigure()` from `src/lib/media.js`.
- Use GIF only where video cannot play: LinkedIn previews, email. Keep GIFs under 2 MB and 800 px wide.
- Screen Studio exports MP4 directly; export at 1x scale for the web.
- Files go in `public/media/` and are referenced with `mediaUrl("file.mp4")`. Nothing in `public/` is processed by Vite, so file names are stable for sharing.

## Conventions

- Charts use the shared classes in `src/styles.css` (`.axis`, `.grid`, `.series`, `.label`) so every story looks like the same publication.
- The accent colour appears once per chart, on the thing the step is about.
- Numbers in prose are repeated from the chart, never introduced there.
- Each story ends with a decision, not a summary.
