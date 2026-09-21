/* ===========================================================================
   Spinacz całości: routing zakładek, formularz, ustawienia, synchronizacja.
   =========================================================================== */

import { $, $$, toast, download, speak, normalizeId, startOfDay, escapeHtml, sentenceContains } from './util.js';
import { allCards, getCard, putCard, putMany, removeCard, makeCard, getSettings, saveSettings,
         getStreak, allReviews, reviewsSince } from './db.js';
import { newState, currentRetrievability } from './fsrs.js';
import { Session, buildQueue, introducedToday } from './session.js';
import { renderToday, weekStrip, upcomingList, renderLibrary, collectTags, renderWordDetail, renderStats } from './views.js';
import { sync, pushCardQuietly, lastSync } from './sync.js';
import { seedToCards } from './seed.js';
import { attachDrag, passed } from './gestures.js';

const state = {
  cards: [],
  settings: null,
  tab: 'today',
  lib: { query: '', filter: 'all', activeTag: '' },
  openCardId: null
};

let session;

/* ------------------------------------------------------------ odświeżanie */

async function loadCards() {
  state.cards = await allCards();
}

async function refresh() {
  await loadCards();
  if (state.tab === 'today') await paintToday();
  if (state.tab === 'library') paintLibrary();
  if (state.tab === 'stats') paintStats();
}

async function paintToday() {
  const now = Date.now();
  const s = state.settings;

  const introduced = await introducedToday();
  const newBudget = Math.max(0, s.newPerDay - introduced);
  const queue = buildQueue(state.cards, s, { now, newBudget });
  const reviews = await allReviews();
  const since = startOfDay();

  renderToday({
    learned: countLearned(),
    learnedToday: reviews.filter(r => r.ts >= since && r.isNew).length,
    week: weekStrip(reviews, now),
    streak: (await getStreak()).count,
    next: queue[0] || null,
    pending: queue.length,
    upcoming: upcomingList(state.cards)
  });
}

/** Ile słów faktycznie weszło do nauki (licznik na banerze). */
function countLearned() {
  return state.cards.filter(c => c.srs.main.status !== 'new').length;
}

function paintLibrary() {
  renderLibrary(state.cards, { ...state.lib, tags: collectTags(state.cards) });
}

async function paintStats() {
  renderStats(state.cards, await allReviews());
}

/* ----------------------------------------------------------------- tabbar */

