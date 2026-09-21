/* ===========================================================================
   Azure Function `chat` — Node.js, model programowania v3 (jak `words`).

   Dwa tryby, wybierane polem `mode`:

   1. "explain" — objaśnienie jednego słowa (strony „Zrozumienie" i „Z filmu"):
        POST { mode: "explain", word: {...} }
        →    { insight: { definition, purpose, usage, quote, scene } }

   2. "tutor"  — rozmowa o jednym słowie (strona „Czat"):
        POST { mode: "tutor", word: {...}, messages: [{ role, content }, ...] }
        →    { reply: "..." }
      Pusta lista `messages` = początek rozmowy: czat sam zadaje pierwsze pytanie.

   Czym to się różni od szkicu z Gemini:
     • bez `axios` — wbudowany moduł `https`, więc nic nie trzeba instalować
       (w edytorze w portalu nie da się zrobić `npm install`, a `require('axios')`
       wywaliłby funkcję przy pierwszym wywołaniu),
     • model domyślnie `gpt-4o-mini` zamiast wycofywanego `gpt-3.5-turbo`,
     • przekazujemy historię rozmowy i dane słowa — bez tego czat nie wie,
       o czym rozmawiacie, i nie pamięta poprzedniej odpowiedzi,
     • brak nagłówków CORS w kodzie — CORS ustawia Function App w portalu
       i obejmuje wszystkie funkcje w aplikacji, także tę.

   Konfiguracja (Function App → Environment variables):
     OPENAI_API_KEY   klucz z platform.openai.com (działa też nazwa AI_API_KEY)
     OPENAI_MODEL     opcjonalnie, domyślnie gpt-4o-mini
   =========================================================================== */

const https = require("https");

const API_KEY = process.env.OPENAI_API_KEY || process.env.AI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";

const MAX_HISTORY = 16;       // tyle ostatnich wiadomości trafia do modelu
const MAX_CHARS = 1500;       // pojedyncza wiadomość — ochrona przed kosztami

/* ------------------------------------------------------------ OpenAI */

function openai(payload) {
    return new Promise((resolve, reject) => {
        const body = JSON.stringify(payload);
        const request = https.request({
            hostname: "api.openai.com",
            path: "/v1/chat/completions",
            method: "POST",
            timeout: 40000,
            headers: {
                "Authorization": `Bearer ${API_KEY}`,
                "Content-Type": "application/json",
                "Content-Length": Buffer.byteLength(body)
            }
        }, response => {
            let data = "";
            response.on("data", chunk => { data += chunk; });
            response.on("end", () => {
                let json;
                try { json = JSON.parse(data); }
                catch (e) { return reject(new Error(`OpenAI zwrócił nieczytelną odpowiedź (HTTP ${response.statusCode})`)); }
                if (response.statusCode >= 400) {
                    const msg = json && json.error && json.error.message;
                    return reject(new Error(msg || `OpenAI HTTP ${response.statusCode}`));
                }
                resolve(json);
            });
        });
        request.on("timeout", () => request.destroy(new Error("OpenAI nie odpowiedział w 40 s")));
        request.on("error", reject);
        request.write(body);
        request.end();
    });
}

/* ------------------------------------------------------------ słowo */

const clip = (value, max) => String(value || "").slice(0, max);

/** Dane słowa z aplikacji → krótki opis dla modelu. */
function describe(word) {
    const lines = [
        `Słowo / wyrażenie: ${clip(word.english, 80)}${word.pos ? ` (${clip(word.pos, 20)})` : ""}`,
        `Znaczenie po polsku: ${clip(word.polishDefinition, 200) || "—"}`
    ];
    if (Array.isArray(word.sentences) && word.sentences.length) {
        lines.push(`Przykłady z aplikacji: ${word.sentences.slice(0, 3).map(s => clip(s, 200)).join(" | ")}`);
    }
    if (Array.isArray(word.collocations) && word.collocations.length) {
        lines.push(`Kolokacje: ${word.collocations.slice(0, 8).map(c => clip(c, 60)).join(", ")}`);
    }
    if (word.rules) lines.push(`Uwagi: ${clip(word.rules, 400)}`);
    return lines.join("\n");
}

/* ------------------------------------------------------------ tryb: objaśnienie */

function explainPrompt(word) {
    return `Jesteś autorem materiałów do nauki angielskiego dla Polaka na poziomie B2, który uczy się też do pracy jako cloud engineer.
Przygotuj objaśnienie słowa:

${describe(word)}

Zwróć wyłącznie obiekt JSON o polach:
- "definition": definicja po polsku, 2–3 zdania, prosto i precyzyjnie;
- "purpose": po co się używa tego słowa — co wyraża, jaką potrzebę w rozmowie załatwia; 2–4 zdania po polsku;
- "usage": kiedy się go używa — typowe sytuacje, rejestr (potoczny / neutralny / formalny), kontekst zawodowy, jeśli pasuje, i czego unikać; 3–5 zdań po polsku;
- "quote": autentyczny, powszechnie znany cytat z filmu lub serialu zawierający to słowo, jako obiekt {"text": "...", "speaker": "...", "source": "Tytuł (rok)"}. Podaj go WYŁĄCZNIE wtedy, gdy masz pewność, że cytat istnieje dokładnie w tej formie. W przeciwnym razie wpisz null. Nie wymyślaj cytatów i nie przerabiaj ich;
- "scene": krótka scena dialogowa po angielsku (3–4 kwestie) w stylu filmu lub serialu, pokazująca naturalne użycie słowa, jako tablica obiektów {"speaker": "...", "en": "...", "pl": "..."}.`;
}

