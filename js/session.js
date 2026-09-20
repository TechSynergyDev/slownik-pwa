/* ===========================================================================
   Pętla nauki — jedno słowo przechodzi przez pięć ekranów.

     1. SŁOWO          angielskie słowo + tłumaczenie, ocena: znam / kojarzę / nie znam
     2. ZDANIA         do pięciu zdań z tym słowem, pod każdym tłumaczenie
     3. WPISZ          zdanie z luką — słowo trzeba wystukać z klawiatury
     4. ZASADY         jak się tego słowa używa: kolokacje, pułapki, rejestr
     5. SKOJARZENIA    mnemonik, własna notatka, tagi + ocena końcowa

   „Jeszcze raz” nie kończy słowa — puszcza je przez te same pięć ekranów od
   nowa, z przykładami w innej kolejności i z inną luką do wpisania.
   Ocena końcowa (umiem / nie umiem) trafia do modelu pamięci.
   Sygnały z ekranu 1 i 3 nie idą do kosza: jeśli na wejściu zadeklarowałeś
   „znam”, wpisałeś słowo bezbłędnie i kończysz na „umiem”, algorytm traktuje
   to jak ocenę „łatwe” i wydłuża odstęp mocniej niż przy zwykłym „umiem”.
   =========================================================================== */

import { $, escapeHtml, formatInterval, markInSentence, canBlank, matchedForm, gradeTyped, speak, startOfDay } from './util.js';
import { schedule, preview, newState, currentRetrievability, RATING } from './fsrs.js';
import { putCard, logReview, bumpStreak, reviewsSince } from './db.js';

export const STEPS = ['slowo', 'zdania', 'wpisz', 'zasady', 'skojarzenia'];
const STEP_TITLES = ['Słowo', 'W zdaniach', 'Wpisz słowo', 'Zasady', 'Skojarzenia'];

/* ---------------------------------------------------------------- kolejka */

/** Ile nowych słów poznano dzisiaj. */
export async function introducedToday() {
  const rows = await reviewsSince(startOfDay());
  return rows.filter(r => r.isNew).length;
}

/**
 * Jedna kolejka na wszystko — aplikacja nie pyta „nowe czy powtórka”:
 *
 *   1. słowa w trakcie poznawania (kroki tego samego dnia) — zaczęty ślad
 *      jest kruchy, dokończenie go jest tańsze niż zaczynanie czegoś obok,
 *   2. powtórki od najbardziej zagrożonych — sortowane po szansie
 *      przypomnienia R, nie po dacie; przy remisie pierwszeństwo ma słowo
 *      trudniejsze (wysokie D),
 *   3. nowe słowa — tylko gdy zaległości są opanowane i został dzienny limit.
 */
export function buildQueue(cards, settings, { now = Date.now(), newBudget = 0 } = {}) {
  const inProgress = [];
  const reviews = [];
  const fresh = [];

  for (const card of cards) {
    const st = card.srs.main;
    if (st.status === 'new') { fresh.push(card); continue; }
    if (st.due > now) continue;
    const item = { card, due: st.due, risk: 1 - currentRetrievability(st, now), D: st.D };
    (st.status === 'review' ? reviews : inProgress).push(item);
  }

  inProgress.sort((a, b) => a.due - b.due);
  reviews.sort((a, b) => b.risk - a.risk || b.D - a.D);

  // Zaległości mają pierwszeństwo przed nowym materiałem: dokładanie słów do
  // rosnącej góry powtórek kończy się lawiną i spadkiem skuteczności.
  const backlog = inProgress.length + reviews.length;
  const budget = backlog > (settings.maxBacklog ?? 20) ? 0 : Math.max(0, newBudget);
  const newcomers = spreadSimilar(fresh, cards, now).slice(0, budget).map(card => ({ card }));

  return [...inProgress, ...reviews, ...newcomers].slice(0, settings.maxSession);
}

/**
 * Kolejność nowych słów: najpierw te najmniej podobne do poznanych dzisiaj.
 * Uczenie się naraz słów z jednego worka (ten sam temat, ten sam początek)
 * prowadzi do mylenia ich ze sobą.
 */
function spreadSimilar(candidates, allCards, now) {
  const today = startOfDay(now);
  const recent = allCards.filter(c => c.srs.main.last && c.srs.main.last >= today);
  if (!recent.length) return [...candidates].sort((a, b) => a.createdAt - b.createdAt);

  const clash = card => {
    const head = card.english.slice(0, 2).toLowerCase();
    let score = 0;
    for (const r of recent) {
      if (r.id === card.id) continue;
      if (r.english.slice(0, 2).toLowerCase() === head) score += 2;
      if ((r.tags || []).some(t => (card.tags || []).includes(t))) score += 1;
    }
    return score;
  };

  return candidates
    .map(card => ({ card, score: clash(card) }))
    .sort((a, b) => a.score - b.score || a.card.createdAt - b.card.createdAt)
    .map(x => x.card);
}

