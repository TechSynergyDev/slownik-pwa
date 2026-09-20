/* ===========================================================================
   Startowy pakiet B2 — 40 haseł. Każde ma pięć zdań z tłumaczeniem, zasady
   użycia i skojarzenie, czyli komplet pod pięć ekranów nauki.

   Pola: en=słowo, pl=znaczenie, pos=część mowy, ph=wymowa,
         s=[[zdanie EN, tłumaczenie PL], ...], col=kolokacje,
         rules=zasady użycia (ekran 4), mn=skojarzenie (ekran 5), tag=tagi
   =========================================================================== */

export const SEED = [
  {
    en: 'come across', pl: 'natknąć się na coś; sprawiać wrażenie', pos: 'phr verb', ph: '/kʌm əˈkrɒs/',
    s: [
      ['I came across an old letter while I was clearing out the attic.', 'Natknąłem się na stary list, kiedy sprzątałem strych.'],
      ['If you come across a word you do not know, write it down.', 'Jeśli natkniesz się na nieznane słowo, zapisz je.'],
      ['He comes across as arrogant, but he is just shy.', 'Sprawia wrażenie aroganckiego, ale jest po prostu nieśmiały.'],
      ['We came across the same problem last year.', 'Natknęliśmy się na ten sam problem w zeszłym roku.'],
      ['Her presentation came across really well.', 'Jej prezentacja została bardzo dobrze odebrana.']
    ],
    col: ['come across as rude', 'come across a problem'],
    rules: 'Nierozdzielny: come across something, nigdy come something across. W znaczeniu „sprawiać wrażenie" zawsze z as + przymiotnik lub rzeczownik.',
    mn: 'ACROSS — idziesz w poprzek i wpadasz na coś, czego nie szukałeś.',
    tag: ['phrasal verbs']
  },
  {
    en: 'reluctant', pl: 'niechętny, opierający się', pos: 'adj', ph: '/rɪˈlʌktənt/',
    s: [
      ['She was reluctant to admit that she had made a mistake.', 'Niechętnie przyznawała, że popełniła błąd.'],
      ['He gave a reluctant nod and left the room.', 'Skinął niechętnie głową i wyszedł z pokoju.'],
      ['Banks are reluctant to lend money to new businesses.', 'Banki niechętnie pożyczają pieniądze nowym firmom.'],
      ['I was reluctant at first, but the trip turned out great.', 'Na początku się ociągałem, ale wyjazd okazał się świetny.'],
      ['Many witnesses are reluctant to speak to the police.', 'Wielu świadków niechętnie rozmawia z policją.']
    ],
    col: ['reluctant to agree', 'a reluctant decision'],
    rules: 'Po reluctant idzie bezokolicznik z to: reluctant to do something. Rzeczownik to reluctance, przysłówek reluctantly.',
    mn: 'Brzmi jak „relaks tańczy" — ktoś wolałby leżeć niż cokolwiek zrobić.',
    tag: ['opinie']
  },
  {
    en: 'cope with', pl: 'radzić sobie z czymś trudnym', pos: 'phr verb', ph: '/kəʊp wɪð/',
    s: [
      ['He is learning to cope with the pressure of his new job.', 'Uczy się radzić sobie z presją w nowej pracy.'],
      ['I cannot cope with this workload any more.', 'Nie daję już rady z tą ilością pracy.'],
      ['How do you cope with such early mornings?', 'Jak sobie radzisz z tak wczesnym wstawaniem?'],
      ['The hospital could not cope with so many patients.', 'Szpital nie radził sobie z taką liczbą pacjentów.'],
      ['She copes well with stress.', 'Dobrze radzi sobie ze stresem.']
    ],
    col: ['cope with stress', 'cope with the workload'],
    rules: 'Zawsze z with, gdy mówisz z czym. Samo cope też działa: I just cannot cope. Dotyczy rzeczy trudnych — nie powiesz cope with a party.',
    mn: 'Policjant (cop) radzi sobie z tym, co trudne.',
    tag: ['praca']
  },
  {
    en: 'drawback', pl: 'wada, minus rozwiązania', pos: 'noun', ph: '/ˈdrɔːbæk/',
    s: [
      ['The main drawback of living downtown is the noise.', 'Główną wadą mieszkania w centrum jest hałas.'],
      ['Every plan has its drawbacks.', 'Każdy plan ma swoje minusy.'],
      ['The only drawback is the price.', 'Jedynym minusem jest cena.'],
      ['There are serious drawbacks to working from home.', 'Praca z domu ma poważne wady.'],
      ['Despite these drawbacks, the method is still popular.', 'Mimo tych wad metoda wciąż jest popularna.']
    ],
    col: ['the main drawback', 'a serious drawback'],
    rules: 'Policzalny: a drawback, drawbacks. Wada czegoś to drawback of something albo drawback to something. Mocniejsze niż disadvantage brzmi downside.',
    mn: 'DRAW BACK — coś, co cię cofa, ciągnie do tyłu.',
    tag: ['opinie']
  },
  {
    en: 'outcome', pl: 'wynik, rezultat', pos: 'noun', ph: '/ˈaʊtkʌm/',
    s: [
      ['Nobody could predict the outcome of the negotiations.', 'Nikt nie potrafił przewidzieć wyniku negocjacji.'],
      ['The outcome of the vote surprised everyone.', 'Wynik głosowania wszystkich zaskoczył.'],
      ['We are still waiting for the outcome of the tests.', 'Wciąż czekamy na wynik badań.'],
      ['Whatever the outcome, I am glad we tried.', 'Jakikolwiek będzie wynik, cieszę się, że spróbowaliśmy.'],
      ['This outcome was entirely predictable.', 'Taki rezultat był całkowicie do przewidzenia.']
    ],
    col: ['a positive outcome', 'the likely outcome'],
    rules: 'Outcome to skutek procesu lub decyzji. Wynik meczu czy egzaminu to raczej result, a score dla punktów.',
    mn: 'OUT + COME — to, co w końcu z czegoś wychodzi.',
    tag: ['praca']
  },
  {
    en: 'thorough', pl: 'dokładny, gruntowny', pos: 'adj', ph: '/ˈθʌrə/',
    s: [
      ['The mechanic gave the engine a thorough inspection.', 'Mechanik dokładnie sprawdził silnik.'],
      ['She is slow but thorough.', 'Pracuje wolno, ale bardzo dokładnie.'],
      ['The report is based on thorough research.', 'Raport opiera się na gruntownych badaniach.'],
      ['Give the room a thorough clean before they arrive.', 'Posprzątaj dokładnie pokój, zanim przyjadą.'],
      ['We need a more thorough explanation than that.', 'Potrzebujemy dokładniejszego wyjaśnienia niż to.']
    ],
    col: ['a thorough check', 'thorough research'],
    rules: 'Nie myl z through (przez) ani though (chociaż) — inna wymowa i znaczenie. Przysłówek thoroughly znaczy też „całkowicie": thoroughly enjoyed it.',
    mn: 'THOROUGH ma dwa „o" — dwa razy sprawdzone.',
    tag: ['opis']
  },
  {
    en: 'overwhelming', pl: 'przytłaczający, ogromny', pos: 'adj', ph: '/ˌəʊvəˈwelmɪŋ/',
    s: [
      ['The response to our campaign was overwhelming.', 'Odzew na naszą kampanię był przytłaczający.'],
      ['An overwhelming majority voted in favour.', 'Przytłaczająca większość zagłosowała za.'],
      ['The evidence against him is overwhelming.', 'Dowody przeciwko niemu są przytłaczające.'],
      ['I felt overwhelmed by all the paperwork.', 'Czułem się przytłoczony ilością papierkowej roboty.'],
      ['The smell in the kitchen was overwhelming.', 'Zapach w kuchni był nie do zniesienia.']
    ],
    col: ['overwhelming majority', 'overwhelming evidence'],
    rules: 'Overwhelming opisuje rzecz, overwhelmed opisuje człowieka: the task is overwhelming, I am overwhelmed. Może być pozytywne (overwhelming support).',
    mn: 'OVER + WHELM — fala przewala się przez ciebie.',
    tag: ['emocje']
  },
  {
    en: 'rely on', pl: 'polegać na kimś lub czymś', pos: 'phr verb', ph: '/rɪˈlaɪ ɒn/',
    s: [
      ['You can rely on him to keep a secret.', 'Możesz na nim polegać, jeśli chodzi o dochowanie tajemnicy.'],
      ['We rely on public transport to get to work.', 'Polegamy na komunikacji miejskiej, żeby dojechać do pracy.'],
      ['Do not rely on the weather in April.', 'Nie licz na pogodę w kwietniu.'],
      ['The village relies heavily on tourism.', 'Wioska w dużym stopniu opiera się na turystyce.'],
      ['I relied on my notes during the presentation.', 'Podczas prezentacji opierałem się na notatkach.']
    ],
    col: ['rely heavily on', 'rely on data'],
    rules: 'Zawsze z on lub upon. Po nim rzeczownik albo osoba + to do something: rely on him to call. Rzeczownik: reliance, przymiotnik: reliable.',
    mn: 'RE-LIE — opierasz się o coś jak o ścianę i to musi wytrzymać.',
    tag: ['relacje']
  },
  {
    en: 'cut down on', pl: 'ograniczyć ilość czegoś', pos: 'phr verb', ph: '/kʌt daʊn ɒn/',
    s: [
      ['The doctor told me to cut down on sugar.', 'Lekarz kazał mi ograniczyć cukier.'],
      ['We are trying to cut down on plastic at home.', 'Staramy się ograniczyć plastik w domu.'],
      ['He has cut down on coffee to two cups a day.', 'Ograniczył kawę do dwóch filiżanek dziennie.'],
      ['If you want to save money, cut down on takeaways.', 'Jeśli chcesz oszczędzać, ogranicz jedzenie na wynos.'],
      ['The company cut down on travel costs last year.', 'Firma ograniczyła koszty podróży w zeszłym roku.']
    ],
    col: ['cut down on spending', 'cut down on coffee'],
    rules: 'Cut down on = zmniejszyć ilość, cut out = zrezygnować całkowicie. Po on idzie rzeczownik albo forma -ing: cut down on eating out.',
    mn: 'Tniesz słupek na wykresie w dół.',
    tag: ['zdrowie']
  },
  {
    en: 'take for granted', pl: 'brać za pewnik, nie doceniać', pos: 'phrase', ph: '/teɪk fə ˈɡrɑːntɪd/',
    s: [
      ['We take clean water for granted until there is none.', 'Bierzemy czystą wodę za pewnik, dopóki jej nie zabraknie.'],
      ['Do not take her help for granted.', 'Nie traktuj jej pomocy jak czegoś oczywistego.'],
      ['He took it for granted that I would agree.', 'Z góry założył, że się zgodzę.'],
      ['After the illness, she stopped taking her health for granted.', 'Po chorobie przestała uważać zdrowie za oczywistość.'],
      ['Many employees feel taken for granted.', 'Wielu pracowników czuje się niedocenianych.']
    ],
    col: ['take someone for granted', 'take it for granted that'],
    rules: 'Dopełnienie wchodzi w środek: take something for granted. Z całym zdaniem użyj take it for granted that…',
    mn: 'GRANTED — dostałeś to w prezencie i już nie zauważasz.',
    tag: ['idiomy']
  },
  {
    en: 'eligible', pl: 'uprawniony, spełniający warunki', pos: 'adj', ph: '/ˈelɪdʒəbl/',
    s: [
      ['Only residents are eligible for the discount.', 'Tylko mieszkańcy są uprawnieni do zniżki.'],
      ['You are eligible to apply after six months.', 'Możesz złożyć wniosek po sześciu miesiącach.'],
      ['Am I eligible for a refund?', 'Czy przysługuje mi zwrot pieniędzy?'],
      ['Students are eligible for reduced fares.', 'Studentom przysługują zniżki na przejazdy.'],
      ['He was not eligible to vote in that election.', 'Nie miał prawa głosu w tych wyborach.']
    ],
    col: ['eligible for a refund', 'eligible to apply'],
    rules: 'Eligible for + rzeczownik, eligible to + czasownik. Nie myl z legible (czytelny). Przeciwieństwo: ineligible.',
    mn: 'E-LIGIBLE — jesteś na liście, więc ci wolno.',
    tag: ['formalne']
  },
  {
    en: 'cautious', pl: 'ostrożny', pos: 'adj', ph: '/ˈkɔːʃəs/',
    s: [
      ['Investors remain cautious about the housing market.', 'Inwestorzy pozostają ostrożni wobec rynku nieruchomości.'],
      ['He is a cautious driver.', 'Jest ostrożnym kierowcą.'],
      ['The minister gave a cautious welcome to the plan.', 'Minister przyjął plan z ostrożnym entuzjazmem.'],
      ['Be cautious when you click links in emails.', 'Zachowaj ostrożność, klikając linki w mailach.'],
      ['Doctors are cautiously optimistic about his recovery.', 'Lekarze są ostrożnie optymistyczni co do jego powrotu do zdrowia.']
    ],
    col: ['cautious optimism', 'a cautious approach'],
    rules: 'Ostrożny wobec czegoś: cautious about something. Rzeczownik caution, ostrzeżenie na produktach to CAUTION.',
    mn: 'Jak polskie „kaucja" — wpłacasz na wszelki wypadek.',
    tag: ['opinie']
  },
  {
    en: 'bound to', pl: 'na pewno coś zrobi, to nieuniknione', pos: 'phrase', ph: '/baʊnd tuː/',
    s: [
      ['If you practise every day, you are bound to improve.', 'Jeśli ćwiczysz codziennie, na pewno się poprawisz.'],
      ['Mistakes are bound to happen at the beginning.', 'Na początku błędy muszą się zdarzać.'],
      ['He was bound to find out sooner or later.', 'Prędzej czy później musiał się dowiedzieć.'],
      ['There is bound to be traffic at this hour.', 'O tej porze na pewno będą korki.'],
      ['They were bound to lose with half the team injured.', 'Musieli przegrać, mając połowę drużyny kontuzjowaną.']
    ],
    col: ['bound to happen', 'bound to fail'],
    rules: 'Zawsze be bound to + bezokolicznik, mówi o pewności, nie o obowiązku. Uwaga: bound for znaczy „jadący do": a train bound for Kraków.',
    mn: 'Jesteś związany (bound) z tym wynikiem — nie wywiniesz się.',
    tag: ['idiomy']
  },
  {
    en: 'worthwhile', pl: 'wart zachodu, opłacalny', pos: 'adj', ph: '/ˌwɜːθˈwaɪl/',
    s: [
      ['The course was expensive, but it turned out to be worthwhile.', 'Kurs był drogi, ale okazał się wart zachodu.'],
      ['It is worthwhile checking the prices first.', 'Warto najpierw sprawdzić ceny.'],
      ['She does worthwhile work for the community.', 'Robi wartościowe rzeczy dla lokalnej społeczności.'],
      ['Is it worthwhile repairing such an old phone?', 'Czy opłaca się naprawiać tak stary telefon?'],
      ['The detour was well worthwhile.', 'Objazd zdecydowanie się opłacił.']
    ],
    col: ['a worthwhile investment', 'well worthwhile'],
    rules: 'Pisane łącznie. Po nim forma -ing albo bezokolicznik: worthwhile doing / worthwhile to do. Nie myl z worth doing, gdzie worth nie ma while.',
    mn: 'WORTH + WHILE — warte poświęconego czasu.',
    tag: ['opinie']
  },
  {
    en: 'struggle', pl: 'zmagać się, mieć trudność', pos: 'verb', ph: '/ˈstrʌɡl/',
    s: [
      ['Many students struggle with academic writing at first.', 'Wielu studentów na początku zmaga się z pisaniem akademickim.'],
      ['I am struggling to understand this chapter.', 'Męczę się, żeby zrozumieć ten rozdział.'],
      ['The company struggled through the first two years.', 'Firma z trudem przetrwała pierwsze dwa lata.'],
      ['He struggled to hold back his laughter.', 'Z trudem powstrzymywał śmiech.'],
      ['Learning a language is a constant struggle at the start.', 'Nauka języka to na początku ciągłe zmaganie.']
    ],
    col: ['struggle to understand', 'a constant struggle'],
    rules: 'Struggle with something albo struggle to do something. Jest też rzeczownikiem: a struggle. Sugeruje wysiłek, niekoniecznie porażkę.',
    mn: 'Brzmi jak zduszony wysiłek — „strrr…" przez zaciśnięte zęby.',
    tag: ['nauka']
  },
  {
    en: 'acknowledge', pl: 'przyznać, uznać coś', pos: 'verb', ph: '/əkˈnɒlɪdʒ/',
    s: [
      ['The company acknowledged that the delay was its fault.', 'Firma przyznała, że opóźnienie było jej winą.'],
      ['He refused to acknowledge the problem.', 'Nie chciał uznać istnienia problemu.'],
      ['Please acknowledge receipt of this email.', 'Proszę o potwierdzenie otrzymania tej wiadomości.'],
      ['She is widely acknowledged as the best in her field.', 'Powszechnie uznaje się ją za najlepszą w swojej dziedzinie.'],
      ['He walked past without acknowledging me.', 'Przeszedł obok, nawet mnie nie zauważając.']
    ],
    col: ['acknowledge a mistake', 'widely acknowledged'],
    rules: 'Po acknowledge idzie that, rzeczownik albo forma -ing: acknowledged making a mistake. W mailach znaczy „potwierdzić odbiór".',
    mn: 'W środku siedzi KNOW — przyznajesz, że wiesz.',
    tag: ['formalne']
  },
  {
    en: 'insight', pl: 'wgląd, trafne spostrzeżenie', pos: 'noun', ph: '/ˈɪnsaɪt/',
    s: [
      ['Her book gives a rare insight into how memory works.', 'Jej książka daje rzadki wgląd w to, jak działa pamięć.'],
      ['The interview provided valuable insights.', 'Wywiad dostarczył cennych spostrzeżeń.'],
      ['Working there gave me an insight into the industry.', 'Praca tam dała mi wgląd w tę branżę.'],
      ['He has real insight into human behaviour.', 'Naprawdę rozumie ludzkie zachowania.'],
      ['Thank you for sharing your insight.', 'Dziękuję, że podzieliłeś się swoim spostrzeżeniem.']
    ],
    col: ['valuable insight', 'gain an insight into'],
    rules: 'Wgląd w coś to insight into something, nigdy insight about. Bywa policzalny (an insight, insights) i niepoliczalny (great insight).',
    mn: 'IN + SIGHT — widzisz to od środka.',
    tag: ['nauka']
  },
  {
    en: 'feasible', pl: 'wykonalny, realny do zrobienia', pos: 'adj', ph: '/ˈfiːzəbl/',
    s: [
      ['Finishing the project by Friday simply is not feasible.', 'Skończenie projektu do piątku po prostu nie jest wykonalne.'],
      ['Is it feasible to train twice a day?', 'Czy trenowanie dwa razy dziennie jest realne?'],
      ['They looked for the most feasible solution.', 'Szukali najbardziej wykonalnego rozwiązania.'],
      ['The plan is technically feasible but very expensive.', 'Plan jest technicznie wykonalny, ale bardzo drogi.'],
      ['We carried out a feasibility study first.', 'Najpierw przeprowadziliśmy analizę wykonalności.']
    ],
    col: ['technically feasible', 'a feasible plan'],
    rules: 'Dotyczy planów i rozwiązań, nie ludzi. Rzeczownik feasibility. W mowie potocznej częściej doable.',
    mn: 'FEASIBLE — da się to zrobić, czuć, że wykonalne.',
    tag: ['praca']
  },
  {
    en: 'tackle', pl: 'zmierzyć się z problemem', pos: 'verb', ph: '/ˈtækl/',
    s: [
      ['The city is finally tackling the problem of air pollution.', 'Miasto wreszcie mierzy się z problemem zanieczyszczenia powietrza.'],
      ['I will tackle the paperwork tomorrow morning.', 'Wezmę się za papierkową robotę jutro rano.'],
      ['We need to tackle this issue head-on.', 'Musimy zmierzyć się z tym problemem wprost.'],
      ['She tackled the task with real energy.', 'Zabrała się do zadania z prawdziwą energią.'],
      ['Governments must tackle climate change together.', 'Rządy muszą wspólnie zmierzyć się ze zmianami klimatu.']
    ],
    col: ['tackle an issue', 'tackle climate change'],
    rules: 'Bez przyimka: tackle a problem, nie tackle with a problem. W sporcie znaczy „zaatakować przeciwnika", stąd obrazek.',
    mn: 'Jak w rugby — bierzesz problem w objęcia i obalasz.',
    tag: ['praca']
  },
  {
    en: 'vague', pl: 'niejasny, mglisty', pos: 'adj', ph: '/veɪɡ/',
    s: [
      ['His answer was so vague that nobody knew what he meant.', 'Jego odpowiedź była tak niejasna, że nikt nie wiedział, o co mu chodzi.'],
      ['I have only a vague idea of how it works.', 'Mam tylko mgliste pojęcie, jak to działa.'],
      ['She was vague about her plans for the summer.', 'Wymigiwała się od konkretów na temat planów na lato.'],
      ['There is a vague resemblance between them.', 'Jest między nimi niewielkie podobieństwo.'],
      ['Politicians often make vague promises.', 'Politycy często składają mgliste obietnice.']
    ],
    col: ['a vague idea', 'vague promises'],
    rules: 'Wymawiane /veɪɡ/, bez „u" na końcu. Być wymijającym w jakiejś sprawie to be vague about something.',
    mn: 'Brzmi jak „waga" bez wskazówki — nic konkretnego nie pokazuje.',
    tag: ['opis']
  },
  {
    en: 'steady', pl: 'stały, równomierny; stabilny', pos: 'adj', ph: '/ˈstedi/',
    s: [
      ['There has been a steady increase in remote work.', 'Obserwuje się stały wzrost pracy zdalnej.'],
      ['He has a steady job and a steady income.', 'Ma stałą pracę i stały dochód.'],
      ['Keep the camera steady while you film.', 'Trzymaj aparat nieruchomo, kiedy filmujesz.'],
      ['Progress has been slow but steady.', 'Postęp jest powolny, ale równomierny.'],
      ['Prices have remained steady since January.', 'Ceny utrzymują się na stałym poziomie od stycznia.']
    ],
    col: ['steady progress', 'a steady job'],
    rules: 'Steady to stały w czasie albo nieruchomy. Stopniowanie: steadier, steadiest. Przysłówek steadily: prices rose steadily.',
    mn: 'Brzmi jak „stady" — stoi i się nie rusza.',
    tag: ['opis']
  },
  {
    en: 'blame', pl: 'obwiniać; wina', pos: 'verb', ph: '/bleɪm/',
    s: [
      ['Do not blame the weather for your bad mood.', 'Nie obwiniaj pogody za swój zły nastrój.'],
      ['They blamed the accident on the driver.', 'Zrzucili winę za wypadek na kierowcę.'],
      ['I do not blame you for being angry.', 'Nie dziwię się, że jesteś zły.'],
      ['He took the blame for the whole team.', 'Wziął winę na siebie za całą drużynę.'],
      ['She is not to blame for what happened.', 'To nie jej wina, co się stało.']
    ],
    col: ['blame someone for something', 'take the blame'],
    rules: 'Dwie konstrukcje: blame somebody for something albo blame something on somebody. Be to blame = ponosić winę.',
    mn: 'BLAME zawiera LAME — wina kuleje po kimś.',
    tag: ['emocje']
  },
  {
    en: 'keep up with', pl: 'nadążać za czymś lub kimś', pos: 'phr verb', ph: '/kiːp ʌp wɪð/',
    s: [
      ['It is hard to keep up with all the changes in technology.', 'Trudno nadążyć za wszystkimi zmianami w technologii.'],
      ['Slow down, I cannot keep up with you.', 'Zwolnij, nie nadążam za tobą.'],
      ['I try to keep up with the news every morning.', 'Staram się codziennie rano śledzić wiadomości.'],
      ['She keeps up with her old school friends.', 'Utrzymuje kontakt z przyjaciółmi ze szkoły.'],
      ['Wages have not kept up with inflation.', 'Płace nie nadążyły za inflacją.']
    ],
    col: ['keep up with the news', 'keep up with friends'],
    rules: 'Trzy słowa razem: keep up with. Bez with znaczy „kontynuować": keep up the good work.',
    mn: 'Trzymasz tempo (keep up) razem z kimś (with).',
    tag: ['phrasal verbs']
  },
  {
    en: 'run out of', pl: 'skończyć się (zapas)', pos: 'phr verb', ph: '/rʌn aʊt əv/',
    s: [
      ['We ran out of coffee halfway through the meeting.', 'Kawa skończyła nam się w połowie spotkania.'],
      ['I am running out of patience.', 'Kończy mi się cierpliwość.'],
      ['The car ran out of petrol on the motorway.', 'Samochodowi skończyła się benzyna na autostradzie.'],
      ['We are running out of time.', 'Kończy nam się czas.'],
      ['If we run out of chairs, people can stand.', 'Jeśli zabraknie krzeseł, ludzie mogą postać.']
    ],
    col: ['run out of time', 'run out of patience'],
    rules: 'Podmiotem jest ten, komu coś się kończy: I ran out of milk. Samo run out bierze zapas jako podmiot: the milk ran out.',
    mn: 'Zapas wybiegł (run out) ze spiżarni.',
    tag: ['phrasal verbs']
  },
  {
    en: 'put off', pl: 'odkładać na później; zniechęcać', pos: 'phr verb', ph: '/pʊt ɒf/',
    s: [
      ['Stop putting off the decision, it will not get easier.', 'Przestań odkładać tę decyzję, nie będzie łatwiej.'],
      ['They put the meeting off until Monday.', 'Przełożyli spotkanie na poniedziałek.'],
      ['The smell put me off my dinner.', 'Ten zapach obrzydził mi kolację.'],
      ['Do not let the price put you off.', 'Nie pozwól, żeby cena cię zniechęciła.'],
      ['I keep putting off going to the dentist.', 'Ciągle odkładam wizytę u dentysty.']
    ],
    col: ['put off a meeting', 'be put off by the price'],
    rules: 'Rozdzielny: put it off, nie put off it. Po put off idzie forma -ing: put off calling her.',
    mn: 'Odkładasz coś na bok (off) na później.',
    tag: ['phrasal verbs']
  },
  {
    en: 'concerned', pl: 'zaniepokojony; zainteresowany sprawą', pos: 'adj', ph: '/kənˈsɜːnd/',
    s: [
      ['Parents are increasingly concerned about screen time.', 'Rodzice są coraz bardziej zaniepokojeni czasem przed ekranem.'],
      ['I am concerned that we will miss the deadline.', 'Obawiam się, że nie zdążymy na termin.'],
      ['As far as I am concerned, the matter is closed.', 'Jeśli o mnie chodzi, sprawa jest zamknięta.'],
      ['Everyone concerned received a letter.', 'Wszyscy zainteresowani dostali list.'],
      ['There is no need to be concerned.', 'Nie ma powodu do niepokoju.']
    ],
    col: ['concerned about', 'as far as I am concerned'],
    rules: 'Concerned about = zaniepokojony, concerned with = dotyczący tematu. Przed rzeczownikiem znaczy „troskliwy": a concerned look.',
    mn: 'Koncern się martwi o wyniki.',
    tag: ['emocje']
  },
  {
    en: 'slight', pl: 'niewielki, nieznaczny', pos: 'adj', ph: '/slaɪt/',
    s: [
      ['There was a slight delay, but the train arrived on time.', 'Było niewielkie opóźnienie, ale pociąg przyjechał na czas.'],
      ['I have a slight headache.', 'Trochę boli mnie głowa.'],
      ['There is a slight difference between the two versions.', 'Między tymi wersjami jest niewielka różnica.'],
      ['He has a slight accent.', 'Ma lekki akcent.'],
      ['I do not have the slightest idea.', 'Nie mam najmniejszego pojęcia.']
    ],
    col: ['a slight difference', 'not in the slightest'],
    rules: 'Tylko przed rzeczownikiem — nie powiesz the problem is slight. Przysłówek slightly: slightly better. Not in the slightest = wcale.',
    mn: 'SLIGHT jak „lekki" — ledwo waży.',
    tag: ['opis']
  },
  {
    en: 'reveal', pl: 'ujawnić, odsłonić', pos: 'verb', ph: '/rɪˈviːl/',
    s: [
      ['The study revealed a strong link between sleep and memory.', 'Badanie ujawniło silny związek między snem a pamięcią.'],
      ['He refused to reveal his sources.', 'Odmówił ujawnienia swoich źródeł.'],
      ['The curtain opened to reveal a huge stage.', 'Kurtyna rozsunęła się, odsłaniając ogromną scenę.'],
      ['She revealed that she had been ill for months.', 'Wyjawiła, że chorowała od miesięcy.'],
      ['The results were revealed yesterday.', 'Wyniki ogłoszono wczoraj.']
    ],
    col: ['reveal the truth', 'reveal details'],
    rules: 'Reveal something to somebody. Po nim może iść that + zdanie. Rzeczownik: revelation.',
    mn: 'RE-VEIL — zdejmujesz woalkę (veil) z czegoś.',
    tag: ['nauka']
  },
  {
    en: 'accomplish', pl: 'osiągnąć, dokonać', pos: 'verb', ph: '/əˈkʌmplɪʃ/',
    s: [
      ['We accomplished more in one week than in the whole month.', 'Osiągnęliśmy więcej w tydzień niż przez cały miesiąc.'],
      ['What do you hope to accomplish this year?', 'Co chcesz w tym roku osiągnąć?'],
      ['She accomplished the task ahead of schedule.', 'Wykonała zadanie przed terminem.'],
      ['Shouting accomplishes nothing.', 'Krzykiem niczego nie osiągniesz.'],
      ['There is a real sense of accomplishment after a hard day.', 'Po ciężkim dniu jest prawdziwe poczucie dokonania czegoś.']
    ],
    col: ['accomplish a goal', 'a sense of accomplishment'],
    rules: 'Bardziej formalne niż achieve, ale używa się wymiennie. Rzeczownik accomplishment, przymiotnik accomplished = biegły: an accomplished pianist.',
    mn: 'A-COMPLI-SH — doprowadzasz do kompletu.',
    tag: ['praca']
  },
  {
    en: 'burden', pl: 'ciężar, brzemię', pos: 'noun', ph: '/ˈbɜːdn/',
    s: [
      ['The tax reform shifted the burden onto small businesses.', 'Reforma podatkowa przerzuciła ciężar na małe firmy.'],
      ['I do not want to be a burden to my family.', 'Nie chcę być ciężarem dla rodziny.'],
      ['The new system eases the administrative burden.', 'Nowy system zmniejsza obciążenie administracyjne.'],
      ['She carries the burden of the whole department.', 'Dźwiga na sobie ciężar całego działu.'],
      ['The burden of proof lies with the accuser.', 'Ciężar dowodu spoczywa na oskarżycielu.']
    ],
    col: ['a financial burden', 'ease the burden'],
    rules: 'Ciężar dla kogoś to a burden on albo to somebody. Jako czasownik burden somebody with something jest formalny i rzadszy.',
    mn: 'Brzmi jak „bordo" — ciężkie, ciemne, przytłaczające.',
    tag: ['formalne']
  },
  {
    en: 'compelling', pl: 'przekonujący, wciągający', pos: 'adj', ph: '/kəmˈpelɪŋ/',
    s: [
      ['She made a compelling argument for a four-day week.', 'Przedstawiła przekonujący argument za czterodniowym tygodniem pracy.'],
      ['There is compelling evidence that exercise helps memory.', 'Istnieją przekonujące dowody, że ruch pomaga pamięci.'],
      ['It was a compelling story from the first page.', 'To była wciągająca historia od pierwszej strony.'],
      ['We have no compelling reason to change the plan.', 'Nie mamy żadnego istotnego powodu, by zmieniać plan.'],
      ['His performance was utterly compelling.', 'Jego występ był absolutnie porywający.']
    ],
    col: ['compelling evidence', 'a compelling story'],
    rules: 'Dwa znaczenia: nie do odparcia (compelling evidence) i nie do oderwania (a compelling film). Czasownik compel = zmusić.',
    mn: 'COMPEL — coś cię zmusza, żeby słuchać dalej.',
    tag: ['opinie']
  },
  {
    en: 'deliberate', pl: 'celowy, zamierzony', pos: 'adj', ph: '/dɪˈlɪbərət/',
    s: [
      ['Leaving that detail out was a deliberate choice.', 'Pominięcie tego szczegółu było celowe.'],
      ['It was a deliberate attempt to mislead us.', 'To była celowa próba wprowadzenia nas w błąd.'],
      ['She spoke in a slow, deliberate voice.', 'Mówiła powoli, z namysłem.'],
      ['The damage was clearly deliberate.', 'Zniszczenia były wyraźnie celowe.'],
      ['Experts call it deliberate practice.', 'Eksperci nazywają to świadomym ćwiczeniem.']
    ],
    col: ['a deliberate attempt', 'deliberate practice'],
    rules: 'Przymiotnik brzmi /dɪˈlɪbərət/, a czasownik deliberate (rozważać) /dɪˈlɪbəreɪt/ — inna końcówka w wymowie. Przysłówek deliberately = celowo.',
    mn: 'De-LIBER-ate — z wolnej woli, nie przypadkiem.',
    tag: ['opis']
  },
  {
    en: 'prone to', pl: 'podatny na coś, skłonny do czegoś', pos: 'phrase', ph: '/prəʊn tuː/',
    s: [
      ['Tired drivers are more prone to making mistakes.', 'Zmęczeni kierowcy są bardziej podatni na popełnianie błędów.'],
      ['This area is prone to flooding.', 'Ten obszar jest narażony na powodzie.'],
      ['He is prone to exaggeration.', 'Ma skłonność do przesady.'],
      ['Older laptops are prone to overheating.', 'Starsze laptopy mają skłonność do przegrzewania się.'],
      ['She is accident-prone.', 'Często przydarzają jej się wypadki.']
    ],
    col: ['prone to errors', 'accident-prone'],
    rules: 'Po prone to idzie rzeczownik albo forma -ing, nigdy bezokolicznik. Dotyczy rzeczy niepożądanych. Można też doczepić na końcu: injury-prone.',
    mn: 'PRONE to leżeć twarzą w dół — wystawiasz się na to, co przyjdzie.',
    tag: ['opis']
  },
  {
    en: 'tedious', pl: 'żmudny, nudny', pos: 'adj', ph: '/ˈtiːdiəs/',
    s: [
      ['Copying the data by hand was tedious but necessary.', 'Przepisywanie danych ręcznie było żmudne, ale konieczne.'],
      ['The meeting was long and tedious.', 'Spotkanie było długie i nużące.'],
      ['I find paperwork incredibly tedious.', 'Papierkowa robota jest dla mnie niesamowicie nudna.'],
      ['It is a tedious job, but somebody has to do it.', 'To żmudna robota, ale ktoś musi ją wykonać.'],
      ['After an hour, the film became tedious.', 'Po godzinie film zrobił się nużący.']
    ],
    col: ['a tedious task', 'tedious paperwork'],
    rules: 'Opisuje czynność albo sytuację, nie osobę. O człowieku powiesz boring. Rzeczownik: tedium.',
    mn: 'Brzmi jak przeciągnięte „tiiiidious" — ciągnie się i ciągnie.',
    tag: ['praca']
  },
  {
    en: 'figure out', pl: 'rozgryźć, dojść do tego', pos: 'phr verb', ph: '/ˈfɪɡə aʊt/',
    s: [
      ['It took me an hour to figure out how the software works.', 'Zajęło mi godzinę, żeby rozgryźć, jak działa ten program.'],
      ['I cannot figure out why the file will not open.', 'Nie mogę dojść do tego, czemu plik się nie otwiera.'],
      ['We need to figure out a solution before Friday.', 'Musimy wymyślić rozwiązanie przed piątkiem.'],
      ['She soon figured out what he really wanted.', 'Szybko zorientowała się, o co mu naprawdę chodzi.'],
      ['I still have not figured him out.', 'Wciąż go nie rozgryzłem.']
    ],
    col: ['figure out a solution', 'figure someone out'],
    rules: 'Rozdzielny: figure it out, nigdy figure out it. Częstszy w angielskim amerykańskim; w brytyjskim też work out.',
    mn: 'Wyciągasz figurę (figure) na wierzch — układ staje się jasny.',
    tag: ['phrasal verbs']
  },
  {
    en: 'get the hang of', pl: 'załapać, jak coś działa', pos: 'phrase', ph: '/ɡet ðə hæŋ əv/',
    s: [
      ['Once you get the hang of it, cooking is relaxing.', 'Kiedy już załapiesz, jak to działa, gotowanie jest relaksujące.'],
      ['It took me a week to get the hang of the new system.', 'Zajęło mi tydzień, żeby ogarnąć nowy system.'],
      ['You will get the hang of driving after a few lessons.', 'Załapiesz jazdę po kilku lekcjach.'],
      ['He is finally getting the hang of the keyboard.', 'Wreszcie łapie, jak używać tej klawiatury.'],
      ['I never got the hang of skiing.', 'Nigdy nie opanowałem jazdy na nartach.']
    ],
    col: ['get the hang of driving', 'get the hang of it'],
    rules: 'Po of idzie rzeczownik albo forma -ing. Potoczne — nie pisz tak w oficjalnym mailu. Zwykle o umiejętności praktycznej.',
    mn: 'Łapiesz uchwyt (hang) i już wiesz, jak to trzymać.',
    tag: ['idiomy']
  },
  {
    en: 'resent', pl: 'mieć żal, nie znosić czegoś', pos: 'verb', ph: '/rɪˈzent/',
    s: [
      ['He resented being treated like a beginner.', 'Miał żal, że traktowano go jak początkującego.'],
      ['She resents the way he speaks to her.', 'Nie znosi sposobu, w jaki on się do niej odzywa.'],
      ['I resent the implication that I lied.', 'Mam pretensje o sugestię, że skłamałem.'],
      ['Many workers resent the new rules.', 'Wielu pracowników ma pretensje o nowe zasady.'],
      ['He deeply resented his brother for years.', 'Przez lata żywił głęboką urazę do brata.']
    ],
    col: ['resent the implication', 'deeply resent'],
    rules: 'Po resent idzie rzeczownik albo forma -ing, nigdy bezokolicznik: resent working late. Nie myl z present ani z re-send.',
    mn: 'RE-SENT — wraca do ciebie jak odesłany list, którego nie chciałeś.',
    tag: ['emocje']
  },
  {
    en: 'inevitable', pl: 'nieunikniony', pos: 'adj', ph: '/ɪnˈevɪtəbl/',
    s: [
      ['Some conflict is inevitable when people work closely together.', 'Pewien konflikt jest nieunikniony, gdy ludzie blisko współpracują.'],
      ['It was inevitable that prices would rise.', 'Było nieuniknione, że ceny wzrosną.'],
      ['Delays are an inevitable part of building work.', 'Opóźnienia to nieodłączna część budowy.'],
      ['We should accept the inevitable.', 'Powinniśmy pogodzić się z tym, co nieuniknione.'],
      ['The team inevitably lost without its captain.', 'Drużyna nieuchronnie przegrała bez kapitana.']
    ],
    col: ['an inevitable consequence', 'the inevitable result'],
    rules: 'Często w konstrukcji it is inevitable that… Przysłówek inevitably zaczyna zdanie: Inevitably, some people complained.',
    mn: 'IN-EVITABLE — nie do uniknięcia (unikać to evitare po włosku).',
    tag: ['formalne']
  },
  {
    en: 'spare', pl: 'zapasowy; oszczędzić komuś czegoś', pos: 'adj', ph: '/speə/',
    s: [
      ['Could you spare ten minutes to look at this?', 'Znalazłbyś dziesięć minut, żeby na to spojrzeć?'],
      ['I always keep a spare key in the office.', 'Zawsze trzymam zapasowy klucz w biurze.'],
      ['What do you do in your spare time?', 'Co robisz w wolnym czasie?'],
      ['Spare me the details, just tell me the result.', 'Oszczędź mi szczegółów, powiedz tylko wynik.'],
      ['We have a spare room if you need to stay.', 'Mamy wolny pokój, jeśli musisz zostać.']
    ],
    col: ['spare time', 'a spare key', 'spare me the details'],
    rules: 'Jako przymiotnik: zapasowy lub wolny (spare time). Jako czasownik: wygospodarować (spare five minutes) albo oszczędzić komuś czegoś (spare somebody the trouble).',
    mn: 'Koło zapasowe w bagażniku — spare wheel.',
    tag: ['codzienne']
  },
  {
    en: 'bear in mind', pl: 'mieć na uwadze', pos: 'phrase', ph: '/beər ɪn maɪnd/',
    s: [
      ['Bear in mind that prices go up in the summer.', 'Miej na uwadze, że latem ceny rosną.'],
      ['You should bear in mind his lack of experience.', 'Powinieneś wziąć pod uwagę jego brak doświadczenia.'],
      ['Bearing in mind the weather, the turnout was good.', 'Biorąc pod uwagę pogodę, frekwencja była dobra.'],
      ['It is worth bearing in mind that the office closes at four.', 'Warto pamiętać, że biuro zamyka się o czwartej.'],
      ['Please bear these points in mind during the meeting.', 'Proszę mieć te kwestie na uwadze podczas spotkania.']
    ],
    col: ['bear in mind that', 'bearing in mind'],
    rules: 'Krótkie dopełnienie wchodzi w środek: bear it in mind. Z całym zdaniem użyj bear in mind that… Czasownik bear jest nieregularny: bear, bore, borne.',
    mn: 'Niedźwiedź (bear) siedzi ci w głowie i przypomina.',
    tag: ['idiomy']
  }
];

/** Konwersja do formatu karty aplikacji. */
export function seedToCards(makeCard) {
  return SEED.map(x => makeCard({
    english: x.en,
    polishDefinition: x.pl,
    pos: x.pos,
    phonetic: x.ph,
    sentences: x.s.map(([en, pl]) => ({ en, pl })),
    collocations: x.col || [],
    rules: x.rules || '',
    mnemonic: x.mn || '',
    tags: x.tag || [],
    level: 'B2'
  }));
}
