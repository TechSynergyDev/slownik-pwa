# Słówka B2

Osobista aplikacja PWA do nauki angielskiego na poziomie B2. Działa offline na
iPhonie, synchronizuje się z Twoim backendem na Azure.

---

## Jak to uruchomić

### Na komputerze (do testów)

```bash
python tools/dev-server.py
```

Potem otwórz `http://localhost:5173`. Nie ma żadnego builda ani `npm install` —
to czysty HTML/CSS/JS z modułami ES. Ten serwer wysyła `Cache-Control: no-store`,
więc po każdej zmianie w kodzie wystarczy odświeżyć stronę. Service worker na
`localhost` celowo się nie rejestruje — inaczej podsuwałby starą wersję plików.

### Na iPhonie 12 (docelowo)

Service worker i instalacja na ekranie głównym **wymagają HTTPS**. Najprostsze
darmowe opcje: GitHub Pages, Netlify Drop, Cloudflare Pages.

1. Wrzuć zawartość tego katalogu na hosting (GitHub Pages: repo → Settings →
   Pages → Deploy from branch).
2. Otwórz adres w **Safari** (nie w Chrome — tylko Safari potrafi instalować PWA na iOS).
3. Przycisk *Udostępnij* → **Dodaj do ekranu początkowego**.
4. Aplikacja startuje pełnoekranowo, bez paska przeglądarki, i działa bez internetu.

---

## Zanim zadziała synchronizacja: CORS na Azure

Sprawdziłem Twój endpoint — **działa i zwraca `200`**, ale przeglądarka blokuje
zapytania z aplikacji, bo w odpowiedzi nie ma nagłówka
`Access-Control-Allow-Origin` dla adresu, z którego serwowana jest aplikacja.
Bez tego synchronizacja pokaże „Synchronizacja nieudana".

**Portal Azure → slownik-backend-2026 → API → CORS → dodaj adresy:**

```
http://localhost:5173
https://TWOJA-NAZWA.github.io
```

(dokładnie takie, bez ukośnika na końcu). Jeśli na liście jest `*` razem z innymi
wpisami — usuń `*`, Azure wtedy ignoruje pozostałe.

Funkcja w [`backend/index.js`](backend/index.js) **celowo nie ustawia własnych
nagłówków CORS** — robi to platforma. Gdyby robiły to oba miejsca naraz,
przeglądarka dostałaby zdublowany `Access-Control-Allow-Origin` i odrzuciła
odpowiedź.

Pierwsze żądanie po dłuższej przerwie potrafi wisieć 20–30 sekund: Function App
w planie Consumption zasypia. Aplikacja ma na to timeout 25 s i jedną ponowną
próbę, więc wystarczy poczekać.

---

## Aktualizacja backendu (opcjonalna, ale warto)

Plik [`backend/index.js`](backend/index.js) to rozszerzona wersja Twojej funkcji.
Dokłada dwa pola: `payload` (całe zdanie, notatki i stan powtórek jako JSON)
oraz `updatedAt`. Bez tego w chmurze wyląduje tylko para *słowo – znaczenie*, a
cała reszta zostanie wyłącznie na telefonie.

Stary kontrakt (`POST { english, polishDefinition }`) działa dalej bez zmian.

Wgranie: Portal Azure → Function App → Functions → `words` → Code + Test →
wklej zawartość pliku → Save.

---

## Czat AI — podłączenie (strony 8–10)

Strony **Zrozumienie**, **Z filmu / serialu** i **Czat** korzystają z OpenAI przez
osobną funkcję w Twoim Function App. Klucz OpenAI zostaje w Azure — nigdy nie
trafia do aplikacji ani na GitHuba.

1. **Klucz OpenAI** — platform.openai.com → API keys → Create. Od razu ustaw
   **miesięczny limit wydatków** (Settings → Limits): klucz funkcji w aplikacji
   jest widoczny w źródle strony, więc ktoś, kto go zdobędzie, mógłby wydawać
   Twoje kredyty.
2. **Zmienna w Azure** — Portal → `slownik-backend-2026` → Settings →
   Environment variables → dodaj `OPENAI_API_KEY` = Twój klucz → Apply.
   (Działa też nazwa `AI_API_KEY`, jeśli już ją dodałeś. Model można zmienić
   zmienną `OPENAI_MODEL`, domyślnie `gpt-4o-mini`.)
3. **Nowa funkcja** — Functions → Create → **HTTP trigger** → nazwa `chat`,
   Authorization level: **Function**.
