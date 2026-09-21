/* ===========================================================================
   IndexedDB — lokalne źródło prawdy. Chmura Azure jest tylko kopią/backupem,
   więc aplikacja działa w 100% offline (samolot, metro, brak zasięgu).

   Magazyny:
     cards   – słowa wraz ze stanem SRS dla obu kierunków
     reviews – log każdej odpowiedzi (podstawa statystyk i ewentualnej
               późniejszej optymalizacji wag FSRS)
     meta    – ustawienia, streak, znacznik ostatniej synchronizacji
   =========================================================================== */

import { DB_NAME, DB_VERSION, DEFAULTS } from './config.js';
import { newState } from './fsrs.js';
import { normalizeId, dayKey } from './util.js';

let dbPromise = null;

export function db() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const idb = req.result;
      const upgradeTx = req.transaction;
      if (!idb.objectStoreNames.contains('cards')) {
        const s = idb.createObjectStore('cards', { keyPath: 'id' });
        s.createIndex('updatedAt', 'updatedAt');
        s.createIndex('english', 'english');
      }
      if (!idb.objectStoreNames.contains('reviews')) {
        const r = idb.createObjectStore('reviews', { keyPath: 'id', autoIncrement: true });
        r.createIndex('ts', 'ts');
        r.createIndex('cardId', 'cardId');
      }
      if (!idb.objectStoreNames.contains('meta')) {
        idb.createObjectStore('meta', { keyPath: 'k' });
      }
      // migracja do wersji 2: jedno zdanie -> lista zdań, dwa stany SRS -> jeden
      if (e.oldVersion > 0 && e.oldVersion < 2) {
        const store = upgradeTx.objectStore('cards');
        store.openCursor().onsuccess = ev => {
          const cur = ev.target.result;
          if (!cur) return;
          cur.update(migrateCard(cur.value));
          cur.continue();
        };
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(store, mode = 'readonly') {
  return db().then(idb => idb.transaction(store, mode).objectStore(store));
}

const wrap = req => new Promise((res, rej) => {
  req.onsuccess = () => res(req.result);
  req.onerror = () => rej(req.error);
});

/* ---------- karty ---------- */

/** Migracja karty ze starego formatu (jedno zdanie, dwa kierunki SRS). */
export function migrateCard(c) {
  if (!Array.isArray(c.sentences)) {
    c.sentences = c.sentence ? [{ en: c.sentence, pl: c.sentencePl || '' }] : [];
  }
  delete c.sentence;
  delete c.sentencePl;
  if (c.rules === undefined) c.rules = '';
  if (!c.srs || !c.srs.main) {
    const r = (c.srs && c.srs.recall) || newState();
    const p = c.srs && c.srs.produce;
    // zostaje mocniejszy z dwóch dawnych kierunków
    c.srs = { main: p && p.reps > r.reps ? p : r };
  }
  return c;
}

/**
 * Pusty, kompletny obiekt karty.
 * Zdania trzymamy jako listę {en, pl} — ekran nauki pokazuje ich do pięciu.
 */
export function makeCard(data = {}) {
  const now = Date.now();
  // Zdania przyjmujemy w trzech formatach: własnym (sentences), starym
  // (sentence + sentencePl) i takim, jaki bywa w paczkach z zewnątrz (example).
  let sentences = [];
  if (Array.isArray(data.sentences)) {
    sentences = data.sentences
      .filter(x => x && (x.en || typeof x === 'string'))
      .map(x => typeof x === 'string'
        ? { en: x.trim(), pl: '' }
        : { en: String(x.en).trim(), pl: (x.pl || '').trim() });
  } else if (data.sentence) {
    sentences = [{ en: String(data.sentence).trim(), pl: (data.sentencePl || '').trim() }];
  } else if (data.example) {
    sentences = [{ en: String(data.example).trim(), pl: (data.examplePl || '').trim() }];
  }

  return {
    id: data.id || normalizeId(data.english || ''),
    english: (data.english || '').trim(),
    polishDefinition: (data.polishDefinition || '').trim(),
    pos: data.pos || '',
    phonetic: data.phonetic || '',
    sentences,
    collocations: data.collocations || [],
    rules: data.rules || '',
    mnemonic: data.mnemonic || '',
    note: data.note || '',
    tags: data.tags || [],
    level: data.level || 'B2',
    // objaśnienie z czatu AI (definicja, po co, kiedy, cytat/scena) — generowane raz
    insight: data.insight || null,
    srs: data.srs && data.srs.main ? data.srs : { main: (data.srs && data.srs.recall) || newState() },
    createdAt: data.createdAt || now,
    updatedAt: data.updatedAt || now,
    dirty: data.dirty !== false,
    deleted: !!data.deleted
  };
}

export async function allCards({ includeDeleted = false } = {}) {
  const store = await tx('cards');
  const rows = await wrap(store.getAll());
  return includeDeleted ? rows : rows.filter(c => !c.deleted);
}

export async function getCard(id) {
  const store = await tx('cards');
  return wrap(store.get(id));
}

export async function putCard(card, { touch = true } = {}) {
  if (touch) { card.updatedAt = Date.now(); card.dirty = true; }
  const store = await tx('cards', 'readwrite');
  await wrap(store.put(card));
  return card;
}

export async function putMany(cards, { touch = false } = {}) {
  const idb = await db();
  const t = idb.transaction('cards', 'readwrite');
  const store = t.objectStore('cards');
  for (const c of cards) {
    if (touch) { c.updatedAt = Date.now(); c.dirty = true; }
    store.put(c);
  }
  return new Promise((res, rej) => {
    t.oncomplete = () => res(cards.length);
    t.onerror = () => rej(t.error);
  });
}

/** Miękkie usunięcie — zostaje nagrobek, żeby synchronizacja nie wskrzesiła słowa. */
export async function removeCard(id) {
  const card = await getCard(id);
  if (!card) return;
  card.deleted = true;
  card.updatedAt = Date.now();
  card.dirty = true;
  return putCard(card, { touch: false });
}

/* ---------- log powtórek ---------- */

export async function logReview(entry) {
  const store = await tx('reviews', 'readwrite');
  return wrap(store.add({ ts: Date.now(), ...entry }));
}

/** Poprawka wpisu — gdy na stronie 1 zmienisz zdanie co do oceny. */
export async function updateReview(id, patch) {
  const store = await tx('reviews', 'readwrite');
  const row = await wrap(store.get(id));
  if (!row) return;
  return wrap(store.put({ ...row, ...patch, id }));
}

export async function reviewsSince(ts) {
  const store = await tx('reviews');
  const idx = store.index('ts');
  return wrap(idx.getAll(IDBKeyRange.lowerBound(ts)));
}

export async function allReviews() {
  const store = await tx('reviews');
  return wrap(store.getAll());
}

/* ---------- meta / ustawienia ---------- */

export async function getMeta(k, fallback = null) {
  const store = await tx('meta');
  const row = await wrap(store.get(k));
  return row ? row.v : fallback;
}

export async function setMeta(k, v) {
  const store = await tx('meta', 'readwrite');
  return wrap(store.put({ k, v }));
}

export async function getSettings() {
  return { ...DEFAULTS, ...(await getMeta('settings', {})) };
}

export async function saveSettings(patch) {
  const next = { ...(await getSettings()), ...patch };
  await setMeta('settings', next);
  return next;
}

/* ---------- seria dni (streak) ---------- */

export async function bumpStreak() {
  const today = dayKey();
  const s = await getMeta('streak', { last: null, count: 0, days: {} });
  if (s.last === today) {
    s.days[today] = (s.days[today] || 0) + 1;
  } else {
    const yesterday = dayKey(Date.now() - 86_400_000);
    s.count = s.last === yesterday ? s.count + 1 : 1;
    s.last = today;
    s.days[today] = 1;
  }
  await setMeta('streak', s);
  return s;
}

export async function getStreak() {
  const s = await getMeta('streak', { last: null, count: 0, days: {} });
  const today = dayKey();
  const yesterday = dayKey(Date.now() - 86_400_000);
  // seria wygasa, jeśli ostatni dzień nauki to nie dziś ani wczoraj
  if (s.last !== today && s.last !== yesterday) return { ...s, count: 0 };
  return s;
}