/* -------------------------------------------------------------- ekrany */

function renderWord(card) {
  return `
    <div class="term">${escapeHtml(card.english)}
      ${card.phonetic ? `<span class="phon">${escapeHtml(card.phonetic)}</span>` : ''}
    </div>
    ${card.pos ? `<div class="meta-row"><span class="pill">${escapeHtml(card.pos)}</span></div>` : ''}
    <div class="gloss">${escapeHtml(card.polishDefinition)}</div>`;
}

/**
 * Zdania pokazywane na ekranie 2. Przy powtórnym podejściu („jeszcze raz”)
 * kolejność się przesuwa, a gdy słowo ma więcej niż pięć zdań — pokazujemy
 * inną piątkę.
 */
export function presentedSentences(card, pass = 0) {
  const all = card.sentences || [];
  if (all.length <= 5) {
    const k = all.length ? pass % all.length : 0;
    return [...all.slice(k), ...all.slice(0, k)];
  }
  const start = (pass * 5) % all.length;
  return [...all, ...all].slice(start, start + 5);
}

function renderSentences(card, pass = 0) {
  const list = presentedSentences(card, pass);
  if (!list.length) {
    return '<p class="next-empty">Brak zdań. Dopisz je w edycji słowa.</p>';
  }
  return `
    <div class="sentence-head">${escapeHtml(card.english)}</div>
    <ol class="sentence-list">
      ${list.map(s => `
        <li>
          <p class="s-en">${markInSentence(s.en, card.english, 'highlight')}</p>
          ${s.pl ? `<p class="s-pl">(${escapeHtml(s.pl)})</p>` : ''}
        </li>`).join('')}
    </ol>`;
}

function renderTyping(card, sentence) {
  if (!sentence) {
    return '<p class="next-empty">Brak zdania z luką do wpisania.</p>';
  }
  return `
    <div class="ctx big">
      ${markInSentence(sentence.en, card.english, 'blank')}
      ${sentence.pl ? `<span class="pl">${escapeHtml(sentence.pl)}</span>` : ''}
    </div>`;
}

function renderRules(card) {
  const bits = [`<div class="sentence-head">${escapeHtml(card.english)}</div>`];
  if (card.pos || card.phonetic) {
    bits.push(`<div class="meta-row">
      ${card.pos ? `<span class="pill">${escapeHtml(card.pos)}</span>` : ''}
      ${card.phonetic ? `<span class="pill">${escapeHtml(card.phonetic)}</span>` : ''}
    </div>`);
  }
  if (card.rules) bits.push(`<div class="note-box"><h4>Jak tego używać</h4>${escapeHtml(card.rules)}</div>`);
  if (card.collocations?.length) {
    bits.push(`<div class="note-box"><h4>Kolokacje</h4><div class="colloc">${
      card.collocations.map(c => `<span>${escapeHtml(c)}</span>`).join('')}</div></div>`);
  }
  if (bits.length === 1) {
    bits.push('<p class="next-empty">Brak zasad. Dopisz je w edycji słowa.</p>');
  }
  return bits.join('');
}

