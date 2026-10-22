let lazyloadObserver = null;

const ensureObserver = () => {
  if (lazyloadObserver) {
    return;
  }

  if (typeof IntersectionObserver === "undefined") {
    return;
  }

  // Start fetching well before an image scrolls in so it is decoded on arrival.
  const options = {
    rootMargin: "600px 0px",
    threshold: 0,
  };

  lazyloadObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) {
        return;
      }

      const img = entry.target;
      const dataSrc = img.getAttribute("data-src");
      if (dataSrc && img.getAttribute("src") !== dataSrc) {
        // `data-lazy` lets CSS fade the real image in once it has decoded.
        img.dataset.lazy = "pending";
        const settle = () => {
          img.dataset.lazy = "done";
        };
        img.addEventListener("load", settle, { once: true });
        img.addEventListener("error", settle, { once: true });
        img.src = dataSrc;
      }

      img.removeAttribute("lazyload");
      delete img.dataset.redefineLazyloadObserved;
      observer.unobserve(img);
    });
  }, options);
};

export default function initLazyLoad() {
  if (typeof IntersectionObserver === "undefined") {
    document.querySelectorAll("img[lazyload]").forEach((img) => {
      const dataSrc = img.getAttribute("data-src");
      if (dataSrc) {
        img.src = dataSrc;
      }
      img.removeAttribute("lazyload");
    });
    return;
  }

  ensureObserver();

  if (!lazyloadObserver) {
    return;
  }

  document.querySelectorAll("img[lazyload]").forEach((img) => {
    if (img.dataset.redefineLazyloadObserved) {
      return;
    }

    img.dataset.redefineLazyloadObserved = "true";
    lazyloadObserver.observe(img);
  });
}
