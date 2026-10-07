/**
 * Media helpers. Prefer short, muted, looping MP4/WebM over GIF: a 5 second
 * screen recording is ~300 KB as MP4 and 3 to 10 MB as GIF. Put files in
 * public/media/ and reference them with mediaUrl("file.mp4").
 */
export function mediaUrl(file) {
  return `${import.meta.env.BASE_URL}media/${file}`;
}

export function dataUrl(file) {
  return `${import.meta.env.BASE_URL}data/${file}`;
}

/** A looping, muted, inline video that behaves like a GIF but is far smaller. */
export function videoFigure({ src, poster, caption, alt = "" }) {
  const posterAttr = poster ? ` poster="${mediaUrl(poster)}"` : "";
  return `<figure>
    <video class="media" src="${mediaUrl(src)}"${posterAttr} autoplay muted loop playsinline preload="metadata" aria-label="${alt}"></video>
    ${caption ? `<figcaption>${caption}</figcaption>` : ""}
  </figure>`;
}

/** A GIF or still image. Use for things that must animate in places video cannot (email, LinkedIn previews). */
export function imageFigure({ src, caption, alt = "" }) {
  return `<figure>
    <img class="media" src="${mediaUrl(src)}" alt="${alt}" loading="lazy" />
    ${caption ? `<figcaption>${caption}</figcaption>` : ""}
  </figure>`;
}
