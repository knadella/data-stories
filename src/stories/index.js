/**
 * Story registry. Add a story by importing its module and appending it here.
 * Newest first. A story with `draft: true` is hidden from the home page but
 * still reachable at #/story/<slug> for review.
 */
import vladdy2026 from "./vladimir-guerrero-jr-2026/story.js";
import howThisSiteWorks from "./how-this-site-works/story.js";

export const stories = [vladdy2026, howThisSiteWorks];

export function findStory(slug) {
  return stories.find((s) => s.slug === slug);
}
