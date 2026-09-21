/* Konfiguracja aplikacji ------------------------------------------------- */

// Endpoint Azure Functions (POST = zapis słówka, GET = lista słówek).
export const AZURE_API_URL =
  'https://slownik-backend-2026-gvhdbsfjamgtf9c9.polandcentral-01.azurewebsites.net/api/words?code=F1Rs4NMbIyvgb568ql7bfDhJyFEDPPceI0QUdcHJLYeIAzFuZApD1Q==';

// Funkcja `chat` w tym samym Function App (objaśnienia słów + czat o słowie).
// UWAGA: klucz funkcji `chat` jest INNY niż klucz `words` — skopiuj go z Portalu:
// Function App → Functions → chat → Function Keys → default, i wklej za `code=`.
export const AI_API_URL =
  'https://slownik-backend-2026-gvhdbsfjamgtf9c9.polandcentral-01.azurewebsites.net/api/chat?code=bNz2hHEuiukhkcrHmABjhb-qgZZih-bMakB7o_yEkOWzAzFu8Kdz5Q==';

export const aiConfigured = () => !AI_API_URL.includes('WKLEJ_TUTAJ');

export const DB_NAME = 'slownikDB';
export const DB_VERSION = 2;   // 2: lista zdań zamiast jednego + zasady + jeden stan SRS

export const DEFAULTS = {
  newPerDay: 5,          // ile nowych słów dziennie (spacing > masowanie)
  maxSession: 40,        // limit kart na sesję, gdy uczysz się seriami
  oneWordPerSession: true, // nauka w przerwie: jedna sesja = jedno słowo
  maxBacklog: 20,        // powyżej tylu zaległych powtórek nowe słowa czekają
  retention: 0.9,        // docelowe prawdopodobieństwo przypomnienia
  tts: true,             // czytanie słów na głos
  autoSync: true         // synchronizacja z Azure po sesji / po dodaniu słowa
};

// Krótkie przypomnienia o metodzie — jedno na dzień.
export const TIPS = [
  'Nie „przeglądaj” słówek. Najpierw spróbuj sobie przypomnieć — dopiero potem odkryj odpowiedź. Sam wysiłek przypominania buduje pamięć.',
  'Słowo bez zdania to martwe słowo. Zapamiętujesz wzorzec użycia, nie hasło ze słownika.',
  'Lepiej 10 minut dziennie niż 70 minut raz w tygodniu. Rozłożenie w czasie wygrywa z ilością.',
  'Jeśli coś przychodzi Ci z trudem, to znak, że powtórka działa. Łatwe powtórki niewiele uczą.',
  'Strona „Po polsku” jest trudniejsza niż czytanie po angielsku — i dlatego uczy najwięcej.',
  'Dopisz własną notatkę albo skojarzenie. Im głębiej przetworzysz słowo, tym trwalszy ślad.',
  'Nie ucz się synonimów tego samego dnia — mieszają się. Rozdziel je w czasie.',
  'Zapisuj kolokacje: „make a decision”, nie „make” i „decision” osobno.',
  'Odpowiedź „nie znam” nie jest porażką. To informacja dla algorytmu, kiedy wrócić do słowa.',
  'Czytaj zdanie na głos. Zaangażowanie wymowy dokłada kolejny kanał pamięciowy.'
];
