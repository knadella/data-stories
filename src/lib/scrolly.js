import scrollama from "scrollama";

/**
 * Build a scrollytelling block: text steps on the left, a sticky graphic on the right.
 *
 * steps:   [{ id, html }]   one card per step, HTML string
 * graphic: (graphicEl) => ({ onStep(index, direction), onResize?() })
 *
 * The graphic factory mounts whatever it likes (D3, video, image) into graphicEl
 * and returns an onStep handler that moves the graphic to the given step.
 */
export function mountScrolly(root, { steps, graphic, offset = 0.55 }) {
  root.classList.add("scrolly");

  const stepsEl = document.createElement("div");
  stepsEl.className = "steps";
  steps.forEach((step, i) => {
    const el = document.createElement("section");
    el.className = "step";
    el.dataset.step = i;
    if (step.id) el.id = step.id;
    el.innerHTML = `<div class="card">${step.html}</div>`;
    stepsEl.appendChild(el);
  });

  const graphicEl = document.createElement("div");
  graphicEl.className = "graphic";

  root.appendChild(stepsEl);
  root.appendChild(graphicEl);

  const handlers = graphic(graphicEl) || {};

  const scroller = scrollama();
  scroller
    .setup({ step: ".scrolly .step", offset, progress: false })
    .onStepEnter(({ element, index, direction }) => {
      stepsEl.querySelectorAll(".step").forEach((s) => s.classList.remove("is-active"));
      element.classList.add("is-active");
      handlers.onStep?.(index, direction);
    });

  const onResize = () => {
    scroller.resize();
    handlers.onResize?.();
  };
  window.addEventListener("resize", onResize);

  // Activate the first step on load so the graphic is never blank.
  stepsEl.querySelector(".step")?.classList.add("is-active");
  handlers.onStep?.(0, "down");

  return {
    destroy() {
      window.removeEventListener("resize", onResize);
      scroller.destroy();
    },
  };
}
