/* ===========================================================================
   Pętla nauki — jedno słowo przechodzi przez dziesięć stron.

      1. SŁOWO          słowo + znaczenia; znam / kojarzę / nie znam  ← jedyna ocena
      2. W ZDANIACH     zdania pojedynczo, jak relacje na Instagramie
      3. WPISZ SŁOWO    zdanie z luką, słowo z klawiatury
      4. PO POLSKU      zdania po polsku, pojedynczo; znaczek EN odsłania oryginał
      5. DOPASOWANIA    z jakimi słowami się łączy
      6. ZASADY         jak się tego słowa używa
      7. SKOJARZENIA    mnemonik, notatka, tagi
      8. ZROZUMIENIE    definicja, po co, kiedy — z czatu AI, zapisywane w karcie
      9. Z FILMU        cytat z filmu/serialu (tylko jeśli autentyczny) + scena
     10. CZAT           rozmowa z AI o tym jednym słowie; „Done” w prawym górnym rogu kończy słowo

   Nawigacja:
     • przesunięcie palcem w lewo / w prawo — kolejna / poprzednia strona,
     • na stronach ze zdaniami tapnięcie w lewą 1/3 ekranu — poprzednie zdanie,
       w resztę — następne (jak relacje); za ostatnim zdaniem — kolejna strona,
     • przesunięcie w prawo na stronie 1 — powrót na pulpit.

   Ocena do algorytmu powtórek pochodzi WYŁĄCZNIE ze strony 1 i jest
   zapisywana od razu po wyborze. Powrót na stronę 1 i inny wybór poprawia
   ocenę (liczoną od stanu sprzed otwarcia słowa), zamiast dopisywać drugą.
   =========================================================================== */

import { $, escapeHtml, markInSentence, canBlank, matchedForm, gradeTyped, speak, startOfDay } from './util.js';
import { schedule, newState, currentRetrievability, RATING } from './fsrs.js';
import { putCard, logReview, updateReview, bumpStreak, reviewsSince } from './db.js';
import { attachDrag, passed, wait } from './gestures.js';
import { explainWord, tutorReply, aiConfigured } from './ai.js';

export const STEPS = [
  'slowo', 'zdania', 'wpisz', 'polsku', 'dopasowania',
  'zasady', 'skojarzenia', 'zrozumienie', 'film', 'czat'
];
const STEP_TITLES = [
  'Słowo', 'W zdaniach', 'Wpisz słowo', 'Po polsku', 'Dopasowania',
  'Zasady', 'Skojarzenia', 'Zrozumienie', 'Z filmu / serialu', 'Czat'
];
const TYPING = STEPS.indexOf('wpisz');
const LAST = STEPS.length - 1;
const STORY = new Set(['zdania', 'polsku']);
const INSIGHT_PAGES = new Set(['zrozumienie', 'film']);

/** Strona 1 → ocena dla modelu pamięci. */
const SELF_RATING = { znam: RATING.GOOD, kojarze: RATING.HARD, nieznam: RATING.AGAIN };

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

/* ------------------------------------------------------------- strony */

const head = card => `<div class="sentence-head">${escapeHtml(card.english)}</div>`;
const empty = text => `<p class="next-empty">${text}</p>`;

/**
 * Znaczenia oddzielone średnikiem to różne znaczenia — każde w osobnej linii
 * od myślnika. Przecinek zostaje w jednej linii: łączy synonimy jednego sensu.
 */
function renderMeanings(pl) {
  const parts = String(pl || '').split(';').map(x => x.trim()).filter(Boolean);
  if (parts.length < 2) return `<div class="gloss">${escapeHtml(pl)}</div>`;
  return `<ul class="meanings">${parts.map(x => `<li>${escapeHtml(x)}</li>`).join('')}</ul>`;
}

function renderWord(card) {
  return `
    <div class="term">${escapeHtml(card.english)}
      ${card.phonetic ? `<span class="phon">${escapeHtml(card.phonetic)}</span>` : ''}
    </div>
    ${card.pos ? `<div class="meta-row"><span class="pill">${escapeHtml(card.pos)}</span></div>` : ''}
    ${renderMeanings(card.polishDefinition)}`;
}

/**
 * Zdania do stron-relacji. Strona 4 dostaje te same zdania w innej kolejności
 * (żeby nie odtwarzać ich po kolei z pamięci krótkotrwałej) i tylko te,
 * które mają tłumaczenie.
 */
