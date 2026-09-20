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

## Pięć ekranów nauki

Jeden przycisk **„Nauka słowa"** uruchamia zawsze tę samą ścieżkę:

| # | Ekran | Co robisz |
|---|---|---|
| 1 | **Słowo** | angielskie słowo, wymowa i tłumaczenie; oceniasz: *znam / kojarzę / nie znam* |
| 2 | **W zdaniach** | do pięciu zdań z tym słowem, pod każdym tłumaczenie w nawiasie |
| 3 | **Wpisz słowo** | zdanie z luką — słowo trzeba wystukać z klawiatury |
| 4 | **Zasady** | jak się tego słowa używa: składnia, kolokacje, typowe pułapki |
| 5 | **Skojarzenia** | mnemonik, Twoja notatka, tagi — i na dole *jeszcze raz / umiem / nie umiem* |

Między ekranami przechodzisz strzałką w prawym dolnym rogu, wracasz przyciskiem
*Wstecz*. Kropki u góry pokazują, na którym ekranie jesteś.

**Trzy przyciski na końcu:**

- **Jeszcze raz** — nie kończy słowa. Puszcza je przez te same pięć ekranów od
  nowa: przykłady w innej kolejności, inna luka do wpisania. Możesz tak zapętlić
  słowo, ile razy chcesz, zanim je zamkniesz.
- **Umiem** — słowo wchodzi do harmonogramu z odstępem z modelu pamięci.
- **Nie umiem** — wraca za minutę, jeszcze w tej sesji.

Aplikacja nie pyta osobno „czy było trudne" — wyciąga to z tego, co zrobiłeś:

| Co się wydarzyło | Jak liczy to model |
|---|---|
| *znam* na wejściu + bezbłędne wpisanie + *umiem* za pierwszym podejściem | łatwe — najdłuższy odstęp |
| *umiem* bez powtarzania | dobre — normalny odstęp |
| *umiem* po naciśnięciu *jeszcze raz* | trudne — krótszy odstęp, trudność słowa rośnie |
| *nie umiem* | wpadka — trwałość śladu spada |

Pod przyciskami widać, na kiedy wypadnie kolejna powtórka, więc nic nie dzieje
się za Twoimi plecami.

Ekran 3 jest tolerancyjny na odmianę: w zdaniu „We ___ more in one week"
poprawne jest zarówno *accomplish*, jak i *accomplished*, bo tej formy wymaga
luka. Drobna literówka daje „prawie", nie błąd.

Zdanie do wpisywania zmienia się przy każdej powtórce i przy każdym *jeszcze
raz* — nie uczysz się jednej formułki, tylko słowa w różnych kontekstach.
Przy pięciu zdaniach „inne przykłady" znaczą inną kolejność i inną lukę; jeśli
dopiszesz słowu więcej niż pięć zdań, kolejne podejście pokaże po prostu
następną piątkę.

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
| Pierwsze spotkanie, *umiem* | wraca za **25 minut** — mniej więcej następna przerwa |
| Po tym drugim przypomnieniu | **~4 dni** |
| Dalej | ~15 dni → ~2 miesiące → ~5 miesięcy → ~14 miesięcy |
| *Jeszcze raz*, potem *umiem* | krótszy odstęp, trudność słowa rośnie |
| *Nie umiem* | wraca za minutę, trwałość śladu spada, kolejne odstępy są krótsze |
| *umiem* po bezbłędnym przejściu (z *znam* na wejściu) | pomija krok 25-minutowy, od razu ~14 dni |

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

Wyjątek: ocena **nie umiem** wraca tym samym słowem jeszcze w tej samej sesji —
to jest sens tej oceny.

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
  views.js          rysowanie ekranów
  sync.js           synchronizacja z Azure
  seed.js           pakiet startowy: 40 słów B2, po 5 zdań, zasady i skojarzenia
backend/index.js    zaktualizowana funkcja Azure (do wklejenia w portalu)
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
  srs: { main: { status, S, D, due, last, step, reps, lapses } },
  createdAt, updatedAt, dirty, deleted
}
```

Jeden stan SRS na słowo, bo jedno przejście przez pięć ekranów sprawdza i
rozpoznawanie (ekran 1–2), i produkcję (ekran 3). Starsze karty z dwoma
osobnymi kierunkami migrują się automatycznie przy pierwszym uruchomieniu
(baza w wersji 2) — zostaje mocniejszy z dwóch śladów.

---

## Dlaczego akurat tak (metodyka)

| Zasada | Jak jest wymuszona w kodzie |
|---|---|
| Aktywne przypominanie | Ekran 3 wymaga wystukania słowa z klawiatury, bez podpowiedzi |
| Powtórki rozłożone w czasie | FSRS wylicza termin z modelu pamięci, nie ze sztywnej tabelki |
| Uczenie w kontekście | Formularz nie przyjmie słowa bez zdania, które je zawiera |
| Testowanie dwukierunkowe | Rozpoznawanie (ekran 1–2) i produkcja (ekran 3) w jednym przejściu |
| Głębokie przetwarzanie | Osobne ekrany na zasady użycia i skojarzenia — nie doklejka do fiszki |
| Samoocena przed nauką | Ekran 1 pyta „znam / kojarzę / nie znam" — to kalibruje ocenę końcową |
| Powtórzenie na żądanie | *Jeszcze raz* puszcza słowo od nowa z innymi przykładami |
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
