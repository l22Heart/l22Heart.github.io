(() => {
  'use strict';

  const guard = Symbol.for('heart22.site-motion');
  if (window[guard]) return;
  window[guard] = true;

  // The stylesheet owns visibility. Unsupported browsers simply keep the page still.
  if (
    typeof window.IntersectionObserver !== 'function' ||
    typeof Element.prototype.animate !== 'function' ||
    typeof window.matchMedia !== 'function'
  ) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const selectors = [
    '.home-article-item',
    '.eva-collection-card',
    '.eva-tag-card',
  ].join(', ');
  const revealed = new WeakSet();
  const animations = new Set();
  let observer = null;
  let signature = null;
  let viewReady = true;
  let pageHidden = false;
  // A restored position or fragment should be immediately readable, not re-opened.
  let skipView = Boolean(window.location.hash) ||
    window.performance?.getEntriesByType?.('navigation')[0]?.type === 'back_forward';

  const isChanging = () => document.documentElement.classList.contains('is-changing');

  const track = (animation) => {
    animations.add(animation);
    const release = () => animations.delete(animation);
    animation.onfinish = release;
    animation.oncancel = release;
  };

  const stop = () => {
    if (signature) {
      signature.removeAttribute('data-signature-intro');
      signature = null;
    }
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    for (const animation of animations) {
      animation.onfinish = null;
      animation.oncancel = null;
      animation.cancel();
    }
    animations.clear();
  };

  const bind = () => {
    if (observer || !viewReady || pageHidden || skipView || motion.matches || isChanging()) return;

    const viewportHeight = document.documentElement.clientHeight;
    const hero = document.querySelector('.home-banner-container');
    if (hero && !revealed.has(hero)) {
      revealed.add(hero);
      // Restored/offscreen signatures stay still, just like restored article rows.
      if (hero.getBoundingClientRect().bottom > 0) {
        signature = hero;
        signature.setAttribute('data-signature-intro', '');
        signature.querySelectorAll('.home-avatar, .home-author-id').forEach((element, index) => {
          track(element.animate([
            { opacity: 0.25, transform: 'translateY(12px)' },
            { opacity: 1, transform: 'translateY(0)' },
          ], {
            duration: index ? 880 : 720,
            delay: index ? 110 : 0,
            easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
            fill: 'backwards',
          }));
        });
      }
    }

    const targets = Array.from(document.querySelectorAll(selectors))
      .filter((element) => {
        if (revealed.has(element)) return false;
        // The route fade has already introduced this viewport. Never fade its
        // cards a second time, including cards scrolled past during navigation.
        if (element.getBoundingClientRect().top < viewportHeight) {
          revealed.add(element);
          return false;
        }
        return true;
      });
    if (!targets.length) return;

    observer = new IntersectionObserver((entries, currentObserver) => {
      // Disconnected observers can still have a queued delivery from the old view.
      if (currentObserver !== observer || !viewReady || pageHidden || motion.matches) return;
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        const element = entry.target;
        currentObserver.unobserve(element);
        if (!element.isConnected || revealed.has(element)) continue;
        revealed.add(element);
        // Skip rather than replay an entry that arrived during a route transition.
        if (isChanging()) continue;

        const animation = element.animate([
          { opacity: 0, transform: 'translateY(10px)' },
          { opacity: 1, transform: 'translateY(0)' },
        ], {
          duration: 380,
          easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)',
          fill: 'none',
        });
        track(animation);
      }
    }, { threshold: 0.08 });

    for (const element of targets) observer.observe(element);
  };

  const suspendView = () => {
    viewReady = false;
    stop();
  };

  document.addEventListener('swup:visit:start', suspendView);
  document.addEventListener('swup:content:replace', suspendView);
  document.addEventListener('swup:page:view', (event) => {
    const visit = event.detail?.visit;
    viewReady = true;
    skipView = Boolean(visit?.history?.popstate || visit?.to?.hash || window.location.hash);
    bind();
  });
  // Swup emits page:view after scrolling but before its incoming transition ends.
  // visit:end is dispatched after Swup clears is-changing; no polling is needed.
  document.addEventListener('swup:visit:end', bind);

  const syncPreference = () => {
    stop();
    if (!motion.matches) bind();
  };
  if (typeof motion.addEventListener === 'function') {
    motion.addEventListener('change', syncPreference);
  } else if (typeof motion.addListener === 'function') {
    motion.addListener(syncPreference);
  }

  window.addEventListener('pagehide', () => {
    pageHidden = true;
    stop();
  });
  window.addEventListener('pageshow', (event) => {
    pageHidden = false;
    if (event.persisted) {
      // BFCache restores the same nodes and scroll; never restart their entrance.
      skipView = true;
      stop();
      return;
    }
    bind();
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