function storyItems(card, name) {
  const five = (card.sentences || []).filter(x => x.en).slice(0, 5);
  if (name === 'zdania') return five;
  const k = five.length ? 2 % five.length : 0;
  return [...five.slice(k), ...five.slice(0, k)].filter(x => x.pl);
}

function storyBars(n, i) {
  return `<div class="story-bars">${Array.from({ length: n }, (_, k) =>
    `<i class="${k < i ? 'done' : k === i ? 'on' : ''}"></i>`).join('')}</div>`;
}

function renderStory(card, name, index) {
  const items = storyItems(card, name);
  if (!items.length) {
    return head(card) + empty(name === 'zdania'
      ? 'Brak zdań. Dopisz je w edycji słowa.'
      : 'Brak polskich zdań. Dopisz tłumaczenia w edycji słowa.');
  }
  const i = Math.min(index, items.length - 1);
  const x = items[i];
  const card_ = name === 'zdania'
    ? `<div class="story-card">
         <p class="story-main">${markInSentence(x.en, card.english, 'highlight')}</p>
         ${x.pl ? `<p class="story-sub">(${escapeHtml(x.pl)})</p>` : ''}
       </div>`
    : `<div class="story-card">
         <p class="story-main">${escapeHtml(x.pl)}</p>
         <p class="story-reveal">${markInSentence(x.en, card.english, 'highlight')}</p>
         <button class="pl-toggle" type="button" aria-label="Pokaż po angielsku">EN</button>
       </div>`;
  return storyBars(items.length, i) + head(card) + card_;
}

function renderTyping(card, sentence) {
  if (!sentence) return empty('Brak zdania z luką do wpisania.');
  return `
    <div class="ctx big">
      ${markInSentence(sentence.en, card.english, 'blank')}
      ${sentence.pl ? `<span class="pl">${escapeHtml(sentence.pl)}</span>` : ''}
    </div>`;
}

function renderColloc(card) {
  const list = card.collocations || [];
  if (!list.length) return head(card) + empty('Brak dopasowań. Dopisz je w edycji słowa.');
  return head(card) + `<ul class="colloc-list">${
    list.map(c => `<li>${markInSentence(c, card.english, 'highlight')}</li>`).join('')}</ul>`;
}

function renderRules(card) {
  const bits = [head(card)];
  if (card.pos || card.phonetic) {
    bits.push(`<div class="meta-row">
      ${card.pos ? `<span class="pill">${escapeHtml(card.pos)}</span>` : ''}
      ${card.phonetic ? `<span class="pill">${escapeHtml(card.phonetic)}</span>` : ''}
    </div>`);
  }
  bits.push(card.rules
    ? `<div class="note-box"><h4>Jak tego używać</h4>${escapeHtml(card.rules)}</div>`
    : empty('Brak zasad. Dopisz je w edycji słowa.'));
  return bits.join('');
}

