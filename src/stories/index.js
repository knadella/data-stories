/**
 * Story registry. Add a story by importing its module and appending it here.
 * Newest first. A story with `draft: true` is hidden from the home page but
 * still reachable at #/story/<slug> for review.
 */
import howThisSiteWorks from "./how-this-site-works/story.js";

export const stories = [howThisSiteWorks];

export function findStory(slug) {
  return stories.find((s) => s.slug === slug);
}
