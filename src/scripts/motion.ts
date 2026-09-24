// Content stays visible even when JavaScript or animation support is unavailable.
const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
const active = new Set<Animation>();
let observer: IntersectionObserver | undefined;

function setupMotion() {
  observer?.disconnect();
  active.forEach((animation) => animation.cancel());
  active.clear();
  if (preference.matches || !('IntersectionObserver' in window) || !Element.prototype.animate) return;

  observer = new IntersectionObserver((entries) => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      observer?.unobserve(entry.target);
      const element = entry.target as HTMLElement;
      if (element.dataset.motionSeen || element.contains(document.activeElement)) continue;
      element.dataset.motionSeen = 'true';
      const animation = element.animate(
        [{ opacity: 0.65, transform: 'translateY(12px)' }, { opacity: 1, transform: 'translateY(0)' }],
        { duration: 450, easing: 'cubic-bezier(0.2, 0.7, 0.3, 1)' },
      );
      active.add(animation);
      animation.finished.then(() => active.delete(animation), () => active.delete(animation));
    }
  }, { threshold: 0.08 });

  document.querySelectorAll(
    '.hero-copy, .hero-visual, .section-heading, .project-card, .resume-item, .contact-heading, .project-hero h1',
  ).forEach((element) => observer?.observe(element));
}

preference.addEventListener('change', setupMotion);
setupMotion();