/** Porządkuje to, co wróciło z modelu — frontend dostaje zawsze ten sam kształt. */
function tidyInsight(raw) {
    const text = v => (typeof v === "string" ? v.trim() : "");
    const q = raw && raw.quote;
    const quote = q && text(q.text) && text(q.source)
        ? { text: text(q.text), speaker: text(q.speaker), source: text(q.source) }
        : null;
    const scene = Array.isArray(raw && raw.scene)
        ? raw.scene
            .filter(line => line && text(line.en))
            .slice(0, 6)
            .map(line => ({ speaker: text(line.speaker), en: text(line.en), pl: text(line.pl) }))
        : [];
    return {
        definition: text(raw && raw.definition),
        purpose: text(raw && raw.purpose),
        usage: text(raw && raw.usage),
        quote,
        scene
    };
}

async function explain(word) {
    const out = await openai({
        model: MODEL,
        temperature: 0.4,
        max_tokens: 900,
        response_format: { type: "json_object" },
        messages: [
            { role: "system", content: explainPrompt(word) },
            { role: "user", content: "Przygotuj objaśnienie w formacie JSON." }
        ]
    });
    let parsed;
    try { parsed = JSON.parse(out.choices[0].message.content); }
    catch (e) { throw new Error("Model zwrócił niepoprawny JSON"); }
    return tidyInsight(parsed);
}

/* ------------------------------------------------------------ tryb: korepetytor */

function tutorPrompt(word) {
    return `Jesteś korepetytorem angielskiego. Uczeń jest Polakiem na poziomie B2 i uczy się też do pracy jako cloud engineer.
Cała rozmowa dotyczy jednego słowa:

${describe(word)}

Jak prowadzisz rozmowę:
- Zadajesz JEDNO pytanie naraz o najważniejsze rzeczy dotyczące tego słowa: znaczenie, użycie w zdaniu, kolokacje, różnice względem podobnych słów, typowe błędy Polaków, rejestr.
- Po odpowiedzi ucznia krótko oceniasz, co było dobrze, a co źle, poprawiasz błędy, dopowiadasz jedną–dwie ważne rzeczy i zadajesz kolejne pytanie.
- Co jakiś czas prosisz, żeby uczeń ułożył własne zdanie z tym słowem, i je poprawiasz.
- Jeśli uczeń sam o coś pyta — odpowiadasz, a potem wracasz do słowa.
- Jeśli rozmowa dopiero się zaczyna, witasz się jednym krótkim zdaniem i od razu zadajesz pierwsze pytanie.
- Piszesz po polsku, przykłady po angielsku. Najwyżej około 80 słów w odpowiedzi — to ekran telefonu.
- Bez wstępów typu „Świetne pytanie!". Nie zmieniasz tematu na inne słowa.`;
}

async function tutor(word, messages) {
    const history = (Array.isArray(messages) ? messages : [])
        .filter(m => m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string")
        .slice(-MAX_HISTORY)
        .map(m => ({ role: m.role, content: clip(m.content, MAX_CHARS) }));

    const out = await openai({
        model: MODEL,
        temperature: 0.6,
        max_tokens: 400,
        messages: [
            { role: "system", content: tutorPrompt(word) },
            ...(history.length ? history : [{ role: "user", content: "Zaczynamy." }])
        ]
    });
    return String(out.choices[0].message.content || "").trim();
}

/* ------------------------------------------------------------ handler */

module.exports = async function (context, req) {
    if (req.method !== "POST") {
        context.res = { status: 405, body: { error: "Tylko POST" } };
        return;
    }
    if (!API_KEY) {
        context.res = {
            status: 500,
            body: { error: "Brak klucza OpenAI — dodaj zmienną OPENAI_API_KEY w konfiguracji Function App." }
        };
        return;
    }

    const body = req.body || {};
    const word = body.word || {};
    if (!word.english) {
        context.res = { status: 400, body: { error: "Brak słowa (word.english)" } };
        return;
    }

    try {
        if (body.mode === "explain") {
            const insight = await explain(word);
            context.res = { status: 200, body: { insight } };
            return;
        }
        const reply = await tutor(word, body.messages);
        context.res = { status: 200, body: { reply } };
    } catch (err) {
        context.log.error("chat: błąd", err.message);
        context.res = { status: 502, body: { error: err.message } };
    }
};
