(function initializeTutorialUi(global) {
  function render({
    complete = false,
    container,
    current = 1,
    instruction = "",
    intro = false,
    nextAction = "",
    onRestart,
    strategyHref,
    total = 1,
    unit = "Round",
  }) {
    container.classList.add("guided-tutorial");
    container.classList.toggle("tutorial-complete", complete);
    container.replaceChildren();

    const header = global.document.createElement("div");
    header.className = "tutorial-progress-heading";
    const label = global.document.createElement("span");
    label.textContent = intro
      ? "Tutorial Intro"
      : complete
        ? "Tutorial Complete"
        : `Tutorial ${unit} ${current} of ${total}`;
    const count = global.document.createElement("small");
    count.textContent = `${Math.min(current, total)} / ${total}`;
    header.append(label, count);

    const progress = global.document.createElement("progress");
    progress.className = "tutorial-progress";
    progress.max = total;
    progress.value = intro ? 0 : Math.min(current, total);
    progress.setAttribute("aria-label", `Tutorial progress: ${progress.value} of ${total}`);

    const copy = global.document.createElement("p");
    copy.textContent = instruction;
    container.append(header, progress, copy);

    if (nextAction) {
      const action = global.document.createElement("strong");
      action.textContent = `Next action: ${nextAction}`;
      container.append(action);
    }

    const actions = global.document.createElement("div");
    actions.className = "tutorial-support-actions";
    const restart = global.document.createElement("button");
    restart.type = "button";
    restart.className = "secondary";
    restart.textContent = "Restart Tutorial";
    restart.addEventListener("click", onRestart);
    const strategy = global.document.createElement("a");
    strategy.href = strategyHref;
    strategy.textContent = "View Strategy";
    actions.append(restart, strategy);
    container.append(actions);
  }

  const api = { render };
  global.NeonTutorialUi = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof globalThis !== "undefined" ? globalThis : window);
