/* ===========================================================================
   Przeciąganie palcem jak w natywnych aplikacjach iOS: treść jedzie za palcem,
   a po puszczeniu albo wraca na miejsce, albo przeskakuje dalej.

   Kierunek gestu rozstrzyga się po pierwszych kilku pikselach ruchu. Jeśli
   palec idzie w osi, której nie obsługujemy, oddajemy gest przeglądarce —
   dzięki temu przewijanie w pionie działa normalnie, a poziomy ruch zmienia
   strony. Element musi mieć w CSS `touch-action` zostawiające przeglądarce
   tylko tę drugą oś (np. `pan-y` dla poziomego przeciągania).
   =========================================================================== */

const LOCK_PX = 8;

/**
 * @param {HTMLElement} el
 * @param {object} opts
 *   axis        'x' | 'y' — oś, którą obsługujemy
 *   shouldStart (event) => bool — np. żeby nie przechwytywać pola tekstowego
 *   onMove      (delta) => void — przesunięcie od początku gestu w px
 *   onEnd       (delta, velocity) => void — velocity w px/ms, znak = kierunek
 */
export function attachDrag(el, { axis = 'x', shouldStart, onMove, onEnd }) {
  let start = null;
  let locked = null;
  let suppressUntil = 0;       // kliknięcie tuż po przeciągnięciu to nie tapnięcie

  el.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (shouldStart && !shouldStart(e)) return;
    start = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    locked = null;
  });

  el.addEventListener('pointermove', e => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!locked) {
      if (Math.abs(dx) < LOCK_PX && Math.abs(dy) < LOCK_PX) return;
      locked = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (locked !== axis) { start = null; locked = null; return; }
      try { el.setPointerCapture(e.pointerId); } catch { /* starsze przeglądarki */ }
      document.body.classList.add('is-dragging');
    }
    onMove(axis === 'x' ? dx : dy);
  });

  const finish = (e, cancelled) => {
    if (!start || e.pointerId !== start.id) return;
    if (locked === axis) {
      const d = cancelled ? 0 : (axis === 'x' ? e.clientX - start.x : e.clientY - start.y);
      const v = cancelled ? 0 : d / Math.max(1, performance.now() - start.t);
      // tylko prawdziwe przeciagniecie uniewaznia tapniecie; drgniecie palca
      // przy dotknieciu ekranu nie moze zjadac klikniecia
      if (Math.abs(d) > 20) suppressUntil = performance.now() + 350;
      document.body.classList.remove('is-dragging');
      onEnd(d, v);
    }
    start = null;
    locked = null;
  };
  el.addEventListener('pointerup', e => finish(e, false));
  el.addEventListener('pointercancel', e => finish(e, true));

  // puszczenie palca po przeciągnięciu nie jest tapnięciem — ale tylko przez
  // chwilę; później kliknięcie (także z klawiatury) działa normalnie
  el.addEventListener('click', e => {
    if (performance.now() > suppressUntil) return;
    suppressUntil = 0;
    e.stopPropagation();
    e.preventDefault();
  }, true);
}

/**
 * Przewinięcie listy w górę chowa klawiaturę — tak jak w ChatGPT: chcesz
 * poczytać historię, więc pole pisania wraca do jednej linii i oddaje ekran.
 * Automatyczne przewinięcie na dół (po wysłaniu) nie chowa niczego.
 */
export function hideKeyboardOnScrollUp(scroller, input) {
  let last = 0;
  scroller.addEventListener('scroll', () => {
    const top = scroller.scrollTop;
    if (top < last - 12 && document.activeElement === input) input.blur();
    last = top;
  }, { passive: true });
}

/** Czy gest przekroczył próg — „do połowy" albo szybkie machnięcie. */
export const passed = (delta, velocity, size, ratio = 0.35) =>
  Math.abs(delta) > size * ratio || Math.abs(velocity) > 0.5;

export const wait = ms => new Promise(r => setTimeout(r, ms));
