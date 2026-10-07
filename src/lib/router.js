/**
 * Hash router so the site works on GitHub Pages without server rewrites.
 * Routes: "#/" (home) and "#/story/<slug>".
 */
export function parseRoute(hash = window.location.hash) {
  const path = hash.replace(/^#/, "") || "/";
  const match = path.match(/^\/story\/([a-z0-9-]+)\/?$/);
  if (match) return { name: "story", slug: match[1] };
  return { name: "home" };
}

export function onRouteChange(handler) {
  window.addEventListener("hashchange", () => handler(parseRoute()));
  handler(parseRoute());
}

export function storyHref(slug) {
  return `#/story/${slug}`;
}
