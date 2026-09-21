/* ===========================================================================
   Synchronizacja z Azure Functions + Table Storage.

   Kontrakt z istniejącym backendem zostaje zachowany:
     POST { english, polishDefinition }            <- to backend rozumie dziś
   Dokładamy dwa pola opcjonalne:
     payload   – cała karta (zdanie, notatki, stan SRS) jako JSON string
     updatedAt – znacznik czasu do rozstrzygania konfliktów

   Table Storage jest bezschematowy, więc dodatkowe właściwości po prostu się
   zapiszą, o ile funkcja je przepisze (patrz backend/index.js). Gdyby backend
   je pominął, aplikacja nadal działa: w chmurze zostaje para słowo–znaczenie,
   a pełne dane żyją lokalnie w IndexedDB.
   =========================================================================== */

import { AZURE_API_URL } from './config.js';
import { allCards, putMany, getCard, setMeta, getMeta, makeCard } from './db.js';
import { normalizeId } from './util.js';

const CONCURRENCY = 4;
const TIMEOUT_MS = 25_000;

/**
 * Azure Functions w planie Consumption zasypia — pierwsze żądanie po przerwie
 * potrafi trwać kilkanaście sekund albo zerwać połączenie. Stąd timeout
 * i jedna ponowna próba, zanim uznamy synchronizację za nieudaną.
 */
async function request(options, attempt = 0) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(AZURE_API_URL, { ...options, signal: ctrl.signal });
  } catch (err) {
    if (attempt < 1) {
      await new Promise(r => setTimeout(r, 1500));   // daj funkcji wstać
      return request(options, attempt + 1);
    }
    if (err.name === 'AbortError') throw new Error('Azure nie odpowiedział w 25 s (zimny start?)');
    throw new Error(navigator.onLine
      ? `przeglądarka zablokowała żądanie — dodaj ${location.origin} do listy CORS w Portalu Azure`
      : 'brak połączenia z internetem');
  } finally {
    clearTimeout(timer);
  }
}

function toPayload(card) {
  const { id, english, polishDefinition, pos, phonetic, sentences, collocations,
    rules, mnemonic, note, tags, level, insight, srs, createdAt, updatedAt, deleted } = card;
  return {
    english,
    polishDefinition,
    updatedAt,
    payload: JSON.stringify({
      id, pos, phonetic, sentences, collocations, rules,
      mnemonic, note, tags, level, insight, srs, createdAt, deleted
    })
  };
}

/** Encja z Table Storage -> karta aplikacji (albo null, jeśli śmieć). */
function fromEntity(e) {
  const english = e.english || e.English || e.word || '';
  if (!english) return null;
  const base = {
    english,
    polishDefinition: e.polishDefinition || e.polish || '',
    updatedAt: Number(e.updatedAt) || Date.parse(e.timestamp || e.Timestamp || 0) || 0
  };
  if (e.payload) {
    try {
      const p = typeof e.payload === 'string' ? JSON.parse(e.payload) : e.payload;
      return { full: true, card: makeCard({ ...p, ...base, id: p.id || normalizeId(english), dirty: false }) };
    } catch { /* uszkodzony payload — traktuj jak wpis minimalny */ }
  }
  return {
    full: false,
    card: makeCard({ ...base, id: e.rowKey || e.RowKey || normalizeId(english), dirty: false })
  };
}

async function pull() {
  const res = await request({ method: 'GET' });
  if (!res.ok) throw new Error(`GET ${res.status}`);
  const data = await res.json();
  const rows = Array.isArray(data) ? data : (data.value || data.words || []);
  return rows.map(fromEntity).filter(Boolean);
}

async function pushOne(card) {
  const res = await request({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(toPayload(card))
  });
  if (!res.ok) throw new Error(`POST ${res.status} (${card.english})`);
  return true;
}

async function pushAll(cards, onProgress) {
  const ok = [];
  let failed = 0;
  const queue = [...cards];
  const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
    while (queue.length) {
      const card = queue.shift();
      try { await pushOne(card); ok.push(card); }
      catch { failed++; }
      onProgress?.(ok.length + failed, cards.length);
    }
  });
  await Promise.all(workers);
  return { ok, done: ok.length, failed };
}

/**
 * Pełna synchronizacja dwukierunkowa.
 * Reguła rozstrzygania: wygrywa nowsze `updatedAt`; wpis minimalny z chmury
 * nigdy nie nadpisuje bogatszej karty lokalnej.
 */
export async function sync(onStatus = () => {}) {
  if (!navigator.onLine) throw new Error('offline');

  onStatus('Pobieram z chmury…');
  const remote = await pull();
  const local = await allCards({ includeDeleted: true });
  const byId = new Map(local.map(c => [c.id, c]));

  const toSave = [];
  let added = 0, updated = 0;

  for (const { full, card } of remote) {
    const mine = byId.get(card.id);
    if (!mine) {
      if (!card.sentences.length) card.tags = [...new Set([...(card.tags || []), 'bez-zdania'])];
      toSave.push(card); added++;
      continue;
    }
    if (mine.deleted) continue;                       // nagrobek ma pierwszeństwo
    if (!full) continue;                              // nie psuj pełnej karty wpisem szczątkowym
    if (card.updatedAt > (mine.updatedAt || 0)) {
      toSave.push({ ...mine, ...card, dirty: false }); updated++;
    }
  }
  if (toSave.length) await putMany(toSave);

  const fresh = await allCards({ includeDeleted: true });
  const dirty = fresh.filter(c => c.dirty && !c.deleted);
  let pushed = { ok: [], done: 0, failed: 0 };
  if (dirty.length) {
    onStatus(`Wysyłam ${dirty.length}…`);
    pushed = await pushAll(dirty, (n, total) => onStatus(`Wysyłam ${n}/${total}…`));
    if (pushed.ok.length) {
      await putMany(pushed.ok.map(c => ({ ...c, dirty: false })));
    }
  }

  await setMeta('lastSync', Date.now());
  return { added, updated, pushed: pushed.done, failed: pushed.failed, remote: remote.length };
}

/** Wysyłka pojedynczej karty „w tle” — po dodaniu słowa. */
export async function pushCardQuietly(id) {
  if (!navigator.onLine) return false;
  const card = await getCard(id);
  if (!card) return false;
  try {
    await pushOne(card);
    await putMany([{ ...card, dirty: false }]);
    return true;
  } catch { return false; }
}

export const lastSync = () => getMeta('lastSync', 0);
