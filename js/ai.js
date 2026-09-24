/* ===========================================================================
   Klient funkcji `chat` w Azure (która rozmawia z OpenAI).

   Klucz OpenAI nigdy nie trafia do przeglądarki — siedzi w zmiennych
   środowiskowych Function App. Aplikacja zna tylko adres funkcji.
   =========================================================================== */

import { AI_API_URL, aiConfigured } from './config.js';

const TIMEOUT_MS = 45_000;   // zimny start funkcji + czas odpowiedzi modelu

export class AiNotConfigured extends Error {
  constructor() { super('Czat AI nie jest jeszcze podłączony'); }
}

async function call(body) {
  if (!aiConfigured()) throw new AiNotConfigured();
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(AI_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: ctrl.signal
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
    return data;
  } catch (err) {
    if (err.name === 'AbortError') throw new Error('czat nie odpowiedział w 45 s');
    if (err instanceof TypeError) {
      throw new Error(navigator.onLine
        ? 'przeglądarka zablokowała żądanie (CORS albo zły adres funkcji)'
        : 'brak internetu');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/** To, co model musi wiedzieć o słowie — bez stanu powtórek i notatek. */
function wordContext(card) {
  return {
    english: card.english,
    polishDefinition: card.polishDefinition,
    pos: card.pos,
    sentences: (card.sentences || []).slice(0, 3).map(s => s.en),
    collocations: card.collocations || [],
    rules: card.rules || ''
  };
}

/** Definicja, po co, kiedy + cytat/scena. Wynik zapisujemy w karcie na stałe. */
export async function explainWord(card) {
  const data = await call({ mode: 'explain', word: wordContext(card) });
  if (!data.insight) throw new Error('pusta odpowiedź');
  return { ...data.insight, createdAt: Date.now() };
}

/**
 * Budzi funkcję w Azure (plan Consumption zasypia i pierwsze żądanie potrafi
 * czekać 20–30 s). Nie woła OpenAI, więc nic nie kosztuje. Błędy ignorujemy —
 * to tylko przyspieszenie.
 */
export function warmUp() {
  if (!aiConfigured()) return;
  fetch(AI_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'ping' })
  }).catch(() => {});
}

/** Czat ogólny — bez konkretnego słowa (ikona czatu na pulpicie). */
export async function freeReply(messages) {
  const history = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.content }));
  const data = await call({ mode: 'free', messages: history });
  return data.reply || '';
}

/** Kolejna wypowiedź korepetytora. Pusta historia = czat zaczyna i zadaje pytanie. */
export async function tutorReply(card, messages) {
  const history = messages
    .filter(m => m.role === 'user' || m.role === 'assistant')
    .map(m => ({ role: m.role, content: m.content }));
  const data = await call({ mode: 'tutor', word: wordContext(card), messages: history });
  return data.reply || '';
}

export { aiConfigured };