function renderAssoc(card) {
  const bits = [`<div class="sentence-head">${escapeHtml(card.english)}</div>`];
  if (card.mnemonic) bits.push(`<div class="note-box"><h4>Skojarzenie</h4>${escapeHtml(card.mnemonic)}</div>`);
  if (card.note) bits.push(`<div class="note-box"><h4>Twoja notatka</h4>${escapeHtml(card.note)}</div>`);
  if (card.tags?.length) {
    bits.push(`<div class="colloc">${card.tags.map(t => `<span>#${escapeHtml(t)}</span>`).join('')}</div>`);
  }
  if (bits.length === 1) {
    bits.push('<p class="next-empty">Brak skojarzenia. Dopisz je w edycji słowa.</p>');
  }
  return bits.join('');
}

/* ------------------------------------------------------------------ sesja */

export class Session {
  constructor(settings, onFinish) {
    this.settings = settings;
    this.onFinish = onFinish;
    this.queue = [];
    this.index = 0;
    this.step = 0;
    this.answered = 0;
    this.correct = 0;
    this.practice = false;
    this.introducedNew = false;
    this.el = {
      overlay: $('#session'), body: $('#session-body'), content: $('#step-content'),
      dots: $('#step-dots'), counter: $('#session-counter'), title: $('#step-title'),
      form: $('#produce-form'), input: $('#produce-input'), verdict: $('#type-verdict'),
      nav: $('#session-nav'), back: $('#btn-back'), next: $('#btn-next'),
      self: $('#self-row'), final: $('#final-row'),
      done: $('#session-done'), doneTitle: $('#done-title'), summary: $('#done-summary')
    };
    this._bind();
  }

  _bind() {
    this.el.next.addEventListener('click', () => this.go(this.step + 1));
    this.el.back.addEventListener('click', () => this.go(this.step - 1));
    this.el.self.addEventListener('click', e => {
      const b = e.target.closest('[data-self]');
      if (b) this.selfAssess(b.dataset.self);
    });
    this.el.final.addEventListener('click', e => {
      const b = e.target.closest('[data-final]');
      if (b) this.finishCard(b.dataset.final);
    });
    this.el.form.addEventListener('submit', e => { e.preventDefault(); this.checkTyped(); });
    this.el.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this.checkTyped(); }
    });
  }

  /** practice = powtórka na zapas: ćwiczy, ale nie rusza harmonogramu. */
  start(queue, { practice = false } = {}) {
    this.practice = practice;
    this.queue = queue;
    this.index = 0;
    this.answered = 0;
    this.correct = 0;
    this.introducedNew = false;
    this.el.done.hidden = true;
    this.el.nav.hidden = false;
    this.el.overlay.hidden = false;
    document.body.style.overflow = 'hidden';
    this.openCard();
  }

  get item() { return this.queue[this.index]; }
  get card() { return this.item ? this.item.card : null; }

  openCard() {
    if (!this.item) return this.finish();
    this.pass = 0;
    this.resetPass();
  }

  /** Ustawia słowo na pierwszy ekran — przy podejściu 0 i przy każdym kolejnym. */
  resetPass() {
    this.self = null;
    this.typed = '';
    this.typedVerdict = null;
    this.startedAt = Date.now();
    // Do wpisywania bierzemy tylko zdania, w których da się zrobić lukę —
    // „cautiously" nie nadaje się na ćwiczenie hasła „cautious”.
    // Przy każdej powtórce inne zdanie: nie uczymy się jednej formułki.
    const usable = (this.card.sentences || []).filter(x => canBlank(x.en, this.card.english));
    this.drill = usable.length
      ? usable[(this.card.srs.main.reps + this.pass) % usable.length]
      : null;
    this.go(0);
    speak(this.card.english, this.settings.tts);
  }

  go(step) {
    const card = this.card;
    if (!card) return;
    this.step = Math.max(0, Math.min(STEPS.length - 1, step));
    const s = this.step;

    this.el.title.textContent = STEP_TITLES[s];
    this.el.dots.innerHTML = STEPS.map((_, i) =>
      `<i class="${i === s ? 'on' : i < s ? 'past' : ''}"></i>`).join('');
    this.el.counter.textContent = `${this.index + 1}/${this.queue.length}`;

    const renderers = [
      () => renderWord(card),
      () => renderSentences(card, this.pass),
      () => renderTyping(card, this.drill),
      () => renderRules(card),
      () => renderAssoc(card)
    ];
    this.el.content.innerHTML = renderers[s]();

    const typingStep = s === 2 && !!this.drill;
    this.el.form.hidden = !typingStep;
    if (typingStep) {
      this.el.input.value = this.typed;
      this.el.input.className = this.typedVerdict ? (this.typedVerdict === 'bad' ? 'err' : 'ok') : '';
      this.el.verdict.hidden = !this.typedVerdict;
      if (!this.typedVerdict) setTimeout(() => this.el.input.focus(), 150);
    } else {
      this.el.verdict.hidden = true;
    }

    this.el.self.hidden = s !== 0;
    this.el.final.hidden = s !== STEPS.length - 1;
    this.el.next.hidden = s === 0 || s === STEPS.length - 1;
    this.el.back.hidden = s === 0;
    if (s === STEPS.length - 1) this.showFinalIntervals();

    this.el.body.scrollTop = 0;
  }

  /** Ekran 1 — deklaracja, potem od razu w zdania. */
  selfAssess(value) {
    this.self = value;
    this.go(1);
  }

  /** Ekran 3 — sprawdzenie wpisanego słowa. */
  checkTyped() {
    const typed = this.el.input.value.trim();
    if (!typed) return;
    this.typed = typed;
    // Luka bywa formą odmienioną („We ___ more" = accomplished), więc uznajemy
    // zarówno hasło słownikowe, jak i formę użytą w tym zdaniu.
    const expected = this.drill ? matchedForm(this.drill.en, this.card.english) : null;
    const order = { ok: 3, near: 2, bad: 1 };
    const verdicts = [gradeTyped(typed, this.card.english)];
    if (expected) verdicts.push(gradeTyped(typed, expected));
    this.typedVerdict = verdicts.sort((a, b) => order[b] - order[a])[0];
    this.el.input.className = this.typedVerdict === 'bad' ? 'err' : 'ok';

    const label = {
      ok: ['ok', '✓ Dokładnie tak'],
      near: ['near', '≈ Prawie — drobna literówka'],
      bad: ['bad', '✕ Nie tym razem']
    }[this.typedVerdict];

    this.el.verdict.className = `verdict ${label[0]}`;
    this.el.verdict.innerHTML = `${label[1]}${
      this.typedVerdict === 'ok' ? '' : ` — poprawnie: <b>${escapeHtml(expected || this.card.english)}</b>`}`;
    this.el.verdict.hidden = false;
    speak(this.card.english, this.settings.tts);
  }

  /** Etykiety odstępów pod trzema przyciskami końcowymi. */
  showFinalIntervals() {
    const ivs = preview(this.card.srs.main, { retention: this.settings.retention });
    const label = key => {
      if (key === 'again') return 'od nowa';
      if (this.practice) return '';
      return formatInterval(ivs[key === 'know' ? this.knowRating() : RATING.AGAIN]);
    };
    for (const key of ['again', 'know', 'dontknow']) {
      const el = this.el.final.querySelector(`[data-final="${key}"] span`);
      if (el) el.textContent = label(key);
    }
  }

  /**
   * Jaka ocena kryje się pod „umiem”:
   *   łatwe  — zadeklarowałeś „znam” i wpisałeś bezbłędnie za pierwszym podejściem,
   *   trudne — potrzebowałeś powtórzenia słowa w tej sesji,
   *   dobre  — wszystko pozostałe.
   */
  knowRating() {
    if (this.pass > 0) return RATING.HARD;
    return this.self === 'znam' && this.typedVerdict === 'ok' ? RATING.EASY : RATING.GOOD;
  }

  async finishCard(choice) {
    const card = this.card;
    if (!card) return;

    // „jeszcze raz” nie zamyka słowa — przepuszcza je przez ekrany od nowa
    if (choice === 'again') {
      this.pass += 1;
      await logReview({
        cardId: card.id, repeat: true, pass: this.pass,
        self: this.self, typedVerdict: this.typedVerdict || undefined,
        durationMs: Date.now() - this.startedAt
      });
      if (this.answered === 0 && this.pass === 1) await bumpStreak();
      this.resetPass();
      return;
    }

    const rating = choice === 'dontknow' ? RATING.AGAIN : this.knowRating();

    const before = card.srs.main || newState();
    const wasNew = before.status === 'new';
    const after = schedule(before, rating, { retention: this.settings.retention });

    if (!this.practice) {
      card.srs = { ...card.srs, main: after };
      await putCard(card);
    }

    await logReview({
      cardId: card.id,
      rating,
      choice,
      passes: this.pass,
      self: this.self,
      typed: this.typed || undefined,
      typedVerdict: this.typedVerdict || undefined,
      isNew: wasNew && !this.practice,
      practice: this.practice || undefined,
      durationMs: Date.now() - this.startedAt,
      S: Number(after.S.toFixed(3)),
      D: Number(after.D.toFixed(3)),
      interval: this.practice ? 0 : after.due - Date.now()
    });

    this.answered++;
    if (rating > RATING.AGAIN) this.correct++;
    if (wasNew && !this.practice) this.introducedNew = true;
    if (this.answered === 1) await bumpStreak();

    // „nie umiem” wraca tym samym słowem jeszcze w tej sesji
    if (rating === RATING.AGAIN) {
      this.queue.splice(Math.min(this.index + 3, this.queue.length), 0, { card });
    }

    this.index++;
    this.openCard();
  }

  finish() {
    this.el.nav.hidden = true;
    this.el.done.hidden = false;
    const acc = this.answered ? Math.round((this.correct / this.answered) * 100) : 0;
    this.el.doneTitle.textContent = 'Gotowe';
    this.el.summary.textContent = this.answered
      ? `${this.answered} ${this.answered === 1 ? 'słowo' : 'słów'}, ${acc}% trafień.`
      : 'Nic do powtórki.';
    this.onFinish?.({
      answered: this.answered, correct: this.correct,
      introducedNew: this.introducedNew, practice: this.practice
    });
  }

  close() {
    this.el.overlay.hidden = true;
    document.body.style.overflow = '';
    speechSynthesis?.cancel?.();
    this.onFinish?.({
      answered: this.answered, correct: this.correct,
      introducedNew: this.introducedNew, practice: this.practice, aborted: true
    });
  }
}
