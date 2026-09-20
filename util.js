/* Drobne narzędzia ------------------------------------------------------- */

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

export const MIN = 60_000;
export const DAY = 86_400_000;

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

export function escapeHtml(s = '') {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

/** Klucz karty = ten sam format, co RowKey w Azure Table Storage. */
export function normalizeId(english) {
  return String(english).toLowerCase().trim()
    .replace(/\s+/g, '')
    .replace(/[\\/#?\u0000-\u001f\u007f-\u009f]/g, '');
}

/** Normalizacja odpowiedzi użytkownika do porównania. */
export function normalizeAnswer(s = '') {
  return String(s).toLowerCase().trim()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/^(to|a|an|the)\s+/, '')
    .replace(/[^a-z0-9' ]+/g, '')
    .replace(/\s+/g, ' ');
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(
        prev[j] + 1,
        cur[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
      );
    }
    prev = cur;
  }
  return prev[n];
}

/** 'ok' | 'near' | 'bad' — tolerancja na literówkę w dłuższych słowach. */
export function gradeTyped(typed, expected) {
  const t = normalizeAnswer(typed), e = normalizeAnswer(expected);
  if (!t) return 'bad';
  if (t === e) return 'ok';
  const dist = levenshtein(t, e);
  const tol = e.length > 8 ? 2 : e.length > 4 ? 1 : 0;
  return dist <= tol ? 'near' : 'bad';
}

/** Polska odmiana: 1 dzień / 2 dni / 5 dni */
export function plural(n, one, few, many) {
  const a = Math.abs(n) % 100, b = a % 10;
  if (n === 1) return one;
  if (b >= 2 && b <= 4 && (a < 10 || a >= 20)) return few;
  return many;
}

export function formatInterval(ms) {
  if (ms < MIN) return 'teraz';
  const mins = Math.round(ms / MIN);
  if (mins < 60) return `${mins} min`;
  const hours = Math.round(ms / (60 * MIN));
  if (hours < 24) return `${hours} ${plural(hours, 'godz.', 'godz.', 'godz.')}`;
  const days = Math.round(ms / DAY);
  if (days < 31) return `${days} ${plural(days, 'dzień', 'dni', 'dni')}`;
  const months = Math.round(days / 30.4);
  if (months < 18) return `${months} ${plural(months, 'miesiąc', 'miesiące', 'miesięcy')}`;
  const years = (days / 365).toFixed(days < 730 ? 1 : 0);
  return `${years} ${plural(Math.round(+years), 'rok', 'lata', 'lat')}`;
}

export function formatDue(due, now = Date.now()) {
  if (due - now < MIN) return 'teraz';
  return `za ${formatInterval(due - now)}`;
}

export const startOfDay = (ts = Date.now()) => {
  const d = new Date(ts); d.setHours(0, 0, 0, 0); return d.getTime();
};

export const dayKey = (ts = Date.now()) => {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

let toastTimer;
export function toast(msg, ms = 2200) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, ms);
}

/** Wymowa przez wbudowany syntezator iOS. */
export function speak(text, enabled = true) {
  if (!enabled || !('speechSynthesis' in window)) return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-GB';
    u.rate = 0.92;
    speechSynthesis.speak(u);
  } catch { /* brak głosu — trudno */ }
}

/* --- rozpoznawanie odmian -------------------------------------------------
   Zdania z pakietu i Twoje własne zawierają słowo w odmienionej formie:
   „We ran out of coffee", „He came across a letter". Bez tego podświetlenie
   i luka do wpisania po prostu by się nie pojawiły.                       */

const IRREGULAR = {
  come: ['came', 'comes', 'coming'], run: ['ran', 'runs', 'running'],
  take: ['took', 'taken', 'takes', 'taking'], keep: ['kept', 'keeps', 'keeping'],
  get: ['got', 'gotten', 'gets', 'getting'], bear: ['bore', 'borne', 'bears', 'bearing'],
  put: ['puts', 'putting'], cut: ['cuts', 'cutting'], feel: ['felt', 'feels', 'feeling'],
  make: ['made', 'makes', 'making'], tell: ['told', 'tells', 'telling'],
  hold: ['held', 'holds', 'holding'], find: ['found', 'finds', 'finding'],
  give: ['gave', 'given', 'gives', 'giving'], leave: ['left', 'leaves', 'leaving'],
  speak: ['spoke', 'spoken', 'speaks', 'speaking'], rise: ['rose', 'risen', 'rises', 'rising'],
  pay: ['paid', 'pays', 'paying'], say: ['said', 'says', 'saying'],
  go: ['went', 'gone', 'goes', 'going'], do: ['did', 'done', 'does', 'doing']
};

/** Wszystkie formy, w jakich słowo może wystąpić w zdaniu. */
export function wordForms(word) {
  const w = String(word).toLowerCase();
  const base = w.replace(/(ing|ed|es|s)$/, '') || w;
  const set = new Set([w, base]);

  for (const suf of ['s', 'es', 'ed', 'd', 'ing']) set.add(base + suf);
  if (base.endsWith('e')) {
    set.add(base.slice(0, -1) + 'ing');
    set.add(base.slice(0, -1) + 'ed');
  }
  if (base.endsWith('y')) {
    set.add(base.slice(0, -1) + 'ies');
    set.add(base.slice(0, -1) + 'ied');
  }
  if (/[^aeiou][aeiou][^aeiouwxy]$/.test(base)) {      // cut -> cutting, plan -> planned
    const doubled = base + base.slice(-1);
    set.add(doubled + 'ing');
    set.add(doubled + 'ed');
  }
  for (const key of Object.keys(IRREGULAR)) {
    if (base === key || w === key) IRREGULAR[key].forEach(f => set.add(f));
  }
  return [...set].filter(x => x.length >= 3);
}

const escapeRe = x => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Wyrażenie dopasowujące dowolną formę dowolnego znaczącego słowa z hasła. */
function termPattern(term) {
  const words = String(term).toLowerCase().replace(/^to\s+/, '').split(/\s+/).filter(w => w.length >= 3);
  const forms = [...new Set(words.flatMap(wordForms))].sort((a, b) => b.length - a.length);
  if (!forms.length) return null;
  return new RegExp(`\\b(${forms.map(escapeRe).join('|')})\\b`, 'gi');
}

/**
 * Dla wyrażeń wielowyrazowych — jedno dopasowanie na całą frazę, żeby
 * „keep up with" dało jedną lukę, a nie trzy porozrzucane po zdaniu.
 * Dopuszczamy do dwóch słów w środku: take somebody for granted.
 */
function phrasePattern(term) {
  const parts = String(term).toLowerCase().replace(/^to\s+/, '').split(/\s+/).filter(Boolean);
  if (parts.length < 2) return null;
  const chunk = w => w.length >= 3
    ? `(?:${[...new Set(wordForms(w))].sort((a, b) => b.length - a.length).map(escapeRe).join('|')})`
    : escapeRe(w);
  const body = parts.map(chunk).join(`(?:\\s+\\w+){0,2}\\s+`);
  return new RegExp(`\\b${body}\\b`, 'gi');
}

/** Czy zdanie zawiera to słowo (w dowolnej odmianie)? */
export function sentenceContains(sentence, term) {
  const re = termPattern(term);
  if (!re) return true;
  return re.test(String(sentence).toLowerCase());
}

/**
 * Podświetla słowo w zdaniu (mode 'highlight') albo zamienia je na lukę
 * do wpisania (mode 'blank').
 */
export function markInSentence(sentence, term, mode = 'highlight') {
  const safe = escapeHtml(sentence);
  const wrap = m => mode === 'blank' ? '<span class="blank">&nbsp;</span>' : `<mark>${m}</mark>`;

  const phrase = phrasePattern(term);
  if (phrase && phrase.test(safe)) {
    phrase.lastIndex = 0;
    return safe.replace(phrase, wrap);
  }
  const re = termPattern(term);
  return re ? safe.replace(re, wrap) : safe;
}

/** Forma słowa faktycznie zasłonięta luką w tym zdaniu (np. „accomplished"). */
export function matchedForm(sentence, term) {
  const phrase = phrasePattern(term);
  if (phrase) {
    const m = String(sentence).match(phrase);
    if (m) return m[0];
  }
  const re = termPattern(term);
  const m = re ? String(sentence).match(re) : null;
  return m ? m[0] : null;
}

/** Czy w tym zdaniu da się zrobić lukę na to słowo (ekran 3)? */
export function canBlank(sentence, term) {
  return markInSentence(sentence, term, 'blank').includes('class="blank"');
}

export function download(filename, text) {
  const blob = new Blob([text], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
