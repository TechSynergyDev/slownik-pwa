/* ===========================================================================
   Scheduler pamięciowy w stylu FSRS (Free Spaced Repetition Scheduler)
   ---------------------------------------------------------------------------
   Model opisuje pamięć trzema wielkościami:
     S (stability)      – ile dni wytrzyma ślad pamięciowy, zanim szansa
                          przypomnienia spadnie do 90%
     D (difficulty 1-10)– jak oporne jest dane słowo dla TEJ osoby
     R (retrievability) – aktualne prawdopodobieństwo przypomnienia,
                          liczone z krzywej zapominania

   Krzywa zapominania:  R(t) = (1 + F * t/S) ^ D_EXP,  F = 19/81, D_EXP = -0.5
   Odstęp do powtórki:  I = S/F * (R_cel ^ (1/D_EXP) - 1)
                        dla R_cel = 0.9 wychodzi I ≈ S (z definicji S)

   Wagi `w` to publiczne wartości domyślne FSRS-4.5, uśrednione na dużym
   zbiorze użytkowników Anki. Nie są dopasowane do Twojej historii — po kilku
   tysiącach powtórek można je zoptymalizować na logu z tabeli `reviews`.
   =========================================================================== */

import { clamp, MIN, DAY } from './util.js';

export const DEFAULT_W = [
  0.4872, 1.4003, 3.7145, 13.8206, 5.1618, 1.2298, 0.8975, 0.0310,
  1.6474, 0.1367, 1.0461, 2.1072, 0.0793, 0.3246, 1.5870, 0.2272, 2.8755
];

const D_EXP = -0.5;
const F = 19 / 81;

export const RATING = { AGAIN: 1, HARD: 2, GOOD: 3, EASY: 4 };

/* ---------- podstawowe wzory ---------- */

export const retrievability = (elapsedDays, S) =>
  Math.pow(1 + F * (elapsedDays / Math.max(S, 0.01)), D_EXP);

export function intervalDays(S, retention = 0.9) {
  const days = (S / F) * (Math.pow(retention, 1 / D_EXP) - 1);
  return clamp(Math.round(days), 1, 3650);
}

const initStability = (g, w) => clamp(w[g - 1], 0.1, 365);
const initDifficulty = (g, w) => clamp(w[4] - (g - 3) * w[5], 1, 10);

function nextDifficulty(D, g, w) {
  const delta = D - w[6] * (g - 3);                       // trudniej = wyżej
  const reverted = w[7] * initDifficulty(RATING.EASY, w)   // powolny powrót do średniej
                 + (1 - w[7]) * delta;
  return clamp(reverted, 1, 10);
}

function stabilityOnRecall(S, D, R, g, w) {
  const hard = g === RATING.HARD ? w[15] : 1;
  const easy = g === RATING.EASY ? w[16] : 1;
  const growth = 1 + Math.exp(w[8])
    * (11 - D)                       // łatwe słowa rosną szybciej
    * Math.pow(S, -w[9])             // im dłuższy ślad, tym mniejszy przyrost
    * (Math.exp(w[10] * (1 - R)) - 1) // efekt odstępu: trudniejsze przypomnienie = większy zysk
    * hard * easy;
  return S * clamp(growth, 1, 100);
}

function stabilityOnLapse(S, D, R, w) {
  const s = w[11] * Math.pow(D, -w[12]) * (Math.pow(S + 1, w[13]) - 1) * Math.exp(w[14] * (1 - R));
  return clamp(Math.min(s, S), 0.05, 365);   // po wpadce ślad nigdy nie rośnie
}

/* ---------- stan karty ---------- */

export const newState = () => ({
  status: 'new',      // new | learning | review | relearning
  S: 0, D: 0,
  due: 0,             // znacznik czasu (ms); 0 = nigdy nie widziane
  last: null,
  step: 0,            // który krok nauki tego samego dnia
  reps: 0, lapses: 0
});

/* --- kroki nauki tego samego dnia -----------------------------------------
   Świeżo poznane słowo wraca po ~25 minutach. To nie jest kaprys: pojedyncze
   spotkanie ze słowem daje słaby ślad, a drugie przypomnienie po krótkiej
   przerwie (a nie od razu) wyraźnie podnosi szansę, że słowo przetrwa do
   następnego dnia — efekt odstępu działa już w skali minut.
   Przy nauce w przerwach w pracy 25 minut to mniej więcej następna przerwa. */
