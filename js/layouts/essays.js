export default function initEssays({ signal } = {}) {
  const dateElements = document.querySelectorAll(".essay-date");

  if (!dateElements.length) {
    return;
  }

  if (signal?.aborted) {
    return;
  }

  if (typeof moment === "undefined") {
    document.querySelector("[data-essay-date-library] script")?.addEventListener(
      "load",
      () => initEssays({ signal }),
      { once: true, signal },
    );
    return;
  }

  dateElements.forEach((element) => {
    const rawDate = element.getAttribute("data-date");
    const locale = config.language || "en";

    const formattedDate = moment(rawDate).locale(locale).calendar();
    element.textContent = formattedDate;
  });
}