4. **Kod** — `chat` → Code + Test → `index.js` → wklej całą zawartość
   [`backend/chat/index.js`](backend/chat/index.js) → Save. Niczego nie trzeba
   instalować — funkcja nie używa `axios`.
5. **Klucz funkcji** — `chat` → Function Keys → skopiuj `default`. To **inny**
   klucz niż ten od `words`.
6. **Aplikacja** — w [`js/config.js`](js/config.js) zamień
   `WKLEJ_TUTAJ_KLUCZ_FUNKCJI_CHAT` na skopiowany klucz i wrzuć plik na GitHuba.
7. **CORS** — nic do zrobienia: lista CORS dotyczy całego Function App, więc
   obejmuje też nową funkcję.

Objaśnienie słowa (strony 8–9) generuje się **raz** — w tle, gdy otwierasz
słowo — i zapisuje w karcie, razem z nią synchronizuje się z Azure. Kolejne
podejścia do tego samego słowa nie kosztują już nic.

**Skąd szybkość:** otwarcie słowa i otwarcie czatu wysyłają puste żądanie
`ping`, które tylko budzi funkcję (nie woła OpenAI, więc nic nie kosztuje) —
dzięki temu zimny start planu Consumption nie każe czekać 20 sekund przy
pierwszej wiadomości. Pierwsze pytanie czatu pobiera się już na stronie 9,
a odpowiedzi mają do około 60 słów, bo krótsze przychodzą szybciej.

Test z terminala (wstaw swój klucz funkcji `chat`):

```bash
curl -X POST "https://slownik-backend-2026-gvhdbsfjamgtf9c9.polandcentral-01.azurewebsites.net/api/chat?code=KLUCZ" -H "Content-Type: application/json" -d '{"mode":"tutor","word":{"english":"drawback","polishDefinition":"wada"},"messages":[]}'
```

Poprawna odpowiedź to `{"reply":"..."}` z pierwszym pytaniem czatu.

**O cytatach z filmów:** model ma polecenie podawać cytat tylko wtedy, gdy jest
pewien, że jest autentyczny — w przeciwnym razie strona pokazuje samą scenę.
Modele językowe potrafią jednak zmyślać cytaty, dlatego przy każdym jest
znaczek **AI**. Traktuj go jako ciekawostkę, nie źródło.

## Ekran główny