function renderAssoc(card) {
  const bits = [head(card)];
  if (card.mnemonic) bits.push(`<div class="note-box"><h4>Skojarzenie</h4>${escapeHtml(card.mnemonic)}</div>`);
  if (card.note) bits.push(`<div class="note-box"><h4>Twoja notatka</h4>${escapeHtml(card.note)}</div>`);
  if (card.tags?.length) {
    bits.push(`<div class="colloc">${card.tags.map(t => `<span>#${escapeHtml(t)}</span>`).join('')}</div>`);
  }
  if (bits.length === 1) bits.push(empty('Brak skojarzenia. Dopisz je w edycji słowa.'));
  return bits.join('');
}

/** Co pokazać na stronach 8–9, zanim objaśnienie będzie gotowe. */
function insightPending(st) {
  if (st.status === 'off') return empty('Pojawi się po podłączeniu czatu AI.');
  if (st.status === 'error') {
    return empty(`Nie udało się pobrać: ${escapeHtml(st.error)}`)
      + '<button class="btn ghost small" data-act="retry-insight" type="button">Spróbuj ponownie</button>';
  }
  return '<div class="loading"><span class="spinner"></span>Przygotowuję objaśnienie…</div>';
}

function renderUnderstanding(card, st) {
  const ins = card.insight;
  if (!ins || !(ins.definition || ins.purpose || ins.usage)) return head(card) + insightPending(st);
  const part = (title, text) => text
    ? `<section class="explain"><h4>${title}</h4><p>${escapeHtml(text)}</p></section>` : '';
  return head(card)
    + part('Definicja', ins.definition)
    + part('Po co się go używa', ins.purpose)
    + part('Kiedy się go używa', ins.usage);
}

function renderFilm(card, st) {
  const ins = card.insight;
  if (!ins) return head(card) + insightPending(st);
  let html = head(card);
  if (ins.quote) {
    const who = [ins.quote.speaker, ins.quote.source].filter(Boolean).map(escapeHtml).join(', ');
    html += `
      <figure class="quote">
        <blockquote>„${markInSentence(ins.quote.text, card.english, 'highlight')}”</blockquote>
        <figcaption>— ${who} <span class="pill ai">AI</span></figcaption>
      </figure>`;
  }
  if (ins.scene?.length) {
    html += `<div class="scene"><h4>Scena</h4>${ins.scene.map(line => `
      <div class="scene-line">
        ${line.speaker ? `<b>${escapeHtml(line.speaker)}</b>` : ''}
        <p>${markInSentence(line.en, card.english, 'highlight')}</p>
        ${line.pl ? `<p class="scene-pl">${escapeHtml(line.pl)}</p>` : ''}
      </div>`).join('')}</div>`;
  }
  if (!ins.quote && !ins.scene?.length) html += empty('Brak materiału dla tego słowa.');
  return html;
}

/** Minimalny markdown z odpowiedzi czatu: **pogrubienie**, *kursywa*, nowe linie. */
function formatReply(text) {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/(^|[\s(])\*(?!\s)([^*]+?)\*(?=[\s).,!?:;]|$)/g, '$1<i>$2</i>')
    .replace(/\n/g, '<br>');
}

