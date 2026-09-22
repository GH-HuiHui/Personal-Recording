const running = new WeakMap();
const coordinates = (points) => points.trim().split(/[ ,]+/).map(Number);

export function interpolatePoints(from, to, progress) {
  const start = coordinates(from);
  const end = coordinates(to);
  if (start.length !== end.length || !start.every(Number.isFinite) || !end.every(Number.isFinite)) return to;
  const amount = Math.max(0, Math.min(1, progress));
  return end.map((value, index) => start[index] + (value - start[index]) * amount)
    .reduce((pairs, value, index, all) => index % 2 ? pairs : [...pairs, `${value},${all[index + 1]}`], []).join(' ');
}

export function animateRadar(svg, previousPoints) {
  cancelAnimationFrame(running.get(svg));
  svg.getAnimations().forEach((animation) => animation.cancel());
  const shape = svg.querySelector('.radar-shape');
  if (!shape || !previousPoints || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const target = shape.getAttribute('points');
  if (target === previousPoints) return;
  if (coordinates(previousPoints).length !== coordinates(target).length) {
    svg.animate([{ opacity: 0.4 }, { opacity: 1 }], { duration: 250, easing: 'ease-out' });
    return;
  }
  const points = [...svg.querySelectorAll('.radar-point')];
  const started = performance.now();
  function frame(now) {
    const progress = Math.min(1, (now - started) / 250);
    const value = interpolatePoints(previousPoints, target, 1 - (1 - progress) ** 3);
    shape.setAttribute('points', value);
    const pairs = value.split(' ').map((pair) => pair.split(','));
    points.forEach((point, index) => { point.setAttribute('cx', pairs[index][0]); point.setAttribute('cy', pairs[index][1]); });
    if (progress < 1) running.set(svg, requestAnimationFrame(frame));
    else running.delete(svg);
  }
  frame(started);
}
