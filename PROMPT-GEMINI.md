# Brief dla Gemini — połączenie aplikacji „Słówka B2” z Azure

Pracujemy nad moją prywatną aplikacją do nauki angielskiego. Frontend jest
gotowy i przetestowany. Twoje zadanie dotyczy **wyłącznie warstwy Azure**:
CORS, funkcja `words` i tabela w Table Storage. Poniżej masz komplet informacji
— nie zgaduj, trzymaj się tego kontraktu.

---

## 1. Czym jest aplikacja

- PWA (HTML + CSS + czysty JavaScript, moduły ES, bez builda i bez frameworka).
- Jeden użytkownik — ja. iPhone 12, Safari, aplikacja dodana do ekranu głównego.
- Hosting docelowy: statyczny HTTPS (GitHub Pages albo Netlify). Lokalnie
  testuję na `http://localhost:5173`.
- Brak logowania i brak kont użytkowników. Autoryzacja to klucz funkcji w URL.

## 2. Podział ról

- **IndexedDB w przeglądarce jest źródłem prawdy.** Aplikacja działa w 100%
  offline, cała nauka odbywa się lokalnie.
- **Azure to kopia zapasowa i synchronizacja** — nic się nie wysypie, jeśli
  chmura chwilowo nie odpowiada.
- Synchronizowane są **tylko karty słów**. Ustawienia i log powtórek zostają
  lokalnie (mam osobny eksport/import JSON).

## 3. Co już stoi na Azure

| Element | Wartość |
|---|---|
| Function App | `slownik-backend-2026` (Node.js, region `polandcentral`) |
| Storage Account | `slownikstorage2026` |
| Tabela | `wordsTable` |
| PartitionKey | `Words` (stała) |
| RowKey | znormalizowane słowo angielskie |
| Zmienna środowiskowa | `AZURE_STORAGE_CONNECTION_STRING` |
| Endpoint | `https://slownik-backend-2026-gvhdbsfjamgtf9c9.polandcentral-01.azurewebsites.net/api/words?code=<KLUCZ_FUNKCJI>` |

Stan na teraz: `GET` zwraca `200` i pustą tablicę `[]` — funkcja żyje, tabela
jest pusta.

**Normalizacja RowKey (frontend liczy ją identycznie):**

```js
english.toLowerCase().trim()
  .replace(/\s+/g, '')      // bez spacji
  .replace(/[\\/#?]/g, '');  // znaki zakazane w RowKey (+ znaki sterujace)
```

`come across` → `comeacross`. To jest jednocześnie `id` karty w aplikacji, więc
**format musi zostać bez zmian**, inaczej zrobią się duplikaty.

---

## 4. Problem nr 1 — CORS (zdiagnozowany, prosta naprawa)

Mam **działający wcześniej MVP** tej samej aplikacji, który rozmawiał z tym
endpointem bez żadnych problemów. Jego funkcja na Azure **nie ustawiała żadnych
nagłówków CORS w kodzie** — obsługiwała je platforma (Portal Azure → Function
App → API → CORS). Wniosek: mechanizm działa, brakuje tylko origin-u nowej
aplikacji na liście.

Nowa aplikacja startuje z `http://localhost:5173` i dostaje:

```
Access to fetch at 'https://slownik-backend-2026-....azurewebsites.net/api/words?code=...'
from origin 'http://localhost:5173' has been blocked by CORS policy:
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

Kształt żądań jest identyczny jak w działającym MVP (POST z jedynym nagłówkiem
`Content-Type: application/json`, GET bez nagłówków), więc kod nie jest winny.

**Decyzja, której się trzymamy:** CORS konfigurujemy **wyłącznie w portalu**,
a funkcja nie dokłada własnych nagłówków. Ustawienie ich w obu miejscach daje
zdublowany `Access-Control-Allow-Origin`, a przeglądarka taką odpowiedź
odrzuca. Nie proponuj mi nagłówków CORS w kodzie funkcji.

Do zrobienia: Portal Azure → `slownik-backend-2026` → API → CORS → dodać
**dokładne** originy, bez ukośnika na końcu:

- `http://localhost:5173`
- adres hostingu produkcyjnego (podam, gdy go ustawimy)

Jeśli na liście jest `*` obok innych wpisów — usunąć `*`, bo Azure ignoruje
wtedy pozostałe.