export const LEARNING_STEPS = [25 * MIN];
export const RELEARN_STEPS = [10 * MIN];
const STEP_AGAIN = 1 * MIN;
const STEP_HARD = 6 * MIN;

/**
 * Zwraca NOWY stan karty po ocenie użytkownika.
 *
 * Trzy tryby pracy:
 *   1. pierwsze spotkanie  – ustawiamy S i D z modelu, słowo wraca za 25 min
 *   2. kroki nauki         – odstępy minutowe; model pamięci zostaje nietknięty,
 *                            bo z 25 minut nie da się wnioskować o trwałości śladu
 *   3. powtórka po dniach  – pełne przeliczenie FSRS (to tu dzieje się nauka)
 *
 * @param {object} st       aktualny stan (newState() dla nowej karty)
 * @param {1|2|3|4} rating  Znowu | Trudne | Dobre | Łatwe
 * @param {object} opts     { now, retention, w, fuzz }
 */
export function schedule(st, rating, opts = {}) {
  const now = opts.now ?? Date.now();
  const retention = opts.retention ?? 0.9;
  const w = opts.w ?? DEFAULT_W;
  const s = { ...st };
  const wasNew = s.status === 'new' || !s.last;

  s.reps += 1;
  s.last = now;

  /** Koniec krótkich kroków — od teraz odstępy liczy model pamięci. */
  const graduate = () => {
    s.status = 'review';
    s.step = 0;
    let days = intervalDays(s.S, retention);
    if (opts.fuzz !== false && days >= 3) {
      const spread = Math.max(1, Math.round(days * 0.05));
      days = clamp(days + Math.round((Math.random() * 2 - 1) * spread), 1, 3650);
    }
    s.due = now + days * DAY;
  };

  /* 1. pierwsze spotkanie ze słowem */
  if (wasNew) {
    s.D = initDifficulty(rating, w);
    s.S = clamp(initStability(rating, w), 0.05, 3650);
    s.status = 'learning';
    s.step = 0;
    if (rating === RATING.AGAIN) s.due = now + STEP_AGAIN;        // za minutę, jeszcze raz
    else if (rating === RATING.HARD) s.due = now + STEP_HARD;     // opornie — wróć szybciej
    else if (rating === RATING.EASY) graduate();                  // znałeś je wcześniej
    else s.due = now + LEARNING_STEPS[0];                         // standardowo: za 25 minut
    return s;
  }

  /* 2. kroki nauki / ponownej nauki po wpadce */
  if (s.status === 'learning' || s.status === 'relearning') {
    const steps = s.status === 'learning' ? LEARNING_STEPS : RELEARN_STEPS;
    s.D = nextDifficulty(s.D, rating, w);
    if (rating === RATING.AGAIN) {
      s.step = 0; s.due = now + STEP_AGAIN;
    } else if (rating === RATING.HARD) {
      s.due = now + STEP_HARD;                      // ten sam krok jeszcze raz
    } else {
      const next = (s.step ?? 0) + 1;
      if (rating === RATING.EASY || next >= steps.length) graduate();
      else { s.step = next; s.due = now + steps[next]; }
    }
    return s;
  }

  /* 3. właściwa powtórka po dniach */
  const elapsed = Math.max(0, (now - st.last) / DAY);
  const R = retrievability(elapsed, st.S);
  s.D = nextDifficulty(s.D, rating, w);

  if (rating === RATING.AGAIN) {
    s.S = stabilityOnLapse(st.S, s.D, R, w);
    s.lapses += 1;
    s.status = 'relearning';
    s.step = 0;
    s.due = now + RELEARN_STEPS[0];
  } else {
    s.S = clamp(stabilityOnRecall(st.S, s.D, R, rating, w), 0.05, 3650);
    graduate();
  }
  return s;
}

/** Podgląd odstępów dla czterech przycisków oceny (etykiety pod przyciskami). */
export function preview(st, opts = {}) {
  const now = opts.now ?? Date.now();
  const out = {};
  for (const g of [1, 2, 3, 4]) {
    const next = schedule(st, g, { ...opts, now, fuzz: false });
    out[g] = next.due - now;
  }
  return out;
}

/** Bieżąca „siła” pamięci karty 0–1 (do statystyk i listy trudnych słów). */
export function currentRetrievability(st, now = Date.now()) {
  if (!st.last || st.status === 'new') return 0;
  return retrievability(Math.max(0, (now - st.last) / DAY), st.S);
}
