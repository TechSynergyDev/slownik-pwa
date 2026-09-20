/* ===========================================================================
   Widoki: Dziś, Słownik, Postępy, szczegóły słowa.
   Każda funkcja dostaje gotowe dane i tylko rysuje — żadnych zapytań do bazy.
   =========================================================================== */

import { $, escapeHtml, formatDue, formatInterval, dayKey, DAY, startOfDay, markInSentence, plural } from './util.js';
import { currentRetrievability } from './fsrs.js';
import { TIPS } from './config.js';

/* ------------------------------------------------------------------ DZIŚ */

const DAY_LABELS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'];

/**
 * Pasek tygodnia pon–niedz. Zielony = tego dnia była nauka, czerwony = nie było.
 * Dni, które dopiero nadejdą, zostają szare — nie ma sensu karać się z góry.
 */
export function weekStrip(reviews, now = Date.now()) {
  const today = startOfDay(now);
  const dow = (new Date(today).getDay() + 6) % 7;      // 0 = poniedziałek
  const monday = today - dow * DAY;

  const counts = new Map();
  let firstEver = Infinity;
  for (const r of reviews) {
    const k = dayKey(r.ts);
    counts.set(k, (counts.get(k) || 0) + 1);
    if (r.ts < firstEver) firstEver = r.ts;
  }
  const firstDay = startOfDay(firstEver === Infinity ? now : firstEver);

  return DAY_LABELS.map((label, idx) => {
    const ts = monday + idx * DAY;
    const count = counts.get(dayKey(ts)) || 0;
    let state;
    if (count > 0) state = 'done';
    else if (idx > dow) state = 'future';
    else if (idx === dow) state = 'today';
    else if (ts < firstDay) state = 'future';   // wtedy jeszcze nie było czego powtarzać
    else state = 'missed';
    return { label, count, state, isToday: idx === dow };
  });
}

/** Podgląd następnego słowa — sama strona pytania, bez etykiet i bez znaczenia. */
function nextPreview(next) {
  if (!next) {
    return '<p class="next-empty">Nic nie czeka na powtórkę.</p>';
  }
  const card = next.card;
  return `
    <div class="next-word">${escapeHtml(card.english)}
      ${card.phonetic ? `<small>${escapeHtml(card.phonetic)}</small>` : ''}
    </div>`;
}