**Pułapka diagnostyczna:** `fetch` uruchomiony z narzędzi deweloperskich albo
z rozszerzenia przeglądarki potrafi ominąć CORS i pokazać fałszywe „działa”.
Weryfikuj nagłówki odpowiedzi (`curl -i`, `Invoke-WebRequest`) albo żądaniem
z samej strony.

**Druga rzecz do zapamiętania:** Function App jest w planie Consumption i
zasypia. Pierwsze żądanie po przerwie potrafi wisieć 20–30 sekund, zanim
cokolwiek odpowie. To nie jest awaria — frontend ma na to timeout 25 s i jedną
automatyczną ponowną próbę.

## 5. Problem nr 2 — funkcja zapisuje za mało pól

Obecna funkcja przyjmuje tylko `{ english, polishDefinition }`. Aplikacja
wysyła dwa dodatkowe pola: `payload` i `updatedAt`. Jeśli funkcja ich nie
zapisze, w chmurze zostanie sama para *słowo – znaczenie*, a zdania, zasady
użycia, skojarzenia i cały postęp nauki będą istniały wyłącznie na telefonie.

W repozytorium mam gotowy plik `backend/index.js`. To **mój działający kod
v3 z dwoma dodatkami** (`payload` i `updatedAt`), z zachowaniem wszystkiego,
co działało: `TableClient` tworzony raz poza handlerem, ten sam wzór `RowKey`,
`upsertEntity(entity, "Replace")`, zero nagłówków CORS w kodzie.

Sprawdź tylko, czy Function App faktycznie używa modelu v3
(`module.exports = async function (context, req)`). Gdyby był to model v4
(`app.http(...)` z `@azure/functions` v4), przepisz ten plik na v4 — nie
przestawiaj aplikacji na inny model.

---

## 6. Kontrakt API — dokładnie tak zachowuje się frontend

### GET (pobranie wszystkich słów)

Żądanie: `GET <endpoint>`, bez dodatkowych nagłówków — dokładnie jak
w moim działającym MVP.

Frontend akceptuje odpowiedź jako tablicę **albo** obiekt z polem `value` lub
`words`. Z każdej encji czyta:

| Pole | Uwagi |
|---|---|
| `english` | wymagane; wpis bez tego pola jest pomijany |
| `polishDefinition` | tłumaczenie |
| `payload` | **string z JSON-em** (albo obiekt) — cała reszta karty |
| `updatedAt` | liczba (ms). Gdy brak, frontend bierze `timestamp` encji |
| `rowKey` | używane jako `id`, gdy w `payload` go nie ma |

### POST (zapis jednego słowa)

Body wysyłane przez aplikację:

```json
{
  "english": "come across",
  "polishDefinition": "natknąć się na coś",
  "updatedAt": 1758393600000,
  "payload": "{\"id\":\"comeacross\",\"pos\":\"phr verb\",\"sentences\":[…],\"srs\":{…}}"
}
```

Wymagania:

- `upsert` z zamianą całej encji (`Replace`), nie `Merge` — karta jest zawsze
  wysyłana w całości.
- `payload` zapisać **tak jak przyszedł**, jako string. Nie parsuj go i nie
  rozbijaj na kolumny.
- Odpowiedź: `200` i dowolne krótkie potwierdzenie (np. `{ "ok": true }`).
- Brak `english` → `400`.

Aplikacja wysyła **po jednym POST na kartę**, maksymalnie 4 równolegle. Przy
pierwszej synchronizacji 40 słów to 40 żądań — to normalne, nie optymalizuj
tego na siłę (chyba że dorobimy endpoint zbiorczy, ale to osobny temat).

### Usuwanie

Aplikacja **nie wywołuje DELETE**. Skasowane słowo zostaje lokalnie jako
„nagrobek” (`deleted: true`) i taka karta jest wysyłana normalnym POST-em.
Nagrobek ma pierwszeństwo przy scalaniu, więc słowo nie wraca z chmury.
Endpoint `DELETE` może istnieć, ale nie jest potrzebny do działania.

### Reguły scalania (po stronie frontendu — masz to znać, nie implementować)

1. Karty nie ma lokalnie → dodawana z chmury.
2. Karta lokalna ma `deleted: true` → wpis z chmury jest ignorowany.
3. Wpis z chmury **bez** `payload` nigdy nie nadpisuje bogatszej karty lokalnej.
4. W pozostałych przypadkach wygrywa nowsze `updatedAt`.

### Zachowanie sieciowe

- Timeout 25 s, jedna automatyczna ponowna próba po 1,5 s — pod zimny start
  planu Consumption.