1. **Dzisiejsza data** — pełna, z dniem tygodnia.
2. **Licznik** — ile słów już umiesz (karty, które wyszły ze stanu „nowe"),
   a pod spodem ile doszło dzisiaj.
3. **Pasek tygodnia `mon`–`sun`**:
   - 🟢 zielony — tego dnia była nauka,
   - 🔴 czerwony — dzień minął bez nauki,
   - ⚪ szary — dzień jeszcze nie nadszedł **albo** był przed Twoją pierwszą
     powtórką (nie ma sensu malować na czerwono czasu, gdy aplikacji jeszcze nie było),
   - dzisiejszy dzień ma fioletową obwódkę.
4. **Słowo na teraz** — dokładnie to, które dostaniesz po naciśnięciu przycisku.
   Nie ma etykiet „nowe" i „powtórka": to rozróżnienie należy do algorytmu,
   nie do Ciebie.

## Jedenaście stron nauki

Jeden przycisk **„Nauka słowa"** uruchamia zawsze tę samą ścieżkę:

| # | Strona | Co robisz |
|---|---|---|
| 1 | **Słowo** | słowo, wymowa, znaczenia (różne znaczenia w osobnych liniach od myślnika); oceniasz: **znam / kojarzę / nie znam** |
| 2 | **W zdaniach** | zdania pojedynczo, jak relacje na Instagramie — angielskie z tłumaczeniem pod spodem |
| 3 | **Wpisz słowo** | zdanie z luką — słowo trzeba wystukać z klawiatury |
| 4 | **Po polsku** | zdania pojedynczo, tylko po polsku, w innej kolejności; znaczek **EN** odsłania oryginał |
| 5 | **Dopasowania** | z jakimi słowami to słowo się łączy |
| 6 | **Zasady** | składnia, rejestr, pułapki |
| 7 | **Skojarzenia** | mnemonik, notatka, tagi |
| 8 | **Zrozumienie** | definicja · po co się go używa · kiedy się go używa (z czatu AI) |
| 9 | **Z filmu / serialu** | cytat z filmu lub serialu, jeśli istnieje autentyczny, i krótka scena z użyciem słowa (z czatu AI) |
| 10 | **Czat** | rozmowa z AI o tym jednym słowie: czat pyta, Ty odpowiadasz, on prostuje i dopowiada |
| 11 | **Moje notatki** | trzy pola — *Definicja*, *W jakich sytuacjach używać*, *Inne* — zapisywane w karcie i synchronizowane z Azure |

**Poruszanie się:**

- **przesunięcie palcem w lewo / w prawo** — następna / poprzednia strona,
- **na stronie 2 tapnięcie z boku** — jak w relacjach: lewa jedna trzecia
  ekranu = poprzednie zdanie, reszta = następne. Za ostatnim zdaniem tapnięcie
  przechodzi na kolejną stronę, przed pierwszym — na poprzednią,
- **na stronie 4 tapnięcie w środek odsłania angielski**; zdania przewijają
  tylko wąskie paski przy krawędziach (po 25% szerokości), żeby podglądanie
  tłumaczenia nie zmieniało zdania,
- **na stronie 1 przesunięcie w prawo** do mniej więcej połowy ekranu zamyka
  naukę i wraca na pulpit,
- na ostatniej stronie zamiast strzałki jest **Done** w prawym górnym rogu.

**Czat ogólny** otwiera ikona dymka na pulpicie, obok koła zębatego — rozmowa
bez konkretnego słowa: gramatyka, różnice między słowami, poprawianie własnych
zdań. Historia zapisuje się lokalnie i wraca po zamknięciu aplikacji, a przycisk
*Wyczyść* zaczyna od nowa. Ekran zamyka krzyżyk albo przesunięcie palcem w prawo.

**Klawiatura w czacie** chowa się, gdy przewiniesz rozmowę w górę — tak jak
w ChatGPT. Pole pisania wraca do jednej linii i oddaje ekran historii.

### Ocena — tylko ze strony 1

Jedynym sygnałem dla algorytmu powtórek jest odpowiedź na stronie 1:

| Wybór | Ocena w modelu | Nowe słowo wraca po | Znane słowo |
|---|---|---|---|
| **znam** | dobre | 25 minutach, potem ~4 dni | normalny odstęp |
| **kojarzę** | trudne | 6 minutach | krótszy odstęp, trudność rośnie |
| **nie znam** | wpadka | minucie | trwałość śladu spada |

Ocena zapisuje się **od razu po wyborze** — nawet jeśli potem zamkniesz naukę
w połowie, powtórka się liczy. Jeśli wrócisz na stronę 1 i wybierzesz coś
innego, ocena zostaje **poprawiona** (liczona od stanu sprzed otwarcia słowa),
a nie dopisana drugi raz. Dalej ze strony 1 da się przejść dopiero po wyborze.

Wynik wpisywania na stronie 3 i rozmowa z czatem **nie wpływają** na harmonogram.

## Jak system dobiera słowo

Nie wybierasz, czy chcesz nową rzecz, czy powtórkę — to zadanie algorytmu.
Kolejka układana jest za każdym razem od nowa:

1. **Słowa w trakcie poznawania** (kroki tego samego dnia). Zaczęty ślad jest
   kruchy; dokończenie go jest tańsze niż zaczynanie obok czegoś nowego.
2. **Powtórki — od najbardziej zagrożonych.** Sortowane po szacowanej szansie
   przypomnienia *R*, nie po dacie. Dzień zwłoki przy odstępie tygodniowym
   znaczy co innego niż przy rocznym. Przy remisie pierwszeństwo ma słowo
   z wyższą trudnością *D*.
3. **Nowe słowa** — tylko gdy zaległości są pod kontrolą (domyślnie do 20
   zaległych powtórek) i został dzienny limit.

**Nowe słowa nie są dobierane po kolei z listy:** wybierane jest to, które
najmniej przypomina słowa poznane dzisiaj (inny tag, inny początek wyrazu).
Uczenie się naraz rzeczy podobnych kończy się myleniem ich ze sobą.

### Kiedy wraca słowo

| Moment | Co się dzieje |
|---|---|
| Pierwsze spotkanie, *znam* | wraca za **25 minut** — mniej więcej następna przerwa |
| Po tym drugim przypomnieniu | **~4 dni** |
| Dalej | ~15 dni → ~2 miesiące → ~5 miesięcy → ~14 miesięcy |
| *Kojarzę* | krótszy odstęp, trudność słowa rośnie |
| *Nie znam* | wraca za minutę, trwałość śladu spada, kolejne odstępy są krótsze |

Te liczby nie są wpisane z ręki — wychodzą z modelu pamięci. Odstęp dobierany
jest tak, aby w momencie powtórki szansa przypomnienia wynosiła **dokładnie
tyle, ile ustawisz** (domyślnie 90%). Sprawdzone symulacją: przy kolejnych
powtórkach *R* w chwili terminu wynosi 89,3%, 90,0%, 90,0%, 90,0%…

Krok 25-minutowy jest osobną sprawą: pojedyncze spotkanie ze słowem daje słaby
ślad, a drugie przypomnienie po krótkiej przerwie — nie od razu — wyraźnie
podnosi szansę, że słowo dotrwa do następnego dnia. W krokach minutowych model
pamięci celowo nie jest przeliczany: z 25 minut nie da się wnioskować
o trwałości śladu.

## Jedno słowo na sesję

Domyślnie **jedna sesja = jedno słowo** — pod naukę w przerwie w pracy.
Po odpowiedzi widzisz ekran podsumowania z dwoma przyciskami: *Kolejne słowo*
(jeśli coś jeszcze czeka) i *Wróć*.

Po ocenie **nie znam** słowo wraca za minutę — więc następne naciśnięcie
„Nauka słowa" najpewniej da Ci je jeszcze raz.

Jeśli kiedyś zechcesz uczyć się seriami, wyłącz *Jedno słowo na sesję*
w Ustawieniach; wtedy obowiązuje limit *Maks. kart w sesji*.

## Jak to jest zbudowane

```
index.html          szkielet wszystkich ekranów
styles.css          styl (ciemny + jasny, bezpieczne marginesy iPhone'a)
sw.js               offline: sieć najpierw, cache jako zapas
manifest.webmanifest
js/
  config.js         adres API, ustawienia domyślne, zasady nauki
  util.js           narzędzia (formaty dat, luki w zdaniach, porównywanie odpowiedzi)
  fsrs.js           algorytm powtórek
  db.js             IndexedDB: karty, log powtórek, ustawienia
  session.js        pętla nauki — najważniejszy plik
  gestures.js       przesuwanie palcem (strony, arkusze)
  ai.js             klient funkcji `chat` (objaśnienia + czat)
  views.js          rysowanie ekranów
  sync.js           synchronizacja z Azure
  seed.js           pakiet startowy: 40 słów B2, po 5 zdań, zasady i skojarzenia
backend/index.js    funkcja Azure `words` (do wklejenia w portalu)
backend/chat/       funkcja Azure `chat` — objaśnienia i czat przez OpenAI
tools/make-icons.mjs generator ikon (node tools/make-icons.mjs)
tools/dev-server.py  serwer deweloperski bez cache'owania
```

### Model danych (jedna karta)

```js
{
  id: 'comeacross',              // = RowKey w Azure Table Storage
  english: 'come across',
  polishDefinition: 'natknąć się na coś',
  pos: 'phr verb', phonetic: '/kʌm əˈkrɒs/',
  sentences: [                    // ekran 2 pokazuje do pięciu
    { en: 'I came across an old letter…', pl: 'Natknąłem się na stary list…' },
    …
  ],
  collocations: ['come across as rude'],
  rules: 'Nierozdzielny: come across something…',   // ekran 4
  mnemonic: 'ACROSS — idziesz w poprzek i wpadasz…', // ekran 5
  note: '', tags: ['phrasal verbs'],
  insight: {                      // strony 8–9, generowane raz przez czat AI
    definition, purpose, usage,
    quote: { text, speaker, source } | null,
    scene: [{ speaker, en, pl }]
  },
  srs: { main: { status, S, D, due, last, step, reps, lapses } },
  createdAt, updatedAt, dirty, deleted
}
```

Jeden stan SRS na słowo, bo jedno przejście przez strony sprawdza i
rozpoznawanie (strony 1–2), i produkcję (strony 3–4). Starsze karty z dwoma
osobnymi kierunkami migrują się automatycznie przy pierwszym uruchomieniu
(baza w wersji 2) — zostaje mocniejszy z dwóch śladów.

---

## Dlaczego akurat tak (metodyka)

| Zasada | Jak jest wymuszona w kodzie |
|---|---|
| Aktywne przypominanie | Ekran 3 wymaga wystukania słowa z klawiatury, bez podpowiedzi |
| Powtórki rozłożone w czasie | FSRS wylicza termin z modelu pamięci, nie ze sztywnej tabelki |
| Uczenie w kontekście | Formularz nie przyjmie słowa bez zdania, które je zawiera |
| Testowanie dwukierunkowe | Rozpoznawanie (strony 1–2) i produkcja (strony 3–4) w jednym przejściu |
| Głębokie przetwarzanie | Osobne ekrany na zasady użycia i skojarzenia — nie doklejka do fiszki |
| Samoocena przed nauką | Strona 1 pyta „znam / kojarzę / nie znam" — to kalibruje ocenę końcową |
| Tłumaczenie zwrotne | Strona 4: polskie zdanie → angielskie w myślach, dopiero potem podgląd |
| Wyjaśnienie w pełnym zdaniu | Strona 8: definicja, cel i kontekst użycia zamiast samego tłumaczenia |
| Aktywne przetwarzanie | Strona 10: tłumaczysz czatowi słowo własnymi słowami, on prostuje |
| Nauka w krótkich porcjach | Jedno słowo na sesję — kilka minut w przerwie zamiast maratonu |
| Powtórzenie świeżego śladu | Nowe słowo wraca tego samego dnia po 25 minutach |
| Wielokrotny kontekst | Pięć różnych zdań na słowo, a do wpisywania za każdym razem inne |
| Unikanie interferencji | Nowe słowa dobierane tak, by nie przypominały poznanych dziś |
| Kontrola obciążenia | Przy dużych zaległościach nowe słowa czekają |

### Algorytm powtórek (`js/fsrs.js`)

Model FSRS opisuje pamięć trzema wielkościami:

- **S** (stability) — ile dni wytrzyma ślad, zanim szansa przypomnienia spadnie do 90%
- **D** (difficulty, 1–10) — jak oporne jest to słowo dla Ciebie
- **R** (retrievability) — szansa przypomnienia *teraz*

```
R(t) = (1 + 19/81 · t/S) ^ (-0.5)          krzywa zapominania
I    = S/F · (R_cel ^ (1/-0.5) − 1)        odstęp do kolejnej powtórki
```

Po każdej ocenie S i D są przeliczane: trafienie po długiej przerwie podnosi S
mocniej niż trafienie po krótkiej (efekt odstępu), a wpadka obniża S i podnosi D.

Wagi `DEFAULT_W` to publiczne wartości domyślne FSRS-4.5 — uśrednione na danych
tysięcy użytkowników Anki, **nie** dopasowane do Ciebie. To celowy kompromis:
żeby je zoptymalizować, potrzeba kilku tysięcy powtórek. Aplikacja zapisuje
każdą odpowiedź w magazynie `reviews`, więc dane na to będą czekać.

### Co ustawić na start

- **Nowe słowa dziennie: 5** (domyślnie). Każde nowe słowo to potem kilkanaście
  powtórek rozłożonych na miesiące, a do tego dochodzi powrót po 25 minutach
  i utrwalanie w drugą stronę. 20 nowych dziennie przez tydzień to lawina,
  która się na Ciebie zwali.
- **Docelowa skuteczność: 90%.** 95% oznacza dużo więcej powtórek przy minimalnym
  zysku; 85% — mniej powtórek, ale częściej będziesz mieć pustkę w głowie.

---

## Ważne: bezpieczeństwo

1. **Klucz funkcji siedzi w `js/config.js`** i po wrzuceniu na hosting jest
   widoczny dla każdego, kto otworzy źródło strony. Dla prywatnej listy słówek to
   niewielkie ryzyko, ale ktoś, kto zna adres, może czytać i dopisywać słowa.
   Jeśli to przeszkadza — trzymaj aplikację na prywatnym hostingu za logowaniem
   albo wygeneruj nowy klucz, gdy adres wycieknie.
2. **`logowanie.txt` zawiera login i hasło otwartym tekstem.** Dodałem go do
   `.gitignore`, żeby nie trafił przypadkiem na GitHuba — ale najlepiej przenieś
   go do menedżera haseł i skasuj z tego katalogu.

---

## Kopie zapasowe

Ustawienia → **Eksport JSON** zapisuje wszystko: słowa, notatki, stan powtórek
i log odpowiedzi. Warto robić to raz na jakiś czas — niezależnie od Azure.

**Import JSON** przyjmuje trzy kształty pliku:

1. eksport tej aplikacji (`{ cards: [...] }`),
2. gołą tablicę kart w formacie aplikacji,
3. paczkę w formacie encji Azure — `[{ english, polishDefinition, payload }]`,
   gdzie `payload` jest tekstem z JSON-em. Jeśli w środku jest samo pole
   `example`, trafia ono do karty jako pierwsze zdanie.

Słowo, które już masz, **nie zostanie nadpisane** paczką z zewnątrz — chyba że
plik niesie własny, nowszy `updatedAt`. Inaczej import z jednym zdaniem
skasowałby pięć zdań, zasady i cały postęp nauki.