function showTab(tab) {
  state.tab = tab;
  $$('.view').forEach(v => { v.hidden = v.dataset.view !== tab; });
  $$('#tabbar button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  if (tab === 'today') paintToday();
  if (tab === 'library') paintLibrary();
  if (tab === 'stats') paintStats();
}

/* ---------------------------------------------------------------- sesja */

async function startSession() {
  const introduced = await introducedToday();
  const newBudget = Math.max(0, state.settings.newPerDay - introduced);
  session.settings = state.settings;
  let queue = buildQueue(state.cards, state.settings, { newBudget });
  let practice = false;

  if (!queue.length) {
    // nic nie jest wymagalne — ćwiczenie na zapas: najsłabsze ślady pamięciowe
    practice = true;
    const now = Date.now();
    queue = state.cards
      .filter(c => c.srs.main.status !== 'new')
      .map(c => ({ card: c, r: currentRetrievability(c.srs.main, now) }))
      .sort((a, b) => a.r - b.r)
      .slice(0, 10)
      .map(({ card }) => ({ card }));
  }
  if (!queue.length) { toast('Najpierw dodaj słowa albo wgraj pakiet B2'); return; }

  // nauka w przerwie w pracy: jedna sesja = jedno słowo
  if (state.settings.oneWordPerSession) queue = queue.slice(0, 1);

  session.start(queue, { practice });
}

/** Po sesji: ile to już słów i czy zostało coś jeszcze na teraz. */
async function updateDoneScreen(res) {
  const introduced = await introducedToday();
  const newBudget = Math.max(0, state.settings.newPerDay - introduced);
  const remaining = buildQueue(state.cards, state.settings, { newBudget }).length;

  if (!res.practice) {
    const learned = countLearned();
    const rest = remaining
      ? `Na dziś czeka jeszcze ${remaining} — ale możesz wrócić za godzinę.`
      : 'Na dziś to wszystko. Wróć jutro.';
    if (res.introducedNew) {
      $('#done-title').textContent = 'Nowe słowo zaliczone';
      $('#done-summary').textContent = `To Twoje ${learned}. słowo. ${rest}`;
    } else if (res.introducedProduce) {
      $('#done-title').textContent = 'Pierwszy raz po angielsku';
      $('#done-summary').textContent = `Znasz to słowo już w obie strony. ${rest}`;
    } else {
      $('#done-title').textContent = 'Powtórzone';
      $('#done-summary').textContent = rest;
    }
  }
  $('#btn-next-word').hidden = remaining === 0;
}

/* ------------------------------------------------------------- formularz */

const SENTENCE_ROWS = 5;

function sentenceRow(i, en = '', pl = '') {
  return `<div class="sentence-row">
    <span class="num">${i + 1}</span>
    <textarea rows="2" class="s-en-input" placeholder="${i === 0 ? 'Zdanie po angielsku' : 'kolejne zdanie'}">${escapeHtml(en)}</textarea>
    <input class="s-pl-input" placeholder="tłumaczenie po polsku" value="${escapeHtml(pl)}">
  </div>`;
}

function renderSentenceRows(list = []) {
  const rows = Math.max(SENTENCE_ROWS, list.length);
  $('#sentence-list').innerHTML = Array.from({ length: rows }, (_, i) =>
    sentenceRow(i, list[i]?.en || '', list[i]?.pl || '')).join('');
}

function readSentences() {
  return $$('#sentence-list .sentence-row')
    .map(row => ({
      en: row.querySelector('.s-en-input').value.trim(),
      pl: row.querySelector('.s-pl-input').value.trim()
    }))
    .filter(x => x.en);
}

function fillForm(card) {
  $('#f-id').value = card?.id || '';
  $('#f-english').value = card?.english || '';
  $('#f-pos').value = card?.pos || '';
  $('#f-phonetic').value = card?.phonetic || '';
  $('#f-polish').value = card?.polishDefinition || '';
  renderSentenceRows(card?.sentences || []);
  $('#f-colloc').value = (card?.collocations || []).join(', ');
  $('#f-rules').value = card?.rules || '';
  $('#f-mnemonic').value = card?.mnemonic || '';
  $('#f-note').value = card?.note || '';
  $('#f-tags').value = (card?.tags || []).join(', ');
  $('#btn-add-cancel').hidden = !card;
}

const splitList = v => v.split(',').map(x => x.trim()).filter(Boolean);

async function submitForm(e) {
  e.preventDefault();
  const english = $('#f-english').value.trim();
  const sentences = readSentences();
  const hint = $('#hint-sentence');
  const fail = msg => {
    hint.textContent = msg;
    hint.classList.add('err');
    $('#sentence-list').scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  if (!sentences.length) return fail('Dodaj przynajmniej jedno zdanie z tym słowem.');
  const bad = sentences.findIndex(x => !sentenceContains(x.en, english));
  if (bad >= 0) return fail(`Zdanie ${bad + 1} nie zawiera „${english}” — popraw je albo usuń.`);

  hint.classList.remove('err');
  hint.textContent = 'Każde zdanie musi zawierać to słowo.';

  const editingId = $('#f-id').value;
  const existing = editingId ? await getCard(editingId) : await getCard(normalizeId(english));

  const data = {
    english,
    polishDefinition: $('#f-polish').value.trim(),
    pos: $('#f-pos').value,
    phonetic: $('#f-phonetic').value.trim(),
    sentences,
    collocations: splitList($('#f-colloc').value),
    rules: $('#f-rules').value.trim(),
    mnemonic: $('#f-mnemonic').value.trim(),
    note: $('#f-note').value.trim(),
    tags: splitList($('#f-tags').value)
  };

  const card = existing
    ? makeCard({ ...existing, ...data, id: existing.id, srs: existing.srs, createdAt: existing.createdAt, deleted: false })
    : makeCard(data);

  await putCard(card);
  $('#form-add').reset();
  fillForm(null);
  toast(existing ? 'Zaktualizowano' : 'Dodano słowo');
  if (state.settings.autoSync) pushCardQuietly(card.id);
  await refresh();
  showTab('library');
}

/* -------------------------------------------------------- szczegóły słowa */

async function openWord(id) {
  const card = await getCard(id);
  if (!card) return;
  state.openCardId = id;
  $('#word-detail').innerHTML = renderWordDetail(card);
  $('#sheet-word').hidden = false;
}

function closeWord() {
  $('#sheet-word').hidden = true;
  state.openCardId = null;
}

async function wordAction(act) {
  const card = await getCard(state.openCardId);
  if (!card) return;
  if (act === 'speak') return speak(card.english, true);
  if (act === 'close') return closeWord();
  if (act === 'edit') {
    closeWord();
    fillForm(card);
    showTab('add');
    $('#f-english').focus();
    return;
  }
  if (act === 'reset') {
    card.srs = { main: newState() };
    await putCard(card);
    closeWord(); await refresh();
    toast('Słowo wraca do nauki od zera');
    return;
  }
  if (act === 'delete') {
    if (!confirm(`Usunąć „${card.english}”?`)) return;
    await removeCard(card.id);
    closeWord(); await refresh();
    toast('Usunięto');
  }
}

/* --------------------------------------------------------------- arkusze */

/**
 * Arkusz z dołu ekranu da się zamknąć na trzy sposoby: krzyżykiem w nagłówku,
 * tapnięciem w przyciemnione tło albo ściągając nagłówek palcem w dół.
 */
function setupSheet(sheet, close) {
  const panel = sheet.querySelector('.sheet-panel');

  sheet.addEventListener('click', e => {
    if (e.target === sheet || e.target.closest('[data-close-sheet]')) close();
  });

  attachDrag(panel, {
    axis: 'y',
    shouldStart: e => !!e.target.closest('.sheet-head') && !e.target.closest('button'),
    onMove: dy => {
      panel.style.transition = 'none';
      panel.style.transform = `translateY(${Math.max(0, dy)}px)`;
    },
    onEnd: (dy, v) => {
      if (dy > 0 && passed(dy, v, panel.offsetHeight, 0.25)) {
        panel.style.transition = 'transform .2s ease-in';
        panel.style.transform = 'translateY(100%)';
        setTimeout(() => {
          close();
          panel.style.transition = '';
          panel.style.transform = '';
        }, 200);
        return;
      }
      panel.style.transition = 'transform .25s cubic-bezier(.2,.8,.2,1)';
      panel.style.transform = '';
    }
  });
}

/* ------------------------------------------------------------ ustawienia */

function fillSettings() {
  const s = state.settings;
  $('#s-new').value = s.newPerDay;
  $('#s-max').value = s.maxSession;
  $('#s-retention').value = String(s.retention);
  $('#s-one').checked = s.oneWordPerSession;
  $('#s-tts').checked = s.tts;
  $('#s-autosync').checked = s.autoSync;
  lastSync().then(ts => {
    $('#sync-status').textContent = ts
      ? `Ostatnia synchronizacja: ${new Date(ts).toLocaleString('pl-PL')}`
      : 'Jeszcze nie synchronizowano';
  });
}

async function onSettingChange() {
  state.settings = await saveSettings({
    newPerDay: Math.max(0, Number($('#s-new').value) || 0),
    maxSession: Math.max(5, Number($('#s-max').value) || 40),
    retention: Number($('#s-retention').value),
    oneWordPerSession: $('#s-one').checked,
    tts: $('#s-tts').checked,
    autoSync: $('#s-autosync').checked
  });
  await refresh();
}

/* --------------------------------------------------------- synchronizacja */

let syncing = false;
async function doSync(silent = false) {
  if (syncing) return;
  if (!navigator.onLine) { if (!silent) toast('Brak internetu — dane czekają lokalnie'); return; }
  syncing = true;
  const status = m => { $('#sync-status').textContent = m; if (!silent) toast(m, 1200); };
  try {
    const r = await sync(status);
    const msg = `Zsynchronizowano: +${r.added} nowych, ${r.updated} zaktualizowanych, ${r.pushed} wysłanych${r.failed ? `, ${r.failed} błędów` : ''}`;
    $('#sync-status').textContent = msg;
    if (!silent) toast(msg, 3000);
    await refresh();
  } catch (err) {
    const msg = `Synchronizacja nieudana: ${err.message}`;
    $('#sync-status').textContent = msg;
    if (!silent) toast(msg, 3000);
  } finally {
    syncing = false;
  }
}

/* ------------------------------------------------------- import / eksport */

async function exportJson() {
  const data = {
    exportedAt: new Date().toISOString(),
    cards: await allCards({ includeDeleted: true }),
    reviews: await allReviews(),
    settings: state.settings
  };
  download(`slowka-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(data, null, 2));
  toast('Zapisano kopię');
}

/**
 * Import przyjmuje trzy kształty pliku:
 *   1. eksport aplikacji:  { cards: [...], reviews: [...] }
 *   2. gołą tablicę kart w formacie aplikacji
 *   3. paczkę w formacie encji Azure: [{ english, polishDefinition, payload }]
 *      — gdzie `payload` jest tekstem z JSON-em (może zawierać samo `example`).
 */
function rowsFromFile(data) {
  const rows = Array.isArray(data)
    ? data
    : (data.cards || data.words || data.value || []);

  return rows.map(row => {
    let extra = {};
    if (typeof row.payload === 'string') {
      try { extra = JSON.parse(row.payload); } catch { /* nieczytelny payload */ }
    } else if (row.payload && typeof row.payload === 'object') {
      extra = row.payload;
    }
    const hadTimestamp = Number(row.updatedAt) > 0;
    return { card: makeCard({ ...extra, ...row, dirty: true }), hadTimestamp };
  }).filter(x => x.card.english);
}

async function importJson(file) {
  try {
    const incoming = rowsFromFile(JSON.parse(await file.text()));
    if (!incoming.length) {
      toast('W pliku nie ma słów w rozpoznawalnym formacie', 3500);
      return;
    }

    const mine = new Map((await allCards({ includeDeleted: true })).map(c => [c.id, c]));
    const toSave = [];
    let skipped = 0;

    for (const { card, hadTimestamp } of incoming) {
      const old = mine.get(card.id);
      if (!old) { toSave.push(card); continue; }
      // Istniejącą kartę nadpisujemy tylko wtedy, gdy plik niesie własny,
      // nowszy znacznik czasu. Inaczej paczka z jednym zdaniem skasowałaby
      // pięć zdań, zasady i postęp nauki.
      if (hadTimestamp && card.updatedAt > (old.updatedAt || 0)) toSave.push(card);
      else skipped++;
    }

    if (toSave.length) await putMany(toSave);
    await refresh();
    toast(skipped
      ? `Dodano ${toSave.length}, pominięto ${skipped} (już je masz)`
      : `Zaimportowano ${toSave.length} kart`, 3500);
    if (toSave.length && state.settings.autoSync) doSync(true);
  } catch (err) {
    toast(`Nie udało się wczytać pliku: ${err.message}`, 3500);
  }
}

async function loadSeed() {
  const existing = new Set((await allCards({ includeDeleted: true })).map(c => c.id));
  const fresh = seedToCards(makeCard).filter(c => !existing.has(c.id));
  if (!fresh.length) { toast('Pakiet B2 jest już wgrany'); return; }
  await putMany(fresh);
  await refresh();
  toast(`Dodano ${fresh.length} słów`);
  if (state.settings.autoSync) doSync(true);
}

/* ------------------------------------------------------------------ start */

async function init() {
  state.settings = await getSettings();
  session = new Session(state.settings, async res => {
    state.settings = await getSettings();
    await refresh();
    if (res.aborted) return;
    await updateDoneScreen(res);
    if (state.settings.autoSync) doSync(true);
  });

  // zakładki
  $('#tabbar').addEventListener('click', e => {
    const b = e.target.closest('[data-tab]');
    if (b) showTab(b.dataset.tab);
  });

  // dziś
  $('#btn-start').addEventListener('click', startSession);
  $('#btn-close-session').addEventListener('click', () => session.close());
  $('#btn-done').addEventListener('click', () => session.close());
  $('#btn-next-word').addEventListener('click', () => startSession());

  // formularz
  $('#form-add').addEventListener('submit', submitForm);
  $('#btn-add-cancel').addEventListener('click', () => { $('#form-add').reset(); fillForm(null); });
  $('#btn-add-sentence').addEventListener('click', () => {
    const list = readSentences();
    renderSentenceRows([...list, { en: '', pl: '' }]);
  });
  fillForm(null);

  // słownik
  $('#lib-search').addEventListener('input', e => { state.lib.query = e.target.value; paintLibrary(); });
  $('#lib-chips').addEventListener('click', e => {
    const f = e.target.closest('[data-filter]');
    const t = e.target.closest('[data-tag]');
    if (f) { state.lib.filter = f.dataset.filter; state.lib.activeTag = ''; }
    if (t) { state.lib.activeTag = state.lib.activeTag === t.dataset.tag ? '' : t.dataset.tag; }
    paintLibrary();
  });
  $('#word-list').addEventListener('click', e => {
    const li = e.target.closest('[data-id]');
    if (li) openWord(li.dataset.id);
  });
  $('#btn-sync').addEventListener('click', () => doSync());

  // arkusz słowa
  const closeSettings = () => { $('#sheet-settings').hidden = true; };
  setupSheet($('#sheet-word'), closeWord);
  $('#sheet-word').addEventListener('click', e => {
    const a = e.target.closest('[data-act]');
    if (a) wordAction(a.dataset.act);
  });

  // ustawienia
  setupSheet($('#sheet-settings'), closeSettings);
  $('#btn-settings').addEventListener('click', () => { fillSettings(); $('#sheet-settings').hidden = false; });
  $('#btn-close-settings').addEventListener('click', closeSettings);

  // Escape na komputerze zamyka to, co leży na wierzchu
  document.addEventListener('keydown', e => {
    if (e.key !== 'Escape') return;
    if (!$('#sheet-word').hidden) return closeWord();
    if (!$('#sheet-settings').hidden) return closeSettings();
    if (!$('#session').hidden) session.close();
  });
  $$('#sheet-settings input, #sheet-settings select').forEach(el =>
    el.addEventListener('change', onSettingChange));
  $('#btn-export').addEventListener('click', exportJson);
  $('#btn-import').addEventListener('click', () => $('#file-import').click());
  $('#file-import').addEventListener('change', e => e.target.files[0] && importJson(e.target.files[0]));
  $('#btn-seed').addEventListener('click', loadSeed);
  $('#btn-sync2').addEventListener('click', () => doSync());

  window.addEventListener('online', () => { if (state.settings.autoSync) doSync(true); });

  await refresh();

  // pierwsze uruchomienie — zaproponuj pakiet startowy
  if (!state.cards.length) {
    const remote = state.settings.autoSync ? doSync(true) : null;
    await remote;
    await loadCards();
    if (!state.cards.length) toast('Pusto. Wgraj pakiet B2 w Ustawieniach albo dodaj własne słowo.', 4000);
  }

  // Service worker tylko na docelowym hostingu. Na localhost przeszkadza:
  // po każdej zmianie kodu serwowałby starą wersję z cache.
  const local = ['localhost', '127.0.0.1'].includes(location.hostname);
  if ('serviceWorker' in navigator && !local) {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  } else if (local && 'serviceWorker' in navigator) {
    navigator.serviceWorker.getRegistrations().then(rs => rs.forEach(r => r.unregister()));
  }
}

init();