function renderChat(card, chat) {
  if (!aiConfigured()) {
    return head(card) + `<div class="chat-log"><div class="bubble bot">
      Czat AI nie jest jeszcze podłączony. Wklej adres funkcji <b>chat</b> w pliku js/config.js (AI_API_URL).
    </div></div>`;
  }
  const bubbles = chat.messages.map(m => {
    if (m.role === 'user') return `<div class="bubble me">${escapeHtml(m.content).replace(/\n/g, '<br>')}</div>`;
    if (m.role === 'error') return `<div class="bubble err">${escapeHtml(m.content)}</div>`;
    return `<div class="bubble bot">${formatReply(m.content)}</div>`;
  }).join('');
  const typing = chat.busy ? '<div class="bubble bot typing"><i></i><i></i><i></i></div>' : '';
  return head(card) + `<div class="chat-log">${bubbles}${typing}</div>`;
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
      nav: $('#session-nav'), back: $('#btn-back'), next: $('#btn-next'), self: $('#self-row'),
      finishBtn: $('#btn-finish'),
      chatForm: $('#chat-form'), chatInput: $('#chat-input'),
      done: $('#session-done'), doneTitle: $('#done-title'), summary: $('#done-summary')
    };
    this._bind();
    this._fitToKeyboard();
  }

  _bind() {
    this.el.next.addEventListener('click', () => this.slide(1));
    this.el.finishBtn.addEventListener('click', () => this.finishWord());
    this.el.back.addEventListener('click', () => this.slide(-1));
    this.el.self.addEventListener('click', e => {
      const b = e.target.closest('[data-self]');
      if (b) this.selfAssess(b.dataset.self);
    });
    this.el.form.addEventListener('submit', e => { e.preventDefault(); this.checkTyped(); });
    this.el.input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); this.checkTyped(); }
    });
    this.el.chatForm.addEventListener('submit', e => { e.preventDefault(); this.sendChat(); });
    this.el.chatInput.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.sendChat(); }
    });
    this.el.chatInput.addEventListener('input', () => this.autosizeChat());
    this.el.body.addEventListener('click', e => this.handleTap(e));
    attachDrag(this.el.body, {
      axis: 'x',
      shouldStart: e => !e.target.closest('input, textarea, select'),
      onMove: dx => this.dragMove(dx),
      onEnd: (dx, v) => this.dragEnd(dx, v)
    });
  }

  /**
   * iOS: gdy wysuwa się klawiatura, widoczna część ekranu się kurczy. Dopasowujemy
   * wysokość sesji do tego, co widać, żeby pole czatu zostało tuż nad klawiaturą.
   */
  _fitToKeyboard() {
    const vv = window.visualViewport;
    if (!vv) return;
    this._fit = () => {
      if (this.el.overlay.hidden) return;
      this.el.overlay.style.height = `${vv.height}px`;
      this.el.overlay.style.top = `${vv.offsetTop}px`;
    };
    vv.addEventListener('resize', this._fit);
    vv.addEventListener('scroll', this._fit);
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
    this._fit?.();
    this.openCard();
  }

  get item() { return this.queue[this.index]; }
  get card() { return this.item ? this.item.card : null; }

  openCard() {
    if (!this.item) return this.finish();
    const card = this.card;
    this.self = null;
    this.before = null;          // stan pamięci sprzed otwarcia słowa
    this.reviewId = null;        // wpis w logu — poprawiany, gdy zmienisz ocenę
    this.rating = null;
    this.typed = '';
    this.typedVerdict = null;
    this.story = { zdania: 0, polsku: 0 };
    this.chat = { messages: [], busy: false, started: false };
    this.insight = { status: card.insight ? 'ready' : (aiConfigured() ? 'idle' : 'off') };
    this.insightPromise = null;
    this.startedAt = Date.now();
    // przy każdej powtórce inne zdanie do wpisywania; tylko takie, w których da się zrobić lukę
    const usable = (card.sentences || []).filter(x => canBlank(x.en, card.english));
    this.drill = usable.length ? usable[card.srs.main.reps % usable.length] : null;
    this.go(0);
    speak(card.english, this.settings.tts);
    this.ensureInsight();        // w tle — zanim dojdziesz do strony 8, zwykle będzie gotowe
  }

  go(step) {
    if (!this.card) return;
    this.step = Math.max(0, Math.min(LAST, step));
    const s = this.step;
    const name = STEPS[s];

    this.el.title.textContent = STEP_TITLES[s];
    this.el.dots.innerHTML = STEPS.map((_, i) =>
      `<i class="${i === s ? 'on' : i < s ? 'past' : ''}"></i>`).join('');
    this.el.counter.textContent = `${this.index + 1}/${this.queue.length}`;
    this.renderContent();

    const typingStep = s === TYPING && !!this.drill;
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
    for (const b of this.el.self.querySelectorAll('[data-self]')) {
      b.classList.toggle('chosen', b.dataset.self === this.self);
    }
    this.el.back.hidden = s === 0;
    // strona 1: dalej dopiero po ocenie; ostatnia strona: zamiast strzałki „Done” u góry
    this.el.next.hidden = (s === 0 && !this.self) || s === LAST;
    this.el.finishBtn.hidden = s !== LAST;
    this.el.counter.hidden = s === LAST;
    this.el.chatForm.hidden = name !== 'czat' || !aiConfigured();

    if (INSIGHT_PAGES.has(name)) this.ensureInsight();
    if (name === 'czat') {
      this.startChat();
      this.el.body.scrollTop = this.el.body.scrollHeight;
    } else {
      this.el.body.scrollTop = 0;
    }
  }

  renderContent() {
    const card = this.card;
    const render = {
      slowo: () => renderWord(card),
      zdania: () => renderStory(card, 'zdania', this.story.zdania),
      wpisz: () => renderTyping(card, this.drill),
      polsku: () => renderStory(card, 'polsku', this.story.polsku),
      dopasowania: () => renderColloc(card),
      zasady: () => renderRules(card),
      skojarzenia: () => renderAssoc(card),
      zrozumienie: () => renderUnderstanding(card, this.insight),
      film: () => renderFilm(card, this.insight),
      czat: () => renderChat(card, this.chat)
    }[STEPS[this.step]];
    this.el.content.innerHTML = render();
  }

  /* ------------------------------------------------ ocena (strona 1) */

  async selfAssess(value) {
    if (this.animating) return;
    this.self = value;
    await this.commitRating();
    this.slide(1);
  }

  /**
   * Zapis oceny od razu po wyborze — nawet jeśli potem zamkniesz naukę w połowie,
   * powtórka się liczy. Zmiana zdania liczy się od stanu sprzed otwarcia słowa
   * i poprawia ten sam wpis w logu.
   */
  async commitRating() {
    const card = this.card;
    const rating = SELF_RATING[this.self];
    if (!this.before) this.before = { ...(card.srs.main || newState()) };
    const wasNew = this.before.status === 'new';
    const after = schedule(this.before, rating, { retention: this.settings.retention });

    if (!this.practice) {
      card.srs = { ...card.srs, main: after };
      await putCard(card);
    }

    const entry = {
      cardId: card.id,
      rating,
      choice: this.self,
      isNew: wasNew && !this.practice,
      practice: this.practice || undefined,
      durationMs: Date.now() - this.startedAt,
      S: Number(after.S.toFixed(3)),
      D: Number(after.D.toFixed(3)),
      interval: this.practice ? 0 : after.due - Date.now()
    };
    const good = rating > RATING.AGAIN;

    if (this.reviewId) {
      await updateReview(this.reviewId, entry);
      this.correct += (good ? 1 : 0) - (this.rating > RATING.AGAIN ? 1 : 0);
    } else {
      this.reviewId = await logReview(entry);
      this.answered++;
      if (good) this.correct++;
      if (wasNew && !this.practice) this.introducedNew = true;
      if (this.answered === 1) await bumpStreak();
    }
    this.rating = rating;
  }

  /* ------------------------------------------------ strona 3: wpisywanie */

  checkTyped() {
    const typed = this.el.input.value.trim();
    if (!typed) return;
    this.typed = typed;
    // luka bywa formą odmienioną („We ___ more" = accomplished) — uznajemy obie
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

  /* ------------------------------------------------ strony 2 i 4: relacje */

  handleTap(e) {
    if (e.target.closest('[data-act="retry-insight"]')) {
      this.ensureInsight(true);
      this.renderContent();
      return;
    }
    const name = STEPS[this.step];
    if (!STORY.has(name)) return;
    const toggle = e.target.closest('.pl-toggle');
    if (toggle) {
      toggle.closest('.story-card').classList.toggle('open');
      return;
    }
    // jak relacje na Instagramie: lewa 1/3 ekranu = wstecz, reszta = dalej
    const r = this.el.body.getBoundingClientRect();
    this.storyMove(e.clientX - r.left < r.width / 3 ? -1 : 1);
  }

  storyMove(dir) {
    if (this.animating) return;
    const name = STEPS[this.step];
    const n = storyItems(this.card, name).length;
    const i = this.story[name] + dir;
    if (i < 0) return this.slide(-1);
    if (i >= n) return this.slide(1);
    this.story[name] = i;
    this.renderContent();
  }

  /* ------------------------------------------------ strony 8–9: objaśnienie z AI */

  ensureInsight(force = false) {
    const card = this.card;
    if (!card) return;
    if (!aiConfigured()) { this.insight = { status: 'off' }; return; }
    if (card.insight && !force) { this.insight = { status: 'ready' }; return; }
    if (this.insightPromise) return;

    this.insight = { status: 'loading' };
    this.insightPromise = explainWord(card)
      .then(async insight => {
        card.insight = insight;          // zapisane w karcie → synchronizuje się z Azure
        await putCard(card);
        if (this.card === card) this.insight = { status: 'ready' };
      })
      .catch(err => {
        if (this.card === card) this.insight = { status: 'error', error: err.message };
      })
      .finally(() => {
        if (this.card !== card) return;
        this.insightPromise = null;
        if (INSIGHT_PAGES.has(STEPS[this.step])) this.renderContent();
      });
  }

  /* ------------------------------------------------ strona 10: czat */

  startChat() {
    if (this.chat.started || !aiConfigured()) return;
    this.chat.started = true;
    this.askTutor();                     // czat zaczyna i zadaje pierwsze pytanie
  }

  sendChat() {
    const text = this.el.chatInput.value.trim();
    if (!text || this.chat.busy) return;
    this.el.chatInput.value = '';
    this.autosizeChat();
    this.chat.messages.push({ role: 'user', content: text });
    this.askTutor();
  }

  async askTutor() {
    const card = this.card;
    const chat = this.chat;
    chat.busy = true;
    this.refreshChat();
    try {
      const reply = await tutorReply(card, chat.messages);
      chat.messages.push({ role: 'assistant', content: reply || '…' });
    } catch (err) {
      chat.messages.push({ role: 'error', content: `Nie udało się: ${err.message}` });
    } finally {
      chat.busy = false;
      if (this.chat === chat) this.refreshChat();
    }
  }

  refreshChat() {
    if (STEPS[this.step] !== 'czat') return;
    this.renderContent();
    this.el.body.scrollTop = this.el.body.scrollHeight;
  }

  autosizeChat() {
    const ta = this.el.chatInput;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`;
  }

  /* ------------------------------------------------ przejścia i gesty */

  /**
   * Zmiana strony z animacją: bieżąca odjeżdża w bok, nowa wjeżdża z drugiej
   * strony. Wchodząc na stronę-relację od tyłu, zaczynamy od ostatniego zdania.
   */
  async slide(dir) {
    if (this.animating) return;
    const target = this.step + dir;
    if (target < 0 || target > LAST) return this.snapBack();
    this.animating = true;
    const b = this.el.body;
    const w = b.clientWidth || 360;
    b.style.transition = 'transform .18s ease-in, opacity .18s ease-in';
    b.style.transform = `translateX(${-dir * w}px)`;
    b.style.opacity = '0';
    await wait(180);
    const name = STEPS[target];
    if (STORY.has(name)) {
      const n = storyItems(this.card, name).length;
      this.story[name] = dir > 0 ? 0 : Math.max(0, n - 1);
    }
    this.go(target);
    b.style.transition = 'none';
    b.style.transform = `translateX(${dir * w * 0.3}px)`;
    void b.offsetWidth;                                   // przeliczenie przed animacją
    b.style.transition = 'transform .24s cubic-bezier(.2,.8,.2,1), opacity .2s ease';
    b.style.transform = '';
    b.style.opacity = '';
    await wait(240);
    this.animating = false;
  }

  snapBack() {
    for (const el of [this.el.body, this.el.overlay]) {
      el.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1), opacity .2s ease';
      el.style.transform = '';
      el.style.opacity = '';
    }
    this.el.overlay.classList.remove('peeling');
  }

  dragMove(dx) {
    if (this.animating) return;
    // strona 1 w prawo = cofanie do pulpitu: jedzie cały ekran, spod spodu widać pulpit
    if (this.step === 0 && dx > 0) {
      const ov = this.el.overlay;
      ov.classList.add('peeling');
      ov.style.transition = 'none';
      ov.style.transform = `translateX(${dx}px)`;
      return;
    }
    const w = this.el.body.clientWidth || 360;
    const blocked = this.step === 0 && dx < 0 && !this.self;   // dalej dopiero po ocenie
    const x = blocked ? dx * 0.25 : dx;
    const b = this.el.body;
    b.style.transition = 'none';
    b.style.transform = `translateX(${x}px)`;
    b.style.opacity = String(1 - Math.min(0.45, Math.abs(x) / w));
  }

  async dragEnd(dx, v) {
    const w = this.el.body.clientWidth || 360;
    if (this.step === 0 && dx > 0) {
      return passed(dx, v, w, 0.4) ? this.dismissToHome() : this.snapBack();
    }
    if (!passed(dx, v, w)) return this.snapBack();
    if (dx < 0) {
      if (this.step === 0 && !this.self) return this.snapBack();
      if (this.step === LAST) { this.snapBack(); return this.finishWord(); }
      return this.slide(1);
    }
    return this.slide(-1);
  }

  /** Strona 1, przesunięcie w prawo — ekran odjeżdża i wracamy na pulpit. */
  async dismissToHome() {
    const ov = this.el.overlay;
    ov.style.transition = 'transform .22s ease-out';
    ov.style.transform = 'translateX(100%)';
    await wait(220);
    this.close();
    ov.classList.remove('peeling');
    ov.style.transition = '';
    ov.style.transform = '';
  }

  /* ------------------------------------------------ koniec */

  /** Ostatnia strona → następne słowo z kolejki albo ekran podsumowania. */
  finishWord() {
    if (this.animating) return;
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
    this.el.overlay.style.height = '';
    this.el.overlay.style.top = '';
    document.body.style.overflow = '';
    speechSynthesis?.cancel?.();
    this.onFinish?.({
      answered: this.answered, correct: this.correct,
      introducedNew: this.introducedNew, practice: this.practice, aborted: true
    });
  }
}