export function renderToday({ learned, learnedToday, week, streak, next, pending, upcoming }) {
  $('#today-date').textContent = new Date().toLocaleDateString('pl-PL',
    { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  /* baner z licznikiem */
  $('#learned-count').textContent = learned;
  $('#learned-label').textContent = learned === 0
    ? 'słów — zacznij od pierwszego'
    : `${plural(learned, 'słowo', 'słowa', 'słów')} już umiesz`;
  $('#learned-delta').textContent = learnedToday > 0
    ? `dziś ${learnedToday > 1 ? learnedToday + ' ' : ''}${plural(learnedToday, 'nowe słowo', 'nowe słowa', 'nowych słów')}`
    : (pending > 0 ? `${pending} ${plural(pending, 'słowo', 'słowa', 'słów')} w kolejce` : '');

  /* tydzień */
  $('#week-row').innerHTML = week.map(d => `
    <div class="day ${d.state}${d.isToday ? ' today' : ''}" title="${d.count} powtórek">
      <em>${d.label}</em><i></i>
    </div>`).join('');
  const doneDays = week.filter(d => d.state === 'done').length;
  $('#week-foot').textContent = streak > 1
    ? `${streak} ${plural(streak, 'dzień', 'dni', 'dni')} z rzędu · ${doneDays}/7 w tym tygodniu`
    : `${doneDays}/7 dni w tym tygodniu`;

  /* słowo na teraz */
  $('#next-title').textContent = next ? 'Słowo na teraz' : 'Na teraz nic';
  $('#next-preview').innerHTML = nextPreview(next);
  $('#start-label').textContent = next ? 'Nauka słowa' : 'Powtórz na zapas';
  $('#start-sub').textContent = next
    ? (pending > 1
        ? `w kolejce na dziś: ${pending} ${plural(pending, 'słowo', 'słowa', 'słów')}`
        : 'ostatnie słowo na dziś')
    : 'nic nie jest wymagalne';

  /* kolejka */
  const list = $('#next-due-list');
  list.innerHTML = upcoming.length
    ? upcoming.map(u => `<li><b>${escapeHtml(u.english)}</b><span>${escapeHtml(u.when)}</span></li>`).join('')
    : '<li class="empty">Brak zaplanowanych powtórek. Dodaj pierwsze słowo.</li>';

  const day = Math.floor(Date.now() / DAY) % TIPS.length;
  $('#tip-text').textContent = TIPS[day];
}

/** Najbliższe terminy powtórek. */
export function upcomingList(cards, limit = 5) {
  const now = Date.now();
  return cards
    .filter(c => c.srs.main.status !== 'new')
    .sort((a, b) => a.srs.main.due - b.srs.main.due)
    .slice(0, limit)
    .map(c => ({ english: c.english, when: formatDue(c.srs.main.due, now) }));
}

/* --------------------------------------------------------------- SŁOWNIK */

const FILTERS = [
  { id: 'all', label: 'Wszystkie' },
  { id: 'due', label: 'Do powtórki' },
  { id: 'new', label: 'Nowe' },
  { id: 'hard', label: 'Trudne' },
  { id: 'known', label: 'Opanowane' }
];

export function renderLibrary(cards, { query = '', filter = 'all', tags = [], activeTag = '' } = {}) {
  const now = Date.now();
  const q = query.trim().toLowerCase();

  const matches = cards.filter(c => {
    if (activeTag && !(c.tags || []).includes(activeTag)) return false;
    const haystack = [c.english, c.polishDefinition, ...(c.sentences || []).map(x => x.en),
      (c.tags || []).join(' ')].join(' ').toLowerCase();
    if (q && !haystack.includes(q)) return false;

    const r = c.srs.main;
    switch (filter) {
      case 'due': return r.status !== 'new' && r.due <= now;
      case 'new': return r.status === 'new';
      case 'hard': return r.lapses > 0 || r.D >= 7;
      case 'known': return r.status === 'review' && r.S >= 21;
      default: return true;
    }
  });

  $('#lib-count').textContent = `${cards.length} słów · ${matches.length} pasujących`;

  $('#lib-chips').innerHTML = [
    ...FILTERS.map(f => `<button class="chip ${f.id === filter && !activeTag ? 'active' : ''}" data-filter="${f.id}">${f.label}</button>`),
    ...tags.map(t => `<button class="chip ${t === activeTag ? 'active' : ''}" data-tag="${escapeHtml(t)}">#${escapeHtml(t)}</button>`)
  ].join('');

  const list = $('#word-list');
  if (!matches.length) {
    list.innerHTML = '<li class="empty" style="justify-content:center;color:var(--muted)">Nic tu nie ma</li>';
    return;
  }

  list.innerHTML = matches
    .sort((a, b) => a.srs.main.due - b.srs.main.due || b.updatedAt - a.updatedAt)
    .map(c => {
      const r = c.srs.main;
      let pill = '<span class="pill new">nowe</span>';
      if (r.status !== 'new') {
        pill = r.due <= now
          ? '<span class="pill due">teraz</span>'
          : `<span class="pill ${r.S >= 21 ? 'ok' : ''}">${formatDue(r.due, now)}</span>`;
      }
      return `<li data-id="${escapeHtml(c.id)}">
        <div class="word-main">
          <b>${escapeHtml(c.english)}</b>
          <small>${escapeHtml(c.polishDefinition)}</small>
        </div>${pill}</li>`;
    }).join('');
}

export function collectTags(cards) {
  const counts = new Map();
  for (const c of cards) for (const t of c.tags || []) counts.set(t, (counts.get(t) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 12).map(e => e[0]);
}

/* ------------------------------------------------------- SZCZEGÓŁY SŁOWA */

export function renderWordDetail(card) {
  const st = card.srs.main;
  const statusPl = { new: 'nowe', learning: 'w nauce', review: 'powtórki', relearning: 'ponownie' }[st.status];
  const sentences = card.sentences || [];

  return `
    <div class="sheet-handle"></div>
    <div class="detail-head">
      <div>
        <b>${escapeHtml(card.english)}</b>
        <small>${escapeHtml(card.polishDefinition)}${card.phonetic ? ' · ' + escapeHtml(card.phonetic) : ''}</small>
      </div>
      <button class="icon-btn" data-act="speak" aria-label="Przeczytaj">
        <svg viewBox="0 0 24 24"><path d="M11 5L6 9H3v6h3l5 4z"/><path d="M16 9a4 4 0 0 1 0 6"/><path d="M19 6a8 8 0 0 1 0 12"/></svg>
      </button>
    </div>

    ${sentences.length ? `<ol class="sentence-list">${sentences.map(x => `
      <li>
        <p class="s-en">${markInSentence(x.en, card.english, 'highlight')}</p>
        ${x.pl ? `<p class="s-pl">(${escapeHtml(x.pl)})</p>` : ''}
      </li>`).join('')}</ol>`
    : '<p class="next-empty">Brak zdań — dopisz je w edycji.</p>'}

    ${card.rules ? `<div class="note-box"><h4>Zasady użycia</h4>${escapeHtml(card.rules)}</div>` : ''}
    ${card.collocations?.length ? `<div class="note-box"><h4>Kolokacje</h4><div class="colloc">${
      card.collocations.map(c => `<span>${escapeHtml(c)}</span>`).join('')}</div></div>` : ''}
    ${card.mnemonic ? `<div class="note-box"><h4>Skojarzenie</h4>${escapeHtml(card.mnemonic)}</div>` : ''}
    ${card.note ? `<div class="note-box"><h4>Notatka</h4>${escapeHtml(card.note)}</div>` : ''}
    ${card.tags?.length ? `<div class="colloc">${card.tags.map(t => `<span>#${escapeHtml(t)}</span>`).join('')}</div>` : ''}

    <div class="srs-box">
      <h4>Stan pamięci</h4>
      <div><span>Status</span><b>${statusPl}</b></div>
      <div><span>Trwałość śladu</span><b>${st.status === 'new' ? '—' : formatInterval(st.S * DAY)}</b></div>
      <div><span>Trudność</span><b>${st.status === 'new' ? '—' : st.D.toFixed(1) + '/10'}</b></div>
      <div><span>Pamięć teraz</span><b>${st.status === 'new' ? '—' : Math.round(currentRetrievability(st) * 100) + '%'}</b></div>
      <div><span>Powtórki</span><b>${st.reps}${st.lapses ? ` (${st.lapses} wpadek)` : ''}</b></div>
      <div><span>Następna</span><b>${st.status === 'new' ? '—' : formatDue(st.due)}</b></div>
    </div>

    <div class="detail-actions">
      <button class="btn ghost" data-act="edit">Edytuj</button>
      <button class="btn ghost" data-act="reset">Ucz od nowa</button>
      <button class="btn ghost" data-act="delete" style="color:var(--bad)">Usuń</button>
    </div>
    <button class="btn primary" data-act="close">Zamknij</button>`;
}

/* -------------------------------------------------------------- POSTĘPY */

export function renderStats(cards, reviews) {
  const now = Date.now();
  const states = cards.map(c => c.srs.main);
  const seen = states.filter(s => s.status !== 'new');
  const mastered = states.filter(s => s.status === 'review' && s.S >= 21).length;

  const last30 = reviews.filter(r => r.ts > now - 30 * DAY && !r.repeat);
  const acc = last30.length
    ? Math.round((last30.filter(r => r.rating > 1).length / last30.length) * 100) : 0;
  const avgR = seen.length
    ? Math.round(seen.reduce((a, s) => a + currentRetrievability(s, now), 0) / seen.length * 100) : 0;

  $('#stats-grid').innerHTML = `
    <div class="stat-tile"><b>${cards.length}</b><span>słów w bazie</span></div>
    <div class="stat-tile"><b>${mastered}</b><span>opanowanych (&gt;21 dni)</span></div>
    <div class="stat-tile"><b>${acc}%</b><span>trafień w 30 dni</span></div>
    <div class="stat-tile"><b>${avgR}%</b><span>średnia siła pamięci</span></div>`;

  // historia 14 dni
  const hist = new Map();
  for (let i = 13; i >= 0; i--) hist.set(dayKey(now - i * DAY), 0);
  for (const r of reviews) {
    const k = dayKey(r.ts);
    if (hist.has(k)) hist.set(k, hist.get(k) + 1);
  }
  $('#bars-history').innerHTML = bars([...hist.entries()].map(([k, v]) => ({
    label: k.slice(8), value: v
  })));

  // prognoza 14 dni
  const fc = new Array(14).fill(0);
  const today = startOfDay(now);
  for (const s of states) {
    if (s.status === 'new') continue;
    const idx = Math.floor((s.due - today) / DAY);
    if (idx >= 0 && idx < 14) fc[idx]++;
    else if (idx < 0) fc[0]++;
  }
  $('#bars-forecast').innerHTML = bars(fc.map((v, i) => ({
    label: i === 0 ? 'dziś' : String(new Date(today + i * DAY).getDate()), value: v
  })), 'forecast');

  // najtrudniejsze
  // „trudne” = były wpadki albo algorytm podniósł trudność powyżej średniej
  const hard = cards
    .map(c => ({ c, lapses: c.srs.main.lapses, score: c.srs.main.lapses * 2 + c.srs.main.D / 10 }))
    .filter(x => x.lapses > 0 || x.c.srs.main.D >= 7)
    .sort((a, b) => b.score - a.score)
    .slice(0, 6);
  $('#hard-list').innerHTML = hard.length
    ? hard.map(({ c, lapses }) => `<li><b>${escapeHtml(c.english)}</b><span>${
        lapses} wpadek · trudność ${c.srs.main.D.toFixed(1)}/10</span></li>`).join('')
    : '<li class="empty">Na razie nic Ci nie sprawia kłopotu.</li>';
}

function bars(data, cls = '') {
  const max = Math.max(1, ...data.map(d => d.value));
  return data.map(d => `
    <div class="bar ${cls}">
      <i style="height:${Math.round((d.value / max) * 100)}%" title="${d.value}"></i>
      <em>${escapeHtml(d.label)}</em>
    </div>`).join('');
}