- Błąd synchronizacji nigdy nie blokuje aplikacji; dane czekają lokalnie
  z flagą `dirty`.

---

## 7. Model danych karty (to siedzi w `payload`)

```js
{
  id: 'comeacross',                    // = RowKey
  english: 'come across',
  polishDefinition: 'natknąć się na coś; sprawiać wrażenie',
  pos: 'phr verb',
  phonetic: '/kʌm əˈkrɒs/',
  sentences: [                          // 1–5 zdań, każde z tłumaczeniem
    { en: 'I came across an old letter…', pl: 'Natknąłem się na stary list…' }
  ],
  collocations: ['come across as rude'],
  rules: 'Nierozdzielny: come across something…',
  mnemonic: 'ACROSS — idziesz w poprzek i wpadasz na coś…',
  note: '',
  tags: ['phrasal verbs'],
  level: 'B2',
  srs: {                                // stan pamięci — algorytm powtórek
    main: {
      status: 'review',                 // new | learning | review | relearning
      S: 14.95,                         // trwałość śladu w dniach
      D: 5.1,                           // trudność 1–10
      due: 1759000000000,               // termin następnej powtórki (ms)
      last: 1758400000000,
      step: 0,
      reps: 3,
      lapses: 0
    }
  },
  createdAt: 1758300000000,
  updatedAt: 1758393600000,
  deleted: false
}
```

Rozmiar jednej karty z pięcioma zdaniami: ok. 1,5–2,5 KB JSON-a.

## 8. Ograniczenia Table Storage, o których trzeba pamiętać

- Pojedyncza właściwość typu string: do 64 KB → nasz `payload` mieści się
  z dużym zapasem.
- Cała encja: do 1 MB i 255 właściwości.
- W `RowKey` i `PartitionKey` nie wolno: `/`, `\`, `#`, `?` ani znaków
  sterujących — dlatego normalizacja z punktu 3.
- `Timestamp` jest zarządzany przez Azure i nie da się go nadpisać. Dlatego
  mamy **własne** `updatedAt` jako liczbę — na nim opiera się rozstrzyganie
  konfliktów.

---

## 9. Co konkretnie masz zrobić

1. Dodać originy do listy CORS w portalu i potwierdzić nagłówki na żywym
   endpoincie (bez ruszania kodu funkcji w tej sprawie).
2. Zaktualizować funkcję `words` tak, by:
   - `POST` zapisywał `english`, `polishDefinition`, `payload`, `updatedAt`
     (upsert `Replace`),
   - `GET` zwracał te pola z powrotem,
   - stary kontrakt `POST { english, polishDefinition }` nadal działał.
3. Podać mi dokładną instrukcję wdrożenia (Portal → Code + Test → Save, albo
   `func azure functionapp publish`), krok po kroku.
4. Dać komendy testowe do wklejenia w PowerShell (mam Windows 11).

## 10. Testy akceptacyjne — po nich uznaję temat za zamknięty

1. `OPTIONS` na endpoint zwraca nagłówek `Access-Control-Allow-Origin` z moim
   originem (odpowiada platforma, nie kod funkcji).
2. `POST` z pełnym body (z `payload`) zwraca `200`.
3. `GET` zwraca tę kartę **razem z `payload` i `updatedAt`**, a `payload` po
   sparsowaniu ma pole `srs.main.status`.
4. Ponowny `POST` tego samego słowa z nowszym `updatedAt` nadpisuje encję,
   a nie tworzy drugiej.
5. Aplikacja otwarta na `http://localhost:5173` pokazuje w Ustawieniach
   komunikat „Zsynchronizowano: +N nowych…” zamiast „Synchronizacja nieudana”.

## 11. Czego nie zmieniać

- Formatu `RowKey` (to jest `id` karty w aplikacji).
- Nazw pól `english`, `polishDefinition`, `payload`, `updatedAt`.
- Tego, że `payload` jest stringiem z JSON-em.
- Nazw zasobów: `wordsTable`, PartitionKey `Words`.

Jeśli uznasz, że coś z powyższego jest złym pomysłem — powiedz i uzasadnij,
zanim zmienisz. Frontend jest już pod to napisany i każda zmiana kontraktu
oznacza poprawki po drugiej stronie.

---

# Aneks — co się zmieniło po pokazaniu działającego MVP

Pokazałem Claude'owi swój wcześniejszy, w 100% działający kod: funkcję Azure v3
(GET + POST, bez nagłówków CORS w kodzie, `TableClient` tworzony raz poza
handlerem, `RowKey = english.toLowerCase().trim().replace(/\s+/g, '')`,
`upsertEntity(entity, "Replace")`) oraz frontend w czystym JS (POST z jedynym
nagłówkiem `Content-Type: application/json`, GET bez nagłówków).

Na tej podstawie zapadły następujące ustalenia i zmiany.

## 1. Diagnoza CORS

Skoro tamta funkcja nie ustawiała nagłówków CORS, a mimo to działała, to
nagłówki dokłada **platforma** (Portal → Function App → API → CORS). Nowa
aplikacja startuje z innego adresu (`http://localhost:5173`), którego nie ma na
liście — i tylko dlatego dostaje „No 'Access-Control-Allow-Origin' header".
Kształt żądań w nowej aplikacji jest identyczny jak w MVP, więc kod nie jest
przyczyną.

## 2. Decyzja: CORS wyłącznie w portalu

Funkcja nie ustawia własnych nagłówków. Wcześniejsza wersja funkcji
(przygotowana, zanim pokazałem MVP) dokładała `Access-Control-Allow-Origin: *`
w kodzie — zostało to **usunięte**, bo przy włączonym CORS w portalu nagłówek
pojawia się dwa razy, a przeglądarka odrzuca odpowiedź ze zdublowanym
`Access-Control-Allow-Origin`. **Nie proponuj nagłówków CORS w kodzie funkcji.**

## 3. Backend — `backend/index.js`

To teraz dokładnie mój działający kod plus dwa dodatki:

- `POST` zapisuje dodatkowo `payload` (string z JSON-em: cała karta — zdania,
  zasady, skojarzenia, stan powtórek) oraz `updatedAt` (liczba ms),
- `GET` zwraca `rowKey`, `english`, `polishDefinition`, `payload`, `updatedAt`,
- doszedł guard: brak `english` → `400`,
- doszedł `405` dla pozostałych metod.

Zachowane bez zmian: `TableClient` poza handlerem, wzór `RowKey`, upsert
`"Replace"`, PartitionKey `Words`, tabela `wordsTable`, brak `createTable()`
przy każdym żądaniu.

Usunięty został endpoint `DELETE` — aplikacja go nie używa. Kasowanie działa
przez „nagrobki”: karta z `deleted: true` wysyłana zwykłym POST-em.

## 4. Frontend — dostosowany do sprawdzonego wzorca

- `GET` leci bez żadnych dodatkowych nagłówków (wcześniej wysyłał
  `Accept: application/json`),
- `POST` bez zmian: jedyny nagłówek `Content-Type: application/json`,
- zostaje timeout 25 s i jedna automatyczna ponowna próba po 1,5 s — przy
  teście zimny start Function App zajął **około 30 sekund**,
- komunikat błędu mówi teraz wprost: „przeglądarka zablokowała żądanie — dodaj
  http://localhost:5173 do listy CORS w Portalu Azure”.

## 5. Sprostowanie: to nie jest projekt na Vite

Pisałem wcześniej o „aplikacji uruchamianej przez Vite”. To nieprawda: nowa
aplikacja to czysty HTML/CSS/JS z modułami ES, bez builda i bez frameworka.
Port 5173 obsługuje zwykły serwer statyczny (`tools/dev-server.py`), ustawiony
tak, by nie podsuwał plików z cache. Nie szukaj `vite.config.js` i nie proponuj
proxy dev-servera jako obejścia CORS — to musi działać tak samo z hostingu
produkcyjnego.

## 6. Co zostało do zrobienia

1. Dodać `http://localhost:5173` do listy CORS w portalu (i później adres
   hostingu produkcyjnego).
2. Wkleić nowy `index.js` w Code + Test i zapisać.
3. Test: Ustawienia → „Synchronizuj teraz” → oczekiwany komunikat
   „Zsynchronizowano: …”.

Robię to sam. Twoja pomoc jest potrzebna dopiero, gdy któryś z tych kroków
zwróci coś innego, niż się spodziewam.

## 7. Czego nie zmieniać

Formatu `RowKey`, nazw pól `english` / `polishDefinition` / `payload` /
`updatedAt`, tego że `payload` jest stringiem, nazw zasobów (`wordsTable`,
PartitionKey `Words`) — i nie dokładać nagłówków CORS w kodzie funkcji.
